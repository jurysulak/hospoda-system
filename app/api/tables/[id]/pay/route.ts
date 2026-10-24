import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tableId = Number(id);
    const body = await req.json();
    const { paymentMethod = "CASH", items: selectedItems } = body;

    if (isNaN(tableId)) {
      return NextResponse.json({ error: "Neplatné ID stolu" }, { status: 400 });
    }

    // Najít otevřenou objednávku stolu včetně položek
    const order = await prisma.order.findFirst({
      where: {
        tableId,
        status: "open",
      },
      include: {
        items: true,
      },
    });

    if (!order || order.items.length === 0) {
      return NextResponse.json(
        { error: "Stůl nemá žádnou otevřenou objednávku k zaplacení" },
        { status: 400 }
      );
    }

    // Rozlišení: Platba vybraných položek vs. Celý účet
    const isPartialPay =
      Array.isArray(selectedItems) && selectedItems.length > 0;

    let paymentAmount = 0;

    if (isPartialPay) {
      for (const sel of selectedItems) {
        const item = order.items.find((i) => i.id === sel.itemId);
        if (item) {
          const qty = Math.min(sel.quantity, item.quantity);
          paymentAmount += item.unitPrice * qty;
        }
      }
    } else {
      // Celá objednávka najednou
      paymentAmount = order.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0
      );
    }

    if (paymentAmount <= 0) {
      return NextResponse.json(
        { error: "Částka k zaplacení musí být větší než 0 Kč" },
        { status: 400 }
      );
    }

    // Transakce: Vytvoření platby a úprava položek / uzavření stolu
    const result = await prisma.$transaction(async (tx) => {
      // 1. Záznam o platbě do tabulky Payment
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          amount: paymentAmount,
          paymentMethod,
        },
      });

      if (isPartialPay) {
        // Odečíst vybrané kusy z položek
        for (const sel of selectedItems) {
          const item = order.items.find((i) => i.id === sel.itemId);
          if (item) {
            const remainingQty = item.quantity - sel.quantity;
            if (remainingQty <= 0) {
              await tx.orderItem.delete({
                where: { id: item.id },
              });
            } else {
              await tx.orderItem.update({
                where: { id: item.id },
                data: { quantity: remainingQty },
              });
            }
          }
        }

        // Zkontrolovat, zda na stole ještě něco zbylo
        const remainingItems = await tx.orderItem.count({
          where: { orderId: order.id },
        });

        // Pokud nezbylo nic, uzavřeme celou objednávku i stůl
        if (remainingItems === 0) {
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: "closed",
              closedAt: new Date(),
            },
          });

          await tx.table.update({
            where: { id: tableId },
            data: { status: "open" },
          });
        }
      } else {
        // Platba celého stolu najednou -> rovnou uzavřeme
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: "closed",
            closedAt: new Date(),
          },
        });

        await tx.table.update({
          where: { id: tableId },
          data: { status: "open" },
        });
      }

      return payment;
    });

    return NextResponse.json({ success: true, payment: result });
  } catch (error) {
    console.error("Chyba při platbě:", error);
    return NextResponse.json(
      { error: "Chyba při zpracování platby" },
      { status: 500 }
    );
  }
}
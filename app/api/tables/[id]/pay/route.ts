// app/api/tables/[id]/pay/route.ts
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

    const { paymentMethod = "CASH" } = body;
    const selectedItems = body.splitItems || body.items;

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

    const isPartialPay =
      Array.isArray(selectedItems) && selectedItems.length > 0;

    let paymentAmount = 0;
    const paidItemsData: Array<{
      productId: number | null;
      productName: string;
      unitPrice: number;
      quantity: number;
    }> = [];

    if (isPartialPay) {
      for (const sel of selectedItems) {
        const item = order.items.find((i) => i.id === sel.itemId);
        if (item && sel.quantity > 0) {
          const qty = Math.min(sel.quantity, item.quantity);
          paymentAmount += item.unitPrice * qty;
          paidItemsData.push({
            productId: item.productId,
            productName: item.productName,
            unitPrice: item.unitPrice,
            quantity: qty,
          });
        }
      }
    } else {
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

    const result = await prisma.$transaction(async (tx) => {
      if (isPartialPay) {
        // 1. Vytvoříme samostatnou uzavřenou objednávku jen pro tyto zaplacené kusy
        const paidOrder = await tx.order.create({
          data: {
            tableId,
            status: "closed",
            closedAt: new Date(),
            items: {
              create: paidItemsData,
            },
          },
        });

        // 2. Navážeme platbu přímo na tuto novou objednávku (pro přesné kopie účtenek)
        const payment = await tx.payment.create({
          data: {
            orderId: paidOrder.id,
            amount: paymentAmount,
            paymentMethod,
          },
        });

        // 3. Z původního stolu odečteme zaplacené kusy
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

        // 4. Pokud na stole nezbylo vůbec nic, uzavřeme i původní objednávku
        const remainingCount = await tx.orderItem.count({
          where: { orderId: order.id },
        });

        if (remainingCount === 0) {
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
      } else {
        // Platba celého stolu najednou
        const payment = await tx.payment.create({
          data: {
            orderId: order.id,
            amount: paymentAmount,
            paymentMethod,
          },
        });

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

        return payment;
      }
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
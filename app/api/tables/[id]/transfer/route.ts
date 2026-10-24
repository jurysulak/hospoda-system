import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sourceTableId = Number(id);
    const body = await req.json();
    const targetTableId = Number(body.targetTableId);

    if (isNaN(sourceTableId) || isNaN(targetTableId)) {
      return NextResponse.json(
        { error: "Neplatné ID zdrojového nebo cílového stolu" },
        { status: 400 }
      );
    }

    if (sourceTableId === targetTableId) {
      return NextResponse.json(
        { error: "Nelze přesunout účet na stejný stůl" },
        { status: 400 }
      );
    }

    // Najdeme otevřenou objednávku zdrojového stolu
    const sourceOrder = await prisma.order.findFirst({
      where: {
        tableId: sourceTableId,
        status: "open",
      },
      include: {
        items: true,
      },
    });

    if (!sourceOrder || sourceOrder.items.length === 0) {
      return NextResponse.json(
        { error: "Zdrojový stůl nemá žádnou aktivní objednávku k přesunu" },
        { status: 400 }
      );
    }

    // Ověříme existenci cílového stolu a jeho případnou otevřenou objednávku
    const targetTable = await prisma.table.findUnique({
      where: { id: targetTableId },
      include: {
        orders: {
          where: { status: "open" },
          include: { items: true },
        },
      },
    });

    if (!targetTable) {
      return NextResponse.json(
        { error: "Cílový stůl neexistuje" },
        { status: 404 }
      );
    }

    const targetOrder = targetTable.orders[0];

    await prisma.$transaction(async (tx) => {
      if (targetOrder) {
        // SCÉNÁŘ A: SLOUČENÍ – cílový stůl už má otevřený účet
        // Přesuneme všechny OrderItems ze zdrojové objednávky do cílové
        await tx.orderItem.updateMany({
          where: { orderId: sourceOrder.id },
          data: { orderId: targetOrder.id },
        });

        // Původní prázdnou objednávku smažeme nebo uzavřeme
        await tx.order.delete({
          where: { id: sourceOrder.id },
        });
      } else {
        // SCÉNÁŘ B: PŘESUN – cílový stůl je volný
        // Převedeme existující objednávku na cílový stůl
        await tx.order.update({
          where: { id: sourceOrder.id },
          data: { tableId: targetTableId },
        });

        // Označíme cílový stůl jako obsazený
        await tx.table.update({
          where: { id: targetTableId },
          data: { status: "occupied" },
        });
      }

      // Zdrojový stůl uvolníme
      await tx.table.update({
        where: { id: sourceTableId },
        data: { status: "open" },
      });
    });

    return NextResponse.json({
      success: true,
      message: targetOrder
        ? "Účty byly úspěšně sloučeny"
        : "Účet byl úspěšně přesunut",
    });
  } catch (error) {
    console.error("Chyba při přesunu stolu:", error);
    return NextResponse.json(
      { error: "Chyba při přesunu stolu" },
      { status: 500 }
    );
  }
}
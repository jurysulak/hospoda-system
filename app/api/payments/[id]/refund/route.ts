import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const paymentId = Number(id);

    if (isNaN(paymentId)) {
      return NextResponse.json({ error: "Neplatné ID platby" }, { status: 400 });
    }

    // Najít platbu
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          include: {
            table: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Platba nebyla nalezena" }, { status: 404 });
    }

    const tableId = payment.order?.tableId;

    // Bezpečná transakce
    await prisma.$transaction(async (tx) => {
      // 1. Smazat platbu
      await tx.payment.delete({
        where: { id: paymentId },
      });

      // 2. Vrátit objednávku do stavu "open"
      if (payment.orderId) {
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            status: "open",
            closedAt: null,
          },
        });
      }

      // 3. Vrátit stůl do stavu "occupied"
      if (tableId) {
        await tx.table.update({
          where: { id: tableId },
          data: {
            status: "occupied",
          },
        });
      }
    });

    return NextResponse.json({ success: true, tableId }, { status: 200 });
  } catch (error) {
    console.error("Chyba při stornování platby:", error);
    return NextResponse.json(
      { error: "Chyba na serveru při stornu platby" },
      { status: 500 }
    );
  }
}
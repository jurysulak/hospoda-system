import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date"); // formát YYYY-MM-DD

    // Pokud datum není zadáno, vezme se dnešek
    const targetDate = dateParam ? new Date(dateParam) : new Date();

    const startOfDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      0,
      0,
      0,
      0
    );
    const endOfDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      23,
      59,
      59,
      999
    );

    const payments = await prisma.payment.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        order: {
          include: {
            table: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Výpočty souhrnů
    let cashTotal = 0;
    let cardTotal = 0;
    let totalAmount = 0;
    const byTableMap: Record<string, number> = {};

    for (const payment of payments) {
      totalAmount += payment.amount;

      if (payment.paymentMethod === "CARD") {
        cardTotal += payment.amount;
      } else {
        // Vše ostatní považujeme za hotovost (CASH)
        cashTotal += payment.amount;
      }

      const tableName = payment.order.table?.name || "Neznámý stůl";
      byTableMap[tableName] = (byTableMap[tableName] || 0) + payment.amount;
    }

    const byTable = Object.entries(byTableMap).map(([tableName, amount]) => ({
      tableName,
      amount,
    }));

    return NextResponse.json({
      date: startOfDay.toISOString().split("T")[0],
      totalAmount,
      cashTotal,
      cardTotal,
      paymentCount: payments.length,
      payments,
      byTable,
    });
  } catch (error) {
    console.error("Chyba při načítání souhrnu plateb:", error);
    return NextResponse.json(
      { error: "Chyba při načítání tržeb" },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date"); // YYYY-MM-DD nebo prázdné pro vše

    const whereClause: any = {
      order: {
        table: {
          name: "Personál",
        },
      },
    };

    if (dateParam) {
      const start = new Date(`${dateParam}T00:00:00.000Z`);
      const end = new Date(`${dateParam}T23:59:59.999Z`);
      whereClause.createdAt = { gte: start, lte: end };
    }

    const staffPayments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        order: {
          include: {
            items: true,
            table: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Spočítáme celkovou konzumaci personálu a rozpad položek
    let totalCost = 0;
    const itemsMap: Record<string, { count: number; total: number; unitPrice: number }> = {};

    for (const payment of staffPayments) {
      totalCost += payment.amount;
      for (const item of payment.order.items) {
        if (!itemsMap[item.productName]) {
          itemsMap[item.productName] = {
            count: 0,
            unitPrice: item.unitPrice,
            total: 0,
          };
        }
        itemsMap[item.productName].count += item.quantity;
        itemsMap[item.productName].total += item.quantity * item.unitPrice;
      }
    }

    const itemSummary = Object.entries(itemsMap)
      .map(([name, stat]) => ({
        name,
        count: stat.count,
        unitPrice: stat.unitPrice,
        total: stat.total,
      }))
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({
      totalCost,
      count: staffPayments.length,
      itemSummary,
      records: staffPayments,
    });
  } catch (error: any) {
    console.error("Chyba při načítání historie personálu:", error);
    return NextResponse.json({ error: "Chyba načítání dat" }, { status: 500 });
  }
}
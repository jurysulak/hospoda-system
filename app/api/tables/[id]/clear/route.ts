import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const tables = await prisma.table.findMany({
    orderBy: { id: "asc" },
    include: {
      orders: {
        where: { status: "open" },
        include: {
          items: true,
        },
      },
    },
  });

  const result = tables.map((table) => {
    const openOrder = table.orders[0];
    const items = openOrder?.items ?? [];

    const total = items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    return {
      id: table.id,
      name: table.name,
      status: items.length > 0 ? "occupied" : "free",
      total,
      itemCount: items.length,
    };
  });

  return NextResponse.json(result);
}
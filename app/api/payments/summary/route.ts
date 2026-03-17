import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const now = new Date();

  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );

  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
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

  const totalAmount = payments.reduce(
    (sum: number, payment: any) => sum + payment.amount,
    0
  );

  const paymentCount = payments.length;

  const byTableMap: Record<string, number> = {};

  for (const payment of payments as any[]) {
    const tableName = payment.order.table.name;
    byTableMap[tableName] = (byTableMap[tableName] || 0) + payment.amount;
  }

  const byTable = Object.entries(byTableMap).map(([tableName, amount]) => ({
    tableName,
    amount,
  }));

  return NextResponse.json({
    totalAmount,
    paymentCount,
    payments,
    byTable,
  });
}
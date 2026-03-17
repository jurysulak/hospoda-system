import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const payments = await prisma.payment.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      order: {
        include: {
          table: true,
        },
      },
    },
  });

  const result = payments.map((payment) => ({
    id: payment.id,
    amount: payment.amount,
    paymentMethod: payment.paymentMethod,
    createdAt: payment.createdAt,
    tableName: payment.order.table.name,
    tableId: payment.order.table.id,
  }));

  return NextResponse.json(result);
}
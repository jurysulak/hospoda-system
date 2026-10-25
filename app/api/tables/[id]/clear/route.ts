import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tableId = Number(id);

  // 1. Nastavíme status stolu zpět na open
  await prisma.table.update({
    where: { id: tableId },
    data: {
      status: "open",
    },
  });

  const order = await prisma.order.findFirst({
    where: {
      tableId,
      status: "open",
    },
    include: {
      items: true,
    },
  });

  if (!order) {
    return NextResponse.json({ success: true });
  }

  // 2. Smažeme položky a uzavřeme objednávku
  await prisma.orderItem.deleteMany({
    where: {
      orderId: order.id,
    },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "closed",
      closedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
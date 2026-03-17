import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const items: { itemId: number; quantity: number }[] = body.items || [];

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "Nebyly vybrány žádné položky k zaplacení" },
      { status: 400 }
    );
  }

  const tableId = Number(id);

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
    return NextResponse.json(
      { error: "Otevřená objednávka neexistuje" },
      { status: 404 }
    );
  }

  let amount = 0;

  for (const selected of items) {
    const orderItem = order.items.find(
      (item: any) => item.id === selected.itemId
    );

    if (!orderItem) continue;
    if (selected.quantity <= 0) continue;
    if (selected.quantity > orderItem.quantity) continue;

    amount += orderItem.unitPrice * selected.quantity;

    if (selected.quantity === orderItem.quantity) {
      await prisma.orderItem.delete({
        where: { id: orderItem.id },
      });
    } else {
      await prisma.orderItem.update({
        where: { id: orderItem.id },
        data: {
          quantity: orderItem.quantity - selected.quantity,
        },
      });
    }
  }

  if (amount === 0) {
    return NextResponse.json(
      { error: "Nebyla zaplacena žádná platná položka" },
      { status: 400 }
    );
  }

  await prisma.payment.create({
    data: {
      orderId: order.id,
      amount,
      paymentMethod: "hotově",
    },
  });

  const remainingItems = await prisma.orderItem.count({
    where: {
      orderId: order.id,
    },
  });

  if (remainingItems === 0) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "closed",
        closedAt: new Date(),
      },
    });
  }

  return NextResponse.json({
    success: true,
    paidAmount: amount,
    remainingItems,
  });
}
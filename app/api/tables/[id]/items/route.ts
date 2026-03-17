import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const productId = Number(body.productId);

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    return NextResponse.json({ error: "Produkt nenalezen" }, { status: 404 });
  }

  let order = await prisma.order.findFirst({
    where: {
      tableId: Number(id),
      status: "open",
    },
  });

  if (!order) {
    order = await prisma.order.create({
      data: {
        tableId: Number(id),
        status: "open",
      },
    });
  }

  const existingItem = await prisma.orderItem.findFirst({
    where: {
      orderId: order.id,
      productId: product.id,
      unitPrice: product.price,
    },
  });

  if (existingItem) {
    const updatedItem = await prisma.orderItem.update({
      where: { id: existingItem.id },
      data: {
        quantity: existingItem.quantity + 1,
      },
    });

    return NextResponse.json(updatedItem);
  }

  const item = await prisma.orderItem.create({
    data: {
      orderId: order.id,
      productId: product.id,
      productName: product.name,
      unitPrice: product.price,
      quantity: 1,
    },
  });

  return NextResponse.json(item);
}
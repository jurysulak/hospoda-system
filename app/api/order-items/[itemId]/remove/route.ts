import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;

  const id = Number(itemId);

  const item = await prisma.orderItem.findUnique({
    where: { id },
  });

  if (!item) {
    return NextResponse.json({ error: "Položka nenalezena" }, { status: 404 });
  }

  if (item.quantity <= 1) {
    await prisma.orderItem.delete({
      where: { id },
    });
  } else {
    await prisma.orderItem.update({
      where: { id },
      data: {
        quantity: item.quantity - 1,
      },
    });
  }

  return NextResponse.json({ success: true });
}
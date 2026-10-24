// app/api/order-items/[id]/add/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = Number(id);

    const updated = await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        quantity: { increment: 1 },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Chyba při přičtení položky:", error);
    return NextResponse.json({ error: "Chyba při přičtení položky" }, { status: 500 });
  }
}
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const numericId = Number(itemId);

    if (isNaN(numericId)) {
      return NextResponse.json(
        { error: "Neplatné ID položky" },
        { status: 400 }
      );
    }

    const updated = await prisma.orderItem.update({
      where: { id: numericId },
      data: {
        quantity: { increment: 1 },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Chyba při přičtení položky:", error);
    return NextResponse.json(
      { error: "Chyba při přičtení položky" },
      { status: 500 }
    );
  }
}
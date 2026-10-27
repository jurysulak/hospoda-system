import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const resolvedParams = await params;
    const itemId = parseInt(resolvedParams.itemId, 10);

    if (isNaN(itemId)) {
      return NextResponse.json({ error: "Neplatné ID položky" }, { status: 400 });
    }

    const body = await request.json();
    const { status } = body;

    const updated = await prisma.orderItem.update({
      where: { id: itemId },
      data: { status: status || "SERVED" },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Chyba při změně stavu položky:", error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
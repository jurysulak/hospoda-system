import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = parseInt(id, 10);

    if (isNaN(itemId)) {
      return NextResponse.json(
        { error: "Neplatné ID položky" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status } = body; // "DONE" nebo "PENDING"

    const updatedItem = await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        status: status || "DONE",
      },
    });

    return NextResponse.json(updatedItem, { status: 200 });
  } catch (error: any) {
    console.error("Chyba při aktualizaci stavu jídla:", error);
    return NextResponse.json(
      { error: "Nepodařilo se aktualizovat stav položky", details: error?.message },
      { status: 500 }
    );
  }
}
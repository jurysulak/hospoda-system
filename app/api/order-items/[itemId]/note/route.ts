import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const body = await request.json();
    const { note } = body;

    const updatedItem = await prisma.orderItem.update({
      where: { id: Number(itemId) },
      data: {
        note: note ? note.trim() : null,
      },
    });

    return NextResponse.json(updatedItem, { status: 200 });
  } catch (error) {
    console.error("Chyba při ukládání poznámky k položce:", error);
    return NextResponse.json(
      { error: "Nepodařilo se uložit poznámku" },
      { status: 500 }
    );
  }
}   
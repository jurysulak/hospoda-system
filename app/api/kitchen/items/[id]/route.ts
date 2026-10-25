import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body; // "DONE" | "PENDING"

    const updatedItem = await prisma.orderItem.update({
      where: { id: Number(id) },
      data: {
        status: status || "DONE",
      },
    });

    return NextResponse.json(updatedItem, { status: 200 });
  } catch (error) {
    console.error("Chyba při změně stavu položky v kuchyni:", error);
    return NextResponse.json(
      { error: "Nepodařilo se změnit stav položky" },
      { status: 500 }
    );
  }
}
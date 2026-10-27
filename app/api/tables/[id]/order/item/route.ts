import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Odebrání nebo snížení počtu položky
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = parseInt(searchParams.get("itemId") || "", 10);

    if (isNaN(itemId)) {
      return NextResponse.json({ error: "Neplatné ID položky" }, { status: 400 });
    }

    const item = await prisma.orderItem.findUnique({ where: { id: itemId } });
    if (!item) {
      return NextResponse.json({ error: "Položka nenalezena" }, { status: 404 });
    }

    if (item.quantity > 1) {
      // Snížíme o 1 ks
      await prisma.orderItem.update({
        where: { id: itemId },
        data: { quantity: item.quantity - 1 },
      });
    } else {
      // Při 1 ks smažeme celou položku
      await prisma.orderItem.delete({
        where: { id: itemId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

// Uložení poznámky k položce
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { itemId, note } = body;

    const updated = await prisma.orderItem.update({
      where: { id: Number(itemId) },
      data: { note: note?.trim() || null },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
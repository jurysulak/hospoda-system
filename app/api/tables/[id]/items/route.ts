// app/api/tables/[id]/items/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const tableId = parseInt(resolvedParams.id, 10);

    if (isNaN(tableId)) {
      return NextResponse.json({ error: "Neplatné ID stolu" }, { status: 400 });
    }

    const body = await request.json();
    const { productId, quantity = 1, note } = body;
    const prodId = parseInt(String(productId), 10);
    const qtyToAdd = Number(quantity) || 1;

    if (isNaN(prodId)) {
      return NextResponse.json({ error: "Neplatné ID produktu" }, { status: 400 });
    }

    // Najde nebo automaticky založí otevřenou objednávku
    let order = await prisma.order.findFirst({
      where: { tableId, status: "open" },
    });

    if (!order) {
      order = await prisma.order.create({
        data: { tableId, status: "open" },
      });
    }

    const product = await prisma.product.findUnique({
      where: { id: prodId },
    });

    if (!product) {
      return NextResponse.json({ error: "Produkt nenalezen" }, { status: 404 });
    }

    // Zkontrolujeme, zda už stejná položka (se stejnou poznámkou) na účtu existuje
    const cleanNote = note?.trim() || null;
    const existingItem = await prisma.orderItem.findFirst({
      where: {
        orderId: order.id,
        productId: product.id,
        note: cleanNote,
        status: { not: "PENDING" },
      },
    });

    if (existingItem) {
      // Pouze navýšíme počet kusů
      const updatedItem = await prisma.orderItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + qtyToAdd },
      });
      return NextResponse.json(updatedItem, { status: 200 });
    }

    // Jinak rovnou vytvoříme položku jako hotovou/započtenou (SERVED)
    const newItem = await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: qtyToAdd,
        status: "SERVED",
        note: cleanNote,
      },
    });

    return NextResponse.json(newItem, { status: 201 });
  } catch (error: any) {
    console.error("Chyba při přidávání položky:", error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
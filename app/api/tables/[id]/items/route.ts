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
    if (isNaN(prodId)) {
      return NextResponse.json({ error: "Neplatné ID produktu" }, { status: 400 });
    }

    // Najdeme nebo založíme otevřenou objednávku pro stůl
    let order = await prisma.order.findFirst({
      where: {
        tableId: tableId,
        status: "open",
      },
    });

    if (!order) {
      order = await prisma.order.create({
        data: {
          tableId: tableId,
          status: "open",
        },
      });
    }

    // Načteme produkt pro zjištění aktuální ceny a názvu
    const product = await prisma.product.findUnique({
      where: { id: prodId },
    });

    if (!product) {
      return NextResponse.json({ error: "Produkt nenalezen" }, { status: 404 });
    }

    // VŽDY vytvoříme novou samostatnou položku se statusem PENDING (k přípravě)
    const newItem = await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: Number(quantity) || 1,
        status: "PENDING",
        note: note?.trim() || null,
      },
    });

    return NextResponse.json(newItem, { status: 201 });
  } catch (error: any) {
    console.error("Chyba při přidávání položky:", error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
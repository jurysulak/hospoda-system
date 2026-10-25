import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Úprava produktu (název, cena, kategorie)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, price, category } = body;

    const updatedProduct = await prisma.product.update({
      where: { id: Number(id) },
      data: {
        name: name?.trim(),
        price: Number(price),
        category: category?.trim(),
      },
    });

    return NextResponse.json(updatedProduct, { status: 200 });
  } catch (error) {
    console.error("Chyba při úpravě produktu:", error);
    return NextResponse.json(
      { error: "Nepodařilo se upravit produkt" },
      { status: 500 }
    );
  }
}

// Smazání produktu
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.product.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Chyba při mazání produktu:", error);
    return NextResponse.json(
      { error: "Nepodařilo se smazat produkt (může být navázán na historii objednávek)" },
      { status: 500 }
    );
  }
}
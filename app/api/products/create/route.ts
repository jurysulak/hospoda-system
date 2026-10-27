import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category, price, vatRate } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Název produktu je povinný" },
        { status: 400 }
      );
    }

    const numericPrice = Math.round(Number(price));
    if (isNaN(numericPrice) || numericPrice < 0) {
      return NextResponse.json(
        { error: "Neplatná cena produktu" },
        { status: 400 }
      );
    }

    const numericVatRate = vatRate ? Number(vatRate) : (category === "Jídlo" ? 12 : 21);

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        category: category?.trim() || "Ostatní",
        price: numericPrice,
        vatRate: isNaN(numericVatRate) ? 21 : numericVatRate,
        isActive: true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error("Chyba při vytváření produktu:", error);
    return NextResponse.json(
      { error: "Nepodařilo se vytvořit produkt", details: error?.message },
      { status: 500 }
    );
  }
}
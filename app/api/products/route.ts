import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Načtení všech produktů
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { id: "asc" },
    });
    return NextResponse.json(products);
  } catch (error: any) {
    console.error("GET products error:", error);
    return NextResponse.json(
      { error: "Nepodařilo se načíst produkty" },
      { status: 500 }
    );
  }
}

// Vytvoření nového produktu
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category, price } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Název položky je povinný" },
        { status: 400 }
      );
    }

    const parsedPrice = parseInt(String(price), 10);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json(
        { error: "Cena musí být platné kladné číslo" },
        { status: 400 }
      );
    }

    // Vytvoření produktu bez problémového vatRate
    const newProduct = await prisma.product.create({
      data: {
        name: name.trim(),
        category: category?.trim() || "Nezařazeno",
        price: parsedPrice,
        isActive: true,
      },
    });

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error: any) {
    console.error("POST product error:", error);
    return NextResponse.json(
      { error: "Chyba na serveru při vytváření produktu", details: error?.message },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
    console.error("POST product/create error:", error);
    return NextResponse.json(
      { error: "Chyba na serveru při vytváření produktu", details: error?.message },
      { status: 500 }
    );
  }
}
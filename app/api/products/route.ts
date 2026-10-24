import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        { category: "asc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Chyba při načítání produktů:", error);
    return NextResponse.json(
      { error: "Nepodařilo se načíst produkty" },
      { status: 500 }
    );
  }
}
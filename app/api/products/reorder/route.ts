// app/api/products/reorder/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { productIds } = await request.json();

    if (!Array.isArray(productIds)) {
      return NextResponse.json({ error: "Neplatná data" }, { status: 400 });
    }

    // Hromadně v jedné transakci uložíme novou pozici pro každý produkt
    await prisma.$transaction(
      productIds.map((id: number, index: number) =>
        prisma.product.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Chyba při ukládání pořadí produktů:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
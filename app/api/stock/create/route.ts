import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const name = body.name?.trim();
  const unit = body.unit?.trim() || "ks";
  const quantity = Number(body.quantity || 0);

  if (!name) {
    return NextResponse.json(
      { error: "Název skladové položky je povinný" },
      { status: 400 }
    );
  }

  const item = await prisma.stockItem.create({
    data: {
      name,
      unit,
      quantity,
      isActive: true,
    },
  });

  if (quantity > 0) {
    await prisma.stockMovement.create({
      data: {
        stockItemId: item.id,
        type: "IN",
        quantity,
        note: "Počáteční naskladnění",
      },
    });
  }

  return NextResponse.json(item);
}   
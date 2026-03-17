import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const name = body.name?.trim();
  const category = body.category?.trim();
  const price = Number(body.price);

  if (!name || !category || !price || price <= 0) {
    return NextResponse.json(
      { error: "Neplatná data produktu" },
      { status: 400 }
    );
  }

  const product = await prisma.product.create({
    data: {
      name,
      category,
      price,
      isActive: true,
    },
  });

  return NextResponse.json(product);
}
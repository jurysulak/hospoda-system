import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const price = Number(body.price);

  if (!price || price <= 0) {
    return NextResponse.json(
      { error: "Neplatná cena" },
      { status: 400 }
    );
  }

  const product = await prisma.product.update({
    where: { id: Number(id) },
    data: {
      price,
    },
  });

  return NextResponse.json(product);
}
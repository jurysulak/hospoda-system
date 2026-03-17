import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const product = await prisma.product.update({
    where: { id: Number(id) },
    data: {
      isActive: false,
    },
  });

  return NextResponse.json(product);
}
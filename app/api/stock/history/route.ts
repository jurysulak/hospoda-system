import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const history = await prisma.stockMovement.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      stockItem: true,
    },
  });

  return NextResponse.json(history);
}
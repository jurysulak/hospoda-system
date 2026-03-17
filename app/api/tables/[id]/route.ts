import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const table = await prisma.table.findUnique({
    where: { id: Number(id) },
    include: {
      orders: {
        where: { status: "open" },
        include: {
          items: true,
        },
      },
    },
  });

  if (!table) {
    return NextResponse.json({ error: "Stůl nenalezen" }, { status: 404 });
  }

  return NextResponse.json(table);
}
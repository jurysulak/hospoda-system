import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Načtení všech stolů
export async function GET() {
  const tables = await prisma.table.findMany({
    orderBy: { id: "asc" },
    include: {
      orders: {
        where: { status: "open" },
        include: { items: true },
      },
    },
  });
  return NextResponse.json(tables);
}

// Vytvoření nového stolu přímo z aplikace
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, section = "Vnitřek", posX = 40, posY = 40, width = 110, height = 80 } = body;

    if (!name) {
      return NextResponse.json({ error: "Název stolu je povinný" }, { status: 400 });
    }

    const newTable = await prisma.table.create({
      data: {
        name,
        section,
        posX: Number(posX),
        posY: Number(posY),
        width: Number(width),
        height: Number(height),
        status: "open",
      },
    });

    return NextResponse.json(newTable, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Chyba při vytváření stolu" }, { status: 500 });
  }
}
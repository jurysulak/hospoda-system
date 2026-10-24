import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const section = searchParams.get("section");

    const tables = await prisma.table.findMany({
      where: section ? { section } : undefined,
      orderBy: { id: "asc" },
      include: {
        orders: {
          where: { status: "open" },
          include: {
            items: true,
          },
        },
      },
    });

    const formattedTables = tables.map((table: any) => {
      const openOrder = table.orders?.[0];
      const items = openOrder?.items ?? [];

      const total = items.reduce(
      (sum: number, item: any) => sum + item.unitPrice * item.quantity,
      0
    );
    const itemCount = items.reduce(
      (sum: number, item: any) => sum + item.quantity,
      0
    );

      return {
        id: table.id,
        name: table.name,
        section: table.section,
        status: itemCount > 0 ? "occupied" : (table.status || "open"),
        reservedName: table.reservedName,
        reservedTime: table.reservedTime,
        reservedPax: table.reservedPax,
        total,
        itemCount,
        posX: table.posX ?? 0,
        posY: table.posY ?? 0,
        width: table.width ?? 110,
        height: table.height ?? 75,
      };
    });

    return NextResponse.json(formattedTables);
  } catch (error) {
    console.error("Chyba při stahování stolů:", error);
    return NextResponse.json(
      { error: "Chyba při stahování stolů" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, section, posX, posY, width, height } = body;

    const newTable = await prisma.table.create({
      data: {
        name,
        section: section || "Vnitřek",
        posX: posX ?? 30,
        posY: posY ?? 30,
        width: width ?? 110,
        height: height ?? 75,
        status: "open",
      },
    });

    return NextResponse.json(newTable);
  } catch (error) {
    console.error("Chyba při vytváření stolu:", error);
    return NextResponse.json(
      { error: "Chyba při vytváření stolu" },
      { status: 500 }
    );
  }
}
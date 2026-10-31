// app/api/bar/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // 1. Zkusíme najít existující stůl s názvem BAR
    let barTable = await prisma.table.findFirst({
      where: {
        name: {
          equals: "BAR",
          mode: "insensitive",
        },
      },
    });

    // 2. Pokud stůl BAR ještě neexistuje, vytvoříme ho
    if (!barTable) {
      barTable = await prisma.table.create({
        data: {
          name: "BAR",
          section: "Vnitřek",
          status: "open",
          posX: 0,
          posY: 0,
          width: 120,
          height: 90,
        },
      });
    }

    // 3. Přesměrujeme prohlížeč na detail tohoto stolu s reálným ID
    const url = new URL(request.url);
    return NextResponse.redirect(new URL(`/tables/${barTable.id}`, url.origin));
  } catch (error: any) {
    console.error("Chyba při otevírání Baru:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
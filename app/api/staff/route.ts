// app/api/staff/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    let staffTable = await prisma.table.findFirst({
      where: {
        name: {
          equals: "Personál",
          mode: "insensitive",
        },
      },
    });

    if (!staffTable) {
      staffTable = await prisma.table.create({
        data: {
          name: "Personál",
          section: "Vnitřek",
          status: "open",
          posX: 0,
          posY: 0,
          width: 120,
          height: 90,
        },
      });
    }

    const url = new URL(request.url);
    return NextResponse.redirect(new URL(`/tables/${staffTable.id}`, url.origin));
  } catch (error: any) {
    console.error("Chyba při otevírání stolu Personál:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
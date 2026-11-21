import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Rezervace stolu: stav "reserved" + jméno a čas (stejná pole čte mapa stolů)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tableId = Number(id);
    if (isNaN(tableId)) {
      return NextResponse.json({ error: "Neplatné ID stolu" }, { status: 400 });
    }
    const { isReserved, customerName, reservationTime } = await req.json();

    const table = await prisma.table.findUnique({ where: { id: tableId } });
    if (!table) {
      return NextResponse.json({ error: "Stůl nenalezen" }, { status: 404 });
    }

    const updated = await prisma.table.update({
      where: { id: tableId },
      data: isReserved
        ? {
            status: "reserved",
            reservedName: customerName?.trim() || "Rezervace",
            reservedTime: reservationTime?.trim() || null,
          }
        : {
            // Zrušení rezervace nesmí přepsat obsazený stůl
            status: table.status === "reserved" ? "open" : table.status,
            reservedName: null,
            reservedTime: null,
            reservedPax: null,
          },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Chyba při ukládání rezervace:", error);
    return NextResponse.json({ error: "Chyba při ukládání rezervace" }, { status: 500 });
  }
}

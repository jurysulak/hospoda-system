import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tableId = Number(id);
    const body = await req.json();
    const { isReserved, customerName, reservationTime } = body;

    const updated = await prisma.table.update({
      where: { id: tableId },
      data: {
        isReserved: Boolean(isReserved),
        customerName: isReserved ? customerName || "Rezervace" : null,
        reservationTime: isReserved ? reservationTime || null : null,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
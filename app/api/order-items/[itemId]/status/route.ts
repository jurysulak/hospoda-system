import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { itemId: string } }
) {
  try {
    const itemId = parseInt(params.itemId, 10);
    const body = await request.json();
    const { status } = body;

    const updated = await prisma.orderItem.update({
      where: { id: itemId },
      data: { status: status || "SERVED" },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
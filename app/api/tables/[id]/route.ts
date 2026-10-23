import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { posX, posY, name, width, height } = body;

    const updatedTable = await prisma.table.update({
      where: { id: Number(id) },
      data: {
        ...(posX !== undefined && { posX: Math.round(Number(posX)) }),
        ...(posY !== undefined && { posY: Math.round(Number(posY)) }),
        ...(name !== undefined && { name }),
        ...(width !== undefined && { width: Number(width) }),
        ...(height !== undefined && { height: Number(height) }),
      },
    });

    return NextResponse.json(updatedTable);
  } catch (error) {
    return NextResponse.json({ error: "Chyba při aktualizaci stolu" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.table.delete({
      where: { id: Number(id) },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Chyba při mazání stolu" }, { status: 500 });
  }
}
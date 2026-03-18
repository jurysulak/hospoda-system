import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const stockItemId = Number(body.stockItemId);
  const quantity = Number(body.quantity);
  const type = body.type; // "IN" nebo "OUT"

  if (!stockItemId || !quantity || !type) {
    return NextResponse.json(
      { error: "Neplatná data" },
      { status: 400 }
    );
  }

  const item = await prisma.stockItem.findUnique({
    where: { id: stockItemId },
  });

  if (!item) {
    return NextResponse.json(
      { error: "Položka neexistuje" },
      { status: 404 }
    );
  }

  let newQuantity = item.quantity;

  if (type === "IN") {
    newQuantity += quantity;
  }

  if (type === "OUT") {
    if (quantity > item.quantity) {
      return NextResponse.json(
        { error: "Nedostatek na skladě" },
        { status: 400 }
      );
    }

    newQuantity -= quantity;
  }

  // aktualizace množství
  await prisma.stockItem.update({
    where: { id: item.id },
    data: {
      quantity: newQuantity,
    },
  });

  // záznam do historie
  await prisma.stockMovement.create({
    data: {
      stockItemId: item.id,
      type,
      quantity,
    },
  });

  return NextResponse.json({ success: true });
}
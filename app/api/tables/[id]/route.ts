import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Načtení konkrétního stolu včetně otevřeného účtu a jeho položek
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tableId = Number(id);

    if (isNaN(tableId)) {
      return NextResponse.json({ error: "Neplatné ID stolu" }, { status: 400 });
    }

    const table = await prisma.table.findUnique({
      where: { id: tableId },
      include: {
        orders: {
          where: { status: "open" },
          include: {
            items: {
              orderBy: { id: "asc" },
            },
          },
        },
      },
    });

    if (!table) {
      return NextResponse.json({ error: "Stůl nenalezen" }, { status: 404 });
    }

    return NextResponse.json(table);
  } catch (error) {
    console.error("Chyba při načítání stolu:", error);
    return NextResponse.json(
      { error: "Chyba při načítání stolu" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      posX,
      posY,
      name,
      width,
      height,
      status,
      reservedName,
      reservedTime,
      reservedPax,
    } = body;

    const updatedTable = await prisma.table.update({
      where: { id: Number(id) },
      data: {
        ...(posX !== undefined && { posX: Math.round(Number(posX)) }),
        ...(posY !== undefined && { posY: Math.round(Number(posY)) }),
        ...(name !== undefined && { name }),
        ...(width !== undefined && { width: Number(width) }),
        ...(height !== undefined && { height: Number(height) }),
        ...(status !== undefined && { status }),
        ...(reservedName !== undefined && { reservedName }),
        ...(reservedTime !== undefined && { reservedTime }),
        ...(reservedPax !== undefined && {
          reservedPax: reservedPax ? Number(reservedPax) : null,
        }),
      },
    });

    return NextResponse.json(updatedTable);
  } catch (error) {
    return NextResponse.json(
      { error: "Chyba při aktualizaci stolu" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tableId = Number(id);

    if (isNaN(tableId)) {
      return NextResponse.json({ error: "Neplatné ID stolu" }, { status: 400 });
    }

    // Kaskádové pročištění navázaných dat a smazání stolu
    await prisma.$transaction(async (tx) => {
      // 1. Najdeme ID všech objednávek tohoto stolu
      const orders = await tx.order.findMany({
        where: { tableId },
        select: { id: true },
      });
      const orderIds = orders.map((o) => o.id);

      if (orderIds.length > 0) {
        // 2. Smažeme položky těchto objednávek
        await tx.orderItem.deleteMany({
          where: { orderId: { in: orderIds } },
        });

        // 3. Smažeme navázané platby
        await tx.payment.deleteMany({
          where: { orderId: { in: orderIds } },
        });

        // 4. Smažeme samotné objednávky
        await tx.order.deleteMany({
          where: { id: { in: orderIds } },
        });
      }

      // 5. Nakonec smažeme stůl
      await tx.table.delete({
        where: { id: tableId },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Chyba při mazání stolu:", error);
    return NextResponse.json(
      { error: "Chyba při mazání stolu", details: error?.message },
      { status: 500 }
    );
  }
}
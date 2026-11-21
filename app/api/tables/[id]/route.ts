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

    await prisma.$transaction(async (tx) => {
      // 1. Nezaplacené (otevřené) účty stolu se zahodí, jako dřív
      const openOrders = await tx.order.findMany({
        where: { tableId, status: "open", payments: { none: {} } },
        select: { id: true },
      });
      const openIds = openOrders.map((o) => o.id);
      if (openIds.length > 0) {
        await tx.orderItem.deleteMany({ where: { orderId: { in: openIds } } });
        await tx.order.deleteMany({ where: { id: { in: openIds } } });
      }

      // 2. Má stůl historii plateb? Pak se jen skryje – tržby a záznamy EET musí zůstat.
      const remaining = await tx.order.count({ where: { tableId } });
      if (remaining > 0) {
        await tx.table.update({
          where: { id: tableId },
          data: { deletedAt: new Date(), status: "open", reservedName: null, reservedTime: null, reservedPax: null },
        });
      } else {
        await tx.table.delete({ where: { id: tableId } });
      }
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
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Načteme všechny otevřené objednávky se všemi položkami
    const openOrders = await prisma.order.findMany({
      where: {
        status: "open",
      },
      include: {
        table: true,
        items: {
          orderBy: { id: "asc" },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Převedeme na formát pro kuchyňské bony
    const kitchenTickets = openOrders
      .filter((order) => order.items.length > 0)
      .map((order) => ({
        orderId: order.id,
        tableName: order.table?.name ?? `Stůl ${order.tableId}`,
        section: order.table?.section ?? "Vnitřek",
        createdAt: order.createdAt,
        items: order.items.map((item) => ({
          id: item.id,
          name: item.productName,
          quantity: item.quantity,
          status: item.status || "PENDING",
          note: item.note || null,
        })),
      }));

    return NextResponse.json(kitchenTickets, { status: 200 });
  } catch (error: any) {
    console.error("Chyba při načítání kuchyně:", error);
    return NextResponse.json(
      { error: "Chyba načítání dat kuchyně", details: error?.message },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Zjistíme ID všech produktů, které NEPATŘÍ do kuchyně (nápoje, pivo, alkohol)
    // Případně vyfiltrujeme jen kategorie "Jídlo", "Kuchyně", "Menu" apod.
    const kitchenProducts = await prisma.product.findMany({
      where: {
        category: {
          notIn: ["Pivo", "Alkohol", "Nealko", "Víno", "Káva", "Teplé nápoje"],
        },
      },
      select: { id: true },
    });

    const kitchenProductIds = kitchenProducts.map((p) => p.id);

    // 2. Načteme otevřené objednávky pouze s položkami do kuchyně
    const openOrders = await prisma.order.findMany({
      where: {
        status: "open",
      },
      include: {
        table: true,
        items: {
          where: {
            productId: { in: kitchenProductIds },
          },
          orderBy: { id: "asc" },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // 3. Převedeme na formát pro kuchyňské bony (zobrazíme jen stoly, co mají jídlo)
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
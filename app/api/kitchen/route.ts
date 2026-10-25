import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const KITCHEN_CATEGORIES = [
  "Jídlo",
  "Chuťovky",
  "Pochutiny",
  "Teplá kuchyně",
  "Dezerty",
  "Polévky",
];

export async function GET() {
  try {
    const kitchenProducts = await prisma.product.findMany({
      where: {
        category: {
          in: KITCHEN_CATEGORIES,
          mode: "insensitive",
        },
      },
      select: {
        name: true,
      },
    });

    const kitchenProductNames = new Set(kitchenProducts.map((p) => p.name));

    const openOrders = await prisma.order.findMany({
      where: {
        status: "open",
      },
      include: {
        table: true,
        items: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const kitchenTickets = openOrders
      .map((order) => {
        const foodItems = order.items.filter((item) =>
          kitchenProductNames.has(item.productName)
        );

        if (foodItems.length === 0) return null;

        return {
          orderId: order.id,
          tableName: order.table?.name ?? `Stůl ${order.tableId}`,
          section: order.table?.section ?? "Vnitřek",
          createdAt: order.createdAt,
          items: foodItems.map((item) => ({
            id: item.id,
            name: item.productName,
            quantity: item.quantity,
            status: item.status || "PENDING",
            note: item.note || null,
          })),
        };
      })
      .filter(Boolean);

    return NextResponse.json(kitchenTickets, { status: 200 });
  } catch (error) {
    console.error("Chyba při načítání kuchyňských objednávek:", error);
    return NextResponse.json(
      { error: "Nepodařilo se načíst objednávky pro kuchyň" },
      { status: 500 }
    );
  }
}
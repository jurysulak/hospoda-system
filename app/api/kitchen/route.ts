import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Seznam zakázaných slov pro kuchyň (jak v kategorii, tak v názvu)
const DRINK_KEYWORDS = [
  "pivo",
  "radegast",
  "kozel",
  "plzeň",
  "pilsner",
  "nealko",
  "alko",
  "alkohol",
  "rum",
  "vodka",
  "fernet",
  "slivovice",
  "víno",
  "vino",
  "káva",
  "kava",
  "čaj",
  "caj",
  "espresso",
  "limo",
  "kofola",
  "cola",
  "fanta",
  "sprite",
  "tonic",
  "džus",
  "voda",
  "mattoni",
  "birell",
  "panák",
  "panak",
  "drinky",
  "teplé nápoje",
];

export async function GET() {
  try {
    // Načteme všechny otevřené objednávky včetně produktů
    const openOrders = await prisma.order.findMany({
      where: {
        status: "open",
      },
      include: {
        table: true,
        items: {
          include: {
            product: true,
          },
          orderBy: { id: "asc" },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Filtrujeme pouze čistě jídla
    const kitchenTickets = openOrders
      .map((order) => {
        const foodItems = order.items.filter((item) => {
          const cat = (item.product?.category || "").toLowerCase().trim();
          const name = (item.productName || item.product?.name || "").toLowerCase().trim();

          // Pokud název nebo kategorie obsahuje cokoliv z nápojů, vyřadíme to
          const isDrink = DRINK_KEYWORDS.some(
            (kw) => cat.includes(kw) || name.includes(kw)
          );

          return !isDrink;
        });

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
      .filter((ticket) => ticket.items.length > 0); // Zobrazíme jen stoly, co mají reálné jídlo

    return NextResponse.json(kitchenTickets, { status: 200 });
  } catch (error: any) {
    console.error("Chyba při načítání kuchyně:", error);
    return NextResponse.json(
      { error: "Chyba načítání dat kuchyně", details: error?.message },
      { status: 500 }
    );
  }
}
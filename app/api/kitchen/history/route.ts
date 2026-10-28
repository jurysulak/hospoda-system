import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DRINK_KEYWORDS = [
  "pivo", "radegast", "kozel", "plzeň", "pilsner", "nealko", "alko",
  "alkohol", "rum", "vodka", "fernet", "slivovice", "víno", "vino",
  "káva", "kava", "čaj", "caj", "espresso", "limo", "kofola", "cola",
  "fanta", "sprite", "tonic", "džus", "voda", "mattoni", "birell",
  "panák", "panak", "drinky", "teplé nápoje"
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const year = parseInt(searchParams.get("year") || String(now.getFullYear()), 10);
    const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1), 10);

    const startDate = new Date(year, month - 1, 1, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Načteme všechny položky objednávek za vybraný měsíc
    const items = await prisma.orderItem.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        product: true,
        order: {
          include: { table: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Filtrujeme pouze čistě jídla
    const foodItems = items.filter((item) => {
      const cat = (item.product?.category || "").toLowerCase().trim();
      const name = (item.productName || item.product?.name || "").toLowerCase().trim();
      return !DRINK_KEYWORDS.some((kw) => cat.includes(kw) || name.includes(kw));
    });

    // Měsíční souhrny
    let monthTotalDishes = 0;
    const dishCountMap: Record<string, number> = {};
    const daysData: Record<string, {
      date: string;
      day: number;
      totalDishes: number;
      dishes: Record<string, number>;
      orders: {
        id: number;
        time: string;
        tableName: string;
        productName: string;
        quantity: number;
        note?: string | null;
      }[];
    }> = {};

    for (const item of foodItems) {
      const dateKey = new Date(item.createdAt).toISOString().split("T")[0];
      const dayNum = new Date(item.createdAt).getDate();

      monthTotalDishes += item.quantity;
      dishCountMap[item.productName] = (dishCountMap[item.productName] || 0) + item.quantity;

      if (!daysData[dateKey]) {
        daysData[dateKey] = {
          date: dateKey,
          day: dayNum,
          totalDishes: 0,
          dishes: {},
          orders: [],
        };
      }

      daysData[dateKey].totalDishes += item.quantity;
      daysData[dateKey].dishes[item.productName] =
        (daysData[dateKey].dishes[item.productName] || 0) + item.quantity;

      daysData[dateKey].orders.push({
        id: item.id,
        time: new Date(item.createdAt).toLocaleTimeString("cs-CZ", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        tableName: item.order?.table?.name || "Neznámý stůl",
        productName: item.productName,
        quantity: item.quantity,
        note: item.note,
      });
    }

    // TOP jídla za měsíc seřazená podle počtu porcí
    const topDishes = Object.entries(dishCountMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      year,
      month,
      monthTotalDishes,
      topDishes,
      days: daysData,
    });
  } catch (error: any) {
    console.error("Chyba při načítání záznamů kuchyně:", error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
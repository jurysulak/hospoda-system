// app/api/kitchen/history/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const EXCLUDED_KEYWORDS = [
  "drink",
  "pochutin",
  "jiné",
  "jine",
  "ostatní",
  "ostatni",
  "pivo",
  "radegast",
  "kozel",
  "plzeň",
  "nealko",
  "alko",
  "alkohol",
  "rum",
  "vodka",
  "fernet",
  "víno",
  "vino",
  "káva",
  "kava",
  "čaj",
  "caj",
  "limo",
  "kofola",
  "cola",
  "birell",
  "panák",
  "panak",
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = Number(searchParams.get("year")) || now.getFullYear();
    const month = Number(searchParams.get("month")) || now.getMonth() + 1;

    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Načteme všechny položky z uzavřených i otevřených objednávek daného měsíce
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        table: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    let monthTotalDishes = 0;
    let monthTotalRevenue = 0;
    const topDishesMap: Record<string, { count: number; totalRevenue: number; price: number }> = {};
    const daysMap: Record<string, any> = {};

    for (const order of orders) {
      const orderDateStr = new Date(order.createdAt).toISOString().split("T")[0];
      const dayNum = new Date(order.createdAt).getDate();

      if (!daysMap[orderDateStr]) {
        daysMap[orderDateStr] = {
          date: orderDateStr,
          day: dayNum,
          totalDishes: 0,
          totalRevenue: 0,
          dishes: {} as Record<string, { count: number; unitPrice: number; total: number }>,
          orders: [],
        };
      }

      for (const item of order.items) {
        const cat = (item.product?.category || "").toLowerCase().trim();
        const name = (item.productName || item.product?.name || "").toLowerCase().trim();

        // Pokud jde o chuťovky k pivu, do kuchyně patří a nevyřazujeme je
        const isBeerSnack = cat.includes("chuťovk") || cat.includes("chutovk") || name.includes("chuťovk");

        if (!isBeerSnack) {
          const isExcluded = EXCLUDED_KEYWORDS.some((kw) => cat.includes(kw) || name.includes(kw));
          if (isExcluded) continue;
        }

        const unitPrice = item.unitPrice || item.product?.price || 0;
        const lineTotal = unitPrice * item.quantity;
        // ... dál pokračuje zbytek kódu

        monthTotalDishes += item.quantity;
        monthTotalRevenue += lineTotal;

        // Měsíční souhrn jídel
        if (!topDishesMap[item.productName]) {
          topDishesMap[item.productName] = { count: 0, totalRevenue: 0, price: unitPrice };
        }
        topDishesMap[item.productName].count += item.quantity;
        topDishesMap[item.productName].totalRevenue += lineTotal;

        // Denní souhrn
        daysMap[orderDateStr].totalDishes += item.quantity;
        daysMap[orderDateStr].totalRevenue += lineTotal;

        if (!daysMap[orderDateStr].dishes[item.productName]) {
          daysMap[orderDateStr].dishes[item.productName] = {
            count: 0,
            unitPrice: unitPrice,
            total: 0,
          };
        }
        daysMap[orderDateStr].dishes[item.productName].count += item.quantity;
        daysMap[orderDateStr].dishes[item.productName].total += lineTotal;

        const timeStr = new Date(order.createdAt).toLocaleTimeString("cs-CZ", {
          hour: "2-digit",
          minute: "2-digit",
        });

        daysMap[orderDateStr].orders.push({
          id: item.id,
          time: timeStr,
          tableName: order.table?.name || `Stůl ${order.tableId}`,
          productName: item.productName,
          unitPrice,
          totalPrice: lineTotal,
          quantity: item.quantity,
          note: item.note || null,
        });
      }
    }

    const topDishes = Object.entries(topDishesMap)
      .map(([name, stat]) => ({
        name,
        count: stat.count,
        price: stat.price,
        totalRevenue: stat.totalRevenue,
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      year,
      month,
      monthTotalDishes,
      monthTotalRevenue,
      topDishes,
      days: daysMap,
    });
  } catch (error: any) {
    console.error("Kitchen history error:", error);
    return NextResponse.json({ error: "Chyba historie kuchyně" }, { status: 500 });
  }
}
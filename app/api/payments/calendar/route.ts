import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const now = new Date();
        const year = parseInt(searchParams.get("year") || String(now.getFullYear()), 10);
        const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1), 10); // 1 - 12

        // Začátek a konec vybraného měsíce
        const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

        const payments = await prisma.payment.findMany({
            where: {
                createdAt: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                },
            },
            include: {
                order: {
                    include: {
                        table: true,
                        items: true,
                    },
                },
            },
            orderBy: { createdAt: "asc" },
        });

        // Denní agregace (klíč: "YYYY-MM-DD")
        const dailyMap: Record<
            string,
            {
                date: string;
                day: number;
                total: number;
                cash: number;
                card: number;
                count: number;
                payments: any[];
            }
        > = {};

        let monthTotal = 0;
        let monthCash = 0;
        let monthCard = 0;

        for (const p of payments) {
            const d = new Date(p.createdAt);
            const dateKey = d.toISOString().split("T")[0]; // YYYY-MM-DD
            const dayNum = d.getDate();

            if (!dailyMap[dateKey]) {
                dailyMap[dateKey] = {
                    date: dateKey,
                    day: dayNum,
                    total: 0,
                    cash: 0,
                    card: 0,
                    count: 0,
                    payments: [],
                };
            }

            dailyMap[dateKey].total += p.amount;
            dailyMap[dateKey].count += 1;
            monthTotal += p.amount;

            if (p.paymentMethod === "CARD") {
                dailyMap[dateKey].card += p.amount;
                monthCard += p.amount;
            } else {
                dailyMap[dateKey].cash += p.amount;
                monthCash += p.amount;
            }

            dailyMap[dateKey].payments.push({
                id: p.id,
                amount: p.amount,
                method: p.paymentMethod || "CASH",
                tableName: p.order?.table?.name || "Stůl",
                time: d.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" }),
                receiptNumber: (p as any).receiptNumber || `#${p.id}`,
            });
        }

        return NextResponse.json({
            year,
            month,
            monthTotal,
            monthCash,
            monthCard,
            paymentCount: payments.length,
            days: dailyMap,
        });
    } catch (error: any) {
        console.error("Chyba při načítání kalendáře tržeb:", error);
        return NextResponse.json(
            { error: "Nepodařilo se načíst kalendář tržeb" },
            { status: 500 }
        );
    }
}
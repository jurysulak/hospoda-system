export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: queryDate } = await searchParams;

  // Výběr data (výchozí je dnešek)
  const targetDate = queryDate ? new Date(queryDate) : new Date();

  const startOfDay = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
    0,
    0,
    0,
    0
  );

  const endOfDay = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
    23,
    59,
    59,
    999
  );

  // Načtení všech plateb za vybraný den včetně objednávek a položek
  const payments: any[] = await prisma.payment.findMany({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
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
    orderBy: {
      createdAt: "desc",
    },
  });

  // Základní metriky
  const totalAmount = payments.reduce(
    (sum: number, p: any) => sum + (p.amount ?? 0),
    0
  );
  const paymentCount = payments.length;

  // Rozpad podle metody (Hotově vs. Kartou)
  const cashAmount = payments
    .filter((p: any) => p.paymentMethod === "CASH" || !p.paymentMethod)
    .reduce((sum: number, p: any) => sum + (p.amount ?? 0), 0);

  const cardAmount = payments
    .filter((p: any) => p.paymentMethod === "CARD")
    .reduce((sum: number, p: any) => sum + (p.amount ?? 0), 0);

  // Souhrn podle stolů
  const byTableMap: Record<string, { amount: number; count: number }> = {};
  for (const payment of payments) {
    const tableName = payment.order?.table?.name ?? "Neznámý stůl";
    if (!byTableMap[tableName]) {
      byTableMap[tableName] = { amount: 0, count: 0 };
    }
    byTableMap[tableName].amount += payment.amount ?? 0;
    byTableMap[tableName].count += 1;
  }

  const byTable = Object.entries(byTableMap).sort(
    (a, b) => b[1].amount - a[1].amount
  );

  // Souhrn podle prodaných položek
  const itemsMap: Record<string, { qty: number; total: number }> = {};
  for (const payment of payments) {
    const items = payment.order?.items ?? [];
    for (const item of items) {
      if (!itemsMap[item.productName]) {
        itemsMap[item.productName] = { qty: 0, total: 0 };
      }
      itemsMap[item.productName].qty += item.quantity;
      itemsMap[item.productName].total += item.quantity * item.unitPrice;
    }
  }

  const topItems = Object.entries(itemsMap).sort(
    (a, b) => b[1].qty - a[1].qty
  );

  const formattedDate = targetDate.toLocaleDateString("cs-CZ", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const isoDate = targetDate.toISOString().split("T")[0];

  return (
    <main className="min-h-screen bg-slate-200 p-3 sm:p-6 select-none print:bg-white print:p-0">
      <div className="mx-auto max-w-6xl space-y-4">
        {/* Horní navigace */}
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href="/"
            className="inline-flex rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 cursor-pointer"
          >
            ← Zpět na přehled
          </Link>

          {/* Výběr data */}
          <form method="GET" className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl shadow-xs">
            <span className="text-xs font-bold text-slate-500">Datum:</span>
            <input
              type="date"
              name="date"
              defaultValue={isoDate}
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900"
            />
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
            >
              Zobrazit
            </button>
          </form>
        </div>

        {/* Hlavička uzávěrky */}
        <div className="rounded-3xl bg-white p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Denní uzávěrka plateb
            </h1>
            <p className="mt-1 text-sm font-semibold capitalize text-slate-500">
              {formattedDate}
            </p>
          </div>

          <button
            onClick={() => {}} // Využije browser print
            className="print:hidden rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            🖨️ Vytisknout uzávěrku
          </button>
        </div>

        {/* Hlavní karty – Celkem, Hotovost, Karta */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl bg-slate-900 text-white p-5 shadow-xs">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Celková tržba
            </div>
            <div className="mt-2 text-3xl font-black">
              {totalAmount.toLocaleString("cs-CZ")} Kč
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {paymentCount} {paymentCount === 1 ? "platba" : paymentCount < 5 ? "platby" : "plateb"}
            </div>
          </div>

          <div className="rounded-3xl bg-emerald-50 border border-emerald-200 p-5 shadow-xs">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              💵 Hotovost (V kase)
            </div>
            <div className="mt-2 text-3xl font-black text-emerald-950">
              {cashAmount.toLocaleString("cs-CZ")} Kč
            </div>
            <div className="mt-1 text-xs text-emerald-700">
              Fyzický stav pokladny
            </div>
          </div>

          <div className="rounded-3xl bg-blue-50 border border-blue-200 p-5 shadow-xs">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-800">
              💳 Platební terminál
            </div>
            <div className="mt-2 text-3xl font-black text-blue-950">
              {cardAmount.toLocaleString("cs-CZ")} Kč
            </div>
            <div className="mt-1 text-xs text-blue-700">
              Musí sedět s denní dávkou
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-xs">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Průměrný účet
            </div>
            <div className="mt-2 text-3xl font-black text-slate-800">
              {paymentCount > 0
                ? Math.round(totalAmount / paymentCount).toLocaleString("cs-CZ")
                : 0}{" "}
              Kč
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Na jednu útratu
            </div>
          </div>
        </div>

        {/* Spodní detail: TOP prodané produkty + Stoly + Historie */}
        <div className="grid gap-4 lg:grid-cols-3">
          
          {/* 1. Nejprodávanější položky */}
          <div className="rounded-3xl bg-white p-5 shadow-xs flex flex-col">
            <h2 className="text-base font-black text-slate-900 mb-3">
              🍺 Prodané položky
            </h2>
            <div className="flex-1 overflow-y-auto max-h-80 space-y-2 pr-1">
              {topItems.length === 0 ? (
                <p className="text-xs text-slate-400">Žádný prodej položek.</p>
              ) : (
                topItems.map(([name, data]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{name}</span>
                      <span className="text-slate-500 ml-1.5">({data.qty} ks)</span>
                    </div>
                    <span className="font-black text-slate-900">
                      {data.total.toLocaleString("cs-CZ")} Kč
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 2. Tržba podle stolů */}
          <div className="rounded-3xl bg-white p-5 shadow-xs flex flex-col">
            <h2 className="text-base font-black text-slate-900 mb-3">
              🪑 Tržba podle stolů
            </h2>
            <div className="flex-1 overflow-y-auto max-h-80 space-y-2 pr-1">
              {byTable.length === 0 ? (
                <p className="text-xs text-slate-400">Zatím žádné stoly.</p>
              ) : (
                byTable.map(([tableName, data]) => (
                  <div
                    key={tableName}
                    className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{tableName}</span>
                      <span className="text-slate-400 ml-1.5">({data.count}× účet)</span>
                    </div>
                    <span className="font-black text-slate-900">
                      {data.amount.toLocaleString("cs-CZ")} Kč
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 3. Poslední platby dne */}
          <div className="rounded-3xl bg-white p-5 shadow-xs flex flex-col">
            <h2 className="text-base font-black text-slate-900 mb-3">
              🕒 Poslední platby
            </h2>
            <div className="flex-1 overflow-y-auto max-h-80 space-y-2 pr-1">
              {payments.length === 0 ? (
                <p className="text-xs text-slate-400">Žádné platby za tento den.</p>
              ) : (
                payments.slice(0, 15).map((payment: any) => {
                  const time = new Date(payment.createdAt).toLocaleTimeString("cs-CZ", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const isCard = payment.paymentMethod === "CARD";

                  return (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-mono text-[11px]">{time}</span>
                        <span className="font-bold text-slate-800">
                          {payment.order?.table?.name ?? "Stůl"}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isCard
                              ? "bg-blue-100 text-blue-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {isCard ? "Karta" : "Hotově"}
                        </span>
                      </div>
                      <span className="font-black text-emerald-700">
                        +{(payment.amount ?? 0).toLocaleString("cs-CZ")} Kč
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
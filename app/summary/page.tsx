"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type TopProduct = {
  name: string;
  quantity: number;
  revenue: number;
};

type SummaryData = {
  totalRevenue: number;
  cashRevenue: number;
  cardRevenue: number;
  orderCount: number;
  byTable: { tableName: string; amount: number }[];
  topProducts: TopProduct[];
};

export default function SummaryPage() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  // Získání aktuálního PINu z prohlížeče (nebo výchozí 1234)
  const getMasterPin = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("gastro_summary_pin") || "1234";
    }
    return "1234";
  };

  // Načtení dat po odemčení
  useEffect(() => {
    if (!isUnlocked) return;

    async function fetchSummary() {
      try {
        setLoading(true);
        const res = await fetch("/api/payments/summary", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          const payments = json.payments || [];
          const cardSum =
            json.cardTotal ??
            payments
              .filter((p: any) => p.paymentMethod === "CARD")
              .reduce((sum: number, p: any) => sum + p.amount, 0);

          const cashSum =
            json.cashTotal ??
            payments
              .filter((p: any) => p.paymentMethod !== "CARD")
              .reduce((sum: number, p: any) => sum + p.amount, 0);

          const productMap: Record<string, { quantity: number; revenue: number }> = {};
          for (const p of payments) {
            const items = p.order?.items || [];
            for (const item of items) {
              const name = item.productName || "Neznámá položka";
              const current = productMap[name] || { quantity: 0, revenue: 0 };
              productMap[name] = {
                quantity: current.quantity + item.quantity,
                revenue: current.revenue + item.quantity * item.unitPrice,
              };
            }
          }

          const topProducts: TopProduct[] = Object.entries(productMap)
            .map(([name, val]) => ({ name, ...val }))
            .sort((a, b) => b.quantity - a.quantity);

          setData({
            totalRevenue: json.totalAmount ?? (cashSum + cardSum),
            cashRevenue: cashSum,
            cardRevenue: cardSum,
            orderCount: json.paymentCount ?? payments.length,
            byTable: json.byTable || [],
            topProducts,
          });
        }
      } catch (err) {
        console.error("Chyba načítání dat:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchSummary();
  }, [isUnlocked]);

  const handlePinPress = (digit: string) => {
    if (pinInput.length >= 4) return;
    setPinError(false);
    const nextPin = pinInput + digit;
    setPinInput(nextPin);

    if (nextPin.length === 4) {
      if (nextPin === getMasterPin()) {
        setIsUnlocked(true);
        setPinInput("");
      } else {
        setPinError(true);
        setTimeout(() => {
          setPinInput("");
          setPinError(false);
        }, 600);
      }
    }
  };

  const handleBackspace = () => {
    setPinError(false);
    setPinInput((prev) => prev.slice(0, -1));
  };

  // ZÁMEK: Při každé návštěvě vyžaduje PIN
  if (!isUnlocked) {
    return (
      <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 select-none">
        <div className="w-full max-w-xs flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl shadow-xl mb-4">
            🔒
          </div>

          <h1 className="text-xl font-black text-white tracking-tight">
            Denní souhrn je uzamčen
          </h1>
          <p className="text-xs text-slate-400 mt-1 mb-6 text-center">
            Zadej 4místný PIN pro zobrazení tržeb
          </p>

          <div className={`flex gap-3 mb-8 transition-transform ${pinError ? "animate-shake" : ""}`}>
            {[0, 1, 2, 3].map((index) => {
              const isFilled = pinInput.length > index;
              return (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full transition-all duration-200 ${
                    pinError
                      ? "bg-red-500 scale-110"
                      : isFilled
                      ? "bg-amber-400 scale-110 shadow-lg shadow-amber-400/50"
                      : "bg-slate-800 border border-slate-700"
                  }`}
                />
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-3 w-full mb-6">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                onClick={() => handlePinPress(num)}
                className="h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-90 border border-slate-800/80 text-xl font-black text-white transition cursor-pointer shadow-xs"
              >
                {num}
              </button>
            ))}

            <Link
              href="/"
              className="h-16 rounded-2xl bg-slate-950 border border-slate-800 hover:bg-slate-900 text-xs font-bold text-slate-400 flex items-center justify-center transition cursor-pointer active:scale-95"
            >
              Zpět
            </Link>

            <button
              onClick={() => handlePinPress("0")}
              className="h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-90 border border-slate-800/80 text-xl font-black text-white transition cursor-pointer shadow-xs"
            >
              0
            </button>

            <button
              onClick={handleBackspace}
              className="h-16 rounded-2xl bg-slate-950 border border-slate-800 hover:bg-slate-900 active:scale-90 text-sm font-bold text-slate-400 flex items-center justify-center transition cursor-pointer"
            >
              ⌫
            </button>
          </div>

          {pinError && (
            <p className="text-xs font-bold text-red-400 animate-pulse">
              Nesprávný PIN kód
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6 select-none">
      <div className="mx-auto max-w-5xl space-y-5">
        {/* Horní hlavička */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition"
            >
              ← Zpět
            </Link>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              📊 Denní souhrn tržeb
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              ⚙️ Změnit PIN
            </Link>

            <button
              onClick={() => setIsUnlocked(false)}
              className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              🔒 Zamknout
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-400 font-bold">
            Načítám finanční uzávěrku...
          </div>
        ) : !data ? (
          <div className="rounded-3xl bg-white p-12 text-center text-slate-400 border border-slate-200">
            Nepodařilo se načíst data dnešní směny.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-400 block uppercase">Tržba celkem</span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">
                  {data.totalRevenue} Kč
                </span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-400 block uppercase">💵 Hotovost</span>
                <span className="text-2xl font-black text-emerald-600 mt-1 block">
                  {data.cashRevenue} Kč
                </span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-400 block uppercase">💳 Kartou</span>
                <span className="text-2xl font-black text-blue-600 mt-1 block">
                  {data.cardRevenue} Kč
                </span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-400 block uppercase">Počet plateb</span>
                <span className="text-2xl font-black text-slate-700 mt-1 block">
                  {data.orderCount}×
                </span>
              </div>
            </div>

            {data.byTable.length > 0 && (
              <div className="rounded-3xl bg-white border border-slate-200 shadow-xs p-4">
                <h2 className="text-base font-black text-slate-900 mb-3">
                  🪑 Tržba podle jednotlivých stolů
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {data.byTable.map((t) => (
                    <div
                      key={t.tableName}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-3 flex justify-between items-center"
                    >
                      <span className="font-bold text-slate-800 text-sm truncate">
                        {t.tableName}
                      </span>
                      <span className="font-extrabold text-slate-900 text-sm">
                        {t.amount} Kč
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-base font-black text-slate-900">
                  🏆 Nejprodávanější položky dneška
                </h2>
                <span className="text-xs font-bold text-slate-400">
                  {data.topProducts.length} položek
                </span>
              </div>

              {data.topProducts.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm font-medium">
                  Zatím dnes nebyly prodány žádné položky.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.topProducts.map((prod, idx) => (
                    <div
                      key={prod.name}
                      className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-center text-xs font-black text-slate-400">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-slate-900 text-sm">
                          {prod.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                          {prod.quantity} ks
                        </span>
                        <span className="font-black text-slate-900 text-sm w-20">
                          {prod.revenue} Kč
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
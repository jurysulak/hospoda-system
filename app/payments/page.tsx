"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type PaymentItem = {
  id: number;
  amount: number;
  paymentMethod: string;
  createdAt: string;
  order: {
    table: {
      name: string;
    };
  };
};

type SummaryData = {
  date: string;
  totalAmount: number;
  cashTotal: number;
  cardTotal: number;
  paymentCount: number;
  payments: PaymentItem[];
  byTable: { tableName: string; amount: number }[];
};

export default function PaymentsPage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadSummary(dateStr: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/payments/summary?date=${dateStr}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (e) {
      console.error("Chyba při stahování uzávěrky:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary(selectedDate);
  }, [selectedDate]);

  function shiftDay(days: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split("T")[0]);
  }

  const isToday =
    selectedDate === new Date().toISOString().split("T")[0];

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Horní navigační lišta */}
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
            >
              ← Zpět k mapě stolů
            </Link>
            <h1 className="text-2xl font-black text-slate-900">
              Denní tržby a uzávěrka
            </h1>
          </div>

          {/* Přepínání data */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => shiftDay(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              ←
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900"
            />
            <button
              onClick={() => shiftDay(1)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              →
            </button>
            {!isToday && (
              <button
                onClick={() =>
                  setSelectedDate(new Date().toISOString().split("T")[0])
                }
                className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
              >
                Dnes
              </button>
            )}
          </div>
        </header>

        {loading ? (
          <div className="rounded-3xl bg-white p-12 text-center text-slate-400 font-semibold shadow-xs">
            Načítám přehled tržeb...
          </div>
        ) : !summary ? (
          <div className="rounded-3xl bg-white p-12 text-center text-red-500 font-semibold shadow-xs">
            Nepodařilo se načíst data pro vybraný den.
          </div>
        ) : (
          <>
            {/* 3 Souhrnné karty */}
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Celková tržba */}
              <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Celková tržba
                  </span>
                  <div className="mt-2 text-4xl font-black">
                    {summary.totalAmount} Kč
                  </div>
                </div>
                <div className="mt-4 text-xs font-semibold text-slate-400">
                  Počet transakcí: {summary.paymentCount}
                </div>
              </div>

              {/* Hotovost */}
              <div className="rounded-3xl bg-white p-6 border border-emerald-100 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                    💵 Hotovost
                  </span>
                  <div className="mt-2 text-3xl font-black text-slate-900">
                    {summary.cashTotal} Kč
                  </div>
                </div>
                <div className="mt-4 text-xs font-semibold text-slate-500">
                  {summary.totalAmount > 0
                    ? `${Math.round(
                        (summary.cashTotal / summary.totalAmount) * 100
                      )} % z celkové tržby`
                    : "0 %"}
                </div>
              </div>

              {/* Karty */}
              <div className="rounded-3xl bg-white p-6 border border-blue-100 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                    💳 Platební karty
                  </span>
                  <div className="mt-2 text-3xl font-black text-slate-900">
                    {summary.cardTotal} Kč
                  </div>
                </div>
                <div className="mt-4 text-xs font-semibold text-slate-500">
                  {summary.totalAmount > 0
                    ? `${Math.round(
                        (summary.cardTotal / summary.totalAmount) * 100
                      )} % z celkové tržby`
                    : "0 %"}
                </div>
              </div>
            </div>

            {/* Dva sloupce: Přehled podle stolů a Detailní výpis plateb */}
            <div className="grid gap-6 md:grid-cols-[1fr_1.6fr]">
              {/* Tržby podle stolů */}
              <div className="rounded-3xl bg-white p-6 shadow-xs">
                <h2 className="text-lg font-extrabold text-slate-900 mb-4">
                  Tržby podle stolů
                </h2>
                {summary.byTable.length === 0 ? (
                  <p className="text-sm text-slate-400">Žádné tržby pro tento den.</p>
                ) : (
                  <div className="space-y-2">
                    {summary.byTable.map((t) => (
                      <div
                        key={t.tableName}
                        className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100"
                      >
                        <span className="font-bold text-slate-800 text-sm">
                          {t.tableName}
                        </span>
                        <span className="font-black text-slate-900 text-base">
                          {t.amount} Kč
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Historie plateb dne */}
              <div className="rounded-3xl bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Jednotlivé platby ({summary.payments.length})
                  </h2>
                  <button
                    onClick={() => window.print()}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    🖨️ Tisk uzávěrky
                  </button>
                </div>

                {summary.payments.length === 0 ? (
                  <p className="text-sm text-slate-400">V tento den neproběhly žádné platby.</p>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
                    {summary.payments.map((p) => {
                      const time = new Date(p.createdAt).toLocaleTimeString(
                        "cs-CZ",
                        { hour: "2-digit", minute: "2-digit" }
                      );
                      const isCard = p.paymentMethod === "CARD";

                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between py-3"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${
                                isCard
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {isCard ? "💳" : "💵"}
                            </span>
                            <div>
                              <div className="font-bold text-slate-900 text-sm">
                                {p.order.table?.name || "Stůl"}
                              </div>
                              <div className="text-xs text-slate-400">
                                {time} • {isCard ? "Karta" : "Hotovost"}
                              </div>
                            </div>
                          </div>

                          <div className="font-black text-slate-900 text-base">
                            {p.amount} Kč
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
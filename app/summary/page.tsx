"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DayData {
  date: string;
  day: number;
  total: number;
  cash: number;
  card: number;
  count: number;
  payments: {
    id: number;
    amount: number;
    method: string;
    tableName: string;
    time: string;
    receiptNumber: string | null;
  }[];
}

interface CalendarResponse {
  year: number;
  month: number;
  monthTotal: number;
  monthCash: number;
  monthCard: number;
  paymentCount: number;
  days: Record<string, DayData>;
}

export default function SummaryPage() {
  const [pin, setPin] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pinError, setPinError] = useState(false);

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1); // 1-12
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDayDetail, setSelectedDayDetail] = useState<DayData | null>(null);

  // Ověření PIN kódu (výchozí 1234 nebo z localStorage)
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === "1234") {
      setIsAuthorized(true);
      setPinError(false);
    } else {
      setPinError(true);
      setPin("");
    }
  };

  const loadCalendar = async (year: number, month: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/payments/calendar?year=${year}&month=${month}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);

        // Automaticky vybrat dnešní den, pokud je ve vybraném měsíci
        const todayKey = new Date().toISOString().split("T")[0];
        if (json.days && json.days[todayKey]) {
          setSelectedDayDetail(json.days[todayKey]);
        } else {
          setSelectedDayDetail(null);
        }
      }
    } catch (e) {
      console.error("Chyba při stahování kalendáře:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      loadCalendar(selectedYear, selectedMonth);
    }
  }, [isAuthorized, selectedYear, selectedMonth]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  // Výpočet mřížky kalendáře pro daný měsíc (pondělí až neděle)
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const firstDayOfWeek = (new Date(selectedYear, selectedMonth - 1, 1).getDay() + 6) % 7; // 0 = Pondělí, 6 = Neděle

  const monthNames = [
    "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
    "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
  ];

  if (!isAuthorized) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4 select-none">
        <form
          onSubmit={handlePinSubmit}
          className="w-full max-w-sm rounded-3xl bg-slate-800 p-8 shadow-2xl border border-slate-700 space-y-6 text-center"
        >
          <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center text-3xl mx-auto">
            🔒
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Přehled tržeb</h1>
            <p className="text-xs text-slate-400 mt-1">
              Zadej PIN pro vstup do účetnictví
            </p>
          </div>

          <div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full text-center text-3xl tracking-widest font-black py-3 rounded-2xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-amber-500"
              autoFocus
            />
            {pinError && (
              <p className="text-red-400 text-xs font-bold mt-2">
                Nesprávný PIN kód
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Link
              href="/"
              className="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold text-xs transition"
            >
              Zpět
            </Link>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition"
            >
              Odemknout
            </button>
          </div>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-3 sm:p-6 select-none">
      <div className="mx-auto max-w-6xl space-y-4">
        {/* Horní lišta */}
        <header className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition"
            >
              ← Zpět
            </Link>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              📅 Tržby a Kalendář
            </h1>
          </div>

          {/* Přepínač měsíců */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 font-black text-sm flex items-center justify-center text-slate-800 shadow-xs transition"
            >
              ‹
            </button>
            <span className="px-3 font-black text-xs sm:text-sm text-slate-900 min-w-[120px] text-center">
              {monthNames[selectedMonth - 1]} {selectedYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 font-black text-sm flex items-center justify-center text-slate-800 shadow-xs transition"
            >
              ›
            </button>
          </div>
        </header>

        {/* Měsíční souhrn (3 karty) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-xs">
            <span className="text-xs font-black text-emerald-800 uppercase tracking-wider block">
              Celková měsíční tržba
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-950 mt-1 block">
              {data?.monthTotal.toLocaleString("cs-CZ") || 0} Kč
            </span>
            <span className="text-[11px] font-bold text-emerald-700 mt-0.5 block">
              {data?.paymentCount || 0} uzavřených účtů
            </span>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 shadow-xs">
            <span className="text-xs font-black text-blue-800 uppercase tracking-wider block">
              💵 Hotovost
            </span>
            <span className="text-2xl sm:text-3xl font-black text-blue-950 mt-1 block">
              {data?.monthCash.toLocaleString("cs-CZ") || 0} Kč
            </span>
            <span className="text-[11px] font-bold text-blue-700 mt-0.5 block">
              {data?.monthTotal ? Math.round((data.monthCash / data.monthTotal) * 100) : 0} % z celku
            </span>
          </div>

          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-4 shadow-xs">
            <span className="text-xs font-black text-indigo-800 uppercase tracking-wider block">
              💳 Platební karty
            </span>
            <span className="text-2xl sm:text-3xl font-black text-indigo-950 mt-1 block">
              {data?.monthCard.toLocaleString("cs-CZ") || 0} Kč
            </span>
            <span className="text-[11px] font-bold text-indigo-700 mt-0.5 block">
              {data?.monthTotal ? Math.round((data.monthCard / data.monthTotal) * 100) : 0} % z celku
            </span>
          </div>
        </div>

        {/* Hlavní obsah: Kalendář vlevo, Detail dne vpravo */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* KALENDÁŘOVÁ MŘÍŽKA */}
          <div className="lg:col-span-2 rounded-3xl bg-white border border-slate-200 p-4 shadow-xs">
            {/* Dny v týdnu */}
            <div className="grid grid-cols-7 gap-1 text-center font-black text-xs text-slate-400 pb-2 border-b border-slate-100">
              <span>Po</span>
              <span>Út</span>
              <span>St</span>
              <span>Čt</span>
              <span>Pá</span>
              <span className="text-amber-600">So</span>
              <span className="text-amber-600">Ne</span>
            </div>

            {/* Buňky měsíce */}
            <div className="grid grid-cols-7 gap-1.5 pt-2">
              {/* Prázdné buňky před 1. dnem měsíce */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[64px] sm:min-h-[82px] rounded-xl bg-slate-50/40 opacity-30" />
              ))}

              {/* Jednotlivé dny */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateKey = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                const dayInfo = data?.days?.[dateKey];
                const isSelected = selectedDayDetail?.date === dateKey;
                const isToday = new Date().toISOString().split("T")[0] === dateKey;

                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => {
                      if (dayInfo) {
                        setSelectedDayDetail(dayInfo);
                      } else {
                        setSelectedDayDetail({
                          date: dateKey,
                          day: dayNum,
                          total: 0,
                          cash: 0,
                          card: 0,
                          count: 0,
                          payments: [],
                        });
                      }
                    }}
                    className={`min-h-[64px] sm:min-h-[82px] p-1.5 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer active:scale-95 ${
                      isSelected
                        ? "border-amber-500 bg-amber-50/70 shadow-sm ring-2 ring-amber-400"
                        : dayInfo && dayInfo.total > 0
                        ? "border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50"
                        : "border-slate-100 bg-slate-50/60 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-black w-5 h-5 rounded-full flex items-center justify-center ${
                          isToday
                            ? "bg-slate-900 text-white"
                            : "text-slate-700"
                        }`}
                      >
                        {dayNum}
                      </span>
                      {dayInfo && dayInfo.total > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      )}
                    </div>

                    {dayInfo && dayInfo.total > 0 ? (
                      <div className="mt-1">
                        <span className="font-black text-xs sm:text-sm text-slate-900 block leading-tight truncate">
                          {dayInfo.total} Kč
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold block">
                          {dayInfo.count} účtů
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-300 font-bold block mt-auto">
                        0 Kč
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* DETAIL VYBRANÉHO DNE */}
          <div className="rounded-3xl bg-white border border-slate-200 p-4 shadow-xs flex flex-col">
            <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-2">
              📋 Detail dne:{" "}
              <span className="text-amber-600">
                {selectedDayDetail
                  ? new Date(selectedDayDetail.date).toLocaleDateString("cs-CZ")
                  : "Vyber den"}
              </span>
            </h2>

            {selectedDayDetail ? (
              <div className="mt-3 flex-1 flex flex-col justify-between space-y-4">
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block uppercase">
                      Celkem den
                    </span>
                    <span className="text-lg font-black text-slate-900">
                      {selectedDayDetail.total} Kč
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block uppercase">
                      Hotově / Kartou
                    </span>
                    <span className="text-xs font-bold text-slate-700 block mt-1">
                      💵 {selectedDayDetail.cash} Kč
                    </span>
                    <span className="text-xs font-bold text-slate-700 block">
                      💳 {selectedDayDetail.card} Kč
                    </span>
                  </div>
                </div>

                {/* Seznam plateb vybraného dne */}
                <div className="flex-1 overflow-y-auto max-h-72 space-y-1.5 pr-1">
                  {selectedDayDetail.payments.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs font-bold">
                      V tento den neproběhla žádná tržba.
                    </div>
                  ) : (
                    selectedDayDetail.payments.map((p) => (
                      <div
                        key={p.id}
                        className="p-2 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-black text-slate-900 block">
                            {p.tableName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {p.time} • {p.method === "CARD" ? "💳 Kartou" : "💵 Hotově"}
                          </span>
                        </div>
                        <span className="font-black text-sm text-slate-900">
                          {p.amount} Kč
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs font-bold py-12">
                Klikni v kalendáři na jakýkoliv den pro zobrazení podrobností
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { printDailySummaryViaRawBT } from "@/lib/printReceipt";

interface PaymentItem {
  id: number;
  amount: number;
  method: string;
  tableName: string;
  time: string;
  receiptNumber: string | null;
}

interface DayData {
  date: string;
  day: number;
  total: number;
  cash: number;
  card: number;
  count: number;
  payments: PaymentItem[];
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
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDayDetail, setSelectedDayDetail] = useState<DayData | null>(null);

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

  // Vytištění denního souhrnu přímo přes RawBT
  const handlePrintDailySummary = (day: DayData) => {
    printDailySummaryViaRawBT({
      totalAmount: day.total,
      paymentCount: day.count,
      cashAmount: day.cash,
      cardAmount: day.card,
    });
  };

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const firstDayOfWeek = (new Date(selectedYear, selectedMonth - 1, 1).getDay() + 6) % 7;

  const monthNames = [
    "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
    "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
  ];

  // Pomocné funkce pro číselník
  const handleDigitPress = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setPinError(false);
      // Pokud zadáš 4. číslo, automaticky zkontroluje
      if (nextPin.length === 4) {
        if (nextPin === "1234") {
          setIsAuthorized(true);
        } else {
          setPinError(true);
          setTimeout(() => setPin(""), 600);
        }
      }
    }
  };

  const handleDeleteDigit = () => {
    setPin((prev) => prev.slice(0, -1));
    setPinError(false);
  };

  if (!isAuthorized) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4 select-none">
        <div className="w-full max-w-xs rounded-3xl bg-slate-800 p-6 shadow-2xl border border-slate-700 text-center space-y-6">
          <div>
            <div className="w-14 h-14 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3">
              🔒
            </div>
            <h1 className="text-xl font-black text-white">Přehled tržeb</h1>
            <p className="text-xs text-slate-400 mt-1">Zadej 4místný PIN kód</p>
          </div>

          {/* Zobrazení zadaných teček */}
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  pinError
                    ? "bg-red-500 scale-110"
                    : pin.length > i
                    ? "bg-amber-400 scale-110"
                    : "bg-slate-700"
                }`}
              />
            ))}
          </div>

          {pinError && (
            <p className="text-red-400 text-xs font-bold -mt-2">
              Nesprávný PIN kód
            </p>
          )}

          {/* Dotyková klávesnice 1–9 a 0 */}
          <div className="grid grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleDigitPress(num)}
                className="h-16 rounded-2xl bg-slate-700/80 hover:bg-slate-600 active:scale-95 text-2xl font-black text-white shadow-xs transition cursor-pointer"
              >
                {num}
              </button>
            ))}

            <Link
              href="/"
              className="h-16 rounded-2xl bg-slate-700/40 hover:bg-slate-700 active:scale-95 text-xs font-bold text-slate-400 flex items-center justify-center transition"
            >
              Zpět
            </Link>

            <button
              type="button"
              onClick={() => handleDigitPress("0")}
              className="h-16 rounded-2xl bg-slate-700/80 hover:bg-slate-600 active:scale-95 text-2xl font-black text-white shadow-xs transition cursor-pointer"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleDeleteDigit}
              className="h-16 rounded-2xl bg-red-950/40 hover:bg-red-900/60 active:scale-95 text-lg font-black text-red-400 flex items-center justify-center transition cursor-pointer"
            >
              ⌫
            </button>
          </div>
        </div>
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
              📅 Tržby a Denní uzávěrky
            </h1>
          </div>

          {/* Přepínač měsíců */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 font-black text-sm flex items-center justify-center text-slate-800 shadow-xs transition cursor-pointer"
            >
              ‹
            </button>
            <span className="px-3 font-black text-xs sm:text-sm text-slate-900 min-w-[120px] text-center">
              {monthNames[selectedMonth - 1]} {selectedYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 font-black text-sm flex items-center justify-center text-slate-800 shadow-xs transition cursor-pointer"
            >
              ›
            </button>
          </div>
        </header>

        {/* Měsíční souhrn */}
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

        {/* Hlavní grid: Kalendář + Detail vybraného dne */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Kalendář */}
          <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200 p-4 shadow-xs">
            <div className="grid grid-cols-7 gap-1 text-center font-black text-[11px] text-slate-400 mb-2 uppercase">
              <span>Po</span>
              <span>Út</span>
              <span>St</span>
              <span>Čt</span>
              <span>Pá</span>
              <span>So</span>
              <span>Ne</span>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[64px] rounded-xl bg-slate-50/50" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateKey = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(
                  dayNum
                ).padStart(2, "0")}`;
                const dayInfo = data?.days?.[dateKey];
                const isSelected = selectedDayDetail?.date === dateKey;

                return (
                  <button
                    key={dateKey}
                    onClick={() => dayInfo && setSelectedDayDetail(dayInfo)}
                    disabled={!dayInfo}
                    className={`min-h-[68px] p-2 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer ${
                      isSelected
                        ? "border-amber-500 bg-amber-50/60 ring-2 ring-amber-400"
                        : dayInfo
                        ? "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        : "border-slate-100 bg-slate-50/30 opacity-40 cursor-default"
                    }`}
                  >
                    <span className="text-xs font-black text-slate-800">{dayNum}</span>
                    {dayInfo && (
                      <div>
                        <span className="text-xs font-black text-emerald-700 block leading-tight">
                          {dayInfo.total.toLocaleString("cs-CZ")} Kč
                        </span>
                        <span className="text-[10px] text-slate-400 block font-semibold">
                          {dayInfo.count} účtů
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detail dne a tlačítko tisku */}
          <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
            {selectedDayDetail ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Denní detail ({new Date(selectedDayDetail.date).toLocaleDateString("cs-CZ")})
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Celkem {selectedDayDetail.count} uzavřených plateb
                    </p>
                  </div>
                  <button
                    onClick={() => handlePrintDailySummary(selectedDayDetail)}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    🖨️ Tisknout uzávěrku
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 block">Celkem den:</span>
                    <span className="text-base font-black text-emerald-700">
                      {selectedDayDetail.total.toLocaleString("cs-CZ")} Kč
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 block">Hotovost / Karta:</span>
                    <span className="text-xs font-bold text-slate-800 block mt-0.5">
                      💵 {selectedDayDetail.cash} Kč
                    </span>
                    <span className="text-xs font-bold text-slate-800 block">
                      💳 {selectedDayDetail.card} Kč
                    </span>
                  </div>
                </div>

                {/* Seznam účtů daného dne */}
                <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
                  <span className="text-[11px] font-black uppercase text-slate-400 block tracking-wider mb-1">
                    Seznam plateb dne:
                  </span>
                  {selectedDayDetail.payments.map((p) => (
                    <div
                      key={p.id}
                      className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-800">{p.tableName}</span>
                        <span className="text-[10px] text-slate-400 block">
                          {p.time} • {p.method === "CASH" ? "Hotovost" : "Karta"}
                        </span>
                      </div>
                      <span className="font-black text-slate-900">{p.amount} Kč</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <span className="text-3xl mb-2">📋</span>
                <span className="text-xs font-bold">Vyber den v kalendáři pro zobrazení a tisk detailu</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
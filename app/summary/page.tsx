"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

  // Tisk denní uzávěrky (Z-Report) pro 80mm tiskárnu
  const handlePrintDailySummary = (day: DayData) => {
    const printWindow = window.open("", "_blank", "width=380,height=600");
    if (!printWindow) return;

    const formattedDate = new Date(day.date).toLocaleDateString("cs-CZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const paymentsRows = day.payments
      .map(
        (p) => `
        <tr style="border-bottom: 1px dotted #ccc; font-size: 12px;">
          <td style="padding: 3px 0;">${p.time}</td>
          <td style="padding: 3px 0;">${p.tableName}</td>
          <td style="padding: 3px 0; text-align: center;">${p.method === "CASH" ? "HOTOVOST" : "KARTA"}</td>
          <td style="padding: 3px 0; text-align: right; font-weight: bold;">${p.amount} Kč</td>
        </tr>
      `
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Denní uzávěrka - ${formattedDate}</title>
        <style>
          @page { margin: 0; }
          body {
            font-family: monospace, -apple-system, BlinkMacSystemFont, sans-serif;
            width: 76mm;
            margin: 0 auto;
            padding: 8px 4px;
            color: #000;
          }
          .text-center { text-align: center; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .double-divider { border-top: 2px solid #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 3px; }
          .bold { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div style="font-size: 18px; font-weight: 900; letter-spacing: 0.5px;">HOSPODA U ŠULÁKŮ</div>
          <div style="font-size: 13px; font-weight: bold; margin-top: 2px;">DENNÍ UZÁVĚRKA (Z-REPORT)</div>
          <div style="font-size: 12px; margin-top: 2px;">Datum: ${formattedDate}</div>
        </div>

        <div class="double-divider"></div>

        <div class="row">
          <span>Celkový obrat:</span>
          <span class="bold" style="font-size: 15px;">${day.total.toLocaleString("cs-CZ")} Kč</span>
        </div>
        <div class="row">
          <span>Hotovost:</span>
          <span class="bold">${day.cash.toLocaleString("cs-CZ")} Kč</span>
        </div>
        <div class="row">
          <span>Platební karty:</span>
          <span class="bold">${day.card.toLocaleString("cs-CZ")} Kč</span>
        </div>
        <div class="row">
          <span>Počet plateb:</span>
          <span class="bold">${day.count}</span>
        </div>

        <div class="divider"></div>
        <div style="font-size: 11px; font-weight: bold; text-transform: uppercase;">Rozpad plateb dne:</div>

        <table>
          <thead>
            <tr style="border-bottom: 1px solid #000; font-size: 11px;">
              <th style="text-align: left;">Čas</th>
              <th style="text-align: left;">Stůl</th>
              <th style="text-align: center;">Typ</th>
              <th style="text-align: right;">Částka</th>
            </tr>
          </thead>
          <tbody>
            ${paymentsRows}
          </tbody>
        </table>

        <div class="double-divider"></div>
        <div class="text-center" style="font-size: 10px; margin-top: 6px;">
          Vygenerováno: ${new Date().toLocaleTimeString("cs-CZ")} • POS Systém
        </div>

        <script>
          window.onload = function() {
            window.print();
            window.close();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const firstDayOfWeek = (new Date(selectedYear, selectedMonth - 1, 1).getDay() + 6) % 7;

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
              className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer"
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

        {/* Kalendář a detail dne */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-3xl bg-white border border-slate-200 p-4 shadow-xs">
            <div className="grid grid-cols-7 gap-1 text-center font-black text-xs text-slate-400 pb-2 border-b border-slate-100">
              <span>Po</span>
              <span>Út</span>
              <span>St</span>
              <span>Čt</span>
              <span>Pá</span>
              <span className="text-amber-600">So</span>
              <span className="text-amber-600">Ne</span>
            </div>

            <div className="grid grid-cols-7 gap-1.5 pt-2">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[64px] sm:min-h-[82px] rounded-xl bg-slate-50/40 opacity-30" />
              ))}

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
                          isToday ? "bg-slate-900 text-white" : "text-slate-700"
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

          {/* DETAIL VYBRANÉHO DNE S TLAČÍTKEM TISKU */}
          <div className="rounded-3xl bg-white border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="border-b border-slate-100 pb-3 flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider block">
                    Uzávěrka dne
                  </span>
                  <h3 className="text-lg font-black text-slate-900">
                    {selectedDayDetail
                      ? `${selectedDayDetail.day}. ${monthNames[selectedMonth - 1]} ${selectedYear}`
                      : "Vyberte den"}
                  </h3>
                </div>

                {selectedDayDetail && selectedDayDetail.total > 0 && (
                  <button
                    type="button"
                    onClick={() => handlePrintDailySummary(selectedDayDetail)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                    title="Vytisknout lístek denní uzávěrky"
                  >
                    🖨️ Tisknout uzávěrku
                  </button>
                )}
              </div>

              {selectedDayDetail ? (
                <div className="mt-4 space-y-3">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-slate-500 font-semibold">Tržba celkem:</span>
                      <span className="text-lg font-black text-slate-900">{selectedDayDetail.total} Kč</span>
                    </div>
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-slate-500 font-semibold">💵 V hotovosti:</span>
                      <span className="font-bold text-slate-800">{selectedDayDetail.cash} Kč</span>
                    </div>
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-slate-500 font-semibold">💳 Kartou:</span>
                      <span className="font-bold text-slate-800">{selectedDayDetail.card} Kč</span>
                    </div>
                    <div className="flex justify-between items-baseline text-xs pt-1 border-t border-slate-200">
                      <span className="text-slate-500 font-semibold">Počet účtů:</span>
                      <span className="font-bold text-slate-800">{selectedDayDetail.count}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-black text-slate-700 block mb-2">
                      Přehled účtů za den:
                    </span>
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {selectedDayDetail.payments.length > 0 ? (
                        selectedDayDetail.payments.map((p) => (
                          <div
                            key={p.id}
                            className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs font-semibold"
                          >
                            <span className="text-slate-700">
                              <span className="font-bold text-slate-900">{p.time}</span> • {p.tableName}
                              <span className="text-[10px] text-slate-400 ml-1">({p.method === "CASH" ? "Hotově" : "Kartou"})</span>
                            </span>
                            <span className="font-black text-slate-900">{p.amount} Kč</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 font-medium py-3 text-center">
                          V tento den nebyla zaznamenána žádná tržba.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 font-medium py-8 text-center">
                  Vyberte den v kalendáři pro zobrazení detailu.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
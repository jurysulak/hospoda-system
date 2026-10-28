"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DayFoodData {
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
}

interface KitchenHistoryResponse {
  year: number;
  month: number;
  monthTotalDishes: number;
  topDishes: { name: string; count: number }[];
  days: Record<string, DayFoodData>;
}

export default function KitchenHistoryPage() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [data, setData] = useState<KitchenHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDayDetail, setSelectedDayDetail] = useState<DayFoodData | null>(null);

  const loadHistory = async (year: number, month: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/kitchen/history?year=${year}&month=${month}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const json: KitchenHistoryResponse = await res.json();
        setData(json);

        // Výchozí výběr na dnešní den
        const todayKey = new Date().toISOString().split("T")[0];
        if (json.days && json.days[todayKey]) {
          setSelectedDayDetail(json.days[todayKey]);
        } else {
          setSelectedDayDetail(null);
        }
      }
    } catch (e) {
      console.error("Chyba při načítání historie kuchyně:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

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

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const firstDayOfWeek = (new Date(selectedYear, selectedMonth - 1, 1).getDay() + 6) % 7;

  const monthNames = [
    "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
    "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
  ];

  return (
    <main className="min-h-screen bg-slate-100 p-3 sm:p-6 select-none">
      <div className="mx-auto max-w-6xl space-y-4">
        {/* Horní lišta */}
        <header className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2">
            <Link
              href="/kitchen"
              className="rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition"
            >
              ← Zpět do kuchyně
            </Link>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              🍽️ Záznamy kuchyně a jídel
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

        {/* Měsíční souhrn (Karty nahoře) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-xs">
            <span className="text-xs font-black text-amber-800 uppercase tracking-wider block">
              Celkem vydaných porcí
            </span>
            <span className="text-2xl sm:text-3xl font-black text-amber-950 mt-1 block">
              {data?.monthTotalDishes || 0} ks
            </span>
            <span className="text-[11px] font-bold text-amber-700 mt-0.5 block">
              za {monthNames[selectedMonth - 1]} {selectedYear}
            </span>
          </div>

          <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">
              🏆 Nejprodávanější jídla měsíce
            </span>
            <div className="flex flex-wrap gap-2">
              {data?.topDishes && data.topDishes.length > 0 ? (
                data.topDishes.slice(0, 5).map((dish, idx) => (
                  <span
                    key={dish.name}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800"
                  >
                    <span className="text-amber-600 font-black">#{idx + 1}</span>
                    <span>{dish.name}</span>
                    <span className="bg-slate-900 text-white text-[10px] px-1.5 py-0.2 rounded-md font-black">
                      {dish.count}×
                    </span>
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 font-semibold">
                  Žádná vydaná jídla v tomto měsíci
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Kalendář vlevo + Detail dne vpravo */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* MŘÍŽKA KALENDÁŘE */}
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
                <div
                  key={`empty-${i}`}
                  className="min-h-[64px] sm:min-h-[82px] rounded-xl bg-slate-50/40 opacity-30"
                />
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
                          totalDishes: 0,
                          dishes: {},
                          orders: [],
                        });
                      }
                    }}
                    className={`min-h-[64px] sm:min-h-[82px] p-1.5 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer active:scale-95 ${
                      isSelected
                        ? "border-amber-500 bg-amber-50/70 shadow-xs ring-2 ring-amber-400"
                        : dayInfo && dayInfo.totalDishes > 0
                        ? "border-amber-200 bg-amber-50/30 hover:bg-amber-50"
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
                      {dayInfo && dayInfo.totalDishes > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      )}
                    </div>

                    {dayInfo && dayInfo.totalDishes > 0 ? (
                      <div className="mt-1">
                        <span className="font-black text-xs sm:text-sm text-slate-900 block leading-tight">
                          {dayInfo.totalDishes} porcí
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold block truncate">
                          {Object.keys(dayInfo.dishes).length} druhů
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-300 font-bold block mt-auto">
                        0 porcí
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* DETAIL VYBRANÉHO DNE */}
          <div className="rounded-3xl bg-white border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider block">
                  Detail dne
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  {selectedDayDetail
                    ? `${selectedDayDetail.day}. ${monthNames[selectedMonth - 1]} ${selectedYear}`
                    : "Vyberte den v kalendáři"}
                </h3>
                {selectedDayDetail && (
                  <p className="text-xs font-bold text-amber-700 mt-0.5">
                    Celkem uvařeno: {selectedDayDetail.totalDishes} porcí
                  </p>
                )}
              </div>

              {/* Přehled jednotlivých jídel v daný den */}
              <div className="mt-3">
                <span className="text-xs font-black text-slate-700 block mb-2">
                  Rozpad podle jídel:
                </span>
                {selectedDayDetail && Object.keys(selectedDayDetail.dishes).length > 0 ? (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {Object.entries(selectedDayDetail.dishes)
                      .sort(([, a], [, b]) => b - a)
                      .map(([name, count]) => (
                        <div
                          key={name}
                          className="flex justify-between items-center p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-800"
                        >
                          <span className="truncate pr-2">{name}</span>
                          <span className="bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-lg shrink-0">
                            {count}×
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 font-medium py-4 text-center">
                    V tento den nebyla zaznamenána žádná jídla.
                  </div>
                )}
              </div>

              {/* Seznam objednávek podle času */}
              {selectedDayDetail && selectedDayDetail.orders.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <span className="text-xs font-black text-slate-700 block mb-2">
                    Historie objednávek:
                  </span>
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    {selectedDayDetail.orders.map((o) => (
                      <div
                        key={o.id}
                        className="text-[11px] p-1.5 rounded-lg bg-slate-50 flex items-center justify-between text-slate-600"
                      >
                        <span className="font-semibold">
                          <span className="font-bold text-slate-900">{o.time}</span> • {o.tableName}: {o.productName}
                          {o.note && <span className="text-amber-700 ml-1">({o.note})</span>}
                        </span>
                        <span className="font-bold text-slate-900 shrink-0">{o.quantity}×</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
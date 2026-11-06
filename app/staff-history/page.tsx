"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function StaffHistoryPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/staff-history", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6 select-none">
      <div className="mx-auto max-w-5xl space-y-5">
        {/* Horní hlavička */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/section/vnitrek"
              className="rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition"
            >
              ← Zpět na sál
            </Link>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              👔 Konzumace personálu
            </h1>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
            Odděleno od tržeb pokladny
          </span>
        </div>

        {/* Souhrnná karta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Celková hodnota personálky
            </span>
            <div className="mt-2 text-4xl font-black text-amber-400">
              {(data?.totalCost || 0).toLocaleString("cs-CZ")} Kč
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Celkem {data?.count || 0} uzavřených personálních lístků
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 border border-slate-200 shadow-xs">
            <h2 className="text-xs font-black uppercase text-slate-500 tracking-wider mb-2">
              🏆 Co si personál dává nejvíce
            </h2>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {data?.itemSummary?.map((item: any) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 text-xs font-bold text-slate-800"
                >
                  <span>{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md">
                      {item.count}×
                    </span>
                    <span className="text-slate-900 font-extrabold">{item.total} Kč</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Podrobná historie lístků */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Podrobný rozpis konzumace
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400 font-bold">Načítám...</div>
          ) : !data?.records || data.records.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-bold">
              Zatím žádná zaznamenaná konzumace personálu.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.records.map((r: any) => {
                const date = new Date(r.createdAt).toLocaleString("cs-CZ", {
                  dateStyle: "short",
                  timeStyle: "short",
                });
                return (
                  <div key={r.id} className="p-4 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-900">{date}</span>
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md">
                          Personál
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1 flex flex-wrap gap-2">
                        {r.order.items.map((i: any) => (
                          <span key={i.id} className="bg-slate-100 px-2 py-0.5 rounded-md">
                            {i.quantity}× {i.productName} ({i.unitPrice * i.quantity} Kč)
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-black text-slate-900 block">
                        {r.amount} Kč
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
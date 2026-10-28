"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Table {
  id: number;
  name: string;
  section: string;
  orders: {
    id: number;
    items: {
      id: number;
      quantity: number;
      unitPrice: number;
    }[];
  }[];
}

export default function HomePage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTables = async () => {
      try {
        const res = await fetch("/api/tables", { cache: "no-store" });
        if (res.ok) {
          const data: Table[] = await res.json();
          setTables(data);
        }
      } catch (e) {
        console.error("Chyba při načítání stolů:", e);
      } finally {
        setLoading(false);
      }
    };

    loadTables();
  }, []);

  // Vyhledáme stůl "BAR"
  const barTable = tables.find(
    (t) => t.name.trim().toLowerCase() === "bar"
  );

  // Zjistíme, jestli má Bar rozmarkovaný nějaký účet
  const barCurrentOrder = barTable?.orders?.[0];
  const barItemsCount =
    barCurrentOrder?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const barTotalSum =
    barCurrentOrder?.items?.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    ) || 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 flex flex-col justify-between select-none">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        
        {/* Horní hlavička */}
        <header className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-3xl shadow-md">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              🍻 Hospoda U Šuláků
            </h1>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Pokladní systém & Plánek stolů
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/kitchen"
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              👨‍🍳 Kuchyně (KDS)
            </Link>
            <Link
              href="/summary"
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs transition cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              📊 Tržby
            </Link>
          </div>
        </header>

        {/* 🍺 RYCHLÝ STŮL: BAR (Přímé markování) */}
        {barTable && (
          <div className="rounded-3xl bg-linear-to-r from-amber-600 to-amber-700 p-1 shadow-lg shadow-amber-900/20">
            <Link
              href={`/tables/${barTable.id}`}
              className="w-full bg-slate-900 hover:bg-slate-900/90 rounded-[22px] p-4 sm:p-5 flex items-center justify-between transition cursor-pointer active:scale-[0.99] block"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center text-3xl shadow-sm shrink-0">
                  🍺
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl sm:text-2xl font-black text-white">
                      STŮL BAR
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 text-[10px] font-black text-amber-300 uppercase tracking-wider">
                      Rychlý prodej
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    Markování piva a panáků přímo u pípy bez zadávání stolu
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                {barItemsCount > 0 ? (
                  <div>
                    <span className="text-lg sm:text-2xl font-black text-amber-400 block">
                      {barTotalSum} Kč
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      {barItemsCount} ks na účtu
                    </span>
                  </div>
                ) : (
                  <span className="inline-block px-3.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300">
                    Otevřít Bar →
                  </span>
                )}
              </div>
            </Link>
          </div>
        )}

        {/* Sekce místností (Plánky) */}
        <div>
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 px-1">
            Plánky místností
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/section/vnitrek"
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 transition cursor-pointer flex flex-col justify-between h-32 active:scale-98"
            >
              <div className="text-2xl">🏠</div>
              <div>
                <span className="text-lg font-black text-white block">Vnitřek</span>
                <span className="text-xs text-slate-400 font-medium">Hlavní sál a boxy</span>
              </div>
            </Link>

            <Link
              href="/section/zahradka"
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 transition cursor-pointer flex flex-col justify-between h-32 active:scale-98"
            >
              <div className="text-2xl">🌳</div>
              <div>
                <span className="text-lg font-black text-white block">Zahrádka</span>
                <span className="text-xs text-slate-400 font-medium">Venkovní posezení</span>
              </div>
            </Link>

            <Link
              href="/section/salonek"
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 transition cursor-pointer flex flex-col justify-between h-32 active:scale-98"
            >
              <div className="text-2xl">🛋️</div>
              <div>
                <span className="text-lg font-black text-white block">Salónek</span>
                <span className="text-xs text-slate-400 font-medium">Uzavřená společnost</span>
              </div>
            </Link>
          </div>
        </div>

      </div>

      <footer className="max-w-5xl mx-auto w-full text-center text-xs text-slate-600 font-semibold py-4 border-t border-slate-900 mt-6">
        Hospoda U Šuláků POS • Opava
      </footer>
    </main>
  );
}
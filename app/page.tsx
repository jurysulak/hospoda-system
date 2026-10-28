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
      }
    };

    loadTables();
  }, []);

  // Vyhledání stolu Bar (případně fallback na ID 1)
  const barTable = tables.find((t) => t.name.trim().toLowerCase() === "bar");
  const barUrl = barTable ? `/tables/${barTable.id}` : "/tables/1";

  // Zjištění, zda má bar otevřený účet s položkami
  const barItemsCount =
    barTable?.orders?.[0]?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

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
            {/* Tlačítko BAR na kraji v liště */}
            <Link
              href={barUrl}
              className={`px-3.5 py-2 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs ${
                barItemsCount > 0
                  ? "bg-amber-500 hover:bg-amber-400 text-slate-950"
                  : "bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30"
              }`}
              title="Přejít na stůl Bar"
            >
              🍺 Bar {barItemsCount > 0 && `(${barItemsCount})`}
            </Link>

            <Link
              href="/kitchen"
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs transition cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              👨‍🍳 Kuchyně
            </Link>

            <Link
              href="/summary"
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs transition cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              📊 Tržby
            </Link>
          </div>
        </header>

        {/* Původní čisté rozdělení na místnosti */}
        <div>
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 px-1">
            Plánky místností
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/section/vnitrek"
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 transition cursor-pointer flex flex-col justify-between h-36 active:scale-98"
            >
              <div className="text-3xl">🏠</div>
              <div>
                <span className="text-lg font-black text-white block">Vnitřek</span>
                <span className="text-xs text-slate-400 font-medium">Hlavní sál a boxy</span>
              </div>
            </Link>

            <Link
              href="/section/zahradka"
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 transition cursor-pointer flex flex-col justify-between h-36 active:scale-98"
            >
              <div className="text-3xl">🌳</div>
              <div>
                <span className="text-lg font-black text-white block">Zahrádka</span>
                <span className="text-xs text-slate-400 font-medium">Venkovní posezení</span>
              </div>
            </Link>

            <Link
              href="/section/salonek"
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 transition cursor-pointer flex flex-col justify-between h-36 active:scale-98"
            >
              <div className="text-3xl">🛋️</div>
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
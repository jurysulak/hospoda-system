"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type StockItem = {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  minQuantity?: number;
  isActive: boolean;
};

export default function StockPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "low">("all");

  // Formulář pro novou položku
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("ks");
  const [newQuantity, setNewQuantity] = useState("");
  const [newMinQuantity, setNewMinQuantity] = useState("5");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialog pro rychlý pohyb (Příjem / Výdej)
  const [activeItem, setActiveItem] = useState<StockItem | null>(null);
  const [movementType, setMovementType] = useState<"IN" | "OUT">("IN");
  const [movementAmount, setMovementAmount] = useState("");

  async function loadItems() {
    try {
      setLoading(true);
      const res = await fetch("/api/stock", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setItems(data);
      }
    } catch (e) {
      console.error("Chyba při načítání skladu:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  // Vytvoření nové položky
  async function handleCreateItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/stock/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          unit: newUnit,
          quantity: Number(newQuantity) || 0,
          minQuantity: Number(newMinQuantity) || 0,
        }),
      });

      if (res.ok) {
        setNewName("");
        setNewUnit("ks");
        setNewQuantity("");
        setNewMinQuantity("5");
        setShowAddModal(false);
        await loadItems();
      }
    } catch (e) {
      alert("Nepodařilo se přidat položku.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Příjem nebo výdej množství
  async function handleConfirmMove() {
    if (!activeItem || !movementAmount || Number(movementAmount) <= 0) return;

    const qty = Number(movementAmount);
    try {
      const res = await fetch("/api/stock/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockItemId: activeItem.id,
          quantity: qty,
          type: movementType,
        }),
      });

      if (res.ok) {
        setActiveItem(null);
        setMovementAmount("");
        await loadItems();
      } else {
        alert("Pohyb na skladě se nezdařil.");
      }
    } catch (e) {
      alert("Chyba spojení při pohybu na skladě.");
    }
  }

  // Smazání / deaktivace položky
  async function handleDeleteItem(itemId: number) {
    if (!window.confirm("Opravdu chceš tuto položku ze skladu odstranit?")) return;
    try {
      await fetch(`/api/stock/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockItemId: itemId,
          quantity: 0,
          type: "DELETE",
        }),
      });
      await loadItems();
    } catch (e) {
      // Pokud API nepodporuje DELETE, vyřeší se v budoucnu
      await loadItems();
    }
  }

  const lowStockCount = items.filter(
    (i) => i.quantity <= (i.minQuantity ?? 0)
  ).length;

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const isLow = item.quantity <= (item.minQuantity ?? 0);
    if (filterMode === "low") return matchesSearch && isLow;
    return matchesSearch;
  });

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6 select-none">
      <div className="mx-auto max-w-5xl space-y-4">
        
        {/* Horní hlavička */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition cursor-pointer"
            >
              ← Zpět
            </Link>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              📦 Skladové zásoby
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/stock/history"
              className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs transition active:scale-95 cursor-pointer"
            >
              📋 Historie pohybů
            </Link>

            <button
              onClick={() => setShowAddModal(true)}
              className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 text-xs font-black shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              + Nová položka
            </button>
          </div>
        </header>

        {/* Vyhledávací a filtrační lišta */}
        <div className="rounded-2xl bg-white p-3 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <input
            type="text"
            placeholder="🔍 Hledat v zásobách (pivo, sirup, maso...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-80 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
          />

          <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setFilterMode("all")}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                filterMode === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Vše ({items.length})
            </button>
            <button
              onClick={() => setFilterMode("low")}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                filterMode === "low"
                  ? "bg-red-500 text-white shadow-xs"
                  : lowStockCount > 0
                  ? "text-red-600 hover:text-red-700 font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              ⚠️ Dochází ({lowStockCount})
            </button>
          </div>
        </div>

        {/* Seznam skladových karet */}
        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-400 font-bold">
            Načítám skladové zásoby...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center text-slate-400 border border-slate-200">
            <span className="text-4xl block mb-2">📦</span>
            <p className="font-bold text-sm text-slate-700">Žádné položky nenalezeny</p>
            <p className="text-xs text-slate-400 mt-1">
              Přidej první položku pomocí tlačítka „+ Nová položka“.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredItems.map((item) => {
              const min = item.minQuantity ?? 0;
              const isCritical = item.quantity <= 0;
              const isWarning = !isCritical && item.quantity <= min;

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 bg-white shadow-xs transition flex flex-col justify-between gap-3 ${
                    isCritical
                      ? "border-red-400 bg-red-50/30"
                      : isWarning
                      ? "border-amber-300 bg-amber-50/20"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-black text-base text-slate-900 block truncate">
                        {item.name}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold block mt-0.5">
                        Jednotka: {item.unit} • Min: {min} {item.unit}
                      </span>
                    </div>

                    <span
                      className={`text-xs font-black px-2 py-1 rounded-lg shrink-0 ${
                        isCritical
                          ? "bg-red-500 text-white animate-pulse"
                          : isWarning
                          ? "bg-amber-400 text-slate-950"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {item.quantity} {item.unit}
                    </span>
                  </div>

                  {/* Akční tlačítka pro rychlý příjem a výdej */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setActiveItem(item);
                        setMovementType("IN");
                        setMovementAmount("");
                      }}
                      className="rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 py-2 text-xs font-black transition active:scale-95 cursor-pointer flex items-center justify-center gap-1"
                    >
                      + Příjem
                    </button>
                    <button
                      onClick={() => {
                        setActiveItem(item);
                        setMovementType("OUT");
                        setMovementAmount("");
                      }}
                      className="rounded-xl bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 py-2 text-xs font-black transition active:scale-95 cursor-pointer flex items-center justify-center gap-1"
                    >
                      − Výdej
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODÁL: PŘIDAT NOVOU POLOŽKU */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleCreateItem}
            className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-4"
          >
            <h3 className="text-base font-black text-slate-900">
              Přidat novou skladovou položku
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Název suroviny / zboží:
                </label>
                <input
                  type="text"
                  placeholder="např. Radegast 12 sud, Kofola, Hranolky..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    Měrná jednotka:
                  </label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="ks">ks (kusy)</option>
                    <option value="l">l (litry)</option>
                    <option value="kg">kg (kilogramy)</option>
                    <option value="bal">bal (balení)</option>
                    <option value="porce">porce</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    Počáteční stav:
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Minimální zásoba (varování):
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="5"
                  value={newMinQuantity}
                  onChange={(e) => setNewMinQuantity(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 text-xs transition cursor-pointer"
              >
                Zrušit
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 text-xs transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Ukládám..." : "Vytvořit"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODÁL: RYCHLÝ POHYB (PŘÍJEM / VÝDEJ) */}
      {activeItem && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900">
              {movementType === "IN" ? "🟢 Příjem na sklad" : "🔴 Výdej ze skladu"}
            </h3>

            <p className="text-xs text-slate-500">
              Položka: <strong className="text-slate-900">{activeItem.name}</strong> (aktuálně {activeItem.quantity} {activeItem.unit})
            </p>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                Zadej množství ({activeItem.unit}):
              </label>
              <input
                type="number"
                step="any"
                placeholder="např. 10"
                value={movementAmount}
                onChange={(e) => setMovementAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base font-black text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
                autoFocus
              />
            </div>

            {/* Rychlá dotyková tlačítka pro množství */}
            <div className="flex gap-1.5">
              {[1, 5, 10, 20, 50].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setMovementAmount(String(amt))}
                  className="flex-1 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold hover:bg-slate-100"
                >
                  +{amt}
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 text-xs transition cursor-pointer"
              >
                Zrušit
              </button>
              <button
                type="button"
                onClick={handleConfirmMove}
                disabled={!movementAmount || Number(movementAmount) <= 0}
                className={`flex-1 rounded-xl font-black py-2.5 text-xs text-white transition cursor-pointer disabled:opacity-40 ${
                  movementType === "IN"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-red-600 hover:bg-red-500"
                }`}
              >
                Potvrdit {movementType === "IN" ? "příjem" : "výdej"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
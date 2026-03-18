"use client";

import { useEffect, useState } from "react";

type StockItem = {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  isActive: boolean;
};

type StockMovement = {
  id: number;
  type: "IN" | "OUT";
  quantity: number;
  createdAt: string;
  stockItem: {
    id: number;
    name: string;
    unit: string;
  };
};

export default function StockPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("ks");
  const [quantity, setQuantity] = useState("");
  const [history, setHistory] = useState<StockMovement[]>([]);

  async function loadItems() {
    const [itemsRes, historyRes] = await Promise.all([
      fetch("/api/stock", { cache: "no-store" }),
      fetch("/api/stock/history", { cache: "no-store" }),
    ]);

    const itemsData = await itemsRes.json();
    const historyData = await historyRes.json();

    setItems(itemsData);
    setHistory(historyData);
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function createItem() {
    await fetch("/api/stock/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        unit,
        quantity: Number(quantity),
      }),
    });

    setName("");
    setUnit("ks");
    setQuantity("");

    await loadItems();
  }

  async function moveItem(itemId: number, type: "IN" | "OUT") {
    const quantity = prompt("Zadej množství:");

    if (!quantity) return;

    await fetch("/api/stock/move", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        stockItemId: itemId,
        quantity: Number(quantity),
        type,
      }),
    });

    await loadItems();
  }

  return (
    <main className="min-h-screen bg-slate-200 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <a
          href="/"
          className="inline-flex rounded-2xl bg-white px-4 py-3 text-base font-medium shadow-sm"
        >
          ← Zpět
        </a>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-4xl font-bold">Sklad</h1>
          <p className="mt-2 text-lg text-slate-600">
            Evidence skladových položek
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-2xl font-bold">Přidat skladovou položku</h2>

          <input
            type="text"
            placeholder="Název položky"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl border p-4 text-lg"
          />

          <input
            type="text"
            placeholder="Jednotka (ks, l, kg...)"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full rounded-2xl border p-4 text-lg"
          />

          <input
            type="number"
            placeholder="Počáteční množství"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full rounded-2xl border p-4 text-lg"
          />

          <button
            onClick={createItem}
            className="rounded-2xl bg-green-600 px-5 py-4 text-lg font-semibold text-white"
          >
            Přidat do skladu
          </button>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-2xl font-bold">Aktuální stav skladu</h2>

          <div className="rounded-3xl bg-white p-6 shadow-sm space-y-3">
            <h2 className="text-2xl font-bold">Historie skladu</h2>

            {history.map((move) => {
              const isIn = move.type === "IN";
              const date = new Date(move.createdAt);

              return (
                <div
                  key={move.id}
                  className={`flex items-center justify-between rounded-2xl border p-4 ${isIn ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                    }`}
                >
                  <div>
                    <div className="text-xl font-semibold">
                      {move.stockItem.name}
                    </div>
                    <div className="text-sm text-slate-500">
                      {date.toLocaleDateString()} {date.toLocaleTimeString()}
                    </div>
                  </div>

                  <div
                    className={`text-xl font-bold ${isIn ? "text-green-700" : "text-red-700"
                      }`}
                  >
                    {isIn ? "+" : "-"} {move.quantity} {move.stockItem.unit}
                  </div>
                </div>
              );
            })}
          </div>

          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-2xl border p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-semibold">{item.name}</div>
                  <div className="text-sm text-slate-500">
                    Jednotka: {item.unit}
                  </div>
                </div>

                <div className="text-2xl font-bold">
                  {item.quantity} {item.unit}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => moveItem(item.id, "IN")}
                  className="flex-1 rounded-2xl bg-green-600 py-3 text-white font-semibold"
                >
                  + Příjem
                </button>

                <button
                  onClick={() => moveItem(item.id, "OUT")}
                  className="flex-1 rounded-2xl bg-red-600 py-3 text-white font-semibold"
                >
                  - Výdej
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
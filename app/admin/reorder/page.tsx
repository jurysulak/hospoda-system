"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  order?: number;
}

export default function ReorderProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data: Product[]) => {
        setProducts(data);
        const uniqueCats = Array.from(new Set(data.map((p) => p.category.trim())));
        setCategories(uniqueCats);
        if (uniqueCats.length > 0) setSelectedCategory(uniqueCats[0]);
      });
  }, []);

  const currentCategoryProducts = products
    .filter((p) => p.category.trim() === selectedCategory)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const moveItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentCategoryProducts.length) return;

    const list = [...currentCategoryProducts];
    const [moved] = list.splice(index, 1);
    list.splice(targetIndex, 0, moved);

    // Přepíšeme lokální stav
    const otherProducts = products.filter((p) => p.category.trim() !== selectedCategory);
    setProducts([...otherProducts, ...list]);
  };

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      // Seřadíme všechny produkty a předáme jejich ID v aktuálním pořadí
      const productIds = currentCategoryProducts.map((p) => p.id);
      const res = await fetch("/api/products/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds }),
      });
      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 max-w-2xl mx-auto space-y-4 select-none">
      <header className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
          >
            ← Zpět
          </Link>
          <h1 className="text-lg font-black text-slate-900">Pořadí produktů</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          {saving ? "Ukládám..." : savedSuccess ? "✓ Uloženo!" : "Uložit pořadí"}
        </button>
      </header>

      {/* Volba kategorie */}
      <div className="flex gap-1.5 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              selectedCategory === cat
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Seznam položek s tlačítky Nahoru / Dolů */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 space-y-2">
        {currentCategoryProducts.map((p, idx) => (
          <div
            key={p.id}
            className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/70"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-600 font-black text-xs flex items-center justify-center">
                {idx + 1}
              </span>
              <div>
                <span className="font-bold text-sm text-slate-900 block">{p.name}</span>
                <span className="text-xs text-slate-500">{p.price} Kč</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => moveItem(idx, "up")}
                disabled={idx === 0}
                className="w-9 h-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 disabled:opacity-25 font-black text-base flex items-center justify-center transition active:scale-95 cursor-pointer shadow-2xs"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveItem(idx, "down")}
                disabled={idx === currentCategoryProducts.length - 1}
                className="w-9 h-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 disabled:opacity-25 font-black text-base flex items-center justify-center transition active:scale-95 cursor-pointer shadow-2xs"
              >
                ↓
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
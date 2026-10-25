"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Product = {
  id: number;
  name: string;
  category: string;
  price: number;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Vše");

  // Formulář pro nový produkt
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState("Jídlo");
  const [isCreating, setIsCreating] = useState(false);

  // Editovaný produkt
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Načtení produktů
  const loadProducts = async () => {
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (e) {
      console.error("Chyba při načítání produktů:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Vytvoření nového produktu
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPrice) return;

    try {
      setIsCreating(true);
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          price: Number(newPrice),
          category: newCategory,
        }),
      });

      if (res.ok) {
        setNewName("");
        setNewPrice("");
        await loadProducts();
      } else {
        alert("Chyba při vytváření produktu");
      }
    } catch (e) {
      alert("Chyba spojení");
    } finally {
      setIsCreating(false);
    }
  };

  // Zahájení editace
  const startEdit = (product: Product) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditPrice(String(product.price));
    setEditCategory(product.category);
  };

  // Uložení úpravy
  const handleSaveEdit = async () => {
    if (!editingProduct) return;

    try {
      setIsSaving(true);
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          price: Number(editPrice),
          category: editCategory,
        }),
      });

      if (res.ok) {
        setEditingProduct(null);
        await loadProducts();
      } else {
        alert("Chyba při úpravě produktu");
      }
    } catch (e) {
      alert("Chyba spojení při úpravě");
    } finally {
      setIsSaving(false);
    }
  };

  // Smazání produktu
  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Opravdu chceš smazat položku "${name}"?`)) return;

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await loadProducts();
      } else {
        const err = await res.json();
        alert(err.error || "Položku nelze smazat");
      }
    } catch (e) {
      alert("Chyba při mazání položky");
    }
  };

  const categories = ["Vše", ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    const matchCategory = selectedCategory === "Vše" || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6 select-none">
      <div className="mx-auto max-w-6xl space-y-5">
        
        {/* Horní hlavička */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition"
            >
              ← Zpět
            </Link>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Správa produktů
            </h1>
          </div>
          <span className="text-xs font-bold text-slate-500">
            Celkem {products.length} položek
          </span>
        </div>

        {/* Formulář pro přidání produktu */}
        <div className="rounded-3xl bg-white p-5 shadow-xs border border-slate-200">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-3">
            ➕ Přidat nový produkt
          </h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Název (např. Radegast 12°)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
              required
            />
            <input
              type="number"
              placeholder="Cena v Kč"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
              required
            />
            <input
              type="text"
              placeholder="Kategorie (např. Jídlo, Pivo)"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
              required
            />
            <button
              type="submit"
              disabled={isCreating}
              className="rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-sm py-2 px-4 shadow transition cursor-pointer disabled:opacity-50"
            >
              {isCreating ? "Ukládám..." : "Přidat do nabídky"}
            </button>
          </form>
        </div>

        {/* Vyhledávání a filtr */}
        <div className="rounded-3xl bg-white p-4 shadow-xs border border-slate-200 space-y-3">
          <input
            type="text"
            placeholder="🔍 Hledat položku..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
          />

          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Seznam produktů v tabulce */}
        <div className="rounded-3xl bg-white shadow-xs border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Název</th>
                  <th className="px-5 py-3.5">Kategorie</th>
                  <th className="px-5 py-3.5">Cena</th>
                  <th className="px-5 py-3.5 text-right">Akce</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3 font-bold text-slate-900">
                      {product.name}
                    </td>
                    <td className="px-5 py-3">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-extrabold text-slate-900">
                      {product.price} Kč
                    </td>
                    <td className="px-5 py-3 text-right space-x-1.5">
                      <button
                        onClick={() => startEdit(product)}
                        className="rounded-lg border border-slate-300 bg-white hover:bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 transition cursor-pointer"
                      >
                        ✏️ Upravit
                      </button>
                      <button
                        onClick={() => handleDelete(product.id, product.name)}
                        className="rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 px-2.5 py-1 text-xs font-bold text-red-600 transition cursor-pointer"
                      >
                        🗑️ Smazat
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* MODAL PRO EDITACI PRODUKTU */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-xl font-black text-slate-900">Upravit položku</h3>
            <p className="mt-1 text-xs text-slate-500">Změna názvu, kategorie nebo prodejní ceny</p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Název</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cena (Kč)</label>
                <input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kategorie</label>
                <input
                  type="text"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="w-full rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 py-3 text-sm font-bold text-white shadow transition cursor-pointer disabled:opacity-50"
              >
                {isSaving ? "Ukládám..." : "Uložit změny"}
              </button>
              <button
                onClick={() => setEditingProduct(null)}
                disabled={isSaving}
                className="w-full rounded-2xl bg-slate-100 hover:bg-slate-200 py-2.5 text-xs font-semibold text-slate-600 transition cursor-pointer"
              >
                Zrušit
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
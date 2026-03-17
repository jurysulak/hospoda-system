"use client";

import { useEffect, useState } from "react";

type Product = {
  id: number;
  name: string;
  category: string;
  price: number;
  isActive: boolean;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [editingPrices, setEditingPrices] = useState<Record<number, string>>({});

  async function loadProducts() {
    const res = await fetch("/api/products/all", {
      cache: "no-store",
    });

    const data = await res.json();
    setProducts(data);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function createProduct() {
    await fetch("/api/products/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        category,
        price: Number(price),
      }),
    });

    setName("");
    setCategory("");
    setPrice("");

    await loadProducts();
  }

  async function updatePrice(productId: number) {
    const price = editingPrices[productId];

    await fetch(`/api/products/${productId}/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        price: Number(price),
      }),
    });

    await loadProducts();
  }

  async function hideProduct(productId: number) {
    await fetch(`/api/products/${productId}/hide`, {
      method: "POST",
    });

    await loadProducts();
  }

  async function restoreProduct(productId: number) {
    await fetch(`/api/products/${productId}/restore`, {
      method: "POST",
    });

    await loadProducts();
  }

  return (
    <main className="min-h-screen bg-slate-200 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <a
          href="/"
          className="inline-flex rounded-2xl bg-white px-4 py-3 text-base font-medium shadow-sm"
        >
          ← Zpět
        </a>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-4xl font-bold">Správa produktů</h1>
          <p className="mt-2 text-lg text-slate-600">
            Přehled aktivních produktů
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-2xl font-bold">Přidat produkt</h2>

          <input
            type="text"
            placeholder="Název produktu"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl border p-4 text-lg"
          />

          <input
            type="text"
            placeholder="Kategorie"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-2xl border p-4 text-lg"
          />

          <input
            type="number"
            placeholder="Cena"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-2xl border p-4 text-lg"
          />

          <button
            onClick={createProduct}
            className="rounded-2xl bg-green-600 px-5 py-4 text-lg font-semibold text-white"
          >
            Přidat produkt
          </button>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-2xl font-bold">Seznam produktů</h2>

          {products.map((product) => (
            <div
              key={product.id}
              className="rounded-2xl border p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-xl font-semibold">{product.name}</div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${product.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-slate-200 text-slate-700"
                        }`}
                    >
                      {product.isActive ? "Aktivní" : "Skrytý"}
                    </span>
                  </div>

                  <div className="text-sm text-slate-500">
                    {product.category}
                  </div>
                </div>

                <div className="text-xl font-bold">{product.price} Kč</div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="number"
                  placeholder="Nová cena"
                  value={editingPrices[product.id] ?? product.price}
                  onChange={(e) =>
                    setEditingPrices((prev) => ({
                      ...prev,
                      [product.id]: e.target.value,
                    }))
                  }
                  className="rounded-2xl border p-3 text-lg"
                />

                <button
                  onClick={() => updatePrice(product.id)}
                  className="rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white"
                >
                  Uložit cenu
                </button>

                {product.isActive ? (
                  <button
                    onClick={() => hideProduct(product.id)}
                    className="rounded-2xl bg-slate-700 px-4 py-3 font-semibold text-white"
                  >
                    Skrýt produkt
                  </button>
                ) : (
                  <button
                    onClick={() => restoreProduct(product.id)}
                    className="rounded-2xl bg-green-600 px-4 py-3 font-semibold text-white"
                  >
                    Obnovit produkt
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";

type Product = {
  id: number;
  name: string;
  category: string;
  price: number;
};

type OrderItem = {
  id: number;
  productName: string;
  unitPrice: number;
  quantity: number;
};

type TableData = {
  id: number;
  name: string;
  status: string;
  orders: {
    id: number;
    items: OrderItem[];
  }[];
};

export default function TableDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [table, setTable] = useState<TableData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [tableId, setTableId] = useState<string>("");
  const [isPayMode, setIsPayMode] = useState(false);
  const [selectedQuantities, setSelectedQuantities] = useState<Record<number, number>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>("Vše");
  const [search, setSearch] = useState("");

  useEffect(() => {
    params.then(({ id }) => {
      setTableId(id);
    });
  }, [params]);

  async function loadData(id: string) {
    const [tableRes, productsRes] = await Promise.all([
      fetch(`/api/tables/${id}`, { cache: "no-store" }),
      fetch("/api/products", { cache: "no-store" }),
    ]);

    const tableData = await tableRes.json();
    const productsData = await productsRes.json();

    setTable(tableData);
    setProducts(productsData);
    setSelectedQuantities({});
    setIsPayMode(false);
  }

  useEffect(() => {
    if (tableId) {
      loadData(tableId);
    }
  }, [tableId]);

  async function addProduct(productId: number) {
    await fetch(`/api/tables/${tableId}/items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productId }),
    });

    await loadData(tableId);
  }

  async function removeOneItem(itemId: number) {
    await fetch(`/api/order-items/${itemId}/remove`, {
      method: "POST",
    });

    await loadData(tableId);
  }

  async function clearTable() {
    const confirmed = window.confirm("Opravdu chceš vyčistit stůl?");

    if (!confirmed) return;

    await fetch(`/api/tables/${tableId}/clear`, {
      method: "POST",
    });

    await loadData(tableId);
  }

  function increasePayQuantity(itemId: number, maxQty: number) {
    setSelectedQuantities((prev) => {
      const current = prev[itemId] || 0;
      if (current >= maxQty) return prev;
      return { ...prev, [itemId]: current + 1 };
    });
  }

  function decreasePayQuantity(itemId: number) {
    setSelectedQuantities((prev) => {
      const current = prev[itemId] || 0;
      const next = current - 1;

      if (next <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }

      return { ...prev, [itemId]: next };
    });
  }

  async function confirmPayment() {
    const items = Object.entries(selectedQuantities).map(([itemId, quantity]) => ({
      itemId: Number(itemId),
      quantity,
    }));

    if (items.length === 0) return;

    await fetch(`/api/tables/${tableId}/pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items }),
    });

    await loadData(tableId);
  }

  const items = table?.orders?.[0]?.items ?? [];

  const categories = ["Vše", ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((product) => {
    const matchCategory =
      selectedCategory === "Vše" || product.category === selectedCategory;

    const matchSearch = product.name
      .toLowerCase()
      .includes(search.toLowerCase());

    return matchCategory && matchSearch;
  });

  const total = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  const selectedTotal = items.reduce((sum, item) => {
    const selectedQty = selectedQuantities[item.id] || 0;
    return sum + selectedQty * item.unitPrice;
  }, 0);

  return (
    <main className="min-h-screen bg-slate-200 p-4 md:p-6">
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6">
          <a
            href="/"
            className="inline-flex rounded-2xl bg-white px-4 py-3 text-base font-medium shadow-sm"
          >
            ← Zpět na přehled
          </a>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h1 className="text-4xl font-bold">{table?.name}</h1>
            <p className="mt-3 text-lg text-slate-600">
              Stav: {items.length === 0 ? "Volný" : "Obsazený"}
            </p>
            <p className="mt-5 text-3xl font-bold">Celkem na stole: {total} Kč</p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-3xl font-bold">Účet stolu</h2>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    setIsPayMode(!isPayMode);
                    setSelectedQuantities({});
                  }}
                  className="rounded-2xl bg-slate-900 px-5 py-4 text-lg font-semibold text-white"
                >
                  {isPayMode ? "Zrušit placení" : "Zaplatit"}
                </button>

                <button
                  onClick={clearTable}
                  className="rounded-2xl bg-red-600 px-5 py-4 text-lg font-semibold text-white"
                >
                  Vyčistit stůl
                </button>
              </div>
            </div>

            {items.length === 0 ? (
              <p className="text-lg text-slate-500">
                Stůl je prázdný a připravený pro nové hosty.
              </p>
            ) : (
              <div className="space-y-4">
                {items.map((item) => {
                  const selectedQty = selectedQuantities[item.id] || 0;

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border bg-slate-50 p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-xl font-semibold">
                            {item.productName}
                          </div>
                          <div className="mt-1 text-base text-slate-600">
                            Na stole: {item.quantity} × {item.unitPrice} Kč
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {!isPayMode && (
                            <button
                              onClick={() => removeOneItem(item.id)}
                              className="rounded-xl border bg-white px-4 py-3 text-2xl font-bold"
                            >
                              −
                            </button>
                          )}

                          <div className="text-xl font-bold">
                            {item.quantity * item.unitPrice} Kč
                          </div>
                        </div>
                      </div>

                      {isPayMode && (
                        <div className="mt-4 flex items-center gap-3">
                          <button
                            onClick={() => decreasePayQuantity(item.id)}
                            className="rounded-xl border bg-white px-5 py-3 text-2xl font-bold"
                          >
                            −
                          </button>

                          <div className="min-w-32 rounded-xl bg-white px-4 py-3 text-center text-lg font-semibold">
                            Platí se: {selectedQty}
                          </div>

                          <button
                            onClick={() => increasePayQuantity(item.id, item.quantity)}
                            className="rounded-xl border bg-white px-5 py-3 text-2xl font-bold"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {isPayMode && items.length > 0 && (
              <div className="mt-6 rounded-3xl bg-slate-100 p-5">
                <div className="text-2xl font-bold">
                  Vybráno k zaplacení: {selectedTotal} Kč
                </div>

                <button
                  onClick={confirmPayment}
                  disabled={selectedTotal === 0}
                  className="mt-4 w-full rounded-2xl bg-green-600 px-5 py-4 text-xl font-bold text-white disabled:opacity-50"
                >
                  Potvrdit zaplacení
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-3xl font-bold">Produkty</h2>

          <input
            type="text"
            placeholder="Hledat produkt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4 w-full rounded-2xl border bg-slate-50 p-4 text-lg"
          />

          <div className="mb-5 flex flex-wrap gap-3">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`rounded-2xl px-4 py-3 text-base font-semibold ${
                  selectedCategory === category
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addProduct(product.id)}
                className="rounded-3xl border bg-slate-50 p-5 text-left transition active:scale-[0.99]"
              >
                <div className="text-xl font-bold">{product.name}</div>
                <div className="mt-2 text-base text-slate-500">
                  {product.category}
                </div>
                <div className="mt-4 text-2xl font-bold">{product.price} Kč</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
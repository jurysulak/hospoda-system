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

  const [isPaying, setIsPaying] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);

  useEffect(() => {
    params.then(({ id }) => {
      setTableId(id);
    });
  }, [params]);

  async function loadData(id: string) {
    try {
      const productsRes = await fetch("/api/products", { cache: "no-store" });
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        if (Array.isArray(productsData)) {
          setProducts(productsData);
        }
      }
    } catch (e) {
      console.error("Chyba při stahování produktů:", e);
    }

    try {
      const tableRes = await fetch(`/api/tables/${id}`, { cache: "no-store" });
      if (tableRes.ok) {
        const tableData = await tableRes.json();
        setTable(tableData);
      }
    } catch (e) {
      console.error("Chyba při stahování stolu:", e);
    }

    setSelectedQuantities({});
    setIsPayMode(false);
  }

  useEffect(() => {
    if (tableId) {
      loadData(tableId);
    }
  }, [tableId]);

  // Přidání z katalogu
  async function addProduct(productId: number) {
    await fetch(`/api/tables/${tableId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    await loadData(tableId);
  }

  // Rychlé plusko přímo na účtu
  async function addOneItem(itemId: number) {
    await fetch(`/api/order-items/${itemId}/add`, {
      method: "POST",
    });
    await loadData(tableId);
  }

  // Mínusko na účtu
  async function removeOneItem(itemId: number) {
    await fetch(`/api/order-items/${itemId}/remove`, {
      method: "POST",
    });
    await loadData(tableId);
  }

  async function clearTable() {
    if (!window.confirm("Opravdu chceš vyčistit celý stůl?")) return;
    await fetch(`/api/tables/${tableId}/clear`, { method: "POST" });
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

  async function handlePay(method: "CASH" | "CARD") {
    try {
      setIsPaying(true);
      const selectedItemsList = Object.entries(selectedQuantities).map(([itemId, quantity]) => ({
        itemId: Number(itemId),
        quantity,
      }));

      const res = await fetch(`/api/tables/${tableId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: method,
          items: selectedItemsList.length > 0 ? selectedItemsList : undefined,
        }),
      });

      if (res.ok) {
        setShowPayModal(false);
        await loadData(tableId);
      } else {
        const err = await res.json();
        alert(err.error || "Platba se nezdařila");
      }
    } catch (e) {
      alert("Chyba spojení při platbě");
    } finally {
      setIsPaying(false);
    }
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

  const amountToPay = isPayMode && selectedTotal > 0 ? selectedTotal : total;

  return (
    <main className="h-screen max-h-screen bg-slate-100 flex flex-col overflow-hidden select-none">
      {/* Horní kompaktní lišta stolu */}
      <header className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="flex items-center gap-1 text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl transition"
          >
            ← Přehled
          </a>
          <div>
            <span className="text-xl font-black text-slate-900 tracking-tight">
              {table?.name || `Stůl ${tableId}`}
            </span>
            <span
              className={`ml-2.5 inline-block text-xs font-bold px-2 py-0.5 rounded-full ${
                items.length === 0
                  ? "bg-slate-100 text-slate-600"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {items.length === 0 ? "Volný" : "Obsazený"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider leading-none">Celkem</span>
            <span className="text-xl font-extrabold text-slate-900 leading-tight">
              {total} Kč
            </span>
          </div>

          <button
            onClick={() => setShowPayModal(true)}
            disabled={items.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-40 text-white font-bold px-4 py-2 rounded-xl text-sm shadow transition"
          >
            Zaplatit
          </button>
        </div>
      </header>

      {/* Tělo aplikace: 2 nezávislé sloupce (Účet vs Katalog) */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[380px_1fr] lg:grid-cols-[430px_1fr] overflow-hidden">
        
        {/* LEVÝ PANEL: Účet stolu */}
        <section className="bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden">
          {/* Akční lišta účtu */}
          <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0 bg-slate-50/50">
            <span className="font-bold text-slate-800 text-sm">
              Účet ({items.reduce((s, i) => s + i.quantity, 0)} ks)
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  setIsPayMode(!isPayMode);
                  setSelectedQuantities({});
                }}
                disabled={items.length === 0}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition ${
                  isPayMode
                    ? "bg-amber-100 border-amber-300 text-amber-900"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                } disabled:opacity-40`}
              >
                {isPayMode ? "Zrušit dělení" : "Dělit účet"}
              </button>

              <button
                onClick={clearTable}
                disabled={items.length === 0}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-40 transition"
              >
                Vyčistit
              </button>
            </div>
          </div>

          {/* Scrollovatelný seznam položek na účtu */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-6">
                <span className="text-4xl mb-2">🍽️</span>
                <p className="font-medium text-sm">Stůl je prázdný.</p>
                <p className="text-xs text-slate-400 mt-1">Vyberte položky z nabídky vpravo.</p>
              </div>
            ) : (
              items.map((item) => {
                const selectedQty = selectedQuantities[item.id] || 0;

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-2.5 transition ${
                      isPayMode && selectedQty > 0
                        ? "border-amber-400 bg-amber-50/60"
                        : "border-slate-200 bg-white shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 truncate text-sm">
                          {item.productName}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                          {item.unitPrice} Kč / ks
                        </div>
                      </div>

                      {/* Tlačítka pro rychlou editaci / přidání */}
                      {!isPayMode ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Mínusko */}
                          <button
                            onClick={() => removeOneItem(item.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-90 text-slate-800 font-bold text-base transition"
                          >
                            −
                          </button>

                          {/* Počet kusů */}
                          <span className="w-7 text-center font-black text-slate-900 text-sm">
                            {item.quantity}×
                          </span>

                          {/* NOVÉ RYCHLÉ PLUSKO */}
                          <button
                            onClick={() => addOneItem(item.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 active:scale-90 text-white font-bold text-base transition"
                          >
                            +
                          </button>

                          {/* Cena celkem za položku */}
                          <div className="w-16 text-right font-bold text-slate-900 text-sm">
                            {item.quantity * item.unitPrice} Kč
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => decreasePayQuantity(item.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-base"
                          >
                            −
                          </button>
                          <span className="w-10 text-center font-bold text-amber-900 bg-amber-100 rounded-md py-1 text-xs">
                            {selectedQty} z {item.quantity}
                          </span>
                          <button
                            onClick={() => increasePayQuantity(item.id, item.quantity)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900 text-white font-bold text-base"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Spodní souhrn účtu */}
          <div className="p-3 border-t border-slate-200 bg-slate-50 shrink-0">
            {isPayMode && selectedTotal > 0 ? (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 block">K úhradě vybráno</span>
                  <span className="text-lg font-black text-amber-900">{selectedTotal} Kč</span>
                </div>
                <button
                  onClick={() => setShowPayModal(true)}
                  className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow transition"
                >
                  Zaplatit část ({selectedTotal} Kč)
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Celkový účet stolu</span>
                  <span className="text-2xl font-black text-slate-900">{total} Kč</span>
                </div>
                <button
                  onClick={() => setShowPayModal(true)}
                  disabled={items.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-40 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow transition"
                >
                  Zaplatit stůl
                </button>
              </div>
            )}
          </div>
        </section>

        {/* PRAVÝ PANEL: Katalog produktů optimalizovaný pro dotyk */}
        <section className="flex flex-col h-full overflow-hidden bg-slate-50">
          
          {/* Vyhledávání a kategorie */}
          <div className="p-3 bg-white border-b border-slate-200 space-y-2 shrink-0 shadow-2xs">
            <input
              type="text"
              placeholder="🔍 Rychlé hledání položky..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-100 rounded-xl px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900"
            />

            {/* Vodorovný posuvník kategorií pro tablety */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    selectedCategory === category
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Mřížka tlačítek produktů s vlastním scrollováním */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addProduct(product.id)}
                  className="flex flex-col justify-between bg-white border border-slate-200 rounded-2xl p-3 text-left shadow-2xs hover:border-slate-400 active:scale-95 transition cursor-pointer min-h-[84px]"
                >
                  <span className="font-bold text-slate-900 text-sm leading-tight line-clamp-2">
                    {product.name}
                  </span>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-50">
                    <span className="text-[11px] font-semibold text-slate-400 truncate max-w-[55%]">
                      {product.category}
                    </span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      {product.price} Kč
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Modální okno pro volbu platby */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-2xl font-black text-slate-900">Vybrat platbu</h3>
            <p className="mt-1 text-sm text-slate-500">
              Částka k zaplacení: <span className="font-extrabold text-slate-900 text-base">{amountToPay} Kč</span>
            </p>

            <div className="mt-5 flex flex-col gap-2.5">
              <button
                onClick={() => handlePay("CASH")}
                disabled={isPaying}
                className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 py-3.5 text-base font-bold text-white shadow transition cursor-pointer disabled:opacity-50"
              >
                💵 Hotově
              </button>
              <button
                onClick={() => handlePay("CARD")}
                disabled={isPaying}
                className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 py-3.5 text-base font-bold text-white shadow transition cursor-pointer disabled:opacity-50"
              >
                💳 Kartou
              </button>
              <button
                onClick={() => setShowPayModal(false)}
                disabled={isPaying}
                className="mt-1 rounded-2xl bg-slate-100 hover:bg-slate-200 py-3 text-sm font-semibold text-slate-600 transition cursor-pointer"
              >
                Zpět
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
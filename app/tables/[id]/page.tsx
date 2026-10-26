"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReceiptPrintModal from "@/app/components/ReceiptPrintModal";

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
  note?: string | null;
};

type TableData = {
  id: number;
  name: string;
  section: string;
  status: string;
  reservedName?: string | null;
  reservedTime?: string | null;
  reservedPax?: number | null;
  orders: {
    id: number;
    items: OrderItem[];
  }[];
};

type SimpleTable = {
  id: number;
  name: string;
};

export default function TableDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [table, setTable] = useState<TableData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [allTables, setAllTables] = useState<SimpleTable[]>([]);
  const [tableId, setTableId] = useState<string>("");
  const [isPayMode, setIsPayMode] = useState(false);
  const [selectedQuantities, setSelectedQuantities] = useState<Record<number, number>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>("Vše");
  const [search, setSearch] = useState("");

  // Mobilní přepínač záložek: "order" (nabídka produktů) vs "bill" (účet a placení)
  const [mobileTab, setMobileTab] = useState<"order" | "bill">("order");

  // Stavy pro platbu
  const [isPaying, setIsPaying] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);

  // Stavy pro přesun / sloučení
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedTargetTableId, setSelectedTargetTableId] = useState<number | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

  // Stavy pro rezervaci
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [resName, setResName] = useState("");
  const [resTime, setResTime] = useState("");
  const [resPax, setResPax] = useState("");
  const [isSavingRes, setIsSavingRes] = useState(false);

  // Stavy pro tisk bonu a účtenky
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printMode, setPrintMode] = useState<"RECEIPT" | "KITCHEN">("RECEIPT");
  const [lastPaymentMethod, setLastPaymentMethod] = useState<"CASH" | "CARD">("CASH");

  // Stavy pro poznámku k položce
  const [editingItemNote, setEditingItemNote] = useState<OrderItem | null>(null);
  const [itemNoteText, setItemNoteText] = useState("");

  useEffect(() => {
    params.then(({ id }) => {
      setTableId(id);
    });
  }, [params]);

  async function loadData(id: string) {
    // 1. Produkty
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

    // 2. Detail stolu
    try {
      const tableRes = await fetch(`/api/tables/${id}`, { cache: "no-store" });
      if (tableRes.ok) {
        const tableData = await tableRes.json();
        setTable(tableData);
      }
    } catch (e) {
      console.error("Chyba při stahování stolu:", e);
    }

    // 3. Seznam stolů pro přesuny
    try {
      const allTablesRes = await fetch("/api/tables", { cache: "no-store" });
      if (allTablesRes.ok) {
        const tablesData = await allTablesRes.json();
        if (Array.isArray(tablesData)) {
          setAllTables(tablesData);
        }
      }
    } catch (e) {
      console.error("Chyba při stahování seznamu stolů:", e);
    }

    setSelectedQuantities({});
    setIsPayMode(false);
  }

  useEffect(() => {
    if (tableId) {
      loadData(tableId);
    }
  }, [tableId]);

  // Přidání položky z katalogu
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

  // Uložení poznámky k položce
  async function saveItemNote() {
    if (!editingItemNote) return;
    await fetch(`/api/order-items/${editingItemNote.id}/note`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: itemNoteText }),
    });
    setEditingItemNote(null);
    await loadData(tableId);
  }

  // Vyčištění stolu
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

  // Odeslání platby
  async function handlePay(method: "CASH" | "CARD") {
    try {
      setIsPaying(true);
      setLastPaymentMethod(method);
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

  // Přesun / sloučení stolu
  async function handleTransfer() {
    if (!selectedTargetTableId) return;

    try {
      setIsTransferring(true);
      const res = await fetch(`/api/tables/${tableId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetTableId: selectedTargetTableId }),
      });

      if (res.ok) {
        setShowTransferModal(false);
        window.location.href = `/tables/${selectedTargetTableId}`;
      } else {
        const err = await res.json();
        alert(err.error || "Přesun se nezdařil");
      }
    } catch (e) {
      alert("Chyba spojení při přesunu stolu");
    } finally {
      setIsTransferring(false);
    }
  }

  // Otevření modálu rezervace
  function openReservationModal() {
    setResName(table?.reservedName || "");
    setResTime(table?.reservedTime || "");
    setResPax(table?.reservedPax ? String(table.reservedPax) : "");
    setShowReservationModal(true);
  }

  // Uložení nebo zrušení rezervace
  async function handleSaveReservation(clear = false) {
    try {
      setIsSavingRes(true);
      await fetch(`/api/tables/${tableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: clear ? "open" : "reserved",
          reservedName: clear ? null : resName,
          reservedTime: clear ? null : resTime,
          reservedPax: clear ? null : resPax ? Number(resPax) : null,
        }),
      });
      setShowReservationModal(false);
      await loadData(tableId);
    } catch (e) {
      alert("Chyba při ukládání rezervace");
    } finally {
      setIsSavingRes(false);
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

  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const selectedTotal = items.reduce((sum, item) => {
    const selectedQty = selectedQuantities[item.id] || 0;
    return sum + selectedQty * item.unitPrice;
  }, 0);

  const amountToPay = isPayMode && selectedTotal > 0 ? selectedTotal : total;
  const isReserved = table?.status === "reserved" && items.length === 0;

  const sectionSlug =
    table?.section === "Zahrádka"
      ? "zahradka"
      : table?.section === "Salónek"
      ? "salonek"
      : "vnitrek";

  const backUrl = `/section/${sectionSlug}`;

  return (
    <main className="h-screen max-h-screen bg-slate-100 flex flex-col overflow-hidden select-none">
      {/* 1. Horní kompaktní lišta stolu */}
      <header className="bg-white border-b border-slate-200 px-3 py-2 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href={backUrl}
            className="flex items-center text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-xl transition cursor-pointer shrink-0"
          >
            ← Zpět
          </Link>
          <span className="text-lg font-black text-slate-900 tracking-tight truncate">
            {table?.name || `Stůl ${tableId}`}
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
              items.length > 0
                ? "bg-red-100 text-red-800"
                : isReserved
                ? "bg-amber-100 text-amber-900"
                : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {items.length > 0 ? "Obsazeno" : isReserved ? "Rezervace" : "Volno"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={openReservationModal}
            className="rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="Rezervace"
          >
            📅
          </button>

          <button
            onClick={() => {
              setPrintMode("KITCHEN");
              setShowPrintModal(true);
            }}
            disabled={items.length === 0}
            className="rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition cursor-pointer"
            title="Tisk bonu do kuchyně"
          >
            🍳 Bon
          </button>

          <button
            onClick={() => {
              setPrintMode("RECEIPT");
              setShowPrintModal(true);
            }}
            disabled={items.length === 0}
            className="rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition cursor-pointer"
            title="Tisk účtenky"
          >
            🧾 Tisk
          </button>

          <button
            onClick={() => setShowTransferModal(true)}
            disabled={items.length === 0}
            className="rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition cursor-pointer"
            title="Přesunout stůl"
          >
            ⇄ Přesun
          </button>
        </div>
      </header>

      {/* 2. Mobilní přepínač záložek (jen na telefonech) */}
      <div className="md:hidden flex bg-white border-b border-slate-200 p-1.5 gap-1.5 shrink-0">
        <button
          onClick={() => setMobileTab("order")}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
            mobileTab === "order"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          🍔 Nabídka ({products.length})
        </button>

        <button
          onClick={() => setMobileTab("bill")}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
            mobileTab === "bill"
              ? "bg-amber-500 text-slate-950 shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          🧾 Účet ({totalItemsCount} ks • {total} Kč)
        </button>
      </div>

      {/* 3. Hlavní pracovní plocha */}
      <div className="flex-1 min-h-0 flex overflow-hidden p-2 sm:p-3 gap-3">
        {/* LEVÝ PANEL: ÚČET STOLU */}
        <section
          className={`w-full md:w-96 flex flex-col rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden ${
            mobileTab === "bill" ? "flex" : "hidden md:flex"
          }`}
        >
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
            <div>
              <h2 className="text-sm font-black text-slate-900 tracking-tight">
                Otevřený účet
              </h2>
              <span className="text-xs text-slate-500">
                {items.length === 0 ? "Prázdný stůl" : `${totalItemsCount} položek celkem`}
              </span>
            </div>

            {items.length > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsPayMode(!isPayMode)}
                  className={`text-xs font-bold px-2.5 py-1 rounded-xl transition cursor-pointer ${
                    isPayMode
                      ? "bg-amber-500 text-black shadow"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  {isPayMode ? "✓ Hotovo" : "Rozdělit"}
                </button>
                <button
                  onClick={clearTable}
                  className="text-xs font-bold p-1 rounded-xl text-red-500 hover:bg-red-50 transition cursor-pointer"
                  title="Vyčistit stůl"
                >
                  🗑️
                </button>
              </div>
            )}
          </div>

          {/* Seznam položek účtu */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <span className="text-4xl mb-2">🍽️</span>
                <p className="font-bold text-sm">Na účtu nic není</p>
                <p className="text-xs text-slate-400 mt-1">
                  Přidej položky kliknutím v nabídce
                </p>
              </div>
            ) : (
              items.map((item) => {
                const selectedQty = selectedQuantities[item.id] || 0;

                return (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-2xl border transition flex flex-col gap-1.5 ${
                      isPayMode && selectedQty > 0
                        ? "border-amber-400 bg-amber-50/70"
                        : "border-slate-100 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1 pr-2">
                        <span className="font-bold text-sm text-slate-900 block truncate">
                          {item.productName}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">
                          {item.unitPrice} Kč / ks
                        </span>
                      </div>

                      <span className="font-black text-sm text-slate-900">
                        {item.unitPrice * item.quantity} Kč
                      </span>
                    </div>

                    {item.note && (
                      <span className="text-xs font-bold text-amber-600 bg-amber-100/60 px-2 py-0.5 rounded-md inline-block self-start">
                        ↳ {item.note}
                      </span>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <button
                        onClick={() => {
                          setEditingItemNote(item);
                          setItemNoteText(item.note || "");
                        }}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                      >
                        ✏️ {item.note ? "Upravit poznámku" : "+ Poznámka"}
                      </button>

                      {isPayMode ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => decreasePayQuantity(item.id)}
                            disabled={selectedQty <= 0}
                            className="w-8 h-8 rounded-xl bg-white border border-slate-300 font-black text-sm disabled:opacity-30 active:scale-95 cursor-pointer"
                          >
                            −
                          </button>
                          <span className="w-6 text-center font-black text-sm text-amber-900">
                            {selectedQty}
                          </span>
                          <button
                            onClick={() => increasePayQuantity(item.id, item.quantity)}
                            disabled={selectedQty >= item.quantity}
                            className="w-8 h-8 rounded-xl bg-amber-400 font-black text-sm disabled:opacity-30 active:scale-95 text-slate-950 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => removeOneItem(item.id)}
                            className="w-8 h-8 rounded-xl bg-white border border-slate-300 hover:bg-red-50 hover:text-red-600 font-black text-sm active:scale-90 transition cursor-pointer shadow-xs flex items-center justify-center"
                          >
                            −
                          </button>
                          <span className="font-black text-sm text-slate-900 min-w-5 text-center">
                            {item.quantity}×
                          </span>
                          <button
                            onClick={() => addOneItem(item.id)}
                            className="w-8 h-8 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-black text-sm active:scale-90 transition cursor-pointer shadow-xs flex items-center justify-center"
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

          {/* Spodní platební blok */}
          {items.length > 0 && (
            <div className="p-3 bg-white border-t border-slate-200 shrink-0 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">
                  {isPayMode && selectedTotal > 0 ? "K úhradě vybráno" : "Celkem k úhradě"}
                </span>
                <span className="text-xl font-black text-slate-900">
                  {amountToPay} Kč
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handlePay("CASH")}
                  disabled={isPaying}
                  className="py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-sm shadow transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  💵 Hotově
                </button>
                <button
                  onClick={() => handlePay("CARD")}
                  disabled={isPaying}
                  className="py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-sm shadow transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  💳 Kartou
                </button>
              </div>
            </div>
          )}
        </section>

        {/* PRAVÝ PANEL: KATALOG PRODUKTŮ */}
        <section
          className={`flex-1 flex flex-col rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden ${
            mobileTab === "order" ? "flex" : "hidden md:flex"
          }`}
        >
          {/* Vyhledávání a kategorie */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/50 space-y-2.5 shrink-0">
            <input
              type="text"
              placeholder="🔍 Hledat položku..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-xs"
            />

            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none touch-pan-x">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition cursor-pointer active:scale-95 ${
                    selectedCategory === cat
                      ? "bg-slate-900 text-white shadow"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Mřížka položek */}
          <div className="flex-1 overflow-y-auto p-3">
            {filteredProducts.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-400 font-bold text-sm">
                Žádné položky neodpovídají hledání
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addProduct(p.id)}
                    className="p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-amber-50/50 hover:border-amber-400 text-left transition active:scale-95 cursor-pointer shadow-xs flex flex-col justify-between min-h-[84px]"
                  >
                    <div>
                      <span className="font-extrabold text-sm text-slate-900 block leading-tight">
                        {p.name}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400 mt-0.5 block">
                        {p.category}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200/50">
                      <span className="font-black text-sm text-slate-900">
                        {p.price} Kč
                      </span>
                      <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-black text-slate-700 shadow-xs">
                        +
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Plovoucí spodní lišta na mobilu */}
          {items.length > 0 && mobileTab === "order" && (
            <div className="md:hidden p-2.5 bg-slate-900 text-white flex items-center justify-between shrink-0 shadow-lg">
              <div>
                <span className="text-xs text-slate-400 block font-bold leading-none">
                  Stůl: {table?.name}
                </span>
                <span className="text-sm font-black text-amber-400 mt-0.5 block">
                  {totalItemsCount} ks • {total} Kč
                </span>
              </div>
              <button
                onClick={() => setMobileTab("bill")}
                className="rounded-xl bg-amber-400 text-slate-950 font-black text-xs px-3.5 py-2 shadow transition active:scale-95 cursor-pointer"
              >
                Přejít na účet →
              </button>
            </div>
          )}
        </section>
      </div>

      {/* MODÁL: REZERVACE STOLU */}
      {showReservationModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900">
              Rezervace stolu ({table?.name})
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Jméno hosta:
                </label>
                <input
                  type="text"
                  placeholder="např. Novák"
                  value={resName}
                  onChange={(e) => setResName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    Čas rezervace:
                  </label>
                  <input
                    type="time"
                    value={resTime}
                    onChange={(e) => setResTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    Počet osob:
                  </label>
                  <input
                    type="number"
                    placeholder="např. 4"
                    value={resPax}
                    onChange={(e) => setResPax(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setShowReservationModal(false)}
                  className="flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 text-xs transition cursor-pointer"
                >
                  Zavřít
                </button>
                <button
                  onClick={() => handleSaveReservation(false)}
                  disabled={isSavingRes}
                  className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 text-xs transition cursor-pointer disabled:opacity-50"
                >
                  Uložit rezervaci
                </button>
              </div>
              {table?.status === "reserved" && (
                <button
                  onClick={() => handleSaveReservation(true)}
                  disabled={isSavingRes}
                  className="w-full rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold py-2 text-xs transition cursor-pointer"
                >
                  Zrušit rezervaci
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODÁL: POZNÁMKA K POLOŽCE */}
      {editingItemNote && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900">
              Poznámka k jídlu ({editingItemNote.productName})
            </h3>
            <input
              type="text"
              placeholder="např. bez cibule, dobře propečený..."
              value={itemNoteText}
              onChange={(e) => setItemNoteText(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setEditingItemNote(null)}
                className="flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 text-xs transition cursor-pointer"
              >
                Zrušit
              </button>
              <button
                onClick={saveItemNote}
                className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 text-xs transition cursor-pointer"
              >
                Uložit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODÁL: PŘESUN / SLOUČENÍ STOLŮ */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900">
              Přesunout / Sloučit stůl
            </h3>
            <p className="text-xs text-slate-500">
              Vyber cílový stůl, kam chceš převést všechny položky:
            </p>
            <select
              value={selectedTargetTableId || ""}
              onChange={(e) => setSelectedTargetTableId(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">-- Vyber stůl --</option>
              {allTables
                .filter((t) => t.id !== Number(tableId))
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => setShowTransferModal(false)}
                className="flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 text-xs transition cursor-pointer"
              >
                Zavřít
              </button>
              <button
                onClick={handleTransfer}
                disabled={!selectedTargetTableId || isTransferring}
                className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 text-xs transition disabled:opacity-40 cursor-pointer"
              >
                {isTransferring ? "Přesouvám..." : "Přesunout"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODÁL: TISK DOKLADU / BONU */}
      {showPrintModal && table && (
        <ReceiptPrintModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          tableName={table.name}
          items={items}
          totalAmount={total}
          paymentMethod={lastPaymentMethod}
          mode={printMode}
        />
      )}
    </main>
  );
}
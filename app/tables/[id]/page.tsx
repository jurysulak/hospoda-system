"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
}

interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  status?: string;
  note?: string | null;
}

interface Order {
  id: number;
  status: string;
  items: OrderItem[];
}

interface TableData {
  id: number;
  name: string;
  orders: Order[];
}

// Pořadí nejpoužívanějších kategorií
const CATEGORY_PRIORITY: Record<string, number> = {
  "čepované pivo": 1,
  "pivo": 1,
  "jídlo": 2,
  "kuchyně": 2,
  "nealko": 3,
  "limonády a ledové čaje": 3,
  "alkohol": 4,
  "panáky": 4,
  "víno": 5,
  "káva a teplé nápoje": 6,
  "chuťovky": 7,
  "pochutiny": 7,
  "dezerty": 8,
};

const QUICK_NOTES = ["Bez cibule", "S sebou", "Bez ledu", "Více propéct", "Bez tatarky"];

export default function TableDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tableId = params.id as string;

  const [table, setTable] = useState<TableData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("Vše");
  const [loading, setLoading] = useState(true);

  // Rozdělení účtu
  const [splitMode, setSplitMode] = useState(false);
  const [splitSelected, setSplitSelected] = useState<Record<number, number>>({});

  // Modály
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [noteItem, setNoteItem] = useState<OrderItem | null>(null);
  const [noteText, setNoteText] = useState("");

  // Načtení dat stolu a produktů
  const loadData = async () => {
    try {
      const [tableRes, prodRes] = await Promise.all([
        fetch(`/api/tables/${tableId}`, { cache: "no-store" }),
        fetch(`/api/products`, { cache: "no-store" }),
      ]);

      if (tableRes.ok) {
        const tData = await tableRes.json();
        setTable(tData);
      }
      if (prodRes.ok) {
        const pData = await prodRes.json();
        setProducts(pData);
      }
    } catch (e) {
      console.error("Chyba při načítání:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tableId]);

  // Aktivní otevřená objednávka
  const currentOrder = table?.orders?.[0] || null;
  const currentItems = currentOrder?.items || [];

  // Seřazení kategorií dle frekvence používání
  const sortedCategories = useMemo(() => {
    const unique = Array.from(new Set(products.map((p) => p.category.trim())));
    return [
      "Vše",
      ...unique.sort((a, b) => {
        const pA = CATEGORY_PRIORITY[a.toLowerCase()] ?? 99;
        const pB = CATEGORY_PRIORITY[b.toLowerCase()] ?? 99;
        return pA - pB;
      }),
    ];
  }, [products]);

  // Seřazené produkty k zobrazení
  const displayedProducts = useMemo(() => {
    let list = products;
    if (activeCategory !== "Vše") {
      list = list.filter((p) => p.category.trim() === activeCategory);
    }
    return [...list].sort((a, b) => {
      const pA = CATEGORY_PRIORITY[a.category.toLowerCase()] ?? 99;
      const pB = CATEGORY_PRIORITY[b.category.toLowerCase()] ?? 99;
      if (pA !== pB) return pA - pB;
      return a.name.localeCompare(b.name, "cs");
    });
  }, [products, activeCategory]);

  // Přidání produktu na stůl (klik na produkt v nabídce)
  const handleAddProduct = async (product: Product) => {
    try {
      await fetch(`/api/tables/${tableId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          quantity: 1,
        }),
      });
      loadData();
    } catch (e) {
      console.error("Chyba při přidávání na stůl:", e);
    }
  };

  // Kliknutí na položku na účtu (+1 ks nebo označení k dělení)
  const handleItemClick = async (item: OrderItem) => {
    if (splitMode) {
      const selected = splitSelected[item.id] || 0;
      setSplitSelected((prev) => ({
        ...prev,
        [item.id]: selected < item.quantity ? selected + 1 : 0,
      }));
      return;
    }

    // V normálním módu přičte +1 ks
    try {
      await fetch(`/api/tables/${tableId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: item.productId,
          quantity: 1,
        }),
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Ubrání 1 ks
  const handleDecreaseItem = async (e: React.MouseEvent, item: OrderItem) => {
    e.stopPropagation();
    try {
      await fetch(`/api/order-items/${item.id}/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: 1 }),
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Úplné smazání položky z účtu
  const handleDeleteItem = async (e: React.MouseEvent, item: OrderItem) => {
    e.stopPropagation();
    try {
      await fetch(`/api/order-items/${item.id}/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: item.quantity }),
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Uložení poznámky k jídlu
  const handleSaveNote = async () => {
    if (!noteItem) return;
    try {
      await fetch(`/api/kitchen/items/${noteItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: noteText }),
      });
      setNoteItem(null);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Součty
  const totalAccountSum = useMemo(() => {
    return currentItems.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
  }, [currentItems]);

  const splitSum = useMemo(() => {
    return currentItems.reduce((acc, i) => {
      const qty = splitSelected[i.id] || 0;
      return acc + i.unitPrice * qty;
    }, 0);
  }, [currentItems, splitSelected]);

  const currentPayAmount = splitMode ? splitSum : totalAccountSum;

  // Dokončení platby
  const handleConfirmPayment = async (method: "CASH" | "CARD") => {
    if (currentPayAmount <= 0) return;
    setIsPaying(true);

    try {
      const payload = splitMode
        ? {
            paymentMethod: method,
            splitItems: Object.entries(splitSelected)
              .filter(([_, qty]) => qty > 0)
              .map(([id, qty]) => ({ itemId: Number(id), quantity: qty })),
          }
        : { paymentMethod: method };

      const res = await fetch(`/api/tables/${tableId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsPayModalOpen(false);
        setSplitMode(false);
        setSplitSelected({});
        if (!splitMode || splitSum === totalAccountSum) {
          router.push("/");
        } else {
          loadData();
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 flex flex-col select-none">
      {/* Horní hlavička */}
      <header className="bg-slate-900 text-white p-3.5 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 transition"
          >
            ← Zpět na stoly
          </Link>
          <h1 className="text-lg font-black tracking-tight">
            {table?.name || `Stůl ${tableId}`}
          </h1>
        </div>

        <span className="text-xs font-bold text-slate-400">
          {currentItems.length} položek na účtu
        </span>
      </header>

      {/* Dvousloupcové rozvržení */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* LEVÝ PANEL: ÚČET STOLU */}
        <section className="w-full md:w-5/12 lg:w-4/12 bg-white border-r border-slate-200 flex flex-col justify-between h-[50vh] md:h-auto">
          {/* Lišta nad položkami */}
          <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <span className="text-xs font-black text-slate-600 uppercase tracking-wider">
              {splitMode ? "Vyber položky k zaplacení" : "Otevřený účet"}
            </span>

            {/* Tlačítko pro rozdělení účtu přímo u účtu */}
            <button
              onClick={() => {
                setSplitMode(!splitMode);
                setSplitSelected({});
              }}
              className={`px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer ${
                splitMode
                  ? "bg-amber-500 text-slate-950 ring-2 ring-amber-300"
                  : "bg-slate-200 hover:bg-slate-300 text-slate-700"
              }`}
            >
              {splitMode ? "✕ Zrušit dělení" : "✂️ Rozdělit účet"}
            </button>
          </div>

          {/* Seznam položek účtu */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {currentItems.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold">
                Účet je prázdný. Kliknutím vpravo přidáš položku.
              </div>
            ) : (
              currentItems.map((item) => {
                const selectedQty = splitSelected[item.id] || 0;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`p-2.5 rounded-2xl border transition cursor-pointer active:scale-[0.99] flex flex-col gap-1 ${
                      splitMode && selectedQty > 0
                        ? "border-amber-500 bg-amber-50"
                        : "border-slate-100 bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 pr-2">
                        <span className="font-extrabold text-sm text-slate-900 block leading-tight">
                          {item.productName}
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                          {item.unitPrice} Kč / ks
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Tlačítko − (ubere 1 ks) */}
                        {!splitMode && (
                          <button
                            type="button"
                            onClick={(e) => handleDecreaseItem(e, item)}
                            className="w-7 h-7 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 font-black text-base flex items-center justify-center transition cursor-pointer"
                            title="Odebrat 1 ks"
                          >
                            −
                          </button>
                        )}

                        {/* Počet kusů */}
                        {splitMode ? (
                          <span className="bg-amber-500 text-slate-950 font-black px-2 py-1 rounded-xl text-xs">
                            {selectedQty} / {item.quantity} ks
                          </span>
                        ) : (
                          <span className="bg-slate-900 text-white font-black px-2.5 py-1 rounded-xl text-xs">
                            {item.quantity}×
                          </span>
                        )}

                        {/* Tlačítko smazat celou položku */}
                        {!splitMode && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteItem(e, item)}
                            className="w-7 h-7 rounded-lg bg-slate-200 hover:bg-red-200 hover:text-red-700 text-slate-600 font-bold text-xs flex items-center justify-center transition cursor-pointer"
                            title="Smazat položku"
                          >
                            🗑️
                          </button>
                        )}

                        {/* Tlačítko poznámky */}
                        {!splitMode && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNoteItem(item);
                              setNoteText(item.note || "");
                            }}
                            className={`w-7 h-7 rounded-lg text-xs flex items-center justify-center transition cursor-pointer ${
                              item.note
                                ? "bg-amber-500 text-slate-950"
                                : "bg-slate-200 hover:bg-slate-300 text-slate-600"
                            }`}
                            title="Poznámka pro kuchyň"
                          >
                            ✏️
                          </button>
                        )}

                        <span className="font-black text-sm text-slate-900 w-14 text-right">
                          {item.unitPrice * (splitMode ? selectedQty : item.quantity)} Kč
                        </span>
                      </div>
                    </div>

                    {item.note && (
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md self-start border border-amber-200">
                        ↳ Poznámka: {item.note}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* SPODNÍ ČÁST ÚČTU: Jen suma a tlačítko Zaplatit */}
          <div className="p-3 bg-white border-t border-slate-200 space-y-2">
            <div className="flex justify-between items-baseline px-1">
              <span className="text-xs font-black text-slate-500 uppercase">
                {splitMode ? "K úhradě část" : "Celkem k úhradě"}
              </span>
              <span className="text-2xl font-black text-slate-950">
                {currentPayAmount} Kč
              </span>
            </div>

            <button
              disabled={currentPayAmount <= 0}
              onClick={() => setIsPayModalOpen(true)}
              className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 text-white disabled:text-slate-400 font-black text-lg transition shadow-md cursor-pointer active:scale-95 flex items-center justify-center gap-2"
            >
              💳 Zaplatit {currentPayAmount} Kč
            </button>
          </div>
        </section>

        {/* PRAVÝ PANEL: NABÍDKA PRODUKTŮ */}
        <section className="flex-1 bg-slate-100 flex flex-col overflow-hidden">
          {/* Kategorie – seřazené (Pivo -> Jídlo -> Nealko -> Alkohol -> Ostatní) */}
          <div className="bg-white border-b border-slate-200 p-2 overflow-x-auto flex gap-1.5 no-scrollbar">
            {sortedCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition cursor-pointer ${
                  activeCategory === cat
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Mřížka položek – kliknutím okamžitě přidáš na stůl */}
          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {displayedProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => handleAddProduct(p)}
                className="bg-white hover:bg-amber-50/60 border border-slate-200 hover:border-amber-400 rounded-2xl p-3.5 flex flex-col justify-between text-left transition shadow-xs active:scale-95 cursor-pointer min-h-[90px]"
              >
                <span className="font-extrabold text-sm text-slate-900 leading-snug">
                  {p.name}
                </span>
                <span className="font-black text-base text-amber-600 self-end mt-2">
                  {p.price} Kč
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* MODÁL PRO POZNÁMKU K JÍDLU */}
      {noteItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div>
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                Poznámka pro kuchyň
              </span>
              <h3 className="text-base font-black text-slate-900">
                {noteItem.productName}
              </h3>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {QUICK_NOTES.map((qn) => (
                <button
                  key={qn}
                  type="button"
                  onClick={() => setNoteText(qn)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 hover:text-amber-900 font-bold text-xs text-slate-700 transition"
                >
                  {qn}
                </button>
              ))}
            </div>

            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Např. bez cibule, s sebou..."
              rows={3}
              className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 outline-none focus:border-amber-500"
              autoFocus
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNoteItem(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition"
              >
                Zrušit
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-xs"
              >
                Uložit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODÁL PRO PLATBU (HOTOVOST / KARTA) */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center animate-in fade-in zoom-in duration-150">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">
              {splitMode ? "Platba části účtu" : "Platba celého účtu"}
            </span>

            <div className="text-4xl sm:text-5xl font-black text-slate-950 my-4 tracking-tight">
              {currentPayAmount} Kč
            </div>

            <p className="text-xs font-bold text-slate-500 mb-6">
              Vyberte způsob platby
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                disabled={isPaying}
                onClick={() => handleConfirmPayment("CASH")}
                className="py-4 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-base flex flex-col items-center gap-1 shadow-md transition cursor-pointer disabled:opacity-50"
              >
                <span className="text-2xl">💵</span>
                <span>Hotovost</span>
              </button>

              <button
                disabled={isPaying}
                onClick={() => handleConfirmPayment("CARD")}
                className="py-4 px-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-base flex flex-col items-center gap-1 shadow-md transition cursor-pointer disabled:opacity-50"
              >
                <span className="text-2xl">💳</span>
                <span>Karta</span>
              </button>
            </div>

            <button
              onClick={() => setIsPayModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition cursor-pointer"
            >
              Zpět na účet
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
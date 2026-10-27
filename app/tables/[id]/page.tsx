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

const QUICK_NOTES = ["Bez cibule", "S sebou", "Bez ledu", "Více propéct", "Bez tatarky", "Ostré"];

export default function TableDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tableId = params.id as string;

  const [table, setTable] = useState<TableData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("Vše");

  // Režim dělení účtu
  const [splitMode, setSplitMode] = useState(false);
  const [splitSelected, setSplitSelected] = useState<Record<number, number>>({});

  // Modály
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [noteItem, setNoteItem] = useState<OrderItem | null>(null);
  const [noteText, setNoteText] = useState("");

  const loadData = async () => {
    try {
      const [tableRes, prodRes] = await Promise.all([
        fetch(`/api/tables/${tableId}`, { cache: "no-store" }),
        fetch(`/api/products`, { cache: "no-store" }),
      ]);

      if (tableRes.ok) setTable(await tableRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());
    } catch (e) {
      console.error("Chyba při načítání:", e);
    }
  };

  useEffect(() => {
    loadData();
  }, [tableId]);

  const currentOrder = table?.orders?.[0] || null;
  const rawItems = currentOrder?.items || [];

  // 1. Rozdělení položek na ty, co se právě PŘIPRAVUJÍ (PENDING), a na ty VYDANÉ (SERVED)
  const pendingItems = useMemo(() => {
    return rawItems.filter((i) => i.status === "PENDING");
  }, [rawItems]);

  const servedItems = useMemo(() => {
    return rawItems.filter((i) => i.status !== "PENDING");
  }, [rawItems]);

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

  // Seřazené položky v aktivní kategorii
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

  // Přidat položku na stůl z nabídky (vždy jako PENDING žlutá)
  const handleAddProduct = async (product: Product) => {
    try {
      await fetch(`/api/tables/${tableId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Potvrzení výdeje jedné žluté položky
  const handleServeItem = async (itemId: number) => {
    try {
      await fetch(`/api/order-items/${itemId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SERVED" }),
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Hromadné vydání všech připravovaných věcí najednou (např. neseš celé plato piv)
  const handleServeAllPending = async () => {
    try {
      await Promise.all(
        pendingItems.map((item) =>
          fetch(`/api/order-items/${item.id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "SERVED" }),
          })
        )
      );
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Kliknutí na již vydanou položku na účtu (přičte další kus, který opět naskočí žlutě)
  const handleServedItemClick = async (item: OrderItem) => {
    if (splitMode) {
      const selected = splitSelected[item.id] || 0;
      setSplitSelected((prev) => ({
        ...prev,
        [item.id]: selected < item.quantity ? selected + 1 : 0,
      }));
      return;
    }

    // Kliknutí na vydanou položku přidá další 1 ks (do přípravy)
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

  // Vymazání celého účtu stolu
  const handleClearWholeTable = async () => {
    if (rawItems.length === 0) return;
    if (!window.confirm("Opravdu smazat všechny položky z tohoto stolu?")) return;

    try {
      await fetch(`/api/tables/${tableId}/clear`, {
        method: "POST",
      });
      loadData();
    } catch (e) {
      console.error("Chyba při mazání stolu:", e);
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

  // Výpočty částek (počítáme ze všech položek na stole)
  const totalAccountSum = useMemo(() => {
    return rawItems.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
  }, [rawItems]);

  const splitSum = useMemo(() => {
    return rawItems.reduce((acc, i) => {
      const qty = splitSelected[i.id] || 0;
      return acc + i.unitPrice * qty;
    }, 0);
  }, [rawItems, splitSelected]);

  const currentPayAmount = splitMode ? splitSum : totalAccountSum;

  // Provedení platby
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
    <main className="h-screen w-screen overflow-hidden bg-slate-950 flex flex-col select-none">
      {/* Hlavní horní lišta */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-300 transition"
          >
            ← Stoly
          </Link>
          <div className="flex items-baseline gap-2">
            <h1 className="text-base font-black text-white tracking-tight">
              {table?.name || `Stůl ${tableId}`}
            </h1>
            <span className="text-xs font-semibold text-slate-400">
              ({rawItems.length} položek)
            </span>
          </div>
        </div>

        <div className="text-xs font-bold text-slate-400">
          Hospoda U Šuláků • Pokladna
        </div>
      </header>

      {/* Dvousloupcové rozvržení (100% výšky displeje) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* LEVÝ PANEL: ÚČET STOLU */}
        <section className="w-full md:w-5/12 lg:w-[380px] xl:w-[420px] bg-white border-r border-slate-200 flex flex-col justify-between h-[48vh] md:h-full shrink-0">
          
          {/* Horní lišta účtu */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
            <span className="text-xs font-black text-slate-600 uppercase tracking-wider">
              {splitMode ? "Výběr k úhradě" : "Účet stolu"}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSplitMode(!splitMode);
                  setSplitSelected({});
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  splitMode
                    ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {splitMode ? "Zrušit dělení" : "Rozdělit účet"}
              </button>

              {!splitMode && (
                <button
                  type="button"
                  disabled={rawItems.length === 0}
                  onClick={handleClearWholeTable}
                  className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 text-xs font-bold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Vyprázdnit celý stůl"
                >
                  Smazat stůl
                </button>
              )}
            </div>
          </div>

          {/* Scrollovatelný obsah účtu */}
          <div className="flex-1 overflow-y-auto p-2 space-y-3">
            
            {/* 1. SEKCIE: PRÁVĚ SE PŘIPRAVUJE (ŽLUTÉ POLOŽKY) */}
            {pendingItems.length > 0 && (
              <div className="bg-amber-50/80 border border-amber-300 rounded-2xl p-2.5 space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span className="text-[11px] font-black uppercase text-amber-950 tracking-wider">
                      K výdeji ({pendingItems.length})
                    </span>
                  </div>

                  {pendingItems.length > 1 && (
                    <button
                      type="button"
                      onClick={handleServeAllPending}
                      className="text-[11px] font-black bg-amber-500 hover:bg-amber-400 text-slate-950 px-2 py-0.5 rounded-lg transition cursor-pointer"
                    >
                      Vydat vše najednou
                    </button>
                  )}
                </div>

                {/* Seznam položek v přípravě */}
                <div className="space-y-1.5">
                  {pendingItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleServeItem(item.id)}
                      className="p-2.5 rounded-xl bg-amber-100/90 border border-amber-300 hover:bg-amber-200/90 transition cursor-pointer flex items-center justify-between shadow-2xs active:scale-[0.99]"
                    >
                      <div className="flex-1 pr-2">
                        <span className="font-extrabold text-sm text-slate-950 block leading-tight">
                          {item.productName}
                        </span>
                        <span className="text-[11px] font-bold text-amber-900">
                          {item.unitPrice} Kč • Klikni pro vydání
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleDecreaseItem(e, item)}
                          className="w-7 h-7 rounded-lg bg-white border border-amber-300 hover:bg-red-100 hover:text-red-700 text-slate-800 font-black text-sm flex items-center justify-center transition cursor-pointer"
                          title="Zrušit položku"
                        >
                          −
                        </button>

                        <span className="bg-amber-500 text-slate-950 font-black px-2.5 py-1 rounded-lg text-xs shadow-2xs">
                          Vydat
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. SEKCIE: JIŽ VYDANÉ POLOŽKY NA ÚČTU */}
            <div className="space-y-1.5">
              {servedItems.length === 0 && pendingItems.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-slate-400 text-xs font-bold">
                  Účet je prázdný. Klikni na položku vpravo pro přidání.
                </div>
              ) : (
                servedItems.map((item) => {
                  const selectedQty = splitSelected[item.id] || 0;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleServedItemClick(item)}
                      className={`p-2.5 rounded-xl border transition cursor-pointer active:scale-[0.99] flex flex-col gap-1 ${
                        splitMode && selectedQty > 0
                          ? "border-amber-400 bg-amber-50/70"
                          : "border-slate-200 bg-slate-50/60 hover:bg-slate-100/80"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 pr-2">
                          <span className="font-bold text-sm text-slate-900 block leading-tight">
                            {item.productName}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-400">
                            {item.unitPrice} Kč / ks
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Tlačítko -1 ks */}
                          {!splitMode && (
                            <button
                              type="button"
                              onClick={(e) => handleDecreaseItem(e, item)}
                              className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center transition cursor-pointer"
                              title="Odebrat 1 ks"
                            >
                              −
                            </button>
                          )}

                          {/* Počet kusů */}
                          {splitMode ? (
                            <span className="bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-lg text-xs">
                              {selectedQty} / {item.quantity} ks
                            </span>
                          ) : (
                            <span className="bg-slate-900 text-white font-black px-2.5 py-1 rounded-lg text-xs min-w-[28px] text-center">
                              {item.quantity}×
                            </span>
                          )}

                          {/* Poznámka pro kuchyň */}
                          {!splitMode && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setNoteItem(item);
                                setNoteText(item.note || "");
                              }}
                              className={`px-1.5 h-7 rounded-lg text-[11px] font-bold border transition cursor-pointer flex items-center justify-center ${
                                item.note
                                  ? "bg-amber-500 border-amber-500 text-slate-950"
                                  : "bg-white border-slate-200 text-slate-500 hover:bg-slate-100"
                              }`}
                              title="Poznámka pro kuchyň"
                            >
                              Pozn.
                            </button>
                          )}

                          <span className="font-black text-sm text-slate-900 w-16 text-right">
                            {item.unitPrice * (splitMode ? selectedQty : item.quantity)} Kč
                          </span>
                        </div>
                      </div>

                      {item.note && (
                        <span className="text-[11px] font-semibold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200 self-start">
                          Poznámka: {item.note}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* SPODNÍ ČÁST ÚČTU: Trvale na očích bez ohledu na velikost nabídky */}
          <div className="p-3 bg-white border-t border-slate-200 space-y-2 shrink-0 shadow-xs">
            <div className="flex justify-between items-baseline px-1">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                {splitMode ? "Část k úhradě" : "Celkem k úhradě"}
              </span>
              <span className="text-2xl font-black text-slate-900">
                {currentPayAmount} Kč
              </span>
            </div>

            <button
              disabled={currentPayAmount <= 0}
              onClick={() => setIsPayModalOpen(true)}
              className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white disabled:text-slate-400 font-black text-base transition cursor-pointer active:scale-[0.99] flex items-center justify-center gap-2 shadow-sm"
            >
              Zaplatit {currentPayAmount} Kč
            </button>
          </div>
        </section>

        {/* PRAVÝ PANEL: NABÍDKA PRODUKTŮ */}
        <section className="flex-1 bg-slate-100 flex flex-col overflow-hidden h-[52vh] md:h-full">
          {/* Kategorie vodorovně */}
          <div className="bg-white border-b border-slate-200 p-2 overflow-x-auto flex gap-1.5 shrink-0 no-scrollbar">
            {sortedCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition cursor-pointer ${
                  activeCategory === cat
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Mřížka položek */}
          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 content-start">
            {displayedProducts.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleAddProduct(p)}
                className="bg-white hover:border-slate-400 border border-slate-200 rounded-xl p-3 flex flex-col justify-between text-left transition shadow-xs active:scale-95 cursor-pointer min-h-[82px]"
              >
                <span className="font-bold text-xs sm:text-sm text-slate-900 leading-snug">
                  {p.name}
                </span>
                <span className="font-black text-sm text-slate-900 self-end mt-1">
                  {p.price} Kč
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* MODÁL PRO PLATBU (HOTOVOST / KARTA) */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center animate-in fade-in zoom-in-95 duration-100">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">
              {splitMode ? "Platba části účtu" : "Platba účtu"}
            </span>

            <div className="text-4xl sm:text-5xl font-black text-slate-950 my-4 tracking-tight">
              {currentPayAmount} Kč
            </div>

            <p className="text-xs font-semibold text-slate-500 mb-6">
              Vyberte způsob úhrady
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                disabled={isPaying}
                onClick={() => handleConfirmPayment("CASH")}
                className="py-4 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-base flex flex-col items-center gap-1 shadow-md shadow-emerald-900/20 transition cursor-pointer disabled:opacity-50"
              >
                <span className="text-3xl">💵</span>
                <span className="text-lg font-black tracking-tight">Hotovost</span>
                <span className="text-[11px] text-emerald-100 font-medium">Tisk účtenky</span>
              </button>

              <button
                disabled={isPaying}
                onClick={() => handleConfirmPayment("CARD")}
                className="py-4 px-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-base flex flex-col items-center gap-1 shadow-md shadow-indigo-900/20 transition cursor-pointer disabled:opacity-50"
              >
                <span className="text-3xl">💳</span>
                <span className="text-lg font-black tracking-tight">Karta</span>
                <span className="text-[11px] text-indigo-100 font-medium">Terminál</span>
              </button>
            </div>

            <button
              onClick={() => setIsPayModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition cursor-pointer"
            >
              Zpět k účtu
            </button>
          </div>
        </div>
      )}

      {/* MODÁL PRO POZNÁMKU K JÍDLU */}
      {noteItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-3">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                Poznámka k jídlu do kuchyně
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
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-700 transition cursor-pointer"
                >
                  {qn}
                </button>
              ))}
            </div>

            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Vlastní poznámka..."
              rows={2}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 outline-none focus:border-slate-800"
              autoFocus
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNoteItem(null)}
                className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition cursor-pointer"
              >
                Zrušit
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                className="flex-1 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
              >
                Uložit
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
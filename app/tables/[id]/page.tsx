"use client";

import { use, useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { printReceiptViaRawBT } from "@/lib/printReceipt";




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
  section?: string | null;
  isReserved?: boolean | null;
  customerName?: string | null;
  reservationTime?: string | null;
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






export default function TableDetailPage() {


  const params = useParams();
  const router = useRouter();
  const tableId = params.id as string;

  // Stav pro fulltextové vyhledávání (lupa)
  const [searchQuery, setSearchQuery] = useState("");

  // Vizuální zpětná vazba – ID produktu rozsvíceného na 1 sekundu
  const [highlightedProductId, setHighlightedProductId] = useState<number | null>(null);

  // Režim dělení účtu
  const [splitMode, setSplitMode] = useState(false);
  const [splitSelected, setSplitSelected] = useState<Record<number, number>>({});

  // Modály a stav platby
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const [table, setTable] = useState<TableData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("Vše");
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]); // <- stačí mít pouze zde

  // Stavy pro Přesun stolu
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [allTables, setAllTables] = useState<any[]>([]);
  const [selectedTargetTable, setSelectedTargetTable] = useState<number | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

  // Stavy pro Rezervaci
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [reserveName, setReserveName] = useState("");
  const [reserveTime, setReserveTime] = useState("");
  const [isReserving, setIsReserving] = useState(false);

  const [topProductIds, setTopProductIds] = useState<number[]>([]);

  const loadData = async () => {
    try {
      const [tableRes, prodRes, paymentsRes] = await Promise.all([
        fetch(`/api/tables/${tableId}`, { cache: "no-store" }),
        fetch(`/api/products`, { cache: "no-store" }),
        fetch(`/api/payments`, { cache: "no-store" }),
      ]);

      if (tableRes.ok) setTable(await tableRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());

      // Spočítáme nejprodávanější produkty z plateb
      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        const salesCounts: Record<string, number> = {};

        if (Array.isArray(paymentsData)) {
          for (const p of paymentsData) {
            for (const it of p.order?.items || []) {
              salesCounts[it.productName] = (salesCounts[it.productName] || 0) + it.quantity;
            }
          }
        }

        // Seřadíme názvy podle počtu prodejů
        const sortedNames = Object.entries(salesCounts)
          .sort(([, a], [, b]) => b - a)
          .map(([name]) => name);

        // Přiřadíme odpovídající ID produktů
        if (prodRes.ok) {
          const prods: Product[] = await prodRes.clone().json();
          const ids = sortedNames
            .map((name) => prods.find((pr) => pr.name.toLowerCase() === name.toLowerCase())?.id)
            .filter((id): id is number => id !== undefined);

          setTopProductIds(ids);
        }
      }
    } catch (e) {
      console.error("Chyba při načítání dat:", e);
    }
  };

  // Načtení všech stolů pro výběr cíle při přesunu
  useEffect(() => {
    fetch("/api/tables", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAllTables(data.filter((t) => t.id !== Number(tableId)));
        }
      })
      .catch(() => { });
  }, [tableId]);

  const handleTransfer = async () => {
    if (!selectedTargetTable) return;
    try {
      setIsTransferring(true);
      const res = await fetch(`/api/tables/${tableId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetTableId: selectedTargetTable }),
      });
      if (res.ok) {
        setIsTransferModalOpen(false);
        router.push(`/tables/${selectedTargetTable}`);
      } else {
        const err = await res.json();
        alert(err.error || "Chyba při přesunu");
      }
    } catch {
      alert("Chyba spojení");
    } finally {
      setIsTransferring(false);
    }
  };

  const handleSaveReservation = async (isReserved: boolean) => {
    try {
      setIsReserving(true);
      const res = await fetch(`/api/tables/${tableId}/reserve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isReserved,
          customerName: reserveName,
          reservationTime: reserveTime,
        }),
      });
      if (res.ok) {
        setIsReserveModalOpen(false);
        await loadData();
      }
    } catch {
      alert("Chyba při ukládání rezervace");
    } finally {
      setIsReserving(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tableId]);

  // Cesta zpět do správné místnosti
  const mapBackUrl = useMemo(() => {
    // Pokud je to stůl Personál nebo BAR, vracíme se na hlavní stránku
    if (
      table?.name?.toLowerCase() === "personál" ||
      table?.name?.toLowerCase() === "personal" ||
      table?.name?.toLowerCase() === "bar"
    ) {
      return "/";
    }

    if (!table?.section) return "/section/vnitrek";
    const sec = table.section.toLowerCase();
    if (sec.includes("zahrad")) return "/section/zahradka";
    if (sec.includes("salon")) return "/section/salonek";
    return "/section/vnitrek";
  }, [table]);

  const currentOrder = table?.orders?.[0] || null;
  const rawItems = currentOrder?.items || [];
  const servedItems = useMemo(() => rawItems, [rawItems]);

  // Seřazení kategorií
  const sortedCategories = useMemo(() => {
    const unique = Array.from(new Set(products.map((p) => p.category.trim())));
    const sorted = unique.sort((a, b) => {
      const pA = CATEGORY_PRIORITY[a.toLowerCase()] ?? 99;
      const pB = CATEGORY_PRIORITY[b.toLowerCase()] ?? 99;
      return pA - pB;
    });
    return ["⭐ Oblíbené", "Vše", ...sorted];
  }, [products]);

  // Filtrované položky nabídky
  const isDrink = (cat: string) => {
    const c = (cat || "").toLowerCase();
    return (
      c.includes("piv") ||
      c.includes("nealko") ||
      c.includes("limo") ||
      c.includes("čaj") ||
      c.includes("alko") ||
      c.includes("panák") ||
      c.includes("vín") ||
      c.includes("káv") ||
      c.includes("drin")
    );
  };

  const displayedProducts = useMemo(() => {
    let list = [...products];

    // 1. Fulltextové vyhledávání přes lupu
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase().trim();
      return list.filter((p) => p.name.toLowerCase().includes(q));
    }

    // 2. Záložka "⭐ Oblíbené" -> Zobrazí všechny produkty seřazené: nejdříve pití, potom jídlo
    // 2. Záložka "⭐ Oblíbené" -> Nejprodávanější produkty (bestsellery)
    if (activeCategory === "⭐ Oblíbené") {
      let favList: Product[] = [];

      // A) Pokud máme data z reálných prodejů, vezmeme TOP produkty
      if (topProductIds.length > 0) {
        favList = topProductIds
          .map((id) => list.find((p) => p.id === id))
          .filter((p): p is Product => p !== undefined)
          .slice(0, 15); // Zobrazíme TOP 15 nejprodávanějších položek
      }

      // B) Pokud ještě není dost prodejů, nabídneme hlavní taháky (piva, kofolu, klasiky)
      if (favList.length === 0) {
        favList = list.filter((p) => {
          const name = p.name.toLowerCase();
          const cat = p.category.toLowerCase();
          return (
            cat.includes("piv") ||
            name.includes("hladinka") ||
            name.includes("kofola") ||
            name.includes("káva") ||
            cat.includes("chuťovk")
          );
        });
      }

      // Seřadíme: nejdříve nejprodávanější pití, pak jídlo
      return favList.sort((a, b) => {
        const aDrink = isDrink(a.category);
        const bDrink = isDrink(b.category);

        if (aDrink && !bDrink) return -1;
        if (!aDrink && bDrink) return 1;

        return a.name.localeCompare(b.name, "cs");
      });
    }

    // 3. Konkrétní vybraná kategorie
    if (activeCategory !== "Vše") {
      list = list.filter((p) => p.category.trim() === activeCategory);
    }

    return list.sort((a, b) => {
      if (activeCategory === "Vše") {
        const pA = CATEGORY_PRIORITY[a.category.toLowerCase()] ?? 99;
        const pB = CATEGORY_PRIORITY[b.category.toLowerCase()] ?? 99;
        if (pA !== pB) return pA - pB;
      }
      const orderA = (a as any).order ?? 0;
      const orderB = (b as any).order ?? 0;
      if (orderA !== orderB) return orderA - orderB;

      return a.name.localeCompare(b.name, "cs");
    });
  }, [products, activeCategory, searchQuery]);

  // Přidání produktu
  const handleAddProductById = async (productId: number) => {
    setHighlightedProductId(productId);
    setTimeout(() => {
      setHighlightedProductId(null);
    }, 1000);

    try {
      const res = await fetch(`/api/tables/${tableId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (e) {
      console.error("Chyba při přidávání položky:", e);
    }
  };

  // Odebrání 1 kusu z účtu
  const handleRemoveSingleItem = async (itemId: number) => {
    try {
      const res = await fetch(`/api/order-items/${itemId}/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: 1 }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (e) {
      console.error("Chyba při odebírání položky:", e);
    }
  };

  // Celková hodnota stolu
  const totalAccountSum = useMemo(() => {
    return servedItems.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
  }, [servedItems]);

  // Hodnota vybraných položek při dělení účtu
  const splitSum = useMemo(() => {
    return Object.entries(splitSelected).reduce((acc, [id, qty]) => {
      const item = servedItems.find((i) => i.id === Number(id));
      return acc + (item ? item.unitPrice * qty : 0);
    }, 0);
  }, [splitSelected, servedItems]);

  const currentPayAmount = splitMode ? splitSum : totalAccountSum;

  const handleToggleSplitSelect = (itemId: number, maxQty: number) => {
    setSplitSelected((prev) => {
      const current = prev[itemId] || 0;
      if (current >= maxQty) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return { ...prev, [itemId]: current + 1 };
    });
  };

  // Potvrzení a tisk platby
  const handleConfirmPayment = async (method: "CASH" | "CARD") => {
    if (currentPayAmount <= 0) return;
    setIsPaying(true);

    // 1. Připravíme data pro tisk
    const itemsToPrint = splitMode
      ? servedItems
        .filter((i) => (splitSelected[i.id] || 0) > 0)
        .map((i) => ({
          name: i.productName,
          quantity: splitSelected[i.id],
          unitPrice: i.unitPrice,
        }))
      : servedItems.map((i) => ({
        name: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      }));

    // 2. OKAMŽITÝ TISK: Odešleme do tiskárny hned bez čekání na server!
    printReceiptViaRawBT({
      tableName: table?.name || `Stůl ${tableId}`,
      items: itemsToPrint,
      totalAmount: currentPayAmount,
      paymentMethod: method,
    });

    try {
      const splitItemsArray = Object.entries(splitSelected)
        .filter(([_, qty]) => qty > 0)
        .map(([id, qty]) => ({ itemId: Number(id), quantity: qty }));

      const payload = splitMode
        ? {
          paymentMethod: method,
          splitItems: splitItemsArray,
        }
        : { paymentMethod: method };

      // 3. Zápis do databáze běží souběžně
      const res = await fetch(`/api/tables/${tableId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsPayModalOpen(false);
        const wasFullPay = !splitMode || splitSum === totalAccountSum;
        setSplitMode(false);
        setSplitSelected({});

        if (wasFullPay) {
          router.push(mapBackUrl);
        } else {
          await loadData();
        }
      }
    } catch (e) {
      console.error("Chyba při platbě:", e);
    } finally {
      setIsPaying(false);
    }
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem("favorite_product_ids");
      if (stored) {
        setFavoriteIds(JSON.parse(stored));
      }
    } catch {
      // Ignorovat chybu, pokud localStorage není dostupný
    }
  }, []);

  return (
    <main className="h-screen max-h-screen bg-slate-100 p-2 sm:p-3 flex flex-col overflow-hidden select-none">
      <div className="mx-auto w-full max-w-7xl flex flex-col flex-1 min-h-0 space-y-2">
        {/* Horní lišta */}
        <header className="flex items-center justify-between gap-2 bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href={mapBackUrl}
              className="rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2.5 text-sm sm:text-base font-bold text-slate-700 transition active:scale-95"
            >
              ← Zpět
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {table?.name || `Stůl ${tableId}`}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Tlačítko Rezervace */}
            <button
              type="button"
              onClick={() => {
                setReserveName(table?.customerName || "");
                setReserveTime(table?.reservationTime || "");
                setIsReserveModalOpen(true);
              }}
              className={`rounded-xl px-3 py-2 text-xs sm:text-sm font-black transition active:scale-95 cursor-pointer shadow-xs ${table?.isReserved
                  ? "bg-amber-400 text-slate-950 hover:bg-amber-500"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
            >
              📅 {table?.isReserved ? "Rezervováno" : "Rezervace"}
            </button>

            {/* Tlačítko Přesunout stůl */}
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(true)}
              disabled={servedItems.length === 0}
              className="rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 px-3 py-2 text-xs sm:text-sm font-black text-slate-700 transition active:scale-95 cursor-pointer shadow-xs"
            >
              🔀 Přesunout
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-slate-700 bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200/60">
              Položek: {servedItems.reduce((acc, i) => acc + i.quantity, 0)}
            </span>
          </div>
        </header>

        {/* Hlavní layout: vlevo účet, vpravo nabídka */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2">
          {/* LEVÝ SLOUPEC: Účet stolu */}
          <div className="lg:col-span-5 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs p-3 min-h-0">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2 shrink-0">
              <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
                {splitMode ? "Vyber položky k zaplacení" : "Položky na účtu (klik = +1)"}
              </span>
              {splitMode && (
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Dělení aktivní
                </span>
              )}
            </div>

            {/* Scrollovatelný seznam položek */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0">
              {servedItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <span className="text-3xl mb-1">🧾</span>
                  <span className="text-xs font-bold">Stůl je prázdný</span>
                  <span className="text-[11px] text-slate-400">Vyberte položku z nabídky vpravo</span>
                </div>
              ) : (
                servedItems.map((item) => {
                  const isHighlighted = item.productId === highlightedProductId;
                  const isSplitChosen = (splitSelected[item.id] || 0) > 0;

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (splitMode) {
                          handleToggleSplitSelect(item.id, item.quantity);
                        } else {
                          handleAddProductById(item.productId);
                        }
                      }}
                      className={`p-2.5 rounded-xl border transition-all duration-300 flex items-center justify-between cursor-pointer active:scale-[0.99] ${isHighlighted
                        ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400 scale-[1.01]"
                        : isSplitChosen
                          ? "border-amber-400 bg-amber-50/80 ring-1 ring-amber-300"
                          : "border-slate-100 bg-slate-50/70 hover:bg-slate-100/90"
                        }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {splitMode ? (
                          <span
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${isSplitChosen
                              ? "bg-amber-500 text-slate-950"
                              : "bg-slate-200 text-slate-500"
                              }`}
                          >
                            {splitSelected[item.id] || 0}
                          </span>
                        ) : (
                          <span className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center text-sm font-black shrink-0 shadow-2xs">
                            {item.quantity}×
                          </span>
                        )}

                        <div className="min-w-0">
                          <span className="font-bold text-sm sm:text-base text-slate-900 block truncate">
                            {item.productName}
                          </span>
                          <span className="text-xs sm:text-sm text-slate-500 font-medium">
                            {item.unitPrice} Kč / ks
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-black text-sm text-slate-950 tracking-tight">
                          {item.quantity * item.unitPrice} Kč
                        </span>

                        {!splitMode && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveSingleItem(item.id);
                              }}
                              className="w-8 h-8 rounded-lg bg-slate-200/90 hover:bg-red-100 hover:text-red-700 active:scale-95 text-slate-700 font-black text-base flex items-center justify-center transition cursor-pointer"
                              title="Odebrat kus"
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddProductById(item.productId);
                              }}
                              className="w-8 h-8 rounded-lg bg-emerald-100 hover:bg-emerald-200 active:scale-95 text-emerald-800 font-black text-base flex items-center justify-center transition cursor-pointer"
                              title="Přidat kus"
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

            {/* Trvale viditelný spodní panel: Rozdělit účet + Zaplatit */}
            <div className="border-t-2 border-slate-200/80 pt-3 mt-2 shrink-0 bg-white space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">
                    {splitMode ? "Vybráno k platbě" : "Celkem k úhradě"}
                  </span>
                  <span className="text-2xl font-black text-slate-950 tracking-tight">
                    {currentPayAmount.toLocaleString("cs-CZ")} Kč
                  </span>
                </div>

                {splitMode && (
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">
                      Celý stůl
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {totalAccountSum.toLocaleString("cs-CZ")} Kč
                    </span>
                  </div>
                )}
              </div>

              {/* Dvě velká dotyková tlačítka vedle sebe */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSplitMode(!splitMode);
                    setSplitSelected({});
                  }}
                  disabled={servedItems.length === 0}
                  className={`py-3 px-3 rounded-2xl font-black text-sm flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-30 ${splitMode
                    ? "bg-amber-500 hover:bg-amber-400 text-slate-950 border-2 border-amber-600 shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-200"
                    }`}
                >
                  <span className="text-base">{splitMode ? "✕" : "✂️"}</span>
                  <span>{splitMode ? "Zrušit" : "Rozdělit"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(true)}
                  disabled={servedItems.length === 0 || (splitMode && splitSum === 0)}
                  className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:bg-slate-400 text-white font-black text-sm shadow-md transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Zaplatit</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>

          {/* PRAVÝ SLOUPEC: Nabídka produktů a kategorií */}
          <div className="lg:col-span-7 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs p-3 min-h-0">

            {/* Lupa / Vyhledávací pole */}
            <div className="relative mb-2 shrink-0">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm pointer-events-none">
                🔍
              </span>
              <input
                type="text"
                placeholder="Hledat položku..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-2.5 flex items-center text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Kategorie */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 shrink-0 border-b border-slate-100">
              {sortedCategories.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setActiveCategory(cat);
                      setSearchQuery("");
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition cursor-pointer ${isActive
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Mřížka položek nabídky */}
            {/* Mřížka tlačítek s produkty */}
            <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2 pr-1 min-h-0 content-start">
              {displayedProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleAddProductById(p.id)}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 active:scale-95 text-left flex flex-col justify-between min-h-[96px] h-auto transition cursor-pointer shadow-xs"
                >
                  <span className="font-bold text-sm text-slate-900 leading-snug break-words">
                    {p.name}
                  </span>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
                    <span className="text-xs text-slate-400 font-semibold truncate mr-2">
                      {p.category}
                    </span>
                    <span className="font-black text-sm text-slate-900 shrink-0">
                      {p.price} Kč
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Platební modal */}
      {isPayModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <h3 className="text-lg font-black text-slate-900">Způsob platby</h3>
            <p className="text-2xl font-black text-emerald-700">
              {currentPayAmount.toLocaleString("cs-CZ")} Kč
            </p>
            <p className="text-xs text-slate-400">
              {splitMode ? "Částečná úhrada vybraných položek" : "Celý účet stolu"}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                disabled={isPaying}
                onClick={() => handleConfirmPayment("CASH")}
                className="py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-sm flex flex-col items-center justify-center gap-1 shadow-xs transition cursor-pointer"
              >
                <span className="text-xl">💵</span>
                <span>Hotovost</span>
              </button>

              <button
                disabled={isPaying}
                onClick={() => handleConfirmPayment("CARD")}
                className="py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-sm flex flex-col items-center justify-center gap-1 shadow-xs transition cursor-pointer"
              >
                <span className="text-xl">💳</span>
                <span>Karta</span>
              </button>
            </div>

            <button
              onClick={() => setIsPayModalOpen(false)}
              disabled={isPaying}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition cursor-pointer"
            >
              Zrušit
            </button>
          </div>
        </div>
      )}

      {/* MODÁL PŘESUNUTÍ STOLU */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-xl font-black text-slate-900">🔀 Přesunout účet</h3>
            <p className="mt-1 text-xs text-slate-500">
              Vyber cílový stůl, na který se převedou veškeré položky.
            </p>

            <div className="mt-4 max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {allTables.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTargetTable(t.id)}
                  className={`w-full p-3 rounded-xl border text-left font-bold text-sm flex items-center justify-between transition cursor-pointer ${selectedTargetTable === t.id
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800"
                    }`}
                >
                  <span>{t.name}</span>
                  <span className="text-xs font-semibold opacity-70">{t.section}</span>
                </button>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleTransfer}
                disabled={!selectedTargetTable || isTransferring}
                className="w-full rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 py-3 text-sm font-black text-slate-950 shadow transition cursor-pointer disabled:opacity-40"
              >
                {isTransferring ? "Přesouvám..." : "Potvrdit přesun"}
              </button>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="w-full rounded-2xl bg-slate-100 hover:bg-slate-200 py-2.5 text-xs font-semibold text-slate-600 transition cursor-pointer"
              >
                Zrušit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODÁL REZERVACE */}
      {isReserveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-xl font-black text-slate-900">📅 Rezervace stolu</h3>
            <p className="mt-1 text-xs text-slate-500">
              Nastav jméno hosta a čas příchodu.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jméno hosta</label>
                <input
                  type="text"
                  placeholder="např. Novák (4 osoby)"
                  value={reserveName}
                  onChange={(e) => setReserveName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Čas příchodu</label>
                <input
                  type="text"
                  placeholder="např. 18:00"
                  value={reserveTime}
                  onChange={(e) => setReserveTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleSaveReservation(true)}
                disabled={isReserving}
                className="w-full rounded-2xl bg-amber-400 hover:bg-amber-500 active:scale-95 py-3 text-sm font-black text-slate-950 shadow transition cursor-pointer"
              >
                {isReserving ? "Ukládám..." : "Uložit rezervaci"}
              </button>

              {table?.isReserved && (
                <button
                  type="button"
                  onClick={() => handleSaveReservation(false)}
                  disabled={isReserving}
                  className="w-full rounded-2xl border border-red-200 bg-red-50 hover:bg-red-100 py-2.5 text-xs font-bold text-red-600 transition cursor-pointer"
                >
                  Zrušit rezervaci stolu
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsReserveModalOpen(false)}
                className="w-full rounded-2xl bg-slate-100 hover:bg-slate-200 py-2.5 text-xs font-semibold text-slate-600 transition cursor-pointer"
              >
                Zavřít
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
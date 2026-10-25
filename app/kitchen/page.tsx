"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type KitchenItem = {
  id: number;
  name: string;
  quantity: number;
  status: string; // "PENDING" | "DONE"
};

type KitchenTicket = {
  orderId: number;
  tableName: string;
  section: string;
  createdAt: string;
  items: KitchenItem[];
};

export default function KitchenPage() {
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<Date>(new Date());
  const [showCompleted, setShowCompleted] = useState(false);

  // Načtení dat ze serveru (sdílená DB pro všechna zařízení)
  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/kitchen", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      }
    } catch (err) {
      console.error("Chyba načítání bonů v kuchyni:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    const syncInterval = setInterval(fetchTickets, 3000);
    const clockInterval = setInterval(() => setNow(new Date()), 30000);

    return () => {
      clearInterval(syncInterval);
      clearInterval(clockInterval);
    };
  }, []);

  // Přepnutí stavu jedné konkrétní položky (Jídla)
  const toggleItemStatus = async (itemId: number, currentStatus: string) => {
    const nextStatus = currentStatus === "DONE" ? "PENDING" : "DONE";

    // Optimistická aktualizace v UI
    setTickets((prev) =>
      prev.map((t) => ({
        ...t,
        items: t.items.map((i) =>
          i.id === itemId ? { ...i, status: nextStatus } : i
        ),
      }))
    );

    try {
      await fetch(`/api/kitchen/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      fetchTickets();
    } catch (e) {
      console.error("Chyba při ukládání stavu položky:", e);
      fetchTickets();
    }
  };

  // Vydat všechny zbývající položky daného stolu najednou
  const handleMarkAllOrderDone = async (ticket: KitchenTicket) => {
    const pendingItems = ticket.items.filter((i) => i.status !== "DONE");

    // Optimistický update
    setTickets((prev) =>
      prev.map((t) =>
        t.orderId === ticket.orderId
          ? { ...t, items: t.items.map((i) => ({ ...i, status: "DONE" })) }
          : t
      )
    );

    try {
      await Promise.all(
        pendingItems.map((item) =>
          fetch(`/api/kitchen/items/${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "DONE" }),
          })
        )
      );
      fetchTickets();
    } catch (e) {
      console.error("Chyba při hromadném vydání:", e);
      fetchTickets();
    }
  };

  const getWaitMinutes = (createdAt: string) => {
    const created = new Date(createdAt);
    const diffMs = now.getTime() - created.getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  // Tisk bonu
  const handlePrint = (ticket: KitchenTicket) => {
    const printWindow = window.open("", "_blank", "width=350,height=500");
    if (!printWindow) return;

    const time = new Date(ticket.createdAt).toLocaleTimeString("cs-CZ", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const itemsHtml = ticket.items
      .map(
        (item) => `
        <div style="display:flex; justify-content:space-between; font-size:16px; font-weight:bold; margin-bottom:6px;">
          <span style="${item.status === "DONE" ? "text-decoration: line-through; opacity: 0.5;" : ""}">${item.name}</span>
          <span style="background:#000; color:#fff; padding:1px 6px; border-radius:4px;">${item.quantity}×</span>
        </div>
      `
      )
      .join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>BON - ${ticket.tableName}</title>
          <style>
            body { font-family: monospace; padding: 10px; margin: 0; width: 75mm; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 10px; }
            .title { font-size: 20px; font-weight: 900; }
            .footer { border-top: 2px solid #000; text-align: center; font-size: 11px; margin-top: 10px; padding-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">BON: ${ticket.tableName}</div>
            <div>${ticket.section} • Čas: ${time}</div>
          </div>
          <div>${itemsHtml}</div>
          <div class="footer">Objednávka do kuchyně</div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Filtrování bonů: aktivní mají alespoň 1 položku nevyřízenou
  const activeTickets = tickets.filter((t) =>
    t.items.some((i) => i.status !== "DONE")
  );
  const completedTickets = tickets.filter((t) =>
    t.items.every((i) => i.status === "DONE")
  );

  // Souhrn pro denní raport
  const cookedSummaryMap: Record<string, number> = {};
  for (const t of tickets) {
    for (const item of t.items) {
      if (item.status === "DONE") {
        cookedSummaryMap[item.name] =
          (cookedSummaryMap[item.name] || 0) + item.quantity;
      }
    }
  }

  const cookedSummary = Object.entries(cookedSummaryMap).sort((a, b) => b[1] - a[1]);
  const totalCookedPortions = cookedSummary.reduce((acc, [, q]) => acc + q, 0);

  // Tisk raportu kuchyně
  const handlePrintKitchenRaport = () => {
    const printWindow = window.open("", "_blank", "width=380,height=600");
    if (!printWindow) return;

    const dateStr = now.toLocaleDateString("cs-CZ");
    const timeStr = now.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });

    const rowsHtml = cookedSummary
      .map(
        ([name, qty]) => `
        <div style="display:flex; justify-content:space-between; font-size:14px; font-weight:bold; padding:4px 0; border-bottom:1px dashed #ccc;">
          <span>${name}</span>
          <span style="font-size:16px;">${qty} ks</span>
        </div>
      `
      )
      .join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>DENNÍ RAPORT KUCHYNĚ</title>
          <style>
            body { font-family: monospace; padding: 12px; margin: 0; width: 78mm; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
            .title { font-size: 18px; font-weight: 900; }
            .summary { margin: 12px 0; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 8px 0; }
            .total { display: flex; justify-content: space-between; font-size: 16px; font-weight: 900; }
            .footer { margin-top: 20px; font-size: 11px; text-align: center; }
            .sign { margin-top: 30px; border-top: 1px dotted #000; padding-top: 4px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">DENNÍ RAPORT KUCHYNĚ</div>
            <div style="font-size:12px; margin-top:2px;">Hospoda U Šuláků</div>
            <div style="font-size:11px; color:#555; margin-top:2px;">${dateStr} • ${timeStr}</div>
          </div>
          <div>${rowsHtml}</div>
          <div class="summary">
            <div class="total">
              <span>UVAŘENO CELKEM:</span>
              <span>${totalCookedPortions} porcí</span>
            </div>
            <div style="font-size:11px; color:#555; margin-top:3px;">Kompletně vydaných stolů: ${completedTickets.length}</div>
          </div>
          <div class="sign">Podpis kuchaře</div>
          <div class="footer">Konec směny - vygenerováno systémem</div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const displayedTickets = showCompleted ? completedTickets : activeTickets;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none p-4">
      {/* Horní lišta */}
      <header className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 text-xs font-bold transition cursor-pointer"
          >
            ← Zpět
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            🍳 Kuchyně (KDS)
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-bold">
            <button
              onClick={() => setShowCompleted(false)}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                !showCompleted
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              K vaření ({activeTickets.length})
            </button>
            <button
              onClick={() => setShowCompleted(true)}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                showCompleted
                  ? "bg-slate-800 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Vydáno ({completedTickets.length})
            </button>
          </div>

          <div
            className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse ml-1"
            title="Online synchronizace"
          />
        </div>
      </header>

      {/* ZÁLOŽKA VYDÁNO: Raport */}
      {showCompleted && (
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                📊 Dnešní bilance uvařených jídel
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Vydáno celkem {totalCookedPortions} porcí
              </p>
            </div>

            <button
              onClick={handlePrintKitchenRaport}
              disabled={totalCookedPortions === 0}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-3.5 py-2 text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              🖨️ Vytisknout raport kuchyně
            </button>
          </div>

          {cookedSummary.length > 0 && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {cookedSummary.map(([name, qty]) => (
                <div
                  key={name}
                  className="rounded-xl bg-slate-950 border border-slate-800 p-2.5 flex flex-col justify-between"
                >
                  <span className="text-xs font-bold text-slate-300 truncate">
                    {name}
                  </span>
                  <span className="text-lg font-black text-amber-400 mt-1">
                    {qty} ks
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mřížka bonů */}
      <div className="flex-1 mt-4">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-500 font-bold">
            Načítám objednávky...
          </div>
        ) : displayedTickets.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-center text-slate-500">
            <span className="text-5xl mb-3">{showCompleted ? "📦" : "👨‍🍳"}</span>
            <p className="text-xl font-bold text-slate-400">
              {showCompleted ? "Žádná kompletně vydaná jídla" : "Všechna jídla jsou vydána!"}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              {showCompleted
                ? "Až se stůl kompletně dovaří, přesune se sem."
                : "Jakmile obsluha markne nové jídlo, okamžitě se zde objeví."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayedTickets.map((ticket) => {
              const waitMins = getWaitMinutes(ticket.createdAt);
              const isUrgent = waitMins >= 15 && !showCompleted;
              const isWarning = waitMins >= 10 && !isUrgent && !showCompleted;
              const hasPending = ticket.items.some((i) => i.status !== "DONE");

              return (
                <div
                  key={ticket.orderId}
                  className={`rounded-2xl border flex flex-col justify-between overflow-hidden shadow-lg transition ${
                    showCompleted
                      ? "border-slate-800 bg-slate-900/50 opacity-80"
                      : isUrgent
                      ? "border-red-600 bg-red-950/40"
                      : isWarning
                      ? "border-amber-600 bg-amber-950/30"
                      : "border-slate-800 bg-slate-900"
                  }`}
                >
                  {/* Hlavička */}
                  <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/70">
                    <div>
                      <span className="text-lg font-black text-white block leading-none">
                        {ticket.tableName}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {ticket.section}
                      </span>
                    </div>

                    {!showCompleted ? (
                      <div
                        className={`text-xs font-black px-2 py-1 rounded-lg ${
                          isUrgent
                            ? "bg-red-500 text-white animate-bounce"
                            : isWarning
                            ? "bg-amber-500 text-black"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        ⏱ {waitMins} min
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-emerald-400">
                        ✓ Kompletně vydáno
                      </span>
                    )}
                  </div>

                  {/* Seznam položek s klikací možností vydat jednotlivě */}
                  <div className="p-3 space-y-2 flex-1">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">
                      Klikni na jídlo pro výdej:
                    </p>
                    {ticket.items.map((item) => {
                      const isDone = item.status === "DONE";
                      return (
                        <button
                          key={item.id}
                          onClick={() => toggleItemStatus(item.id, item.status)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition cursor-pointer active:scale-98 ${
                            isDone
                              ? "border-emerald-800/60 bg-emerald-950/30 text-emerald-300"
                              : "border-slate-700 bg-slate-800 hover:border-amber-500 text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-black ${
                                isDone
                                  ? "bg-emerald-500 text-slate-950"
                                  : "border border-slate-500 text-transparent"
                              }`}
                            >
                              ✓
                            </span>
                            <span
                              className={`font-extrabold text-sm ${
                                isDone ? "line-through opacity-60" : ""
                              }`}
                            >
                              {item.name}
                            </span>
                          </div>

                          <span
                            className={`font-black text-xs px-2 py-0.5 rounded ${
                              isDone
                                ? "bg-emerald-900/50 text-emerald-300"
                                : "bg-white text-slate-950"
                            }`}
                          >
                            {item.quantity}×
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Spodní akce */}
                  <div className="p-3 border-t border-slate-800/80 bg-slate-900/40 flex items-center gap-2">
                    <button
                      onClick={() => handlePrint(ticket)}
                      className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-bold text-slate-200 transition active:scale-95 cursor-pointer"
                      title="Vytisknout papírový bon"
                    >
                      🖨️
                    </button>

                    {hasPending ? (
                      <button
                        onClick={() => handleMarkAllOrderDone(ticket)}
                        className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2 text-xs font-black text-white shadow transition active:scale-95 cursor-pointer"
                      >
                        ✓ Vydat celý stůl
                      </button>
                    ) : (
                      <span className="flex-1 text-center text-xs font-bold text-emerald-400 py-2">
                        Všechna jídla vydána
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
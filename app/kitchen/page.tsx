"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type KitchenItem = {
  id: number;
  name: string;
  quantity: number;
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
  const [completedOrderIds, setCompletedOrderIds] = useState<number[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);

  // Načtení vyřízených bonů z paměti prohlížeče
  useEffect(() => {
    try {
      const saved = localStorage.getItem("kitchen_completed_orders");
      if (saved) {
        setCompletedOrderIds(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Chyba při čtení localStorage:", e);
    }
  }, []);

  // Načtení dat z API
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

  // Pravidelný auto-sync každé 3 sekundy + tikání minutky
  useEffect(() => {
    fetchTickets();
    const syncInterval = setInterval(fetchTickets, 3000);
    const clockInterval = setInterval(() => setNow(new Date()), 30000);

    return () => {
      clearInterval(syncInterval);
      clearInterval(clockInterval);
    };
  }, []);

  // Označení bonu jako Hotovo / Vydáno
  const handleMarkDone = (orderId: number) => {
    setCompletedOrderIds((prev) => {
      const updated = [...prev, orderId];
      localStorage.setItem("kitchen_completed_orders", JSON.stringify(updated));
      return updated;
    });
  };

  // Vrácení bonu zpět mezi aktivní
  const handleRestoreOrder = (orderId: number) => {
    setCompletedOrderIds((prev) => {
      const updated = prev.filter((id) => id !== orderId);
      localStorage.setItem("kitchen_completed_orders", JSON.stringify(updated));
      return updated;
    });
  };

  // Vyčištění historie vydaných bonů (nová směna)
  const handleClearCompleted = () => {
    if (
      !window.confirm(
        "Opravdu chceš vyčistit historii vydaných jídel? Udělej to až po vytištění denního raportu na konci směny."
      )
    )
      return;
    setCompletedOrderIds([]);
    localStorage.removeItem("kitchen_completed_orders");
  };

  // Výpočet doby čekání
  const getWaitMinutes = (createdAt: string) => {
    const created = new Date(createdAt);
    const diffMs = now.getTime() - created.getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  // Tisk jednotlivého bonu k jídlu
  const handlePrintSingle = (ticket: KitchenTicket) => {
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
          <span>${item.name}</span>
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

  // Rozdělení na aktivní a hotové
  const activeTickets = tickets.filter(
    (t) => !completedOrderIds.includes(t.orderId)
  );
  const completedTickets = tickets.filter((t) =>
    completedOrderIds.includes(t.orderId)
  );

  // Souhrn uvařených položek pro záložku Vydáno a pro Raport
  const cookedSummaryMap: Record<string, number> = {};
  for (const ticket of completedTickets) {
    for (const item of ticket.items) {
      cookedSummaryMap[item.name] =
        (cookedSummaryMap[item.name] || 0) + item.quantity;
    }
  }

  const cookedSummary = Object.entries(cookedSummaryMap).sort(
    (a, b) => b[1] - a[1]
  );
  const totalCookedPortions = cookedSummary.reduce(
    (acc, [, qty]) => acc + qty,
    0
  );

  // Tisk denního raportu kuchyně
  const handlePrintKitchenRaport = () => {
    const printWindow = window.open("", "_blank", "width=380,height=600");
    if (!printWindow) return;

    const dateStr = now.toLocaleDateString("cs-CZ");
    const timeStr = now.toLocaleTimeString("cs-CZ", {
      hour: "2-digit",
      minute: "2-digit",
    });

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
            <div style="font-size:11px; color:#555; margin-top:3px;">Vyřízeno objednávek: ${completedTickets.length}</div>
          </div>
          <div class="sign">Podpis šéfkuchaře / směny</div>
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
          {/* Přepínač Aktivní vs Vydané */}
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
            title="Živé spojení s placem"
          />
        </div>
      </header>

      {/* ZÁLOŽKA VYDÁNO: Horní statistický souhrn uvařených porcí */}
      {showCompleted && (
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                📊 Denní bilance uvařených jídel
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Celkem vydáno {totalCookedPortions} porcí z {completedTickets.length} objednávek
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintKitchenRaport}
                disabled={completedTickets.length === 0}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-3.5 py-2 text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                🖨️ Vytisknout raport kuchyně
              </button>

              <button
                onClick={handleClearCompleted}
                disabled={completedTickets.length === 0}
                className="rounded-xl border border-red-900/60 bg-red-950/40 hover:bg-red-900/60 text-red-300 px-3 py-2 text-xs font-bold transition cursor-pointer"
              >
                Resetovat směnu
              </button>
            </div>
          </div>

          {/* Mřížka součtů porcí jednotlivých jídel */}
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

      {/* Seznam bonů */}
      <div className="flex-1 mt-4">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-500 font-bold">
            Načítám objednávky...
          </div>
        ) : displayedTickets.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-center text-slate-500">
            <span className="text-5xl mb-3">
              {showCompleted ? "📦" : "👨‍🍳"}
            </span>
            <p className="text-xl font-bold text-slate-400">
              {showCompleted ? "Žádná vydaná jídla" : "Všechna jídla jsou uvařena!"}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              {showCompleted
                ? "Až kuchař označí jídlo jako vydané, uvidíš ho zde v raportu."
                : "Jakmile obsluha markne nové jídlo, okamžitě se zde objeví."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayedTickets.map((ticket) => {
              const waitMins = getWaitMinutes(ticket.createdAt);
              const isUrgent = waitMins >= 15 && !showCompleted;
              const isWarning = waitMins >= 10 && !isUrgent && !showCompleted;

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
                  {/* Hlavička bonu */}
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
                        ✓ Vydáno
                      </span>
                    )}
                  </div>

                  {/* Seznam jídel */}
                  <div className="p-4 space-y-2.5 flex-1">
                    {ticket.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="font-extrabold text-white text-base leading-snug">
                          {item.name}
                        </span>
                        <span className="shrink-0 bg-white text-slate-950 font-black text-sm px-2 py-0.5 rounded-md">
                          {item.quantity}×
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Spodní akční tlačítka */}
                  <div className="p-3 border-t border-slate-800/80 bg-slate-900/40 flex items-center gap-2">
                    <button
                      onClick={() => handlePrintSingle(ticket)}
                      className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-2.5 text-xs font-bold text-slate-200 transition active:scale-95 cursor-pointer"
                      title="Vytisknout papírový bon"
                    >
                      🖨️ Bon
                    </button>

                    {!showCompleted ? (
                      <button
                        onClick={() => handleMarkDone(ticket.orderId)}
                        className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-sm font-black text-white shadow transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        ✓ Hotovo / Vydáno
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRestoreOrder(ticket.orderId)}
                        className="flex-1 rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-bold text-slate-300 transition cursor-pointer"
                      >
                        ↩ Vrátit k vaření
                      </button>
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
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type KitchenItem = {
  id: number;
  name: string;
  quantity: number;
  status: string;
  note?: string | null;
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
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Ukládáme si předchozí ID bonů pro detekci nové objednávky
  const prevTicketIdsRef = useRef<Set<number>>(new Set());

 // Indikátor prvního načtení stránky a evidence ID čekajících jídel
  const isInitialLoadRef = useRef(true);
  const prevPendingItemIdsRef = useRef<Set<number>>(new Set());

  // Výrazný a hlasitý hotelový zvonek do kuchyně (Ding-Dong s dlouhým dozvukem)
  const playKitchenBell = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      // Pokud byl kontext prohlížečem pozastaven, obnovíme ho
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const nowTime = ctx.currentTime;

      // 1. TÓN: "DING" (Vysoký čistý tón - 987 Hz / H5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(987.77, nowTime);

      // Hlasitý náběh a pozvolný dozvuk (0.75 s)
      gain1.gain.setValueAtTime(0.85, nowTime);
      gain1.gain.exponentialRampToValueAtTime(0.0001, nowTime + 0.75);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(nowTime);
      osc1.stop(nowTime + 0.75);

      // 2. TÓN: "DONG" (Hlubší rezonující zvon - 659 Hz / E5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(659.25, nowTime + 0.28);

      // Dlouhý dozvuk přes 1.5 sekundy
      gain2.gain.setValueAtTime(0.85, nowTime + 0.28);
      gain2.gain.exponentialRampToValueAtTime(0.0001, nowTime + 1.8);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(nowTime + 0.28);
      osc2.stop(nowTime + 1.8);
    } catch (e) {
      console.warn("Přehrání zvuku selhalo:", e);
    }
  };

  // Načtení objednávek + okamžité zazvonění při novém jídle
  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/kitchen", { cache: "no-store" });
      if (res.ok) {
        const data: KitchenTicket[] = await res.json();

        // Posbíráme ID všech jídel, která ještě čekají na uvaření
        const currentPendingIds = new Set<number>();
        data.forEach((ticket) => {
          ticket.items.forEach((item) => {
            if (item.status !== "DONE") {
              currentPendingIds.add(item.id);
            }
          });
        });

        // Při prvním otevření stránky jen uložíme stávající stav
        if (isInitialLoadRef.current) {
          isInitialLoadRef.current = false;
          prevPendingItemIdsRef.current = currentPendingIds;
        } else {
          // Zazvoní, jakmile přibyde jakékoliv nové nevydané jídlo (i úplně první!)
          const hasNewPendingItem = Array.from(currentPendingIds).some(
            (id) => !prevPendingItemIdsRef.current.has(id)
          );

          if (hasNewPendingItem) {
            playKitchenBell();
          }

          prevPendingItemIdsRef.current = currentPendingIds;
        }

        setTickets(data);
      }
    } catch (err) {
      console.error("Chyba načítání bonů v kuchyni:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleItemStatus = async (itemId: number, currentStatus: string) => {
    const nextStatus = currentStatus === "DONE" ? "PENDING" : "DONE";

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
      fetchTickets();
    }
  };

  const handleMarkAllOrderDone = async (ticket: KitchenTicket) => {
    const pendingItems = ticket.items.filter((i) => i.status !== "DONE");

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
      fetchTickets();
    }
  };

  const getWaitMinutes = (createdAt: string) => {
    const created = new Date(createdAt);
    const diffMs = now.getTime() - created.getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  };

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
        <div style="margin-bottom:8px; border-bottom:1px dashed #ddd; padding-bottom:4px;">
          <div style="display:flex; justify-content:space-between; font-size:16px; font-weight:bold;">
            <span style="${item.status === "DONE" ? "text-decoration: line-through; opacity: 0.5;" : ""}">${item.name}</span>
            <span style="background:#000; color:#fff; padding:1px 6px; border-radius:4px;">${item.quantity}×</span>
          </div>
          ${
            item.note
              ? `<div style="font-size:13px; font-weight:900; color:#b45309; margin-top:2px; padding-left:4px;">↳ POZN: ${item.note}</div>`
              : ""
          }
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

  const activeTickets = tickets.filter((t) =>
    t.items.some((i) => i.status !== "DONE")
  );
  const completedTickets = tickets.filter((t) =>
    t.items.every((i) => i.status === "DONE")
  );

  const displayedTickets = showCompleted ? completedTickets : activeTickets;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none p-4">
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

        <div className="flex items-center gap-2">
          {/* Tlačítko pro otestování / povolení zvuku */}
          <button
            onClick={() => {
              playKitchenBell();
              setAudioEnabled(true);
            }}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              audioEnabled
                ? "bg-emerald-950 border border-emerald-700 text-emerald-300"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300"
            }`}
            title="Klikni pro vyzkoušení zvuku a povolení automatického přehrávání v prohlížeči"
          >
            🔔 Zvuk {audioEnabled ? "aktivní" : "zapnout"}
          </button>

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
                  <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/70">
                    <div>
                      <span className="text-lg font-black text-white block leading-none">
                        {ticket.tableName}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {ticket.section}
                      </span>
                    </div>

                    {!showCompleted && (
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
                    )}
                  </div>

                  <div className="p-3 space-y-2 flex-1">
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
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-black shrink-0 ${
                                isDone
                                  ? "bg-emerald-500 text-slate-950"
                                  : "border border-slate-500 text-transparent"
                              }`}
                            >
                              ✓
                            </span>
                            <div className="flex flex-col min-w-0">
                              <span
                                className={`font-extrabold text-sm truncate ${
                                  isDone ? "line-through opacity-60" : ""
                                }`}
                              >
                                {item.name}
                              </span>
                              {item.note && (
                                <span className="text-xs font-bold text-amber-400 italic">
                                  ↳ {item.note}
                                </span>
                              )}
                            </div>
                          </div>

                          <span
                            className={`font-black text-xs px-2 py-0.5 rounded shrink-0 ml-2 ${
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

                  <div className="p-3 border-t border-slate-800/80 bg-slate-900/40 flex items-center gap-2">
                    <button
                      onClick={() => handlePrint(ticket)}
                      className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-bold text-slate-200 transition active:scale-95 cursor-pointer"
                      title="Vytisknout papírový bon"
                    >
                      🖨️
                    </button>

                    {hasPending && (
                      <button
                        onClick={() => handleMarkAllOrderDone(ticket)}
                        className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2 text-xs font-black text-white shadow transition active:scale-95 cursor-pointer"
                      >
                        ✓ Vydat celý stůl
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
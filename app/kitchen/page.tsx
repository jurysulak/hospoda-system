"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const isInitialLoadRef = useRef(true);
  const prevPendingItemIdsRef = useRef<Set<number>>(new Set());
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Inicializace a odemčení AudioContextu dotykem
  const unlockAudio = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          audioCtxRef.current = new AudioCtx();
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
      setAudioUnlocked(true);
    } catch (e) {
      console.warn("AudioContext error:", e);
    }
  }, []);

  // Hlasitý hotelový gong (Ding-Dong)
  const playKitchenBell = useCallback(() => {
    try {
      unlockAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      const t = ctx.currentTime;

      // 1. DING (vysoký tón)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(987.77, t);
      gain1.gain.setValueAtTime(0.9, t);
      gain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.8);

      // 2. DONG (hlubší tón s dlouhým dozvukem)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(659.25, t + 0.28);
      gain2.gain.setValueAtTime(0.9, t + 0.28);
      gain2.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(t + 0.28);
      osc2.stop(t + 1.8);
    } catch (e) {
      console.warn("Chyba při přehrání gongu:", e);
    }
  }, [unlockAudio]);

  // Pravidelné načítání ticketů (polling každé 3s)
  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch("/api/kitchen", {
        cache: "no-store",
        headers: { Pragma: "no-cache", "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const data: KitchenTicket[] = await res.json();

        const currentPendingIds = new Set<number>();
        data.forEach((ticket) => {
          ticket.items.forEach((item) => {
            if (item.status !== "DONE") {
              currentPendingIds.add(item.id);
            }
          });
        });

        if (isInitialLoadRef.current) {
          isInitialLoadRef.current = false;
          prevPendingItemIdsRef.current = currentPendingIds;
        } else {
          // Detekce nově přidaného jídla do kuchyně
          const hasNew = Array.from(currentPendingIds).some(
            (id) => !prevPendingItemIdsRef.current.has(id)
          );
          if (hasNew) {
            playKitchenBell();
          }
          prevPendingItemIdsRef.current = currentPendingIds;
        }

        setTickets(data);
      }
    } catch (err) {
      console.error("Chyba načítání dat v kuchyni:", err);
    } finally {
      setLoading(false);
    }
  }, [playKitchenBell]);

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 3000);
    const clock = setInterval(() => setNow(new Date()), 30000);

    const handleGlobalTouch = () => unlockAudio();
    window.addEventListener("click", handleGlobalTouch, { once: true });
    window.addEventListener("touchstart", handleGlobalTouch, { once: true });

    return () => {
      clearInterval(interval);
      clearInterval(clock);
      window.removeEventListener("click", handleGlobalTouch);
      window.removeEventListener("touchstart", handleGlobalTouch);
    };
  }, [fetchTickets, unlockAudio]);

  const toggleItemStatus = async (itemId: number, currentStatus: string) => {
    unlockAudio();
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
    unlockAudio();
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

  const activeTickets = tickets.filter((t) =>
    t.items.some((i) => i.status !== "DONE")
  );
  const completedTickets = tickets.filter((t) =>
    t.items.every((i) => i.status === "DONE")
  );

  const displayedTickets = showCompleted ? completedTickets : activeTickets;

  return (
    <main
      onClick={unlockAudio}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none p-4"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 text-xs font-bold transition cursor-pointer"
          >
            ← Zpět
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            👨‍🍳 Kuchyně (KDS)
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Tlačítko zvuku */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              playKitchenBell();
            }}
            className={`rounded-xl px-3.5 py-2 text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-xs ${
              audioUnlocked
                ? "bg-emerald-950 border border-emerald-600 text-emerald-300"
                : "bg-amber-500 hover:bg-amber-400 text-slate-950 animate-pulse"
            }`}
          >
            🔔 {audioUnlocked ? "Zvuk aktivní (Otestovat)" : "Zapnout zvuk"}
          </button>

          <Link
            href="/kitchen/history"
            className="rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 text-xs font-bold transition flex items-center gap-1.5"
          >
            📅 Záznamy jídel
          </Link>

          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-bold">
            <button
              type="button"
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
              type="button"
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
            title="Online synchronizace (každé 3s)"
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
                  className={`rounded-2xl border flex flex-col justify-between overflow-hidden transition-all shadow-md ${
                    isUrgent
                      ? "bg-red-950/40 border-red-500/80 ring-2 ring-red-500/50"
                      : isWarning
                      ? "bg-amber-950/40 border-amber-500/80"
                      : "bg-slate-900 border-slate-800"
                  }`}
                >
                  <div className="p-4 border-b border-slate-800/80 flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        {ticket.section || "Místnost"}
                      </span>
                      <h2 className="text-xl font-black text-white leading-tight">
                        {ticket.tableName}
                      </h2>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-black ${
                          isUrgent
                            ? "bg-red-500 text-white animate-pulse"
                            : isWarning
                            ? "bg-amber-500 text-slate-950"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        ⏱ {waitMins} min
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-1">
                        {new Date(ticket.createdAt).toLocaleTimeString("cs-CZ", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Seznam jídel na lístku */}
                  <div className="p-4 space-y-2.5 flex-1">
                    {ticket.items.map((item) => {
                      const isDone = item.status === "DONE";
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleItemStatus(item.id, item.status)}
                          className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between select-none ${
                            isDone
                              ? "bg-slate-900/50 border-slate-800/50 opacity-40 line-through"
                              : "bg-slate-800/80 border-slate-700 hover:border-amber-400"
                          }`}
                        >
                          <div className="flex-1 pr-2">
                            <span className="font-extrabold text-base text-white block leading-snug">
                              {item.name}
                            </span>
                            {item.note && (
                              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 inline-block mt-1">
                                ↳ {item.note}
                              </span>
                            )}
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded-lg text-sm font-black ${
                              isDone
                                ? "bg-slate-800 text-slate-500"
                                : "bg-amber-500 text-slate-950"
                            }`}
                          >
                            {item.quantity}×
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Akce dole na kartě */}
                  <div className="p-3 bg-slate-900/90 border-t border-slate-800/80">
                    {hasPending ? (
                      <button
                        type="button"
                        onClick={() => handleMarkAllOrderDone(ticket)}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        ✓ Vydat celou objednávku
                      </button>
                    ) : (
                      <div className="text-center text-xs font-bold text-emerald-400 py-1">
                        ✓ Všechna jídla uvařena
                      </div>
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
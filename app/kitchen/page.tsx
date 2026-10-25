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

  // Pravidelný tichý auto-sync každé 3 sekundy + tikání hodin každou minutu
  useEffect(() => {
    fetchTickets();
    const syncInterval = setInterval(fetchTickets, 3000);
    const clockInterval = setInterval(() => setNow(new Date()), 30000);

    return () => {
      clearInterval(syncInterval);
      clearInterval(clockInterval);
    };
  }, []);

  // Výpočet doby čekání
  const getWaitMinutes = (createdAt: string) => {
    const created = new Date(createdAt);
    const diffMs = now.getTime() - created.getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  // Rychlý tisk jednoho bonu
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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none p-4">
      {/* Horní ovládací lišta KDS */}
      <header className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 text-xs font-bold transition"
          >
            ← Zpět
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            🍳 Kuchyně (KDS)
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-xs font-bold text-slate-400">
            Aktivní bony:{" "}
            <span className="text-emerald-400 text-base font-black">
              {tickets.length}
            </span>
          </div>
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" title="Živé spojení" />
        </div>
      </header>

      {/* Mřížka objednávek k výdeji */}
      <div className="flex-1 mt-4">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-500 font-bold">
            Načítám objednávky...
          </div>
        ) : tickets.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-center text-slate-500">
            <span className="text-5xl mb-3">👨‍🍳</span>
            <p className="text-xl font-bold text-slate-400">Žádné objednávky k vaření</p>
            <p className="text-xs text-slate-600 mt-1">
              Jakmile obsluha markne jídlo, okamžitě se zde objeví.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {tickets.map((ticket) => {
              const waitMins = getWaitMinutes(ticket.createdAt);
              const isUrgent = waitMins >= 15;
              const isWarning = waitMins >= 10 && !isUrgent;

              return (
                <div
                  key={ticket.orderId}
                  className={`rounded-2xl border flex flex-col justify-between overflow-hidden shadow-lg transition ${
                    isUrgent
                      ? "border-red-600 bg-red-950/40"
                      : isWarning
                      ? "border-amber-600 bg-amber-950/30"
                      : "border-slate-800 bg-slate-900"
                  }`}
                >
                  {/* Hlavička bonu */}
                  <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
                    <div>
                      <span className="text-lg font-black text-white block leading-none">
                        {ticket.tableName}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {ticket.section}
                      </span>
                    </div>

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

                  {/* Akce pod lístkem */}
                  <div className="p-3 border-t border-slate-800/80 bg-slate-900/40 flex items-center gap-2">
                    <button
                      onClick={() => handlePrint(ticket)}
                      className="flex-1 rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-bold text-slate-200 transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      🖨️ Bon
                    </button>
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
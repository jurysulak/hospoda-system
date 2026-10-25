"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type PaymentRecord = {
  id: number;
  amount: number;
  paymentMethod: string;
  createdAt: string;
  order: {
    id: number;
    table: {
      id: number;
      name: string;
      section: string;
    } | null;
    items: {
      id: number;
      productName: string;
      quantity: number;
      unitPrice: number;
    }[];
  } | null;
};

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefunding, setIsRefunding] = useState<number | null>(null);

  // Načtení historie plateb
  const loadPayments = async () => {
    try {
      const res = await fetch("/api/payments", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setPayments(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Chyba načítání plateb:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  // Provedení storna
  const handleRefund = async (payment: PaymentRecord) => {
    const tableName = payment.order?.table?.name || "Neznámý stůl";
    if (
      !window.confirm(
        `Opravdu chceš STORNOVAT platbu ${payment.amount} Kč (${tableName})?\n\nStůl bude znovu otevřen pro úpravu účtu.`
      )
    ) {
      return;
    }

    try {
      setIsRefunding(payment.id);
      const res = await fetch(`/api/payments/${payment.id}/refund`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        alert("Platba byla úspěšně stornována a stůl je znovu otevřen.");
        if (data.tableId) {
          router.push(`/tables/${data.tableId}`);
        } else {
          await loadPayments();
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || `Chyba serveru (${res.status})`);
      }
    } catch (e: any) {
      alert(`Chyba sítě/spojení se serverem: ${e.message || e}`);
    } finally {
      setIsRefunding(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6 select-none">
      <div className="mx-auto max-w-5xl space-y-5">
        
        {/* Horní hlavička bez tržeb */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition"
            >
              ← Zpět
            </Link>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Historie plateb a storno
            </h1>
          </div>
          <span className="text-xs font-bold text-slate-500">
            Zobrazeno {payments.length} posledních plateb
          </span>
        </div>

        {/* Tabulka plateb */}
        <div className="rounded-3xl bg-white shadow-xs border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400 font-bold text-sm">
              Načítám platby...
            </div>
          ) : payments.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <span className="text-4xl block mb-2">🧾</span>
              <p className="font-bold">Zatím nebyly provedeny žádné platby.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Čas</th>
                    <th className="px-5 py-3.5">Stůl / Prostor</th>
                    <th className="px-5 py-3.5">Způsob</th>
                    <th className="px-5 py-3.5">Částka</th>
                    <th className="px-5 py-3.5 text-right">Akce</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => {
                    const time = new Date(p.createdAt).toLocaleTimeString("cs-CZ", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const date = new Date(p.createdAt).toLocaleDateString("cs-CZ");

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-5 py-3.5">
                          <span className="font-bold text-slate-900 block">{time}</span>
                          <span className="text-[11px] text-slate-400">{date}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-bold text-slate-900 block">
                            {p.order?.table?.name || "Stůl"}
                          </span>
                          <span className="text-xs text-slate-500">
                            {p.order?.table?.section || "Vnitřek"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black ${
                              p.paymentMethod === "CARD"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {p.paymentMethod === "CARD" ? "💳 Kartou" : "💵 Hotově"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-black text-base text-slate-900">
                          {p.amount} Kč
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => handleRefund(p)}
                            disabled={isRefunding === p.id}
                            className="rounded-xl border border-red-300 bg-red-50 hover:bg-red-100 px-3 py-1.5 text-xs font-black text-red-700 transition active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            {isRefunding === p.id ? "Stornuji..." : "⚠️ Stornovat"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
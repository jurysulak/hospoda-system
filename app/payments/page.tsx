"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { printReceiptViaRawBT } from "@/lib/printReceipt";
import EetStatusBanner from "./EetStatusBanner";

type PaymentRecord = {
  id: number;
  amount: number;
  paymentMethod: string;
  createdAt: string;
  receiptNumber?: string | null;
  cancelledAt?: string | null;
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

  // Storno – PIN se zadává na dotykové klávesnici (stejně jako u Přehledu tržeb)
  const [stornoTarget, setStornoTarget] = useState<PaymentRecord | null>(null);
  const [stornoPin, setStornoPin] = useState("");
  const [stornoError, setStornoError] = useState("");
  const MAX_PIN_LENGTH = 8;

  const handleRefund = (payment: PaymentRecord) => {
    setStornoTarget(payment);
    setStornoPin("");
    setStornoError("");
  };

  const closeStorno = () => {
    setStornoTarget(null);
    setStornoPin("");
    setStornoError("");
  };

  const pressStornoDigit = (digit: string) => {
    setStornoError("");
    setStornoPin((prev) => (prev.length < MAX_PIN_LENGTH ? prev + digit : prev));
  };

  const confirmStorno = async () => {
    const payment = stornoTarget;
    if (!payment || stornoPin.length === 0 || isRefunding !== null) return;

    try {
      setIsRefunding(payment.id);
      const res = await fetch(`/api/payments/${payment.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: stornoPin }),
      });

      if (res.ok) {
        const data = await res.json();
        closeStorno();
        if (data.tableId) {
          router.push(`/tables/${data.tableId}`);
        } else {
          await loadPayments();
        }
      } else {
        const err = await res.json().catch(() => ({}));
        if (res.status === 403) {
          // Špatný kód – nechat okno otevřené a zkusit znovu
          setStornoError(err.error || "Nesprávný kód storna");
          setStornoPin("");
        } else {
          closeStorno();
          alert(err.error || `Chyba serveru (${res.status})`);
          await loadPayments();
        }
      }
    } catch (e: any) {
      setStornoError(`Chyba spojení se serverem: ${e.message || e}`);
    } finally {
      setIsRefunding(null);
    }
  };

  // Vytištění kopie účtenky
  const handlePrintCopy = (payment: PaymentRecord) => {
    const tableName = payment.order?.table?.name || "Účet";
    const items =
      payment.order?.items?.map((i) => ({
        name: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })) || [];

    printReceiptViaRawBT({
      receiptNumber: payment.receiptNumber || payment.id,
      tableName,
      items,
      totalAmount: payment.amount,
      paymentMethod: payment.paymentMethod?.toUpperCase() === "CARD" ? "CARD" : "CASH",
      isDuplicate: true,
      paymentDate: new Date(payment.createdAt),
    });
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6 select-none">
      <div className="mx-auto max-w-5xl space-y-5">
        {/* Horní hlavička */}
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

        <EetStatusBanner />

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
                    const isCancelled = Boolean(p.cancelledAt);

                    return (
                      <tr
                        key={p.id}
                        className={`transition ${
                          isCancelled
                            ? "bg-red-50/40 text-slate-400 line-through decoration-red-500/70 decoration-2"
                            : "hover:bg-slate-50/60"
                        }`}
                      >
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
                          <div className="flex items-center justify-end gap-2">
                            {/* Tlačítko pro tisk kopie */}
                            <button
                              type="button"
                              onClick={() => handlePrintCopy(p)}
                              className="rounded-xl border border-slate-300 bg-white hover:bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 transition active:scale-95 cursor-pointer shadow-2xs flex items-center gap-1"
                              title="Vytisknout kopii účtenky"
                            >
                              <span>🖨️</span>
                              <span>Kopie</span>
                            </button>

                            {isCancelled ? (
                              <span
                                className="inline-block no-underline rounded-xl bg-red-600 px-3 py-1.5 text-xs font-black text-white"
                                style={{ textDecoration: "none" }}
                                title={`Stornováno ${new Date(p.cancelledAt as string).toLocaleString("cs-CZ")}`}
                              >
                                STORNO
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRefund(p)}
                                disabled={isRefunding === p.id}
                                className="rounded-xl border border-red-300 bg-red-50 hover:bg-red-100 px-3 py-1.5 text-xs font-black text-red-700 transition active:scale-95 cursor-pointer disabled:opacity-50"
                              >
                                {isRefunding === p.id ? "Stornuji..." : "⚠️ Stornovat"}
                              </button>
                            )}
                          </div>
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

      {/* Okno pro zadání kódu storna */}
      {stornoTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4"
          onClick={() => isRefunding === null && closeStorno()}
        >
          <div
            className="w-full max-w-xs rounded-3xl bg-slate-800 p-6 shadow-2xl border border-slate-700 text-center space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="w-14 h-14 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3">
                🔒
              </div>
              <h2 className="text-xl font-black text-white">Storno platby</h2>
              <p className="text-sm font-bold text-slate-200 mt-1">
                {stornoTarget.amount} Kč · {stornoTarget.order?.table?.name || "Neznámý stůl"}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Položky se vrátí na stůl. Zadej kód storna.
              </p>
            </div>

            {/* Tečky za zadané číslice */}
            <div className="flex justify-center gap-3 min-h-4">
              {Array.from({ length: Math.max(4, stornoPin.length) }).map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-all duration-200 ${
                    stornoError
                      ? "bg-red-500 scale-110"
                      : stornoPin.length > i
                        ? "bg-amber-400 scale-110"
                        : "bg-slate-700"
                  }`}
                />
              ))}
            </div>

            {stornoError && (
              <p className="text-red-400 text-xs font-bold -mt-2">{stornoError}</p>
            )}

            <div className="grid grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => pressStornoDigit(num)}
                  disabled={isRefunding !== null}
                  className="h-16 rounded-2xl bg-slate-700/80 hover:bg-slate-600 active:scale-95 text-2xl font-black text-white shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {num}
                </button>
              ))}

              <button
                type="button"
                onClick={closeStorno}
                disabled={isRefunding !== null}
                className="h-16 rounded-2xl bg-slate-700/40 hover:bg-slate-700 active:scale-95 text-xs font-bold text-slate-400 flex items-center justify-center transition cursor-pointer disabled:opacity-50"
              >
                Zrušit
              </button>

              <button
                type="button"
                onClick={() => pressStornoDigit("0")}
                disabled={isRefunding !== null}
                className="h-16 rounded-2xl bg-slate-700/80 hover:bg-slate-600 active:scale-95 text-2xl font-black text-white shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                0
              </button>

              <button
                type="button"
                onClick={() => {
                  setStornoPin((prev) => prev.slice(0, -1));
                  setStornoError("");
                }}
                disabled={isRefunding !== null}
                className="h-16 rounded-2xl bg-red-950/40 hover:bg-red-900/60 active:scale-95 text-lg font-black text-red-400 flex items-center justify-center transition cursor-pointer disabled:opacity-50"
              >
                ⌫
              </button>
            </div>

            <button
              type="button"
              onClick={confirmStorno}
              disabled={stornoPin.length === 0 || isRefunding !== null}
              className="w-full h-14 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-95 text-base font-black text-white transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isRefunding !== null ? "Stornuji..." : "⚠️ Stornovat"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
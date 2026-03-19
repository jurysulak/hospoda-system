"use client";

import { useEffect, useMemo, useState } from "react";

type PaymentItem = {
  id: number;
  amount: number;
  paymentMethod: string | null;
  createdAt: string;
  tableName: string;
  tableId: number;
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [selectedDate, setSelectedDate] = useState("");

  async function loadPayments() {
    const res = await fetch("/api/payments", {
      cache: "no-store",
    });

    const data = await res.json();
    setPayments(data);
  }

  useEffect(() => {
    loadPayments();
  }, []);

  const filteredPayments = useMemo(() => {
    if (!selectedDate) return payments;

    return payments.filter((payment) => {
      const date = new Date(payment.createdAt);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const localDate = `${year}-${month}-${day}`;

      return localDate === selectedDate;
    });
  }, [payments, selectedDate]);

  const total = filteredPayments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );


  return (
    <main className="min-h-screen bg-slate-200 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <a
          href="/"
          className="inline-flex rounded-2xl bg-white px-4 py-3 text-base font-medium shadow-sm"
        >
          ← Zpět na přehled
        </a>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-4xl font-bold">Historie plateb</h1>
          <p className="mt-2 text-lg text-slate-600">
            Přehled zaplacených účtů
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-2xl font-bold">Filtr podle dne</h2>

          <a
            href="/payments/days"
            className="inline-flex rounded-2xl bg-slate-900 px-5 py-4 text-lg font-semibold text-white shadow-sm"
          >
            Tržby po dnech
          </a>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-2xl border p-4 text-lg"
            />

            <button
              onClick={() => setSelectedDate("")}
              className="rounded-2xl bg-slate-700 px-5 py-4 text-lg font-semibold text-white"
            >
              Zrušit filtr
            </button>
          </div>
        </div>

        <div className="rounded-3xl bg-green-100 p-6 text-2xl font-bold">
          Celkem zaplaceno: {total} Kč
        </div>



        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="space-y-4">
            {filteredPayments.map((payment) => {
              const date = new Date(payment.createdAt);

              return (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-2xl border p-4"
                >
                  <div>
                    <div className="text-xl font-semibold">
                      {payment.tableName}
                    </div>

                    <div className="text-sm text-slate-500">
                      {date.toLocaleString("cs-CZ")}
                    </div>
                  </div>

                  <div className="text-2xl font-bold">
                    {payment.amount} Kč
                  </div>
                </div>
              );
            })}

            {filteredPayments.length === 0 && (
              <div className="rounded-2xl border border-dashed p-6 text-center text-slate-500">
                Pro vybraný den nejsou žádné platby.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
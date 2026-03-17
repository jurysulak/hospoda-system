export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";

export default async function SummaryPage() {
  const now = new Date();

  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );

  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  );

  const payments = await prisma.payment.findMany({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      order: {
        include: {
          table: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const paymentCount = payments.length;

  const byTableMap: Record<string, number> = {};

  for (const payment of payments) {
    const tableName = payment.order.table.name;
    byTableMap[tableName] = (byTableMap[tableName] || 0) + payment.amount;
  }

  const byTable = Object.entries(byTableMap).map(([tableName, amount]) => ({
    tableName,
    amount,
  }));

  return (
    <main className="min-h-screen bg-slate-200 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <a
          href="/"
          className="inline-flex rounded-2xl bg-white px-4 py-3 text-base font-medium shadow-sm"
        >
          ← Zpět na přehled
        </a>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-4xl font-bold">Denní souhrn</h1>
          <p className="mt-2 text-lg text-slate-600">
            Přehled dnešních plateb
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl bg-green-100 p-6 shadow-sm">
            <div className="text-lg text-slate-700">Dnes zaplaceno</div>
            <div className="mt-2 text-4xl font-bold">
              {totalAmount} Kč
            </div>
          </div>

          <div className="rounded-3xl bg-blue-100 p-6 shadow-sm">
            <div className="text-lg text-slate-700">Počet plateb</div>
            <div className="mt-2 text-4xl font-bold">
              {paymentCount}
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-2xl font-bold">Podle stolů</h2>

            <div className="space-y-3">
              {byTable.map((row) => (
                <div
                  key={row.tableName}
                  className="flex items-center justify-between rounded-2xl border p-4"
                >
                  <div className="text-xl font-semibold">{row.tableName}</div>
                  <div className="text-2xl font-bold">{row.amount} Kč</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-2xl font-bold">Poslední platby</h2>

            <div className="space-y-3">
              {payments.map((payment) => {
                const date = new Date(payment.createdAt);

                return (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-2xl border p-4"
                  >
                    <div>
                      <div className="text-xl font-semibold">
                        {payment.order.table.name}
                      </div>
                      <div className="text-sm text-slate-500">
                        {date.toLocaleTimeString()}
                      </div>
                    </div>

                    <div className="text-2xl font-bold">
                      {payment.amount} Kč
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
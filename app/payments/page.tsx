import { prisma } from "@/lib/prisma";

export default async function PaymentsPage() {
  const payments = await prisma.payment.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      order: {
        include: {
          table: true,
        },
      },
    },
  });

  const total = payments.reduce((sum, payment) => sum + payment.amount, 0);

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

        <div className="rounded-3xl bg-green-100 p-6 text-2xl font-bold">
          Celkem zaplaceno: {total} Kč
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="space-y-4">
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
    </main>
  );
}
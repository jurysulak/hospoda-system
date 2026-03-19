import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PaymentsByDaysPage() {
  const payments = await prisma.payment.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  const grouped: Record<string, number> = {};

  for (const payment of payments) {
    const date = new Date(payment.createdAt);
    const key = date.toLocaleDateString("cs-CZ");
    grouped[key] = (grouped[key] || 0) + payment.amount;
  }

  const totalsByDay = Object.entries(grouped)
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => {
      const parseDate = (value: string) => {
        const parts = value.split(".").map((v) => v.trim()).filter(Boolean);
        const [day, month, year] = parts;
        return new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
      };

      return parseDate(b.date).getTime() - parseDate(a.date).getTime();
    });

  return (
    <main className="min-h-screen bg-slate-200 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <a
          href="/payments"
          className="inline-flex rounded-2xl bg-white px-4 py-3 text-base font-medium shadow-sm"
        >
          ← Zpět na historii plateb
        </a>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-4xl font-bold">Tržby po jednotlivých dnech</h1>
          <p className="mt-2 text-lg text-slate-600">
            Přehled celkových tržeb za každý den
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm space-y-3">
          {totalsByDay.map((row) => (
            <div
              key={row.date}
              className="flex items-center justify-between rounded-2xl border p-4"
            >
              <div className="text-xl font-semibold">{row.date}</div>
              <div className="text-2xl font-bold">{row.total} Kč</div>
            </div>
          ))}

          {totalsByDay.length === 0 && (
            <div className="rounded-2xl border border-dashed p-6 text-center text-slate-500">
              Zatím nejsou žádné tržby.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
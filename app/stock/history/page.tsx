import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StockHistoryPage() {
  const history = await prisma.stockMovement.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      stockItem: true,
    },
  });

  return (
    <main className="min-h-screen bg-slate-200 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <a
          href="/stock"
          className="inline-flex rounded-2xl bg-white px-4 py-3 text-base font-medium shadow-sm"
        >
          ← Zpět na sklad
        </a>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-4xl font-bold">Historie skladu</h1>
          <p className="mt-2 text-lg text-slate-600">
            Přehled příjmů a výdejů
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm space-y-3">
          {history.map((move) => {
            const isIn = move.type === "IN";
            const date = new Date(move.createdAt);

            return (
              <div
                key={move.id}
                className={`flex items-center justify-between rounded-2xl border p-4 ${
                  isIn
                    ? "border-green-200 bg-green-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <div>
                  <div className="text-xl font-semibold">
                    {move.stockItem.name}
                  </div>
                  <div className="text-sm text-slate-500">
                    {date.toLocaleDateString()} {date.toLocaleTimeString()}
                  </div>
                </div>

                <div
                  className={`text-xl font-bold ${
                    isIn ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {isIn ? "+" : "-"} {move.quantity} {move.stockItem.unit}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
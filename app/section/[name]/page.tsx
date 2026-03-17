import { prisma } from "@/lib/prisma";

export default async function SectionPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;

  const tables = await prisma.table.findMany({
    orderBy: { id: "asc" },
    include: {
      orders: {
        where: { status: "open" },
        include: {
          items: true,
        },
      },
    },
  });

  const mappedTables = tables.map((table) => {
    const openOrder = table.orders[0];
    const items = openOrder?.items ?? [];

    const total = items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      id: table.id,
      name: table.name,
      section: table.section,
      status: itemCount > 0 ? "occupied" : "free",
      total,
      itemCount,
    };
  });

  const sectionLabel = name === "vnitrek" ? "Vnitřek" : "Zahrádka";

  const filteredTables = mappedTables.filter((table) => {
    if (name === "vnitrek") return table.section === "Vnitřek";
    if (name === "zahradka") return table.section === "Zahrádka";
    return false;
  });

  return (
    <main className="min-h-screen bg-slate-200 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <a
            href="/"
            className="rounded-2xl bg-white px-5 py-4 text-lg font-semibold shadow-sm"
          >
            ← Zpět
          </a>

          <div className="rounded-2xl bg-white px-5 py-4 text-lg font-semibold shadow-sm">
            Celkem stolů: {filteredTables.length}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-4xl font-bold">{sectionLabel}</h1>
          <p className="mt-2 text-lg text-slate-600">Vyber stůl</p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {filteredTables.map((table) => {
            const isFree = table.status === "free";

            return (
              <a
                key={table.id}
                href={`/tables/${table.id}`}
                className={`rounded-3xl border-2 p-5 shadow-sm transition active:scale-[0.99] ${
                  isFree
                    ? "border-green-400 bg-green-100"
                    : "border-red-400 bg-red-100"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-2xl font-bold">{table.name}</div>
                    <div
                      className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                        isFree
                          ? "bg-green-200 text-green-900"
                          : "bg-red-200 text-red-900"
                      }`}
                    >
                      {isFree ? "Volný" : "Obsazený"}
                    </div>
                  </div>

                  <div className="text-3xl">{isFree ? "🟢" : "🔴"}</div>
                </div>

                <div className="mt-6 space-y-2 text-base">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">Položek</span>
                    <span className="font-bold">{table.itemCount}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">Účet</span>
                    <span className="text-xl font-bold">{table.total} Kč</span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </main>
  );
}
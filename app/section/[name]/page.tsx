export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import RoomMap from "@/app/components/RoomMap";

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

  const sectionLabel =
    name === "vnitrek"
      ? "Vnitřek"
      : name === "zahradka"
      ? "Zahrádka"
      : "Salónek";

  const filteredTables = tables
    .filter((table: any) => {
      if (name === "vnitrek") return table.section === "Vnitřek";
      if (name === "zahradka") return table.section === "Zahrádka";
      if (name === "salonek") return table.section === "Salónek";
      return false;
    })
    .map((table: any) => {
      const openOrder = table.orders?.[0];
      const items = openOrder?.items ?? [];

      const total = items.reduce(
        (sum: number, item: any) => sum + item.unitPrice * item.quantity,
        0
      );
      const itemCount = items.reduce((sum: number, item: any) => sum + item.quantity, 0);

      return {
        id: table.id,
        name: table.name,
        section: table.section,
        status: itemCount > 0 ? "occupied" : "free",
        total,
        itemCount,
        posX: table.posX ?? 0,
        posY: table.posY ?? 0,
        width: table.width ?? 120,
        height: table.height ?? 90,
      };
    });

  return (
    <main className="min-h-screen bg-slate-200 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Horní navigační lišta */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <a
            href="/"
            className="rounded-2xl bg-white px-5 py-4 text-lg font-semibold shadow-sm transition hover:bg-slate-50"
          >
            ← Zpět
          </a>

          <div className="rounded-2xl bg-white px-5 py-4 text-lg font-semibold shadow-sm">
            Celkem stolů: {filteredTables.length}
          </div>
        </div>

        {/* Hlavička sekce */}
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-4xl font-bold">{sectionLabel}</h1>
          <p className="mt-2 text-lg text-slate-600">
            Kliknutím na stůl otevřeš detail účtu
          </p>
        </div>

        {/* Interaktivní mapa stolů */}
        <RoomMap
          initialTables={filteredTables}
          sectionName={name}
          sectionLabel={sectionLabel}
        />
      </div>
    </main>
  );
}
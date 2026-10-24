export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import RoomMap from "@/app/components/RoomMap";
import Link from "next/link";

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
      const itemCount = items.reduce(
        (sum: number, item: any) => sum + item.quantity,
        0
      );

      return {
        id: table.id,
        name: table.name,
        section: table.section,
        // Pokud jsou na stole položky, je obsazený; jinak bere status z DB (může být "reserved")
        status: itemCount > 0 ? "occupied" : (table.status || "free"),
        reservedName: table.reservedName,
        reservedTime: table.reservedTime,
        reservedPax: table.reservedPax,
        total,
        itemCount,
        posX: table.posX ?? 0,
        posY: table.posY ?? 0,
        width: table.width ?? 120,
        height: table.height ?? 90,
      };
    });

  return (
    <main className="h-screen max-h-screen bg-slate-200 p-2 md:p-3 flex flex-col overflow-hidden select-none">
      <div className="mx-auto w-full max-w-7xl flex flex-col flex-1 min-h-0 space-y-2">
        {/* Jedna kompaktní horní lišta – nezabírá vertikální místo */}
        <header className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-2 shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition"
            >
              ← Zpět
            </Link>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {sectionLabel}
            </h1>
          </div>

          <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
            Stoly: {filteredTables.length}
          </div>
        </header>

        {/* Interaktivní mapa – vyplní 100 % zbývající výšky bez scrollování */}
        <div className="flex-1 min-h-0 flex flex-col">
          <RoomMap
            initialTables={filteredTables}
            sectionName={name}
            sectionLabel={sectionLabel}
          />
        </div>
      </div>
    </main>
  );
}
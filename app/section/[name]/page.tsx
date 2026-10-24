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

  const sections = [
    { slug: "vnitrek", label: "Vnitřek" },
    { slug: "zahradka", label: "Zahrádka" },
    { slug: "salonek", label: "Salónek" },
  ];

  const currentSection =
    sections.find((s) => s.slug === name) || sections[0];

  const filteredTables = tables
    .filter((table: any) => table.section === currentSection.label)
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
        status: itemCount > 0 ? "occupied" : (table.status || "open"),
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
        {/* Horní lišta se záložkami místností */}
        <header className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-3 py-2 shadow-xs shrink-0">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition"
            >
              ← Menu
            </Link>

            {/* Rychlé přepínání místností */}
            <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {sections.map((s) => {
                const isActive = s.slug === name;
                return (
                  <Link
                    key={s.slug}
                    href={`/section/${s.slug}`}
                    className={`px-3 py-1 text-xs font-black rounded-lg transition ${
                      isActive
                        ? "bg-slate-900 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    }`}
                  >
                    {s.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
            Stoly: {filteredTables.length}
          </div>
        </header>

        {/* Interaktivní plátno s automatickou synchronizací */}
        <div className="flex-1 min-h-0 flex flex-col">
          <RoomMap
            key={name}
            initialTables={filteredTables}
            sectionName={name}
            sectionLabel={currentSection.label}
          />
        </div>
      </div>
    </main>
  );
}
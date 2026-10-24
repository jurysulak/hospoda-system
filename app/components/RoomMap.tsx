"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";

export interface TableData {
  id: number;
  name: string;
  section: string;
  status: string; // "open" | "occupied" | "reserved" | "free"
  reservedName?: string | null;
  reservedTime?: string | null;
  reservedPax?: number | null;
  total: number;
  itemCount: number;
  posX: number;
  posY: number;
  width: number;
  height: number;
}

export default function RoomMap({
  initialTables,
  sectionLabel,
}: {
  initialTables: TableData[];
  sectionName?: string;
  sectionLabel: string;
}) {
  const [tables, setTables] = useState<TableData[]>(initialTables);
  const [isEditMode, setIsEditMode] = useState(false);
  const [newTableName, setNewTableName] = useState("");

  const [activeAction, setActiveAction] = useState<"drag" | "resize" | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initX: number;
    initY: number;
    initW: number;
    initH: number;
  }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
    initW: 0,
    initH: 0,
  });

  const floorRef = useRef<HTMLDivElement>(null);

  // 1. Automatická tichá synchronizace na pozadí (každé 4 sekundy)
  useEffect(() => {
    if (isEditMode) return; // při editaci neaktualizovat, ať to nepřerušuje tahání

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/tables?section=${encodeURIComponent(sectionLabel)}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const freshTables = await res.json();
          if (Array.isArray(freshTables)) {
            setTables(freshTables);
          }
        }
      } catch (err) {
        // Tichý odchyt při výpadku sítě
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [sectionLabel, isEditMode]);

  // 2. Přidání stolu
  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) return;

    try {
      const res = await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTableName,
          section: sectionLabel,
          posX: 30,
          posY: 30,
          width: 110,
          height: 75,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setTables((prev) => [
          ...prev,
          {
            ...created,
            status: "open",
            total: 0,
            itemCount: 0,
          },
        ]);
        setNewTableName("");
      }
    } catch (err) {
      console.error("Chyba při přidávání stolu:", err);
    }
  };

  // 3. Zahájení přesunu (Drag)
  const handleStartDrag = (table: TableData, e: React.PointerEvent) => {
    if (!isEditMode) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    setActiveAction("drag");
    setActiveId(table.id);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: table.posX,
      initY: table.posY,
      initW: table.width,
      initH: table.height,
    };
  };

  // 4. Zahájení změny velikosti (Resize)
  const handleStartResize = (table: TableData, e: React.PointerEvent) => {
    if (!isEditMode) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    setActiveAction("resize");
    setActiveId(table.id);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: table.posX,
      initY: table.posY,
      initW: table.width,
      initH: table.height,
    };
  };

  // 5. Pohyb po plátně
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeAction || activeId === null || !floorRef.current) return;

    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    const floor = floorRef.current;
    const maxBoundX = floor.clientWidth;
    const maxBoundY = floor.clientHeight;

    setTables((prev) =>
      prev.map((t) => {
        if (t.id !== activeId) return t;

        if (activeAction === "drag") {
          let nextX = dragStartRef.current.initX + deltaX;
          let nextY = dragStartRef.current.initY + deltaY;

          nextX = Math.round(nextX / 15) * 15;
          nextY = Math.round(nextY / 15) * 15;

          nextX = Math.max(0, Math.min(nextX, maxBoundX - t.width));
          nextY = Math.max(0, Math.min(nextY, maxBoundY - t.height));

          return { ...t, posX: nextX, posY: nextY };
        }

        if (activeAction === "resize") {
          let nextW = dragStartRef.current.initW + deltaX;
          let nextH = dragStartRef.current.initH + deltaY;

          nextW = Math.max(60, Math.round(nextW / 15) * 15);
          nextH = Math.max(50, Math.round(nextH / 15) * 15);

          nextW = Math.min(nextW, maxBoundX - t.posX);
          nextH = Math.min(nextH, maxBoundY - t.posY);

          return { ...t, width: nextW, height: nextH };
        }

        return t;
      })
    );
  };

  // 6. Uložení pozice po puštění
  const handlePointerUp = async () => {
    if (!activeAction || activeId === null) return;
    const targetTable = tables.find((t) => t.id === activeId);

    setActiveAction(null);
    setActiveId(null);

    if (targetTable) {
      await fetch(`/api/tables/${targetTable.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          posX: targetTable.posX,
          posY: targetTable.posY,
          width: targetTable.width,
          height: targetTable.height,
        }),
      });
    }
  };

  // 7. Smazání stolu
  const handleDeleteTable = async (tableId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Opravdu chcete smazat tento stůl?")) return;

    const res = await fetch(`/api/tables/${tableId}`, { method: "DELETE" });
    if (res.ok) {
      setTables((prev) => prev.filter((t) => t.id !== tableId));
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-2 overflow-hidden">
      {/* Kompaktní ovládací lišta */}
      <div className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 shadow-xs shrink-0">
        <button
          type="button"
          onClick={() => setIsEditMode(!isEditMode)}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
            isEditMode
              ? "bg-amber-600 text-white hover:bg-amber-700 shadow"
              : "bg-slate-800 text-white hover:bg-slate-700"
          }`}
        >
          {isEditMode ? "✓ Dokončit úpravy" : "⚙ Upravit rozestavení"}
        </button>

        {isEditMode && (
          <form onSubmit={handleAddTable} className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Název stolu"
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
              className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              type="submit"
              className="rounded-lg bg-green-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-700 cursor-pointer"
            >
              + Přidat
            </button>
          </form>
        )}
      </div>

      {/* Jednotné širokoúhlé plátno bez scrollování */}
      <div className="w-full flex-1 min-h-0 rounded-2xl border border-slate-300 bg-white p-2 shadow-xs overflow-hidden">
        <div
          ref={floorRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`relative w-full h-full rounded-xl select-none overflow-hidden transition-all ${
            isEditMode
              ? "bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:15px_15px] bg-slate-100 border-2 border-dashed border-amber-400"
              : "bg-slate-50 border border-slate-200"
          }`}
        >
          {tables.map((table) => {
            const hasItems = table.itemCount > 0;
            const isReserved = !hasItems && table.status === "reserved";
            const isOccupied = hasItems || table.status === "occupied";
            const isFree = !isReserved && !isOccupied;

            return (
              <div
                key={table.id}
                onPointerDown={(e) => handleStartDrag(table, e)}
                style={{
                  position: "absolute",
                  left: `${table.posX}px`,
                  top: `${table.posY}px`,
                  width: `${table.width}px`,
                  height: `${table.height}px`,
                  touchAction: "none",
                }}
                className={`flex flex-col justify-between rounded-xl border-2 p-1.5 shadow-xs transition ${
                  isEditMode
                    ? "cursor-grab active:cursor-grabbing border-amber-500 bg-amber-50/95"
                    : isOccupied
                    ? "border-red-500 bg-red-50 text-red-950 hover:bg-red-100 cursor-pointer"
                    : isReserved
                    ? "border-amber-500 bg-amber-50 text-amber-950 hover:bg-amber-100 cursor-pointer"
                    : "border-green-500 bg-green-50 text-green-950 hover:bg-green-100 cursor-pointer"
                }`}
              >
                {!isEditMode ? (
                  <Link
                    href={`/tables/${table.id}`}
                    className="flex h-full flex-col justify-between"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-xs font-black tracking-wide">
                        {table.name}
                      </span>
                      <span className="text-[10px]">
                        {isOccupied ? "🔴" : isReserved ? "🟡" : "🟢"}
                      </span>
                    </div>

                    {isReserved ? (
                      <div className="text-[11px] font-bold text-amber-900 leading-tight truncate">
                        🕒 {table.reservedTime || "Rezervace"}
                        {table.reservedName && (
                          <span className="block font-medium truncate text-amber-800 text-[10px]">
                            {table.reservedName} {table.reservedPax ? `(${table.reservedPax} os.)` : ""}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-end justify-between text-[11px] leading-tight">
                        <span className="font-medium text-slate-500">
                          {table.itemCount} ks
                        </span>
                        <span className="font-bold text-slate-900">
                          {table.total} Kč
                        </span>
                      </div>
                    )}
                  </Link>
                ) : (
                  <div className="flex h-full flex-col justify-between relative">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {table.name}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteTable(table.id, e)}
                        className="text-red-500 hover:text-red-700 font-bold text-xs px-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>
                        {table.width}×{table.height}
                      </span>
                    </div>

                    <div
                      onPointerDown={(e) => handleStartResize(table, e)}
                      className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 hover:bg-amber-600 rounded-sm cursor-se-resize flex items-center justify-center shadow"
                      title="Táhnutím změň velikost"
                    >
                      <div className="w-1.5 h-1.5 border-r border-b border-white" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
"use client";

import React from "react";

export type PrintItem = {
  id: number;
  productName: string;
  quantity: number;
  unitPrice: number;
};

type ReceiptPrintModalProps = {
  isOpen: boolean;
  onClose: () => void;
  tableName: string;
  items: PrintItem[];
  totalAmount: number;
  paymentMethod?: "CASH" | "CARD";
  mode: "RECEIPT" | "KITCHEN"; // Účtenka pro hosta vs Bon do kuchyně
};

export default function ReceiptPrintModal({
  isOpen,
  onClose,
  tableName,
  items,
  totalAmount,
  paymentMethod,
  mode,
}: ReceiptPrintModalProps) {
  if (!isOpen) return null;

  const now = new Date();
  const dateStr = now.toLocaleDateString("cs-CZ");
  const timeStr = now.toLocaleTimeString("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      {/* Vlastní tiskové styly pro 80mm papír */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt,
          #printable-receipt * {
            visibility: visible;
          }
          #printable-receipt {
            position: fixed;
            left: 0;
            top: 0;
            width: 80mm;
            margin: 0;
            padding: 4mm;
            background: white !important;
            color: black !important;
            font-family: monospace, monospace;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 print:p-0 print:shadow-none">
        
        {/* Náhled účtenky / bonu */}
        <div
          id="printable-receipt"
          className="mx-auto w-full max-w-[80mm] rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 font-mono text-xs text-slate-900 shadow-inner"
        >
          {mode === "RECEIPT" ? (
            /* ÚČTENKA PRO HOSTA */
            <div>
              <div className="text-center">
                <div className="text-base font-black uppercase tracking-wider">
                  Hospoda U Šuláků
                </div>
                <div className="text-[10px] text-slate-500">
                  Pekařská 349/99, Opava-Kateřinky
                </div>
                <div className="mt-2 border-b border-dashed border-slate-400 pb-1 flex justify-between text-[11px]">
                  <span>{dateStr} {timeStr}</span>
                  <span className="font-bold">{tableName}</span>
                </div>
              </div>

              {/* Seznam položek */}
              <div className="my-2 space-y-1">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between leading-tight">
                    <span className="truncate pr-2">
                      {item.quantity}× {item.productName}
                    </span>
                    <span className="font-bold whitespace-nowrap">
                      {item.quantity * item.unitPrice} Kč
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-slate-400 pt-2">
                <div className="flex justify-between text-sm font-black">
                  <span>CELKEM:</span>
                  <span>{totalAmount} Kč</span>
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-slate-600">
                  <span>Platba:</span>
                  <span className="font-bold">
                    {paymentMethod === "CARD" ? "Platba kartou" : "Hotovost"}
                  </span>
                </div>
              </div>

              <div className="mt-4 text-center text-[10px] text-slate-500 border-t border-dashed border-slate-300 pt-2">
                Děkujeme za návštěvu!
              </div>
            </div>
          ) : (
            /* BON DO KUCHYNĚ / NA BAR */
            <div>
              <div className="border-b-2 border-slate-900 pb-2 text-center">
                <div className="text-xl font-black uppercase tracking-tight">
                  BON: {tableName}
                </div>
                <div className="text-xs font-bold">{timeStr}</div>
              </div>

              <div className="my-3 space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm font-extrabold"
                  >
                    <span>{item.productName}</span>
                    <span className="rounded bg-slate-900 px-1.5 py-0.5 text-white">
                      {item.quantity}×
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-slate-900 pt-1 text-center text-[10px] font-bold">
                Objednávka k výdeji
              </div>
            </div>
          )}
        </div>

        {/* Akční tlačítka modalu */}
        <div className="mt-5 flex flex-col gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="w-full rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 py-3 text-sm font-bold text-white shadow transition cursor-pointer flex items-center justify-center gap-2"
          >
            🖨️ Vytisknout
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-2xl bg-slate-100 hover:bg-slate-200 py-2.5 text-xs font-semibold text-slate-600 transition cursor-pointer"
          >
            Zavřít
          </button>
        </div>
      </div>
    </div>
  );
}
"use client";

import { printDailySummaryViaRawBT } from "@/lib/printReceipt";

interface Props {
  summary: {
    totalAmount: number;
    paymentCount: number;
    cashAmount?: number;
    cardAmount?: number;
    byProduct?: Array<{ productName: string; totalQuantity: number; totalAmount: number }>;
  };
}

export default function PrintSummaryButton({ summary }: Props) {
  return (
    <button
      onClick={() => printDailySummaryViaRawBT(summary)}
      className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-base font-bold text-white shadow-sm hover:bg-slate-800 transition active:scale-95 cursor-pointer"
    >
      🖨️ Vytisknout denní souhrn
    </button>
  );
}
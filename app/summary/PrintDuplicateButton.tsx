"use client";

import { printReceiptViaRawBT } from "@/lib/printReceipt";

interface PrintDuplicateButtonProps {
  payment: {
    id: number;
    amount: number;
    paymentMethod: string | null;
    createdAt: string | Date;
    receiptNumber?: string | null;
    order?: {
      table?: {
        name: string;
      } | null;
      items?: Array<{
        productName: string;
        unitPrice: number;
        quantity: number;
      }>;
    } | null;
  };
}

export default function PrintDuplicateButton({ payment }: PrintDuplicateButtonProps) {
  const handlePrint = (e: React.MouseEvent) => {
    e.stopPropagation();

    const tableName = payment.order?.table?.name || "Účet";
    const items =
      payment.order?.items?.map((i) => ({
        name: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })) || [];

    printReceiptViaRawBT({
      receiptNumber: payment.receiptNumber || payment.id,
      tableName,
      items,
      totalAmount: payment.amount,
      paymentMethod: payment.paymentMethod?.toLowerCase() === "card" ? "CARD" : "CASH",
      isDuplicate: true,
      paymentDate: new Date(payment.createdAt),
    });
  };

  return (
    <button
      onClick={handlePrint}
      type="button"
      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-xs flex items-center gap-1 transition shadow-2xs cursor-pointer border border-slate-200"
      title="Vytisknout kopii účtenky"
    >
      <span>🖨️</span>
      <span>Kopie</span>
    </button>
  );
}
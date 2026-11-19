// lib/printReceipt.ts

interface PrintItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

interface PrintReceiptParams {
  receiptNumber?: string | number;
  tableName: string;
  items: PrintItem[];
  totalAmount: number;
  paymentMethod: "CASH" | "CARD";
  isDuplicate?: boolean;    // <-- Přidáno: označení kopie
  paymentDate?: Date;       // <-- Přidáno: zachování původního času platby
}

function stripAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const LINE_WIDTH = 48;

const center = (text: string) => {
  const clean = stripAccents(text);
  const pad = Math.max(0, Math.floor((LINE_WIDTH - clean.length) / 2));
  return " ".repeat(pad) + clean;
};

const centerDouble = (text: string) => {
  const clean = stripAccents(text);
  const pad = Math.max(0, Math.floor((24 - clean.length) / 2));
  return " ".repeat(pad) + clean;
};

const justify = (left: string, right: string) => {
  const cleanLeft = stripAccents(left);
  const cleanRight = stripAccents(right);
  const space = Math.max(1, LINE_WIDTH - cleanLeft.length - cleanRight.length);
  return cleanLeft + " ".repeat(space) + cleanRight;
};

const divider = "-".repeat(LINE_WIDTH);
const doubleDivider = "=".repeat(LINE_WIDTH);

export function printReceiptViaRawBT({
  receiptNumber,
  tableName,
  items,
  totalAmount,
  paymentMethod,
  isDuplicate = false,
  paymentDate,
}: PrintReceiptParams) {
  const dateObj = paymentDate ? new Date(paymentDate) : new Date();
  const dateStr = dateObj.toLocaleDateString("cs-CZ");
  const timeStr = dateObj.toLocaleTimeString("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const receiptNumStr =
    receiptNumber ||
    `${dateObj.getFullYear()}${String(dateObj.getMonth() + 1).padStart(2, "0")}${String(
      dateObj.getDate()
    ).padStart(2, "0")}-${String(dateObj.getHours()).padStart(2, "0")}${String(
      dateObj.getMinutes()
    ).padStart(2, "0")}`;

  const lines: string[] = [
    "\x1b!\x30" + centerDouble("HOSPODA U ŠULÁKŮ"),
    "\x1b!\x00" + center("PEKAŘSKÁ 349/99"),
    center("747 05 OPAVA"),
    center("IČO: 73174475"),
    divider,
  ];

  if (isDuplicate) {
    lines.push("\x1b!\x08" + center("*** KOPIE ÚČTENKY / ODPIS ***") + "\x1b!\x00");
    lines.push(divider);
  }

  lines.push(justify(`Č. ÚČTENKY: ${receiptNumStr}`, ""));
  lines.push(justify(`Stůl: ${tableName}`, `${dateStr} ${timeStr}`));
  lines.push(doubleDivider);

  if (items && items.length > 0) {
    items.forEach((item) => {
      const itemTotal = `${item.quantity * item.unitPrice} Kč`;
      const itemQty = `${item.quantity}x ${item.unitPrice} Kč`;

      lines.push(stripAccents(item.name));
      lines.push(justify(`  ${itemQty}`, itemTotal));
    });
  } else {
    lines.push(justify("Konzumace / platba", `${totalAmount} Kč`));
  }

  lines.push(divider);
  lines.push(
    "\x1b!\x08" +
      justify("CELKEM CZK:", `${totalAmount.toLocaleString("cs-CZ")} Kč`) +
      "\x1b!\x00"
  );
  lines.push(
    justify(
      "Způsob úhrady:",
      paymentMethod?.toUpperCase() === "CARD" ? "KARTA" : "HOTOVOST"
    )
  );
  lines.push(doubleDivider);
  lines.push(center("********* DĚKUJEME VÁM *********"));
  lines.push("\n\n\n\n");

  const rawText = lines.join("\n");
  window.location.href = `rawbt:${encodeURIComponent(rawText)}`;
}

// Denní uzávěrka / Z-Report
interface SummaryPrintParams {
  totalAmount: number;
  paymentCount: number;
  cashAmount?: number;
  cardAmount?: number;
  byProduct?: Array<{ productName: string; totalQuantity: number; totalAmount: number }>;
}

export function printDailySummaryViaRawBT(summary: SummaryPrintParams) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("cs-CZ");
  const timeStr = now.toLocaleTimeString("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const lines: string[] = [
    "\x1b!\x30" + centerDouble("HOSPODA U ŠULÁKŮ"),
    "\x1b!\x00" + center("PEKAŘSKÁ 349/99"),
    center("747 05 OPAVA"),
    center("IČO: 73174475"),
    divider,
    "\x1b!\x08" + center("DENNÍ UZÁVĚRKA / SOUHRN") + "\x1b!\x00",
    justify("Datum tisku:", `${dateStr} ${timeStr}`),
    doubleDivider,
    justify("Počet plateb:", String(summary.paymentCount)),
    divider,
    "\x1b!\x08" +
      justify("CELKOVÁ TRŽBA:", `${summary.totalAmount.toLocaleString("cs-CZ")} Kč`) +
      "\x1b!\x00",
  ];

  if (summary.cashAmount !== undefined) {
    lines.push(justify(" - Hotovost:", `${summary.cashAmount.toLocaleString("cs-CZ")} Kč`));
  }
  if (summary.cardAmount !== undefined) {
    lines.push(justify(" - Platební karty:", `${summary.cardAmount.toLocaleString("cs-CZ")} Kč`));
  }

  if (summary.byProduct && summary.byProduct.length > 0) {
    lines.push(divider);
    lines.push(center("PRODEJ PODLE POLOŽEK"));
    lines.push(divider);
    summary.byProduct.forEach((p) => {
      lines.push(stripAccents(p.productName));
      lines.push(justify(`  ${p.totalQuantity} ks`, `${p.totalAmount.toLocaleString("cs-CZ")} Kč`));
    });
  }

  // lib/printReceipt.ts

// ... (předchozí kód zůstává stejný)

  lines.push(doubleDivider);
  lines.push(center("********* DEKUJEME VAM *********"));
  
  // Přidáme prázdné řádky pro bezpečný výsuv papíru nad řezací nůž
  lines.push("\n\n\n\n");
  

  const rawText = lines.join("\n");
  window.location.href = `rawbt:${encodeURIComponent(rawText)}`;
}

export function printKitchenSummaryViaRawBT(params: {
  items: { name: string; quantity: number }[];
  totalPortions: number;
  date?: Date;
}) {
  // Datum = den, za který je souhrn; čas = kdy se tiskne
  const dateObj = params.date || new Date();
  const dateStr = dateObj.toLocaleDateString("cs-CZ");
  const timeStr = new Date().toLocaleTimeString("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Celá šíře 80mm papíru (48 znaků), stejně jako účtenky a denní uzávěrka
  const lines: string[] = [
    "\x1b!\x08" + center("DENNI SOUHRN - KUCHYNE") + "\x1b!\x00",
    divider,
    justify(`Datum: ${dateStr}`, `Tisk: ${timeStr}`),
    divider,
    justify("POLOZKA", "POCET"),
    divider,
  ];

  if (params.items.length === 0) {
    lines.push("Zatim zadne vydane pokrmy.");
  } else {
    for (const item of params.items) {
      const qtyStr = `${item.quantity}x`;
      const maxNameLen = LINE_WIDTH - qtyStr.length - 1;
      // Tiskárna neumí české znaky – odstraníme diakritiku (č → c) a cokoli mimo běžné ASCII
      const asciiName = stripAccents(item.name).replace(/[^\x20-\x7E]/g, "");
      const cleanName =
        asciiName.length > maxNameLen
          ? asciiName.slice(0, maxNameLen - 1) + "."
          : asciiName;
      lines.push(justify(cleanName, qtyStr));
    }
  }

  lines.push(doubleDivider);
  lines.push(
    "\x1b!\x08" + justify("CELKEM PORCI:", `${params.totalPortions} ks`) + "\x1b!\x00"
  );
  lines.push(doubleDivider);
  lines.push("\n\n\n\n");

  const rawText = lines.join("\n");
  window.location.href = `rawbt:${encodeURIComponent(rawText)}`;
}
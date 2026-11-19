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

  const line = "--------------------------------";
  const lines: string[] = [
    "     DENNI SOUHRN - KUCHYNE     ",
    line,
    `Datum: ${dateStr}  Cas: ${timeStr}`,
    line,
    "POLOZKA                    POCET",
    line,
  ];

  if (params.items.length === 0) {
    lines.push("Zatim zadne vydane pokrmy.");
  } else {
    for (const item of params.items) {
      const qtyStr = `${item.quantity}x`;
      const maxNameLen = 32 - qtyStr.length - 1;
      const cleanName =
        item.name.length > maxNameLen
          ? item.name.slice(0, maxNameLen - 1) + "."
          : item.name;
      const spaces = " ".repeat(Math.max(1, 32 - cleanName.length - qtyStr.length));
      lines.push(`${cleanName}${spaces}${qtyStr}`);
    }
  }

  lines.push(line);
  const totalLabel = "CELKEM PORCI:";
  const totalVal = `${params.totalPortions} ks`;
  const totalSpaces = " ".repeat(Math.max(1, 32 - totalLabel.length - totalVal.length));
  lines.push(`${totalLabel}${totalSpaces}${totalVal}`);
  lines.push(line);
  lines.push("\n\n\n");

  const receiptText = lines.join("\n");
  const utf8Bytes = new TextEncoder().encode(receiptText);
  let binary = "";
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  const base64Text = btoa(binary);

  window.location.href = `rawbt:base64,${base64Text}`;
}
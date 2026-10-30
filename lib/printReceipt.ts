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
}

function stripAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// 48 znaků = přesná plná šířka pro 80mm tiskárnu Font A
const LINE_WIDTH = 48;

const center = (text: string) => {
  const clean = stripAccents(text);
  const pad = Math.max(0, Math.floor((LINE_WIDTH - clean.length) / 2));
  return " ".repeat(pad) + clean;
};

// Vycentrování pro dvojnásobně široké písmo (24 znaků na řádek)
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

// Běžná účtenka za stůl
export function printReceiptViaRawBT({
  receiptNumber,
  tableName,
  items,
  totalAmount,
  paymentMethod,
}: PrintReceiptParams) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("cs-CZ");
  const timeStr = now.toLocaleTimeString("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const receiptNumStr =
    receiptNumber ||
    `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
      now.getDate()
    ).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

  // ESC/POS kódy:
  // \x1b!\x30 = Velké písmo (Double Height + Double Width)
  // \x1b!\x00 = Normální písmo (standardní šířka 48 znaků)
  // \x1b!\x08 = Tučné standardní písmo
  const lines: string[] = [
    "\x1b!\x30" + centerDouble("HOSPODA U SULAKU"),
    "\x1b!\x00" + center("PEKARSKA 349/99"),
    center("747 05 OPAVA"),
    center("ICO: 73174475"),
    divider,
    justify(`C. UCTENKY: ${receiptNumStr}`, ""),
    justify(`Stul: ${tableName}`, `${dateStr} ${timeStr}`),
    doubleDivider,
  ];

  items.forEach((item) => {
    const itemTotal = `${item.quantity * item.unitPrice} Kc`;
    const itemQty = `${item.quantity}x ${item.unitPrice} Kc`;

    lines.push(stripAccents(item.name));
    lines.push(justify(`   ${itemQty}`, itemTotal));
  });

  lines.push(divider);
  lines.push(
    "\x1b!\x08" +
      justify(
        "CELKEM CZK:",
        `${totalAmount.toLocaleString("cs-CZ")} Kc`
      ) +
      "\x1b!\x00"
  );
  lines.push(
    justify(
      "Zpusob uhrady:",
      paymentMethod === "CASH" ? "HOTOVOST" : "KARTA"
    )
  );
  lines.push(doubleDivider);
  lines.push(center("********* DEKUJEME VAM *********"));
  lines.push("\n\n");

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
    "\x1b!\x30" + centerDouble("HOSPODA U SULAKU"),
    "\x1b!\x00" + center("PEKARSKA 349/99, 747 05 OPAVA"),
    center("ICO: 73174475"),
    divider,
    "\x1b!\x08" + center("DENNI UZAVERKA / SOUHRN") + "\x1b!\x00",
    justify("Datum tisku:", `${dateStr} ${timeStr}`),
    doubleDivider,
    justify("Pocet plateb:", String(summary.paymentCount)),
    divider,
    "\x1b!\x08" +
      justify("CELKOVA TRZBA:", `${summary.totalAmount.toLocaleString("cs-CZ")} Kc`) +
      "\x1b!\x00",
  ];

  if (summary.cashAmount !== undefined) {
    lines.push(justify(" - Hotovost:", `${summary.cashAmount.toLocaleString("cs-CZ")} Kc`));
  }
  if (summary.cardAmount !== undefined) {
    lines.push(justify(" - Platebni karty:", `${summary.cardAmount.toLocaleString("cs-CZ")} Kc`));
  }

  if (summary.byProduct && summary.byProduct.length > 0) {
    lines.push(divider);
    lines.push(center("PRODEJ PODLE POLOZEK"));
    lines.push(divider);
    summary.byProduct.forEach((p) => {
      lines.push(stripAccents(p.productName));
      lines.push(justify(`   ${p.totalQuantity} ks`, `${p.totalAmount.toLocaleString("cs-CZ")} Kc`));
    });
  }

  lines.push(doubleDivider);
  lines.push(center("Konec denniho souhrnu"));
  lines.push("\n\n");

  const rawText = lines.join("\n");
  window.location.href = `rawbt:${encodeURIComponent(rawText)}`;
}
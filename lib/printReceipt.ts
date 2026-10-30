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

// Odstranění diakritiky pro čistý termotisk
function stripAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function printReceiptViaRawBT({
  receiptNumber,
  tableName,
  items,
  totalAmount,
  paymentMethod,
}: PrintReceiptParams) {
  // 48 znaků je přesná plná šířka pro 80mm tiskárnu Xprinter
  const LINE_WIDTH = 48;

  const center = (text: string) => {
    const clean = stripAccents(text);
    const pad = Math.max(0, Math.floor((LINE_WIDTH - clean.length) / 2));
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

  const lines: string[] = [
    center("HOSPODA U SULAKU"),
    center("PEKARSKA 349/99"),
    center("747 05 OPAVA"),
    center("ICO: 73174475"),
    divider,
    justify(`C. UCTENKY: ${receiptNumStr}`, ""),
    justify(`Stul: ${tableName}`, `${dateStr} ${timeStr}`),
    doubleDivider,
  ];

  // Položky účtu roztažené po celé šířce
  items.forEach((item) => {
    const itemTotal = `${item.quantity * item.unitPrice} Kc`;
    const itemQty = `${item.quantity}x ${item.unitPrice} Kc`;

    lines.push(stripAccents(item.name));
    lines.push(justify(`   ${itemQty}`, itemTotal));
  });

  lines.push(divider);
  lines.push(
    justify(
      "CELKEM CZK:",
      `${totalAmount.toLocaleString("cs-CZ")} Kc`
    )
  );
  lines.push(
    justify(
      "Zpusob uhrady:",
      paymentMethod === "CASH" ? "HOTOVOST" : "KARTA"
    )
  );
  lines.push(doubleDivider);
  lines.push(center("********* DEKUJEME VAM *********"));
  // Zredukováno na minimum, aby pod textem nebyl zbytečný bílý pruh
  lines.push("\n\n");

  const plainText = lines.join("\n");

  window.location.href = `rawbt:${encodeURIComponent(plainText)}`;
}
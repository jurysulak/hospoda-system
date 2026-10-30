// lib/printReceipt.ts

interface PrintItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

interface PrintReceiptParams {
  tableName: string;
  items: PrintItem[];
  totalAmount: number;
  paymentMethod: "CASH" | "CARD";
}

export function printReceiptViaRawBT({
  tableName,
  items,
  totalAmount,
  paymentMethod,
}: PrintReceiptParams) {
  const LINE_WIDTH = 48; // Šířka řádku pro 80mm tiskárnu s běžným písmem Font A

  const center = (text: string) => {
    const pad = Math.max(0, Math.floor((LINE_WIDTH - text.length) / 2));
    return " ".repeat(pad) + text;
  };

  const justify = (left: string, right: string) => {
    const space = Math.max(1, LINE_WIDTH - left.length - right.length);
    return left + " ".repeat(space) + right;
  };

  const divider = "-".repeat(LINE_WIDTH);
  const doubleDivider = "=".repeat(LINE_WIDTH);

  const now = new Date();
  const dateStr = now.toLocaleDateString("cs-CZ");
  const timeStr = now.toLocaleTimeString("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const lines: string[] = [
    center("HOSPODA U ŠULÁKŮ"),
    center("Pekařská 349/99, Opava-Kateřinky"),
    divider,
    justify(`Stůl: ${tableName}`, `${dateStr} ${timeStr}`),
    doubleDivider,
  ];

  // Položky
  items.forEach((item) => {
    const itemTotal = `${item.quantity * item.unitPrice} Kč`;
    const itemQty = `${item.quantity}x ${item.unitPrice} Kč`;

    // 1. řádek: Název položky
    lines.push(item.name);
    // 2. řádek: Počet ks x cena zarovnané vlevo, celkem vpravo
    lines.push(justify(`   ${itemQty}`, itemTotal));
  });

  lines.push(divider);
  lines.push(
    justify(
      "CELKEM K ÚHRADĚ:",
      `${totalAmount.toLocaleString("cs-CZ")} Kč`
    )
  );
  lines.push(
    justify(
      "Způsob úhrady:",
      paymentMethod === "CASH" ? "HOTOVOST" : "PLATEBNÍ KARTA"
    )
  );
  lines.push(doubleDivider);
  lines.push(center("Děkujeme za návštěvu!"));
  lines.push("\n\n\n"); // Posuv papíru před uříznutím

  const plainText = lines.join("\n");

  // Odeslání do aplikace RawBT přes intent URI
  const rawbtUrl = `rawbt:data:text/plain;charset=utf-8,${encodeURIComponent(
    plainText
  )}`;

  window.location.href = rawbtUrl;
}
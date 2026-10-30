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

function stripAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function printReceiptViaRawBT({
  tableName,
  items,
  totalAmount,
  paymentMethod,
}: PrintReceiptParams) {
  const LINE_WIDTH = 42;

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

  const lines: string[] = [
    center("HOSPODA U SULAKU"),
    center("Pekarska 349/99, Opava-Katerinky"),
    divider,
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
    justify(
      "CELKEM K UHRADE:",
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
  lines.push(center("Dekujeme za navstevu!"));
  lines.push("\n\n\n\n");

  const plainText = lines.join("\n");

  // Klíčová oprava: explicitní předání typu text/plain bezpečně přes encodeURIComponent
  // Tento URI formát RawBT spolehlivě zachytí a převede na čitelný tisk
  window.location.href = `rawbt:text?data=${encodeURIComponent(plainText)}`;
}
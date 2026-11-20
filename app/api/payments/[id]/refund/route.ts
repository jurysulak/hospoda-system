import { NextResponse, after } from "next/server";
import { eetEnabled, sendNewAndFlush } from "@/lib/eet/send";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Kód storna se ověřuje jen na serveru (proměnná prostředí STORNO_PIN ve Vercelu / .env)
function isValidStornoCode(code: unknown): boolean {
  const expected = process.env.STORNO_PIN;
  if (!expected || typeof code !== "string") return false;
  const a = Buffer.from(code.trim());
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const paymentId = Number(id);

    if (isNaN(paymentId)) {
      return NextResponse.json({ error: "Neplatné ID platby" }, { status: 400 });
    }

    if (!process.env.STORNO_PIN) {
      return NextResponse.json(
        { error: "Kód storna není nastaven (STORNO_PIN). Storno není možné." },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    if (!isValidStornoCode(body?.code)) {
      return NextResponse.json({ error: "Nesprávný kód storna" }, { status: 403 });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: { include: { items: true } } },
    });

    if (!payment) {
      return NextResponse.json({ error: "Platba nebyla nalezena" }, { status: 404 });
    }
    if (payment.cancelledAt) {
      return NextResponse.json({ error: "Platba už byla stornována" }, { status: 409 });
    }

    const paidOrder = payment.order;
    const tableId = paidOrder.tableId;

    const eetId = await prisma.$transaction(async (tx) => {
      // 1. Platba zůstává v historii, jen se označí jako stornovaná
      //    (podmínka cancelledAt: null brání dvojímu stornu při dvojkliku)
      const cancelledAt = new Date();
      const marked = await tx.payment.updateMany({
        where: { id: paymentId, cancelledAt: null },
        data: { cancelledAt },
      });
      if (marked.count === 0) throw new Error("ALREADY_CANCELLED");

      // EET: storno = nová tržba se zápornou částkou v okamžiku vrácení peněz (bez vazby na původní zprávu)
      const eetRec = eetEnabled()
        ? await tx.eetRecord.create({
            data: { paymentId, kind: "STORNO", amount: -payment.amount, datTrzby: cancelledAt },
          })
        : null;

      // 2. Zaplacený účet se označí jako stornovaný (položky v něm zůstanou kvůli historii a kopii účtenky)
      await tx.order.update({
        where: { id: paidOrder.id },
        data: { status: "cancelled" },
      });

      // 3. Položky se vrátí na stůl – do jeho aktuálně otevřeného účtu, nebo do nového
      let openOrder = await tx.order.findFirst({
        where: { tableId, status: "open" },
        orderBy: { createdAt: "asc" },
      });
      if (!openOrder) {
        openOrder = await tx.order.create({ data: { tableId, status: "open" } });
      }

      if (paidOrder.items.length > 0) {
        await tx.orderItem.createMany({
          data: paidOrder.items.map((item) => ({
            orderId: openOrder.id,
            productId: item.productId,
            productName: item.productName,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            status: item.status,
            note: item.note,
            payerName: item.payerName,
          })),
        });
      }

      // 4. Stůl je znovu obsazený
      await tx.table.update({
        where: { id: tableId },
        data: { status: "occupied" },
      });

      return eetRec?.id ?? null;
    });

    if (eetId !== null) after(() => sendNewAndFlush(eetId));

    return NextResponse.json({ success: true, tableId }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_CANCELLED") {
      return NextResponse.json({ error: "Platba už byla stornována" }, { status: 409 });
    }
    console.error("Chyba při stornování platby:", error);
    return NextResponse.json(
      { error: "Chyba na serveru při stornu platby" },
      { status: 500 }
    );
  }
}

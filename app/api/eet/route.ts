// app/api/eet/route.ts
// GET  – stav evidence tržeb (kolik čeká / kolik skončilo chybou)
// POST – ručně doposlat neodeslané i chybové tržby
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { eetEnabled, flushPending } from "@/lib/eet/send";

export const dynamic = "force-dynamic";

async function status() {
  if (!eetEnabled()) return { enabled: false };
  const [pending, errors, lastProblem] = await Promise.all([
    prisma.eetRecord.count({ where: { status: "PENDING" } }),
    prisma.eetRecord.count({ where: { status: "ERROR" } }),
    prisma.eetRecord.findFirst({
      where: { status: { in: ["PENDING", "ERROR"] } },
      orderBy: { id: "asc" },
      select: { datTrzby: true, lastError: true },
    }),
  ]);
  return {
    enabled: true,
    env: process.env.EET_ENV === "production" ? "production" : "playground",
    pending,
    errors,
    oldestUnsentAt: lastProblem?.datTrzby ?? null,
    lastError: lastProblem?.lastError ?? null,
  };
}

export async function GET() {
  try {
    return NextResponse.json(await status());
  } catch (error) {
    console.error("Chyba stavu EET:", error);
    return NextResponse.json({ error: "Chyba při načítání stavu EET" }, { status: 500 });
  }
}

export async function POST() {
  try {
    await flushPending(50, true);
    return NextResponse.json(await status());
  } catch (error) {
    console.error("Chyba doposlání EET:", error);
    return NextResponse.json({ error: "Chyba při odesílání do EET" }, { status: 500 });
  }
}

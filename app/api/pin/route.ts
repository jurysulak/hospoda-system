// app/api/pin/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const setting = await (prisma as unknown as { setting?: { findUnique: (args: unknown) => Promise<{ value: string } | null> } })
      .setting?.findUnique({ where: { key: "admin_pin" } })
      .catch(() => null);

    return NextResponse.json({ pin: setting?.value || "1234" });
  } catch {
    return NextResponse.json({ pin: "1234" });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { newPin?: string };
    const newPin = body.newPin;

    if (!newPin || newPin.length !== 4) {
      return NextResponse.json({ error: "PIN musí mít 4 číslice" }, { status: 400 });
    }

    await (prisma as unknown as { setting?: { upsert: (args: unknown) => Promise<unknown> } })
      .setting?.upsert({
        where: { key: "admin_pin" },
        update: { value: newPin },
        create: { key: "admin_pin", value: newPin },
      })
      .catch(() => null);

    return NextResponse.json({ success: true, pin: newPin });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Chyba serveru";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
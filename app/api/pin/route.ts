// app/api/pin/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Pokud máš v DB tabulku Settings, načte se z ní, jinak výchozí
    const setting = await (prisma as any).setting?.findUnique({
      where: { key: "admin_pin" },
    }).catch(() => null);

    return NextResponse.json({ pin: setting?.value || "1234" });
  } catch {
    return NextResponse.json({ pin: "1234" });
  }
}

export async function POST(req: Request) {
  try {
    const { newPin } = await req.json();
    if (!newPin || newPin.length !== 4) {
      return NextResponse.json({ error: "PIN musí mít 4 číslice" }, { status: 400 });
    }

    await (prisma as any).setting?.upsert({
      where: { key: "admin_pin" },
      update: { value: newPin },
      create: { key: "admin_pin", value: newPin },
    }).catch(() => null);

    return NextResponse.json({ success: true, pin: newPin });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
// app/api/cron/eet/route.ts
// Denní pojistka (Vercel Cron): doposlání tržeb, které se nepodařilo odeslat hned.
// Vercel posílá hlavičku Authorization: Bearer <CRON_SECRET>.
import { NextResponse } from "next/server";
import { flushPending } from "@/lib/eet/send";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await flushPending(200);
  return NextResponse.json(result);
}

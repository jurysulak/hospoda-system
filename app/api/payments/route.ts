// app/api/payments/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payments = await prisma.payment.findMany({
      take: 60,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        order: {
          include: {
            table: true,
            items: true, // <-- důležité pro tisk položek na kopii účtenky
          },
        },
      },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("GET payments error:", error);
    return NextResponse.json(
      { error: "Nepodařilo se načíst platby" },
      { status: 500 }
    );
  }
}
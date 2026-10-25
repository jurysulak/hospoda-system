import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
      include: {
        order: {
          include: {
            table: true,
            items: true,
          },
        },
      },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Chyba při načítání plateb:", error);
    return NextResponse.json(
      { error: "Chyba při načítání plateb" },
      { status: 500 }
    );
  }
}
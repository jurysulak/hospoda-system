import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const resolvedParams = await params;
    const itemId = parseInt(resolvedParams.itemId, 10);

    if (isNaN(itemId)) {
      return NextResponse.json({ error: "Neplatné ID položky" }, { status: 400 });
    }

    const body = await request.json();
    const targetStatus = body.status || "SERVED";

    // 1. Najdeme položku, kterou právě vydáváme
    const itemToServe = await prisma.orderItem.findUnique({
      where: { id: itemId },
    });

    if (!itemToServe) {
      return NextResponse.json({ error: "Položka nenalezena" }, { status: 404 });
    }

    // Pokud ji označujeme jako SERVED (vydanou), zkusíme ji sloučit s existující vydanou položkou
    if (targetStatus === "SERVED") {
      const existingServedItem = await prisma.orderItem.findFirst({
        where: {
          orderId: itemToServe.orderId,
          productId: itemToServe.productId,
          status: "SERVED",
          id: { not: itemToServe.id },
          // Sloučíme jen pokud mají stejnou poznámku (nebo jsou obě bez poznámky)
          note: itemToServe.note || null,
        },
      });

      if (existingServedItem) {
        // Našli jsme už dříve vydanou položku -> navýšíme u ní počet kusů
        const mergedItem = await prisma.orderItem.update({
          where: { id: existingServedItem.id },
          data: {
            quantity: existingServedItem.quantity + itemToServe.quantity,
          },
        });

        // Tuto dočasnou žlutou položku smažeme, protože je už připočtená
        await prisma.orderItem.delete({
          where: { id: itemToServe.id },
        });

        return NextResponse.json(mergedItem);
      }
    }

    // Pokud ještě žádná stejná vydaná položka na stole není, pouze změníme status na SERVED
    const updated = await prisma.orderItem.update({
      where: { id: itemId },
      data: { status: targetStatus },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Chyba při změně stavu položky:", error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
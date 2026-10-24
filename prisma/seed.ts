import "dotenv/config";
import { prisma } from "../lib/prisma";

// zbytek kódu (pole products zůstává beze změny)
const products = [
  // ...
  // ==========================================
  // ČEPOVANÉ PIVO & PIVNÍ SPECIALITY
  // ==========================================
  { name: "Pilsner Urquell – Hladinka (0,47 l)", category: "Čepované pivo", price: 59 },
  { name: "Pilsner Urquell – Malé (0,28 l)", category: "Čepované pivo", price: 45 },
  { name: "Pilsner Urquell – Šnyt (0,35 l)", category: "Čepované pivo", price: 47 },
  { name: "Pilsner Urquell – Mlíko (0,35 l)", category: "Čepované pivo", price: 47 },
  { name: "Radegast 12 – Hladinka (0,47 l)", category: "Čepované pivo", price: 49 },
  { name: "Radegast 12 – Malé (0,28 l)", category: "Čepované pivo", price: 39 },
  { name: "Radegast 12 – Šnyt, mlíko (0,35 l)", category: "Čepované pivo", price: 42 },
  { name: "Radegast 10 – Hladinka (0,47 l)", category: "Čepované pivo", price: 46 },
  { name: "Radegast 10 – Malé (0,28 l)", category: "Čepované pivo", price: 36 },
  { name: "Radegast 10 – Šnyt, mlíko (0,35 l)", category: "Čepované pivo", price: 39 },
  { name: "Zlatovar 12 (0,47 l)", category: "Čepované pivo", price: 40 },
  { name: "Zlatovar 12 – Malé (0,28 l)", category: "Čepované pivo", price: 30 },

  // ==========================================
  // NEALKO NÁPOJE
  // ==========================================
  { name: "Kofola čepovaná (0,5 l)", category: "Nealko", price: 50 },
  { name: "Kofola čepovaná (0,31 l)", category: "Nealko", price: 40 },
  { name: "Coca-Cola (0,33 l)", category: "Nealko", price: 49 },
  { name: "Coca-Cola / Zero / Fanta / Sprite / Tonic (0,3 l)", category: "Nealko", price: 35 },
  { name: "Coca-Cola / Zero / Fanta / Sprite / Tonic (0,5 l)", category: "Nealko", price: 49 },
  { name: "Rajec neperlivý (0,33 l)", category: "Nealko", price: 39 },
  { name: "Rajec jemně perlivý (0,33 l)", category: "Nealko", price: 39 },
  { name: "Voda neperlivá / perlivá (0,5 l)", category: "Nealko", price: 25 },
  { name: "Targa TONIC (0,25 l)", category: "Nealko", price: 45 },
  { name: "Targa Limo (0,25 l)", category: "Nealko", price: 45 },
  { name: "Vinea bílá (0,25 l)", category: "Nealko", price: 45 },
  { name: "Džus dle nabídky (0,25 l)", category: "Nealko", price: 49 },
  { name: "Džus dle nabídky (0,2 l)", category: "Nealko", price: 25 },
  { name: "Zimní teplý džus", category: "Nealko", price: 75 },
  { name: "Red Bull (0,25 l)", category: "Nealko", price: 45 },

  // ==========================================
  // DOMÁCÍ LIMONÁDY & LEDOVÉ ČAJE (0,5 l)
  // ==========================================
  { name: "Domácí limonáda Malinová (0,5 l)", category: "Limonády a ledové čaje", price: 89 },
  { name: "Domácí limonáda Jahodová (0,5 l)", category: "Limonády a ledové čaje", price: 89 },
  { name: "Domácí limonáda Maracuja (0,5 l)", category: "Limonády a ledové čaje", price: 89 },
  { name: "Domácí limonáda Rakytník (0,5 l)", category: "Limonády a ledové čaje", price: 89 },
  { name: "Domácí limonáda Grep (0,5 l)", category: "Limonády a ledové čaje", price: 89 },
  { name: "Domácí limonáda Bezinka (0,5 l)", category: "Limonády a ledové čaje", price: 89 },
  { name: "Domácí limonáda Pomeranč (0,5 l)", category: "Limonády a ledové čaje", price: 89 },
  { name: "Domácí limonáda Lesní plody (0,5 l)", category: "Limonády a ledové čaje", price: 89 },
  { name: "Ledový čaj Černý (0,5 l)", category: "Limonády a ledové čaje", price: 89 },
  { name: "Ledový čaj Ovocný (0,5 l)", category: "Limonády a ledové čaje", price: 89 },
  { name: "Ledový čaj Zelený (0,5 l)", category: "Limonády a ledové čaje", price: 89 },
  { name: "Ledový čaj dle nabídky (0,2 l)", category: "Limonády a ledové čaje", price: 35 },

  // ==========================================
  // KÁVA A TEPLÉ NÁPOJE
  // ==========================================
  { name: "Espresso Piazza D'oro", category: "Káva a teplé nápoje", price: 55 },
  { name: "Espresso Lungo", category: "Káva a teplé nápoje", price: 55 },
  { name: "Turecká káva", category: "Káva a teplé nápoje", price: 45 },
  { name: "Vídeňská káva se šlehačkou", category: "Káva a teplé nápoje", price: 75 },
  { name: "Caffe Latte Piazza D'oro", category: "Káva a teplé nápoje", price: 75 },
  { name: "Cappuccino Piazza D'oro", category: "Káva a teplé nápoje", price: 65 },
  { name: "Flat white Piazza D'oro", category: "Káva a teplé nápoje", price: 85 },
  { name: "Alžírská káva", category: "Káva a teplé nápoje", price: 85 },
  { name: "Espresso TONIC na ledu", category: "Káva a teplé nápoje", price: 75 },
  { name: "Frappe – ledová káva s mlékem", category: "Káva a teplé nápoje", price: 75 },
  { name: "Mražená káva se zmrzlinou a šlehačkou", category: "Káva a teplé nápoje", price: 95 },
  { name: "Horká čokoláda se šlehačkou", category: "Káva a teplé nápoje", price: 65 },
  { name: "Čaj LEROS dle nabídky", category: "Káva a teplé nápoje", price: 60 },
  { name: "Čaj čerstvý (máta, zázvor)", category: "Káva a teplé nápoje", price: 65 },
  { name: "Grog", category: "Káva a teplé nápoje", price: 60 },
  { name: "Svařáček", category: "Káva a teplé nápoje", price: 85 },

  // ==========================================
  // ALKOHOL (0,04 l)
  // ==========================================
  { name: "Božkov tradiční (0,04 l)", category: "Alkohol", price: 40 },
  { name: "Božkov Peprmint (0,04 l)", category: "Alkohol", price: 40 },
  { name: "Stará myslivecká (0,04 l)", category: "Alkohol", price: 42 },
  { name: "Fernet Stock / citrus (0,04 l)", category: "Alkohol", price: 42 },
  { name: "Becherovka (0,04 l)", category: "Alkohol", price: 55 },
  { name: "Finská vodka (0,04 l)", category: "Alkohol", price: 59 },
  { name: "Republika Exclusiva Božkov (0,04 l)", category: "Alkohol", price: 59 },
  { name: "Captain Morgan (0,04 l)", category: "Alkohol", price: 59 },
  { name: "Bacardi Carta Blanca (0,04 l)", category: "Alkohol", price: 59 },
  { name: "Spišská hruška (0,04 l)", category: "Alkohol", price: 59 },
  { name: "Slivovice Jelínek (0,04 l)", category: "Alkohol", price: 59 },
  { name: "Gin Beefeater / růžový (0,04 l)", category: "Alkohol", price: 59 },
  { name: "Jägermeister (0,04 l)", category: "Alkohol", price: 59 },
  { name: "Tullamore Dew (0,04 l)", category: "Alkohol", price: 69 },
  { name: "Metaxa ***** (0,04 l)", category: "Alkohol", price: 69 },
  { name: "Jameson (0,04 l)", category: "Alkohol", price: 75 },
  { name: "Jack Daniel's (0,04 l)", category: "Alkohol", price: 75 },
  { name: "Jack Daniel's Honey (0,04 l)", category: "Alkohol", price: 79 },
  { name: "Diplomático Reserva Exclusiva (0,04 l)", category: "Alkohol", price: 145 },
  { name: "Plantation (0,04 l)", category: "Alkohol", price: 145 },

  // ==========================================
  // JÍDELNÍ MENU & SPECIALITY
  // ==========================================
  { name: "Polévka dle nabídky", category: "Jídlo", price: 69 },
  { name: "Pečené kolínko (750 g)", category: "Jídlo", price: 299 },
  { name: "Pečené žebírko (500 g)", category: "Jídlo", price: 269 },
  { name: "Rarášci s ďábelskou (200 g)", category: "Jídlo", price: 229 },
  { name: "Řízečky kuřecí / vepřové (300 g)", category: "Jídlo", price: 229 },
  { name: "Řízečky kuřecí / vepřové (600 g)", category: "Jídlo", price: 389 },
  { name: "Smažený sýr, příloha", category: "Jídlo", price: 199 },
  { name: "Kuřecí prsíčko na grilu", category: "Jídlo", price: 249 },
  { name: "Vepřová panenka na grilu", category: "Jídlo", price: 269 },
  { name: "Kachní prso – NOVINKA", category: "Jídlo", price: 289 },
  { name: "Zeleninový salátek s grilovaným camembertem", category: "Jídlo", price: 249 },
  { name: "Zeleninový salátek s grilovaným kuřecím prsem", category: "Jídlo", price: 239 },
  { name: "Zeleninový salátek s grilovaným sýrem HALLOUMI", category: "Jídlo", price: 249 },
  { name: "Omáčka (tatarská, ďábelská, kečup)", category: "Jídlo", price: 20 },

  // ==========================================
  // NOVINKY
  // ==========================================
  { name: "Tlačenka s cibulí a chlebem (150 g)", category: "Jídlo", price: 129 },
  { name: "Kuřecí směs na topince, sýr", category: "Jídlo", price: 139 },
  { name: "Bramborové placičky (3 ks), zelí", category: "Jídlo", price: 139 },
  { name: "Bramborák s klobáskou, zelí", category: "Jídlo", price: 149 },
  { name: "Kuřecí směs v bramboráku, sýr", category: "Jídlo", price: 249 },
  { name: "Pečené kuřecí křidélka (500 g)", category: "Jídlo", price: 249 },
  { name: "Studené prkýnko (800 g)", category: "Jídlo", price: 379 },

  // ==========================================
  // CHUŤOVKY K PIVKU
  // ==========================================
  { name: "Utopenec s cibulí a chlebem", category: "Chuťovky", price: 79 },
  { name: "Klobása, okurek, chléb", category: "Chuťovky", price: 89 },
  { name: "Gothaj s cibulí a chlebem", category: "Chuťovky", price: 89 },
  { name: "Trampské cigáro v bagetě, zelí, okurek", category: "Chuťovky", price: 149 },
  { name: "Nakládaný hermelín, chléb", category: "Chuťovky", price: 149 },
  { name: "Nakládané tvarůžky, opečený chlebík", category: "Chuťovky", price: 159 },
  { name: "Tvarůžkový tataráček, topinky nasucho", category: "Chuťovky", price: 199 },
  { name: "Masový tataráček, topinky", category: "Chuťovky", price: 279 },
  { name: "Hranolky, omáčka", category: "Chuťovky", price: 69 },
  { name: "Americké brambory, omáčka", category: "Chuťovky", price: 79 },
  { name: "Batátové hranolky, omáčka", category: "Chuťovky", price: 89 },
  { name: "Bramborové lupínky s omáčkou", category: "Chuťovky", price: 109 },
  { name: "Bramborové dukátky s omáčkou", category: "Chuťovky", price: 109 },
  { name: "Steakové hranolky s cheddarem, omáčka", category: "Chuťovky", price: 129 },

  // ==========================================
  // DEZERTY & NĚCO K PIVKU (POCHUTINY)
  // ==========================================
  { name: "Cheesecake", category: "Dezerty", price: 89 },
  { name: "Vanilková zmrzlina s malinami a šlehačkou", category: "Dezerty", price: 89 },
  { name: "Tyčinky Havlíky", category: "Pochutiny", price: 39 },
  { name: "Cyrilovy brambůrky", category: "Pochutiny", price: 49 },
  { name: "Arašídy", category: "Pochutiny", price: 49 },
  { name: "Uzené mandle", category: "Pochutiny", price: 69 },
];

async function main() {
  console.log("Začínám nahrávat produkty do databáze...");

  for (const item of products) {
    const existing = await prisma.product.findFirst({
      where: { name: item.name },
    });

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          price: item.price,
          category: item.category,
          isActive: true,
        },
      });
    } else {
      await prisma.product.create({
        data: {
          name: item.name,
          category: item.category,
          price: item.price,
          isActive: true,
        },
      });
    }
  }

  console.log(`Hotovo! Úspěšně nahráno/aktualizováno ${products.length} produktů.`);
}

main()
  .catch((e) => {
    console.error("Chyba při nahrávání produktů:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
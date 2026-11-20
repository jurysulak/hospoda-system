// lib/eet/send.ts
// Odesílání evidovaných tržeb (EetRecord) do EET 2.0 a doposílání neodeslaných.
//
// Nastavení (proměnné prostředí – Vercel / .env, nikdy ne do gitu):
//   EET_ENABLED=1                  zapne evidenci (bez toho se nic nezakládá ani neposílá)
//   EET_ENV=playground|production  cílové prostředí (výchozí playground)
//   EET_EIC=CZ12345678             DIČ / EIČ poplatníka
//   EET_ID_JEDNOTKY=12             číslo evidenční jednotky z DIS+
//   EET_ID_POKL=POKLADNA1          označení pokladny (libovolné, 1–20 znaků)
//   EET_CERT_P12_BASE64=...        pokladní certifikát (.p12) zakódovaný v base64
//   EET_CERT_PASSWORD=...          heslo k .p12
//   EET_OVERENI=1                  (volitelné) ověřovací mód – nic se reálně neeviduje
import { randomUUID } from "crypto";
import forge from "node-forge";
import { prisma } from "@/lib/prisma";
import { SOAP_ACTION, buildSignedEnvelope, formatAmount, formatEetDate, parseResponse } from "./soap";

const URLS = {
  playground: "https://pg.trzbyeet.gov.cz/eet/services/EETServiceSOAP/v4",
  production: "https://trzbyeet.gov.cz/eet/services/EETServiceSOAP/v4",
};

// Mezní doba odezvy – zákon vyžaduje alespoň 2 s.
const TIMEOUT_MS = 4000;

export function eetEnabled(): boolean {
  return process.env.EET_ENABLED === "1";
}

type Config = {
  url: string;
  eic: string;
  idJednotky: string;
  idPokl: string;
  overeni: boolean;
  certDerB64: string;
  keyPem: string;
};

let cachedConfig: Config | null = null;

function loadConfig(): Config {
  if (cachedConfig) return cachedConfig;
  const env = process.env;
  const missing = ["EET_EIC", "EET_ID_JEDNOTKY", "EET_ID_POKL", "EET_CERT_P12_BASE64", "EET_CERT_PASSWORD"].filter(
    (k) => !env[k]
  );
  if (missing.length) throw new Error("Chybí nastavení EET: " + missing.join(", "));

  // Z .p12 vytáhneme certifikát a privátní klíč
  const p12Der = forge.util.decode64(env.EET_CERT_P12_BASE64!.replace(/\s+/g, ""));
  const p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(p12Der), env.EET_CERT_PASSWORD!);
  const keyBag =
    p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0] ??
    p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag]?.[0];
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? [];
  if (!keyBag?.key || certBags.length === 0) throw new Error("Certifikát EET neobsahuje klíč nebo certifikát");

  // Pokladní certifikát = ten, jehož CN je EIČ poplatníka (v .p12 mohou být i certifikáty CA)
  const certBag =
    certBags.find((b) => b.cert?.subject.getField("CN")?.value === env.EET_EIC) ??
    certBags.find((b) => !b.cert?.extensions.find((e: { name: string; cA?: boolean }) => e.name === "basicConstraints" && e.cA)) ??
    certBags[0];

  const certDerB64 = forge.util.encode64(forge.asn1.toDer(forge.pki.certificateToAsn1(certBag.cert!)).getBytes());
  const keyPem = forge.pki.privateKeyToPem(keyBag.key);

  cachedConfig = {
    url: env.EET_ENV === "production" ? URLS.production : URLS.playground,
    eic: env.EET_EIC!,
    idJednotky: env.EET_ID_JEDNOTKY!,
    idPokl: env.EET_ID_POKL!,
    overeni: env.EET_OVERENI === "1",
    certDerB64,
    keyPem,
  };
  return cachedConfig;
}

type SendResult =
  | { status: "SENT"; pok: string | null; test: boolean; warnings: string[] }
  | { status: "PENDING" | "ERROR"; error: string };

// Odešle jednu tržbu. Neháže výjimky – vrací výsledek.
export async function sendTrzba(input: {
  poradCis: string;
  datTrzby: Date;
  amount: number;
  firstSend: boolean;
}): Promise<SendResult> {
  let cfg: Config;
  try {
    cfg = loadConfig();
  } catch (e) {
    return { status: "ERROR", error: e instanceof Error ? e.message : String(e) };
  }

  const envelope = buildSignedEnvelope(
    {
      uuidZpravy: randomUUID(),
      datOdesl: formatEetDate(new Date()),
      prvniZaslani: input.firstSend,
      overeni: cfg.overeni ? true : undefined,
      eicPopl: cfg.eic,
      idJednotky: cfg.idJednotky,
      idPokl: cfg.idPokl,
      poradCis: input.poradCis,
      datTrzby: formatEetDate(input.datTrzby),
      celkTrzba: formatAmount(input.amount),
    },
    cfg.certDerB64,
    cfg.keyPem
  );

  let text: string;
  let httpStatus: number;
  try {
    const res = await fetch(cfg.url, {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: SOAP_ACTION },
      body: envelope,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    httpStatus = res.status;
    text = await res.text();
  } catch (e) {
    // Výpadek spojení / překročení mezní doby odezvy -> doposlat později (do 48 h)
    return { status: "PENDING", error: "Spojení s EET selhalo: " + (e instanceof Error ? e.message : String(e)) };
  }

  const r = parseResponse(text);
  if (r.ok) return { status: "SENT", pok: r.pok, test: r.test, warnings: r.warnings };
  // Kód 0 = ověřovací mód proběhl bez chyb (nic se neeviduje)
  if (r.code === 0) return { status: "SENT", pok: null, test: r.test, warnings: [] };
  // Záporné kódy = dočasná chyba na straně EET, neznámá odpověď / HTTP chyba -> zkusit znovu
  if (r.code < 0) return { status: "PENDING", error: `EET ${r.code} (HTTP ${httpStatus}): ${r.message}` };
  return { status: "ERROR", error: `EET chyba ${r.code}: ${r.message}` };
}

// Odešle (nebo znovu odešle) jeden záznam a uloží výsledek.
export async function processRecord(id: number): Promise<void> {
  const rec = await prisma.eetRecord.findUnique({ where: { id } });
  if (!rec || rec.status === "SENT") return;

  const result = await sendTrzba({
    poradCis: String(rec.id),
    datTrzby: rec.datTrzby,
    amount: rec.amount,
    firstSend: rec.attempts === 0,
  });

  const now = new Date();
  await prisma.eetRecord.update({
    where: { id },
    data:
      result.status === "SENT"
        ? {
            status: "SENT",
            pok: result.pok,
            test: result.test,
            sentAt: now,
            lastAttemptAt: now,
            attempts: { increment: 1 },
            lastError: result.warnings.length ? "Varování: " + result.warnings.join("; ") : null,
          }
        : {
            status: result.status,
            lastError: result.error.slice(0, 500),
            lastAttemptAt: now,
            attempts: { increment: 1 },
          },
  });
}

// Doposlání neodeslaných tržeb (nejstarší první). Chybové (ERROR) jen když retryErrors.
export async function flushPending(limit = 20, retryErrors = false): Promise<{ processed: number }> {
  if (!eetEnabled()) return { processed: 0 };
  const pending = await prisma.eetRecord.findMany({
    where: { status: retryErrors ? { in: ["PENDING", "ERROR"] } : "PENDING" },
    orderBy: { id: "asc" },
    take: limit,
    select: { id: true },
  });
  for (const { id } of pending) {
    await processRecord(id);
  }
  return { processed: pending.length };
}

// Pro volání po zaplacení / stornu: odešle nový záznam a přibalí doposlání starých.
export async function sendNewAndFlush(id: number | null): Promise<void> {
  try {
    if (id !== null) await processRecord(id);
    await flushPending(10);
  } catch (e) {
    console.error("EET odeslání selhalo:", e);
  }
}

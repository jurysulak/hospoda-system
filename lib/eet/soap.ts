// lib/eet/soap.ts
// Sestavení a podpis SOAP zprávy EET 2.0 (rozhraní v4, WS-Security, RSA-SHA256, Exclusive C14N).
// Bez DB – čisté funkce. Formát dle "EET 2.0 – Popis datového rozhraní" v1.2.
import { createHash, createSign } from "crypto";

const NS_SOAPENV = "http://schemas.xmlsoap.org/soap/envelope/";
const NS_V4 = "http://fs.gov.cz/eet/schema/v4";
const NS_WSSE = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd";
const NS_WSU = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd";
const NS_DS = "http://www.w3.org/2000/09/xmldsig#";
const NS_EC = "http://www.w3.org/2001/10/xml-exc-c14n#";
const X509V3 = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3";
const BASE64BIN = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary";

export const SOAP_ACTION = "http://fs.gov.cz/eet/OdeslaniTrzby";

export type Trzba = {
  uuidZpravy: string;
  datOdesl: string; // ISO s časovou zónou, viz formatEetDate
  prvniZaslani: boolean;
  overeni?: boolean;
  eicPopl: string;
  eicPoverujiciho?: string;
  povereniVicePopl?: boolean;
  idJednotky: string;
  idPokl: string;
  poradCis: string;
  datTrzby: string;
  celkTrzba: string; // "123.00"
  urcenoCerpZuct?: string;
  cerpZuct?: string;
};

// Hodnoty jsou omezené na bezpečné ASCII (masky v XSD), escapujeme pro jistotu.
function esc(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

// Atributy bez jmenného prostoru – v kanonické podobě seřazené podle jména.
function attrs(pairs: Record<string, string | undefined>): string {
  return Object.keys(pairs)
    .filter((k) => pairs[k] !== undefined)
    .sort()
    .map((k) => ` ${k}="${esc(pairs[k]!)}"`)
    .join("");
}

function trzbaXml(t: Trzba): string {
  const hlavicka = attrs({
    dat_odesl: t.datOdesl,
    overeni: t.overeni === undefined ? undefined : String(t.overeni),
    prvni_zaslani: String(t.prvniZaslani),
    uuid_zpravy: t.uuidZpravy,
  });
  const data = attrs({
    celk_trzba: t.celkTrzba,
    cerp_zuct: t.cerpZuct,
    dat_trzby: t.datTrzby,
    eic_popl: t.eicPopl,
    eic_poverujiciho: t.eicPoverujiciho,
    id_jednotky: t.idJednotky,
    id_pokl: t.idPokl,
    porad_cis: t.poradCis,
    povereni_vice_popl: t.povereniVicePopl === undefined ? undefined : String(t.povereniVicePopl),
    urceno_cerp_zuct: t.urcenoCerpZuct,
  });
  return `<v4:Trzba><v4:Hlavicka${hlavicka}></v4:Hlavicka><v4:Data${data}></v4:Data></v4:Trzba>`;
}

// Kanonická (exc-c14n, PrefixList "v4") podoba <soapenv:Body> – z ní se počítá digest.
// Jmenné prostory seřazené podle prefixu, pak atribut wsu:Id.
export function canonicalBody(t: Trzba, bodyId: string): string {
  return (
    `<soapenv:Body xmlns:soapenv="${NS_SOAPENV}" xmlns:v4="${NS_V4}" xmlns:wsu="${NS_WSU}" wsu:Id="${bodyId}">` +
    trzbaXml(t) +
    `</soapenv:Body>`
  );
}

// Kanonická podoba <ds:SignedInfo> (exc-c14n, PrefixList "soapenv v4") – ta se podepisuje.
export function canonicalSignedInfo(bodyId: string, digest: string): string {
  return (
    `<ds:SignedInfo xmlns:ds="${NS_DS}" xmlns:soapenv="${NS_SOAPENV}" xmlns:v4="${NS_V4}">` +
    `<ds:CanonicalizationMethod Algorithm="${NS_EC}"><ec:InclusiveNamespaces xmlns:ec="${NS_EC}" PrefixList="soapenv v4"></ec:InclusiveNamespaces></ds:CanonicalizationMethod>` +
    `<ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"></ds:SignatureMethod>` +
    `<ds:Reference URI="#${bodyId}"><ds:Transforms><ds:Transform Algorithm="${NS_EC}"><ec:InclusiveNamespaces xmlns:ec="${NS_EC}" PrefixList="v4"></ec:InclusiveNamespaces></ds:Transform></ds:Transforms>` +
    `<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></ds:DigestMethod><ds:DigestValue>${digest}</ds:DigestValue></ds:Reference>` +
    `</ds:SignedInfo>`
  );
}

export function sha256b64(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("base64");
}

// Kompletní podepsaná SOAP obálka. certDerB64 = pokladní certifikát (DER v base64), keyPem = privátní klíč.
export function buildSignedEnvelope(t: Trzba, certDerB64: string, keyPem: string): string {
  const id = createHash("sha1").update(t.uuidZpravy).digest("hex").toUpperCase();
  const bodyId = `id-${id}`;
  const tokenId = `X509-${id}`;

  const digest = sha256b64(canonicalBody(t, bodyId));
  const signedInfo = canonicalSignedInfo(bodyId, digest);
  const signature = createSign("RSA-SHA256").update(signedInfo, "utf8").sign(keyPem, "base64");

  // SignedInfo vložíme přesně v kanonickém tvaru (redundantní xmlns nevadí, c14n je odstraní)
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<soapenv:Envelope xmlns:soapenv="${NS_SOAPENV}" xmlns:v4="${NS_V4}"><soapenv:Header>` +
    `<wsse:Security xmlns:wsse="${NS_WSSE}" xmlns:wsu="${NS_WSU}" soapenv:mustUnderstand="1">` +
    `<wsse:BinarySecurityToken EncodingType="${BASE64BIN}" ValueType="${X509V3}" wsu:Id="${tokenId}">${certDerB64}</wsse:BinarySecurityToken>` +
    `<ds:Signature xmlns:ds="${NS_DS}">` +
    signedInfo +
    `<ds:SignatureValue>${signature}</ds:SignatureValue>` +
    `<ds:KeyInfo><wsse:SecurityTokenReference><wsse:Reference URI="#${tokenId}" ValueType="${X509V3}"/></wsse:SecurityTokenReference></ds:KeyInfo>` +
    `</ds:Signature></wsse:Security></soapenv:Header>` +
    `<soapenv:Body xmlns:wsu="${NS_WSU}" wsu:Id="${bodyId}">${trzbaXml(t)}</soapenv:Body>` +
    `</soapenv:Envelope>`
  );
}

// Datum ve formátu EET: lokální čas ČR s +01:00 / +02:00, bez milisekund.
export function formatEetDate(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Prague",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23", timeZoneName: "longOffset",
  }).formatToParts(d);
  const p = (type: string) => parts.find((x) => x.type === type)!.value;
  const offset = p("timeZoneName").replace("GMT", "") || "+00:00";
  return `${p("year")}-${p("month")}-${p("day")}T${p("hour")}:${p("minute")}:${p("second")}${offset}`;
}

// Celé koruny -> "123.00" / "-123.00" (bez "-0.00")
export function formatAmount(kc: number): string {
  if (!Number.isInteger(kc)) throw new Error("Částka musí být celé číslo Kč");
  return kc === 0 ? "0.00" : `${kc}.00`;
}

export type EetResponse =
  | { ok: true; pok: string; test: boolean; warnings: string[] }
  | { ok: false; code: number; message: string; test: boolean };

export function parseResponse(xml: string): EetResponse {
  const test = /\btest="(true|1)"/.test(xml);
  const pok = xml.match(/<(?:\w+:)?Potvrzeni\b[^>]*\bpok="([^"]+)"/);
  const warnings = [...xml.matchAll(/<(?:\w+:)?Varovani\b[^>]*kod_varov="(\d+)"[^>]*>([^<]*)</g)].map(
    (m) => `${m[1]}: ${m[2].trim()}`
  );
  if (pok) return { ok: true, pok: pok[1], test, warnings };
  const chyba = xml.match(/<(?:\w+:)?Chyba\b[^>]*\bkod="(-?\d+)"[^>]*>([^<]*)</);
  if (chyba) return { ok: false, code: Number(chyba[1]), message: chyba[2].trim(), test };
  return { ok: false, code: -1000, message: "Neznámá odpověď EET: " + xml.slice(0, 200), test };
}

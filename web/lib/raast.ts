/**
 * Phase E · E3 — Raast QR (design: ERP-PHASE-E-DESIGN.md §3).
 *
 * Two honest paths exist, in this order of trust (§3.1):
 *   Path 1 — the bank-issued QR IMAGE (the `raastQrImage` brand
 *            asset): the owner's own bank generated it; the app
 *            prints it verbatim. Zero format risk. Preferred
 *            whenever it exists.
 *   Path 2 — the GENERATED SBP P2P code (this module): a payload
 *            built from the owner's IBAN alone, following the
 *            State Bank's published P2P template. There is NO
 *            generated P2M merchant QR in this app — a merchant
 *            payload's account information is acquirer-issued
 *            (§9.2.2 of the standard) and cannot be minted from
 *            an IBAN; claiming otherwise would ship a code that
 *            banking apps reject at the scheme layer.
 *
 * PROVISIONAL STATUS (§3.6 release gate): the generated path is
 * NOT yet conformance-verified. The one framing detail the
 * published standard leaves implicit — whether the variable
 * objects (03/05/06) carry an explicit length element — is
 * pinned by the owner's own bank-app QR before this path may be
 * called verified (design §3.3). Until then the framing lives
 * in the ONE seam below (`RAAST_FRAMING`), the UI copy says
 * "pending verification" in both languages, and the bank-issued
 * image is the documented, verified route. Nothing in this
 * module, its UI, or PRODUCTION.md claims otherwise.
 *
 * This module is pure string math: it imports no store, no
 * Firestore, no posting path. Phase E posts NOTHING (§12.3).
 */

/* ================================================================== */
/* THE FRAMING SEAM — the one place the unverified detail lives.       */
/*                                                                     */
/* The SBP P2P template fixes each object's id, order, format and      */
/* length; the fixed-length objects (00/01/02 = 2, 04 = 24, 10 = 4)   */
/* are unambiguous in a concatenated stream. The variable objects      */
/* (03 FI name, 05 amount, 06 particulars) are where an                */
/* implementer must confirm the bank-generated framing:                */
/*                                                                     */
/*   mode "bare" — id + value concatenated (the §3.3 builder           */
/*     sketch's own shape); the parser recovers variable objects       */
/*     by fixed positions and next-object scanning, and the CRC        */
/*     covers the payload up to and including the CRC object's         */
/*     id "10" (§3.2's words).                                         */
/*   mode "tlv" — EMV-style id + 2-digit length + value for every      */
/*     object; the CRC covers the payload up to and including          */
/*     the CRC object's id AND length ("1004"), as EMV QRCPS           */
/*     computes it.                                                    */
/*                                                                     */
/* Builder, parser and CRC input ALL derive from this constant via     */
/* frameObject()/crcObjectFor() below — flipping `mode` here flips     */
/* the whole path consistently, which is what the owner's real         */
/* bank QR (design §3.3's conformance fixture) will pin. Do not         */
/* hard-code framing anywhere else; the harness asserts this seam      */
/* is the only place the decision exists.                              */
/* ================================================================== */

export type RaastFramingMode = "bare" | "tlv";

export const RAAST_FRAMING: {
  mode: RaastFramingMode;
  status: "provisional" | "confirmed";
  /** What pins the mode: null until the owner's bank-app QR has
   *  been decoded and matched byte-for-byte (design §3.3/§3.6). */
  pinnedBy: string | null;
} = {
  // The design §3.3 builder sketch's shape, shipped as the
  // provisional default. Flipping this one word to "tlv" is the
  // ENTIRE change if the owner's bank QR says EMV framing.
  mode: "bare",
  status: "provisional",
  pinnedBy: null,
};

/* ================================================================== */
/* Errors                                                              */
/* ================================================================== */

/** Builder-guard failure. `code` is machine-readable so callers
 *  (Settings, the harness) never parse message text. */
export class RaastError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "RaastError";
    this.code = code;
  }
}

/* ================================================================== */
/* IBAN — full ISO 13616 validation for Pakistani IBANs (§3.2)         */
/* ================================================================== */

export type PkIbanError =
  | "empty"
  | "alias"
  | "notPk"
  | "badLength"
  | "badStructure"
  | "badChecksum";

export type PkIbanResult =
  | { ok: true; iban: string }
  | { ok: false; code: PkIbanError };

/** Entry normalisation: strip spaces and dashes, upper-case.
 *  IBANs are dictated and copied in grouped form; the stored and
 *  payload forms are always the bare 24 characters. */
export function normaliseIbanInput(raw: string): string {
  return raw.replace(/[\s-]+/g, "").toUpperCase();
}

/** ISO 13616 mod-97 over an already-normalised IBAN, computed in
 *  7-digit chunks so no big-integer arithmetic is needed. */
export function ibanMod97(iban: string): number {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let digits = "";
  for (const ch of rearranged) {
    digits += /[A-Z]/.test(ch)
      ? String(ch.charCodeAt(0) - 55)
      : ch;
  }
  let rem = 0;
  for (let i = 0; i < digits.length; i += 7) {
    rem = Number(String(rem) + digits.slice(i, i + 7)) % 97;
  }
  return rem;
}

/** Compose a checksum-valid PK IBAN from its parts (bank code +
 *  16-digit account). Exists for fixtures and tests — the
 *  checksum computation is the standard's own (98 − mod-97 of
 *  the IBAN with "00" check digits). */
export function pkIbanWithCheckDigits(
  bankCode: string,
  accountNumber: string
): string {
  const bban = bankCode.toUpperCase() + accountNumber;
  const numeric = (bban + "PK00")
    .split("")
    .map((ch) => (/[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch))
    .join("");
  let rem = 0;
  for (let i = 0; i < numeric.length; i += 7) {
    rem = Number(String(rem) + numeric.slice(i, i + 7)) % 97;
  }
  return `PK${String(98 - rem).padStart(2, "0")}${bban}`;
}

/** True when the input is a phone-number-shaped string — the
 *  Raast *alias* form. The published P2P template's beneficiary
 *  object is the IBAN; there is NO alias object to put a phone
 *  number in (§3.2), so an alias is refused with its own error
 *  code and an explanation, never silently reformatted. */
export function looksLikeRaastAlias(normalised: string): boolean {
  if (!/^\+?\d+$/.test(normalised)) return false;
  const digits = normalised.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

/**
 * Full validation, at entry, before Settings will save (§3.2):
 * Pakistani IBAN = PK + 2 check digits + 4-letter bank code +
 * 16-digit account = 24 chars; the structure must match AND the
 * ISO 13616 mod-97 checksum must pass — a typo'd digit is
 * refused at the desk, not discovered by a customer's failed
 * scan. A non-PK IBAN is refused (Raast is domestic).
 */
export function validatePkIban(
  raw: string | null | undefined
): PkIbanResult {
  const s = normaliseIbanInput(raw ?? "");
  if (s.length === 0) return { ok: false, code: "empty" };
  if (looksLikeRaastAlias(s)) return { ok: false, code: "alias" };
  if (!s.startsWith("PK")) return { ok: false, code: "notPk" };
  if (s.length !== 24) return { ok: false, code: "badLength" };
  if (!/^PK\d{2}[A-Z]{4}\d{16}$/.test(s)) {
    return { ok: false, code: "badStructure" };
  }
  if (ibanMod97(s) !== 1) return { ok: false, code: "badChecksum" };
  return { ok: true, iban: s };
}

/** Display grouping in fours — the form IBANs are read and
 *  dictated in, on paper and on screen: "PK36 SCBL 0000 …". */
export function groupIban(iban: string): string {
  return iban.replace(/(.{4})/g, "$1 ").trim();
}

/** The demo's sample IBAN (§7): the published IBAN-registry
 *  example for Pakistan — checksum-valid, obviously a format
 *  sample rather than a customer's account. It exists ONLY so
 *  the demo's Settings preview can render a code; it is never
 *  seeded into settings and never prints on a real bill. */
export const RAAST_SAMPLE_IBAN = "PK36SCBL0000001123456702";

/* ================================================================== */
/* FI name (payload object 03)                                         */
/* ================================================================== */

export function validateRaastFiName(
  raw: string | null | undefined
): { ok: true; value: string } | { ok: false; code: "fiTooLong" | "fiBadChars" } {
  const value = (raw ?? "").trim();
  if (value.length === 0) return { ok: true, value: "" };
  if (value.length > 25) return { ok: false, code: "fiTooLong" };
  // The payload's character class is ASCII (`ans`); non-ASCII
  // text in a banking payload is an encoding hazard (§3.3).
  if (!/^[\x20-\x7E]+$/.test(value)) return { ok: false, code: "fiBadChars" };
  return { ok: true, value };
}

/* ================================================================== */
/* CRC-16/CCITT (EMV QRCPS flavour: poly 0x1021, init 0xFFFF,          */
/* no reflection, no final xor — "CCITT-FALSE").                       */
/* ================================================================== */

export function crc16Ccitt(input: string): number {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= (input.charCodeAt(i) & 0xff) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc;
}

/** The CRC as it appears in the payload: 4 uppercase hex chars. */
export function crc16CcittHex(input: string): string {
  return crc16Ccitt(input).toString(16).toUpperCase().padStart(4, "0");
}

/* ================================================================== */
/* Framing — every framed byte flows through these two functions,      */
/* parameterised by the seam (or an explicit override for tests).      */
/* ================================================================== */

function frameObject(id: string, value: string, mode: RaastFramingMode): string {
  return mode === "tlv"
    ? id + String(value.length).padStart(2, "0") + value
    : id + value;
}

/** The CRC object itself, framed; its VALUE is the checksum of
 *  everything before it INCLUDING the CRC object's framing
 *  prefix — "10" in bare mode (§3.2), "1004" in TLV mode (the
 *  EMV QRCPS convention). Both readings live here, in the seam,
 *  and nowhere else. */
function crcObjectFor(prefix: string, mode: RaastFramingMode): string {
  const crcInput = mode === "tlv" ? prefix + "1004" : prefix + "10";
  const crc = crc16CcittHex(crcInput);
  return mode === "tlv" ? "10" + "04" + crc : "10" + crc;
}

/* ================================================================== */
/* Amount + particulars (§3.3)                                         */
/* ================================================================== */

/** Object 05 formatting: numeric, at most one decimal point, no
 *  thousands separators, trailing zeros trimmed ("1500",
 *  "1500.5"). Bills are whole rupees in this app, so the common
 *  case is an integer string; an amount that needs ≥ 10 chars
 *  is refused at composition — the builder never emits an
 *  over-length object. */
export function formatRaastAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new RaastError("badAmount", `Raast amount must be positive, got ${amount}`);
  }
  const rounded = Math.round(amount * 100) / 100;
  let s = String(rounded);
  if (/[eE]/.test(s)) {
    s = rounded.toFixed(2).replace(/\.?0+$/, "");
  }
  if (s.length > 10) {
    throw new RaastError(
      "amountTooLong",
      `Raast amount "${s}" exceeds the object's 10 characters`
    );
  }
  return s;
}

/** The dynamic bill particulars (object 06): the bill label and
 *  nothing else — bill numbers are ASCII by construction, and
 *  free text (Urdu especially) is an encoding hazard the
 *  standard's `ans` class does not bless (§3.3). */
export function billParticulars(billNo: number | string): string {
  return `Bill #${billNo}`;
}

function assertParticulars(particulars: string): void {
  if (particulars.length > 30 || !/^[\x20-\x7E]+$/.test(particulars)) {
    throw new RaastError(
      "badParticulars",
      "Raast particulars must be ≤ 30 ASCII characters"
    );
  }
}

/* ================================================================== */
/* The P2P payload builder (§3.3)                                      */
/* ================================================================== */

export interface RaastP2pInput {
  /** A validated PK IBAN (run validatePkIban first — the
   *  builder re-checks and refuses rather than emitting a
   *  payload around a bad IBAN). */
  iban: string;
  fiName?: string;
  /** Present ⇒ a DYNAMIC code (initiation "12"); absent ⇒
   *  static ("11") and the payer keys the amount. */
  amount?: number;
  /** ASCII, ≤ 30. Bills pass billParticulars(billNo). */
  particulars?: string;
}

export function buildRaastP2pPayload(
  input: RaastP2pInput,
  framing: RaastFramingMode = RAAST_FRAMING.mode
): string {
  const v = validatePkIban(input.iban);
  if (v.ok === false) {
    throw new RaastError(`iban:${v.code}`, `Refusing to build a Raast payload for an invalid IBAN (${v.code})`);
  }
  const fi = validateRaastFiName(input.fiName);
  if (fi.ok === false) {
    throw new RaastError(`fiName:${fi.code}`, `Invalid Raast FI name (${fi.code})`);
  }
  const dynamic = input.amount !== undefined && input.amount !== null;
  if (input.particulars !== undefined) assertParticulars(input.particulars);

  let payload = "";
  payload += frameObject("00", "02", framing); // Payload Format Indicator — the P2P value
  payload += frameObject("01", dynamic ? "12" : "11", framing); // Point of Initiation
  payload += frameObject("02", "30", framing); // Scheme Identifier — Raast
  if (fi.value) payload += frameObject("03", fi.value, framing);
  payload += frameObject("04", v.iban, framing);
  if (dynamic) payload += frameObject("05", formatRaastAmount(input.amount as number), framing);
  if (input.particulars !== undefined) {
    payload += frameObject("06", input.particulars, framing);
  }
  payload += crcObjectFor(payload, framing);
  return payload;
}

/* ================================================================== */
/* The round-trip parser (§3.3) — written with the builder so "it      */
/* parses, with the CRC verifying" is a proof, not a hope. It also     */
/* decodes bank-generated codes, which is the §3.3 conformance         */
/* fixture's tool when the owner's real QR arrives.                    */
/* ================================================================== */

export interface RaastP2pObjects {
  pfi: string;
  initiation: string;
  scheme: string;
  fiName?: string;
  iban: string;
  amount?: string;
  particulars?: string;
  crc: string;
}

export type RaastParseResult =
  | { ok: true; objects: RaastP2pObjects }
  | { ok: false; code: string };

const OBJECT_ORDER = ["00", "01", "02", "03", "04", "05", "06", "10"];

function parseTlv(payload: string): RaastParseResult {
  const found: Record<string, { value: string; start: number }> = {};
  let pos = 0;
  let lastOrder = -1;
  while (pos < payload.length) {
    const id = payload.slice(pos, pos + 2);
    const lenStr = payload.slice(pos + 2, pos + 4);
    if (!OBJECT_ORDER.includes(id) || !/^\d{2}$/.test(lenStr)) {
      return { ok: false, code: "framing" };
    }
    const order = OBJECT_ORDER.indexOf(id);
    if (order <= lastOrder || found[id]) return { ok: false, code: "order" };
    lastOrder = order;
    const len = Number(lenStr);
    const value = payload.slice(pos + 4, pos + 4 + len);
    if (value.length !== len) return { ok: false, code: "truncated" };
    found[id] = { value, start: pos };
    pos += 4 + len;
    if (id === "10") break;
  }
  if (pos !== payload.length) return { ok: false, code: "trailing" };
  return finishParse(payload, found, "tlv");
}

function parseBare(payload: string): RaastParseResult {
  const found: Record<string, { value: string; start: number }> = {};
  let pos = 0;
  const expect = (id: string, len: number): string | null => {
    if (payload.slice(pos, pos + 2) !== id) return null;
    const value = payload.slice(pos + 2, pos + 2 + len);
    if (value.length !== len) return null;
    found[id] = { value, start: pos };
    pos += 2 + len;
    return value;
  };
  if (expect("00", 2) === null) return { ok: false, code: "framing" };
  if (expect("01", 2) === null) return { ok: false, code: "framing" };
  if (expect("02", 2) === null) return { ok: false, code: "framing" };
  // Object 03 is variable: its value ends where object 04 begins.
  // Object 04 is fixed ("04" + "PK" + 22 chars) and the CRC
  // object closes the payload, so candidate splits are tried in
  // order and the one whose tail parses AND whose CRC verifies
  // is the parse — deterministic for any well-formed payload.
  if (payload.slice(pos, pos + 2) === "03") {
    const fiStart = pos + 2;
    let accepted: RaastParseResult | null = null;
    for (let i = fiStart + 1; i + 26 <= payload.length - 6; i++) {
      if (payload.slice(i, i + 2) !== "04" || payload.slice(i + 2, i + 4) !== "PK") continue;
      if (i - fiStart > 25) break;
      const trial: Record<string, { value: string; start: number }> = {
        ...found,
        "03": { value: payload.slice(fiStart, i), start: pos },
        "04": { value: payload.slice(i + 2, i + 26), start: i },
      };
      const rest = parseBareTail(payload, i + 26, trial);
      if (rest.ok) {
        accepted = rest;
        break;
      }
    }
    return accepted ?? { ok: false, code: "framing" };
  }
  if (expect("04", 24) === null) return { ok: false, code: "framing" };
  return parseBareTail(payload, pos, found);
}

/** Objects 05/06/10 after the IBAN, bare framing. The amount
 *  is a [0-9.] run — and the NEXT object's id is digits too, so
 *  the run alone cannot delimit it (an amount of 4880.73 in
 *  front of object 06 reads as one long digit string). The
 *  parser therefore tries each well-formed amount prefix in
 *  ascending order and accepts the split whose remainder
 *  parses as whole objects ending in a verifying CRC — object
 *  boundaries, not the digit run, decide. (This ambiguity is
 *  exactly what the framing seam exists to retire: the owner's
 *  bank QR pins the real framing, §3.3.) The particulars run
 *  to the CRC object, always the payload's last 6 characters
 *  ("10" + 4 hex). */
function parseBareTail(
  payload: string,
  pos: number,
  found: Record<string, { value: string; start: number }>
): RaastParseResult {
  if (payload.slice(pos, pos + 2) === "05") {
    const run = /^[0-9.]+/.exec(payload.slice(pos + 2))?.[0] ?? "";
    for (let len = 1; len <= Math.min(run.length, 10); len++) {
      const amount = run.slice(0, len);
      if (!/^\d+(\.\d+)?$/.test(amount)) continue;
      const trial: Record<string, { value: string; start: number }> = {
        ...found,
        "05": { value: amount, start: pos },
      };
      const rest = parseBareAfterAmount(payload, pos + 2 + len, trial);
      if (rest.ok) return rest;
    }
    return { ok: false, code: "framing" };
  }
  return parseBareAfterAmount(payload, pos, found);
}

function parseBareAfterAmount(
  payload: string,
  pos: number,
  found: Record<string, { value: string; start: number }>
): RaastParseResult {
  let p = pos;
  if (payload.slice(p, p + 2) === "06") {
    const crcStart = payload.length - 6;
    if (crcStart <= p + 2) return { ok: false, code: "framing" };
    const value = payload.slice(p + 2, crcStart);
    if (value.length > 30) return { ok: false, code: "framing" };
    found["06"] = { value, start: p };
    p = crcStart;
  }
  if (payload.slice(p, p + 2) !== "10" || p + 6 !== payload.length) {
    return { ok: false, code: "framing" };
  }
  found["10"] = { value: payload.slice(p + 2, p + 6), start: p };
  return finishParse(payload, found, "bare");
}

function finishParse(
  payload: string,
  found: Record<string, { value: string; start: number }>,
  framing: RaastFramingMode
): RaastParseResult {
  for (const required of ["00", "01", "02", "04", "10"]) {
    if (!found[required]) return { ok: false, code: "missing" };
  }
  if (found["00"].value !== "02") return { ok: false, code: "pfi" };
  if (found["02"].value !== "30") return { ok: false, code: "scheme" };
  const ibanCheck = validatePkIban(found["04"].value);
  if (ibanCheck.ok === false) return { ok: false, code: `iban:${ibanCheck.code}` };
  const crcStart = found["10"].start;
  const expected =
    framing === "tlv"
      ? crc16CcittHex(payload.slice(0, crcStart) + "1004")
      : crc16CcittHex(payload.slice(0, crcStart) + "10");
  if (expected !== found["10"].value.toUpperCase()) {
    return { ok: false, code: "crc" };
  }
  const objects: RaastP2pObjects = {
    pfi: found["00"].value,
    initiation: found["01"].value,
    scheme: found["02"].value,
    iban: found["04"].value,
    crc: found["10"].value,
  };
  if (found["03"]) objects.fiName = found["03"].value;
  if (found["05"]) objects.amount = found["05"].value;
  if (found["06"]) objects.particulars = found["06"].value;
  return { ok: true, objects };
}

export function parseRaastP2pPayload(
  payload: string,
  framing: RaastFramingMode = RAAST_FRAMING.mode
): RaastParseResult {
  if (typeof payload !== "string" || payload.length < 20) {
    return { ok: false, code: "framing" };
  }
  return framing === "tlv" ? parseTlv(payload) : parseBare(payload);
}

/* ================================================================== */
/* Print resolution (§3.4/§3.5) — which Raast block, if any, a         */
/* document prints. Pure, so the slot rules are harness-asserted       */
/* rather than screenshot-hoped. The bank image WINS whenever it       */
/* exists (it is the FI-issued artifact); the generated code is        */
/* the fallback; a document outside bill/quotation/order/poster        */
/* never carries one (§1.5's matrix).                                  */
/* ================================================================== */

export const RAAST_QR_SIZE_MM: Record<"s" | "m" | "l", number> = {
  s: 22,
  m: 28,
  l: 36,
};

/** Thermal heads get at most the medium size (§3.5), whatever
 *  the template asks for. */
export const RAAST_THERMAL_MAX_MM = 28;

export type RaastDocContext =
  | { kind: "bill"; billNo?: number | string | null; total?: number | null; dynamic: boolean }
  | { kind: "quotation" | "order" | "poster" }
  | { kind: "other" };

export interface RaastPrintInput {
  /** The design's showRaastQr for documents; the counter poster
   *  is an explicit owner action and passes true. */
  enabled: boolean;
  imagePresent: boolean;
  iban?: string | null;
  fiName?: string | null;
  doc: RaastDocContext;
  size: "s" | "m" | "l";
  thermal: boolean;
}

export type RaastPrintBlock =
  | { path: "none" }
  | { path: "image"; sizeMm: number; iban: string | null }
  | {
      path: "generated";
      sizeMm: number;
      iban: string;
      payload: string;
      dynamic: boolean;
    };

export function raastQrSizeMm(size: "s" | "m" | "l", thermal: boolean): number {
  const mm = RAAST_QR_SIZE_MM[size];
  return thermal ? Math.min(mm, RAAST_THERMAL_MAX_MM) : mm;
}

/** The resolver never throws: a payload that cannot be built
 *  (an amount too large for object 05, a pathological bill
 *  label) degrades dynamic → static → none rather than breaking
 *  the sheet it rides on. The builder itself stays strict for
 *  callers who compose directly. */
function safeBuild(input: RaastP2pInput): string | null {
  try {
    return buildRaastP2pPayload(input);
  } catch {
    return null;
  }
}

export function resolveRaastBlock(input: RaastPrintInput): RaastPrintBlock {
  if (!input.enabled || input.doc.kind === "other") return { path: "none" };
  const sizeMm = raastQrSizeMm(input.size, input.thermal);
  const check = validatePkIban(input.iban);
  const validIban = check.ok ? check.iban : null;

  if (input.imagePresent) {
    // Path 1 — the bank's own artifact, verbatim. The IBAN text
    // line rides along only when the IBAN is also on record
    // (the image alone does not tell us its digits).
    return { path: "image", sizeMm, iban: validIban };
  }
  if (!validIban) return { path: "none" };

  const fi = validateRaastFiName(input.fiName);
  const fiName = fi.ok ? fi.value : "";
  const base: RaastP2pInput = { iban: validIban, fiName: fiName || undefined };
  const staticBlock = (payload: string | null): RaastPrintBlock =>
    payload
      ? { path: "generated", sizeMm, iban: validIban, dynamic: false, payload }
      : { path: "none" };

  if (input.doc.kind === "bill") {
    const particulars = billParticulars(input.doc.billNo ?? "");
    const total = input.doc.total ?? 0;
    if (input.doc.dynamic && total > 0) {
      // Dynamic (§3.4): the bill TOTAL (what the bill charges —
      // paper cannot know later repayments) + the bill number
      // in particulars, so the shop can reconcile the payment.
      const payload = safeBuild({ ...base, amount: total, particulars });
      if (payload) {
        return { path: "generated", sizeMm, iban: validIban, dynamic: true, payload };
      }
    }
    // Static-mode bills, nothing-payable bills (a zero total
    // never embeds as an amount — the payer keys it), and any
    // dynamic build that refused: the static code, particulars
    // still carrying the bill number when they fit.
    return staticBlock(
      safeBuild({ ...base, particulars }) ?? safeBuild(base)
    );
  }
  // Quotations, orders, the poster: no amount object, ever — a
  // quotation's total is an estimate (B §7) and must not
  // harden into a payment demand (§3.4).
  return staticBlock(safeBuild(base));
}

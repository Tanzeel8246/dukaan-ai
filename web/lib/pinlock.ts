/**
 * Dukaan AI — device-local PIN lock (Phase E · E4/E5, design §4).
 *
 * WHAT THIS IS — AND IS NOT (§4.1, the honesty before the design):
 * a counter-privacy convenience. It stops a walk-up hand — a
 * customer, a child, a visitor at an unattended till — from
 * browsing the shop's books on a device that is already signed
 * in. It is NOT an account-security boundary: anyone who knows
 * the account password can remove the PIN (§4.5), and the real
 * protection of the shop's data remains Firebase Auth + the
 * Firestore rules, exactly as before.
 *
 * THE MODEL (§4.2): the record lives in localStorage ON THIS
 * DEVICE ONLY. Never in Firestore, never in ShopSettings, never
 * in the demo blob — this module imports nothing from the store,
 * Firebase or any posting path, and its only storage seam is an
 * injected {getItem,setItem,removeItem} so the harness exercises
 * the exact browser code path against a fake storage. Per device
 * is literal: each device holds its own record (or none).
 *
 * HASHING (§4.3): PBKDF2-HMAC-SHA256 via WebCrypto SubtleCrypto,
 * 150,000 iterations, 16-byte random salt, 32-byte output. The
 * subtle seam is injectable (default globalThis.crypto.subtle)
 * so the harness — Node's crypto.webcrypto.subtle — runs the
 * same code, known-answer vectors included. 150k iterations is
 * friction, not strength: it makes offline dictionary grinding
 * of a 4–6 digit space slower per guess than a bare hash; no
 * claim beyond that is made anywhere.
 */

/* ------------------------------------------------------------------ */
/* Shapes (§4.2)                                                       */
/* ------------------------------------------------------------------ */

export const PIN_RECORD_KEY = "dukaan-ai-pinlock";
export const PIN_PREFS_KEY = "dukaan-ai-pinlock-prefs";
export const PIN_GUARD_KEY = "dukaan-ai-pinlock-guard";

export const PIN_ITERATIONS = 150_000;
export const PIN_SALT_BYTES = 16;
export const PIN_HASH_BYTES = 32;

export type PinDigits = 4 | 5 | 6;
export type PinIdleMinutes = 0 | 1 | 5 | 15 | 30;

export interface PinLockRecord {
  v: 1;
  /** base64 — 16 random bytes, fresh per record */
  salt: string;
  /** base64 — PBKDF2-HMAC-SHA256(pin, salt, iterations), 32 bytes */
  hash: string;
  /** 150_000 at set time (createPinRecord always writes this) */
  iterations: number;
  /** the length chosen at set time */
  digits: PinDigits;
  /** ISO instant — display only */
  setAt: string;
}

export interface PinLockPrefs {
  /** 0 = lock on launch only */
  idleMinutes: PinIdleMinutes;
  /** E5 sensitive-action gating — default false (§4.6) */
  gateSensitive: boolean;
}

export const DEFAULT_PIN_PREFS: PinLockPrefs = {
  idleMinutes: 5,
  gateSensitive: false,
};

/** Device-local guess friction state (§4.4) — counters only,
 *  never the PIN, persisted so a reload cannot reset a pause. */
export interface PinGuardState {
  failures: number;
  pausedUntil: number;
}

export const DEFAULT_PIN_GUARD: PinGuardState = { failures: 0, pausedUntil: 0 };

/* ------------------------------------------------------------------ */
/* base64 (own implementation — no Buffer, no btoa dependency)         */
/* ------------------------------------------------------------------ */

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function bytesToBase64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += B64[a >> 2];
    out += B64[((a & 0x03) << 4) | (b >> 4)];
    out += i + 1 < bytes.length ? B64[((b & 0x0f) << 2) | (c >> 6)] : "=";
    out += i + 2 < bytes.length ? B64[c & 0x3f] : "=";
  }
  return out;
}

export function base64ToBytes(text: string): Uint8Array | null {
  if (typeof text !== "string" || text.length % 4 !== 0) return null;
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(text)) return null;
  const out: number[] = [];
  for (let i = 0; i < text.length; i += 4) {
    const v = [0, 1, 2, 3].map((j) => {
      const ch = text[i + j];
      return ch === "=" ? 0 : B64.indexOf(ch);
    });
    if (v.some((n) => n < 0)) return null;
    out.push((v[0] << 2) | (v[1] >> 4));
    if (text[i + 2] !== "=") out.push(((v[1] & 0x0f) << 4) | (v[2] >> 2));
    if (text[i + 3] !== "=") out.push(((v[2] & 0x03) << 6) | v[3]);
  }
  return new Uint8Array(out);
}

/* ------------------------------------------------------------------ */
/* Crypto seam (§4.3 — injectable SubtleCrypto)                        */
/* ------------------------------------------------------------------ */

export interface PinSubtle {
  importKey(
    format: "raw",
    keyData: Uint8Array,
    algorithm: { name: "PBKDF2" },
    extractable: boolean,
    keyUsages: Array<"deriveBits">
  ): Promise<unknown>;
  deriveBits(
    algorithm: { name: "PBKDF2"; hash: "SHA-256"; salt: Uint8Array; iterations: number },
    baseKey: unknown,
    length: number
  ): Promise<ArrayBuffer>;
}

export function defaultSubtle(): PinSubtle | null {
  const subtle = (globalThis as { crypto?: { subtle?: unknown } }).crypto?.subtle;
  return (subtle as PinSubtle | undefined) ?? null;
}

export function defaultRandomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  const c = (
    globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }
  ).crypto;
  if (c?.getRandomValues) c.getRandomValues(out);
  return out;
}

const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s);

/** The one derivation every path funnels through — create AND
 *  verify — so the harness's known-answer vectors pin the exact
 *  production code path. */
export async function derivePinBits(
  pin: string,
  salt: Uint8Array,
  iterations: number,
  subtle: PinSubtle
): Promise<Uint8Array> {
  const key = await subtle.importKey("raw", utf8(pin), { name: "PBKDF2" }, false, [
    "deriveBits",
  ]);
  const bits = await subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    PIN_HASH_BYTES * 8
  );
  return new Uint8Array(bits);
}

/** Constant-time over the decoded bytes (both sides are the
 *  fixed 32-byte hash length, which is public by construction). */
export function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export function isValidPinFormat(pin: string): boolean {
  return /^[0-9]{4,6}$/.test(pin);
}

/* ------------------------------------------------------------------ */
/* Create / verify                                                     */
/* ------------------------------------------------------------------ */

export interface PinCryptoDeps {
  subtle?: PinSubtle | null;
  randomBytes?: (n: number) => Uint8Array;
  now?: () => Date;
}

export async function createPinRecord(
  pin: string,
  deps: PinCryptoDeps = {}
): Promise<PinLockRecord> {
  if (!isValidPinFormat(pin)) throw new Error("pin/format");
  const subtle = deps.subtle ?? defaultSubtle();
  if (!subtle) throw new Error("pin/no-crypto");
  const randomBytes = deps.randomBytes ?? defaultRandomBytes;
  const salt = randomBytes(PIN_SALT_BYTES);
  const hash = await derivePinBits(pin, salt, PIN_ITERATIONS, subtle);
  return {
    v: 1,
    salt: bytesToBase64(salt),
    hash: bytesToBase64(hash),
    iterations: PIN_ITERATIONS,
    digits: pin.length as PinDigits,
    setAt: (deps.now ? deps.now() : new Date()).toISOString(),
  };
}

export async function verifyPin(
  record: PinLockRecord,
  pin: string,
  subtle?: PinSubtle | null
): Promise<boolean> {
  if (!isValidPinFormat(pin) || pin.length !== record.digits) return false;
  const salt = base64ToBytes(record.salt);
  const expected = base64ToBytes(record.hash);
  if (!salt || !expected || expected.length !== PIN_HASH_BYTES) return false;
  const sub = subtle ?? defaultSubtle();
  if (!sub) return false;
  const actual = await derivePinBits(pin, salt, record.iterations, sub);
  return timingSafeEqualBytes(actual, expected);
}

/* ------------------------------------------------------------------ */
/* Storage (injected seam — the browser passes localStorage)           */
/* ------------------------------------------------------------------ */

export interface PinStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function parsePinRecord(raw: string | null): PinLockRecord | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<PinLockRecord>;
    if (o.v !== 1) return null;
    if (typeof o.salt !== "string" || typeof o.hash !== "string") return null;
    const salt = base64ToBytes(o.salt);
    const hash = base64ToBytes(o.hash);
    if (!salt || salt.length !== PIN_SALT_BYTES) return null;
    if (!hash || hash.length !== PIN_HASH_BYTES) return null;
    if (typeof o.iterations !== "number" || !(o.iterations > 0)) return null;
    if (o.digits !== 4 && o.digits !== 5 && o.digits !== 6) return null;
    if (typeof o.setAt !== "string") return null;
    return o as PinLockRecord;
  } catch {
    return null;
  }
}

function parsePinPrefs(raw: string | null): PinLockPrefs {
  if (!raw) return { ...DEFAULT_PIN_PREFS };
  try {
    const o = JSON.parse(raw) as Partial<PinLockPrefs>;
    const idle = o.idleMinutes;
    return {
      idleMinutes:
        idle === 0 || idle === 1 || idle === 5 || idle === 15 || idle === 30
          ? idle
          : DEFAULT_PIN_PREFS.idleMinutes,
      gateSensitive: o.gateSensitive === true,
    };
  } catch {
    return { ...DEFAULT_PIN_PREFS };
  }
}

function parsePinGuard(raw: string | null): PinGuardState {
  if (!raw) return { ...DEFAULT_PIN_GUARD };
  try {
    const o = JSON.parse(raw) as Partial<PinGuardState>;
    return {
      failures:
        typeof o.failures === "number" && o.failures > 0 ? Math.floor(o.failures) : 0,
      pausedUntil:
        typeof o.pausedUntil === "number" && o.pausedUntil > 0 ? o.pausedUntil : 0,
    };
  } catch {
    return { ...DEFAULT_PIN_GUARD };
  }
}

export function loadPinRecord(storage: PinStorage): PinLockRecord | null {
  return parsePinRecord(storage.getItem(PIN_RECORD_KEY));
}
export function savePinRecord(storage: PinStorage, record: PinLockRecord): void {
  storage.setItem(PIN_RECORD_KEY, JSON.stringify(record));
}
export function clearPinRecord(storage: PinStorage): void {
  storage.removeItem(PIN_RECORD_KEY);
}
export function loadPinPrefs(storage: PinStorage): PinLockPrefs {
  return parsePinPrefs(storage.getItem(PIN_PREFS_KEY));
}
export function savePinPrefs(storage: PinStorage, prefs: PinLockPrefs): void {
  storage.setItem(PIN_PREFS_KEY, JSON.stringify(prefs));
}
export function loadPinGuard(storage: PinStorage): PinGuardState {
  return parsePinGuard(storage.getItem(PIN_GUARD_KEY));
}
export function savePinGuard(storage: PinStorage, guard: PinGuardState): void {
  storage.setItem(PIN_GUARD_KEY, JSON.stringify(guard));
}
export function clearPinGuard(storage: PinStorage): void {
  storage.removeItem(PIN_GUARD_KEY);
}

/* ------------------------------------------------------------------ */
/* Friction schedule (§4.4 — a pure function, honestly friction)        */
/* ------------------------------------------------------------------ */

/** Pause (ms) that applies once `consecutiveFailures` is reached:
 *  free below 5; at 5 a 30-second pause; the pause grows per
 *  further block of 5 — 30s → 2 minutes → 5-minute cap. */
export function frictionPauseMs(consecutiveFailures: number): number {
  if (consecutiveFailures < 5) return 0;
  const block = Math.floor((consecutiveFailures - 5) / 5);
  const schedule = [30_000, 120_000, 300_000];
  return schedule[Math.min(block, schedule.length - 1)];
}

export function applyPinFailure(guard: PinGuardState, now: number): PinGuardState {
  const failures = guard.failures + 1;
  const pause = frictionPauseMs(failures);
  return { failures, pausedUntil: pause > 0 ? now + pause : guard.pausedUntil };
}

export function applyPinSuccess(): PinGuardState {
  return { failures: 0, pausedUntil: 0 };
}

export function pinPauseRemainingMs(guard: PinGuardState, now: number): number {
  return Math.max(0, guard.pausedUntil - now);
}

/* ------------------------------------------------------------------ */
/* Lock state machine (§4.4 — pure reducer)                            */
/* ------------------------------------------------------------------ */

export interface PinLockState {
  locked: boolean;
  lastActivityAt: number;
}

export const initialPinLockState: PinLockState = { locked: false, lastActivityAt: 0 };

export type PinLockEvent =
  | { type: "launch"; hasRecord: boolean; now: number }
  | { type: "activity"; now: number }
  | { type: "check"; now: number; idleMinutes: PinIdleMinutes }
  | { type: "lockNow" }
  | { type: "unlock"; now: number };

/**
 * launch: a device WITH a record opens locked (§4.4).
 * activity: any pointer/keyboard activity while unlocked moves
 *   the idle epoch; while locked it changes nothing (a locked
 *   screen does not quietly extend its own deadline — unlock
 *   is the only way out).
 * check: the idle verdict, evaluated by the shell's timer and
 *   again when a hidden tab returns — a deadline that passed
 *   while the tab was hidden/frozen locks on return, because
 *   hidden time counts toward idle exactly like visible time.
 *   idleMinutes 0 = launch-only, check never locks.
 */
export function pinLockReducer(state: PinLockState, event: PinLockEvent): PinLockState {
  switch (event.type) {
    case "launch":
      return { locked: event.hasRecord, lastActivityAt: event.now };
    case "activity":
      return state.locked ? state : { ...state, lastActivityAt: event.now };
    case "check": {
      if (state.locked || event.idleMinutes === 0) return state;
      return event.now - state.lastActivityAt >= event.idleMinutes * 60_000
        ? { ...state, locked: true }
        : state;
    }
    case "lockNow":
      return { ...state, locked: true };
    case "unlock":
      return { locked: false, lastActivityAt: event.now };
  }
}

/* ------------------------------------------------------------------ */
/* E5 — sensitive-action gating (§4.6)                                 */
/* ------------------------------------------------------------------ */

/** The gate applies ONLY when this device has a PIN record AND
 *  the owner turned the pref on — otherwise every gated action
 *  behaves exactly as it did before E5 (no hidden dependency
 *  on a device feature). Payroll/loan money actions are
 *  deliberately NOT gated (§4.6). */
export function pinGateRequired(prefs: PinLockPrefs, hasRecord: boolean): boolean {
  return hasRecord && prefs.gateSensitive;
}

export type PinChallengeOutcome = "pass" | "fail" | "cancel" | "not-run";

/** The composition seam as a pure decision: a gated write is
 *  composed exactly when the gate is not required (today's
 *  behaviour) or the challenge passed. A failed or cancelled
 *  challenge composes NOTHING. */
export function gateAllows(
  required: boolean,
  outcome: PinChallengeOutcome
): boolean {
  if (!required) return true;
  return outcome === "pass";
}

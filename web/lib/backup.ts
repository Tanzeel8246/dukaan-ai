/**
 * Phase G · G6 — full-business backup & restore (design §9).
 *
 * Pure — no Firebase imports (the harness compiles this file, and
 * the Dart port in flutter-app/lib/core/backup.dart mirrors it
 * function-for-function against shared fixtures).
 *
 * The doctrine (§3.7, §9): a business's data is the shopkeeper's
 * property. Export is owner-only, assembles from the owner's own
 * reads (no platform access is involved or needed), and is
 * available in EVERY plan state — trial, active, grace, read-only,
 * suspended — because reads are never plan-gated. Restore is the
 * mirror discipline: a transplant into a NEW, EMPTY business
 * namespace only. A live book is never overwritten (append-only
 * means exactly that), so the planner refuses any target whose
 * existing documents are not a byte-identical subset of the
 * backup — which is also what makes an interrupted restore
 * resumable by simply running it again.
 *
 * Restore composes ZERO journal entries: journal docs are written
 * as documents with their original ids and bytes, into an empty
 * book. The plan snapshot and counters of the TARGET business are
 * NOT transplanted (the registry is the new business's own birth
 * record; the exported registry/counters ride in the file as the
 * owner's records, and the target's counter baseline is reconciled
 * afterwards through the ordinary Plan & usage path, exactly like
 * a migration baseline). Memberships and pending invites ARE
 * re-keyed to the target business, so the team lands in the
 * restored shop with the roles the backup carries. The owner's
 * switcher index (userMemberships) is a self-healing cache and is
 * deliberately not restored — it rebuilds from the membership
 * docs on each member's next sign-in (G1).
 */

/* ------------------------------------------------------------------ */
/* SHA-256 (self-contained, synchronous)                               */
/* ------------------------------------------------------------------ */

/* The journal fingerprint must be computable identically in the
 * browser, in Node (the harness) and in Dart (package:crypto), so
 * the web lib carries its own SHA-256 rather than depending on
 * async WebCrypto. Correctness is not assumed: the harness pins
 * this implementation against the published known-answer vectors
 * AND against the frozen seed fingerprint (the B1-recorded
 * e17e5bda…1168), which a wrong round function cannot reproduce. */

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function utf8Bytes(str: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let cp = str.charCodeAt(i);
    if (cp >= 0xd800 && cp <= 0xdbff && i + 1 < str.length) {
      const lo = str.charCodeAt(i + 1);
      if (lo >= 0xdc00 && lo <= 0xdfff) {
        cp = 0x10000 + ((cp - 0xd800) * 0x400 + (lo - 0xdc00));
        i++;
      }
    }
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) {
      out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    } else if (cp < 0x10000) {
      out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    } else {
      out.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f)
      );
    }
  }
  return out;
}

export function sha256Hex(text: string): string {
  const bytes = utf8Bytes(text);
  const bitLenHi = Math.floor((bytes.length * 8) / 0x100000000);
  const bitLenLo = (bytes.length * 8) >>> 0;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let shift = 24; shift >= 0; shift -= 8) bytes.push((bitLenHi >>> shift) & 0xff);
  for (let shift = 24; shift >= 0; shift -= 8) bytes.push((bitLenLo >>> shift) & 0xff);

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const w = new Array<number>(64);
  const rotr = (x: number, n: number) => ((x >>> n) | (x << (32 - n))) >>> 0;

  for (let block = 0; block < bytes.length; block += 64) {
    for (let i = 0; i < 16; i++) {
      const j = block + i * 4;
      w[i] = ((bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3]) >>> 0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = (rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)) >>> 0;
      const s1 = (rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)) >>> 0;
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const s1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const t1 = (h + s1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const s0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const t2 = (s0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }
  const hex = (n: number) => n.toString(16).padStart(8, "0");
  return [h0, h1, h2, h3, h4, h5, h6, h7].map(hex).join("");
}

/* ------------------------------------------------------------------ */
/* Shapes                                                              */
/* ------------------------------------------------------------------ */

export type JsonDoc = Record<string, unknown>;

export const BACKUP_KIND = "dukaan-ai/business-backup";
export const BACKUP_FORMAT_VERSION = 1;
export const BACKUP_PHASE_VERSION = "G6";

/** The tenant namespace: the owner doc plus these 38 collections —
 *  products + sales (held separately by the store) and the store's
 *  COLLECTION_NAMES. A harness source check pins this list against
 *  StoreProvider's subscriptions so the backup can never silently
 *  miss a collection the app writes. (35 through Phase G/H3;
 *  Phase H · WhatsApp adds the three wa* collections — a backup
 *  that forgot the marketing history would not be a backup,
 *  design §5.2.) */
export const TENANT_COLLECTIONS = [
  "products",
  "sales",
  "bills",
  "suppliers",
  "purchases",
  "supplierPayments",
  "expenses",
  "credits",
  "customers",
  "returns",
  "adjustments",
  "dayCloses",
  "cashEntries",
  "journal",
  "accounts",
  "taxSlabs",
  "periods",
  "quotations",
  "saleOrders",
  "deliveryChallans",
  "purchaseOrders",
  "notes",
  "purchaseReturns",
  "cheques",
  "warehouses",
  "stockLevels",
  "stockTransfers",
  "boms",
  "productionOrders",
  "jobs",
  "employees",
  "attendance",
  "payrollRuns",
  "loans",
  "branding",
  "waTemplates",
  "waCampaigns",
  "waSends",
] as const;

export interface KeyedDoc {
  key: string;
  data: JsonDoc;
}

export interface BackupPlatformSlice {
  registry: JsonDoc | null;
  members: KeyedDoc[];
  invites: KeyedDoc[];
  counters: JsonDoc | null;
  stats: JsonDoc | null;
  events: KeyedDoc[];
  payments: KeyedDoc[];
  /** Phase H · H3: the business's published storefront snapshot
   *  (keyed by its slug — the doc id) and its store-order inbox
   *  (keyed by doc id), filtered to this business at the seam
   *  like events/payments (invariant 5: the owner exports
   *  everything Phase H adds — storefront orders named there).
   *  Null/empty on pre-H3 files, which stay verifiable. */
  storefront: KeyedDoc | null;
  storeOrders: KeyedDoc[];
}

export interface BackupManifest {
  schemaVersion: number;
  businessId: string;
  exportedAt: string;
  /** Per-tenant-collection document counts (owner doc excluded). */
  counts: Record<string, number>;
  /** registry/counters/stats as 0|1; members/invites/events/payments as n. */
  platformCounts: Record<string, number>;
  /** Owner doc (1) + every tenant document. Platform slices excluded. */
  totalDocs: number;
  journalCount: number;
  journalFingerprint: string;
}

export interface BusinessBackup {
  kind: typeof BACKUP_KIND;
  formatVersion: number;
  phaseVersion: string;
  exportedBy: string;
  exportedAt: string;
  manifest: BackupManifest;
  owner: JsonDoc;
  collections: Record<string, JsonDoc[]>;
  platform: BackupPlatformSlice;
}

export interface BackupSource {
  businessId: string;
  exportedAt: string;
  exportedBy: string;
  owner: JsonDoc;
  collections: Partial<Record<string, JsonDoc[]>>;
  platform: BackupPlatformSlice;
}

/* ------------------------------------------------------------------ */
/* Canonical JSON + the journal fingerprint                            */
/* ------------------------------------------------------------------ */

/** Deterministic JSON: object keys sorted recursively, arrays in
 *  order. Used ONLY for document-identity comparisons (restore's
 *  subset test) — never for the journal fingerprint, whose bytes
 *  are the B1 normalization below. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return "[" + value.map((v) => canonicalJson(v)).join(",") + "]";
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return (
    "{" +
    keys.map((k) => JSON.stringify(k) + ":" + canonicalJson(obj[k])).join(",") +
    "}"
  );
}

export function docsEqual(a: unknown, b: unknown): boolean {
  return canonicalJson(a) === canonicalJson(b);
}

/**
 * The journal fingerprint, computed the harness way (the B1
 * normalization): each entry with its wall-clock `ts` dropped —
 * every other field, in its stored order — JSON-serialized and
 * SHA-256'd. Fed the frozen seed journal in generation order this
 * returns e17e5bda…1168; the harness asserts exactly that, so the
 * backup manifest's fingerprint and the audit's frozen identity
 * are one and the same computation.
 */
export function journalFingerprint(journal: JsonDoc[]): string {
  const normalized = journal.map((e) => {
    const { ts: _ts, ...rest } = e as Record<string, unknown>;
    return rest;
  });
  return sha256Hex(JSON.stringify(normalized));
}

/** The export's canonical journal order: the production store's
 *  own order (ts ascending; the snapshot's document order breaks
 *  ties, which is document id). Sorting here makes the exported
 *  file — and therefore its fingerprint — independent of the
 *  reader's return order. */
export function sortJournalDocs(docs: JsonDoc[]): JsonDoc[] {
  return [...docs].sort((a, b) => {
    const ta = String(a.ts ?? "");
    const tb = String(b.ts ?? "");
    if (ta !== tb) return ta < tb ? -1 : 1;
    const ia = String(a.id ?? "");
    const ib = String(b.id ?? "");
    return ia < ib ? -1 : ia > ib ? 1 : 0;
  });
}

function sortById(docs: JsonDoc[]): JsonDoc[] {
  return [...docs].sort((a, b) => {
    const ia = String(a.id ?? "");
    const ib = String(b.id ?? "");
    return ia < ib ? -1 : ia > ib ? 1 : 0;
  });
}

function sortKeyed(docs: KeyedDoc[]): KeyedDoc[] {
  return [...docs].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

/* ------------------------------------------------------------------ */
/* Assembly                                                            */
/* ------------------------------------------------------------------ */

/**
 * Assemble the backup file from the owner's own reads. Platform
 * events/payments are filtered to THIS business here, at the lib
 * seam — even a caller that hands over an unfiltered query result
 * cannot leak another business's platform records into the file
 * (the §9 slice rule, enforced where the file is born).
 */
export function assembleBackup(src: BackupSource): BusinessBackup {
  const collections: Record<string, JsonDoc[]> = {};
  const counts: Record<string, number> = {};
  let totalDocs = 1; // the owner doc
  for (const name of TENANT_COLLECTIONS) {
    const raw = src.collections[name] ?? [];
    const docs = name === "journal" ? sortJournalDocs(raw) : sortById(raw);
    collections[name] = docs;
    counts[name] = docs.length;
    totalDocs += docs.length;
  }
  const ownEvents = src.platform.events.filter(
    (e) => (e.data as JsonDoc).businessId === src.businessId
  );
  const ownPayments = src.platform.payments.filter(
    (p) => (p.data as JsonDoc).businessId === src.businessId
  );
  const ownStoreOrders = (src.platform.storeOrders ?? []).filter(
    (o) => (o.data as JsonDoc).businessId === src.businessId
  );
  const ownStorefront =
    src.platform.storefront &&
    (src.platform.storefront.data as JsonDoc).businessId === src.businessId
      ? src.platform.storefront
      : null;
  const platform: BackupPlatformSlice = {
    registry: src.platform.registry,
    members: sortKeyed(src.platform.members),
    invites: sortKeyed(src.platform.invites),
    counters: src.platform.counters,
    stats: src.platform.stats,
    events: sortKeyed(ownEvents),
    payments: sortKeyed(ownPayments),
    storefront: ownStorefront,
    storeOrders: sortKeyed(ownStoreOrders),
  };
  const manifest: BackupManifest = {
    schemaVersion: BACKUP_FORMAT_VERSION,
    businessId: src.businessId,
    exportedAt: src.exportedAt,
    counts,
    platformCounts: {
      registry: platform.registry ? 1 : 0,
      members: platform.members.length,
      invites: platform.invites.length,
      counters: platform.counters ? 1 : 0,
      stats: platform.stats ? 1 : 0,
      events: platform.events.length,
      payments: platform.payments.length,
      storefront: platform.storefront ? 1 : 0,
      storeOrders: platform.storeOrders.length,
    },
    totalDocs,
    journalCount: collections.journal.length,
    journalFingerprint: journalFingerprint(collections.journal),
  };
  return {
    kind: BACKUP_KIND,
    formatVersion: BACKUP_FORMAT_VERSION,
    phaseVersion: BACKUP_PHASE_VERSION,
    exportedBy: src.exportedBy,
    exportedAt: src.exportedAt,
    manifest,
    owner: src.owner,
    collections,
    platform,
  };
}

/** The manifest recomputed from a file's own payload — the
 *  verification half of the pair. Returns null when the payload
 *  is too malformed to recompute over. */
export function computeManifest(file: BusinessBackup): BackupManifest | null {
  try {
    const collections: Record<string, JsonDoc[]> = {};
    const counts: Record<string, number> = {};
    let totalDocs = 1;
    for (const name of TENANT_COLLECTIONS) {
      const raw = file.collections?.[name];
      // Phase H · H6 (audit fix 1): an ABSENT collection counts as
      // empty — a backup written before that collection existed
      // (e.g. a pre-WhatsApp file carrying no waTemplates array at
      // all) stays verifiable and restorable, the Dart twin's
      // tolerance (§9: an old backup is a data right, not a format
      // error). A collection PRESENT but not an array is corruption.
      if (raw !== undefined && !Array.isArray(raw)) return null;
      const docs = Array.isArray(raw) ? raw : [];
      collections[name] = docs;
      counts[name] = docs.length;
      totalDocs += docs.length;
    }
    const p = file.platform;
    if (!p || !Array.isArray(p.members) || !Array.isArray(p.invites) ||
        !Array.isArray(p.events) || !Array.isArray(p.payments)) return null;
    /* H3 tolerance: a pre-H3 file carries no storefront slice —
     * absent reads as empty, in the recompute as in the export. */
    const pOrders = (p as BackupPlatformSlice).storeOrders ?? [];
    if (!Array.isArray(pOrders)) return null;
    const pFront = (p as BackupPlatformSlice).storefront ?? null;
    if (pFront !== null &&
        (typeof pFront !== "object" || typeof pFront.key !== "string" ||
         typeof pFront.data !== "object" || pFront.data === null)) return null;
    return {
      schemaVersion: BACKUP_FORMAT_VERSION,
      businessId: file.manifest.businessId,
      exportedAt: file.exportedAt,
      counts,
      platformCounts: {
        registry: p.registry ? 1 : 0,
        members: p.members.length,
        invites: p.invites.length,
        counters: p.counters ? 1 : 0,
        stats: p.stats ? 1 : 0,
        events: p.events.length,
        payments: p.payments.length,
        storefront: pFront ? 1 : 0,
        storeOrders: pOrders.length,
      },
      totalDocs,
      journalCount: collections.journal.length,
      journalFingerprint: journalFingerprint(collections.journal),
    };
  } catch {
    return null;
  }
}

export type BackupVerifyProblem =
  | "not-a-backup"
  | "unknown-format"
  | "manifest-mismatch";

export type BackupVerifyResult =
  | { ok: true; backup: BusinessBackup }
  | { ok: false; problem: BackupVerifyProblem };

/**
 * Verify a parsed file BEFORE anything is written: it must be a
 * backup, of a format version this build knows, whose payload
 * recomputes to its own manifest exactly (every collection count,
 * the platform counts, the total, and the journal fingerprint).
 * Any edit — a count changed, a journal line's amount changed, a
 * document dropped — breaks the recompute and is refused here.
 */
export function verifyBackup(file: unknown): BackupVerifyResult {
  if (!file || typeof file !== "object" || Array.isArray(file)) {
    return { ok: false, problem: "not-a-backup" };
  }
  const f = file as BusinessBackup;
  if (f.kind !== BACKUP_KIND || !f.manifest || typeof f.manifest !== "object") {
    return { ok: false, problem: "not-a-backup" };
  }
  if (f.formatVersion !== BACKUP_FORMAT_VERSION ||
      f.manifest.schemaVersion !== BACKUP_FORMAT_VERSION) {
    return { ok: false, problem: "unknown-format" };
  }
  if (!f.owner || typeof f.owner !== "object" || Array.isArray(f.owner) ||
      typeof f.manifest.businessId !== "string" || f.manifest.businessId === "" ||
      typeof f.exportedAt !== "string") {
    return { ok: false, problem: "not-a-backup" };
  }
  const recomputed = computeManifest(f);
  if (!recomputed) return { ok: false, problem: "not-a-backup" };
  /* A pre-H3 file's stored platformCounts lack the H3 keys; the
   * comparison defaults them to 0 so a G6-era backup still
   * verifies and restores (its storefront slice is empty). */
  const storedPlatformCounts = {
    storefront: 0,
    storeOrders: 0,
    ...(f.manifest.platformCounts as Record<string, number>),
  };
  /* Phase H · H6 (audit fix 1): a pre-WhatsApp file's stored counts
   * lack the three WhatsApp-era collections entirely — default them
   * to 0 exactly as the platform counts above default the H3 keys,
   * so a G6-era backup verifies (and restores with those collections
   * empty). Any REAL disagreement still refuses below. */
  const storedCounts = {
    waTemplates: 0,
    waCampaigns: 0,
    waSends: 0,
    ...(f.manifest.counts as Record<string, number>),
  };
  if (canonicalJson(recomputed.counts) !== canonicalJson(storedCounts) ||
      canonicalJson(recomputed.platformCounts) !== canonicalJson(storedPlatformCounts) ||
      recomputed.totalDocs !== f.manifest.totalDocs ||
      recomputed.journalCount !== f.manifest.journalCount ||
      recomputed.journalFingerprint !== f.manifest.journalFingerprint) {
    return { ok: false, problem: "manifest-mismatch" };
  }
  return { ok: true, backup: f };
}

/* ------------------------------------------------------------------ */
/* Restore planning                                                    */
/* ------------------------------------------------------------------ */

export type RestoreWrite =
  | { kind: "set"; path: string; data: JsonDoc }
  | { kind: "add"; collection: string; data: JsonDoc };

export type RestoreRefusal =
  | "not-a-backup"
  | "unknown-format"
  | "manifest-mismatch"
  | "target-not-empty";

export interface RestoreTargetState {
  /** The target namespace's current owner doc (null if absent). */
  owner: JsonDoc | null;
  /** The target namespace's current documents, per collection. */
  collections: Partial<Record<string, JsonDoc[]>>;
  /** The target business's current membership docs. */
  members: KeyedDoc[];
  /** The target business's current invite docs. */
  invites: KeyedDoc[];
  /** Phase H · H3: the target business's OWN current storefront
   *  doc (any slug), or null. A target that already has a public
   *  face is not an empty business for restore purposes. */
  storefront?: KeyedDoc | null;
  /** Phase H · H3: the target business's current inbox docs. */
  storeOrders?: KeyedDoc[];
}

export type RestorePlan =
  | {
      ok: true;
      writes: RestoreWrite[];
      /** Documents already present byte-identical (a resumed run). */
      skipped: number;
      /** True when a previous run already completed this restore. */
      alreadyRestored: boolean;
      event: JsonDoc | null;
    }
  | {
      ok: false;
      reason: RestoreRefusal;
      /** For target-not-empty: the conflicting document paths. */
      conflicts: string[];
      writes: [];
    };

/**
 * Plan a restore of `file` into the business `targetBusinessId`,
 * whose probed current state is `target`. The refusal truth
 * table, in evaluation order:
 *
 *  1. not a backup / unknown format / manifest does not verify —
 *     the verifyBackup ladder, before the target is even read.
 *  2. target-not-empty — the target holds ANY tenant document
 *     that is not byte-identical to the backup's document with
 *     the same id (an edited entry, a foreign entry, an extra
 *     document in any collection). The owner doc alone never
 *     refuses: a fresh namespace is born with a default owner
 *     doc, and the transplant replaces it (written LAST, so the
 *     source shop's period lock in its owner doc can never gate
 *     the restore's own dated creates against the target's
 *     still-open book).
 *
 * A target whose documents are all byte-identical subsets of the
 * backup (a fresh namespace, or an interrupted restore) plans
 * exactly the missing remainder — the resume case. A target that
 * already holds the whole backup plans zero writes and reports
 * `alreadyRestored` (no second restore.performed event is
 * written for a restore already recorded).
 */
export function planRestore(input: {
  file: unknown;
  targetBusinessId: string;
  target: RestoreTargetState;
  actorUid: string;
  nowISO: string;
}): RestorePlan {
  const v = verifyBackup(input.file);
  if (!v.ok) {
    /* (the cast: this repo compiles with strictNullChecks off, under
     * which truthiness does not narrow the union) */
    const problem = (v as { ok: false; problem: BackupVerifyProblem }).problem;
    return { ok: false, reason: problem, conflicts: [], writes: [] };
  }
  const backup = (v as { ok: true; backup: BusinessBackup }).backup;
  const targetId = input.targetBusinessId;

  /* ---- the subset test: every existing target document must be
   * the backup's own document, byte for byte ---- */
  const conflicts: string[] = [];
  const backupIndex = new Map<string, Map<string, JsonDoc>>();
  for (const name of TENANT_COLLECTIONS) {
    const m = new Map<string, JsonDoc>();
    // H6 (audit fix 1): an absent collection restores as empty.
    for (const d of backup.collections[name] ?? []) m.set(String(d.id ?? ""), d);
    backupIndex.set(name, m);
  }
  for (const name of TENANT_COLLECTIONS) {
    const targetDocs = input.target.collections[name] ?? [];
    const mine = backupIndex.get(name)!;
    for (const d of targetDocs) {
      const id = String(d.id ?? "");
      const src = mine.get(id);
      if (!src || !docsEqual(src, d)) {
        conflicts.push(`users/${targetId}/${name}/${id}`);
      }
    }
  }
  /* memberships + invites obey the same subset rule: a member or
   * invite the target gained on its own (or with different data)
   * is the target's own act, and the transplant will not silently
   * overwrite it. */
  const backupMembers = new Map(backup.platform.members.map((m) => [m.key, m.data]));
  for (const m of input.target.members) {
    const src = backupMembers.get(m.key);
    if (!src || !docsEqual(src, m.data)) {
      conflicts.push(`businessMembers/${targetId}/members/${m.key}`);
    }
  }
  const backupInvites = new Map(backup.platform.invites.map((m) => [m.key, m.data]));
  for (const inv of input.target.invites) {
    const src = backupInvites.get(inv.key);
    if (!src || !docsEqual(src, inv.data)) {
      conflicts.push(`businessInvites/${targetId}/invites/${inv.key}`);
    }
  }
  /* the storefront obeys the same subset rule, keyed by slug: a
   * target whose public face is a DIFFERENT slug — or the same
   * slug with different content — already has a store of its own,
   * and the transplant will not grow it a second one. */
  const backupFront = backup.platform.storefront ?? null;
  const targetFront = input.target.storefront ?? null;
  if (targetFront) {
    if (!backupFront || targetFront.key !== backupFront.key ||
        !docsEqual(backupFront.data, targetFront.data)) {
      conflicts.push(`storefronts/${targetFront.key}`);
    }
  }
  const backupOrders = new Map(
    (backup.platform.storeOrders ?? []).map((o) => [o.key, o.data])
  );
  for (const o of input.target.storeOrders ?? []) {
    const src = backupOrders.get(o.key);
    if (!src || !docsEqual(src, o.data)) {
      conflicts.push(`storeOrders/${o.key}`);
    }
  }
  if (conflicts.length > 0) {
    return { ok: false, reason: "target-not-empty", conflicts, writes: [] };
  }

  /* ---- the remainder: every backup document the target lacks -- */
  const writes: RestoreWrite[] = [];
  let skipped = 0;
  const targetIndex = new Map<string, Set<string>>();
  for (const name of TENANT_COLLECTIONS) {
    targetIndex.set(
      name,
      new Set((input.target.collections[name] ?? []).map((d) => String(d.id ?? "")))
    );
  }
  for (const name of TENANT_COLLECTIONS) {
    for (const d of backup.collections[name] ?? []) {
      const id = String(d.id ?? "");
      if (targetIndex.get(name)!.has(id)) {
        skipped++;
      } else {
        writes.push({ kind: "set", path: `users/${targetId}/${name}/${id}`, data: d });
      }
    }
  }
  /* memberships + invites re-keyed to the target business
   * (identical existing ones are the resume case — skipped) */
  const targetMemberKeys = new Set(input.target.members.map((m) => m.key));
  for (const m of backup.platform.members) {
    if (targetMemberKeys.has(m.key)) {
      skipped++;
    } else {
      writes.push({
        kind: "set",
        path: `businessMembers/${targetId}/members/${m.key}`,
        data: m.data,
      });
    }
  }
  const targetInviteKeys = new Set(input.target.invites.map((m) => m.key));
  for (const inv of backup.platform.invites) {
    if (targetInviteKeys.has(inv.key)) {
      skipped++;
    } else {
      writes.push({
        kind: "set",
        path: `businessInvites/${targetId}/invites/${inv.key}`,
        data: inv.data,
      });
    }
  }
  /* the storefront snapshot + the inbox restore as documents at
   * their own top-level paths (the slug is the snapshot's path;
   * identical existing docs are the resume case — skipped) */
  if (backupFront) {
    if (targetFront && targetFront.key === backupFront.key) {
      skipped++;
    } else {
      writes.push({
        kind: "set",
        path: `storefronts/${backupFront.key}`,
        data: backupFront.data,
      });
    }
  }
  const targetOrderKeys = new Set((input.target.storeOrders ?? []).map((o) => o.key));
  for (const o of backup.platform.storeOrders ?? []) {
    if (targetOrderKeys.has(o.key)) {
      skipped++;
    } else {
      writes.push({ kind: "set", path: `storeOrders/${o.key}`, data: o.data });
    }
  }
  /* the owner doc lands LAST among the data writes (see the
   * truth-table note above) */
  const ownerDiffers = !input.target.owner || !docsEqual(input.target.owner, backup.owner);
  if (ownerDiffers) {
    writes.push({ kind: "set", path: `users/${targetId}`, data: backup.owner });
  }

  const alreadyRestored = writes.length === 0;
  const event: JsonDoc | null = alreadyRestored
    ? null
    : {
        businessId: targetId,
        kind: "restore.performed",
        actor: input.actorUid,
        at: input.nowISO,
        detail: {
          sourceBusinessId: backup.manifest.businessId,
          exportedAt: backup.exportedAt,
          formatVersion: backup.formatVersion,
          docsWritten: writes.length,
          journalCount: backup.manifest.journalCount,
          journalFingerprint: backup.manifest.journalFingerprint,
        },
      };
  if (event) {
    writes.push({ kind: "add", collection: "businessEvents", data: event });
  }
  return { ok: true, writes, skipped, alreadyRestored, event };
}

/* ------------------------------------------------------------------ */
/* In-memory applier (the harness's executor; mirrors the clients')    */
/* ------------------------------------------------------------------ */

export interface NamespaceState {
  owner: JsonDoc | null;
  collections: Record<string, JsonDoc[]>;
  members: KeyedDoc[];
  invites: KeyedDoc[];
  events: JsonDoc[];
  /** Phase H · H3: the restored storefront snapshot + inbox. */
  storefront: KeyedDoc | null;
  storeOrders: KeyedDoc[];
}

export function emptyNamespace(): NamespaceState {
  const collections: Record<string, JsonDoc[]> = {};
  for (const name of TENANT_COLLECTIONS) collections[name] = [];
  return {
    owner: null, collections, members: [], invites: [], events: [],
    storefront: null, storeOrders: [],
  };
}

function upsertDoc(docs: JsonDoc[], doc: JsonDoc): JsonDoc[] {
  const id = String(doc.id ?? "");
  const i = docs.findIndex((d) => String(d.id ?? "") === id);
  if (i < 0) return [...docs, doc];
  const next = [...docs];
  next[i] = doc;
  return next;
}

function upsertKeyed(docs: KeyedDoc[], entry: KeyedDoc): KeyedDoc[] {
  const i = docs.findIndex((d) => d.key === entry.key);
  if (i < 0) return [...docs, entry];
  const next = [...docs];
  next[i] = entry;
  return next;
}

/** Apply a restore plan's writes to an in-memory namespace. The
 *  clients' executors perform the same writes against Firestore
 *  in plan order (batched; the event write is the plan's last). */
export function applyRestoreWrites(
  ns: NamespaceState,
  targetBusinessId: string,
  writes: RestoreWrite[]
): NamespaceState {
  const next: NamespaceState = {
    owner: ns.owner,
    collections: { ...ns.collections },
    members: [...ns.members],
    invites: [...ns.invites],
    events: [...ns.events],
    storefront: ns.storefront ?? null,
    storeOrders: [...(ns.storeOrders ?? [])],
  };
  const userPrefix = `users/${targetBusinessId}/`;
  const memberPrefix = `businessMembers/${targetBusinessId}/members/`;
  const invitePrefix = `businessInvites/${targetBusinessId}/invites/`;
  for (const w of writes) {
    if (w.kind === "add") {
      if (w.collection === "businessEvents") next.events = [...next.events, w.data];
      continue;
    }
    if (w.path === `users/${targetBusinessId}`) {
      next.owner = w.data;
    } else if (w.path.startsWith(userPrefix)) {
      const rest = w.path.slice(userPrefix.length);
      const slash = rest.indexOf("/");
      const name = rest.slice(0, slash);
      next.collections[name] = upsertDoc(next.collections[name] ?? [], w.data);
    } else if (w.path.startsWith(memberPrefix)) {
      next.members = upsertKeyed(next.members, {
        key: w.path.slice(memberPrefix.length),
        data: w.data,
      });
    } else if (w.path.startsWith(invitePrefix)) {
      next.invites = upsertKeyed(next.invites, {
        key: w.path.slice(invitePrefix.length),
        data: w.data,
      });
    } else if (w.path.startsWith("storefronts/")) {
      next.storefront = { key: w.path.slice("storefronts/".length), data: w.data };
    } else if (w.path.startsWith("storeOrders/")) {
      next.storeOrders = upsertKeyed(next.storeOrders, {
        key: w.path.slice("storeOrders/".length),
        data: w.data,
      });
    }
  }
  return next;
}

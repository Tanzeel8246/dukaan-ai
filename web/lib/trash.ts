/**
 * Dukaan AI — Fix Round 2 · FR2 — clear-to-trash (pure lib).
 *
 * The owner's ask: clearing a business must NOT hard-delete.
 * The whole business is snapshotted into a trash area in
 * Firestore first, the business is wiped, and the snapshot stays
 * restorable for 30 days. This file is the trash's pure core —
 * chunking, the manifest, the expiry/state machine — so the
 * harness proves it against the same code the clients run. The
 * clients (StoreProvider) translate these shapes into Firestore
 * writes; nothing here writes.
 *
 * The snapshot format is DELIBERATELY the G6 backup format
 * (lib/backup BusinessBackup, same manifest recompute): the
 * existing verify/restore pipeline consumes a trash snapshot
 * unchanged — including its empty-business guard, so restoring
 * from trash into a business that gained new data after the
 * clear is refused with the existing message, never merged.
 * A trash snapshot is a backup with a trash manifest wrapped
 * around it; the chunking below is only a transport envelope.
 *
 * Semantics (stated once, implemented everywhere):
 *  - Trash lives OUTSIDE the tenant namespace, at
 *    businessTrash/{businessId}/snapshots/{trashId} with chunk
 *    docs at .../chunks/{index}. It is the owner's own data:
 *    rules grant it to the business owner only — the platform
 *    console has no leg into it, exactly like the tenant
 *    namespace it mirrors.
 *  - Expiry is checked AT READ TIME, never by a cron (Spark /
 *    static hosting has no cron): a snapshot whose expiresAt
 *    passed is unrestorable the moment it is read. Expired
 *    snapshots are deleted LAZILY on the next trash-panel load,
 *    and any snapshot can be deleted permanently by hand.
 *  - A restore CONSUMES its snapshot: the manifest flips to
 *    "restored" and can never restore again (a second restore
 *    of the same trash would double-write history — the
 *    planRestore resume case is for interrupted restores of
 *    one act, not for replaying a consumed snapshot).
 *  - Clearing again while an ACTIVE trash snapshot exists
 *    replaces it ONLY after an explicit confirm (the panel
 *    warns that the old trash will be lost) — the client
 *    deletes the old snapshot's docs before writing the new
 *    one, so at most one active snapshot exists per business.
 */

import type { BusinessBackup } from "./backup";
import { journalFingerprint } from "./backup";

/* ------------------------------------------------------------------ */
/* Envelope: chunked JSON (Firestore's 1 MiB/doc limit)               */
/* ------------------------------------------------------------------ */

/** Characters per chunk doc — 400k chars stays well under the
 *  1 MiB document limit even for multi-byte text, with room for
 *  the chunk envelope fields. A 154 KB live backup fits in ONE
 *  chunk; a multi-MB shop still chunks deterministically. */
export const TRASH_CHUNK_CHARS = 400000;

/** Thirty days, in milliseconds — the trash lifetime. */
export const TRASH_TTL_MS = 30 * 24 * 3600 * 1000;

export interface TrashChunk {
  index: number;
  data: string;
}

/** Split a backup JSON string into ordered chunk docs. */
export function chunkBackupJson(json: string): TrashChunk[] {
  const out: TrashChunk[] = [];
  for (let i = 0, index = 0; i < json.length; i += TRASH_CHUNK_CHARS, index++) {
    out.push({ index, data: json.slice(i, i + TRASH_CHUNK_CHARS) });
  }
  // An empty backup JSON is impossible (a backup always carries
  // its manifest), but a zero-chunk envelope would be
  // unrestorable — guard the degenerate case explicitly.
  if (out.length === 0) out.push({ index: 0, data: "" });
  return out;
}

/** Reassemble chunk docs into the backup JSON string. Chunks are
 *  sorted by index (document return order is meaningless), and a
 *  gap, a duplicate index, or a TRUNCATED tail is corruption —
 *  the reassembler refuses rather than handing verifyBackup a
 *  spliced file. The manifest's chunkCount is the tail check:
 *  without it, a list missing its last chunk would reassemble
 *  to a shorter string and fail only later, at verify — the
 *  caller always passes manifest.chunkCount (the restore path
 *  reads the manifest first, by construction). */
export function reassembleChunks(
  chunks: TrashChunk[],
  expectedCount?: number
): string | null {
  if (chunks.length === 0) return null;
  if (expectedCount !== undefined && chunks.length !== expectedCount) {
    return null;
  }
  const sorted = [...chunks].sort((a, b) => a.index - b.index);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].index !== i) return null;
  }
  return sorted.map((c) => c.data).join("");
}

/* ------------------------------------------------------------------ */
/* Manifest + state machine                                           */
/* ------------------------------------------------------------------ */

export type TrashStatus = "active" | "restored" | "deleted";

export interface TrashManifest {
  trashId: string;
  businessId: string;
  source: "clear";
  clearedAt: string;
  expiresAt: string;
  status: TrashStatus;
  /** The G6 backup manifest's counts, copied verbatim — the
   *  trash panel shows them without reassembling anything. */
  counts: Record<string, number>;
  totalDocs: number;
  journalCount: number;
  journalFingerprint: string;
  chunkCount: number;
  /** UTF-16 length of the backup JSON (a display figure, not a
   *  byte count — the chunk count is the storage truth). */
  jsonLength: number;
  /** The trash snapshot this one replaced, if any (an audit
   *  breadcrumb, not a restore path — replaced trash is gone). */
  replacedTrashId: string | null;
}

export function trashExpiresAt(clearedAtISO: string): string {
  const t = Date.parse(clearedAtISO);
  if (Number.isNaN(t)) return clearedAtISO;
  return new Date(t + TRASH_TTL_MS).toISOString();
}

/** Build a trash manifest from a verified backup + the clear
 *  act's facts. The manifest's counts/fingerprint come from the
 *  backup's own manifest — never recomputed here, so the panel
 *  and the file cannot disagree. */
export function trashManifestFor(input: {
  trashId: string;
  backup: BusinessBackup;
  clearedAtISO: string;
  replacedTrashId?: string | null;
}): { manifest: TrashManifest; json: string; chunks: TrashChunk[] } {
  const json = JSON.stringify(input.backup);
  const chunks = chunkBackupJson(json);
  const manifest: TrashManifest = {
    trashId: input.trashId,
    businessId: input.backup.manifest.businessId,
    source: "clear",
    clearedAt: input.clearedAtISO,
    expiresAt: trashExpiresAt(input.clearedAtISO),
    status: "active",
    counts: { ...input.backup.manifest.counts },
    totalDocs: input.backup.manifest.totalDocs,
    journalCount: input.backup.manifest.journalCount,
    journalFingerprint: input.backup.manifest.journalFingerprint,
    chunkCount: chunks.length,
    jsonLength: json.length,
    replacedTrashId: input.replacedTrashId ?? null,
  };
  return { manifest, json, chunks };
}

/** The trash panel's read-time state: "expired" is DERIVED, never
 *  stored — a snapshot whose clock ran out is unrestorable the
 *  moment it is read, with no writer needed to mark it. */
export type TrashPanelState = "active" | "expired" | "restored" | "deleted";

export function trashPanelState(
  manifest: TrashManifest,
  nowISO: string
): TrashPanelState {
  if (manifest.status === "restored") return "restored";
  if (manifest.status === "deleted") return "deleted";
  const now = Date.parse(nowISO);
  const exp = Date.parse(manifest.expiresAt);
  if (!Number.isNaN(now) && !Number.isNaN(exp) && now > exp) return "expired";
  return "active";
}

/** The only states from which a restore may start. */
export function canRestoreFromTrash(
  manifest: TrashManifest,
  nowISO: string
): boolean {
  return trashPanelState(manifest, nowISO) === "active";
}

/** Whether the panel must warn before this clear: an ACTIVE
 *  snapshot already exists and would be replaced (lost). */
export function clearReplacesTrash(
  existing: TrashManifest[],
  nowISO: string
): TrashManifest | null {
  for (const m of existing) {
    if (trashPanelState(m, nowISO) === "active") return m;
  }
  return null;
}

/** The fingerprint a restored business must reproduce: the
 *  trash manifest's journal fingerprint, computed the G6 way
 *  (wall-clock ts dropped) over the snapshot's journal. */
export function trashJournalFingerprint(journal: Array<Record<string, unknown>>): string {
  return journalFingerprint(journal as never);
}

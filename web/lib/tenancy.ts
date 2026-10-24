/**
 * Dukaan AI — Phase G · G1 tenancy core (design: ERP-PHASE-G-DESIGN §1/§7).
 *
 * Pure functions only — no Firebase, no store, no DOM — so the harness
 * can prove the tenancy contract (resolver truth table, migration
 * identity, claim shape, switcher healing) against the same code the
 * clients run. The clients (AuthProvider / StoreProvider) translate
 * the write plans below into Firestore batches; nothing here writes.
 *
 * Doctrine (invariant 1): tenancy is METADATA outside the tenant
 * namespace. Every write plan produced here targets platform
 * collections only — a plan that contained a `users/…` path would be
 * a failed plan by definition, and the harness asserts none ever does.
 */

import { resolveStaffRole, type ShopRole } from "./permissions";
import type { StaffRole } from "./types";
import type { DemoState } from "./demo";
import { getSeedAccounts, getSeedWarehouses } from "./seed";
import { DEFAULT_WAREHOUSE_ID } from "./stock";

/* ------------------------------------------------------------------ */
/* Shapes (design §1.2 / §3.2)                                         */
/* ------------------------------------------------------------------ */

/** The plan ASSIGNMENT snapshot carried on a businesses doc (§3.2).
 *  In G1 the snapshot is descriptive only — no rule and no client
 *  gates on it yet; enforcement is G2. The field set is the design's,
 *  so G2 reads exactly what G1 writes. G2 widening (type-only): the
 *  planId/assignedBy unions now admit the paid tiers and console
 *  assignments that lib/plans' catalogue constructs; G1's writers
 *  still produce only trial/founding snapshots, unchanged. A 0 in
 *  usersLimit/invoiceLimit means unlimited (an Enterprise snapshot
 *  whose limits the console did not pin). */
export interface PlanSnapshot {
  planId: "trial" | "basic" | "standard" | "advanced" | "enterprise" | "founding";
  tierRank: number;
  usersLimit: number;
  invoiceLimit: number;
  modulesTier: string;
  periodFrom: string;
  periodTo: string | null;
  trialEndsAt: string | null;
  assignedBy: "signup" | "migration" | "admin";
  assignedAt: string;
}

export interface BusinessRegistryDoc {
  ownerUid: string;
  ownerEmail: string;
  /** Shop-name snapshot for the platform directory — a label; the
   *  owner doc stays the name's home (§1.2). */
  name: string;
  phone: string;
  city: string;
  createdAt: string;
  /** G2 widening (type-only): "suspended" is the platform's act
   *  (G3 console writes it; G2's plan-state derivation reads it).
   *  G1's writers still only ever write "active". */
  status: "active" | "suspended";
  /** Staged-enforcement switch (§6.3) — written false at birth;
   *  G1's rules never read it (amendment #2 is G2). G2 widening
   *  (type-only): the platform flips it per business (G3); every
   *  G1/G2 writer still writes false. */
  enforce: boolean;
  plan: PlanSnapshot;
}

export interface MembershipDoc {
  email: string;
  role: StaffRole;
  addedBy: string;
  addedAt: string;
  source: "invite" | "staff" | "owner";
}

export interface InviteDoc {
  email: string;
  role: StaffRole;
  status: "pending" | "claimed";
  invitedBy: string;
  createdAt: string;
  claimedBy?: string;
  claimedAt?: string;
}

export interface BusinessCountersDoc {
  /** "YYYY-MM" in PKT — the month `invoiceCount` belongs to. */
  invoiceMonth: string;
  invoiceCount: number;
  memberCount: number;
  /** Present only on migration-born counters: the counts were
   *  derived once from the live collections and are labelled
   *  approximate where they are born (§7.2). */
  baseline?: "migration";
}

export interface BusinessEventDoc {
  businessId: string;
  kind: string;
  actor: string;
  at: string;
  detail: Record<string, unknown>;
}

/** One planned platform write. `index` is the caller's own
 *  userMemberships merge (a read-modify-write of their own doc,
 *  modelled here as data so the claim plan is fully assertable). */
export type PlatformWrite =
  | { kind: "set"; path: string; data: Record<string, unknown> }
  | { kind: "update"; path: string; data: Record<string, unknown> }
  | { kind: "add"; collection: string; data: Record<string, unknown> }
  | { kind: "index"; uid: string; businessId: string; role: StaffRole | "owner" };

export interface BusinessSummary {
  businessId: string;
  name: string;
  role: ShopRole;
  own: boolean;
}

/* ------------------------------------------------------------------ */
/* Plan snapshots (§3.1/§3.4 trial shape, §7.3 founding shape)         */
/* ------------------------------------------------------------------ */

export const TRIAL_USERS_LIMIT = 2;
export const TRIAL_INVOICE_LIMIT = 200;
export const TRIAL_DAYS = 14;
export const FOUNDING_USERS_LIMIT = 10;
export const FOUNDING_INVOICE_LIMIT = 10000;

export function trialPlanSnapshot(nowISO: string): PlanSnapshot {
  const ends = new Date(new Date(nowISO).getTime() + TRIAL_DAYS * 86400000);
  return {
    planId: "trial",
    tierRank: 0,
    usersLimit: TRIAL_USERS_LIMIT,
    invoiceLimit: TRIAL_INVOICE_LIMIT,
    modulesTier: "standard", // the trial tastes Standard's set (§3.4)
    periodFrom: nowISO,
    periodTo: null,
    trialEndsAt: ends.toISOString(),
    assignedBy: "signup",
    assignedAt: nowISO,
  };
}

export function foundingPlanSnapshot(nowISO: string): PlanSnapshot {
  return {
    planId: "founding",
    tierRank: 3, // Advanced's rank (§3.1)
    usersLimit: FOUNDING_USERS_LIMIT,
    invoiceLimit: FOUNDING_INVOICE_LIMIT,
    modulesTier: "advanced", // Advanced's module set, no expiry (§7.3)
    periodFrom: nowISO,
    periodTo: null,
    trialEndsAt: null,
    assignedBy: "migration",
    assignedAt: nowISO,
  };
}

/* ------------------------------------------------------------------ */
/* Counters baseline (§7.2 step 1)                                      */
/* ------------------------------------------------------------------ */

/** "YYYY-MM" of an instant on the PKT business calendar (UTC+5, no
 *  DST — the same fixed offset lib/periods uses for dateISO). */
export function pktMonthKey(instantISO: string): string {
  const shifted = new Date(new Date(instantISO).getTime() + 5 * 3600000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * The §4.2 invoice-event definition, applied to a baseline count:
 * a `bills` row whose status is not `held`, or a `sales` row (the
 * counter sale's record), timestamped inside the month. Drafts and
 * held bills never count (Q7).
 */
export function countMonthlyInvoiceEvents(
  bills: Array<{ ts: string; status?: string }>,
  sales: Array<{ ts: string; billId?: string | null; kind?: string }>,
  monthKey: string
): number {
  let n = 0;
  for (const b of bills) {
    if (b.status === "held") continue;
    if (pktMonthKey(b.ts) === monthKey) n++;
  }
  for (const s of sales) {
    // Only the counter sale's OWN row is an event (G2 tightens
    // G1's count to the rules' definition, §4.2): a bill's line
    // rows cite their bill (counted once, as the bill) and
    // return rows are kind "return". A row carrying neither
    // field (a bare record) reads as a counter sale.
    if (s.billId != null) continue;
    if (s.kind != null && s.kind !== "sale") continue;
    if (pktMonthKey(s.ts) === monthKey) n++;
  }
  return n;
}

/* ------------------------------------------------------------------ */
/* Lazy migration + trial birth (§7.2)                                 */
/* ------------------------------------------------------------------ */

export interface MigrationInput {
  ownerUid: string;
  ownerEmail: string;
  shopName: string;
  phone: string;
  /** The owner doc's staffEmails mirror — the migration's member
   *  baseline (membership DOCS for legacy staff are created by each
   *  staffer's own client on their first G sign-in: only that client
   *  knows the staffer's uid, §7.2 step 2). */
  staffEmails: string[];
  registryExists: boolean;
  bills: Array<{ ts: string; status?: string }>;
  sales: Array<{ ts: string }>;
  nowISO: string;
}

/**
 * The existing-shop migration (§7.2 step 1): registry doc with the
 * `founding` comp assignment, baseline counters, and the audit
 * event. ZERO writes inside `users/{uid}`, ZERO journal entries —
 * the harness re-asserts the frozen seed SHA over a fixture shop
 * with this plan applied. Idempotent: when the registry doc
 * already exists the plan is EMPTY (a second sign-in writes
 * nothing new).
 */
export function planMigration(input: MigrationInput): PlatformWrite[] {
  if (input.registryExists) return [];
  const month = pktMonthKey(input.nowISO);
  const invoiceCount = countMonthlyInvoiceEvents(input.bills, input.sales, month);
  const memberCount = input.staffEmails.length;
  const registry: BusinessRegistryDoc = {
    ownerUid: input.ownerUid,
    ownerEmail: input.ownerEmail,
    name: input.shopName,
    phone: input.phone,
    city: "",
    createdAt: input.nowISO,
    status: "active",
    enforce: false,
    plan: foundingPlanSnapshot(input.nowISO),
  };
  const counters: BusinessCountersDoc = {
    invoiceMonth: month,
    invoiceCount,
    memberCount,
    baseline: "migration",
  };
  const event: BusinessEventDoc = {
    businessId: input.ownerUid,
    kind: "business.migrated",
    actor: input.ownerUid,
    at: input.nowISO,
    detail: { plan: "founding", memberCount, invoiceBaseline: invoiceCount },
  };
  return [
    { kind: "set", path: `businesses/${input.ownerUid}`, data: { ...registry } },
    {
      kind: "set",
      path: `businessCounters/${input.ownerUid}`,
      data: { ...counters },
    },
    { kind: "add", collection: "businessEvents", data: { ...event } },
  ];
}

export interface TrialBirthInput {
  ownerUid: string;
  ownerEmail: string;
  shopName: string;
  phone: string;
  nowISO: string;
}

/** A business born after G (§7.2 step 3): the trial registry shape
 *  §4.3 validates — trial plan, zeroed counters for the birth
 *  month, and the `trial.started` event. */
export function planTrialBirth(input: TrialBirthInput): PlatformWrite[] {
  const registry: BusinessRegistryDoc = {
    ownerUid: input.ownerUid,
    ownerEmail: input.ownerEmail,
    name: input.shopName,
    phone: input.phone,
    city: "",
    createdAt: input.nowISO,
    status: "active",
    enforce: false,
    plan: trialPlanSnapshot(input.nowISO),
  };
  const counters: BusinessCountersDoc = {
    invoiceMonth: pktMonthKey(input.nowISO),
    invoiceCount: 0,
    memberCount: 0,
  };
  const event: BusinessEventDoc = {
    businessId: input.ownerUid,
    kind: "trial.started",
    actor: input.ownerUid,
    at: input.nowISO,
    detail: { plan: "trial" },
  };
  return [
    { kind: "set", path: `businesses/${input.ownerUid}`, data: { ...registry } },
    {
      kind: "set",
      path: `businessCounters/${input.ownerUid}`,
      data: { ...counters },
    },
    { kind: "add", collection: "businessEvents", data: { ...event } },
  ];
}

/* ------------------------------------------------------------------ */
/* Access resolution — the truth table (§1.3)                          */
/* ------------------------------------------------------------------ */

export interface AccessInput {
  callerUid: string;
  callerEmail: string;
  businessId: string;
  /** The business owner doc's staffEmails mirror. */
  staffEmails: string[];
  /** The caller's membership doc in this business, if any. */
  membership: { role?: unknown } | null;
  /** The caller's staffIndex doc, if any (the legacy leg). */
  staffIndex: { ownerUid?: unknown; role?: unknown } | null;
}

export interface AccessResult {
  access: boolean;
  role: ShopRole;
  via: "owner" | "membership" | "legacy" | null;
}

/**
 * Resolution order (clients and rules agree — the rules' amended
 * `staffRole`/`canAccess` implement this same table):
 *   1. uid == businessId ⇒ owner.
 *   2. Membership doc ⇒ its role — PROVIDED the caller's email is
 *      still in the owner doc's staffEmails mirror. The mirror
 *      condition is the R-G4 strictness: a removal that lands on
 *      the mirror (any client vintage's removeStaff writes it)
 *      cuts BOTH legs at once, so a deletion anywhere in the
 *      sanctioned write set cuts access.
 *   3. Legacy staffIndex ⇒ its role, when the index points at
 *      this business AND the mirror still carries the email (the
 *      v3 construction, retained verbatim as the fallback leg).
 *   4. Otherwise no access.
 * A missing/unrecognised role resolves to "manager" — the legacy
 * default (resolveStaffRole), unchanged.
 */
export function resolveAccess(input: AccessInput): AccessResult {
  const email = (input.callerEmail ?? "").trim().toLowerCase();
  if (input.callerUid && input.callerUid === input.businessId) {
    return { access: true, role: "owner", via: "owner" };
  }
  const inMirror = email !== "" && input.staffEmails.includes(email);
  if (input.membership && inMirror) {
    return {
      access: true,
      role: resolveStaffRole(input.membership.role),
      via: "membership",
    };
  }
  if (
    input.staffIndex &&
    input.staffIndex.ownerUid === input.businessId &&
    inMirror
  ) {
    return {
      access: true,
      role: resolveStaffRole(input.staffIndex.role),
      via: "legacy",
    };
  }
  return { access: false, role: "none", via: null };
}

/* ------------------------------------------------------------------ */
/* Invite → claim (§1.3)                                               */
/* ------------------------------------------------------------------ */

export interface ClaimInput {
  businessId: string;
  callerUid: string;
  callerEmail: string;
  invite: InviteDoc | null;
  existingMembership: MembershipDoc | null;
  nowISO: string;
}

export type ClaimResult =
  | { ok: true; role: StaffRole; writes: PlatformWrite[] }
  | {
      ok: false;
      reason: "no-invite" | "email-mismatch" | "already-claimed" | "not-pending";
      writes: [];
    };

/**
 * The claim plan: an invitee's sign-in turns a pending invite for
 * THEIR verified email into a uid-keyed membership with the
 * invited role, marks the invite claimed, adds their switcher
 * index entry and logs the act — one batch in the client.
 * An unclaimed invite confers nothing (no write plan, no access:
 * resolveAccess never consults invites). Re-claiming your own
 * claimed invite is an idempotent no-op; someone else's claim is
 * refused.
 */
export function planClaim(input: ClaimInput): ClaimResult {
  const email = (input.callerEmail ?? "").trim().toLowerCase();
  const invite = input.invite;
  if (!invite) return { ok: false, reason: "no-invite", writes: [] };
  if ((invite.email ?? "").trim().toLowerCase() !== email) {
    return { ok: false, reason: "email-mismatch", writes: [] };
  }
  if (invite.status === "claimed") {
    if (invite.claimedBy === input.callerUid && input.existingMembership) {
      return { ok: true, role: input.existingMembership.role, writes: [] };
    }
    return { ok: false, reason: "already-claimed", writes: [] };
  }
  if (invite.status !== "pending") {
    return { ok: false, reason: "not-pending", writes: [] };
  }
  const role = resolveStaffRole(invite.role);
  const membership: MembershipDoc = {
    email,
    role,
    addedBy: input.businessId,
    addedAt: input.nowISO,
    source: "invite",
  };
  const event: BusinessEventDoc = {
    businessId: input.businessId,
    kind: "membership.claimed",
    actor: input.callerUid,
    at: input.nowISO,
    detail: { email, role, source: "invite" },
  };
  return {
    ok: true,
    role,
    writes: [
      {
        kind: "set",
        path: `businessMembers/${input.businessId}/members/${input.callerUid}`,
        data: { ...membership },
      },
      {
        kind: "update",
        path: `businessInvites/${input.businessId}/invites/${email}`,
        data: {
          status: "claimed",
          claimedBy: input.callerUid,
          claimedAt: input.nowISO,
        },
      },
      { kind: "index", uid: input.callerUid, businessId: input.businessId, role },
      { kind: "add", collection: "businessEvents", data: { ...event } },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Legacy self-backfill (§7.2 step 2)                                  */
/* ------------------------------------------------------------------ */

export interface BackfillInput {
  businessId: string;
  callerUid: string;
  callerEmail: string;
  staffIndex: { ownerUid?: unknown; role?: unknown } | null;
  existingMembership: MembershipDoc | null;
  nowISO: string;
}

/**
 * A pre-G staffer's first G sign-in: the legacy leg already grants
 * them access (nobody's access depends on this backfill); their
 * own client — the only one that knows their uid — mirrors the
 * relationship into a membership doc (source "staff") + switcher
 * index entry. No-op when the index doesn't point at this
 * business or a membership already exists.
 */
export function planLegacyBackfill(input: BackfillInput): PlatformWrite[] {
  if (input.existingMembership) return [];
  if (!input.staffIndex || input.staffIndex.ownerUid !== input.businessId) {
    return [];
  }
  const email = (input.callerEmail ?? "").trim().toLowerCase();
  if (!email) return [];
  const role = resolveStaffRole(input.staffIndex.role);
  const membership: MembershipDoc = {
    email,
    role,
    addedBy: input.businessId,
    addedAt: input.nowISO,
    source: "staff",
  };
  const event: BusinessEventDoc = {
    businessId: input.businessId,
    kind: "membership.backfilled",
    actor: input.callerUid,
    at: input.nowISO,
    detail: { email, role, source: "staff" },
  };
  return [
    {
      kind: "set",
      path: `businessMembers/${input.businessId}/members/${input.callerUid}`,
      data: { ...membership },
    },
    { kind: "index", uid: input.callerUid, businessId: input.businessId, role },
    { kind: "add", collection: "businessEvents", data: { ...event } },
  ];
}

/* ------------------------------------------------------------------ */
/* Switcher index — build + self-heal (§1.4)                           */
/* ------------------------------------------------------------------ */

export interface IndexEntry {
  businessId: string;
  /** A member's staff role — or "owner" for an additionally-owned
   *  business (FR2: the owner is never a MEMBER, but the index
   *  entry is what lists the business, so it carries the owner
   *  role explicitly). */
  role: StaffRole | "owner";
}

/** Merge one entry into a userMemberships entry list (idempotent;
 *  an existing entry's role is refreshed from the membership). */
export function indexWith(entries: IndexEntry[], add: IndexEntry): IndexEntry[] {
  const out = entries.filter((e) => e.businessId !== add.businessId);
  out.push(add);
  return out;
}

/**
 * Self-healing (§1.4): the index is a CACHE of memberships, never
 * a source of truth. An entry whose membership doc no longer
 * exists is dropped on sight (and reported in `dropped` so the
 * client can persist the healed list); entries are de-duplicated
 * and their roles refreshed from the live membership docs.
 *
 * FR2 widening: `ownerOwned` lists businesses whose REGISTRY
 * names the caller as ownerUid. The G1 doctrine ("the owner is
 * never a member of their own business") means such businesses
 * have NO membership doc by design — without this carve-out,
 * healing would drop every additionally-owned business on the
 * next sign-in. An ownerOwned entry is kept with role "owner"
 * regardless of any membership doc.
 */
export function healIndex(
  entries: IndexEntry[],
  liveMemberships: Record<string, MembershipDoc | null>,
  ownerOwned: string[] = []
): { kept: IndexEntry[]; dropped: string[] } {
  const kept: IndexEntry[] = [];
  const dropped: string[] = [];
  const seen = new Set<string>();
  const owned = new Set(ownerOwned);
  for (const e of entries) {
    if (seen.has(e.businessId)) continue;
    seen.add(e.businessId);
    if (owned.has(e.businessId)) {
      kept.push({ businessId: e.businessId, role: "owner" });
      continue;
    }
    const m = liveMemberships[e.businessId];
    if (m) kept.push({ businessId: e.businessId, role: m.role });
    else dropped.push(e.businessId);
  }
  return { kept, dropped };
}

/** The switcher list: the person's own business first (from the
 *  uid itself, never from a membership doc — §1.3), then their
 *  memberships in stable name order.
 *
 * FR2 widening: entries may carry `own` (an additionally-owned
 * business, from the registry-owner carve-out above). Owned
 * businesses sort before member businesses — the uid-shaped own
 * business first (business #1, the legacy position), then other
 * owned businesses in name order, then member businesses in
 * name order. */
export function buildSwitcherList(input: {
  own: { businessId: string; name: string } | null;
  entries: Array<IndexEntry & { own?: boolean }>;
  names: Record<string, string>;
}): BusinessSummary[] {
  const out: BusinessSummary[] = [];
  if (input.own) {
    out.push({
      businessId: input.own.businessId,
      name: input.names[input.own.businessId] ?? input.own.name,
      role: "owner",
      own: true,
    });
  }
  const byName = (a: IndexEntry, b: IndexEntry) =>
    (input.names[a.businessId] ?? a.businessId).localeCompare(
      input.names[b.businessId] ?? b.businessId
    );
  const rest = [...input.entries].filter(
    (e) => !input.own || e.businessId !== input.own.businessId
  );
  const owned = rest.filter((e) => e.own).sort(byName);
  const members = rest.filter((e) => !e.own).sort(byName);
  for (const e of owned) {
    out.push({
      businessId: e.businessId,
      name: input.names[e.businessId] ?? "",
      role: "owner",
      own: true,
    });
  }
  for (const e of members) {
    out.push({
      businessId: e.businessId,
      name: input.names[e.businessId] ?? "",
      role: e.role,
      own: false,
    });
  }
  return out;
}

/**
 * Pick the active business from an ordered candidate list: the
 * first candidate that is actually in the switcher list wins.
 * The caller supplies the precedence (FR2: the server-persisted
 * activeBusinessId, then the device-local choice, then the
 * claim/legacy preferred business); a null result means "fall
 * back to list[0]" — the caller's decision, not this helper's.
 */
export function pickActiveBusiness(
  list: BusinessSummary[],
  candidates: Array<string | null | undefined>
): BusinessSummary | null {
  for (const c of candidates) {
    if (!c) continue;
    const found = list.find((b) => b.businessId === c);
    if (found) return found;
  }
  return null;
}

/** The staff screen's per-row membership status (G1): a claimed
 *  membership = joined; a pending invite = invited; a mirror entry
 *  with neither is a pre-G legacy relationship. */
export function membershipStatusFor(
  email: string,
  memberships: Array<{ email: string }>,
  invites: Array<{ email: string; status: string }>
): "joined" | "pending" | "legacy" {
  const e = email.trim().toLowerCase();
  if (memberships.some((m) => m.email.trim().toLowerCase() === e)) {
    return "joined";
  }
  if (
    invites.some(
      (i) => i.email.trim().toLowerCase() === e && i.status === "pending"
    )
  ) {
    return "pending";
  }
  return "legacy";
}

/* ------------------------------------------------------------------ */
/* Fix Round 2 · FR2 — additional owned businesses                    */
/*                                                                    */
/* Phase G's tenancy model was "one owned business per account"      */
/* (businessId ≡ ownerUid for the owner's own shop). FR2 keeps       */
/* that shape for business #1 — the existing live business keeps     */
/* working untouched, no data moves, no doc is re-keyed — and adds   */
/* businesses #2+ with GENERATED ids. The tenant path shape is       */
/* unchanged (`users/{businessId}/…`); only the id's provenance      */
/* changes, and the rules learn the registry-owner leg               */
/* (businesses/{bid}.ownerUid == caller) alongside the uid match.    */
/*                                                                    */
/* Creation is TWO PHASES because Firestore rules `get()` reads      */
/* committed state, not a batch's pending writes: phase 1 creates    */
/* the registry alone (its birth validation reads only the          */
/* request itself), and phase 2 — once the registry is committed —   */
/* creates the counters, the switcher index entry and the tenant     */
/* skeleton. If phase 2 fails, the business exists as a registry     */
/* without an owner doc; opening it completes the skeleton           */
/* idempotently (fixed ids, merge writes) instead of failing.        */
/* The founding comp plan NEVER applies here: a generated business   */
/* is born on the Free Trial rules exactly like any new business     */
/* (the founding assignment is the §7.2 migration of a pre-G shop    */
/* whose namespace already exists — and the rules pin that:          */
/* founding requires businessId == ownerUid).                        */
/* ------------------------------------------------------------------ */

export interface NewBusinessInput {
  businessId: string;
  ownerUid: string;
  ownerEmail: string;
  name: string;
  phone: string;
  address: string;
  nowISO: string;
}

/** Creation-form validation (the client enforces the same):
 *  a name is required (1–60 chars); phone/address are free text
 *  capped at the lengths the registry already tolerates. */
export function newBusinessInputOk(input: {
  name: string;
  phone: string;
  address: string;
}): boolean {
  const name = (input.name ?? "").trim();
  if (name.length < 1 || name.length > 60) return false;
  if ((input.phone ?? "").length > 16) return false;
  if ((input.address ?? "").length > 200) return false;
  return true;
}

/**
 * Phase 1: the registry (trial plan) + the creation audit event.
 * Platform collections only, per the file's doctrine. The
 * registry's ownerUid is the CREATOR's uid — for a generated id
 * this is precisely what distinguishes it from the legacy shape
 * (where ownerUid == businessId).
 */
export function planNewBusinessPhase1(input: NewBusinessInput): PlatformWrite[] {
  const registry: BusinessRegistryDoc = {
    ownerUid: input.ownerUid,
    ownerEmail: input.ownerEmail,
    name: input.name.trim(),
    phone: input.phone,
    city: "",
    createdAt: input.nowISO,
    status: "active",
    enforce: false,
    plan: trialPlanSnapshot(input.nowISO),
  };
  const event: BusinessEventDoc = {
    businessId: input.businessId,
    kind: "business.created",
    actor: input.ownerUid,
    at: input.nowISO,
    detail: { name: input.name.trim(), via: "new-business" },
  };
  return [
    { kind: "set", path: `businesses/${input.businessId}`, data: { ...registry } },
    { kind: "add", collection: "businessEvents", data: { ...event } },
  ];
}

/**
 * Phase 2: the zeroed counters for the birth month + the
 * creator's switcher index entry (role "owner" — the owner is
 * never a MEMBER of their own business, so no members doc is
 * written; the index entry is what lists the business, and the
 * FR2 healing carve-out keeps it without a membership doc).
 */
export function planNewBusinessPhase2(input: NewBusinessInput): PlatformWrite[] {
  const counters: BusinessCountersDoc = {
    invoiceMonth: pktMonthKey(input.nowISO),
    invoiceCount: 0,
    memberCount: 0,
  };
  return [
    {
      kind: "set",
      path: `businessCounters/${input.businessId}`,
      data: { ...counters },
    },
    { kind: "index", uid: input.ownerUid, businessId: input.businessId, role: "owner" },
  ];
}

/**
 * The tenant skeleton for a new business: the owner doc +
 * structural docs, with the same fixed ids and content the
 * first-business skeleton uses. Content collections are NOT
 * here — a new business starts EMPTY (FR2 item 1); demo data
 * arrives only through the explicit owner act. The owner doc
 * carries demoState "none" (lib/demo's flag) and seedV2 true
 * ("namespace initialised" — the migration steps are no-ops).
 */
export interface NewBusinessSkeleton {
  ownerDoc: Record<string, unknown>;
  accounts: Array<Record<string, unknown>>;
  warehouse: Record<string, unknown>;
}

export function newBusinessSkeleton(input: NewBusinessInput): NewBusinessSkeleton {
  const ownerDoc: Record<string, unknown> = {
    email: input.ownerEmail,
    bornAt: input.nowISO,
    seedV2: true,
    demoState: "none" as DemoState,
    phaseA: { accountsV1: true, rbacV1: true, taxV1: true, periodsV1: true },
    phaseC: { stockV1: true },
    phaseD: { hrV1: true },
    defaultSalesTaxSlabId: null,
    defaultPurchaseTaxSlabId: null,
    fiscalYearStartMonth: 7,
    fiscalYearStartDay: 1,
    lockedThrough: "",
    shopName: input.name.trim(),
    address: input.address,
    phone: input.phone,
    staffEmails: [],
    staff: [],
  };
  // The default warehouse, from the same getter the skeleton
  // path has always used — inlined copies drift; this cannot.
  const warehouse = (getSeedWarehouses().find((w) => w.id === DEFAULT_WAREHOUSE_ID) ?? {
    id: DEFAULT_WAREHOUSE_ID,
  }) as unknown as Record<string, unknown>;
  return {
    ownerDoc,
    accounts: getSeedAccounts().map((a) => ({ ...(a as unknown as Record<string, unknown>) })),
    warehouse,
  };
}

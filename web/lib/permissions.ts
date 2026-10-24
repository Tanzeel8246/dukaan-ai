/**
 * Dukaan AI — RBAC permission matrix (ERP Phase A · A3).
 *
 * Design: ERP-PHASE-A-DESIGN.md §3. This module is the SINGLE
 * authoritative encoding of the §3.2 matrix: the client gates UI and
 * store actions through `can()`, and `firebase/firestore.rules` (v3)
 * mirrors the same table server-side — rules are the enforcement,
 * this module is the convenience layer that keeps denied actions out
 * of sight. Where the two could drift, the rules win.
 *
 * Roles: the owner's role is implicit (uid match) and never stored.
 * A staff member with no recorded role resolves to "manager" — the
 * LEGACY profile: before A3, invited staff could do everything
 * except the owner-only surfaces, which is exactly the manager
 * column. `LEGACY_STAFF_ACCESS` below enumerates those pre-A3 staff
 * powers (from the Complete/A2 rules + UI) so the harness can PROVE
 * manager == legacy, i.e. the A3 rollout narrows nobody who already
 * works in a shop today (design risk R-2).
 */
import type { StaffMember, StaffRole } from "./types";

/** The full client-side role: a stored staff role, the implicit
 *  owner, or "none" (signed in but attached to no shop — the state
 *  the rules call `staffRole() == null`). */
export type ShopRole = "owner" | StaffRole | "none";

export type AccessLevel = "full" | "read" | "none";

/** Every row of the design §3.2 matrix. Rows for Phases B–D are
 *  pre-declared (as the design requires) so those phases consume
 *  this same matrix without a second foundation pass. */
export type PermModule =
  /* ---- live surface (Complete edition + Phase A) ---- */
  | "dashboard"
  | "salesCounter"
  | "billing"
  | "billingVoid"
  | "returns"
  | "inventoryView"
  | "inventoryCost" // (UI) — rules cannot hide a field
  | "inventoryManage"
  | "stockAdjustments"
  | "forecast"
  | "suppliersManage"
  | "supplierPayments"
  | "customersManage"
  | "creditGive"
  | "creditRepayment"
  | "expenses"
  | "finance"
  | "accountsManage"
  | "transfers"
  | "dayClose"
  | "dayCloseHistory"
  | "assistant"
  | "settingsProfile"
  | "staffManage"
  | "taxSlabs"
  | "periods"
  /* ---- Phase B (document chain) ---- */
  | "quotations"
  | "saleOrders"
  | "purchaseOrders"
  | "creditDebitNotes"
  | "vouchers"
  | "cheques"
  /* ---- Phase C (warehouses & production) ---- */
  | "warehouses"
  | "manufacturing"
  | "jobTracker"
  /* ---- Phase D (HR & advanced finance) ---- */
  | "staffDirectory"
  | "payroll"
  | "loans"
  | "fiscalClose"
  | "trialBalanceExports"
  /* ---- Phase H (growth layer) ---- */
  | "loyalty"
  | "storefront"
  | "whatsapp";

type RoleAccess = Record<"owner" | "manager" | "cashier" | "accountant", AccessLevel>;

const F: AccessLevel = "full";
const R: AccessLevel = "read";
const N: AccessLevel = "none";

/** The §3.2 matrix, verbatim. Column order: owner, manager, cashier,
 *  accountant. */
export const PERMISSION_MATRIX: Record<PermModule, RoleAccess> = {
  dashboard:         { owner: F, manager: F, cashier: F, accountant: F },
  salesCounter:      { owner: F, manager: F, cashier: F, accountant: N },
  billing:           { owner: F, manager: F, cashier: F, accountant: N },
  billingVoid:       { owner: F, manager: F, cashier: N, accountant: N },
  returns:           { owner: F, manager: F, cashier: F, accountant: N },
  inventoryView:     { owner: F, manager: F, cashier: F, accountant: R },
  inventoryCost:     { owner: F, manager: F, cashier: N, accountant: F },
  inventoryManage:   { owner: F, manager: F, cashier: N, accountant: N },
  stockAdjustments:  { owner: F, manager: F, cashier: N, accountant: N },
  forecast:          { owner: F, manager: F, cashier: N, accountant: R },
  suppliersManage:   { owner: F, manager: F, cashier: N, accountant: R },
  supplierPayments:  { owner: F, manager: F, cashier: N, accountant: F },
  customersManage:   { owner: F, manager: F, cashier: F, accountant: R },
  creditGive:        { owner: F, manager: F, cashier: N, accountant: N },
  creditRepayment:   { owner: F, manager: F, cashier: F, accountant: F },
  expenses:          { owner: F, manager: F, cashier: N, accountant: F },
  finance:           { owner: F, manager: F, cashier: N, accountant: F },
  accountsManage:    { owner: F, manager: N, cashier: N, accountant: N },
  transfers:         { owner: F, manager: F, cashier: N, accountant: F },
  dayClose:          { owner: F, manager: F, cashier: F, accountant: N },
  dayCloseHistory:   { owner: F, manager: F, cashier: F, accountant: R },
  assistant:         { owner: F, manager: F, cashier: F, accountant: F },
  settingsProfile:   { owner: F, manager: N, cashier: N, accountant: N },
  staffManage:       { owner: F, manager: N, cashier: N, accountant: N },
  // The taxSlabs/periods rows encode the MANAGE/close actions. The
  // collections themselves are readable by every role in rules v3
  // (desks need slab resolution; lock state is data, not a surface).
  taxSlabs:          { owner: F, manager: N, cashier: N, accountant: R },
  periods:           { owner: F, manager: N, cashier: N, accountant: N },
  /* Phase B */
  quotations:        { owner: F, manager: F, cashier: F, accountant: R },
  saleOrders:        { owner: F, manager: F, cashier: F, accountant: R },
  purchaseOrders:    { owner: F, manager: F, cashier: N, accountant: R },
  creditDebitNotes:  { owner: F, manager: F, cashier: N, accountant: F },
  vouchers:          { owner: F, manager: F, cashier: F, accountant: F },
  cheques:           { owner: F, manager: F, cashier: N, accountant: F },
  /* Phase C */
  warehouses:        { owner: F, manager: F, cashier: N, accountant: R },
  manufacturing:     { owner: F, manager: F, cashier: N, accountant: R },
  jobTracker:        { owner: F, manager: F, cashier: R, accountant: R },
  /* Phase D */
  staffDirectory:    { owner: F, manager: F, cashier: N, accountant: R },
  payroll:           { owner: F, manager: R, cashier: N, accountant: F },
  loans:             { owner: F, manager: R, cashier: N, accountant: F },
  fiscalClose:       { owner: F, manager: N, cashier: N, accountant: N },
  trialBalanceExports: { owner: F, manager: F, cashier: N, accountant: F },
  /* Phase H · H1 (Phase H design §1.7): the loyalty DESK —
   * programme totals, expiry posting, the per-customer ledger.
   * Programme settings themselves ride `settingsProfile` (owner)
   * like every programme term. A cashier APPLIES a redemption at
   * the billing desk — that act rides the `billing` row (a tender
   * is a tender); the desk's postings are manager acts, and the
   * accountant reads the figures that feed finance. */
  loyalty:           { owner: F, manager: F, cashier: N, accountant: R },
  /* Phase H · H3 (Phase H design §2.2/§2.4): the storefront
   * desk — publish preparation, the order inbox, conversion and
   * dismissal. The PUBLISH write itself is owner-keyed in rules
   * v10 (the public face of the shop is an owner act, like E2's
   * brand assets); a manager prepares and runs the inbox. The
   * cashier's world is the counter — a public order reaches them
   * as an ordinary sale order through the `saleOrders` row. The
   * accountant reads the inbox (orders are sales-side paper). */
  storefront:        { owner: F, manager: F, cashier: N, accountant: R },
  /* Phase H · WhatsApp (Phase H design §3.3): templates,
   * campaigns and the send queue. Creation and launching are
   * owner/manager acts — a cashier does not launch campaigns
   * (the design is explicit), and the accountant reads the
   * campaign history like any other shop record. The rules
   * mirror this row with a NARROWED read (owner/manager/
   * accountant), the payrollRuns precedent: the cashier is
   * excluded server-side, not merely UI-hidden. */
  whatsapp:          { owner: F, manager: F, cashier: N, accountant: R },
};

/** Rows whose surfaces exist in the app TODAY (Complete + Phase A
 *  increments A1–A3). The legacy-equality proof is scoped to these:
 *  the Phase B–D rows had no pre-A3 surface to preserve. */
export const CURRENT_MODULES = [
  "dashboard", "salesCounter", "billing", "billingVoid", "returns",
  "inventoryView", "inventoryCost", "inventoryManage", "stockAdjustments",
  "forecast", "suppliersManage", "supplierPayments", "customersManage",
  "creditGive", "creditRepayment", "expenses", "finance", "accountsManage",
  "transfers", "dayClose", "dayCloseHistory", "assistant",
  "settingsProfile", "staffManage", "taxSlabs", "periods",
] as const satisfies readonly PermModule[];

export type CurrentModule = (typeof CURRENT_MODULES)[number];

/**
 * What an invited staff member could do BEFORE A3 — enumerated from
 * the shipped Complete-edition + A2 state:
 *
 *  - Rules (pre-v3): `canAccess` (owner or staff) granted read+write
 *    on every business collection — products, suppliers, customers,
 *    purchases, supplierPayments, credits, returns, adjustments,
 *    cashEntries, dayCloses, expenses, bills (incl. held-delete),
 *    sales create, journal read+create. Owner-only by rules: the
 *    owner doc itself (settings + staff list) and, since A2,
 *    `accounts` create/update.
 *  - UI/store (pre-A3): staff were refused settings saves, staff
 *    management and money-account management (`isStaff` guards);
 *    everything else — counter sales, billing incl. void, returns,
 *    inventory incl. cost prices and CSV import, adjustments,
 *    forecast, suppliers/purchases/payments, customers, udhaar
 *    give + repayment, expenses, finance, transfers (cashEntries),
 *    day close — was open to them.
 *
 * The harness asserts this map equals the matrix's MANAGER column on
 * every CURRENT_MODULES row, which is the R-2 guarantee: backfilling
 * legacy staff as managers changes none of their powers.
 */
export const LEGACY_STAFF_ACCESS: Record<CurrentModule, AccessLevel> = {
  dashboard: F,
  salesCounter: F,
  billing: F,
  billingVoid: F,
  returns: F,
  inventoryView: F,
  inventoryCost: F,
  inventoryManage: F,
  stockAdjustments: F,
  forecast: F,
  suppliersManage: F,
  supplierPayments: F,
  customersManage: F,
  creditGive: F,
  creditRepayment: F,
  expenses: F,
  finance: F,
  accountsManage: N, // owner-only since A2 (rules + store guard)
  transfers: F,
  dayClose: F,
  dayCloseHistory: F,
  assistant: F,
  settingsProfile: N, // owner doc write is owner-only in the rules
  staffManage: N,
  taxSlabs: N, // no surface before A4
  periods: N, // no surface before A5
};

export function accessOf(role: ShopRole, module: PermModule): AccessLevel {
  if (role === "none") return "none";
  return PERMISSION_MATRIX[module][role];
}

/**
 * The one gate every UI surface and store guard calls.
 *  - "view": any access at all (full or read-only).
 *  - "write": full access only (create/edit/delete/perform actions).
 */
export function can(role: ShopRole, module: PermModule, action: "view" | "write"): boolean {
  const a = accessOf(role, module);
  return action === "view" ? a !== "none" : a === "full";
}

/** Journal READING is narrower than journal posting (design §3.3):
 *  every role may post what its work creates, but the ledger itself
 *  is browsable only by owner / manager / accountant. Mirrors the
 *  rules v3 `journal` read gate. */
export function canBrowseJournal(role: ShopRole): boolean {
  return role === "owner" || role === "manager" || role === "accountant";
}

const STAFF_ROLES: StaffRole[] = ["manager", "cashier", "accountant"];

/**
 * Resolve a raw stored role (staffIndex doc field, owner-doc staff[]
 * entry) to a StaffRole. Anything missing or unrecognised resolves
 * to "manager" — the legacy default (design §3.1), applied identically
 * by the client here and by the rules' `.get('role', 'manager')`.
 */
export function resolveStaffRole(raw: unknown): StaffRole {
  return typeof raw === "string" && (STAFF_ROLES as string[]).includes(raw)
    ? (raw as StaffRole)
    : "manager";
}

/* ------------------------------------------------------------------ */
/* Migration backfill (design §6.1, step `rbacV1`) — pure computation */
/* ------------------------------------------------------------------ */

export interface StaffBackfillInput {
  /** The owner doc's legacy mirror list. */
  staffEmails: string[];
  /** Existing owner-doc `staff[]` (may be empty/absent pre-A3). */
  staff: StaffMember[];
  /** Raw `role` values read from EXISTING staffIndex docs, keyed by
   *  email. An email absent from this record has no index doc (or it
   *  could not be read) and gets no index write from the migration. */
  indexRoles: Record<string, unknown>;
  /** ISO timestamp stamped on newly created staff[] entries. */
  now: string;
}

export interface StaffBackfill {
  /** The complete staff[] to store: every known email exactly once.
   *  Role precedence: an existing staff[] entry wins, then a valid
   *  staffIndex role, then the legacy default "manager". */
  staff: StaffMember[];
  /** staffIndex docs that exist but carry no valid role and must be
   *  merge-written the resolved role (never overwrites a valid one). */
  indexRoleWrites: Array<{ email: string; role: StaffRole }>;
}

export function backfillStaff(input: StaffBackfillInput): StaffBackfill {
  const existing = new Map<string, StaffMember>();
  for (const m of input.staff) {
    const email = m.email.trim().toLowerCase();
    if (email && !existing.has(email)) {
      existing.set(email, { email, role: resolveStaffRole(m.role), addedAt: m.addedAt || input.now });
    }
  }
  const emails: string[] = [];
  const seen = new Set<string>();
  for (const raw of input.staffEmails) {
    const email = raw.trim().toLowerCase();
    if (email && !seen.has(email)) {
      seen.add(email);
      emails.push(email);
    }
  }
  for (const email of existing.keys()) {
    if (!seen.has(email)) {
      seen.add(email);
      emails.push(email);
    }
  }
  const staff: StaffMember[] = [];
  const indexRoleWrites: Array<{ email: string; role: StaffRole }> = [];
  for (const email of emails) {
    const prev = existing.get(email);
    const hasIndexRole =
      email in input.indexRoles &&
      typeof input.indexRoles[email] === "string" &&
      (STAFF_ROLES as string[]).includes(input.indexRoles[email] as string);
    const role: StaffRole = prev
      ? prev.role
      : hasIndexRole
        ? resolveStaffRole(input.indexRoles[email])
        : "manager";
    staff.push({ email, role, addedAt: prev?.addedAt || input.now });
    if (email in input.indexRoles && !hasIndexRole) {
      indexRoleWrites.push({ email, role });
    }
  }
  return { staff, indexRoleWrites };
}

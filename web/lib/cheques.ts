/**
 * Dukaan AI — cheque registry derivations & journal templates
 * (ERP Phase B · B5, design ERP-PHASE-B-DESIGN.md §4).
 *
 * Pure helpers only — the store (components/StoreProvider.tsx)
 * wires them into the posting choke point, and the verification
 * harness exercises them directly, exactly as lib/documents.ts
 * serves B1–B4. The registry doc is a mutable STATUS record; the
 * journal remains the money history. The two cross-cite through
 * `Cheque.entryIds`, and the identities this module exists to keep
 * assertable at every step are:
 *
 *   Σ uncleared IN cheques (status received + deposited)
 *     == journal balance of `cheques_in_hand`
 *   Σ pending OUT cheques (status issued)
 *     == journal balance of `cheques_issued` (normal side)
 *
 * Journal line `ref` convention for cheque accounts (§4.3):
 * `ref = chequeId` — the subledger record id, exactly as money
 * lines carry `accountId`, receivables lines `customerId` and
 * payables lines `supplierId`.
 */
import type { Cheque, ChequeDraft, JournalLine } from "./types";
import { isValidDateISO } from "./periods";

/* ---------------- capture validation ---------------- */

/**
 * A capture draft is usable when it names the instrument: a
 * non-empty leaf number and two real calendar dates. The DUE date
 * may legitimately be in the future (post-dated cheques are normal
 * trade practice in Pakistan) — nothing here forces either date to
 * be today: the journal entry always carries its real instant
 * (the A5 discipline), and the dates are the instrument's own data.
 */
export function isValidChequeDraft(d: ChequeDraft | null | undefined): boolean {
  if (!d) return false;
  if (!d.chequeNo.trim()) return false;
  if (!isValidDateISO(d.issueDateISO) || !isValidDateISO(d.dueDateISO)) return false;
  return true;
}

/* ---------------- registry derivations (§4.4) ---------------- */

/** IN cheques whose value still sits in `cheques_in_hand`: in the
 *  drawer or deposited at the bank, not yet cleared/bounced/returned. */
export function unclearedInCheques(cheques: Cheque[]): Cheque[] {
  return cheques.filter(
    (c) => c.direction === "in" && (c.status === "received" || c.status === "deposited")
  );
}

/** Σ uncleared IN — must equal the journal's `cheques_in_hand`. */
export function unclearedInTotal(cheques: Cheque[]): number {
  return unclearedInCheques(cheques).reduce((a, c) => a + c.amount, 0);
}

/** OUT cheques handed over but not yet cleared/bounced. */
export function pendingOutCheques(cheques: Cheque[]): Cheque[] {
  return cheques.filter((c) => c.direction === "out" && c.status === "issued");
}

/** Σ pending OUT — must equal the journal's `cheques_issued`. */
export function pendingOutTotal(cheques: Cheque[]): number {
  return pendingOutCheques(cheques).reduce((a, c) => a + c.amount, 0);
}

/** View: in the drawer (received, not yet deposited). */
export function chequesInDrawer(cheques: Cheque[]): Cheque[] {
  return cheques.filter((c) => c.direction === "in" && c.status === "received");
}

/** View: at the bank, awaiting clearance. */
export function chequesAtBank(cheques: Cheque[]): Cheque[] {
  return cheques.filter((c) => c.direction === "in" && c.status === "deposited");
}

const PENDING_STATUSES: ReadonlyArray<Cheque["status"]> = ["received", "deposited", "issued"];

/** A pending cheque whose PDC date has arrived — it may clear now. */
export function chequeIsDue(c: Cheque, todayISO: string): boolean {
  return PENDING_STATUSES.includes(c.status) && c.dueDateISO <= todayISO;
}

/** A pending cheque PAST its PDC date and still uncleared — the
 *  stricter highlight of §4.4 (the bank/customer has not honoured
 *  it on time). Terminal cheques are never overdue. */
export function chequeIsOverdue(c: Cheque, todayISO: string): boolean {
  return PENDING_STATUSES.includes(c.status) && c.dueDateISO < todayISO;
}

/** View: pending and due (clearable now), either direction. */
export function chequesDue(cheques: Cheque[], todayISO: string): Cheque[] {
  return cheques.filter((c) => chequeIsDue(c, todayISO));
}

/* ---------------- lifecycle transitions ---------------- */

export type ChequeAction = "deposit" | "clear" | "bounce" | "return";

/**
 * The transition table of §4.2/§4.3 — the single place that knows
 * which (direction, status, source) may take which action. The
 * store refuses anything this returns false for, BEFORE composing
 * any write:
 *  - deposit: IN only, from `received` (a custody move; posts
 *    nothing — §4.3).
 *  - clear: IN from `deposited` (a cheque cannot clear before a
 *    bank has seen it), OUT from `issued`.
 *  - bounce: IN from `deposited` ONLY (it cannot bounce before a
 *    bank has seen it); OUT from `issued` and only for supplier
 *    payments — an EXPENSE cheque's correction path is the
 *    expense's own F-5 reversal machinery (update/delete), which
 *    mirrors this same template and settles the registry there,
 *    so the registry never offers a second, divergent path.
 *  - return: IN from `received` only (handed back UNDEPOSITED —
 *    once deposited, the bank's answer is clear or bounce).
 * Terminal statuses (cleared / bounced / returned) accept nothing:
 * double-clear, clear-after-bounce and bounce-after-clear are all
 * refused here.
 */
export function canChequeTransition(c: Cheque, action: ChequeAction): boolean {
  switch (action) {
    case "deposit":
      return c.direction === "in" && c.status === "received";
    case "clear":
      return (
        (c.direction === "in" && c.status === "deposited") ||
        (c.direction === "out" && c.status === "issued")
      );
    case "bounce":
      if (c.direction === "in") return c.status === "deposited";
      return c.status === "issued" && c.sourceType === "supplier_payment";
    case "return":
      return c.direction === "in" && c.status === "received";
  }
}

/* ---------------- journal templates (§4.3) ----------------
 * Line composers for the lifecycle entries. Capture/issuance lines
 * are NOT here: they are woven into their host entries by the
 * store's existing composers (the bill's payment lines, the
 * repayment entry, the supplier-payment entry, the expense entry),
 * reusing the host refTypes by design. */

/**
 * CLEARING (refType "cheque_clearing", refId = chequeId). The
 * money leg lands in / leaves the cheque's recorded money account;
 * `gl` is that account's GL bucket (lib/ledger `glForAccount`).
 *   IN:  Dr cash|wallet (ref: depositAccountId) / Cr cheques_in_hand
 *   OUT: Dr cheques_issued / Cr cash|wallet (ref: drawnOnAccountId)
 */
export function clearingLines(c: Cheque, gl: "cash" | "wallet"): JournalLine[] {
  if (c.direction === "in") {
    return [
      { account: gl, debit: c.amount, credit: 0, ref: c.accountId },
      { account: "cheques_in_hand", debit: 0, credit: c.amount, ref: c.id },
    ];
  }
  return [
    { account: "cheques_issued", debit: c.amount, credit: 0, ref: c.id },
    { account: gl, debit: 0, credit: c.amount, ref: c.accountId },
  ];
}

/**
 * IN — BOUNCE (refType "cheque_bounce", refId = chequeId): the
 * receivable is restored exactly; the subledger moves with it via
 * the compensating `credits` row the store writes in the same
 * batch (see StoreProvider.bounceCheque).
 *   Dr receivables (ref: customerId) / Cr cheques_in_hand (ref: chequeId)
 */
export function bounceInLines(c: Cheque): JournalLine[] {
  return [
    { account: "receivables", debit: c.amount, credit: 0, ref: c.partyId },
    { account: "cheques_in_hand", debit: 0, credit: c.amount, ref: c.id },
  ];
}

/**
 * IN — RETURNED to the customer undeposited (refType
 * "cheque_return", refId = chequeId): the mirror of capture —
 * the same lines as a bounce; what differs is the instrument's
 * fate (handed back, not refused) and the entry's refType.
 */
export function returnInLines(c: Cheque): JournalLine[] {
  return bounceInLines(c);
}

/**
 * OUT — BOUNCE / stopped / returned by the supplier (refType
 * "cheque_bounce", refId = chequeId): the payable re-opens; the
 * subledger moves with it via the compensating `supplierPayments`
 * reversal row the store writes in the same batch.
 *   Dr cheques_issued (ref: chequeId) / Cr payables (ref: supplierId)
 */
export function bounceOutLines(c: Cheque): JournalLine[] {
  return [
    { account: "cheques_issued", debit: c.amount, credit: 0, ref: c.id },
    { account: "payables", debit: 0, credit: c.amount, ref: c.partyId },
  ];
}

/**
 * Bank charges booked at an IN bounce — a SEPARATE entry in the
 * same batch (refType "cheque_bounce", refId = chequeId), because
 * the bank debiting the shop's account is a distinct money event
 * from the customer's default (§4.3). It lands on
 * `expense_finance` — the COA's bank/finance-charges account.
 *   Dr expense_finance / Cr cash|wallet (ref: depositAccountId)
 */
export function bounceChargesLines(
  c: Cheque,
  gl: "cash" | "wallet",
  charges: number
): JournalLine[] {
  return [
    { account: "expense_finance", debit: charges, credit: 0 },
    { account: gl, debit: 0, credit: charges, ref: c.accountId },
  ];
}

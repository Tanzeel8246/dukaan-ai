/// Dukaan AI — cheque registry derivations & journal templates
/// (Dart port of web/lib/cheques.ts, Phase B · B5).
///
/// The registry doc is a mutable STATUS record; the journal remains
/// the money history. The identities this module exists to keep
/// assertable at every step:
///
///   Σ uncleared IN cheques (received + deposited)
///     == journal balance of `cheques_in_hand`
///   Σ pending OUT cheques (issued)
///     == journal balance of `cheques_issued` (normal side)
///
/// Journal line `ref` convention for cheque accounts: ref = chequeId.
import 'periods.dart' show isValidDateISO;
import 'types.dart';

/// A capture draft is usable when it names the instrument: a
/// non-empty leaf number and two real calendar dates. The DUE date
/// may legitimately be in the future (post-dated cheques).
bool isValidChequeDraft(ChequeDraft? d) {
  if (d == null) return false;
  if (d.chequeNo.trim().isEmpty) return false;
  if (!isValidDateISO(d.issueDateISO) || !isValidDateISO(d.dueDateISO)) return false;
  return true;
}

/* ---------------- registry derivations ---------------- */

/// IN cheques whose value still sits in `cheques_in_hand`.
List<Cheque> unclearedInCheques(List<Cheque> cheques) => cheques
    .where((c) => c.direction == 'in' && (c.status == 'received' || c.status == 'deposited'))
    .toList();

double unclearedInTotal(List<Cheque> cheques) =>
    unclearedInCheques(cheques).fold(0.0, (a, c) => a + c.amount);

/// OUT cheques handed over but not yet cleared/bounced.
List<Cheque> pendingOutCheques(List<Cheque> cheques) =>
    cheques.where((c) => c.direction == 'out' && c.status == 'issued').toList();

double pendingOutTotal(List<Cheque> cheques) =>
    pendingOutCheques(cheques).fold(0.0, (a, c) => a + c.amount);

/// View: in the drawer (received, not yet deposited).
List<Cheque> chequesInDrawer(List<Cheque> cheques) =>
    cheques.where((c) => c.direction == 'in' && c.status == 'received').toList();

/// View: at the bank, awaiting clearance.
List<Cheque> chequesAtBank(List<Cheque> cheques) =>
    cheques.where((c) => c.direction == 'in' && c.status == 'deposited').toList();

const List<String> _pendingStatuses = ['received', 'deposited', 'issued'];

/// A pending cheque whose PDC date has arrived — it may clear now.
bool chequeIsDue(Cheque c, String todayISO) =>
    _pendingStatuses.contains(c.status) && c.dueDateISO.compareTo(todayISO) <= 0;

/// A pending cheque PAST its PDC date and still uncleared.
bool chequeIsOverdue(Cheque c, String todayISO) =>
    _pendingStatuses.contains(c.status) && c.dueDateISO.compareTo(todayISO) < 0;

/// View: pending and due (clearable now), either direction.
List<Cheque> chequesDue(List<Cheque> cheques, String todayISO) =>
    cheques.where((c) => chequeIsDue(c, todayISO)).toList();

/* ---------------- lifecycle transitions ---------------- */

/// The transition table — the single place that knows which
/// (direction, status, source) may take which action:
///  - deposit: IN only, from `received` (custody; posts nothing).
///  - clear: IN from `deposited`, OUT from `issued`.
///  - bounce: IN from `deposited` ONLY; OUT from `issued` and only
///    for supplier payments (an expense cheque's correction path
///    is the expense's own F-5 reversal machinery).
///  - return: IN from `received` only.
/// Terminal statuses accept nothing.
bool canChequeTransition(Cheque c, String action) {
  switch (action) {
    case 'deposit':
      return c.direction == 'in' && c.status == 'received';
    case 'clear':
      return (c.direction == 'in' && c.status == 'deposited') ||
          (c.direction == 'out' && c.status == 'issued');
    case 'bounce':
      if (c.direction == 'in') return c.status == 'deposited';
      return c.status == 'issued' && c.sourceType == 'supplier_payment';
    case 'return':
      return c.direction == 'in' && c.status == 'received';
  }
  return false;
}

/* ---------------- journal templates ----------------
 * Capture/issuance lines are NOT here: they are woven into their
 * host entries by the store composers (the bill's payment lines,
 * the repayment entry, the supplier-payment entry, the expense
 * entry), reusing the host refTypes by design. */

/// CLEARING (refType "cheque_clearing", refId = chequeId). `gl` is
/// the recorded money account's GL bucket.
///   IN:  Dr cash|wallet (ref: accountId) / Cr cheques_in_hand
///   OUT: Dr cheques_issued / Cr cash|wallet (ref: accountId)
List<JournalLine> clearingLines(Cheque c, String gl) {
  if (c.direction == 'in') {
    return [
      JournalLine(account: gl, debit: c.amount, ref: c.accountId),
      JournalLine(account: 'cheques_in_hand', credit: c.amount, ref: c.id),
    ];
  }
  return [
    JournalLine(account: 'cheques_issued', debit: c.amount, ref: c.id),
    JournalLine(account: gl, credit: c.amount, ref: c.accountId),
  ];
}

/// IN — BOUNCE (refType "cheque_bounce"): the receivable is
/// restored exactly; the subledger moves with it via the
/// compensating `credits` row the store writes in the same batch.
///   Dr receivables (ref: customerId) / Cr cheques_in_hand
List<JournalLine> bounceInLines(Cheque c) => [
      JournalLine(account: 'receivables', debit: c.amount, ref: c.partyId),
      JournalLine(account: 'cheques_in_hand', credit: c.amount, ref: c.id),
    ];

/// IN — RETURNED undeposited (refType "cheque_return"): the mirror
/// of capture — the same lines as a bounce.
List<JournalLine> returnInLines(Cheque c) => bounceInLines(c);

/// OUT — BOUNCE (refType "cheque_bounce"): the payable re-opens;
/// the subledger moves with it via the compensating reversal row.
///   Dr cheques_issued (ref: chequeId) / Cr payables (ref: supplierId)
List<JournalLine> bounceOutLines(Cheque c) => [
      JournalLine(account: 'cheques_issued', debit: c.amount, ref: c.id),
      JournalLine(account: 'payables', credit: c.amount, ref: c.partyId),
    ];

/// Bank charges booked at an IN bounce — a SEPARATE entry in the
/// same batch (refType "cheque_bounce"), landing on expense_finance.
///   Dr expense_finance / Cr cash|wallet (ref: accountId)
List<JournalLine> bounceChargesLines(Cheque c, String gl, double charges) => [
      JournalLine(account: 'expense_finance', debit: charges),
      JournalLine(account: gl, credit: charges, ref: c.accountId),
    ];

/// Dukaan AI — loans register pure core (Dart port of
/// web/lib/loans.ts, ERP Phase D · D3).
///
/// Design: ERP-PHASE-D-DESIGN.md §3.1 (the register doc), §3.2
/// (terms + charges — charges default to NONE; receivable loans
/// are charge-free in v1), §3.3 (schedule + position derived from
/// the events diary; the journal is the money truth), §3.4 (the
/// posting templates: fee-netted drawdown, desk-confirmed charge
/// events, whole-amount repayments), §3.5 (register totals).
import 'ledger.dart';
import 'types.dart';

/* ------------------------------------------------------------------ */
/* Dates (small ISO helpers, shared with the schedule)                 */
/* ------------------------------------------------------------------ */

({int y, int m, int d}) _parseISO(String iso) => (
      y: int.parse(iso.substring(0, 4)),
      m: int.parse(iso.substring(5, 7)),
      d: int.parse(iso.substring(8, 10)),
    );

String _pad2(int n) => n < 10 ? '0$n' : '$n';

String _toISO(int y, int m, int d) => '$y-${_pad2(m)}-${_pad2(d)}';

int _daysInMonth(int y, int m) => DateTime.utc(y, m + 1, 0).day;

/// Shift an ISO date by whole months, clamping the day to the
/// target month's length (31 Jan + 1 month → 28/29 Feb).
String addMonthsISO(String iso, int months) {
  final p = _parseISO(iso);
  final total = p.y * 12 + (p.m - 1) + months;
  final ny = total ~/ 12;
  final nm = (total % 12) + 1;
  final last = _daysInMonth(ny, nm);
  return _toISO(ny, nm, p.d < last ? p.d : last);
}

/// Shift an ISO date by whole days.
String addDaysISO(String iso, int days) {
  final p = _parseISO(iso);
  final dt = DateTime.utc(p.y, p.m, p.d).add(Duration(days: days));
  return _toISO(dt.year, dt.month, dt.day);
}

/// The due date of instalment `n` (1-based): the first due date
/// stepped by the loan's cadence.
String instalmentDueISO(Loan loan, int n) {
  final steps = n - 1;
  return loan.instalmentEvery == 'week'
      ? addDaysISO(loan.firstDueISO, steps * 7)
      : addMonthsISO(loan.firstDueISO, steps);
}

/* ------------------------------------------------------------------ */
/* Terms: validation + the charge snapshot (design §3.1/§3.2)          */
/* ------------------------------------------------------------------ */

class LoanTerms {
  final String direction;
  final String partyName;
  final double principal;
  final String chargeType;
  final double chargeRate;
  final double feeAmount;
  final int instalmentCount;
  const LoanTerms({required this.direction, required this.partyName,
    required this.principal, required this.chargeType, required this.chargeRate,
    required this.feeAmount, required this.instalmentCount});
}

/// The composition refusals (design §3.2/§3.4): a reason key or
/// null when the terms may compose. The receivable charge
/// refusal lives here — charged lending is refused at
/// composition, never silently zeroed.
String? loanTermsError(LoanTerms terms) {
  if (!terms.principal.isFinite || !(terms.principal > 0)) return 'principal';
  if (terms.partyName.trim().isEmpty) return 'party';
  if (!terms.instalmentCount.isFinite || terms.instalmentCount < 1) {
    return 'instalments';
  }
  if (terms.direction == 'receivable' && terms.chargeType != 'none') {
    return 'chargeReceivable'; // §3.2 rule 3: receivable loans are charge-free in v1
  }
  if ((terms.chargeType == 'flat' || terms.chargeType == 'reducing') &&
      !(terms.chargeRate > 0)) {
    return 'rate';
  }
  final fee = terms.feeAmount;
  if (terms.chargeType == 'fee_only' && !(fee > 0)) return 'fee';
  // A netted fee must leave positive proceeds — a fee at or above
  // the principal would draw down nothing (or less than nothing).
  if (!(fee >= 0) || fee >= terms.principal) return 'fee';
  return null;
}

/// The charge total snapshotted onto the loan doc at creation
/// (design §3.1): flat = % of the ORIGINAL principal over the
/// whole term; fee_only = the one-off fee itself. Reducing
/// charges depend on the schedule's outstanding, so no total
/// exists at creation (0 — the schedule computes each period's).
double loanChargeAmount({
  required String chargeType,
  required double principal,
  required double chargeRate,
  required double feeAmount,
}) {
  if (chargeType == 'flat') return roundPaisa((principal * chargeRate) / 100);
  if (chargeType == 'fee_only') return roundPaisa(feeAmount);
  return 0;
}

/* ------------------------------------------------------------------ */
/* The schedule — a pure function of the loan doc (design §3.3)        */
/* ------------------------------------------------------------------ */

class LoanInstalment {
  final int n;
  final String dueISO;
  final double principalPart;
  final double chargePart;
  final double total;
  const LoanInstalment({required this.n, required this.dueISO,
    required this.principalPart, required this.chargePart, required this.total});
  Map<String, dynamic> toJson() => {
        'n': n, 'dueISO': dueISO, 'principalPart': principalPart,
        'chargePart': chargePart, 'total': total,
      };
}

/// Split `total` into `count` parts by the cumulative-allocation
/// discipline (the F-3 pattern): each part is the rounded
/// cumulative target less what was already allocated, so the
/// parts sum EXACTLY to the total and the final part absorbs the
/// paisa residual (100,000 over 7 → 14,285.71 ×6 + 14,285.74).
List<double> splitEvenly(double total, int count) {
  final parts = <double>[];
  var allocated = 0.0;
  for (var i = 1; i <= count; i++) {
    final cum = roundPaisa((total * i) / count);
    parts.add(roundPaisa(cum - allocated));
    allocated = cum;
  }
  return parts;
}

/// The instalment schedule (design §3.3): principal parts split
/// the principal evenly (final absorbs the residual); a FLAT
/// charge splits its snapshotted total the same way; a REDUCING
/// charge computes per period on the outstanding principal PER
/// THE SCHEDULE (the agreement — late payment never rewrites
/// it); `none`/`fee_only` instalments carry no charge.
List<LoanInstalment> loanSchedule(Loan loan) {
  final count = loan.instalmentCount > 0 ? loan.instalmentCount : 0;
  if (count == 0) return [];
  final principalParts = splitEvenly(loan.principal, count);
  final List<double> chargeParts;
  if (loan.chargeType == 'flat') {
    chargeParts = splitEvenly(loan.chargeAmount, count);
  } else if (loan.chargeType == 'reducing') {
    chargeParts = [];
    var outstanding = loan.principal;
    for (var i = 0; i < count; i++) {
      chargeParts.add(roundPaisa((outstanding * loan.chargeRate) / 100));
      outstanding = roundPaisa(outstanding - principalParts[i]);
    }
  } else {
    chargeParts = principalParts.map((_) => 0.0).toList();
  }
  return [
    for (var i = 0; i < count; i++)
      LoanInstalment(
        n: i + 1,
        dueISO: instalmentDueISO(loan, i + 1),
        principalPart: principalParts[i],
        chargePart: chargeParts[i],
        total: roundPaisa(principalParts[i] + chargeParts[i]),
      ),
  ];
}

/* ------------------------------------------------------------------ */
/* Position — derived from the events diary (design §3.3)              */
/* ------------------------------------------------------------------ */

class LoanPosition {
  final bool drawn;
  final double principalRepaid;
  final double chargesAccrued;
  final double chargesRepaid;
  final double feesRecognised;
  final double totalRepaid;
  final double outstanding;
  const LoanPosition({required this.drawn, required this.principalRepaid,
    required this.chargesAccrued, required this.chargesRepaid,
    required this.feesRecognised, required this.totalRepaid,
    required this.outstanding});
  Map<String, dynamic> toJson() => {
        'drawn': drawn, 'principalRepaid': principalRepaid,
        'chargesAccrued': chargesAccrued, 'chargesRepaid': chargesRepaid,
        'feesRecognised': feesRecognised, 'totalRepaid': totalRepaid,
        'outstanding': outstanding,
      };
}

/// Fold the loan's append-only events diary into its position.
/// Reversal events carry negated figures (the D2 diary pattern),
/// so every sum is NET — a reversed event contributes nothing.
/// Fee events are NOT accruals: the fee was expensed and netted
/// at drawdown, it never adds to outstanding.
LoanPosition loanPosition(Loan loan) {
  var drawnAmount = 0.0;
  var principalRepaid = 0.0;
  var chargesAccrued = 0.0;
  var chargesRepaid = 0.0;
  var feesRecognised = 0.0;
  var totalRepaid = 0.0;
  for (final ev in loan.events) {
    if (ev.kind == 'drawdown') {
      drawnAmount += ev.amount;
    } else if (ev.kind == 'charge') {
      chargesAccrued += ev.amount;
    } else if (ev.kind == 'fee') {
      feesRecognised += ev.amount;
    } else if (ev.kind == 'repayment') {
      totalRepaid += ev.amount;
      principalRepaid += ev.principalPart;
      chargesRepaid += ev.chargePart;
    }
    // "writeoff" events never exist in v1 (§3.4) — ignored by design.
  }
  return LoanPosition(
    drawn: drawnAmount > 0,
    principalRepaid: roundPaisa(principalRepaid),
    chargesAccrued: roundPaisa(chargesAccrued),
    chargesRepaid: roundPaisa(chargesRepaid),
    feesRecognised: roundPaisa(feesRecognised),
    totalRepaid: roundPaisa(totalRepaid),
    outstanding: roundPaisa(loan.principal - principalRepaid + chargesAccrued - chargesRepaid),
  );
}

/// The journal-side position of ONE loan — payable =
/// Σ (credit − debit) over `loans_payable` lines citing the
/// loan; receivable mirrors on `loans_receivable`. For a DRAWN
/// loan this equals `loanPosition(loan).outstanding` to the
/// paisa.
double loanJournalPosition(List<JournalEntry> entries, Loan loan) {
  final code = loan.direction == 'payable' ? 'loans_payable' : 'loans_receivable';
  var pos = 0.0;
  for (final e in entries) {
    for (final l in e.lines) {
      if (l.account != code || l.ref != loan.id) continue;
      pos += loan.direction == 'payable' ? l.credit - l.debit : l.debit - l.credit;
    }
  }
  return roundPaisa(pos);
}

/// How many instalments' charges stand accrued. Charge accrual
/// is ordinal (§3.4): the k-th standing charge event IS
/// instalment k's accrual. A reversal event un-accrues the latest.
int accruedChargeCount(Loan loan) {
  var count = 0;
  for (final ev in loan.events) {
    if (ev.kind != 'charge') continue;
    if (ev.amount > 0) {
      count++;
    } else if (ev.amount < 0) {
      count--;
    }
  }
  return count > 0 ? count : 0;
}

/// The next instalment whose charge is due to accrue, or null —
/// the schedule proposes; nothing posts until the desk confirms.
LoanInstalment? nextChargeAccrual(Loan loan) {
  if (loan.direction != 'payable') return null;
  if (loan.chargeType != 'flat' && loan.chargeType != 'reducing') return null;
  if (loan.status != 'active') return null;
  final schedule = loanSchedule(loan);
  final idx = accruedChargeCount(loan);
  if (idx >= schedule.length) return null;
  final next = schedule[idx];
  return next.chargePart > 0 ? next : null;
}

/* ------------------------------------------------------------------ */
/* Per-instalment state (design §3.3/§3.5)                             */
/* ------------------------------------------------------------------ */

class LoanInstalmentState extends LoanInstalment {
  final bool chargeAccrued;
  final double owed;
  final double paidAmount;
  final String state; // paid | partial | overdue | due | upcoming
  const LoanInstalmentState({
    required super.n, required super.dueISO, required super.principalPart,
    required super.chargePart, required super.total,
    required this.chargeAccrued, required this.owed, required this.paidAmount,
    required this.state,
  });
}

/// Derive every instalment's state: repayment money applies in
/// instalment order against what each instalment OWES (principal
/// + accrued charge); an instalment past its due date with money
/// still owed is OVERDUE.
List<LoanInstalmentState> loanInstalmentStates(Loan loan, String todayISO) {
  final pos = loanPosition(loan);
  final accrued = accruedChargeCount(loan);
  var remaining = pos.totalRepaid;
  return loanSchedule(loan).map((inst) {
    final chargeAccrued = inst.chargePart > 0 ? inst.n <= accrued : false;
    final owed = roundPaisa(inst.principalPart + (chargeAccrued ? inst.chargePart : 0));
    final paidAmount = roundPaisa(
        owed < (remaining > 0 ? remaining : 0.0) ? owed : (remaining > 0 ? remaining : 0.0));
    remaining = roundPaisa(remaining - paidAmount);
    final state = owed > 0 && paidAmount >= owed - 0.001
        ? 'paid'
        : paidAmount > 0
            ? 'partial'
            : inst.dueISO.compareTo(todayISO) < 0 && owed > 0
                ? 'overdue'
                : inst.dueISO.compareTo(todayISO) <= 0
                    ? 'due'
                    : 'upcoming';
    return LoanInstalmentState(
      n: inst.n, dueISO: inst.dueISO, principalPart: inst.principalPart,
      chargePart: inst.chargePart, total: inst.total,
      chargeAccrued: chargeAccrued, owed: owed, paidAmount: paidAmount,
      state: state,
    );
  }).toList();
}

/// The first instalment still carrying owed money, plus the
/// count of overdue instalments — null when nothing is owed.
({LoanInstalmentState instalment, int overdueCount})? loanNextDue(Loan loan, String todayISO) {
  final states = loanInstalmentStates(loan, todayISO);
  final overdueCount = states.where((s) => s.state == 'overdue').length;
  for (final s in states) {
    if (s.owed - s.paidAmount > 0.001) {
      return (instalment: s, overdueCount: overdueCount);
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Repayment split (design §3.4)                                       */
/* ------------------------------------------------------------------ */

/// The default attribution of a repayment: CHARGES FIRST, the
/// remainder to principal. The split is attribution (§3.3) —
/// the journal line is the whole amount either way.
({double principalPart, double chargePart}) defaultRepaymentSplit(Loan loan, double amount) {
  final pos = loanPosition(loan);
  final raw = pos.chargesAccrued - pos.chargesRepaid;
  final chargeDue = raw > 0 ? roundPaisa(raw) : 0.0;
  final chargePart = roundPaisa(amount < chargeDue ? amount : chargeDue);
  return (principalPart: roundPaisa(amount - chargePart), chargePart: chargePart);
}

/// Validate a (possibly desk-overridden) split against the
/// loan's derived position: "split" | "overpay" | null.
String? repaymentSplitError(
  Loan loan,
  double amount,
  ({double principalPart, double chargePart}) split,
) {
  final pos = loanPosition(loan);
  if (!(amount > 0)) return 'split';
  if (amount > pos.outstanding + 0.001) return 'overpay';
  if ((split.principalPart + split.chargePart - amount).abs() > 0.011) {
    return 'split';
  }
  final rawCharge = pos.chargesAccrued - pos.chargesRepaid;
  final chargeDue = rawCharge > 0 ? roundPaisa(rawCharge) : 0.0;
  final rawPrincipal = loan.principal - pos.principalRepaid;
  final principalDue = rawPrincipal > 0 ? roundPaisa(rawPrincipal) : 0.0;
  if (split.chargePart > chargeDue + 0.001) return 'split';
  if (split.principalPart > principalDue + 0.001) return 'split';
  return null;
}

/// The cached status label, recomputed inside every event
/// batch (§3.3): a drawn loan whose outstanding reaches zero
/// is settled; a cancelled loan stays cancelled.
String loanStatusFor(Loan loan) {
  if (loan.status == 'cancelled') return 'cancelled';
  final pos = loanPosition(loan);
  return pos.drawn && pos.outstanding <= 0.001 ? 'settled' : 'active';
}

/// Register header totals (design §3.5): derived outstanding
/// summed per direction over non-cancelled loans.
({double borrowedOutstanding, double lentOutstanding}) loansRegisterTotals(List<Loan> loans) {
  var borrowed = 0.0;
  var lent = 0.0;
  for (final loan in loans) {
    if (loan.status == 'cancelled') continue;
    final out = loanPosition(loan).outstanding;
    if (loan.direction == 'payable') {
      borrowed += out;
    } else {
      lent += out;
    }
  }
  return (borrowedOutstanding: roundPaisa(borrowed), lentOutstanding: roundPaisa(lent));
}

/* ------------------------------------------------------------------ */
/* Posting templates (design §3.4) — composed here, posted by the     */
/* store through the guard. `makeEntry` enforces the balance.          */
/* ------------------------------------------------------------------ */

/// Drawdown (design §3.4). Payable — money in, fee netted:
/// Dr money (P − F) · Dr `expense_finance` F · Cr `loans_payable` P.
/// Receivable — the mirror on `loans_receivable`, never a fee.
JournalEntry buildLoanDrawdownEntry(
  Loan loan, {
  required String method,
  required String? accountId,
  double feeAmount = 0,
  String? ts,
  int dayOffset = 0,
}) {
  final money = accountForMethod(method);
  final fee = loan.direction == 'payable' ? roundPaisa(feeAmount) : 0.0;
  final lines = loan.direction == 'payable'
      ? <JournalLine>[
          JournalLine(account: money, debit: roundPaisa(loan.principal - fee), credit: 0, ref: accountId),
          if (fee > 0)
            JournalLine(account: 'expense_finance', debit: fee, credit: 0),
          JournalLine(account: 'loans_payable', debit: 0, credit: loan.principal, ref: loan.id),
        ]
      : <JournalLine>[
          JournalLine(account: 'loans_receivable', debit: loan.principal, credit: 0, ref: loan.id),
          JournalLine(account: money, debit: 0, credit: loan.principal, ref: accountId),
        ];
  return makeEntry(
    'Loan drawdown ${loan.number} — ${loan.partyName}',
    'loan_drawdown',
    loan.id,
    lines,
    ts: ts,
    dayOffset: dayOffset,
  );
}

/// One instalment's charge accrual (design §3.4): Dr
/// `expense_finance` / Cr `loans_payable`, posted ONLY as a
/// discrete desk-confirmed event — never automatic.
JournalEntry buildLoanChargeEntry(
  Loan loan, {
  required LoanInstalment instalment,
  String? ts,
  int dayOffset = 0,
}) {
  return makeEntry(
    'Loan charge ${loan.number} — instalment ${instalment.n}',
    'loan_charge',
    loan.id,
    [
      JournalLine(account: 'expense_finance', debit: instalment.chargePart, credit: 0),
      JournalLine(account: 'loans_payable', debit: 0, credit: instalment.chargePart, ref: loan.id),
    ],
    ts: ts,
    dayOffset: dayOffset,
  );
}

/// A repayment (design §3.4), either direction. The journal line
/// is the WHOLE amount; the principal/charge split rides on the
/// loan doc's event (attribution), never on the lines.
JournalEntry buildLoanRepaymentEntry(
  Loan loan, {
  required double amount,
  required String method,
  required String? accountId,
  String? ts,
  int dayOffset = 0,
}) {
  final money = accountForMethod(method);
  final lines = loan.direction == 'payable'
      ? <JournalLine>[
          JournalLine(account: 'loans_payable', debit: amount, credit: 0, ref: loan.id),
          JournalLine(account: money, debit: 0, credit: amount, ref: accountId),
        ]
      : <JournalLine>[
          JournalLine(account: money, debit: amount, credit: 0, ref: accountId),
          JournalLine(account: 'loans_receivable', debit: 0, credit: amount, ref: loan.id),
        ];
  return makeEntry(
    'Loan repayment ${loan.number} — ${loan.partyName}',
    'loan_repayment',
    loan.id,
    lines,
    ts: ts,
    dayOffset: dayOffset,
  );
}

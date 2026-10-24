/// Dukaan AI — payroll pure core (Dart port of web/lib/payroll.ts,
/// ERP Phase D · D1/D2).
///
/// Design: ERP-PHASE-D-DESIGN.md §1.3/§1.4 (attendance summaries +
/// the proration rule), §2.2 (the `salary_payable` subledger
/// composition), §2.3/§2.4 (run composition + the posting
/// templates), §2.6/§2.7 (reversals + slip figures). EVERYTHING
/// here is a pure derivation or an entry composition: attendance
/// totals, earned base and employee positions are computed from
/// documents and journal lines at read time — never stored.
import 'ledger.dart';
import 'types.dart';

/* ------------------------------------------------------------------ */
/* Month keys                                                          */
/* ------------------------------------------------------------------ */

/// The deterministic attendance doc id (design §1.3).
String attendanceDocId(String employeeId, String month) => '${employeeId}__$month';

final _monthRe = RegExp(r'^(\d{4})-(\d{2})$');

/// Calendar days in a "YYYY-MM" month (28–31). 0 for a malformed key.
int daysInMonthOf(String month) {
  final m = _monthRe.firstMatch(month);
  if (m == null) return 0;
  final year = int.parse(m.group(1)!);
  final mon = int.parse(m.group(2)!);
  if (mon < 1 || mon > 12) return 0;
  return DateTime.utc(year, mon + 1, 0).day;
}

String _pad2(int n) => n < 10 ? '0$n' : '$n';

/// Shift a "YYYY-MM" month key by whole months (register navigation).
String shiftMonth(String month, int delta) {
  final m = _monthRe.firstMatch(month);
  if (m == null) return month;
  final d = DateTime.utc(int.parse(m.group(1)!), int.parse(m.group(2)!) + delta, 1);
  return '${d.year}-${_pad2(d.month)}';
}

/// The current calendar month key in Asia/Karachi (the shop's
/// business timezone — a plain UTC slice would flip the register
/// a day early/late around midnight PKT).
String currentMonthKey([DateTime? now]) {
  final t = (now ?? DateTime.now()).toUtc().add(const Duration(hours: 5));
  return '${t.year}-${_pad2(t.month)}';
}

/* ------------------------------------------------------------------ */
/* Attendance (design §1.3/§1.4)                                       */
/* ------------------------------------------------------------------ */

/// One tap cycles the mark in this order (design §1.3); the tap
/// after `off` clears the day back to unmarked.
const List<String> attendanceCycle = ['present', 'absent', 'half', 'leave', 'off'];

/// The mark a tap produces from the current one; `null` = clear
/// the day (unmarked). From unmarked, a tap marks `present`.
String? nextAttendanceMark(String? current) {
  if (current == null) return 'present';
  final i = attendanceCycle.indexOf(current);
  if (i < 0) return 'present';
  return i == attendanceCycle.length - 1 ? null : attendanceCycle[i + 1];
}

class AttendanceSummary {
  final int present;
  final int absent;
  final int half;
  final int leave;
  final int off;
  final int markedDays;
  /// Paid units (design §1.4): present + 0.5 × half + leave + off.
  final double workedUnits;
  const AttendanceSummary({this.present = 0, this.absent = 0, this.half = 0,
    this.leave = 0, this.off = 0, this.markedDays = 0, this.workedUnits = 0});
}

/// Per-employee tallies for one attendance doc (design §1.3) —
/// derived on every read; the doc stores only the sparse marks.
AttendanceSummary attendanceSummary(AttendanceMonth? att) {
  var present = 0, absent = 0, half = 0, leave = 0, off = 0, markedDays = 0;
  if (att != null) {
    for (final mark in att.days.values) {
      if (mark == 'present') {
        present++;
      } else if (mark == 'absent') {
        absent++;
      } else if (mark == 'half') {
        half++;
      } else if (mark == 'leave') {
        leave++;
      } else if (mark == 'off') {
        off++;
      } else {
        continue; // an unknown stored mark counts for nothing
      }
      markedDays++;
    }
  }
  return AttendanceSummary(
    present: present, absent: absent, half: half, leave: leave, off: off,
    markedDays: markedDays,
    workedUnits: present + 0.5 * half + leave + off,
  );
}

class EarnedBase {
  final double earnedBase;
  final int unpaidAbsent;
  final double workedUnits;
  const EarnedBase(this.earnedBase, this.unpaidAbsent, this.workedUnits);
}

/// The proration rule (design §1.4), pure and total:
///   monthly: unpaidAbsent = max(0, absent − paidLeaveDays);
///            earnedBase = round2(B × (D − unpaidAbsent) / D)
///   daily:   earnedBase = round2(rate × (present + 0.5 × half))
EarnedBase earnedBaseFor(Employee emp, AttendanceSummary summary, int daysInMonth) {
  if (emp.payBasis == 'daily') {
    final units = summary.present + 0.5 * summary.half;
    return EarnedBase(roundPaisa(emp.baseAmount * units), 0, units);
  }
  final leaveAllowance = emp.paidLeaveDays > 0 ? emp.paidLeaveDays : 0;
  final unpaidAbsent = summary.absent - leaveAllowance > 0 ? summary.absent - leaveAllowance : 0;
  final earnedBase = daysInMonth > 0
      ? roundPaisa((emp.baseAmount * (daysInMonth - unpaidAbsent > 0 ? daysInMonth - unpaidAbsent : 0)) / daysInMonth)
      : 0.0;
  return EarnedBase(earnedBase, unpaidAbsent, summary.workedUnits);
}

/// True when a POSTED payroll run already covers this month —
/// the register's warn-don't-lock signal (design §1.3).
bool hasPostedRunForMonth(List<PayrollRun> runs, String month) =>
    runs.any((r) => r.month == month && r.status == 'posted');

/* ------------------------------------------------------------------ */
/* The `salary_payable` subledger (design §2.2)                        */
/* ------------------------------------------------------------------ */

/// One employee's position, straight off the journal:
/// Σ (debit − credit) over `salary_payable` lines carrying their
/// id in `ref`. Positive ⇒ the employee owes the shop (net
/// advances outstanding); negative ⇒ the shop owes the employee.
double employeePosition(List<JournalEntry> entries, String employeeId) {
  var pos = 0.0;
  for (final e in entries) {
    for (final l in e.lines) {
      if (l.account == 'salary_payable' && l.ref == employeeId) {
        pos += l.debit - l.credit;
      }
    }
  }
  return roundPaisa(pos);
}

class SalaryPayableComposition {
  final double glBalance;
  final List<({String employeeId, double position})> employees;
  final double owedToEmployees;
  final double advancesOutstanding;
  final double unassignedAccrued;
  const SalaryPayableComposition({required this.glBalance, required this.employees,
    required this.owedToEmployees, required this.advancesOutstanding,
    required this.unassignedAccrued});
}

/// The honest two-part composition of `salary_payable` (§2.2):
/// per-employee positions + the unassigned production bucket,
/// summing to the GL exactly:
///   glBalance == owedToEmployees − advancesOutstanding + unassignedAccrued.
SalaryPayableComposition salaryPayableComposition(List<JournalEntry> entries) {
  final byEmployee = <String, double>{};
  var unassignedRaw = 0.0; // Σ (debit − credit) over ref-less lines
  for (final e in entries) {
    for (final l in e.lines) {
      if (l.account != 'salary_payable') continue;
      final ref = l.ref;
      if (ref == null) {
        unassignedRaw += l.debit - l.credit;
      } else {
        byEmployee[ref] = (byEmployee[ref] ?? 0) + (l.debit - l.credit);
      }
    }
  }
  final ids = byEmployee.keys.toList()..sort();
  final employees = [
    for (final id in ids) (employeeId: id, position: roundPaisa(byEmployee[id]!)),
  ];
  var owedToEmployees = 0.0;
  var advancesOutstanding = 0.0;
  for (final e in employees) {
    if (e.position < 0) {
      owedToEmployees += -e.position;
    } else if (e.position > 0) {
      advancesOutstanding += e.position;
    }
  }
  return SalaryPayableComposition(
    glBalance: accountNormalBalance(entries, 'salary_payable'),
    employees: employees,
    owedToEmployees: roundPaisa(owedToEmployees),
    advancesOutstanding: roundPaisa(advancesOutstanding),
    unassignedAccrued: roundPaisa(-unassignedRaw),
  );
}

/* ------------------------------------------------------------------ */
/* Run composition (D2, design §2.3/§2.4)                              */
/* ------------------------------------------------------------------ */

({double gross, double deductions, double netAccrued}) payrollRunTotals(List<PayrollRunLine> lines) {
  var gross = 0.0, deductions = 0.0, netAccrued = 0.0;
  for (final l in lines) {
    gross += l.gross;
    deductions += l.deductions.fold(0.0, (s, d) => s + d.amount);
    netAccrued += l.netAccrued;
  }
  return (
    gross: roundPaisa(gross),
    deductions: roundPaisa(deductions),
    netAccrued: roundPaisa(netAccrued),
  );
}

/// Recompute ONE line's derived figures after a desk edit
/// (design §2.3: gross is earnedBase + allowances, net is
/// gross − deductions, always).
PayrollRunLine payrollLineTotals(PayrollRunLine line) {
  final gross = roundPaisa(
      line.earnedBase + line.allowances.fold(0.0, (s, a) => s + a.amount));
  final netAccrued = roundPaisa(
      gross - line.deductions.fold(0.0, (s, d) => s + d.amount));
  return line.copyWith(gross: gross, netAccrued: netAccrued);
}

/// Compose a draft run's lines from the directory + the month's
/// attendance (design §2.3): one line per ACTIVE employee, the
/// §1.4 proration recomputed now and SNAPSHOTTED.
List<PayrollRunLine> buildRunLines(
  List<Employee> employees,
  List<AttendanceMonth> attendance,
  String month,
) {
  final dim = daysInMonthOf(month);
  final lines = <PayrollRunLine>[];
  for (final emp in employees) {
    if (!emp.active) continue;
    AttendanceMonth? doc;
    for (final a in attendance) {
      if (a.id == attendanceDocId(emp.id, month)) {
        doc = a;
        break;
      }
    }
    final sum = attendanceSummary(doc);
    final earned = earnedBaseFor(emp, sum, dim);
    lines.add(payrollLineTotals(PayrollRunLine(
      employeeId: emp.id,
      name: emp.name,
      payBasis: emp.payBasis,
      daysInMonth: dim,
      present: sum.present,
      absent: sum.absent,
      half: sum.half,
      leave: sum.leave,
      unpaidAbsent: earned.unpaidAbsent,
      earnedBase: earned.earnedBase,
      allowances: emp.allowances.map((a) => PayLine(label: a.label, amount: a.amount)).toList(),
      deductions: const [],
      gross: 0,
      netAccrued: 0,
    )));
  }
  return lines;
}

/// Σ of a run's payment events for one employee — reversing
/// events carry negative amounts, so this is the NET cash the
/// run has paid them. Pass `null` for the unassigned bucket.
double paidForRun(PayrollRun run, String? employeeId) {
  var paid = 0.0;
  for (final p in run.payments) {
    if (p.employeeId == employeeId) paid += p.amount;
  }
  return roundPaisa(paid);
}

/// An employee's `salary_payable` position counting only the
/// entries at or before the given entry (lexicographic (ts, id)
/// order — the journal's own sort), EXCLUDING the given entry
/// itself and any entry in `excludeIds`. The slip's "advance
/// position before this run" (§2.7). 0 when the bound is unknown.
double positionBeforeEntry(
  List<JournalEntry> entries,
  String employeeId,
  String? boundEntryId, [
  Set<String>? excludeIds,
]) {
  if (boundEntryId == null) return 0;
  JournalEntry? bound;
  for (final e in entries) {
    if (e.id == boundEntryId) {
      bound = e;
      break;
    }
  }
  if (bound == null) return 0;
  var pos = 0.0;
  for (final e in entries) {
    if (e.id == boundEntryId) continue;
    if (excludeIds != null && excludeIds.contains(e.id)) continue;
    if (e.ts.compareTo(bound.ts) > 0 ||
        (e.ts == bound.ts && e.id.compareTo(bound.id) >= 0)) {
      continue;
    }
    for (final l in e.lines) {
      if (l.account == 'salary_payable' && l.ref == employeeId) {
        pos += l.debit - l.credit;
      }
    }
  }
  return roundPaisa(pos);
}

class RunLineFigures {
  final double netAccrued;
  final double advanceBefore;
  final double cashPaid;
  final double advanceRecovered;
  final double stillOwed;
  final double advanceOutstanding;
  const RunLineFigures({required this.netAccrued, required this.advanceBefore,
    required this.cashPaid, required this.advanceRecovered,
    required this.stillOwed, required this.advanceOutstanding});
}

/// Every figure a run line's desk row and salary slip show,
/// derived ONCE here from the run snapshot + the journal
/// (design §2.3/§2.7: no third arithmetic anywhere).
RunLineFigures runLineFigures(
  List<JournalEntry> entries,
  PayrollRun run,
  PayrollRunLine line,
) {
  final cashPaid = paidForRun(run, line.employeeId);
  final posNow = employeePosition(entries, line.employeeId);
  double advanceBefore;
  if (run.accrualEntryId != null) {
    final paymentEntryIds = run.payments.map((p) => p.entryId).toSet();
    final before = positionBeforeEntry(entries, line.employeeId, run.accrualEntryId, paymentEntryIds);
    advanceBefore = before > 0 ? before : 0.0;
  } else {
    advanceBefore = posNow > 0 ? posNow : 0.0;
  }
  final netMinusCash = line.netAccrued - cashPaid;
  final recoverable = netMinusCash > 0 ? netMinusCash : 0.0;
  return RunLineFigures(
    netAccrued: line.netAccrued,
    advanceBefore: advanceBefore,
    cashPaid: cashPaid,
    advanceRecovered: advanceBefore < recoverable ? advanceBefore : recoverable,
    stillOwed: posNow < 0 ? -posNow : 0.0,
    advanceOutstanding: posNow > 0 ? posNow : 0.0,
  );
}

/* ------------------------------------------------------------------ */
/* Posting templates (D2, design §2.4) — composed here, posted by    */
/* the store through the guard. `makeEntry` enforces the balance.    */
/* ------------------------------------------------------------------ */

/// The finalise entry (design §2.4): ONE entry, NET accrual —
/// per line with netAccrued > 0, Dr `expense_salary` /
/// Cr `salary_payable`, both lines carrying `ref = employeeId`.
/// Reducer deductions NEVER enter the journal. Returns null when
/// no line accrues anything.
JournalEntry? buildPayrollAccrualEntry(
  PayrollRun run, {
  String? ts,
  int dayOffset = 0,
}) {
  final lines = <JournalLine>[];
  for (final l in run.lines) {
    if (!(l.netAccrued > 0)) continue;
    lines.add(JournalLine(account: 'expense_salary', debit: l.netAccrued, credit: 0, ref: l.employeeId));
    lines.add(JournalLine(account: 'salary_payable', debit: 0, credit: l.netAccrued, ref: l.employeeId));
  }
  if (lines.isEmpty) return null;
  return makeEntry(
    run.number != null ? 'Payroll ${run.number} — ${run.month}' : 'Payroll — ${run.month}',
    'payroll_accrual',
    run.id,
    lines,
    ts: ts,
    dayOffset: dayOffset,
  );
}

/// One payment event's entry (design §2.4): Dr `salary_payable`
/// (ref = employeeId, or NO ref for the unassigned production
/// bucket) / Cr the money account. Advance recovery is NOT part
/// of this entry — it is a §2.7 derivation, never a posting.
JournalEntry buildPayrollPaymentEntry({
  required PayrollRun run,
  required String? employeeId,
  required String name,
  required double amount,
  required String method,
  required String? accountId,
  String? ts,
  int dayOffset = 0,
}) {
  return makeEntry(
    run.number != null ? 'Salary payment ${run.number} — $name' : 'Salary payment — $name',
    'payroll_payment',
    run.id,
    [
      JournalLine(account: 'salary_payable', debit: amount, credit: 0, ref: employeeId),
      JournalLine(account: accountForMethod(method), debit: 0, credit: amount, ref: accountId),
    ],
    ts: ts,
    dayOffset: dayOffset,
  );
}

/// A salary advance (design §2.4): Dr `salary_payable`
/// (ref = employeeId) / Cr money. Not an expense, not a
/// customer-khata row — it rides the employee's own subledger.
JournalEntry buildSalaryAdvanceEntry({
  required String employeeId,
  required String name,
  required double amount,
  required String method,
  required String? accountId,
  String? ts,
  int dayOffset = 0,
}) {
  return makeEntry(
    'Salary advance — $name',
    'salary_advance',
    employeeId,
    [
      JournalLine(account: 'salary_payable', debit: amount, credit: 0, ref: employeeId),
      JournalLine(account: accountForMethod(method), debit: 0, credit: amount, ref: accountId),
    ],
    ts: ts,
    dayOffset: dayOffset,
  );
}

/// The universal mirror (design §2.6): a reversing entry whose
/// lines negate the original's exactly, citing it via
/// `reversesId`. The original stands forever.
JournalEntry buildMirrorEntry(
  JournalEntry original,
  String memo, {
  String? ts,
  int dayOffset = 0,
}) {
  return makeEntry(
    memo,
    original.refType,
    original.refId,
    original.lines
        .map((l) => JournalLine(account: l.account, debit: l.credit, credit: l.debit, ref: l.ref))
        .toList(),
    reversesId: original.id,
    ts: ts,
    dayOffset: dayOffset,
  );
}

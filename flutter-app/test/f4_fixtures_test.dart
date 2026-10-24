/// Golden-fixture parity for F4 (Phase F design §9 F4 checkpoint):
/// the Dart Phase D ports (payroll, loans, fiscal, tally,
/// branding, raast) must produce results EQUAL to the web's
/// lib/payroll, lib/loans, lib/fiscal, lib/tally, lib/branding
/// and lib/raast — byte-for-byte on journal entries and on the
/// Tally XML/CSV strings, figure-for-figure on the derivations
/// (the §2.2 salary_payable identity at every checkpoint, loan
/// diary ≡ journal at every step, the §4.6 close identity),
/// for the shared scenarios exported by
/// harness/fixtures-export-f4.js from the REAL web functions.
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:dukaan_ai/core/branding.dart';
import 'package:dukaan_ai/core/fiscal.dart';
import 'package:dukaan_ai/core/ledger.dart';
import 'package:dukaan_ai/core/loans.dart';
import 'package:dukaan_ai/core/payroll.dart';
import 'package:dukaan_ai/core/periods.dart';
import 'package:dukaan_ai/core/raast.dart';
import 'package:dukaan_ai/core/reports.dart';
import 'package:dukaan_ai/core/tally.dart';
import 'package:dukaan_ai/core/types.dart';

String canon(JournalEntry e) {
  final lines = e.lines
      .map((l) => '${l.account}:${l.debit.toStringAsFixed(2)}:${l.credit.toStringAsFixed(2)}:${l.ref}')
      .join(',');
  return '${e.memo}|${e.refType}|${e.refId}|${e.reversesId}|$lines';
}

String canonExpected(Map<String, dynamic> e) {
  final lines = (e['lines'] as List)
      .map((l) => '${l['account']}:${(l['debit'] as num).toStringAsFixed(2)}:${(l['credit'] as num).toStringAsFixed(2)}:${l['ref']}')
      .join(',');
  return '${e['memo']}|${e['refType']}|${e['refId']}|${e['reversesId']}|$lines';
}

bool deepApprox(dynamic a, dynamic b) {
  if (a is num && b is num) return (a.toDouble() - b.toDouble()).abs() < 0.011;
  if (a is Map && b is Map) {
    if (a.length != b.length) return false;
    for (final k in a.keys) {
      if (!b.containsKey(k) || !deepApprox(a[k], b[k])) return false;
    }
    return true;
  }
  if (a is List && b is List) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (!deepApprox(a[i], b[i])) return false;
    }
    return true;
  }
  return a == b;
}

void expectApprox(dynamic actual, dynamic expected, String reason) {
  if (!deepApprox(actual, expected)) {
    fail('$reason\n  actual:   ${jsonEncode(actual)}\n  expected: ${jsonEncode(expected)}');
  }
}

Map<String, dynamic> mm(dynamic m) => Map<String, dynamic>.from(m as Map);

JournalEntry entryFromFixture(Map<String, dynamic> e) => JournalEntry(
      id: e['id'] as String,
      memo: e['memo'] as String,
      refType: e['refType'] as String,
      refId: e['refId'] as String?,
      reversesId: e['reversesId'] as String?,
      lines: [
        for (final l in (e['lines'] as List))
          JournalLine(
            account: l['account'] as String,
            debit: (l['debit'] as num).toDouble(),
            credit: (l['credit'] as num).toDouble(),
            ref: l['ref'] as String?,
          ),
      ],
      dayOffset: (e['dayOffset'] as num?)?.toInt() ?? 0,
      ts: e['ts'] as String,
      dateISO: e['dateISO'] as String?,
    );

List<JournalEntry> journalOf(Map<String, dynamic> s) =>
    (s['entries'] as List).map((e) => entryFromFixture(mm(e))).toList();

Map<String, dynamic> compJson(SalaryPayableComposition c) => {
      'glBalance': c.glBalance,
      'employees': [
        for (final e in c.employees) {'employeeId': e.employeeId, 'position': e.position},
      ],
      'owedToEmployees': c.owedToEmployees,
      'advancesOutstanding': c.advancesOutstanding,
      'unassignedAccrued': c.unassignedAccrued,
    };

Map<String, dynamic> figJson(RunLineFigures f) => {
      'netAccrued': f.netAccrued,
      'advanceBefore': f.advanceBefore,
      'cashPaid': f.cashPaid,
      'advanceRecovered': f.advanceRecovered,
      'stillOwed': f.stillOwed,
      'advanceOutstanding': f.advanceOutstanding,
    };

Map<String, dynamic> lineJson(PayrollRunLine l) => {
      'employeeId': l.employeeId, 'name': l.name, 'payBasis': l.payBasis,
      'daysInMonth': l.daysInMonth, 'present': l.present, 'absent': l.absent,
      'half': l.half, 'leave': l.leave, 'unpaidAbsent': l.unpaidAbsent,
      'earnedBase': l.earnedBase,
      'allowances': [for (final a in l.allowances) a.toMap()],
      'deductions': [for (final d in l.deductions) d.toMap()],
      'gross': l.gross, 'netAccrued': l.netAccrued,
    };

void main() {
  final file = File('../harness/fixtures/f4-core.json');
  final fx = jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
  final scenarios = (fx['scenarios'] as List).cast<Map<String, dynamic>>();
  Map<String, dynamic> scenario(String id) => scenarios.firstWhere((s) => s['id'] == id);
  final ops = mm(fx['ops']);

  group('F4 whole fixture journal', () {
    test('every entry balanced; grand trial balance is zero', () {
      var dr = 0.0, cr = 0.0;
      for (final s in scenarios) {
        for (final e in journalOf(s)) {
          final d = e.lines.fold(0.0, (a, l) => a + l.debit);
          final c = e.lines.fold(0.0, (a, l) => a + l.credit);
          expect((d - c).abs(), lessThan(0.001), reason: '${s['id']}/${e.id}');
          dr += d;
          cr += c;
        }
      }
      expect((dr - cr).abs(), lessThan(0.01));
    });
  });

  group('S1 payroll-cycle — composers byte-for-byte', () {
    final s = scenario('payroll-cycle');
    final docs = mm(s['docs']);
    final employees = (docs['employees'] as List).map((m) => Employee.fromMap(m['id'] as String, mm(m))).toList();
    final attendance = (docs['attendance'] as List).map((m) => AttendanceMonth.fromMap(m['id'] as String, mm(m))).toList();
    final entries = (s['entries'] as List).cast<Map<String, dynamic>>();
    final journal = journalOf(s);
    final runFinal = PayrollRun.fromMap(mm(docs['runFinal'])['id'] as String, mm(docs['runFinal']));

    test('advance + accrual entries match the web compositions', () {
      final adv = buildSalaryAdvanceEntry(
        employeeId: 'emp-a', name: 'Muhammad Aslam', amount: 15000,
        method: 'cash', accountId: 'acct-till');
      expect(canon(adv), canonExpected(entries[0]));
      final draftRun = PayrollRun(
        id: runFinal.id, number: 'PAY-1', month: '2026-09',
        lines: runFinal.lines, totals: runFinal.totals);
      final accrual = buildPayrollAccrualEntry(draftRun);
      expect(accrual, isNotNull);
      expect(canon(accrual!), canonExpected(entries[2]));
    });

    test('draft lines compose from directory + attendance, desk edits re-derive', () {
      var lines = buildRunLines(employees, attendance, '2026-09');
      expect(lines.length, 2, reason: 'the inactive employee is excluded');
      lines = lines.map((l) {
        if (l.employeeId == 'emp-a') {
          return payrollLineTotals(l.copyWith(deductions: const [PayLine(label: 'EOBI', amount: 500)]));
        }
        if (l.employeeId == 'emp-b') {
          return payrollLineTotals(l.copyWith(allowances: const [PayLine(label: 'Overtime', amount: 1200)]));
        }
        return l;
      }).toList();
      final draft = mm(docs['runDraft']);
      expectApprox([for (final l in lines) lineJson(l)], draft['lines'], 'run lines');
      final totals = payrollRunTotals(lines);
      expectApprox(
        {'gross': totals.gross, 'deductions': totals.deductions, 'netAccrued': totals.netAccrued},
        draft['totals'], 'run totals');
    });

    test('payment entries match, event by event', () {
      for (final p in runFinal.payments) {
        final entry = buildPayrollPaymentEntry(
          run: runFinal, employeeId: p.employeeId, name: p.name,
          amount: p.amount, method: p.method, accountId: p.accountId);
        final expected = entries.firstWhere((e) => e['id'] == p.entryId);
        expect(canon(entry), canonExpected(expected), reason: 'payment ${p.entryId}');
      }
    });

    test('§2.2 composition identity at every checkpoint', () {
      final ck = mm(docs['checkpoints']);
      expectApprox(compJson(salaryPayableComposition(journal.sublist(0, 1))), ck['afterAdvance'], 'afterAdvance');
      expectApprox(compJson(salaryPayableComposition(journal.sublist(0, 2))), ck['afterIssue'], 'afterIssue');
      expectApprox(compJson(salaryPayableComposition(journal.sublist(0, 3))), ck['afterAccrual'], 'afterAccrual');
      expectApprox(compJson(salaryPayableComposition(journal.sublist(0, 4))), ck['afterPartialPay'], 'afterPartialPay');
      expectApprox(compJson(salaryPayableComposition(journal)), ck['final'], 'final');
      for (final c in [ck['afterAdvance'], ck['afterIssue'], ck['afterAccrual'], ck['afterPartialPay'], ck['final']]) {
        final m = mm(c);
        expect(
          ((m['owedToEmployees'] as num) - (m['advancesOutstanding'] as num) + (m['unassignedAccrued'] as num) - (m['glBalance'] as num)).abs(),
          lessThan(0.011), reason: 'GL ≡ Σ employees + bucket');
      }
    });

    test('run-line figures at accrual, partial pay and settle', () {
      final ck = mm(docs['checkpoints']);
      PayrollRunLine lineOf(String id) => runFinal.lines.firstWhere((l) => l.employeeId == id);
      final atAccrual = runFinal.copyWith(payments: const []);
      expectApprox(figJson(runLineFigures(journal.sublist(0, 3), atAccrual, lineOf('emp-a'))),
          mm(ck['figuresAfterAccrual'])['emp-a'], 'figures emp-a @accrual');
      expectApprox(figJson(runLineFigures(journal.sublist(0, 3), atAccrual, lineOf('emp-b'))),
          mm(ck['figuresAfterAccrual'])['emp-b'], 'figures emp-b @accrual');
      final atPartial = runFinal.copyWith(payments: [runFinal.payments.first]);
      expectApprox(figJson(runLineFigures(journal.sublist(0, 4), atPartial, lineOf('emp-a'))),
          mm(ck['figuresAfterPartialPay'])['emp-a'], 'figures emp-a @partial');
      expectApprox(figJson(runLineFigures(journal, runFinal, lineOf('emp-a'))),
          mm(ck['figuresFinal'])['emp-a'], 'figures emp-a final');
      expectApprox(figJson(runLineFigures(journal, runFinal, lineOf('emp-b'))),
          mm(ck['figuresFinal'])['emp-b'], 'figures emp-b final');
      final pos = mm(ck['positions']);
      expect(employeePosition(journal, 'emp-a'), (pos['emp-a'] as num).toDouble());
      expect(employeePosition(journal, 'emp-b'), (pos['emp-b'] as num).toDouble());
    });
  });

  group('S2 payroll-reversal — payments stand, the re-run absorbs', () {
    final s = scenario('payroll-reversal');
    final docs = mm(s['docs']);
    final entries = (s['entries'] as List).cast<Map<String, dynamic>>();
    final journal = journalOf(s);
    final run1 = PayrollRun.fromMap(mm(docs['run1'])['id'] as String, mm(docs['run1']));
    final run2 = PayrollRun.fromMap(mm(docs['run2'])['id'] as String, mm(docs['run2']));

    test('mirror entry byte-for-byte; position after reversal', () {
      final original = journal.firstWhere((e) => e.id == 'e1');
      final mirror = buildMirrorEntry(original, 'Payroll reversal PAY-1 — 2026-08');
      expect(canon(mirror), canonExpected(entries[3]));
      expect(employeePosition(journal.sublist(0, 4), 'emp-a'),
          (docs['positionAfterReversal'] as num).toDouble());
      expect(run1.status, 'reversed');
    });

    test('re-run figures absorb the standing advance', () {
      final line = run2.lines.first;
      expectApprox(figJson(runLineFigures(journal, run2, line)), docs['figuresRun2'], 'run2 figures');
    });
  });

  group('S3–S6 loans — schedule, diary ≡ journal, entries', () {
    void loanScenario(String id, void Function(Loan loan, List<JournalEntry> journal, Map<String, dynamic> docs) extra) {
      final s = scenario(id);
      final docs = mm(s['docs']);
      final loan = Loan.fromMap(mm(docs['loan'])['id'] as String, mm(docs['loan']));
      final journal = journalOf(s);
      test('$id schedule', () {
        expectApprox([for (final i in loanSchedule(loan)) i.toJson()], docs['schedule'], 'schedule');
      });
      test('$id position steps: diary ≡ journal ≡ web', () {
        final steps = (docs['positionSteps'] as List).cast<Map<String, dynamic>>();
        for (final step in steps) {
          // Find the diary prefix whose derived position equals
          // the exported step (steps are recorded in event order).
          var k = -1;
          for (var i = 0; i <= loan.events.length; i++) {
            final p = loanPosition(loan.copyWith(events: loan.events.sublist(0, i)));
            if (deepApprox(p.toJson(), step['diary'])) {
              k = i;
              break;
            }
          }
          expect(k, greaterThanOrEqualTo(0), reason: 'step ${step['label']} diary matched');
          final state = loan.copyWith(events: loan.events.sublist(0, k));
          // The journal prefix runs through the entry the last
          // included event cites (events carry entry labels).
          final lastEntryId = k == 0 ? null : loan.events[k - 1].entryId;
          final jIdx = lastEntryId == null
              ? 0
              : journal.indexWhere((e) => e.id == lastEntryId) + 1;
          final j = loanJournalPosition(journal.sublist(0, jIdx), state);
          expect(j, (step['journal'] as num).toDouble(), reason: 'journal @${step['label']}');
          expect((loanPosition(state).outstanding - j).abs(), lessThan(0.001),
              reason: 'diary ≡ journal @${step['label']}');
        }
        extra(loan, journal, docs);
      });
    }

    loanScenario('loan-lifecycle-payable-flat', (loan, journal, docs) {
      expect(loan.status, 'settled');
      // statesAfterFirstRepayment was derived mid-lifecycle; check
      // the exported snapshot against a loan stopped at repay1
      // (events: drawdown, charge, charge, repayment).
      final mid = loan.copyWith(events: loan.events.sublist(0, 4));
      expectApprox(
        [for (final st in loanInstalmentStates(mid, '2026-09-15')) _stateJson(st)],
        docs['statesAfterFirstRepayment'], 'instalment states');
      final nd = loanNextDue(mid, '2026-09-15');
      final expNd = mm(docs['nextDue']);
      expect(nd, isNotNull);
      expectApprox(_stateJson(nd!.instalment), expNd['instalment'], 'next due');
      expect(nd.overdueCount, expNd['overdueCount']);
    });

    loanScenario('loan-fee-netted-drawdown', (loan, journal, docs) {
      expect(loan.status, 'settled');
      expect(loanPosition(loan).feesRecognised, 1500);
      expect(nextChargeAccrual(loan), isNull);
      // The drawdown entry nets the fee: 3 lines, exact canon.
      final s = scenario('loan-fee-netted-drawdown');
      expect(journal.first.lines.length, 3);
      expect(canon(journal.first), canonExpected(mm((s['entries'] as List).first)));
    });

    loanScenario('loan-reducing', (loan, journal, docs) {
      expectApprox(docs['split'], {'principalPart': 15000, 'chargePart': 1200}, 'split');
      expect(loanPosition(loan).outstanding, 45900);
    });

    loanScenario('loan-receivable', (loan, journal, docs) {
      expect(loanPosition(loan).outstanding, 15000);
      expect(
        repaymentSplitError(loan, 15001, (principalPart: 15001.0, chargePart: 0.0)),
        'overpay');
      final draw = buildLoanDrawdownEntry(loan, method: 'cash', accountId: 'acct-till');
      final s = scenario('loan-receivable');
      expect(canon(draw), canonExpected(mm((s['entries'] as List).first)));
    });

    test('S3 composers byte-for-byte (drawdown, charges, repayments)', () {
      final s = scenario('loan-lifecycle-payable-flat');
      final docs = mm(s['docs']);
      final fresh = Loan.fromMap('loan-1', {
        'number': 'LN-1', 'direction': 'payable', 'partyName': 'Habib Bank — Gulberg',
        'principal': 100000, 'chargeType': 'flat', 'chargeRate': 10, 'chargeAmount': 10000,
        'startDateISO': '2026-07-01', 'instalmentCount': 7, 'instalmentEvery': 'month',
        'firstDueISO': '2026-08-01', 'events': [], 'status': 'active',
      });
      final entries = (s['entries'] as List).cast<Map<String, dynamic>>();
      expect(canon(buildLoanDrawdownEntry(fresh, method: 'bank', accountId: 'acct-wallet')),
          canonExpected(entries[0]));
      final schedule = loanSchedule(fresh);
      expect(canon(buildLoanChargeEntry(fresh, instalment: schedule[0])), canonExpected(entries[1]));
      expect(canon(buildLoanChargeEntry(fresh, instalment: schedule[1])), canonExpected(entries[2]));
      final withEvents = Loan.fromMap(mm(docs['loan'])['id'] as String, mm(docs['loan']));
      expect(canon(buildLoanRepaymentEntry(withEvents, amount: 20000, method: 'bank', accountId: 'acct-wallet')),
          canonExpected(entries[3]));
    });
  });

  group('S7 fiscal-close-cycle — checklist, close, reopen, stack', () {
    final s = scenario('fiscal-close-cycle');
    final docs = mm(s['docs']);
    final journal = journalOf(s);
    final entries = (s['entries'] as List).cast<Map<String, dynamic>>();
    FiscalYearRange rangeOf(Map<String, dynamic> m) => FiscalYearRange(
          m['startDate'] as String, m['endDate'] as String,
          m['fromTs'] as String, m['toTs'] as String);
    final range = rangeOf(mm(docs['range']));
    final range2 = rangeOf(mm(docs['range2']));
    final periods = (docs['periods'] as List).map((m) => PeriodDoc.fromMap(m['id'] as String, mm(m))).toList();
    final labels = mm(docs['closingLabels']);
    int idxOf(String label) => journal.indexWhere((e) => e.id == label);

    test('range + label derive from settings exactly as web', () {
      final settings = ShopSettingsView.fromMap(mm(docs['settings']));
      final r = fiscalYearRange(settings, '2026-03-01T00:00:00.000Z');
      expect(r.startDate, range.startDate);
      expect(r.endDate, range.endDate);
      expect(r.fromTs, range.fromTs);
      expect(r.toTs, range.toTs);
      expect(fyLabel(range), 'FY 2025-26');
    });

    test('checklist figures match (gates green, warnings live)', () {
      final inputs = mm(docs['inputs']);
      final checklist = fiscalYearCloseChecklist(
        journal: journal,
        payrollRuns: [PayrollRun.fromMap(mm(inputs['draftRun'])['id'] as String, mm(inputs['draftRun']))],
        productionOrders: [ProductionOrder.fromMap(mm(inputs['openOrder'])['id'] as String, mm(inputs['openOrder']))],
        cheques: (inputs['cheques'] as List).map((m) => Cheque.fromMap(m['id'] as String, mm(m))).toList(),
        products: (inputs['products'] as List).map((m) => Product.fromMap(m['id'] as String, mm(m))).toList(),
        range: range,
        lockedThrough: '',
      );
      final exp = mm(docs['checklist']);
      expectApprox(
        [for (final i in checklist.items) {'id': i.id, 'severity': i.severity, 'triggered': i.triggered, 'value': i.value}],
        exp['items'], 'checklist items');
      expect(checklist.hardGatesPass, exp['hardGatesPass']);
      expect(checklist.warningIds, (exp['warningIds'] as List).cast<String>());
      expect(checklist.purchasesClearing, (exp['purchasesClearing'] as num).toDouble());
      expect(checklist.draftPayrollRuns, exp['draftPayrollRuns']);
      expect(checklist.openProductionOrders, exp['openProductionOrders']);
      expectApprox(compJson(checklist.salary), exp['salary'], 'salary composition');
      expect(checklist.chequesInHand, (exp['chequesInHand'] as num).toDouble());
      expect(checklist.stockGl, (exp['stockGl'] as num).toDouble());
      expect(checklist.stockShelf, (exp['stockShelf'] as num).toDouble());
      expect(checklist.stockDivergence, (exp['stockDivergence'] as num).toDouble());
      expect(checklist.trialBalance.closingDifference, (exp['tbClosingDifference'] as num).toDouble());
    });

    test('closing entry byte-for-byte; §4.6 identity holds', () {
      final before = journal.sublist(0, idxOf(labels['close1'] as String));
      final closing = buildFiscalClosingEntry(before, range, 'per-fy1');
      expect(closing, isNotNull);
      expect(canon(closing!), canonExpected(entries[idxOf(labels['close1'] as String)]));
      final summary = closingEntrySummary(journal[idxOf(labels['close1'] as String)]);
      final expSummary = mm(docs['summary']);
      expectApprox([for (final r in summary.rows) {'account': r.account, 'amount': r.amount}],
          expSummary['rows'], 'summary rows');
      expect(summary.net, (expSummary['net'] as num).toDouble());
      final pl = plOver(before.where((e) => e.ts.compareTo(range.fromTs) >= 0 && e.ts.compareTo(range.toTs) < 0).toList());
      final expPl = mm(docs['plBefore']);
      expect(pl.revenue, (expPl['revenue'] as num).toDouble());
      expect(pl.net, (expPl['net'] as num).toDouble());
      expect((summary.net - pl.net).abs(), lessThan(0.001), reason: 'summary ≡ P&L');
      // After the close the P&L (which excludes fy_close) is unchanged.
      final plAfter = plOver(journal
          .sublist(0, idxOf(labels['close1'] as String) + 1)
          .where((e) => e.ts.compareTo(range.fromTs) >= 0 && e.ts.compareTo(range.toTs) < 0)
          .toList());
      expect(plAfter.net, pl.net);
      expect(plAfter.revenue, pl.revenue);
    });

    test('close state, reopen mirror, stack blocker', () {
      final closeDoc = periods.firstWhere((p) => p.id == 'per-fy1');
      final stClosed = fiscalCloseState(
        journal.sublist(0, idxOf(labels['close1'] as String) + 1), [closeDoc], range);
      expect(stClosed.closed, mm(docs['stateAfterClose'])['closed']);
      final mirror = buildFiscalReopenEntry(
        journal[idxOf(labels['close1'] as String)], '2026-10-23T09:00:00.000Z');
      expect(canon(mirror), canonExpected(entries[idxOf(labels['mirror'] as String)]));
      final reopenDoc = periods.firstWhere((p) => p.id == 'per-fy1-re');
      final stReopened = fiscalCloseState(
        journal.sublist(0, idxOf(labels['mirror'] as String) + 1), [closeDoc, reopenDoc], range);
      expect(stReopened.closed, mm(docs['stateAfterReopen'])['closed']);
      expect(accountNormalBalance(journal.sublist(0, idxOf(labels['mirror'] as String) + 1), 'retained_earnings'), 0);
      final closeDoc2 = periods.firstWhere((p) => p.id == 'per-fy1b');
      final blocker = fiscalReopenBlocker(journal, periods, closeDoc2);
      expect(blocker?.id, docs['blockerId']);
      expect(fiscalCloseState(journal, periods, range2).closed, isTrue);
    });

    test('opening balances (balance-sheet carry) match', () {
      final rows = balanceSheetBalances(journal, range2.fromTs);
      expectApprox(
        [for (final r in rows) {'account': r.account, 'balance': r.balance}],
        docs['openings'], 'openings');
    });
  });

  group('S8 tally-export — model, XML and CSV byte-compare', () {
    final s = scenario('tally-export');
    final docs = mm(s['docs']);
    final journal = journalOf(s);
    final p = mm(docs['parties']);
    final parties = TallyParties(
      customers: (p['customers'] as List).map((m) => Customer.fromMap(m['id'] as String, mm(m))).toList(),
      suppliers: (p['suppliers'] as List).map((m) => Supplier.fromMap(m['id'] as String, mm(m))).toList(),
      employees: (p['employees'] as List).map((m) => Employee.fromMap(m['id'] as String, mm(m))).toList(),
      accounts: (p['accounts'] as List).map((m) => MoneyAccount.fromMap(m['id'] as String, mm(m))).toList(),
      docNumbers: mm(p['docNumbers']).map((k, v) => MapEntry(k, v as String)),
    );
    final settings = ShopSettingsView.fromMap(mm(docs['settings']));
    final rm = mm(docs['range']);
    final range = ReportRange(
      fromDate: rm['fromDate'] as String, toDate: rm['toDate'] as String,
      fromTs: rm['fromTs'] as String, toTs: rm['toTs'] as String);

    test('export model equals the web model', () {
      final model = buildTallyExport(journal, parties, settings, range);
      expectApprox(model.toJson(), docs['model'], 'tally model');
      final tb = mm(docs['tbTotals']);
      expect(model.totalDebits, (tb['totalDebits'] as num).toDouble());
      expect(model.totalCredits, (tb['totalCredits'] as num).toDouble());
    });

    test('XML byte-for-byte; CSV byte-for-byte', () {
      expect(tallyXML(journal, parties, settings, range), docs['xml'] as String);
      expect(journalCSV(journal, parties, settings, range), docs['csv'] as String);
    });

    test('the Dart XML re-parses and reconciles to the trial balance', () {
      final xml = tallyXML(journal, parties, settings, range);
      // Hand-rolled re-parse of the known envelope (no xml pkg):
      // per voucher, Σ AMOUNT over deemed-positive lines must be
      // the mirror of Σ AMOUNT over the rest, and the export's
      // totals must equal the range trial balance.
      final voucherBlocks = RegExp(r'<VOUCHER [^>]*>(.*?)</VOUCHER>', dotAll: true)
          .allMatches(xml).map((m) => m.group(1)!).toList();
      final model = buildTallyExport(journal, parties, settings, range);
      expect(voucherBlocks.length, model.vouchers.length);
      var dr = 0.0, cr = 0.0;
      for (var i = 0; i < voucherBlocks.length; i++) {
        final lines = RegExp(r'<ISDEEMEDPOSITIVE>(Yes|No)</ISDEEMEDPOSITIVE>\s*<AMOUNT>(-?[\d.]+)</AMOUNT>')
            .allMatches(voucherBlocks[i]).toList();
        expect(lines.length, model.vouchers[i].lines.length);
        var vDr = 0.0, vCr = 0.0;
        for (final lm in lines) {
          final amt = double.parse(lm.group(2)!);
          if (lm.group(1) == 'Yes') {
            expect(amt, lessThanOrEqualTo(0), reason: 'debit amounts are negative in Tally sign');
            vDr += -amt;
          } else {
            expect(amt, greaterThanOrEqualTo(0));
            vCr += amt;
          }
        }
        expect((vDr - model.vouchers[i].debitTotal).abs(), lessThan(0.011));
        expect((vCr - model.vouchers[i].creditTotal).abs(), lessThan(0.011));
        dr += vDr;
        cr += vCr;
      }
      final tb = trialBalanceReport(journal, range);
      expect((dr - tb.totalDebits).abs(), lessThan(0.011), reason: 'XML ΣDr == TB');
      expect((cr - tb.totalCredits).abs(), lessThan(0.011), reason: 'XML ΣCr == TB');
    });
  });

  group('ops — derivation edges (web ≡ Dart)', () {
    test('loan terms refusals', () {
      final cases = (ops['termsCases'] as List).cast<Map<String, dynamic>>();
      final errors = (ops['termsErrors'] as List);
      for (var i = 0; i < cases.length; i++) {
        final c = mm(cases[i]);
        final err = loanTermsError(LoanTerms(
          direction: c['direction'] as String, partyName: c['partyName'] as String,
          principal: (c['principal'] as num).toDouble(), chargeType: c['chargeType'] as String,
          chargeRate: (c['chargeRate'] as num).toDouble(), feeAmount: (c['feeAmount'] as num).toDouble(),
          instalmentCount: (c['instalmentCount'] as num).toInt()));
        expect(err, errors[i], reason: 'case $i');
      }
    });

    test('IBAN validation + composition + grouping', () {
      final results = (ops['ibanResults'] as List).cast<Map<String, dynamic>>();
      final inputs = [
        raastSampleIban, 'PK36 SCBL 0000 0011 2345 6702', '03001234567',
        'PK36SCBL0000001123456703', 'PK36SCBL000000112345670',
        'GB29NWBK60161331926819', 'PK36SCB10000001123456702', '',
      ];
      for (var i = 0; i < inputs.length; i++) {
        final r = validatePkIban(inputs[i]);
        final exp = results[i];
        expect(r.ok, exp['ok'], reason: 'iban case $i');
        if (r.ok) {
          expect(r.iban, exp['iban']);
        } else {
          expect(r.code, exp['code'], reason: 'iban case $i');
        }
      }
      expect(pkIbanWithCheckDigits('MEZN', '0101199901012345'), ops['composedIban']);
      expect(validatePkIban(ops['composedIban'] as String).ok, isTrue);
      expect(groupIban(raastSampleIban), ops['groupIban']);
    });

    test('Raast payloads byte-for-byte + round-trip parses', () {
      final payloads = mm(ops['payloads']);
      expect(buildRaastP2pPayload(const RaastP2pInput(iban: raastSampleIban)), payloads['staticBare']);
      expect(
        buildRaastP2pPayload(RaastP2pInput(
          iban: raastSampleIban, fiName: 'MEEZAN BANK', amount: 1500.5,
          particulars: billParticulars(42))),
        payloads['dynamicBare']);
      expect(buildRaastP2pPayload(const RaastP2pInput(iban: raastSampleIban), 'tlv'), payloads['staticTlv']);
      expect(
        buildRaastP2pPayload(RaastP2pInput(
          iban: raastSampleIban, amount: 2000, particulars: 'Bill #7'), 'tlv'),
        payloads['dynamicTlv']);
      final parses = mm(ops['parses']);
      for (final k in ['staticBare', 'dynamicBare', 'staticTlv', 'dynamicTlv']) {
        final parsed = parseRaastP2pPayload(payloads[k] as String, k.endsWith('Tlv') ? 'tlv' : 'bare');
        expect(parsed.ok, isTrue, reason: k);
        expectApprox(parsed.objects!.toJson(), mm(parses[k])['objects'], 'parse $k');
      }
      expect(raastFraming.mode, mm(ops['framing'])['mode']);
      expect(raastFraming.status, 'provisional');
      expect(raastFraming.pinnedBy, isNull);
    });

    test('branding plan math + data-url bytes', () {
      final b = mm(ops['branding']);
      final plans = mm(b['plans']);
      List<Map<String, dynamic>> planJson(List<CompressionStep> steps) =>
          [for (final st in steps) st.toJson()];
      expectApprox(planJson(compressionPlan('logo', width: 1200, height: 900, hasAlpha: true)),
          plans['logoAlpha'], 'logo plan');
      expectApprox(planJson(compressionPlan('letterheadHeader', width: 2000, height: 500, hasAlpha: true)),
          plans['letterhead'], 'letterhead plan');
      expectApprox(planJson(compressionPlan('stamp', width: 300, height: 300, hasAlpha: false)),
          plans['stampSmall'], 'stamp plan');
      expect(compressionPlan('signature', width: 0, height: 100, hasAlpha: false), isEmpty);
      final bytes = mm(b['bytes']);
      expect(dataUrlBytes('data:image/png;base64,QUJD'), bytes['valid']);
      expect(dataUrlBytes('data:image/png;base64,QUI='), bytes['padded']);
      expect(dataUrlBytes('data:image/png;base64,QUJ'), bytes['ragged']);
      expect(dataUrlBytes('data:image/png,QUJD'), bytes['notBase64']);
      expect(brandingTotalCapBytes, b['totalCap']);
    });

    test('payroll + fiscal edges; register totals', () {
      final pe = mm(ops['payrollEdges']);
      final dim = mm(pe['daysInMonth']);
      expect(daysInMonthOf('2028-02'), dim['febLeap']);
      expect(daysInMonthOf('2026-02'), dim['febPlain']);
      expect(daysInMonthOf('2026-13'), dim['bad']);
      final shift = mm(pe['shift']);
      expect(shiftMonth('2026-11', 3), shift['fwd']);
      expect(shiftMonth('2026-01', -2), shift['back']);
      final cycle = (pe['markCycle'] as List);
      expect(nextAttendanceMark(null), cycle[0]);
      expect(nextAttendanceMark('present'), cycle[1]);
      expect(nextAttendanceMark('absent'), cycle[2]);
      expect(nextAttendanceMark('half'), cycle[3]);
      expect(nextAttendanceMark('leave'), cycle[4]);
      expect(nextAttendanceMark('off'), cycle[5]);
      final fe = mm(ops['fiscalEdges']);
      // H1/H2 lineage: the frozen F4 fixture predates the loyalty
      // pair — the live P&L set is the fixture's list plus
      // expense_loyalty (swept by the same registry-type close).
      expect(plAccountCodes(),
          [...(fe['plCodes'] as List).cast<String>(), 'expense_loyalty']);
      expect(
        fyLabel(const FiscalYearRange('2027-01-01', '2027-12-31', '', '')),
        fe['janLabel']);
      final totals = loansRegisterTotals([
        Loan(id: 'l1', direction: 'payable', principal: 1000, status: 'active',
            events: const [LoanEvent(kind: 'drawdown', amount: 1000, principalPart: 1000)]),
        const Loan(id: 'l2', direction: 'receivable', principal: 500, status: 'active'),
        const Loan(id: 'l3', direction: 'payable', principal: 9999, status: 'cancelled'),
      ]);
      final expTotals = mm(ops['registerTotals']);
      expect(totals.borrowedOutstanding, (expTotals['borrowedOutstanding'] as num).toDouble());
      expect(totals.lentOutstanding, (expTotals['lentOutstanding'] as num).toDouble());
    });
  });
}

Map<String, dynamic> _stateJson(LoanInstalmentState st) => {
      'n': st.n, 'dueISO': st.dueISO, 'principalPart': st.principalPart,
      'chargePart': st.chargePart, 'total': st.total,
      'chargeAccrued': st.chargeAccrued, 'owed': st.owed,
      'paidAmount': st.paidAmount, 'state': st.state,
    };

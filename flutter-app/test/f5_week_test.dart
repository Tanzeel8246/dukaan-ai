/// F5 — the three-client week-in-the-life (Phase F design §9 F5
/// checkpoint). One evolving shop trades for seven days through
/// SIXTEEN posting events whose `client` tags alternate web/app,
/// exported by harness/fixtures-export-f5.js from the REAL web
/// functions. This suite:
///   1. re-composes every APP-tagged entry with the Dart composers
///      and asserts byte-for-byte equality — plus, as a cross-client
///      bonus, three WEB-tagged entries (salary advance, payroll
///      accrual, the FY-close drill) composed in Dart too;
///   2. merges the whole journal and asserts the cross-client
///      identities: trial balance == 0 after EVERY event and at
///      week end; P&L net revenue == sales-report net revenue
///      (before AND after the FY close — the §4.6 identity);
///      salary_payable GL == Σ employees + bucket at five
///      checkpoints, ending at exactly 0; stock rows + in-transit
///      == stockQty per product and inventory GL movement == the
///      shelf value delta; receivables GL == credits subledger;
///      payables GL == supplier subledger; retained earnings ==
///      the week's P&L net after the close.
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:dukaan_ai/core/composers.dart';
import 'package:dukaan_ai/core/fiscal.dart';
import 'package:dukaan_ai/core/ledger.dart';
import 'package:dukaan_ai/core/payroll.dart';
import 'package:dukaan_ai/core/periods.dart';
import 'package:dukaan_ai/core/production.dart';
import 'package:dukaan_ai/core/reports.dart';
import 'package:dukaan_ai/core/stock.dart' as stock;
import 'package:dukaan_ai/core/transfers.dart' as tr;
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
      originDevice: e['originDevice'] as String?,
    );

Map<String, dynamic> compJson(SalaryPayableComposition c) => {
      'glBalance': c.glBalance,
      'employees': [
        for (final e in c.employees) {'employeeId': e.employeeId, 'position': e.position},
      ],
      'owedToEmployees': c.owedToEmployees,
      'advancesOutstanding': c.advancesOutstanding,
      'unassignedAccrued': c.unassignedAccrued,
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
  final file = File('../harness/fixtures/f5-week.json');
  final fx = jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
  final shop = mm(fx['shop']);
  final events = (fx['events'] as List).cast<Map<String, dynamic>>();
  final endState = mm(fx['endState']);
  final expect_ = mm(fx['expect']);

  final accounts = (shop['accounts'] as List)
      .map((m) => MoneyAccount.fromMap(m['id'] as String, mm(m)))
      .toList();
  final openingProducts = (shop['products'] as List)
      .map((m) => Product.fromMap(m['id'] as String, mm(m)))
      .toList();
  final byId = {for (final p in openingProducts) p.id: p};
  final slabs = (shop['slabs'] as List)
      .map((m) => TaxSlab.fromMap(m['id'] as String, mm(m)))
      .toList();
  final warehouses = (shop['warehouses'] as List)
      .map((m) => Warehouse.fromMap(m['id'] as String, mm(m)))
      .toList();
  final employees = (shop['employees'] as List)
      .map((m) => Employee.fromMap(m['id'] as String, mm(m)))
      .toList();
  final attendance = (shop['attendance'] as List)
      .map((m) => AttendanceMonth.fromMap(m['id'] as String, mm(m)))
      .toList();

  Map<String, dynamic> event(String kind) =>
      events.firstWhere((e) => e['kind'] == kind);
  JournalEntry fixtureEntry(Map<String, dynamic> ev) =>
      entryFromFixture(mm(ev['entry']));
  final weekJournal = [
    for (final ev in events) fixtureEntry(ev),
  ];

  group('week — app-composed entries byte-for-byte (Dart ≡ web)', () {
    test('e02 counter sale (app)', () {
      final ev = event('counter_sale');
      final docs = mm(ev['docs']);
      final sale = mm(docs['sale']);
      final entry = composeCounterSaleEntry(
        saleId: sale['id'] as String,
        product: byId[sale['productId'] as String]!,
        qty: (sale['qty'] as num).toDouble(),
        slabs: slabs, accounts: accounts, ts: ev['entry']['ts'] as String,
      );
      expect(canon(entry), canonExpected(mm(ev['entry'])));
    });

    test('e03 bill #101 (app) — entry + udhaar row', () {
      final ev = event('bill');
      final docs = mm(ev['docs']);
      final raw = Bill.fromMap(mm(docs['bill'])['id'] as String, mm(docs['bill']));
      final costTotal = raw.items.fold(0.0, (a, i) => a + i.qty * i.unitCost);
      final composed = composeBillEntry(
        bill: raw, pricedItems: raw.items, costTotal: costTotal,
        accounts: accounts, productsById: byId, ts: raw.ts,
      );
      expect(canon(composed.entry), canonExpected(mm(ev['entry'])));
      final expRow = mm(docs['creditRow']);
      expect(composed.creditRow, isNotNull);
      expect(composed.creditRow!.customerId, expRow['customerId']);
      expect(composed.creditRow!.kind, expRow['kind']);
      expect(composed.creditRow!.amount, (expRow['amount'] as num).toDouble());
      expect(composed.creditRow!.billId, expRow['billId']);
    });

    test('e05 udhaar repayment (app)', () {
      final ev = event('repayment');
      final row = CreditEntry.fromMap(
          mm(mm(ev['docs'])['creditRow'])['id'] as String, mm(mm(ev['docs'])['creditRow']));
      final entry = composeRepaymentEntry(row: row, accounts: accounts);
      expect(canon(entry), canonExpected(mm(ev['entry'])));
    });

    test('e07 transfer close-short (app) — the only transfer posting', () {
      final ev = event('transfer_close_short');
      final docs = mm(ev['docs']);
      final transfer = StockTransfer.fromMap(
          mm(docs['transfer'])['id'] as String, mm(docs['transfer']));
      final shortages = tr.transferShortages(transfer);
      expectApprox(
        [for (final s in shortages) {'productId': s.productId, 'qty': s.qty}],
        [for (final s in (docs['shortages'] as List)) {'productId': s['productId'], 'qty': s['qty']}],
        'shortages');
      expect(tr.transferLossValue(shortages, byId),
          (docs['lossValue'] as num).toDouble());
      final entry = tr.buildTransferLossEntry(transfer, shortages, byId);
      expect(entry, isNotNull);
      expect(canon(entry!), canonExpected(mm(ev['entry'])));
    });

    test('e09 production issue (app) — accrued labour, pool 4,860', () {
      final ev = event('production_issue');
      final docs = mm(ev['docs']);
      final order = ProductionOrder.fromMap(
          mm(docs['orderBefore'])['id'] as String, mm(docs['orderBefore']));
      final levelsBefore = (docs['levelsBefore'] as List)
          .map((m) => StockLevel.fromMap(m['id'] as String, mm(m)))
          .toList();
      // Products as they stood on Day 5 morning: quantities derived
      // from the fixture's own level rows (in-transit is closed).
      final productsAtD5 = [
        for (final p in openingProducts)
          p.copyWith(stockQty: stock.rowsTotal(levelsBefore, p.id)),
      ];
      final input = mm(docs['input']);
      final res = prepareIssue(
        order, productsAtD5, levelsBefore, warehouses, accounts,
        IssueInput(
          runQty: (input['runQty'] as num).toDouble(),
          lines: [
            for (final l in (input['lines'] as List))
              (productId: l['productId'] as String, qty: (l['qty'] as num).toDouble()),
          ],
          labourCost: (input['labourCost'] as num).toDouble(),
          overheadCost: (input['overheadCost'] as num).toDouble(),
          settlement: input['settlement'] as String,
          paidFromAccountId: input['paidFromAccountId'] as String?,
        ),
      );
      expect(res.problem, isNull, reason: 'issue refused: ${res.problem}');
      expect(canon(res.prepared!.entry), canonExpected(mm(ev['entry'])));
      final after = order.copyWith(
          events: [...order.events, res.prepared!.event],
          status: deriveProductionStatus(order.copyWith(events: [...order.events, res.prepared!.event])));
      expect(poolOf(after), (expect_['production']['poolAfterIssue'] as num).toDouble());
    });

    test('e10 production completion (app) — pool absorbed to zero', () {
      final ev = event('production_completion');
      final docs = mm(ev['docs']);
      final order = ProductionOrder.fromMap(
          mm(docs['orderBefore'])['id'] as String, mm(docs['orderBefore']));
      final res = completionAbsorb(order, (docs['qty'] as num).toDouble(), docs['final'] as bool);
      expect(res.problem, isNull, reason: 'completion refused: ${res.problem}');
      expect(res.value, (docs['value'] as num).toDouble());
      expect(res.unitCost, (docs['unitCost'] as num).toDouble());
      final entry = buildCompletionEntry(order, (docs['qty'] as num).toDouble(), res.value!);
      expect(canon(entry), canonExpected(mm(ev['entry'])));
    });

    test('e12–e14 payroll payments (app) — employees + the bucket', () {
      for (final kind in ['payroll_payment', 'payroll_bucket_payment']) {
        for (final ev in events.where((e) => e['kind'] == kind)) {
          final docs = mm(ev['docs']);
          final input = mm(docs['input']);
          final run = PayrollRun.fromMap(
              mm(docs['runBefore'])['id'] as String, mm(docs['runBefore']));
          final entry = buildPayrollPaymentEntry(
            run: run,
            employeeId: input['employeeId'] as String?,
            name: input['name'] as String,
            amount: (input['amount'] as num).toDouble(),
            method: input['method'] as String,
            accountId: input['accountId'] as String?,
          );
          expect(canon(entry), canonExpected(mm(ev['entry'])),
              reason: '$kind ${input['employeeId']}');
        }
      }
    });
  });

  group('week — web entries cross-composed in Dart (bonus parity)', () {
    test('e04 salary advance (web)', () {
      final ev = event('salary_advance');
      final input = mm(mm(ev['docs'])['input']);
      final entry = buildSalaryAdvanceEntry(
        employeeId: input['employeeId'] as String,
        name: input['name'] as String,
        amount: (input['amount'] as num).toDouble(),
        method: input['method'] as String,
        accountId: input['accountId'] as String?,
        ts: input['ts'] as String,
      );
      expect(canon(entry), canonExpected(mm(ev['entry'])));
    });

    test('e11 payroll accrual (web) — run lines + the one net entry', () {
      final ev = event('payroll_accrual');
      final runDraftMap = mm(mm(ev['docs'])['runDraft']);
      final lines = buildRunLines(employees, attendance, '2026-08');
      expectApprox(
        [for (final l in lines) lineJson(l)],
        [for (final l in (runDraftMap['lines'] as List)) mm(l)],
        'run lines');
      final run = PayrollRun.fromMap(runDraftMap['id'] as String, runDraftMap);
      final accrual = buildPayrollAccrualEntry(run);
      expect(accrual, isNotNull);
      expect(canon(accrual!), canonExpected(mm(ev['entry'])));
    });

    test('e16 FY-close drill (web) — Dart composes the same closing entry', () {
      final ev = event('fy_close');
      final docs = mm(ev['docs']);
      final rangeMap = mm(docs['range']);
      final range = FiscalYearRange(
        rangeMap['startDate'] as String, rangeMap['endDate'] as String,
        rangeMap['fromTs'] as String, rangeMap['toTs'] as String);
      // The range itself derives from the shop's fiscal settings.
      final derived = fiscalYearRange(
          ShopSettingsView.fromMap(mm(shop['fiscalSettings'])),
          '2026-09-13T12:00:00.000Z');
      expect(derived.startDate, range.startDate);
      expect(derived.endDate, range.endDate);
      final closing = buildFiscalClosingEntry(
          weekJournal.sublist(0, 15), range, docs['periodId'] as String);
      expect(closing, isNotNull);
      expect(canon(closing!), canonExpected(mm(ev['entry'])));
    });

    test('originDevice stamps: app entries carry them, web entries do not', () {
      for (final ev in events) {
        final e = fixtureEntry(ev);
        if (ev['client'] == 'app') {
          expect(e.originDevice, isNotNull, reason: '${ev['kind']} (app) must be stamped');
        } else {
          expect(e.originDevice, isNull, reason: '${ev['kind']} (web) carries no stamp');
        }
      }
    });
  });

  group('week — merged journal identities (all clients, to the rupee)', () {
    test('trial balance is zero after EVERY event and at week end', () {
      final j = weekJournal;
      for (var i = 1; i <= j.length; i++) {
        expect(trialBalanceTotal(j.sublist(0, i)).abs(), lessThan(0.01),
            reason: 'after event $i (${events[i - 1]['kind']})');
      }
      final tb = trialBalance(j);
      final expTb = mm(expect_['trialBalance']);
      // Dart's trialBalance omits zero-balance accounts by design;
      // the identity is on values — every touched account agrees,
      // and every zero fixture account is absent (== zero) in Dart.
      for (final k in expTb.keys) {
        expect(tb[k] ?? 0, closeTo((expTb[k] as num).toDouble(), 0.01), reason: 'TB $k');
      }
      for (final k in tb.keys) {
        expect(expTb.containsKey(k), isTrue, reason: 'Dart TB has untouched account $k');
      }
    });

    test('money: GL buckets == fixture; Σ per-account == bucket', () {
      final j = weekJournal;
      expect(accountNormalBalance(j, 'cash'), (expect_['glCash'] as num).toDouble());
      expect(accountNormalBalance(j, 'wallet'), (expect_['glWallet'] as num).toDouble());
      expect(accountsBucketBalance(j, accounts, 'cash'), accountBalance(j, 'cash'));
      expect(accountsBucketBalance(j, accounts, 'wallet'), accountBalance(j, 'wallet'));
    });

    test('receivables GL == credits subledger (both end at zero)', () {
      final j = weekJournal;
      final credits = (endState['credits'] as List)
          .map((m) => CreditEntry.fromMap(m['id'] as String, mm(m)))
          .toList();
      expect(accountNormalBalance(j, 'receivables'),
          (expect_['receivables'] as num).toDouble());
      expect(customerOutstanding(credits, 'cust-1'),
          (expect_['receivables'] as num).toDouble());
      expect(customerOutstanding(credits, 'cust-1'),
          closeTo((expect_['creditsOutstandingCust1'] as num).toDouble(), 0.01),
          reason: 'the exporter\'s own subledger sum agrees');
    });

    test('payables GL == supplier subledger', () {
      final j = weekJournal;
      expect(accountNormalBalance(j, 'payables'),
          (expect_['payables'] as num).toDouble());
      final byRef = j
          .expand((e) => e.lines)
          .where((l) => l.account == 'payables' && l.ref == 'sup-1')
          .fold(0.0, (a, l) => a + l.credit - l.debit);
      expect(byRef, (mm(expect_['payablesBySupplier'])['sup-1'] as num).toDouble());
    });

    test('salary_payable composition at five checkpoints, ending at 0', () {
      final j = weekJournal;
      final ck = mm(mm(fx['checkpoints'])['salary']);
      expectApprox(compJson(salaryPayableComposition(j.sublist(0, 4))), ck['afterAdvance'], 'afterAdvance');
      expectApprox(compJson(salaryPayableComposition(j.sublist(0, 9))), ck['afterIssue'], 'afterIssue');
      expectApprox(compJson(salaryPayableComposition(j.sublist(0, 11))), ck['afterAccrual'], 'afterAccrual');
      expectApprox(compJson(salaryPayableComposition(j.sublist(0, 13))), ck['afterPayments'], 'afterPayments');
      expectApprox(compJson(salaryPayableComposition(j)), ck['final'], 'final');
      expect(accountNormalBalance(j, 'salary_payable'), 0);
    });

    test('stock: rows + in-transit == stockQty; GL movement == shelf delta', () {
      final j = weekJournal;
      final endLevels = (endState['levels'] as List)
          .map((m) => StockLevel.fromMap(m['id'] as String, mm(m)))
          .toList();
      final endProducts = (endState['products'] as List)
          .map((m) => Product.fromMap(m['id'] as String, mm(m)))
          .toList();
      final transfer = StockTransfer.fromMap(
          mm(endState['transfer'])['id'] as String, mm(endState['transfer']));
      final transit = tr.inTransitByProduct([transfer]);
      for (final p in endProducts) {
        expect(stock.rowsTotal(endLevels, p.id) + (transit[p.id] ?? 0),
            closeTo(p.stockQty, 0.001), reason: 'quantity identity ${p.id}');
      }
      final blendUnit = (expect_['blendUnitCost'] as num).toDouble();
      double unitValue(Product p) => p.id == 'p-blend' ? blendUnit : p.costPrice;
      final openingLevels = (mm(fx['opening'])['levels'] as List)
          .map((m) => StockLevel.fromMap(m['id'] as String, mm(m)))
          .toList();
      double shelf(List<Product> prods, List<StockLevel> lvls) => prods.fold(
          0.0, (a, p) => a + stock.rowsTotal(lvls, p.id) * unitValue(p));
      final delta = shelf(endProducts, endLevels) - shelf(openingProducts, openingLevels);
      expect(delta, closeTo((expect_['inventoryValueDelta'] as num).toDouble(), 0.01));
      final gl = accountNormalBalance(j, 'inventory') + accountNormalBalance(j, 'inventory_raw');
      expect(gl, closeTo((expect_['inventoryGl'] as num).toDouble(), 0.01));
      expect(gl, closeTo(delta, 0.01), reason: 'GL movement == shelf value delta');
      expect(accountNormalBalance(j, 'wip'), 0, reason: 'WIP pool fully absorbed');
    });

    test('P&L ≡ sales report — before and after the FY close', () {
      final j = weekJournal;
      final range = resolveReportRange('custom',
          custom: (from: '2026-09-07', to: '2026-09-13'),
          now: DateTime.parse('2026-09-13T12:00:00.000Z'));
      final sales = (endState['sales'] as List)
          .map((m) => Sale.fromMap(m['id'] as String, mm(m)))
          .toList();
      final bills = (endState['bills'] as List)
          .map((m) => Bill.fromMap(m['id'] as String, mm(m)))
          .toList();
      final returns = (endState['returns'] as List)
          .map((m) => SaleReturn.fromMap(m['id'] as String, mm(m)))
          .toList();
      final rep = salesReport(sales, openingProducts, bills, range,
          returns: returns, journal: j, taxSlabs: slabs,
          settings: const ShopSettingsView());
      final pnl = mm(expect_['pnl']);
      // The close (event 16) must not move the P&L — §4.6.
      for (final jj in [j.sublist(0, 15), j]) {
        final pl = profitAndLossInRange(jj, range.fromTs, range.toTs);
        expect(pl.revenue, closeTo((pnl['revenue'] as num).toDouble(), 0.01));
        expect(pl.netRevenue, closeTo((pnl['revenue'] as num).toDouble(), 0.01));
        expect(pl.net, closeTo((pnl['net'] as num).toDouble(), 0.01));
      }
      expect(rep.plNetRevenue, closeTo((pnl['revenue'] as num).toDouble(), 0.01),
          reason: 'sales report net revenue == P&L net revenue');
      expect(rep.otherRevenue, closeTo(0, 0.01),
          reason: 'no journal-only revenue this week');
    });

    test('FY close: retained earnings == the week\'s net; summary reconciles', () {
      final j = weekJournal;
      expect(accountNormalBalance(j, 'retained_earnings'),
          closeTo((expect_['retainedEarnings'] as num).toDouble(), 0.01));
      expect(accountNormalBalance(j, 'retained_earnings'),
          closeTo((mm(expect_['pnl'])['net'] as num).toDouble(), 0.01));
      final summary = closingEntrySummary(j[15]);
      expect(summary.net,
          closeTo((mm(expect_['fyClose'])['summaryNet'] as num).toDouble(), 0.01));
      expect(accountNormalBalance(j, 'tax_payable'), 0,
          reason: 'the week\'s output tax was fully reversed by the return');
    });
  });
}

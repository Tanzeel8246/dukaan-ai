/// Phase H · H2 — the Dart loyalty port proven against the REAL
/// web functions: harness/fixtures/h2-core.json is exported from
/// the compiled TypeScript (fixtures-export-h2.js) over the H1
/// suite's lifecycle walk. The walk is replayed entry by entry:
/// after every step the Dart fold's position, the GL identity,
/// the Σ-customers identity and the trial balance are compared
/// against the web-computed values; every earn / clawback /
/// expiry / FY-close entry is RE-COMPOSED in Dart at the moment
/// the web composed it and compared line-for-line (the cross-
/// client leg: web-composed entries read and extended by Dart).
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:dukaan_ai/core/coa.dart';
import 'package:dukaan_ai/core/fiscal.dart';
import 'package:dukaan_ai/core/ledger.dart';
import 'package:dukaan_ai/core/loyalty.dart';
import 'package:dukaan_ai/core/periods.dart';
import 'package:dukaan_ai/core/reports.dart';
import 'package:dukaan_ai/core/tally.dart';
import 'package:dukaan_ai/core/types.dart';

Map<String, dynamic> mm(dynamic v) => (v as Map).cast<String, dynamic>();
List<dynamic> ll(dynamic v) => v as List<dynamic>;
JournalEntry entryOf(dynamic v) =>
    JournalEntry.fromMap((v as Map)['id'] as String, mm(v));

void expectNum(num actual, dynamic expected, String what) {
  expect(actual.toDouble(), closeTo((expected as num).toDouble(), 1e-9),
      reason: what);
}

/// Compare a Dart-composed entry against a web-composed fixture
/// entry on everything except the id (both clients mint their
/// own; the fold never reads one except expiry targeting, which
/// resolves through the journal itself).
void expectEntryEq(JournalEntry dart, Map<String, dynamic> web, String what) {
  expect(dart.memo, web['memo'], reason: '$what memo');
  expect(dart.refType, web['refType'], reason: '$what refType');
  expect(dart.refId, web['refId'], reason: '$what refId');
  expect(dart.reversesId, web['reversesId'], reason: '$what reversesId');
  final wl = ll(web['lines']);
  expect(dart.lines.length, wl.length, reason: '$what line count');
  for (var i = 0; i < wl.length; i++) {
    final w = mm(wl[i]);
    final d = dart.lines[i];
    expect(d.account, w['account'], reason: '$what line $i account');
    expectNum(d.debit, w['debit'], '$what line $i debit');
    expectNum(d.credit, w['credit'], '$what line $i credit');
    expect(d.ref, w['ref'], reason: '$what line $i ref');
  }
  expect(dart.points, web['points'], reason: '$what points');
  if (web['rsPerPoint'] == null) {
    expect(dart.rsPerPoint, isNull, reason: '$what rsPerPoint');
  } else {
    expectNum(dart.rsPerPoint!, web['rsPerPoint'], '$what rsPerPoint');
  }
  expect(dart.loyaltyExpiryMonths, web['loyaltyExpiryMonths'],
      reason: '$what loyaltyExpiryMonths');
  if (web['loyaltyTierMult'] == null) {
    expect(dart.loyaltyTierMult, isNull, reason: '$what loyaltyTierMult');
  } else {
    expectNum(dart.loyaltyTierMult!, web['loyaltyTierMult'], '$what tierMult');
  }
  expect(dart.loyaltyPointsUsed, web['loyaltyPointsUsed'],
      reason: '$what loyaltyPointsUsed');
  expect(dart.loyaltyPointsReturned, web['loyaltyPointsReturned'],
      reason: '$what loyaltyPointsReturned');
}

void expectVintageEq(LoyaltyVintage dart, Map<String, dynamic> web, String what) {
  expect(dart.earnEntryId, web['earnEntryId'], reason: '$what earnEntryId');
  expect(dart.billId, web['billId'], reason: '$what billId');
  expect(dart.earnedOnISO, web['earnedOnISO'], reason: '$what earnedOnISO');
  expect(dart.expiresOnISO, web['expiresOnISO'], reason: '$what expiresOnISO');
  expectNum(dart.rsPerPoint, web['rsPerPoint'], '$what rsPerPoint');
  expect(dart.pointsGranted, web['pointsGranted'], reason: '$what granted');
  expect(dart.pointsRedeemed, web['pointsRedeemed'], reason: '$what redeemed');
  expect(dart.pointsClawed, web['pointsClawed'], reason: '$what clawed');
  expect(dart.pointsExpired, web['pointsExpired'], reason: '$what expired');
  expect(dart.pointsUnspent, web['pointsUnspent'], reason: '$what unspent');
  expectNum(dart.rsUnspent, web['rsUnspent'], '$what rsUnspent');
}

void expectPositionEq(
    CustomerLoyalty dart, Map<String, dynamic> web, String what) {
  expect(dart.customerId, web['customerId'], reason: '$what customerId');
  expect(dart.points, web['points'], reason: '$what points');
  expectNum(dart.rupees, web['rupees'], '$what rupees');
  expect(dart.redeemablePoints, web['redeemablePoints'],
      reason: '$what redeemablePoints');
  expect(dart.tier, web['tier'], reason: '$what tier');
  expectNum(dart.tierMult, web['tierMult'], '$what tierMult');
  expect(dart.earned12m, web['earned12m'], reason: '$what earned12m');
  final wv = ll(web['vintages']);
  expect(dart.vintages.length, wv.length, reason: '$what vintage count');
  for (var i = 0; i < wv.length; i++) {
    expectVintageEq(dart.vintages[i], mm(wv[i]), '$what vintage $i');
  }
  // Identity 2 inside the position itself: Rs ≡ Σ vintage rsUnspent.
  var rsSum = 0.0;
  for (final v in dart.vintages) {
    rsSum += v.rsUnspent;
  }
  expectNum(dart.rupees, rsSum, '$what Rs ≡ Σ vintage rsUnspent');
}

LoyaltyVintage vintageOf(Map<String, dynamic> m) => LoyaltyVintage(
      earnEntryId: m['earnEntryId'] as String,
      billId: m['billId'] as String,
      earnedOnISO: m['earnedOnISO'] as String,
      expiresOnISO: m['expiresOnISO'] as String,
      rsPerPoint: (m['rsPerPoint'] as num).toDouble(),
      pointsGranted: (m['pointsGranted'] as num).toInt(),
      pointsRedeemed: (m['pointsRedeemed'] as num).toInt(),
      pointsClawed: (m['pointsClawed'] as num).toInt(),
      pointsExpired: (m['pointsExpired'] as num).toInt(),
      pointsUnspent: (m['pointsUnspent'] as num).toInt(),
      rsUnspent: (m['rsUnspent'] as num).toDouble(),
    );

void main() {
  final fx = mm(jsonDecode(
      File('../harness/fixtures/h2-core.json').readAsStringSync()));
  final cust = fx['customerId'] as String;
  final settings =
      resolveLoyaltySettings(mm(fx['settings']));
  final off = resolveLoyaltySettings(const {});

  group('resolver truth table (web × Dart)', () {
    for (final c in ll(fx['resolverCases'])) {
      final cm = mm(c);
      test(cm['name'] as String, () {
        final raw = cm['settings'];
        final r = resolveLoyaltySettings(raw == null ? null : mm(raw));
        final w = mm(cm['resolved']);
        expect(r.enabled, w['enabled']);
        expectNum(r.earnRsPerPointBase, w['earnRsPerPointBase'], 'earn base');
        expectNum(r.pointValueRs, w['pointValueRs'], 'point value');
        expectNum(r.redeemCapPct, w['redeemCapPct'], 'redeem cap');
        expectNum(r.expiryMonths, w['expiryMonths'], 'expiry months');
        expectNum(r.silverAt, w['silverAt'], 'silverAt');
        expectNum(r.goldAt, w['goldAt'], 'goldAt');
        expectNum(r.silverMult, w['silverMult'], 'silverMult');
        expectNum(r.goldMult, w['goldMult'], 'goldMult');
      });
    }
  });

  group('COA / registry facts', () {
    final c = mm(fx['coaCase']);
    test('31 codes in web order; customer_advances last (owner decision 2026-10-27: web convention)', () {
      expect(accountCodes, ll(c['codes']).map((e) => e as String).toList());
      final lp = mm(c['loyalty_payable']);
      expect(accountMeta('loyalty_payable').type.name, lp['type']);
      expect(accountMeta('loyalty_payable').normalBalance?.name, lp['normalBalance']);
      expect(accountMeta('loyalty_payable').since, lp['since']);
      final el = mm(c['expense_loyalty']);
      expect(accountMeta('expense_loyalty').type.name, el['type']);
      expect(accountMeta('expense_loyalty').normalBalance?.name, el['normalBalance']);
      expect(accountMeta('expense_loyalty').since, el['since']);
    });
    test('tally rows, voucher types, FY-close classification', () {
      final tm = mm(c['tallyMap']);
      expect(tallyLedgerMap['loyalty_payable']!.name,
          mm(tm['loyalty_payable'])['name']);
      expect(tallyLedgerMap['loyalty_payable']!.group,
          mm(tm['loyalty_payable'])['group']);
      expect(tallyLedgerMap['expense_loyalty']!.name,
          mm(tm['expense_loyalty'])['name']);
      expect(tallyLedgerMap['expense_loyalty']!.group,
          mm(tm['expense_loyalty'])['group']);
      final vt = mm(c['voucherTypes']);
      expect(tallyVoucherTypeByRefType['loyalty_earn'], vt['loyalty_earn']);
      expect(tallyVoucherTypeByRefType['loyalty_expire'], vt['loyalty_expire']);
      expect(plAccountCodes().contains('expense_loyalty'),
          c['plIncludesExpenseLoyalty']);
      expect(plAccountCodes().contains('loyalty_payable'),
          c['plIncludesLoyaltyPayable']);
      expect(balanceSheetAccountCodes().contains('loyalty_payable'),
          c['bsIncludesLoyaltyPayable']);
    });
  });

  group('the frozen seed reads zero loyalty', () {
    final sc = mm(fx['seedCase']);
    final journal = ll(sc['journal']).map(entryOf).toList();
    test('21 entries; both loyalty codes zero; no loyalty customers', () {
      expect(journal.length, 21);
      expectNum(accountNormalBalance(journal, 'loyalty_payable'),
          sc['loyaltyPayableNormal'], 'seed loyalty GL');
      expectNum(accountBalance(journal, 'expense_loyalty'),
          sc['expenseLoyaltyBalance'], 'seed expense_loyalty');
      expect(loyaltyCustomerIds(journal), ll(sc['customerIds']));
      expect(loyaltyProgrammeTotals(journal, '2026-10-23T00:00:00.000Z')
          .pointsOutstanding, 0);
    });
  });

  group('the H1 lifecycle walk, replayed in Dart', () {
    final journal = <JournalEntry>[];
    final steps = ll(fx['steps']).map(mm).toList();

    int billNoOf(String billId) {
      final e = journal.firstWhere(
          (x) => x.refType == 'bill' && x.refId == billId);
      return int.parse(e.memo.replaceAll(RegExp(r'[^0-9]'), ''));
    }

    double billTotalOf(String billId) {
      final e = journal.firstWhere(
          (x) => x.refType == 'bill' && x.refId == billId);
      return e.lines
          .where((l) => l.account == 'sales_revenue')
          .fold(0.0, (a, l) => a + l.credit);
    }

    for (final step in steps) {
      test(step['name'] as String, () {
        // Pre-append quotes the web evaluated at this point.
        if (step['quoteBefore'] != null) {
          final q = mm(step['quoteBefore']);
          final got = loyaltyRedemptionQuote(
              journal, cust, (q['pointsWanted'] as num).toInt(),
              (q['capRs'] as num).toDouble());
          final w = mm(q['quote']);
          expect(got.points, w['points'], reason: 'quote points');
          expectNum(got.rs, w['rs'], 'quote rs');
        }
        if (step['recreditBefore'] != null) {
          final r = mm(step['recreditBefore']);
          final got = loyaltyRecreditForReturn(
            journal,
            Bill(
                id: r['billId'] as String,
                total: (r['billTotal'] as num).toDouble()),
            (r['refundTotalRs'] as num).toDouble(),
            r['completesBill'] as bool,
          );
          final w = mm(r['quote']);
          expect(got.points, w['points'], reason: 'recredit points');
          expectNum(got.rs, w['rs'], 'recredit rs');
        }

        // priorRefundedRs is Σ PRIOR returns' give-backs — read
        // off the journal BEFORE this step's own return lands.
        var prePriorRefundedRs = 0.0;
        if (step['recreditBefore'] != null) {
          final billId =
              (mm(step['recreditBefore']))['billId'] as String;
          for (final e in journal) {
            if (e.refType == 'return' && e.refId == billId) {
              prePriorRefundedRs += e.lines
                  .where((l) => l.account == 'sales_revenue')
                  .fold(0.0, (a, l) => a + l.debit);
            }
          }
        }

        // Append the step's entries one at a time; at every
        // loyalty composition point, re-compose in Dart against
        // the journal as it then stands and compare.
        for (final raw in ll(step['appended'])) {
          final web = mm(raw);
          final entry = entryOf(web);
          // Read parity: the parsed Dart entry carries the web
          // entry's lines and payloads exactly.
          expectEntryEq(entry, web, 'read ${web['id']}');
          final entryPoints = (web['points'] as num?)?.toInt() ?? 0;
          if (web['refType'] == 'loyalty_earn' && entryPoints < 0) {
            // A clawback — handled by the two branches below via
            // the marker this block sets.
            if (web['reversesId'] == null) {
              final billId = (mm(step['recreditBefore']))['billId'] as String;
              final pts = loyaltyClawbackPoints(
                journal: journal,
                bill: Bill(id: billId, total: billTotalOf(billId)),
                refundTotalRs:
                    (mm(step['recreditBefore'])['refundTotalRs'] as num)
                        .toDouble(),
                priorRefundedRs: prePriorRefundedRs,
                completesBill:
                    mm(step['recreditBefore'])['completesBill'] as bool,
              );
              expect(pts, step['clawPoints'], reason: 'claw points');
              final recomposed = buildLoyaltyClawbackEntry(
                journal: journal,
                bill: Bill(
                    id: billId, billNo: billNoOf(billId), customerId: cust),
                clawPoints: pts,
                refId: web['refId'] as String,
                memo: web['memo'] as String,
                ts: web['ts'] as String,
              );
              expect(recomposed, isNotNull, reason: 'clawback recomposes');
              expectEntryEq(recomposed!, web, 'clawback ${web['id']}');
            } else {
              final billId = web['refId'] as String;
              final earn = billLoyaltyEarnEntry(journal, billId);
              expect(earn, isNotNull, reason: 'void: earn found');
              final pts = (earn!.points ?? 0) -
                  billLoyaltyClawedPoints(journal, billId);
              final recomposed = buildLoyaltyClawbackEntry(
                journal: journal,
                bill: Bill(
                    id: billId, billNo: billNoOf(billId), customerId: cust),
                clawPoints: pts,
                refId: web['refId'] as String,
                memo: web['memo'] as String,
                ts: web['ts'] as String,
                reversesId: web['reversesId'] as String,
              );
              expect(recomposed, isNotNull,
                  reason: 'void clawback recomposes');
              expectEntryEq(recomposed!, web, 'void clawback ${web['id']}');
            }
          } else if (web['refType'] == 'loyalty_earn') {
            final billId = web['refId'] as String;
            final recomposed = buildLoyaltyEarnEntry(
              journal: journal,
              bill: Bill(
                id: billId,
                billNo: billNoOf(billId),
                customerId: cust,
                total: billTotalOf(billId),
              ),
              settings: settings,
              ts: web['ts'] as String,
            );
            expect(recomposed, isNotNull, reason: 'earn recomposes');
            expectEntryEq(recomposed!, web, 'earn ${web['id']}');
          } else if (web['refType'] == 'fy_close') {
            final range =
                fiscalYearRange(null, '2026-02-10T00:00:00.000Z');
            final recomposed =
                buildFiscalClosingEntry(journal, range, 'per-h1-1');
            expect(recomposed, isNotNull, reason: 'FY close recomposes');
            expectEntryEq(recomposed!, web, 'fy close');
            // The loyalty-specific assertions: the cost is swept,
            // the liability is NOT a closing line.
            expect(
                recomposed.lines.any((l) =>
                    l.account == 'expense_loyalty' && l.credit == 2375),
                isTrue,
                reason: 'expense_loyalty swept at Rs 2,375');
            expect(
                recomposed.lines
                    .any((l) => l.account == 'loyalty_payable'),
                isFalse,
                reason: 'liability never closed');
          } else if (web['refType'] == 'loyalty_expire') {
            final due0 = mm(ll(mm(fx['expiryCase'])['due']).first);
            final recomposed = buildLoyaltyExpiryEntry(
              customerId: cust,
              customerName: 'H1 Customer',
              vintage: vintageOf(mm(due0['vintage'])),
              ts: mm(fx['expiryCase'])['at'] as String,
            );
            expect(recomposed, isNotNull, reason: 'expiry recomposes');
            expectEntryEq(recomposed!, web, 'expiry entry');
          }
          journal.add(entry);
        }

        // Post-step derived state == the web's, with both audit
        // identities and TB == 0 at every step.
        final pos = customerLoyalty(
            journal, cust, settings, step['nowISO'] as String);
        expectPositionEq(pos, mm(step['position']), 'step position');
        final gl = accountNormalBalance(journal, 'loyalty_payable');
        expectNum(gl, step['glLoyaltyPayable'], 'GL(loyalty_payable)');
        var sumByCust = 0.0;
        loyaltyRupeesByCustomer(journal).forEach((_, v) => sumByCust += v);
        expectNum(sumByCust, step['sumByCustomer'], 'Σ customers');
        expectNum(gl, sumByCust, 'identity 1: GL ≡ Σ customers');
        var tb = 0.0;
        for (final c in accountCodes) {
          tb += accountBalance(journal, c);
        }
        expectNum(tb, step['tbTotal'], 'trial balance');
        expect(tb.abs(), lessThan(0.005), reason: 'TB == 0');

        if (step['earnEntryAfterVoid'] != null ||
            step.containsKey('earnEntryAfterVoid')) {
          expect(billLoyaltyEarnEntry(journal, 'h1-b7'), isNull,
              reason: 'voided bill earn excluded');
        }
        if (step['expenseLoyaltyBalance'] != null) {
          expectNum(accountBalance(journal, 'expense_loyalty'),
              step['expenseLoyaltyBalance'], 'expense_loyalty balance');
        }
      });
    }

    test('guardrail quotes over the final journal', () {
      final g = mm(fx['guardrails']);
      final ob = mm(g['overBalance']);
      final q1 = loyaltyRedemptionQuote(journal, cust, 999999, 100000000);
      expect(q1.points, ob['points']);
      expectNum(q1.rs, ob['rs'], 'over-balance rs');
      final oc = mm(g['overCap']);
      final q2 = loyaltyRedemptionQuote(
          journal, cust, 2275, loyaltyRedeemCapRs(100, settings));
      expect(q2.points, oc['points']);
      expectNum(q2.rs, oc['rs'], 'over-cap rs');
      expect(
          buildLoyaltyEarnEntry(
            journal: journal,
            bill: const Bill(id: 'h1-walk', billNo: 99, total: 5000),
            settings: settings,
            ts: '2026-02-10T05:00:00.000Z',
          ),
          isNull,
          reason: 'walk-in earns nothing');
      expect(
          loyaltyEarnQuote(journal, cust, 50, settings, '2026-02-10T05:00:00.000Z'),
          isNull,
          reason: 'sub-base earns nothing');
      expect(
          loyaltyEarnQuote(journal, cust, 10000, off, '2026-02-10T05:00:00.000Z'),
          isNull,
          reason: 'disabled programme earns nothing');
      expect(
          buildLoyaltyEarnEntry(
            journal: journal,
            bill: Bill(
                id: 'h1-off', billNo: 98, customerId: cust, total: 10000),
            settings: off,
            ts: '2026-02-10T05:00:00.000Z',
          ),
          isNull,
          reason: 'disabled programme composes no earn');
      final dr = mm(g['disabledRedeemQuote']);
      final q3 = loyaltyRedemptionQuote(journal, cust, 100, 100000);
      expect(q3.points, dr['points']);
      expectNum(q3.rs, dr['rs'], 'redemption survives disable');
      expectPositionEq(customerLoyalty(journal, cust, settings,
          '2027-01-06T00:00:00.000Z'), mm(g['positionNow']), 'final position');
    });

    test('expiry case: due list, totals, spent vintage composes null', () {
      final ec = mm(fx['expiryCase']);
      final due = loyaltyExpiryDue(
          // The due list is evaluated on the PRE-expiry journal;
          // rebuild it by dropping the expiry entries.
          journal
              .where((e) => e.refType != 'loyalty_expire')
              .toList(),
          ec['at'] as String,
          cust);
      final wd = ll(ec['due']);
      expect(due.length, wd.length);
      for (var i = 0; i < wd.length; i++) {
        expect(due[i].customerId, mm(wd[i])['customerId']);
        expectVintageEq(due[i].vintage, mm(mm(wd[i])['vintage']),
            'due vintage $i');
      }
      final tb2 = mm(ec['totalsBefore']);
      final totals = loyaltyProgrammeTotals(
          journal.where((e) => e.refType != 'loyalty_expire').toList(),
          ec['at'] as String);
      expectNum(totals.liabilityRs, tb2['liabilityRs'], 'totals liability');
      expect(totals.pointsOutstanding, tb2['pointsOutstanding']);
      expect(totals.customersWithBalance, tb2['customersWithBalance']);
      expect(totals.expiringSoonPoints, tb2['expiringSoonPoints']);
      expectNum(totals.expiringSoonRs, tb2['expiringSoonRs'], 'soon rs');
      expect(totals.expiredUnpostedPoints, tb2['expiredUnpostedPoints']);
      expectNum(totals.expiredUnpostedRs, tb2['expiredUnpostedRs'], 'expired rs');
      expect(totals.expiredUnposted.length, 1);
      expectVintageEq(totals.expiredUnposted.first,
          mm(ll(tb2['expiredUnposted']).first), 'expired vintage');
      // The fully-spent bill #6 vintage never composes an expiry.
      final spent = vintageOf(mm(ec['spentVintage']));
      expect(
          buildLoyaltyExpiryEntry(
            customerId: cust,
            customerName: 'H1 Customer',
            vintage: spent,
            ts: '2027-01-06T00:00:00.000Z',
          ),
          isNull,
          reason: 'spent vintage composes null');
      expect(ec['spentVintageComposesNull'], isTrue);
      // Post-expiry, bill #6's vintage carries a null expiry date
      // in both folds (nothing left to expire).
      final pos = customerLoyalty(
          journal, cust, settings, '2027-01-06T00:00:00.000Z');
      final b6 = pos.vintages.firstWhere((v) => v.billId == 'h1-b6');
      expect(b6.expiresOnISO, spent.expiresOnISO);
    });

    test('the loyalty report over Jan–Feb', () {
      final rc = mm(fx['reportCase']);
      final range = mm(rc['range']);
      final rep = loyaltyReport(journal,
          fromTs: range['fromTs'] as String, toTs: range['toTs'] as String);
      final w = mm(rc['report']);
      expect(rep.earnedPoints, w['earnedPoints']);
      expectNum(rep.earnedRs, w['earnedRs'], 'earned rs');
      expect(rep.redeemedPoints, w['redeemedPoints']);
      expectNum(rep.redeemedRs, w['redeemedRs'], 'redeemed rs');
      expect(rep.recreditedPoints, w['recreditedPoints']);
      expectNum(rep.recreditedRs, w['recreditedRs'], 'recredited rs');
      expect(rep.clawedPoints, w['clawedPoints']);
      expectNum(rep.clawedRs, w['clawedRs'], 'clawed rs');
      expect(rep.expiredPoints, w['expiredPoints']);
      expectNum(rep.expiredRs, w['expiredRs'], 'expired rs');
      expectNum(rep.liabilityRs, w['liabilityRs'], 'report liability rs');
      expect(rep.liabilityPoints, w['liabilityPoints']);
      final wr = ll(w['rows']);
      expect(rep.rows.length, wr.length);
      for (var i = 0; i < wr.length; i++) {
        final r = rep.rows[i];
        final x = mm(wr[i]);
        expect(r.customerId, x['customerId']);
        expect(r.earnedPoints, x['earnedPoints']);
        expect(r.redeemedPoints, x['redeemedPoints']);
        expect(r.recreditedPoints, x['recreditedPoints']);
        expect(r.clawedPoints, x['clawedPoints']);
        expect(r.expiredPoints, x['expiredPoints']);
        expect(r.points, x['points']);
        expectNum(r.rupees, x['rupees'], 'row rupees');
      }
    });

    test('Tally masters over the walk journal', () {
      final tc = mm(fx['tallyCase']);
      final range = ReportRange(
        fromDate: '2026-01-01',
        toDate: '2026-12-31',
        fromTs: mm(tc['range'])['fromTs'] as String,
        toTs: mm(tc['range'])['toTs'] as String,
      );
      final parties = TallyParties(
        customers: [Customer(id: cust, name: 'H1 Customer')],
        suppliers: const [],
        employees: const [],
        accounts: const [],
        docNumbers: const {},
      );
      final model = buildTallyExport(
          journal, parties, ShopSettingsView.fromMap(const {'shopName': 'Madina General Store'}), range);
      final got = model.masters
          .map((m) => {'name': m.name, 'group': m.group, 'isParty': m.isParty})
          .toList();
      final want = ll(tc['masters'])
          .map((m) => {
                'name': mm(m)['name'],
                'group': mm(m)['group'],
                'isParty': mm(m)['isParty'],
              })
          .toList();
      expect(got, want);
      final party = model.masters.firstWhere((m) => m.name == 'H1 Customer');
      expect(party.group, 'Current Liabilities');
      expect(party.isParty, isTrue);
    });
  });

  group('snapshot rates: a point is worth what its earn said', () {
    final sc = mm(fx['snapshotCase']);
    final s2 = resolveLoyaltySettings(mm(sc['settings']));
    final journal = ll(sc['journal']).map(entryOf).toList();
    test('Rs 2/pt points redeem at Rs 2', () {
      final q = loyaltyRedemptionQuote(journal, cust, 100, 100000);
      final w = mm(sc['quote']);
      expect(q.points, w['points']);
      expectNum(q.rs, w['rs'], 'snapshot quote rs');
      expect(q.rs, 200);
      expectPositionEq(customerLoyalty(journal, cust, s2, '2026-03-01T05:00:00.000Z'),
          mm(sc['position']), 'snapshot position');
    });
  });

  group('clawback flooring: thirds of a 3-point earn', () {
    final cf = mm(fx['clawbackFloorCase']);
    final journal = ll(cf['journal']).map(entryOf).toList();
    test('web sequence [1,1,1]; Dart fold ends at exactly zero', () {
      expect(ll(cf['clawSeq']), [1, 1, 1]);
      expect(billLoyaltyClawedPoints(journal, 'h1y-b1'), 3);
      final pos = customerLoyalty(
          journal, cust, settings, '2026-03-03T05:00:00.000Z');
      expect(pos.points, cf['finalPoints']);
      expect(pos.points, 0);
    });
  });
}

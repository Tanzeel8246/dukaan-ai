/// Golden-fixture parity for ERP Phase G · G5 (design §5/§8-G5):
/// the Dart ports of the SaaS layer (tenancy / plans / renewal)
/// must agree with the web libs semantics-for-semantics over the
/// shared truth tables exported by harness/fixtures-export-g5.js
/// from the REAL web functions — resolver truth table, claim and
/// backfill write plans, plan-state boundary table, counter
/// arithmetic, quote table, submission write plans, lifecycle
/// banners, and the cross-client leg (one staffer, two businesses,
/// web-composed journals the Dart composers must reproduce to the
/// rupee while each business's counters and plan state derive
/// independently).
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:dukaan_ai/core/composers.dart';
import 'package:dukaan_ai/core/ledger.dart';
import 'package:dukaan_ai/core/plans.dart';
import 'package:dukaan_ai/core/renewal.dart';
import 'package:dukaan_ai/core/tenancy.dart';
import 'package:dukaan_ai/core/types.dart';

/// Structural equality with numeric tolerance (JSON ints vs Dart
/// doubles); map key ORDER is not significant, key SETS are.
void expectDeep(Object? actual, Object? expected, [String path = r'$']) {
  if (expected is Map) {
    if (actual is! Map) fail('$path: expected a map, got $actual');
    final ak = actual.keys.map((k) => '$k').toSet();
    final ek = expected.keys.map((k) => '$k').toSet();
    if (ak.length != ek.length || !ak.containsAll(ek)) {
      fail('$path: key sets differ — actual $ak vs expected $ek');
    }
    for (final k in expected.keys) {
      expectDeep(actual[k] ?? actual['$k'], expected[k], '$path.$k');
    }
    return;
  }
  if (expected is List) {
    if (actual is! List) fail('$path: expected a list, got $actual');
    if (actual.length != expected.length) {
      fail('$path: length ${actual.length} != ${expected.length}');
    }
    for (var i = 0; i < expected.length; i++) {
      expectDeep(actual[i], expected[i], '$path[$i]');
    }
    return;
  }
  if (expected is num && actual is num) {
    if ((actual - expected).abs() > 0.006) {
      fail('$path: $actual != $expected');
    }
    return;
  }
  if (actual != expected) fail('$path: $actual != $expected');
}

Map<String, dynamic> m(Object? v) => Map<String, dynamic>.from(v as Map);
BusinessRegistryDoc? regOf(Object? v) =>
    v == null ? null : BusinessRegistryDoc.fromMap(m(v));
BusinessCountersDoc ctrOf(Object? v) => BusinessCountersDoc.fromMap(m(v));
MembershipDoc? memOf(Object? v) => v == null ? null : MembershipDoc.fromMap(m(v));

String canon(JournalEntry e) {
  final lines = e.lines
      .map((l) => '${l.account}:${l.debit.toStringAsFixed(2)}:${l.credit.toStringAsFixed(2)}:${l.ref}')
      .join(',');
  return '${e.memo}|${e.refType}|${e.refId}|$lines';
}

String canonExpected(Map<String, dynamic> e) {
  final lines = (e['lines'] as List)
      .map((l) => '${l['account']}:${(l['debit'] as num).toStringAsFixed(2)}:${(l['credit'] as num).toStringAsFixed(2)}:${l['ref']}')
      .join(',');
  return '${e['memo']}|${e['refType']}|${e['refId']}|$lines';
}

void main() {
  final fx = jsonDecode(
    File('../harness/fixtures/g5-core.json').readAsStringSync(),
  ) as Map<String, dynamic>;
  final now = '2026-10-23T10:00:00.000Z';

  group('resolver truth table (tenancy §1.3)', () {
    for (final c in (fx['resolver'] as List).cast<Map<String, dynamic>>()) {
      test(c['id'] as String, () {
        final input = m(c['input']);
        final si = input['staffIndex'];
        final got = resolveAccess(
          callerUid: input['callerUid'] as String,
          callerEmail: input['callerEmail'] as String,
          businessId: input['businessId'] as String,
          staffEmails: (input['staffEmails'] as List).cast<String>(),
          membership: input['membership'] == null ? null : m(input['membership']),
          staffIndex: si == null ? null : m(si),
        );
        expectDeep(
          {'access': got.access, 'role': got.role, 'via': got.via},
          c['expected'],
        );
      });
    }
  });

  group('invite claim + legacy backfill write plans (§1.3/§1.4)', () {
    for (final c in (fx['claims'] as List).cast<Map<String, dynamic>>()) {
      test('claim ${c['id']}', () {
        final input = m(c['input']);
        final got = planClaim(
          businessId: input['businessId'] as String,
          callerUid: input['callerUid'] as String,
          callerEmail: input['callerEmail'] as String,
          invite: input['invite'] == null ? null : InviteDoc.fromMap(m(input['invite'])),
          existingMembership: memOf(input['existingMembership']),
          nowISO: input['nowISO'] as String,
        );
        expectDeep(
          got.ok
              ? {'ok': true, 'role': got.role, 'writes': got.writes.map((w) => w.toJson()).toList()}
              : {'ok': false, 'reason': got.reason, 'writes': const []},
          c['expected'],
        );
      });
    }
    for (final c in (fx['backfill'] as List).cast<Map<String, dynamic>>()) {
      test('backfill ${c['id']}', () {
        final input = m(c['input']);
        final si = input['staffIndex'];
        final got = planLegacyBackfill(
          businessId: input['businessId'] as String,
          callerUid: input['callerUid'] as String,
          callerEmail: input['callerEmail'] as String,
          staffIndex: si == null ? null : m(si),
          existingMembership: memOf(input['existingMembership']),
          nowISO: input['nowISO'] as String,
        );
        expectDeep(got.map((w) => w.toJson()).toList(), c['expected']);
      });
    }
  });

  group('membership index: heal / merge / switcher list / status', () {
    for (final c in (fx['index'] as List).cast<Map<String, dynamic>>()) {
      test(c['id'] as String, () {
        switch (c['id']) {
          case 'heal':
            final entries = (c['entries'] as List)
                .map((e) => IndexEntry(businessId: m(e)['businessId'] as String, role: m(e)['role'] as String))
                .toList();
            final liveRaw = m(c['live']);
            final got = healIndex(entries, {
              for (final k in liveRaw.keys) k: memOf(liveRaw[k]),
            });
            expectDeep(
              {
                'kept': got.kept.map((e) => {'businessId': e.businessId, 'role': e.role}).toList(),
                'dropped': got.dropped,
              },
              c['expected'],
            );
          case 'merge':
            final entries = (c['entries'] as List)
                .map((e) => IndexEntry(businessId: m(e)['businessId'] as String, role: m(e)['role'] as String))
                .toList();
            final add = m(c['add']);
            final got = indexWith(entries, IndexEntry(businessId: add['businessId'] as String, role: add['role'] as String));
            expectDeep(
              got.map((e) => {'businessId': e.businessId, 'role': e.role}).toList(),
              c['expected'],
            );
          case 'switcher-list':
          case 'switcher-no-own':
            final ownRaw = c['own'];
            final got = buildSwitcherList(
              own: ownRaw == null
                  ? null
                  : (businessId: m(ownRaw)['businessId'] as String, name: m(ownRaw)['name'] as String),
              entries: (c['entries'] as List)
                  .map((e) => IndexEntry(businessId: m(e)['businessId'] as String, role: m(e)['role'] as String))
                  .toList(),
              names: m(c['names']).map((k, v) => MapEntry(k, v as String)),
            );
            expectDeep(
              got
                  .map((s) => {'businessId': s.businessId, 'name': s.name, 'role': s.role, 'own': s.own})
                  .toList(),
              c['expected'],
            );
          case 'member-status':
            final memberships = (c['memberships'] as List).map((e) => MembershipDoc.fromMap(m(e))).toList();
            final invites = (c['invites'] as List).map((e) => InviteDoc.fromMap(m(e))).toList();
            for (final row in (c['cases'] as List).cast<Map<String, dynamic>>()) {
              expect(
                membershipStatusFor(row['email'] as String, memberships, invites),
                row['expected'],
                reason: row['email'] as String,
              );
            }
          default:
            fail('unknown index case ${c['id']}');
        }
      });
    }
  });

  group('snapshots + PKT month keys (§3.2/§4.2)', () {
    for (final c in (fx['snapshots'] as List).cast<Map<String, dynamic>>()) {
      test(c['id'] as String, () {
        final PlanSnapshot got = switch (c['id']) {
          'trial-snapshot' => trialPlanSnapshot(now),
          'founding-snapshot' => foundingPlanSnapshot(now),
          'snapshot-basic' => snapshotFor('basic', now, periodTo: '2026-11-23T10:00:00.000Z', periodToSet: true, assignedBy: 'admin'),
          'snapshot-standard' => snapshotFor('standard', now, periodTo: '2026-11-23T10:00:00.000Z', periodToSet: true, assignedBy: 'admin'),
          'snapshot-enterprise-default' => snapshotFor('enterprise', now, assignedBy: 'admin'),
          'snapshot-enterprise-pinned' => snapshotFor('enterprise', now, assignedBy: 'admin', usersLimit: 25, usersLimitSet: true, invoiceLimitSet: true),
          'snapshot-trial' => snapshotFor('trial', now, assignedBy: 'signup'),
          _ => fail('unknown snapshot case ${c['id']}'),
        };
        expectDeep(got.toMap(), c['expected']);
      });
    }
    for (final k in (fx['monthKeys'] as List).cast<Map<String, dynamic>>()) {
      test('pktMonthKey ${k['iso']}', () {
        expect(pktMonthKey(k['iso'] as String), k['expected']);
      });
    }
  });

  group('plan-state boundary table + gates (§3.6)', () {
    for (final c in (fx['planState'] as List).cast<Map<String, dynamic>>()) {
      test(c['id'] as String, () {
        final reg = regOf(c['registry']);
        final at = c['now'] as String;
        final state = derivePlanState(reg, at);
        expectDeep(
          {'state': state, 'allowsPosting': stateAllowsPosting(state), 'rulesPostable': rulesPlanPostable(reg, at)},
          c['expected'],
        );
      });
    }
    for (final c in (fx['gates'] as List).cast<Map<String, dynamic>>()) {
      test('gate ${c['id']}', () {
        final got = planGate(
          regOf(c['registry']),
          c['counters'] == null ? null : ctrOf(c['counters']),
          c['now'] as String,
        );
        expectDeep(got.toJson(), c['expected']);
      });
    }
  });

  group('counter arithmetic (§4.2)', () {
    final basicPlan = snapshotFor('basic', '2026-10-01T00:00:00.000Z',
        periodTo: '2026-11-01T00:00:00.000Z', assignedBy: 'admin');
    final trialPlan = PlanSnapshot.fromMap({
      ...trialPlanSnapshot('2026-10-01T00:00:00.000Z').toMap(),
      'trialEndsAt': '2026-10-15T00:00:00.000Z',
    });
    const base = BusinessCountersDoc(invoiceMonth: '2026-10', invoiceCount: 41, memberCount: 2);
    for (final c in (fx['counters'] as List).cast<Map<String, dynamic>>()) {
      test(c['id'] as String, () {
        final BusinessCountersDoc got = switch (c['id']) {
          'next-same-month' => nextInvoiceCounter(base, basicPlan, '2026-10-23T10:00:00.000Z'),
          'next-roll' => nextInvoiceCounter(base, basicPlan, '2026-10-31T19:00:00.000Z'),
          'next-trial-noroll' => nextInvoiceCounter(
              const BusinessCountersDoc(invoiceMonth: '2026-10', invoiceCount: 199, memberCount: 1),
              trialPlan, '2026-11-02T00:00:00.000Z'),
          'member-plus' => nextMemberCounter(base, 1),
          'member-minus' => nextMemberCounter(base, -1),
          'member-floor' => nextMemberCounter(
              const BusinessCountersDoc(invoiceMonth: '2026-10', invoiceCount: 41, memberCount: 0), -1),
          _ => fail('unknown counter case ${c['id']}'),
        };
        expectDeep(got.toMap(), c['expected']);
      });
    }
    for (final t in (fx['transitions'] as List).cast<Map<String, dynamic>>()) {
      test('transition ${t['id']}', () {
        expect(counterTransitionOk(ctrOf(t['before']), ctrOf(t['after']), t['kind'] as String), t['expected']);
      });
    }
    for (final c in (fx['caps'] as List).cast<Map<String, dynamic>>()) {
      test('cap ${c['id']}', () {
        const at499 = BusinessCountersDoc(invoiceMonth: '2026-10', invoiceCount: 499, memberCount: 2);
        const at500 = BusinessCountersDoc(invoiceMonth: '2026-10', invoiceCount: 500, memberCount: 2);
        const at501 = BusinessCountersDoc(invoiceMonth: '2026-10', invoiceCount: 501, memberCount: 2);
        final bool got = switch (c['id']) {
          'event-at-limit' => invoiceEventAllowed(at499, at500, basicPlan),
          'event-over-limit' => invoiceEventAllowed(at500, at501, basicPlan),
          'event-unlimited' => invoiceEventAllowed(base,
              const BusinessCountersDoc(invoiceMonth: '2026-10', invoiceCount: 42, memberCount: 2),
              PlanSnapshot.fromMap({...basicPlan.toMap(), 'invoiceLimit': 0})),
          'event-illegal-transition' => invoiceEventAllowed(base,
              const BusinessCountersDoc(invoiceMonth: '2026-10', invoiceCount: 99, memberCount: 2), basicPlan),
          'member-at-cap' => memberCapOk(base, basicPlan),
          'member-over-cap' => memberCapOk(
              const BusinessCountersDoc(invoiceMonth: '2026-10', invoiceCount: 41, memberCount: 3), basicPlan),
          'member-unlimited' => memberCapOk(
              const BusinessCountersDoc(invoiceMonth: '2026-10', invoiceCount: 41, memberCount: 99),
              PlanSnapshot.fromMap({...basicPlan.toMap(), 'usersLimit': 0})),
          _ => fail('unknown cap case ${c['id']}'),
        };
        expect(got, c['expected'], reason: c['id'] as String);
      });
    }
    for (final a in (fx['actuals'] as List).cast<Map<String, dynamic>>()) {
      test('actual ${a['id']}', () {
        final got = deriveActualCounters(
          (a['bills'] as List).map((b) => (ts: m(b)['ts'] as String, status: m(b)['status'] as String?)).toList(),
          (a['sales'] as List)
              .map((s) => (ts: m(s)['ts'] as String, billId: m(s)['billId'] as String?, kind: m(s)['kind'] as String?))
              .toList(),
          (a['staffEmails'] as List).cast<String>(),
          PlanSnapshot.fromMap(m(a['plan'])),
          a['now'] as String,
        );
        expectDeep({'invoiceCount': got.invoiceCount, 'memberCount': got.memberCount}, a['expected']);
      });
    }
  });

  group('renewal quotes + submissions (§3.5)', () {
    for (final mc in (fx['monthAdds'] as List).cast<Map<String, dynamic>>()) {
      test('addMonths ${mc['iso']} +${mc['months']}', () {
        expect(addMonthsISO(mc['iso'] as String, mc['months'] as int), mc['expected']);
      });
    }
    for (final c in (fx['quotes'] as List).cast<Map<String, dynamic>>()) {
      test('quote ${c['id']}', () {
        final got = renewalQuote(regOf(c['registry']), c['planId'] as String, c['billing'] as String, c['now'] as String);
        expectDeep(
          got.ok ? {'ok': true, 'quote': got.quote!.toJson()} : {'ok': false, 'reason': got.reason},
          c['expected'],
        );
      });
    }
    for (final c in (fx['submissions'] as List).cast<Map<String, dynamic>>()) {
      test('submit ${c['id']}', () {
        final input = m(c['input']);
        final got = planRenewalSubmission(
          registry: regOf(input['registry']),
          businessId: input['businessId'] as String,
          planId: input['planId'] as String,
          billing: input['billing'] as String,
          method: input['method'] as String,
          reference: input['reference'] as String,
          ownerNote: input['ownerNote'] as String?,
          actor: input['actor'] as String,
          now: input['now'] as String,
        );
        expectDeep(
          got.ok
              ? {'ok': true, 'writes': got.writes.map((w) => w.toJson()).toList()}
              : {'ok': false, 'reason': got.reason, 'writes': const []},
          c['expected'],
        );
      });
    }
  });

  group('lifecycle banners + suspension reason (§3.4/§2.4)', () {
    for (final c in (fx['lifecycle'] as List).cast<Map<String, dynamic>>()) {
      test(c['id'] as String, () {
        final reg = regOf(c['registry']);
        final view = reg == null
            ? null
            : planViewOf(reg, c['counters'] == null ? null : ctrOf(c['counters']), c['now'] as String);
        final banner = view == null ? null : lifecycleBanner(view, c['now'] as String);
        expectDeep(banner?.toJson(), c['expected']);
      });
    }
    for (final c in (fx['reasons'] as List).cast<Map<String, dynamic>>()) {
      test('reason ${c['id']}', () {
        final events = (c['events'] as List).map((e) => BusinessEventDoc.fromMap(m(e))).toList();
        expect(latestSuspensionReason(events), c['expected']);
      });
    }
  });

  group('cross-client leg: one staffer, two businesses (§8-G5)', () {
    final cc = m(fx['crossClient']);
    final accounts = (cc['accounts'] as List)
        .map((a) => MoneyAccount.fromMap(m(a)['id'] as String, m(a)))
        .toList();
    final products = (cc['products'] as List)
        .map((p) => Product.fromMap(m(p)['id'] as String, m(p)))
        .toList();
    final byId = {for (final p in products) p.id: p};
    final at = cc['now'] as String;
    final email = cc['stafferEmail'] as String;

    for (final b in (cc['businesses'] as List).cast<Map<String, dynamic>>()) {
      test('resolution + state + counter — ${b['businessId']}', () {
        final reg = regOf(b['registry'])!;
        final got = resolveAccess(
          callerUid: 'u-staffer',
          callerEmail: email,
          businessId: b['businessId'] as String,
          staffEmails: (b['staffEmails'] as List).cast<String>(),
          membership: m(b['membership']),
          staffIndex: null,
        );
        final exp = m(b['expected']);
        expectDeep({'access': got.access, 'role': got.role, 'via': got.via}, exp['resolution']);
        expect(derivePlanState(reg, at), exp['state']);
        expectDeep(nextInvoiceCounter(ctrOf(b['counters']), reg.plan, at).toMap(), exp['counterAfter']);
      });
    }

    test('trades compose identically per business; each journal balances', () {
      final composed = <String, JournalEntry>{};
      for (final t in (cc['trades'] as List).cast<Map<String, dynamic>>()) {
        final input = m(t['input']);
        final JournalEntry entry;
        if (t['kind'] == 'bill') {
          final lineMaps = (input['lines'] as List).cast<Map<String, dynamic>>();
          final priced = priceBillLines(
            lineMaps
                .map((l) => BillLineInput(
                      productId: l['productId'] as String,
                      qty: (l['qty'] as num).toDouble(),
                      unitPrice: byId[l['productId'] as String]!.salePrice,
                    ))
                .toList(),
            byId,
          )!;
          final stamped = stampBillTaxes(priced.items, byId, const [], discountAmount: 0);
          final bill = Bill(
            id: input['id'] as String,
            billNo: input['billNo'] as int,
            customerId: null,
            customerName: '',
            customerPhone: '',
            items: stamped.items,
            subtotal: priced.subtotal,
            discountType: 'amount',
            discountValue: 0,
            discountAmount: 0,
            taxAmount: stamped.taxAmount,
            total: stamped.total,
            payments: (input['payments'] as List)
                .map((p) => BillPayment(method: m(p)['method'] as String, amount: (m(p)['amount'] as num).toDouble(), accountId: null))
                .toList(),
            status: 'paid',
            ts: '2026-10-23T10:05:00.000Z',
          );
          entry = composeBillEntry(
            bill: bill, pricedItems: priced.items, costTotal: priced.costTotal,
            accounts: accounts, productsById: byId, ts: '2026-10-23T10:05:00.000Z',
          ).entry;
        } else {
          entry = composeCounterSaleEntry(
            saleId: input['id'] as String,
            product: byId[input['productId'] as String]!,
            qty: (input['qty'] as num).toDouble(),
            slabs: const [],
            accounts: accounts,
          );
        }
        composed[t['businessId'] as String] = entry;
        expect(canon(entry), canonExpected(m(t['entry'])), reason: t['businessId'] as String);
        expect(trialBalanceTotal([entry]).abs(), lessThan(0.009), reason: '${t['businessId']} TB');
      }
      expect(composed.keys.length, 2);
    });
  });
}

/// Phase H · H5 — the Dart WhatsApp port proven against the
/// REAL web functions: harness/fixtures/h5-core.json is exported
/// from the compiled TypeScript (fixtures-export-h5.js) over the
/// WA harness suite's own cases. The consent truth table + the
/// import guard, phone/link normalisation, template rendering,
/// the udhaar FIFO positions, every audience derivation (the
/// full segment table + the resolved lists — consent filter
/// LAST, for every kind), the suggested reminders, the launch
/// materialisation, the whole queue walk (confirm → opt-out
/// AFTER launch → skipped_optout, never sent → bad number →
/// progress → the session cursor that writes nothing), the
/// queue message, the snapshot plan gates, and the backup
/// manifest/restore slice for the three WhatsApp collections
/// are compared value-for-value.
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:dukaan_ai/core/backup.dart' as bk;
import 'package:dukaan_ai/core/plans.dart';
import 'package:dukaan_ai/core/tenancy.dart' show PlanSnapshot;
import 'package:dukaan_ai/core/types.dart';
import 'package:dukaan_ai/core/whatsapp.dart';

Map<String, dynamic> mm(dynamic v) => (v as Map).cast<String, dynamic>();
List<dynamic> ll(dynamic v) => v as List<dynamic>;

bool deepEq(dynamic a, dynamic b) {
  if (a is num && b is num) return a.toDouble() == b.toDouble();
  if (a is Map && b is Map) {
    if (a.length != b.length) return false;
    for (final k in a.keys) {
      if (!b.containsKey(k) || !deepEq(a[k], b[k])) return false;
    }
    return true;
  }
  if (a is List && b is List) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (!deepEq(a[i], b[i])) return false;
    }
    return true;
  }
  return a == b;
}

void expectDeep(dynamic actual, dynamic expected, String what) {
  expect(deepEq(actual, expected), isTrue,
      reason: '$what\nactual:   ${jsonEncode(actual)}\nexpected: ${jsonEncode(expected)}');
}

void main() {
  final fx = mm(jsonDecode(
      File('../harness/fixtures/h5-core.json').readAsStringSync()));
  final now = fx['now'] as String;
  final dataMap = mm(fx['data']);
  final customers = [
    for (final c in ll(dataMap['customers']))
      Customer.fromMap(c['id'] as String, mm(c)),
  ];
  Customer cust(String id) => customers.firstWhere((c) => c.id == id);
  final data = WaAudienceData(
    customers: customers,
    credits: [
      for (final c in ll(dataMap['credits']))
        CreditEntry.fromMap(c['id'] as String, mm(c)),
    ],
    journal: [
      for (final e in ll(dataMap['journal']))
        JournalEntry.fromMap(e['id'] as String, mm(e)),
    ],
    bills: [
      for (final b in ll(dataMap['bills'])) Bill.fromMap(b['id'] as String, mm(b)),
    ],
    saleOrders: [
      for (final o in ll(dataMap['saleOrders']))
        SaleOrder.fromMap(o['id'] as String, mm(o)),
    ],
    jobs: [
      for (final j in ll(dataMap['jobs'])) Job.fromMap(j['id'] as String, mm(j)),
    ],
    settings: mm(dataMap['settings']),
    nowISO: dataMap['nowISO'] as String,
  );

  group('consent: the truth table (design §3.2)', () {
    final cc = mm(fx['consentCases']);
    test('absent and false are the same answer — NO', () {
      expect(customerOptedIn(const Customer(id: 'x')), cc['optedInAbsent']);
      expect(
          customerOptedIn(Customer.fromMap('x', mm({'waOptIn': false}))),
          cc['optedInFalse']);
      expect(customerOptedIn(Customer.fromMap('x', mm({'waOptIn': true}))),
          cc['optedInTrue']);
      expect(cc['optedInAbsent'], isFalse);
      expect(cc['optedInTrue'], isTrue);
    });
    test('the stamp writes all three fields — grants AND revocations', () {
      expectDeep(waConsentPatch('counter', true, now), cc['patchCounterGrant'],
          'counter grant patch');
      expectDeep(waConsentPatch('storefront', false, now),
          cc['patchStorefrontRevoke'], 'storefront revoke patch');
    });
    test('import can NEVER set consent — every consent field removed', () {
      final stripped = stripImportConsent(mm(cc['importRow']));
      expectDeep(stripped, cc['importStripped'], 'stripped import row');
      expect(stripped.containsKey('waOptIn'), isFalse);
      expect(stripped.containsKey('waOptInAt'), isFalse);
      expect(stripped.containsKey('waOptInSource'), isFalse);
      expect(customerOptedIn(Customer.fromMap('b', stripped)),
          cc['importStrippedOptedIn']);
    });
    test('the service interval resolves field-by-field to the 90 default', () {
      expect(resolveWaSettings(const {}).serviceIntervalDays,
          cc['settingsAbsent']);
      expect(
          resolveWaSettings(mm({
            'whatsapp': {'serviceIntervalDays': 30}
          })).serviceIntervalDays,
          cc['settings30']);
      expect(
          resolveWaSettings(mm({
            'whatsapp': {'serviceIntervalDays': -5}
          })).serviceIntervalDays,
          cc['settingsNegative']);
    });
  });

  group('phone, links, rendering', () {
    final pc = mm(fx['phoneCases']);
    test('local numbers normalise exactly as the bill share composes them', () {
      expect(waIntlPhone('0300-1112233'), pc['intlLocal']);
      expect(waIntlPhone('+92 300 1112233'), pc['intlPlus']);
      expect(waPhoneOk('0300-1112233'), pc['okLocal']);
      expect(waPhoneOk('123'), pc['okStub']);
      expect(waMeLink('0300-1112233', 'Salam alaikum'), pc['link']);
    });
    test('rendering substitutes known placeholders, leaves unknown standing',
        () {
      expect(
          renderWaMessage(
            'Salam {name}, Rs {amount} due at {shop}; {points} pts; code {xyz}',
            name: 'Ahmad',
            shop: 'Madina',
            points: 2500,
            amount: 3000.4,
          ),
          pc['rendered']);
    });
  });

  group('udhaar FIFO positions', () {
    test('repayments retire the OLDEST credit first', () {
      final uc = mm(fx['udhaarCases']);
      final al = customerUdhaarPosition(data.credits, 'wa-al');
      expect(al.outstanding, uc['al']['outstanding']);
      expect(al.oldestAgeDays, uc['al']['oldestAgeDays']);
      final bina = customerUdhaarPosition(data.credits, 'wa-bina');
      expect(bina.outstanding, uc['bina']['outstanding']);
      expect(bina.oldestAgeDays, uc['bina']['oldestAgeDays']);
    });
    test('the fixture journal carries the real H1 earn (2,500 points)', () {
      expect(fx['earnAlPoints'], 2500);
    });
  });

  group('audiences: live derivations, consent filter LAST', () {
    test('the full segment table (every customer × every kind)', () {
      for (final c in ll(fx['segmentCases'])) {
        final aud = WaAudience.fromMap(mm(c['audience']));
        expect(waSegmentMatches(aud, cust(c['customerId'] as String), data),
            c['matches'],
            reason:
                'segment ${aud.kind} for ${c['customerId']}');
      }
    });
    test('the segment test alone admits cid — the resolver excludes him', () {
      final udhaar = WaAudience.fromMap(
          mm({'kind': 'udhaar_outstanding', 'minRs': 1, 'minDays': 7}));
      expect(waSegmentMatches(udhaar, cust('wa-cid'), data), isTrue);
      expect(resolveWaAudience(udhaar, data).any((c) => c.id == 'wa-cid'),
          isFalse);
    });
    test('every resolved list matches the web, in directory order', () {
      for (final c in ll(fx['audienceCases'])) {
        final aud = WaAudience.fromMap(mm(c['audience']));
        expect(resolveWaAudience(aud, data).map((x) => x.id).toList(),
            ll(c['ids']),
            reason: 'audience ${aud.kind}');
        expect(waAudienceCount(aud, data), c['count']);
      }
    });
    test('suggested reminders: counts only, consent filter included', () {
      expectDeep(waSuggestedReminders(data).toJson(), fx['suggestions'],
          'suggestions');
    });
  });

  group('launch + the queue walk', () {
    final qc = mm(fx['queueCases']);
    final campaign = WaCampaign.fromMap('wac-1', mm(qc['campaign']));
    var n = 0;
    final plan = planWaLaunch(campaign, data, () => 'was-${++n}');

    Map<String, dynamic> sendJson(WaSend s) => {'id': s.id, ...s.toMap()};

    test('launch materialises one queued row per resolved recipient', () {
      expect(plan.resolvedCount, qc['resolvedCount']);
      expectDeep(plan.sends.map(sendJson).toList(), ll(qc['planSends']),
          'plan sends');
    });

    test('the walk: confirm, opt-out after launch, bad number, progress', () {
      var sends = [...plan.sends];
      WaSend byId(String id) => sends.firstWhere((s) => s.id == id);

      final step1 = waQueueStep(sends, customers, null);
      expect(step1?.send.id, qc['step1']['sendId']);
      expect(step1?.action, qc['step1']['action']);
      final opened = waSendTransition(step1!.send, 'opened', cust('wa-al'));
      expect(opened.state, qc['openedState']);
      final sent = waSendTransition(opened, 'sent', cust('wa-al'));
      expect(sent.state, qc['sentState']);
      sends = [for (final s in sends) s.id == 'was-1' ? sent : s];

      final binaSent = waSendTransition(byId('was-2'), 'sent', cust('wa-bina'));
      expect(binaSent.state, qc['binaSentState']);
      sends = [for (final s in sends) s.id == 'was-2' ? binaSent : s];

      // dal opts OUT after launch — the send-time re-check governs.
      final afterOptOut = [
        for (final c in customers)
          if (c.id == 'wa-dal')
            Customer.fromMap(c.id, {
              ...c.toMap(),
              ...waConsentPatch('counter', false, now),
            })
          else
            c,
      ];
      Customer custAfter(String id) =>
          afterOptOut.firstWhere((c) => c.id == id);
      final stepDal = waQueueStep(sends, afterOptOut, null);
      expect(stepDal?.send.id, qc['stepDal']['sendId']);
      expect(stepDal?.action, qc['stepDal']['action']);
      final dalLanded =
          waSendTransition(stepDal!.send, 'sent', custAfter('wa-dal'));
      // The re-check OVERRIDES the act: never recorded as sent.
      expect(dalLanded.state, qc['dalLandedState']);
      expect(dalLanded.state, 'skipped_optout');
      sends = [for (final s in sends) s.id == 'was-3' ? dalLanded : s];

      final stepEza = waQueueStep(sends, afterOptOut, null);
      expect(stepEza?.send.id, qc['stepEza']['sendId']);
      expect(stepEza?.action, qc['stepEza']['action']);
      final ezaLanded =
          waSendTransition(stepEza!.send, 'opened', custAfter('wa-eza'));
      expect(ezaLanded.state, qc['ezaLandedState']);
      expect(ezaLanded.state, 'skipped_invalid');
      sends = [for (final s in sends) s.id == 'was-4' ? ezaLanded : s];

      expectDeep(sends.map(sendJson).toList(), ll(qc['finalSends']),
          'final send log');
      expectDeep(waCampaignProgress(sends).toJson(), qc['progress'],
          'campaign progress');
      expect(waQueueStep(sends, afterOptOut, null) == null,
          qc['stepAfterCompleteIsNull']);
    });

    test('the session cursor writes NOTHING — the row resurfaces next time',
        () {
      expect(waQueueStep(plan.sends, customers, 'was-1')?.send.id,
          qc['cursorAfterWas1']);
      expect(waQueueStep(plan.sends, customers, null)?.send.id,
          qc['headWithoutCursor']);
      expect(plan.sends.every((s) => s.state == 'queued'),
          qc['planSendsStillQueued']);
    });

    test('the queue message renders with the recipient\'s LIVE facts', () {
      expect(
          waQueueMessage(
            'Assalam-o-Alaikum {name}, Rs {amount} outstanding at {shop}; you have {points} points.',
            cust('wa-al'),
            data,
          ),
          qc['message']);
    });

    test('a recipient whose doc is gone re-checks as optout', () {
      expect(waSendRecheck(plan.sends[0], null), qc['recheckGoneCustomer']);
      expect(qc['recheckGoneCustomer'], 'optout');
    });
  });

  group('plan gates: the snapshot governs (design §5.1)', () {
    final gc = mm(fx['gateCases']);
    PlanView view(Map<String, dynamic> snap, String state) => PlanView(
          snapshot: PlanSnapshot.fromMap(snap),
          enforce: true,
          suspended: false,
          state: state,
          counters: null,
        );
    test('the catalogue grants whatsapp at Standard — a Basic SNAPSHOT is refused',
        () {
      expect(tierIncludesModule('standard', 'whatsapp'),
          gc['catalogueStandardHasWhatsapp']);
      expect(waModuleAllowed(view(mm(gc['basicSnapshot']), 'active')),
          gc['moduleBasic']);
      expect(gc['moduleBasic'], isFalse);
    });
    test('a Standard snapshot in an active state passes both gates', () {
      final v = view(mm(gc['standardSnapshot']), 'active');
      expect(waModuleAllowed(v), gc['moduleStandard']);
      expect(waSendingAllowed(v), gc['sendingStandard']);
    });
    test('expiry degrades SENDING only — reads stay open', () {
      final grace = view(mm(gc['standardSnapshot']), 'grace');
      expect(waModuleAllowed(grace), gc['moduleGrace']);
      expect(waSendingAllowed(grace), gc['sendingGrace']);
      expect(
          waSendingAllowed(view(mm(gc['standardSnapshot']), 'suspended')),
          gc['sendingSuspendedState']);
    });
    test('a null plan view gates nothing', () {
      expect(waModuleAllowed(null), gc['moduleNull']);
      expect(waSendingAllowed(null), gc['sendingNull']);
    });
  });

  group('backup: the manifest gains the three WA collections', () {
    final bc = mm(fx['backupCases']);
    test('the Dart tenant list IS the web TENANT_COLLECTIONS (38)', () {
      expect(bk.tenantCollections, ll(bc['tenantCollections']));
      expect(bk.tenantCollections.length, 38);
    });
    test('the assembled file verifies; the wa counts ride the manifest', () {
      final file = mm(bc['file']);
      expect(bk.verifyBackup(file).ok, bc['fileVerifies']);
      final counts = mm(mm(file['manifest'])['counts']);
      expect(counts['waTemplates'], 1);
      expect(counts['waCampaigns'], 1);
      expect(counts['waSends'], 1);
    });
    test('the restore plan writes the wa docs into the TARGET tree only',
        () {
      final target = bk.emptyNamespace();
      target.owner = {'shopName': 'New Shop', 'staffEmails': [], 'staff': []};
      final plan = bk.planRestore(
        file: mm(bc['file']),
        targetBusinessId: 'bizWA2',
        target: target,
        actorUid: 'bizWA2',
        nowISO: now,
      );
      expect(plan.ok, bc['planOk']);
      for (final c in ll(bc['waWritePaths'])) {
        final planned = plan.writes.any(
            (w) => w.kind == 'set' && w.path == 'users/bizWA2/${c['tail']}');
        expect(planned, c['planned'], reason: 'write for ${c['tail']}');
      }
      bk.applyRestoreWrites(target, plan.writes);
      final rt = mm(bc['roundTrip']);
      expect(
          bk.docsEqual(target.collections['waTemplates']![0], mm(bc['tplDoc'])),
          rt['tpl']);
      expect(
          bk.docsEqual(target.collections['waCampaigns']![0], mm(bc['campDoc'])),
          rt['camp']);
      expect(bk.docsEqual(target.collections['waSends']![0], mm(bc['sendDoc'])),
          rt['send']);
    });
    test(
        'a pre-WA backup still verifies in the apps (H3 tolerance precedent; '
        'the web lib refuses it — deviation recorded in H5-REPORT.md)', () {
      expect(bc['webVerdictOnPreWaFile'], 'not-a-backup');
      expect(bk.verifyBackup(mm(bc['preWaFile'])).ok, isTrue);
    });
  });
}

/// Golden-fixture parity for Fix Round 2 (the owner's 2026-10-24
/// redefinition: demo opt-in, clear-to-trash, multi-business):
/// the Dart ports of the pure FR2 cores must produce results
/// EQUAL to the web's — the demo id sets + summary +
/// classification (item 1), the trash chunking + manifest +
/// state machine (item 2), and the new-business phase plans +
/// skeleton + owner-owned healing + switcher ordering (item 3)
/// — for the shared scenarios exported by
/// harness/fixtures-export-fr2.js from the REAL web functions.
///
/// Deliberately web-only, NOT mirrored here (declared in the
/// release note): the trash-panel UI, the new-business creation
/// dialog, and the Dashboard/Settings demo buttons — the web
/// panel covers them; the Dart deliverable is pure-logic parity
/// plus these fixtures.
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:dukaan_ai/core/demo.dart';
import 'package:dukaan_ai/core/tenancy.dart';
import 'package:dukaan_ai/core/trash.dart';

bool deepEqual(Object? a, Object? b) {
  if (a is Map && b is Map) {
    if (a.length != b.length) return false;
    for (final k in a.keys) {
      if (!b.containsKey(k) || !deepEqual(a[k], b[k])) return false;
    }
    return true;
  }
  if (a is List && b is List) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  return a == b;
}

void expectDeep(Object? actual, Object? expected, String label) {
  expect(deepEqual(actual, expected), isTrue, reason: '$label\nactual: $actual\nexpected: $expected');
}

Map<String, dynamic> asMap(Object? v) => Map<String, dynamic>.from(v as Map);

void main() {
  final fx = jsonDecode(File('../harness/fixtures/fr2-core.json').readAsStringSync()) as Map<String, dynamic>;

  group('FR2 · item 1: demo set, summary, classification', () {
    test('demo id sets match the web generators byte-for-byte (as sets)', () {
      final ids = demoSetIds();
      final expected = asMap(fx['demoIdSets']);
      expect(ids.keys.toSet(), expected.keys.toSet());
      for (final k in expected.keys) {
        final exp = (expected[k] as List).map((e) => e.toString()).toSet();
        expect(ids[k], exp, reason: 'demoIdSets.$k');
      }
    });

    test('demo summary is computed, and lands on the live demo figures', () {
      final s = demoSummary();
      final e = asMap(fx['demoSummary']);
      expect(s.products, e['products']);
      expect(s.customers, e['customers']);
      expect(s.suppliers, e['suppliers']);
      expect(s.salesRows, e['salesRows']);
      expect(s.journalEntries, e['journalEntries']);
      expect(s.stockCost, e['stockCost']);
      expect(s.stockRetail, e['stockRetail']);
    });

    test('classification scenarios match the web exactly', () {
      final demo = demoSetIds();
      for (final sc in fx['classificationScenarios'] as List) {
        final m = asMap(sc);
        final docs = <String, List<String>>{};
        for (final entry in (m['docs'] as Map).entries) {
          docs[entry.key as String] = (entry.value as List).map((d) => (d as Map)['id'].toString()).toList();
        }
        expect(classifyBusinessContent(docs, demo), m['actual'], reason: m['name'] as String);
        expect(m['actual'], m['expected'], reason: '${m['name']} fixture internal');
      }
    });

    test('seed-write summary counts reproduce the demo figures', () {
      final ids = demoSetIds();
      final writes = <(String, String)>[];
      for (final e in ids.entries) {
        for (final id in e.value) {
          writes.add((e.key, id));
        }
      }
      final counts = summarizeSeedWrites(writes);
      final s = demoSummary();
      expect(counts['products'], s.products);
      expect(counts['sales'], s.salesRows);
      expect(counts['journal'], s.journalEntries);
      expect(counts['customers'], s.customers);
      expect(counts['suppliers'], s.suppliers);
      expect(counts['accounts'], 5);
      expect(counts['warehouses'], 1);
      expect(counts['stockLevels'], 25);
    });
  });

  group('FR2 · item 2: trash chunking, manifest, state machine', () {
    test('chunking splits a 900,166-char backup into 3 chunks and reassembles', () {
      final tc = asMap(fx['trashCases']);
      final json = 'x' * (tc['sampleJsonLength'] as int);
      final chunks = chunkBackupJson(json);
      expect(chunks.length, tc['chunkCount']);
      final lengths = chunks.map((c) => c.data.length).toList();
      expect(lengths, (tc['chunkLengths'] as List).cast<int>());
      expect(reassembleChunks(chunks, chunks.length), json);
      expect(tc['reassembledEqual'], isTrue);
      expect(reassembleChunks(chunks.reversed.toList(), chunks.length), json);
      expect(tc['reassembledShuffledEqual'], isTrue);
    });

    test('gap, truncated tail, wrong count and empty input are corruption', () {
      final tc = asMap(fx['trashCases']);
      final chunks = chunkBackupJson('x' * (tc['sampleJsonLength'] as int));
      expect(reassembleChunks([chunks[0], chunks[2]], 3), isNull);
      expect(tc['reassembledGapNull'], isTrue);
      expect(reassembleChunks(chunks.sublist(0, 2), 3), isNull);
      expect(tc['reassembledTruncatedNull'], isTrue);
      expect(reassembleChunks(chunks, 2), isNull);
      expect(tc['reassembledWrongCountNull'], isTrue);
      expect(reassembleChunks([]), isNull);
      expect(chunkBackupJson(''), [isA<TrashChunk>()]);
      expect(chunkBackupJson('').length, 1);
      expect(reassembleChunks(chunkBackupJson('')), '');
    });

    test('manifest copies the backup manifest and expires exactly +30 days', () {
      final tc = asMap(fx['trashCases']);
      final fm = asMap(tc['manifest']);
      final made = trashManifestFor(
        trashId: fm['trashId'] as String,
        businessId: fm['businessId'] as String,
        counts: (fm['counts'] as Map).map((k, v) => MapEntry(k as String, (v as num).toInt())),
        totalDocs: fm['totalDocs'] as int,
        journalCount: fm['journalCount'] as int,
        journalFingerprint: fm['journalFingerprint'] as String,
        json: 'y' * (fm['jsonLength'] as int),
        clearedAtISO: fm['clearedAt'] as String,
        replacedTrashId: fm['replacedTrashId'] as String?,
      );
      expect(made.manifest.chunkCount, fm['chunkCount']);
      expect(made.manifest.jsonLength, fm['jsonLength']);
      expect(made.manifest.clearedAt, fm['clearedAt']);
      expect(made.manifest.expiresAt, fm['expiresAt']);
      expect(made.manifest.status, fm['status']);
      expect(made.manifest.source, fm['source']);
      expectDeep(made.manifest.counts, fm['counts'], 'manifest.counts');
      expect(trashExpiresAt('2026-10-24T07:00:00.000Z'), '2026-11-23T07:00:00.000Z');
    });

    test('read-time states and restore gates match the fixture', () {
      final tc = asMap(fx['trashCases']);
      final fm = asMap(tc['manifest']);
      final base = TrashManifest.fromMap(fm);
      final states = asMap(tc['states']);
      final can = asMap(tc['canRestore']);
      expect(trashPanelState(base, '2026-10-24T07:00:00.000Z'), states['atClear']);
      expect(trashPanelState(base, '2026-11-22T07:00:00.000Z'), states['at29Days']);
      expect(trashPanelState(base, '2026-11-23T07:00:00.001Z'), states['at30DaysPlus1s']);
      final restored = TrashManifest.fromMap({...fm, 'status': 'restored'});
      expect(trashPanelState(restored, '2026-11-23T07:00:00.001Z'), states['restoredPastExpiry']);
      expect(canRestoreFromTrash(base, '2026-10-24T07:00:00.000Z'), can['atClear']);
      expect(canRestoreFromTrash(base, '2026-11-23T07:00:00.001Z'), can['expired']);
      expect(canRestoreFromTrash(restored, '2026-10-24T07:00:00.000Z'), can['restored']);
      expect(clearReplacesTrash([base], '2026-10-24T07:00:00.000Z'), isNotNull);
      expect(clearReplacesTrash([base], '2026-11-23T07:00:00.001Z'), isNull);
    });
  });

  group('FR2 · item 3: new business, healing, switcher', () {
    const input = NewBusinessInput(
      businessId: 'biz-fr2-generated-001',
      ownerUid: 'user-fr2-uid-001',
      ownerEmail: 'owner-fr2@example.com',
      name: 'Second Shop',
      phone: '0300-1112233',
      address: 'Main Road',
      nowISO: '2026-10-24T07:00:00.000Z',
    );

    test('creation-form validation mirrors the web', () {
      final nb = asMap(fx['newBusiness']);
      expect(newBusinessInputOk(name: 'Second Shop', phone: '0300-1112233', address: 'Main Road'), nb['inputOk']);
      expect(newBusinessInputOk(name: '', phone: '', address: ''), isFalse);
      expect(newBusinessInputOk(name: 'x' * 61, phone: '', address: ''), isFalse);
      expect(newBusinessInputOk(name: 'Ok', phone: '1' * 17, address: ''), isFalse);
      expect(newBusinessInputOk(name: 'Ok', phone: '', address: 'a' * 201), isFalse);
      expect(nb['inputBad'], isFalse);
    });

    test('phase 1: trial registry (never founding) + creation event', () {
      final nb = asMap(fx['newBusiness']);
      final writes = planNewBusinessPhase1(input).map((w) => w.toJson()).toList();
      final expected = (nb['phase1'] as List).map((w) => asMap(w)).toList();
      expect(writes.length, expected.length);
      for (var i = 0; i < expected.length; i++) {
        expectDeep(writes[i], expected[i], 'phase1[$i]');
      }
      final registry = asMap(expected[0]['data']);
      expect((asMap(registry['plan'])['planId']), 'trial');
      expect(registry['ownerUid'], 'user-fr2-uid-001');
      expect(registry['enforce'], isFalse);
    });

    test('phase 2: zeroed counters + owner index entry, no members doc', () {
      final nb = asMap(fx['newBusiness']);
      final writes = planNewBusinessPhase2(input).map((w) => w.toJson()).toList();
      final expected = (nb['phase2'] as List).map((w) => asMap(w)).toList();
      expect(writes.length, expected.length);
      for (var i = 0; i < expected.length; i++) {
        expectDeep(writes[i], expected[i], 'phase2[$i]');
      }
      expect(writes.map((w) => w['kind']).toSet(), {'set', 'index'});
    });

    test('skeleton: empty-by-construction, seedV2, demoState none, fixed structural docs', () {
      final nb = asMap(fx['newBusiness']);
      final sk = newBusinessSkeleton(input);
      expectDeep(sk.ownerDoc, asMap((asMap(nb['skeleton'])['ownerDoc'])), 'skeleton.ownerDoc');
      final expAccounts = (asMap(nb['skeleton'])['accounts'] as List).map((a) => asMap(a)).toList();
      expect(sk.accounts.length, expAccounts.length);
      for (var i = 0; i < expAccounts.length; i++) {
        expectDeep(sk.accounts[i], expAccounts[i], 'skeleton.accounts[$i]');
      }
      expectDeep(sk.warehouse, asMap(asMap(nb['skeleton'])['warehouse']), 'skeleton.warehouse');
    });

    test('owner-owned healing keeps generated businesses without membership docs', () {
      final nb = asMap(fx['newBusiness']);
      final healed = healIndex(
        [
          const IndexEntry(businessId: 'biz-fr2-generated-001', role: 'manager'),
          const IndexEntry(businessId: 'biz-fr2-gone', role: 'manager'),
        ],
        {},
        ['biz-fr2-generated-001'],
      );
      final exp = asMap(nb['healed']);
      expect(healed.kept.map((e) => {'businessId': e.businessId, 'role': e.role}).toList(),
          (exp['kept'] as List).map((e) => {'businessId': (e as Map)['businessId'], 'role': e['role']}).toList());
      expect(healed.dropped, (exp['dropped'] as List).cast<String>());
      expect(healed.kept.first.own, isTrue);
    });

    test('switcher ordering: uid-own first, owned by name, members by name', () {
      final nb = asMap(fx['newBusiness']);
      final list = buildSwitcherList(
        own: (businessId: 'user-fr2-uid-001', name: 'First Shop'),
        entries: const [
          IndexEntry(businessId: 'biz-fr2-member', role: 'manager'),
          IndexEntry(businessId: 'biz-fr2-generated-001', role: 'owner', own: true),
        ],
        names: {
          'user-fr2-uid-001': 'First Shop',
          'biz-fr2-generated-001': 'Second Shop',
          'biz-fr2-member': 'A Shop',
        },
      );
      final expected = (nb['switcher'] as List).map((s) => asMap(s)).toList();
      expect(list.length, expected.length);
      for (var i = 0; i < expected.length; i++) {
        expect(list[i].businessId, expected[i]['businessId'], reason: 'switcher[$i].businessId');
        expect(list[i].name, expected[i]['name'], reason: 'switcher[$i].name');
        expect(list[i].role, expected[i]['role'], reason: 'switcher[$i].role');
        expect(list[i].own, expected[i]['own'], reason: 'switcher[$i].own');
      }
    });

    test('active-business picking: first candidate present wins, absent is null', () {
      final list = buildSwitcherList(
        own: (businessId: 'user-fr2-uid-001', name: 'First Shop'),
        entries: const [
          IndexEntry(businessId: 'biz-fr2-generated-001', role: 'owner', own: true),
        ],
        names: {'user-fr2-uid-001': 'First Shop', 'biz-fr2-generated-001': 'Second Shop'},
      );
      expect(pickActiveBusiness(list, [null, 'biz-fr2-generated-001'])?.businessId, 'biz-fr2-generated-001');
      expect(pickActiveBusiness(list, ['missing', 'user-fr2-uid-001'])?.businessId, 'user-fr2-uid-001');
      expect(pickActiveBusiness(list, ['missing']), isNull);
      expect(pickActiveBusiness(list, []), isNull);
    });
  });
}

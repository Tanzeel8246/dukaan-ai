/// Golden-fixture parity for ERP Phase G · G6 (design §9): the
/// Dart port of the backup format + restore planner
/// (lib/core/backup.dart) must agree with the web lib
/// semantics-for-semantics over the shared truth tables exported
/// by harness/fixtures-export-g6.js from the REAL web functions —
/// SHA-256 known answers, the journal fingerprint (including the
/// B1-frozen seed SHA e17e5bda…1168), manifest verification over
/// whole and tampered files, and the restore planner's truth
/// table (fresh / altered / extra / resumed / completed targets)
/// with exact write paths.
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:dukaan_ai/core/backup.dart' as bk;

Map<String, dynamic> _doc(Object? v) =>
    v is Map ? Map<String, dynamic>.from(v) : <String, dynamic>{};

bk.RestoreTarget _targetOf(Object? v) {
  final m = _doc(v);
  final rawCols = _doc(m['collections']);
  List<bk.KeyedDoc> keyed(Object? list) => (list as List? ?? const [])
      .whereType<Map>()
      .map((e) => bk.KeyedDoc(key: '${e['key']}', data: _doc(e['data'])))
      .toList();
  return bk.RestoreTarget(
    owner: m['owner'] == null ? null : _doc(m['owner']),
    collections: {
      for (final name in bk.tenantCollections)
        name: (rawCols[name] as List? ?? const [])
            .whereType<Map>()
            .map(_doc)
            .toList(),
    },
    members: keyed(m['members']),
    invites: keyed(m['invites']),
  );
}

void main() {
  final fx = jsonDecode(
    File('../harness/fixtures/g6-core.json').readAsStringSync(),
  ) as Map<String, dynamic>;
  final targetId = fx['targetBusinessId'] as String;
  final nowISO = fx['nowISO'] as String;

  group('sha256 known answers (expected values from the web lib)', () {
    for (final c in (fx['sha256Kats'] as List).cast<Map<String, dynamic>>()) {
      test('input of ${c['input'].toString().length} chars', () {
        expect(bk.sha256Hex(c['input'] as String), c['sha']);
      });
    }
  });

  group('journal fingerprint', () {
    for (final c
        in (fx['fingerprintCases'] as List).cast<Map<String, dynamic>>()) {
      test(c['name'] as String, () {
        final journal = (c['journal'] as List).cast<dynamic>();
        expect(bk.journalFingerprint(journal), c['sha']);
      });
    }
    test('the seed case IS the frozen B1 identity', () {
      final seed = (fx['fingerprintCases'] as List)
          .cast<Map<String, dynamic>>()
          .firstWhere((c) => c['name'] == 'seed');
      expect(
        seed['sha'],
        'e17e5bda19e87de698b0c0a37e923f9b396bc387e2092b2ffbbd7d60d4971168',
      );
    });
  });

  group('manifest verification', () {
    final file = fx['file'] as Map<String, dynamic>;
    test('the assembled file verifies and its manifest reads true', () {
      expect(bk.verifyBackup(file).ok, isTrue);
      final manifest = _doc(file['manifest']);
      expect(manifest['journalCount'], 2);
      expect(manifest['totalDocs'], 6);
      // The foreign business's platform docs never entered the
      // file (the export slice filter, proven at assembly in TS).
      final platform = _doc(file['platform']);
      expect((platform['events'] as List).length, 1);
      expect((platform['payments'] as List).length, 0);
    });
    for (final c in (fx['verifyCases'] as List).cast<Map<String, dynamic>>()) {
      test(c['name'] as String, () {
        final v = bk.verifyBackup(c['file']);
        if (c['expect'] == null) {
          expect(v.ok, isTrue, reason: 'the whole file must verify');
        } else {
          expect(v.ok, isFalse);
          expect(v.problem, c['expect']);
        }
      });
    }
  });

  group('restore planner truth table', () {
    final file = fx['file'] as Map<String, dynamic>;
    for (final c in (fx['planCases'] as List).cast<Map<String, dynamic>>()) {
      test(c['name'] as String, () {
        final plan = bk.planRestore(
          file: file,
          targetBusinessId: targetId,
          target: _targetOf(c['target']),
          actorUid: targetId,
          nowISO: nowISO,
        );
        final expect_ = _doc(c['expect']);
        expect(plan.ok, expect_['ok']);
        expect(plan.reason, expect_['reason']);
        expect(plan.alreadyRestored, expect_['alreadyRestored']);
        expect(plan.skipped, expect_['skipped']);
        final setPaths = plan.writes
            .where((w) => w.kind == 'set')
            .map((w) => w.path)
            .toList();
        expect(setPaths, (expect_['setPaths'] as List).cast<String>());
        expect(plan.event?['kind'], expect_['eventKind']);
        if (plan.ok && !plan.alreadyRestored) {
          // The plan's final write is the platform event, and no
          // write path enters the SOURCE business's namespace.
          expect(plan.writes.last.kind, 'add');
          expect(plan.writes.last.collection, 'businessEvents');
          final sourceId = fx['businessId'] as String;
          for (final p in setPaths) {
            expect(p!.contains(sourceId), isFalse);
          }
        }
      });
    }
  });
}

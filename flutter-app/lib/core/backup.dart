/// Phase G · G6 (design §9): the full-business backup format and
/// the restore planner — the Dart mirror of web/lib/backup.ts,
/// proven against it by harness/fixtures/g6-core.json
/// (test/g6_fixtures_test.dart): SHA-256 known answers, the
/// journal fingerprint (incl. the frozen seed SHA), the assembled
/// file, the tamper → refusal table, and the planner's truth
/// table with exact write paths.
///
/// The format is the owner's data right (§3.7): one JSON document
/// holding EVERYTHING in the tenant namespace — all 38 store
/// collections exactly as stored, journal included — plus the
/// owner document and the business's own slice of the platform
/// collections, under a manifest (format/schema versions,
/// exported-at, business id, per-collection counts, platform
/// counts, and the journal's SHA-256 fingerprint) so a restore
/// can prove the file complete BEFORE anything is written.
///
/// Restore is a transplant, never a merge and never a
/// re-computation: it plans document writes only, and only into
/// a namespace that is empty of everything the file would bring.
/// It composes no journal entry — the restored journal IS the
/// file's journal, documents verbatim, so trial balance and every
/// selector read exactly what they read in the source shop.
/// Platform state is NOT transplanted (no foreign registry — the
/// target keeps the registry it was born with); memberships and
/// invites transplant verbatim under the target's paths (their
/// schema carries no inner business id — the path is the
/// identity). The act closes with its platform event
/// (restore.performed).
///
/// Phase H · H5: the tenant manifest gains the three WhatsApp
/// collections (38 total, the web TENANT_COLLECTIONS' order) —
/// tenant collections ride the generic loops, so they assemble,
/// verify, plan and restore with no slice machinery; a pre-WA
/// file (no wa arrays, no wa counts) still verifies under the
/// tolerance in verifyBackup.
///
/// Phase H · H4: the platform slice gains the H3 storefront pair
/// — the business's published snapshot (keyed by its slug) and
/// its store-order inbox — filtered to the business at the
/// assemble seam like events/payments, counted in the manifest,
/// and restored as documents at their own top-level paths under
/// the same subset rule (a target already wearing a DIFFERENT
/// slug refuses: a restore never steals or overwrites another
/// storefront's name). A pre-H3 file carries no slice and no new
/// counts; it still verifies and restores (the tolerance is
/// deliberate, old backups stay readable).
///
/// Pure: no Firestore, no store, no I/O — the store layer reads
/// and writes; this library verifies and plans.
library;

import 'dart:convert';

import 'package:crypto/crypto.dart' as crypto;

/// The store's tenant collections, in canonical order (the TS
/// lib's TENANT_COLLECTIONS — the fixture asserts the Dart list
/// agrees with the web store's subscribed set).
const List<String> tenantCollections = [
  'products',
  'sales',
  'bills',
  'suppliers',
  'purchases',
  'supplierPayments',
  'expenses',
  'credits',
  'customers',
  'returns',
  'adjustments',
  'dayCloses',
  'cashEntries',
  'journal',
  'accounts',
  'taxSlabs',
  'periods',
  'quotations',
  'saleOrders',
  'deliveryChallans',
  'purchaseOrders',
  'notes',
  'purchaseReturns',
  'cheques',
  'warehouses',
  'stockLevels',
  'stockTransfers',
  'boms',
  'productionOrders',
  'jobs',
  'employees',
  'attendance',
  'payrollRuns',
  'loans',
  'branding',
  // Phase H · WhatsApp (design §3.3): the marketing trio rides
  // the manifest like every tenant collection — appended in the
  // web TENANT_COLLECTIONS' own order.
  'waTemplates',
  'waCampaigns',
  'waSends',
];

typedef JsonDoc = Map<String, dynamic>;

class KeyedDoc {
  final String key;
  final JsonDoc data;
  const KeyedDoc({required this.key, required this.data});
}

class BackupPlatformSlice {
  final JsonDoc? registry;
  final JsonDoc? counters;
  final JsonDoc? stats;
  final List<KeyedDoc> members;
  final List<KeyedDoc> invites;
  final List<KeyedDoc> events;
  final List<KeyedDoc> payments;
  /// Phase H · H3/H4: the business's published storefront
  /// snapshot (keyed by its slug — the doc id) and its
  /// store-order inbox (keyed by doc id). Null/empty on pre-H3
  /// files, which stay verifiable.
  final KeyedDoc? storefront;
  final List<KeyedDoc> storeOrders;
  const BackupPlatformSlice({
    required this.registry,
    required this.counters,
    required this.stats,
    required this.members,
    required this.invites,
    required this.events,
    required this.payments,
    this.storefront,
    this.storeOrders = const [],
  });
}

/// Deterministic JSON: object keys sorted recursively. Used for
/// semantic document equality (restore's skip/conflict tests).
String canonicalJson(Object? value) {
  if (value is Map) {
    final keys = value.keys.map((k) => '$k').toList()..sort();
    final parts = keys.map((k) => '${jsonEncode(k)}:${canonicalJson(value[k])}');
    return '{${parts.join(',')}}';
  }
  if (value is List) {
    return '[${value.map(canonicalJson).join(',')}]';
  }
  return jsonEncode(value);
}

bool docsEqual(Object? a, Object? b) => canonicalJson(a) == canonicalJson(b);

/// SHA-256 of a string's UTF-8 bytes, hex (package:crypto).
String sha256Hex(String input) =>
    crypto.sha256.convert(utf8.encode(input)).toString();

/// The B1 fingerprint: the journal with `ts` dropped from every
/// entry, JSON-encoded (decoded key order preserved), SHA-256'd.
String journalFingerprint(List<dynamic> journal) {
  final stripped = journal.map((e) {
    final m = Map<String, dynamic>.from(e as Map);
    m.remove('ts');
    return m;
  }).toList();
  return sha256Hex(jsonEncode(stripped));
}

List<JsonDoc> _sortJournalDocs(List<JsonDoc> docs) {
  final sorted = [...docs];
  sorted.sort((a, b) {
    final ta = '${a['ts'] ?? ''}';
    final tb = '${b['ts'] ?? ''}';
    if (ta != tb) return ta.compareTo(tb);
    return '${a['id'] ?? ''}'.compareTo('${b['id'] ?? ''}');
  });
  return sorted;
}

Map<String, int> _platformCounts(BackupPlatformSlice p) => {
      'registry': p.registry == null ? 0 : 1,
      'counters': p.counters == null ? 0 : 1,
      'stats': p.stats == null ? 0 : 1,
      'members': p.members.length,
      'invites': p.invites.length,
      'events': p.events.length,
      'payments': p.payments.length,
      'storefront': p.storefront == null ? 0 : 1,
      'storeOrders': p.storeOrders.length,
    };

JsonDoc _keyedJson(KeyedDoc d) => {'key': d.key, 'data': d.data};

/// Assemble the backup document (a JSON-ready map) from the
/// business's documents. Mirrors the TS assembleBackup, including
/// the platform slice filter at this seam.
Map<String, dynamic> assembleBackup({
  required String businessId,
  required String exportedAt,
  required String exportedBy,
  required JsonDoc owner,
  required Map<String, List<JsonDoc>> collections,
  required BackupPlatformSlice platform,
}) {
  List<JsonDoc> byId(List<JsonDoc> docs) =>
      [...docs]..sort((a, b) => '${a['id'] ?? ''}'.compareTo('${b['id'] ?? ''}'));
  List<KeyedDoc> byKey(List<KeyedDoc> docs) =>
      [...docs]..sort((a, b) => a.key.compareTo(b.key));
  final cols = <String, List<JsonDoc>>{};
  for (final name in tenantCollections) {
    final docs = collections[name] ?? const [];
    cols[name] = name == 'journal' ? _sortJournalDocs(docs) : byId(docs);
  }
  final slice = BackupPlatformSlice(
    registry: platform.registry,
    counters: platform.counters,
    stats: platform.stats,
    members: byKey(platform.members),
    invites: byKey(platform.invites),
    events: byKey(
        platform.events.where((e) => e.data['businessId'] == businessId).toList()),
    payments: byKey(platform.payments
        .where((e) => e.data['businessId'] == businessId)
        .toList()),
    // H3/H4: the storefront slice is filtered to this business at
    // the seam like events/payments — a foreign snapshot or order
    // handed to the assembler never rides the file.
    storefront: (platform.storefront != null &&
            platform.storefront!.data['businessId'] == businessId)
        ? platform.storefront
        : null,
    storeOrders: byKey(platform.storeOrders
        .where((e) => e.data['businessId'] == businessId)
        .toList()),
  );
  final counts = <String, int>{
    for (final name in tenantCollections) name: cols[name]!.length,
  };
  final pc = _platformCounts(slice);
  final totalDocs = 1 + counts.values.fold<int>(0, (a, b) => a + b);
  final journal = cols['journal']!;
  return {
    'kind': 'dukaan-ai/business-backup',
    'formatVersion': 1,
    'phaseVersion': 'G6',
    'exportedAt': exportedAt,
    'exportedBy': exportedBy,
    'manifest': {
      'schemaVersion': 1,
      'businessId': businessId,
      'exportedAt': exportedAt,
      'counts': counts,
      'platformCounts': pc,
      'totalDocs': totalDocs,
      'journalCount': journal.length,
      'journalFingerprint': journalFingerprint(journal),
    },
    'owner': owner,
    'collections': cols,
    'platform': {
      'registry': slice.registry,
      'counters': slice.counters,
      'stats': slice.stats,
      'members': slice.members.map(_keyedJson).toList(),
      'invites': slice.invites.map(_keyedJson).toList(),
      'events': slice.events.map(_keyedJson).toList(),
      'payments': slice.payments.map(_keyedJson).toList(),
      'storefront': slice.storefront == null ? null : _keyedJson(slice.storefront!),
      'storeOrders': slice.storeOrders.map(_keyedJson).toList(),
    },
  };
}

class BackupVerify {
  final bool ok;
  final String? problem;
  const BackupVerify.ok()
      : ok = true,
        problem = null;
  const BackupVerify.fail(this.problem) : ok = false;
}

/** Structural JSON helpers for reading a decoded backup file. */
JsonDoc? _asDoc(Object? v) => v is Map ? Map<String, dynamic>.from(v) : null;
List<JsonDoc> _asDocs(Object? v) => v is List
    ? v.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList()
    : <JsonDoc>[];
List<KeyedDoc> _asKeyed(Object? v) => v is List
    ? v
        .whereType<Map>()
        .map((e) => KeyedDoc(
              key: '${e['key'] ?? ''}',
              data: _asDoc(e['data']) ?? <String, dynamic>{},
            ))
        .toList()
    : <KeyedDoc>[];

KeyedDoc? _asKeyedDoc(Object? v) {
  if (v is! Map) return null;
  final key = v['key'];
  final data = _asDoc(v['data']);
  if (key is! String || data == null) return null;
  return KeyedDoc(key: key, data: data);
}

BackupPlatformSlice _sliceOf(Map<String, dynamic> file) {
  final p = _asDoc(file['platform']) ?? <String, dynamic>{};
  return BackupPlatformSlice(
    registry: _asDoc(p['registry']),
    counters: _asDoc(p['counters']),
    stats: _asDoc(p['stats']),
    members: _asKeyed(p['members']),
    invites: _asKeyed(p['invites']),
    events: _asKeyed(p['events']),
    payments: _asKeyed(p['payments']),
    // H3 tolerance: a pre-H3 file carries no storefront slice —
    // absent reads as empty, in the recompute as in the export.
    storefront: _asKeyedDoc(p['storefront']),
    storeOrders: _asKeyed(p['storeOrders']),
  );
}

/// Whether the file's platform slice carries a MALFORMED H3
/// member (present but the wrong shape) — the TS computeManifest
/// returns null for these, and verifyBackup reads that as
/// not-a-backup.
bool _h3SliceMalformed(Map<String, dynamic> file) {
  final p = file['platform'];
  if (p is! Map) return false; // the pre-existing checks own this case
  final front = p['storefront'];
  if (front != null && _asKeyedDoc(front) == null) return true;
  final orders = p['storeOrders'];
  if (orders != null && orders is! List) return true;
  return false;
}

/// Verify a decoded backup file: shape, known format, then the
/// manifest recomputed from the file's own contents. Mirrors the
/// TS verifyBackup (same refusal order and problem strings).
BackupVerify verifyBackup(Object? file) {
  if (file is! Map) return const BackupVerify.fail('not-a-backup');
  final f = Map<String, dynamic>.from(file);
  if (f['kind'] != 'dukaan-ai/business-backup' || f['manifest'] is! Map) {
    return const BackupVerify.fail('not-a-backup');
  }
  final manifest = _asDoc(f['manifest'])!;
  if (f['formatVersion'] != 1 || manifest['schemaVersion'] != 1) {
    return const BackupVerify.fail('unknown-format');
  }
  if (_h3SliceMalformed(f)) {
    return const BackupVerify.fail('not-a-backup');
  }
  final rawCols = _asDoc(f['collections']) ?? <String, dynamic>{};
  final cols = <String, List<JsonDoc>>{
    for (final name in tenantCollections) name: _asDocs(rawCols[name]),
  };
  final slice = _sliceOf(f);
  final counts = <String, int>{
    for (final name in tenantCollections) name: cols[name]!.length,
  };
  final pc = _platformCounts(slice);
  final journal = _sortJournalDocs(cols['journal']!);
  final totalDocs = 1 + counts.values.fold<int>(0, (a, b) => a + b);
  final mCounts = _asDoc(manifest['counts']) ?? <String, dynamic>{};
  final mPc = _asDoc(manifest['platformCounts']) ?? <String, dynamic>{};
  var mismatch = manifest['totalDocs'] != totalDocs ||
      manifest['journalCount'] != journal.length ||
      manifest['journalFingerprint'] != journalFingerprint(journal);
  for (final name in tenantCollections) {
    // H5 tolerance (the H3 platform-count precedent, applied to
    // the tenant list): a pre-WhatsApp file's stored counts lack
    // the three WA keys; the comparison defaults them to 0 so a
    // pre-WA backup still verifies (its WA collections are
    // empty). NOTE: the current web computeManifest REQUIRES a
    // wa array in the file and refuses such a file as
    // not-a-backup — the apps deliberately keep the older,
    // tolerance-first reading (the owner's backups are a data
    // right, §3.7); flagged for the phase audit in H5-REPORT.md.
    final stored = (name == 'waTemplates' ||
            name == 'waCampaigns' ||
            name == 'waSends')
        ? (mCounts[name] ?? 0)
        : mCounts[name];
    if (stored != counts[name]) mismatch = true;
  }
  for (final k in pc.keys) {
    // A pre-H3 file's stored platformCounts lack the H3 keys;
    // the comparison defaults them to 0 so a G6-era backup
    // still verifies (its storefront slice is empty).
    final stored = (k == 'storefront' || k == 'storeOrders')
        ? (mPc[k] ?? 0)
        : mPc[k];
    if (stored != pc[k]) mismatch = true;
  }
  if (mismatch) return const BackupVerify.fail('manifest-mismatch');
  return const BackupVerify.ok();
}

class RestoreTarget {
  JsonDoc? owner;
  Map<String, List<JsonDoc>> collections;
  List<KeyedDoc> members;
  List<KeyedDoc> invites;
  /// Phase H · H3/H4: the target business's OWN current
  /// storefront doc (any slug), or null. A target that already
  /// has a public face is not an empty business for restore
  /// purposes.
  KeyedDoc? storefront;
  /// Phase H · H3/H4: the target business's current inbox docs.
  List<KeyedDoc> storeOrders;
  RestoreTarget({
    required this.owner,
    required this.collections,
    required this.members,
    required this.invites,
    this.storefront,
    this.storeOrders = const [],
  });
}

RestoreTarget emptyNamespace() => RestoreTarget(
      owner: null,
      collections: {for (final n in tenantCollections) n: <JsonDoc>[]},
      members: <KeyedDoc>[],
      invites: <KeyedDoc>[],
      storefront: null,
      storeOrders: <KeyedDoc>[],
    );

class RestoreWrite {
  final String kind; // "set" | "add"
  final String? path;
  final String? collection;
  final JsonDoc data;
  const RestoreWrite.set(this.path, this.data)
      : kind = 'set',
        collection = null;
  const RestoreWrite.add(this.collection, this.data)
      : kind = 'add',
        path = null;
}

class RestorePlan {
  final bool ok;
  final String? reason;
  final List<String> conflicts;
  final bool alreadyRestored;
  final int skipped;
  final List<RestoreWrite> writes;
  final JsonDoc? event;
  const RestorePlan({
    required this.ok,
    required this.reason,
    required this.conflicts,
    required this.alreadyRestored,
    required this.skipped,
    required this.writes,
    required this.event,
  });
}

/// Plan a restore of [file] into [targetBusinessId]'s namespace
/// (probed as [target]). Mirrors the TS planRestore: refuse (in
/// order) a non-backup, an unknown format, a manifest that does
/// not verify, and any target whose existing documents are not a
/// byte-identical subset of the backup's (the subset rule);
/// otherwise plan the missing documents only, owner doc last
/// among the data writes, closed by the restore.performed event.
RestorePlan planRestore({
  required Object? file,
  required String targetBusinessId,
  required RestoreTarget target,
  required String actorUid,
  required String nowISO,
}) {
  final v = verifyBackup(file);
  if (!v.ok) {
    return RestorePlan(
      ok: false,
      reason: v.problem,
      conflicts: const [],
      alreadyRestored: false,
      skipped: 0,
      writes: const [],
      event: null,
    );
  }
  final f = Map<String, dynamic>.from(file as Map);
  final manifest = _asDoc(f['manifest'])!;
  final rawCols = _asDoc(f['collections']) ?? <String, dynamic>{};
  final backupOwner = _asDoc(f['owner']) ?? <String, dynamic>{};
  final slice = _sliceOf(f);
  final backupCols = <String, List<JsonDoc>>{
    for (final name in tenantCollections) name: _asDocs(rawCols[name]),
  };

  /* ---- the subset test: every existing target document must be
   * the backup's own document, byte for byte ---- */
  final conflicts = <String>[];
  for (final name in tenantCollections) {
    final mine = <String, JsonDoc>{
      for (final d in backupCols[name]!) '${d['id'] ?? ''}': d,
    };
    for (final d in target.collections[name] ?? const <JsonDoc>[]) {
      final id = '${d['id'] ?? ''}';
      final src = mine[id];
      if (src == null || !docsEqual(src, d)) {
        conflicts.add('users/$targetBusinessId/$name/$id');
      }
    }
  }
  final backupMembers = <String, JsonDoc>{
    for (final m in slice.members) m.key: m.data,
  };
  for (final m in target.members) {
    final src = backupMembers[m.key];
    if (src == null || !docsEqual(src, m.data)) {
      conflicts.add('businessMembers/$targetBusinessId/members/${m.key}');
    }
  }
  final backupInvites = <String, JsonDoc>{
    for (final m in slice.invites) m.key: m.data,
  };
  for (final m in target.invites) {
    final src = backupInvites[m.key];
    if (src == null || !docsEqual(src, m.data)) {
      conflicts.add('businessInvites/$targetBusinessId/invites/${m.key}');
    }
  }
  /* The storefront obeys the same subset rule, keyed by slug: a
   * target whose public face is a DIFFERENT slug — or the same
   * slug with different content — already has a store of its
   * own, and the transplant will not grow it a second one. */
  final backupFront = slice.storefront;
  final targetFront = target.storefront;
  if (targetFront != null) {
    if (backupFront == null ||
        targetFront.key != backupFront.key ||
        !docsEqual(backupFront.data, targetFront.data)) {
      conflicts.add('storefronts/${targetFront.key}');
    }
  }
  final backupOrders = <String, JsonDoc>{
    for (final o in slice.storeOrders) o.key: o.data,
  };
  for (final o in target.storeOrders) {
    final src = backupOrders[o.key];
    if (src == null || !docsEqual(src, o.data)) {
      conflicts.add('storeOrders/${o.key}');
    }
  }
  if (conflicts.isNotEmpty) {
    return RestorePlan(
      ok: false,
      reason: 'target-not-empty',
      conflicts: conflicts,
      alreadyRestored: false,
      skipped: 0,
      writes: const [],
      event: null,
    );
  }

  /* ---- the remainder: every backup document the target lacks.
   * Membership and invite documents transplant VERBATIM under
   * the target's paths — their schema carries no inner business
   * id; the path is the identity (the TS planner's semantics). */
  final writes = <RestoreWrite>[];
  var skipped = 0;
  for (final name in tenantCollections) {
    final have = <String>{
      for (final d in target.collections[name] ?? const <JsonDoc>[])
        '${d['id'] ?? ''}',
    };
    for (final d in backupCols[name]!) {
      final id = '${d['id'] ?? ''}';
      if (have.contains(id)) {
        skipped++;
      } else {
        writes.add(RestoreWrite.set('users/$targetBusinessId/$name/$id', d));
      }
    }
  }
  final memberKeys = <String>{for (final m in target.members) m.key};
  for (final m in slice.members) {
    if (memberKeys.contains(m.key)) {
      skipped++;
    } else {
      writes.add(RestoreWrite.set(
          'businessMembers/$targetBusinessId/members/${m.key}', m.data));
    }
  }
  final inviteKeys = <String>{for (final m in target.invites) m.key};
  for (final m in slice.invites) {
    if (inviteKeys.contains(m.key)) {
      skipped++;
    } else {
      writes.add(RestoreWrite.set(
          'businessInvites/$targetBusinessId/invites/${m.key}', m.data));
    }
  }
  /* The storefront snapshot + the inbox restore as documents at
   * their own top-level paths (the slug is the snapshot's path;
   * identical existing docs are the resume case — skipped). */
  if (backupFront != null) {
    if (targetFront != null && targetFront.key == backupFront.key) {
      skipped++;
    } else {
      writes.add(
          RestoreWrite.set('storefronts/${backupFront.key}', backupFront.data));
    }
  }
  final targetOrderKeys = <String>{for (final o in target.storeOrders) o.key};
  for (final o in slice.storeOrders) {
    if (targetOrderKeys.contains(o.key)) {
      skipped++;
    } else {
      writes.add(RestoreWrite.set('storeOrders/${o.key}', o.data));
    }
  }
  /* The owner doc lands LAST among the data writes (the source
   * shop's period lock can never gate the transplant's own dated
   * creates); an identical owner doc is simply not rewritten. */
  final ownerDiffers =
      target.owner == null || !docsEqual(target.owner, backupOwner);
  if (ownerDiffers) {
    writes.add(RestoreWrite.set('users/$targetBusinessId', backupOwner));
  }

  final already = writes.isEmpty;
  JsonDoc? event;
  if (!already) {
    event = {
      'businessId': targetBusinessId,
      'kind': 'restore.performed',
      'actor': actorUid,
      'at': nowISO,
      'detail': {
        'sourceBusinessId': manifest['businessId'],
        'exportedAt': f['exportedAt'],
        'formatVersion': f['formatVersion'],
        'docsWritten': writes.length,
        'journalCount': manifest['journalCount'],
        'journalFingerprint': manifest['journalFingerprint'],
      },
    };
    writes.add(RestoreWrite.add('businessEvents', event));
  }
  return RestorePlan(
    ok: true,
    reason: null,
    conflicts: const [],
    alreadyRestored: already,
    skipped: skipped,
    writes: writes,
    event: event,
  );
}

/// Apply a plan's document writes to a target state (the
/// executor's semantic mirror — used by tests; the store layer
/// performs the same writes against Firestore).
void applyRestoreWrites(RestoreTarget target, List<RestoreWrite> writes) {
  void upsert(List<JsonDoc> list, JsonDoc data) {
    final i = list.indexWhere((d) => d['id'] == data['id']);
    if (i >= 0) {
      list[i] = data;
    } else {
      list.add(data);
    }
  }

  void upsertKeyed(List<KeyedDoc> list, String key, JsonDoc data) {
    final i = list.indexWhere((d) => d.key == key);
    if (i >= 0) {
      list[i] = KeyedDoc(key: key, data: data);
    } else {
      list.add(KeyedDoc(key: key, data: data));
    }
  }

  for (final w in writes) {
    if (w.kind != 'set' || w.path == null) continue;
    final seg = w.path!.split('/');
    if (seg.length == 2 && seg[0] == 'users') {
      target.owner = w.data;
    } else if (seg[0] == 'users' && seg.length == 4) {
      upsert(target.collections[seg[2]] ??= <JsonDoc>[], w.data);
    } else if (seg[0] == 'businessMembers') {
      upsertKeyed(target.members, seg[3], w.data);
    } else if (seg[0] == 'businessInvites') {
      upsertKeyed(target.invites, seg[3], w.data);
    } else if (seg.length == 2 && seg[0] == 'storefronts') {
      target.storefront = KeyedDoc(key: seg[1], data: w.data);
    } else if (seg.length == 2 && seg[0] == 'storeOrders') {
      upsertKeyed(target.storeOrders, seg[1], w.data);
    }
  }
}

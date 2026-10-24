/// Dukaan AI — Fix Round 2 · FR2 item 2: clear-to-trash (Dart
/// port of web/lib/trash.ts's pure core).
///
/// Clearing a business must NOT hard-delete: the whole business
/// is snapshotted into trash first, the business is wiped, and
/// the snapshot stays restorable for 30 days. The snapshot
/// format is deliberately the G6 backup format, so the existing
/// verify/restore pipeline consumes it unchanged — including
/// its empty-business guard.
///
/// Semantics (mirroring the web, stated once):
///  - Trash lives OUTSIDE the tenant namespace, at
///    businessTrash/{businessId}/snapshots/{trashId} with chunk
///    docs at .../chunks/{index}. The platform console has no
///    leg into it.
///  - Expiry is checked AT READ TIME, never by a cron: a
///    snapshot whose expiresAt passed is unrestorable the moment
///    it is read. Expired snapshots are deleted LAZILY on the
///    next trash-panel load.
///  - A restore CONSUMES its snapshot: the manifest flips to
///    "restored" and can never restore again.
///  - Clearing again while an ACTIVE trash snapshot exists
///    replaces it ONLY after an explicit confirm.
library;

import 'tenancy.dart' show isoUtc, parseIso;

/// Characters per chunk doc — 400k chars stays well under the
/// 1 MiB document limit even for multi-byte text. A 154 KB live
/// backup fits in ONE chunk.
const int trashChunkChars = 400000;

/// Thirty days — the trash lifetime.
const Duration trashTtl = Duration(days: 30);

class TrashChunk {
  final int index;
  final String data;
  const TrashChunk({required this.index, required this.data});
}

/// Split a backup JSON string into ordered chunk docs. An empty
/// input still yields one empty chunk — a zero-chunk envelope
/// would be unrestorable.
List<TrashChunk> chunkBackupJson(String json) {
  final out = <TrashChunk>[];
  var index = 0;
  for (var i = 0; i < json.length; i += trashChunkChars, index++) {
    final end = (i + trashChunkChars < json.length) ? i + trashChunkChars : json.length;
    out.add(TrashChunk(index: index, data: json.substring(i, end)));
  }
  if (out.isEmpty) out.add(const TrashChunk(index: 0, data: ''));
  return out;
}

/// Reassemble chunk docs into the backup JSON string. Chunks
/// are sorted by index (document return order is meaningless),
/// and a gap, a duplicate index, or a TRUNCATED tail is
/// corruption — the reassembler refuses rather than handing a
/// spliced file to verification. The manifest's chunkCount is
/// the tail check: pass it whenever it is known (the restore
/// path reads the manifest first, by construction).
String? reassembleChunks(List<TrashChunk> chunks, [int? expectedCount]) {
  if (chunks.isEmpty) return null;
  if (expectedCount != null && chunks.length != expectedCount) return null;
  final sorted = [...chunks]..sort((a, b) => a.index.compareTo(b.index));
  for (var i = 0; i < sorted.length; i++) {
    if (sorted[i].index != i) return null;
  }
  return sorted.map((c) => c.data).join();
}

String trashExpiresAt(String clearedAtISO) {
  try {
    return isoUtc(parseIso(clearedAtISO).add(trashTtl));
  } catch (_) {
    return clearedAtISO;
  }
}

class TrashManifest {
  final String trashId;
  final String businessId;
  final String source; // "clear"
  final String clearedAt;
  final String expiresAt;
  final String status; // active | restored | deleted
  /// The G6 backup manifest's counts, copied verbatim.
  final Map<String, int> counts;
  final int totalDocs;
  final int journalCount;
  final String journalFingerprint;
  final int chunkCount;
  final int jsonLength;
  final String? replacedTrashId;
  const TrashManifest({
    required this.trashId,
    required this.businessId,
    required this.source,
    required this.clearedAt,
    required this.expiresAt,
    required this.status,
    required this.counts,
    required this.totalDocs,
    required this.journalCount,
    required this.journalFingerprint,
    required this.chunkCount,
    required this.jsonLength,
    required this.replacedTrashId,
  });

  factory TrashManifest.fromMap(Map<String, dynamic> m) {
    int intOf(Object? v) => v is num ? v.toInt() : 0;
    String strOf(Object? v) => v?.toString() ?? '';
    final rawCounts = m['counts'];
    final counts = <String, int>{};
    if (rawCounts is Map) {
      rawCounts.forEach((k, v) => counts[k.toString()] = intOf(v));
    }
    return TrashManifest(
      trashId: strOf(m['trashId']),
      businessId: strOf(m['businessId']),
      source: strOf(m['source']),
      clearedAt: strOf(m['clearedAt']),
      expiresAt: strOf(m['expiresAt']),
      status: strOf(m['status']),
      counts: counts,
      totalDocs: intOf(m['totalDocs']),
      journalCount: intOf(m['journalCount']),
      journalFingerprint: strOf(m['journalFingerprint']),
      chunkCount: intOf(m['chunkCount']),
      jsonLength: intOf(m['jsonLength']),
      replacedTrashId: m['replacedTrashId'] == null ? null : strOf(m['replacedTrashId']),
    );
  }

  Map<String, dynamic> toMap() => {
        'trashId': trashId,
        'businessId': businessId,
        'source': source,
        'clearedAt': clearedAt,
        'expiresAt': expiresAt,
        'status': status,
        'counts': counts,
        'totalDocs': totalDocs,
        'journalCount': journalCount,
        'journalFingerprint': journalFingerprint,
        'chunkCount': chunkCount,
        'jsonLength': jsonLength,
        'replacedTrashId': replacedTrashId,
      };
}

/// Build a trash manifest from a verified backup's manifest
/// fields + the clear act's facts. Counts/fingerprint come from
/// the backup's own manifest — never recomputed here, so the
/// panel and the file cannot disagree.
({TrashManifest manifest, String json, List<TrashChunk> chunks}) trashManifestFor({
  required String trashId,
  required String businessId,
  required Map<String, int> counts,
  required int totalDocs,
  required int journalCount,
  required String journalFingerprint,
  required String json,
  required String clearedAtISO,
  String? replacedTrashId,
}) {
  final chunks = chunkBackupJson(json);
  final manifest = TrashManifest(
    trashId: trashId,
    businessId: businessId,
    source: 'clear',
    clearedAt: clearedAtISO,
    expiresAt: trashExpiresAt(clearedAtISO),
    status: 'active',
    counts: Map<String, int>.from(counts),
    totalDocs: totalDocs,
    journalCount: journalCount,
    journalFingerprint: journalFingerprint,
    chunkCount: chunks.length,
    jsonLength: json.length,
    replacedTrashId: replacedTrashId,
  );
  return (manifest: manifest, json: json, chunks: chunks);
}

/// The trash panel's read-time state: "expired" is DERIVED,
/// never stored — a snapshot whose clock ran out is
/// unrestorable the moment it is read, with no writer needed
/// to mark it.
String trashPanelState(TrashManifest manifest, String nowISO) {
  if (manifest.status == 'restored') return 'restored';
  if (manifest.status == 'deleted') return 'deleted';
  try {
    if (parseIso(nowISO).isAfter(parseIso(manifest.expiresAt))) return 'expired';
  } catch (_) {
    // Unparseable clocks: treat as not-expired, same as the web
    // (NaN comparisons are false there).
  }
  return 'active';
}

/// The only state from which a restore may start.
bool canRestoreFromTrash(TrashManifest manifest, String nowISO) =>
    trashPanelState(manifest, nowISO) == 'active';

/// Whether the panel must warn before this clear: an ACTIVE
/// snapshot already exists and would be replaced (lost).
TrashManifest? clearReplacesTrash(List<TrashManifest> existing, String nowISO) {
  for (final m in existing) {
    if (trashPanelState(m, nowISO) == 'active') return m;
  }
  return null;
}

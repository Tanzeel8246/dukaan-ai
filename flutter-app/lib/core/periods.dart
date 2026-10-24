/// Dukaan AI — period locking & PKT calendar (Dart port of
/// web/lib/periods.ts, ERP Phase A · A5).
///
/// Pakistan keeps a fixed UTC+05:00 offset year-round (no DST), so
/// PKT calendar arithmetic is exact with a constant offset. An
/// entry's business instant is its `ts`; its business DATE is the
/// Asia/Karachi calendar date of that instant, stamped as `dateISO`
/// at posting time by [preparePosting].
import 'types.dart';

const int pktOffsetMs = 5 * 60 * 60 * 1000;
const int _dayMs = 86400000;

/// Thrown by the posting guard when an entry's business instant
/// falls on or before `lockedThrough` (code: "period-locked").
class PeriodLockedError implements Exception {
  final String code = 'period-locked';
  final String lockedThrough;
  PeriodLockedError(this.lockedThrough);
  @override
  String toString() => 'Period locked through $lockedThrough: posting refused.';
}

bool isPeriodLockedError(Object? err) =>
    err is PeriodLockedError || (err is Map && err['code'] == 'period-locked');

String _pad2(int n) => n < 10 ? '0$n' : '$n';

/// Format a UTC instant as the YYYY-MM-DD calendar date it falls on
/// in Asia/Karachi.
String businessDateISO(String tsISO) {
  final t = DateTime.tryParse(tsISO);
  if (t == null) return '';
  final d = t.add(const Duration(milliseconds: pktOffsetMs)).toUtc();
  return '${d.year}-${_pad2(d.month)}-${_pad2(d.day)}';
}

/// Today's Asia/Karachi calendar date (YYYY-MM-DD).
String todayPktISO([DateTime? now]) =>
    businessDateISO((now ?? DateTime.now()).toUtc().toIso8601String());

final _dateRe = RegExp(r'^\d{4}-\d{2}-\d{2}$');

bool isValidDateISO(String s) {
  if (!_dateRe.hasMatch(s)) return false;
  final parts = s.split('-').map(int.parse).toList();
  final y = parts[0], m = parts[1], d = parts[2];
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  final dt = DateTime.utc(y, m, d);
  return dt.year == y && dt.month == m && dt.day == d;
}

/// Add whole days to a YYYY-MM-DD date (pure calendar arithmetic).
String addDaysISO(String dateISO, int days) {
  final parts = dateISO.split('-').map(int.parse).toList();
  final dt = DateTime.fromMillisecondsSinceEpoch(
      DateTime.utc(parts[0], parts[1], parts[2]).millisecondsSinceEpoch + days * _dayMs,
      isUtc: true);
  return '${dt.year}-${_pad2(dt.month)}-${_pad2(dt.day)}';
}

/// The age, in whole PKT business days, of a row stamped at
/// [tsISO] relative to the business day [todayISO] — the DERIVED
/// dayOffset (Fix Round 1 · F3, mirroring web/lib/periods). A
/// row's stored `dayOffset` is written once, at creation, as 0
/// and never recomputed, so every `dayOffset == 0` consumer
/// silently widens with each passing day; the row's `ts` never
/// moves, so the effective offset is derived from it at load.
/// Floor 0; an unparseable `ts` keeps [fallback].
int dayOffsetForTs(String tsISO, String todayISO, [int fallback = 0]) {
  final date = businessDateISO(tsISO);
  if (date.isEmpty || !isValidDateISO(todayISO)) return fallback;
  final a = DateTime.tryParse('${todayISO}T00:00:00.000Z');
  final b = DateTime.tryParse('${date}T00:00:00.000Z');
  if (a == null || b == null) return fallback;
  final days = (a.millisecondsSinceEpoch - b.millisecondsSinceEpoch) ~/ _dayMs;
  return days < 0 ? 0 : days;
}

/// The instant a PKT business date begins: 00:00:00.000 PKT.
String startOfDayPktInstant(String dateISO) {
  final parts = dateISO.split('-').map(int.parse).toList();
  return DateTime.fromMillisecondsSinceEpoch(
          DateTime.utc(parts[0], parts[1], parts[2]).millisecondsSinceEpoch - pktOffsetMs,
          isUtc: true)
      .toIso8601String();
}

/// The instant a PKT business date ends: 23:59:59.999 PKT.
String endOfDayPktInstant(String dateISO) {
  final parts = dateISO.split('-').map(int.parse).toList();
  return DateTime.fromMillisecondsSinceEpoch(
          DateTime.utc(parts[0], parts[1], parts[2]).millisecondsSinceEpoch - pktOffsetMs + _dayMs - 1,
          isUtc: true)
      .toIso8601String();
}

/// The PKT date whose END is the given lock instant. "" when unlocked.
String lockedThroughDate(String? lockedThrough) {
  if (lockedThrough == null || lockedThrough.isEmpty) return '';
  return businessDateISO(lockedThrough);
}

/* ---------------- the lock guard ---------------- */

/// Is a posting whose business instant is `instantISO` refused under
/// this lock? (Lexicographic comparison is sound for UTC ISO-8601.)
bool isPeriodLocked(String? lockedThrough, String instantISO) {
  if (lockedThrough == null || lockedThrough.isEmpty) return false;
  return instantISO.compareTo(lockedThrough) <= 0;
}

void assertPeriodOpen(String? lockedThrough, String instantISO) {
  if (isPeriodLocked(lockedThrough, instantISO)) {
    throw PeriodLockedError(lockedThrough!);
  }
}

/// Stamp an entry's business date (`dateISO`, derived from its `ts`)
/// if it does not carry one, and run the lock guard against its
/// `ts`. Called on EVERY posting at the store's choke point, so a
/// new entry can neither reach Firestore nor local state unstamped
/// or backdated into a closed period. Returns the stamped entry.
JournalEntry preparePosting(JournalEntry entry, String? lockedThrough) {
  final stamped = entry.dateISO == null || entry.dateISO!.isEmpty
      ? entry.copyWith(dateISO: businessDateISO(entry.ts))
      : entry;
  assertPeriodOpen(lockedThrough, stamped.ts);
  return stamped;
}

/* ---------------- close rail ---------------- */

/// The latest date a period may be closed through, right now
/// (the day before yesterday, PKT — offline backlogs must never be
/// stranded inside a fresh lock).
String maxClosableDateISO([DateTime? now]) => addDaysISO(todayPktISO(now), -2);

bool canCloseThroughDate(String dateISO, [DateTime? now]) {
  if (!isValidDateISO(dateISO)) return false;
  return dateISO.compareTo(maxClosableDateISO(now)) <= 0;
}

/* ---------------- fiscal year ---------------- */

({int month, int day}) fiscalStartOf(ShopSettingsView? settings) {
  final month = settings?.fiscalYearStartMonth ?? 7;
  final day = settings?.fiscalYearStartDay ?? 1;
  return (
    month: (month >= 1 && month <= 12) ? month : 7,
    day: (day >= 1 && day <= 31) ? day : 1,
  );
}

int _daysInMonth(int year, int month1to12) => DateTime.utc(year, month1to12 + 1, 0).day;

String fiscalStartDateInYear(({int month, int day}) start, int year) {
  final dim = _daysInMonth(year, start.month);
  final day = start.day < dim ? start.day : dim;
  return '$year-${_pad2(start.month)}-${_pad2(day)}';
}

class FiscalYearRange {
  final String startDate;
  final String endDate;
  final String fromTs;
  final String toTs;
  const FiscalYearRange(this.startDate, this.endDate, this.fromTs, this.toTs);
}

FiscalYearRange _rangeOf(({int month, int day}) start, int startYear) {
  final startDate = fiscalStartDateInYear(start, startYear);
  final nextStart = fiscalStartDateInYear(start, startYear + 1);
  final endDate = addDaysISO(nextStart, -1);
  return FiscalYearRange(startDate, endDate, startOfDayPktInstant(startDate), startOfDayPktInstant(nextStart));
}

/// The fiscal year containing the given instant (by its PKT date).
FiscalYearRange fiscalYearRange(ShopSettingsView? settings, String instantISO) {
  final start = fiscalStartOf(settings);
  final bizDate = businessDateISO(instantISO);
  final year = int.parse(bizDate.substring(0, 4));
  final thisYearsStart = fiscalStartDateInYear(start, year);
  return _rangeOf(start, bizDate.compareTo(thisYearsStart) >= 0 ? year : year - 1);
}

/// F-5 correction dating: when the period containing the ORIGINAL
/// posting — or the target date — is locked, the corrected entry
/// posts TODAY at the current instant; otherwise it keeps the
/// target's dating. History is never rewritten into a locked period.
({String ts, int dayOffset}) correctionDating(
  String? lockedThrough,
  String originalTs,
  String targetTs,
  int targetDayOffset,
  String nowTs,
) {
  if (isPeriodLocked(lockedThrough, originalTs) || isPeriodLocked(lockedThrough, targetTs)) {
    return (ts: nowTs, dayOffset: 0);
  }
  return (ts: targetTs, dayOffset: targetDayOffset);
}

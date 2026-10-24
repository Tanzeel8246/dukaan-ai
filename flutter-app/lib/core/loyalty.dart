/// Dukaan AI — customer loyalty (Dart port of web/lib/loyalty.ts,
/// ERP Phase H · H2; doctrine: Phase H design §1).
///
/// Points are a LIABILITY the shop owes its customers, so points
/// move only as journal entries through the one guarded choke
/// point — there is no points counter on the customer doc, no
/// side ledger, no stored balance anywhere. The journal carries
/// RUPEES; points are a DERIVED view folded from entry payloads
/// (the earn entry's `points` + `rsPerPoint` snapshot, the bill
/// entry's `loyaltyPointsUsed`, return/void entries'
/// `loyaltyPointsReturned`, expiry entries' `points`).
///
///  - Earn (bill finalize): Dr `expense_loyalty` / Cr
///    `loyalty_payable` (ref = customerId) — the cost of the
///    promise recognised in the period that made the sale.
///  - Redeem: a Dr `loyalty_payable` leg INSIDE the bill's own
///    entry, beside the money legs — a payment method, so the
///    Phase B void/return mirrors reverse it automatically.
///  - Return: the points leg re-credits proportionally (points
///    come back as points, never cash) + a clawback companion
///    (`loyalty_earn`, negative points) taking back the earn on
///    what came back, floored in the customer's favour.
///  - Expiry: a derived due-list + owner-posted release entries
///    (Dr `loyalty_payable` / Cr `expense_loyalty`) — a cost
///    release, never revenue; no scheduler exists or is faked.
///
/// The audit identities this module exists to keep true (asserted
/// by the H2 suites at every lifecycle step, against fixtures the
/// web functions themselves computed):
///    GL(loyalty_payable) ≡ Σ per-customer rupee positions
///    per-customer Rs ≡ Σ unspent vintage points × snapshot rates
/// Both hold by construction: every composer's rupee figure is
/// computed BY the fold below, never beside it.
///
/// Consumption is FIFO by vintage; a return RESTORES the source
/// bill's consumption in reverse (LIFO) — allocations are a fold
/// computation over dated entries, never a stored allocation.
library;

import 'ledger.dart' show accountNormalBalance, makeEntry, roundPaisa;
import 'periods.dart' show addDaysISO, businessDateISO;
import 'types.dart';

/// Round to the paisa — the ledger's discipline (== web round2).
double _round2(double n) => roundPaisa(n);

/* ------------------------------------------------------------------ */
/* Settings (design §1.7 + Q1 defaults)                                */
/* ------------------------------------------------------------------ */

class ResolvedLoyaltySettings {
  final bool enabled;
  /// Rupees of net payable that earn one point (pre-multiplier).
  final double earnRsPerPointBase;
  /// Rupees one point is worth at redemption.
  final double pointValueRs;
  /// Max share of a bill's net payable payable in points, %.
  final double redeemCapPct;
  /// Months after earning at which a vintage expires.
  final double expiryMonths;
  final double silverAt;
  final double goldAt;
  final double silverMult;
  final double goldMult;
  const ResolvedLoyaltySettings({
    required this.enabled,
    required this.earnRsPerPointBase,
    required this.pointValueRs,
    required this.redeemCapPct,
    required this.expiryMonths,
    required this.silverAt,
    required this.goldAt,
    required this.silverMult,
    required this.goldMult,
  });

  Map<String, dynamic> toJson() => {
        'enabled': enabled,
        'earnRsPerPointBase': earnRsPerPointBase,
        'pointValueRs': pointValueRs,
        'redeemCapPct': redeemCapPct,
        'expiryMonths': expiryMonths,
        'silverAt': silverAt,
        'goldAt': goldAt,
        'silverMult': silverMult,
        'goldMult': goldMult,
      };
}

/// The design's proposed defaults (Q1) — commercial figures the
/// owner tunes per shop in Settings; composers read ONLY the
/// resolved object, never these literals.
const ResolvedLoyaltySettings loyaltyDefaults = ResolvedLoyaltySettings(
  enabled: false,
  earnRsPerPointBase: 100,
  pointValueRs: 1,
  redeemCapPct: 50,
  expiryMonths: 12,
  silverAt: 500,
  goldAt: 2000,
  silverMult: 1.25,
  goldMult: 1.5,
);

double? _num(Object? v) => v is num ? v.toDouble() : null;

double _posOr(Object? value, double fallback) {
  final v = _num(value);
  return (v != null && v.isFinite && v > 0) ? v : fallback;
}

double _multOr(Object? value, double fallback) {
  final v = _num(value);
  return (v != null && v.isFinite && v >= 1) ? v : fallback;
}

/// The single interpretation seam for the programme's terms —
/// every surface and composer reads terms through here, so an
/// absent or malformed settings block degrades to the defaults
/// field by field (the E-era resolver discipline). Absent block
/// ⇒ programme OFF: a shop starts earning only when its owner
/// switches the programme on. `settings` is the owner-doc
/// settings map (the block rides under its `loyalty` key), as on
/// the web.
ResolvedLoyaltySettings resolveLoyaltySettings(Map<String, dynamic>? settings) {
  final raw = settings?['loyalty'];
  final Map<String, dynamic> s = raw is Map ? Map<String, dynamic>.from(raw) : const {};
  const d = loyaltyDefaults;
  final cap = _num(s['redeemCapPct']);
  return ResolvedLoyaltySettings(
    enabled: s['enabled'] == true,
    earnRsPerPointBase: _posOr(s['earnRsPerPointBase'], d.earnRsPerPointBase),
    pointValueRs: _posOr(s['pointValueRs'], d.pointValueRs),
    redeemCapPct: (cap != null && cap.isFinite)
        ? (cap > 100 ? 100.0 : (cap < 0 ? 0.0 : cap))
        : d.redeemCapPct,
    expiryMonths: _posOr(s['expiryMonths'], d.expiryMonths),
    silverAt: _posOr(s['silverAt'], d.silverAt),
    goldAt: _posOr(s['goldAt'], d.goldAt),
    silverMult: _multOr(s['silverMult'], d.silverMult),
    goldMult: _multOr(s['goldMult'], d.goldMult),
  );
}

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

String _p2(int n) => n.toString().padLeft(2, '0');

/// Add calendar months to a YYYY-MM-DD date (UTC arithmetic; the
/// day clamps to the target month's length).
String addMonthsISO(String dateISO, int months) {
  final parts = dateISO.split('-').map(int.parse).toList();
  final y = parts[0], m = parts[1], d = parts[2];
  final total = (m - 1) + months;
  final ny = y + (total / 12).floor();
  final nm = (total % 12) + 1;
  final lastDay = DateTime.utc(ny, nm + 1, 0).day;
  final nd = d < lastDay ? d : lastDay;
  return '$ny-${_p2(nm)}-${_p2(nd)}';
}

/// The instant exactly `months` calendar months before `ts`
/// (JS setUTCMonth semantics: the day rolls over the same way).
String _monthsBeforeInstant(String ts, int months) {
  final d = DateTime.parse(ts).toUtc();
  return DateTime.utc(d.year, d.month - months, d.day, d.hour, d.minute,
          d.second, d.millisecond, d.microsecond)
      .toIso8601String();
}

/* ------------------------------------------------------------------ */
/* Entry plumbing                                                      */
/* ------------------------------------------------------------------ */

/// The customer a loyalty-bearing entry belongs to: the ref on
/// its `loyalty_payable` line (every programme posting refs its
/// customer there — earn, redeem leg, re-credit, clawback,
/// expiry). Null for entries with no loyalty content.
String? loyaltyEntryCustomerId(JournalEntry e) {
  for (final l in e.lines) {
    if (l.account == 'loyalty_payable' && l.ref != null) return l.ref;
  }
  return null;
}

/// Rupee movement of `loyalty_payable` for one customer inside
/// one entry, stated as liability change (credit − debit).
double _entryLiabilityDelta(JournalEntry e, String customerId) {
  var d = 0.0;
  for (final l in e.lines) {
    if (l.account == 'loyalty_payable' && (l.ref ?? null) == customerId) {
      d += l.credit - l.debit;
    }
  }
  return d;
}

/// One customer's loyalty_payable subledger balance (credit
/// side): what the shop owes them, in rupees, straight off the
/// journal — the `salary_payable` per-employee pattern.
double customerLoyaltyRupees(List<JournalEntry> entries, String customerId) {
  var bal = 0.0;
  for (final e in entries) {
    bal += _entryLiabilityDelta(e, customerId);
  }
  return _round2(bal);
}

/// GL(loyalty_payable) ≡ Σ per-customer positions: every
/// programme line is customer-ref'd, so the two are one fold.
Map<String, double> loyaltyRupeesByCustomer(List<JournalEntry> entries) {
  final out = <String, double>{};
  for (final e in entries) {
    for (final l in e.lines) {
      if (l.account != 'loyalty_payable' || l.ref == null) continue;
      out[l.ref!] = _round2((out[l.ref!] ?? 0) + (l.credit - l.debit));
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* The vintage fold (design §1.3)                                      */
/* ------------------------------------------------------------------ */

class LoyaltyVintage {
  /// The earn entry that created this vintage.
  final String earnEntryId;
  /// The bill the points were earned on (the earn's refId).
  final String? billId;
  /// Business date the points were earned (PKT).
  final String earnedOnISO;
  /// Business date the unspent remainder expires (snapshotted
  /// horizon from the earn entry). Due when today >= this date.
  final String expiresOnISO;
  /// The point's rupee value, snapshotted at earn time.
  final double rsPerPoint;
  final int pointsGranted;
  /// Consumed by bill redemptions (net of return restores).
  final int pointsRedeemed;
  /// Taken back by clawbacks against the source bill. May exceed
  /// the unspent remainder — the excess is a points debt riding
  /// this vintage (pointsUnspent goes negative, by design).
  final int pointsClawed;
  /// Released by posted expiry entries.
  final int pointsExpired;
  /// granted − redeemed − clawed − expired.
  final int pointsUnspent;
  /// pointsUnspent × rsPerPoint — the vintage's live liability.
  final double rsUnspent;
  const LoyaltyVintage({
    required this.earnEntryId,
    required this.billId,
    required this.earnedOnISO,
    required this.expiresOnISO,
    required this.rsPerPoint,
    required this.pointsGranted,
    required this.pointsRedeemed,
    required this.pointsClawed,
    required this.pointsExpired,
    required this.pointsUnspent,
    required this.rsUnspent,
  });

  Map<String, dynamic> toJson() => {
        'earnEntryId': earnEntryId,
        'billId': billId,
        'earnedOnISO': earnedOnISO,
        'expiresOnISO': expiresOnISO,
        'rsPerPoint': rsPerPoint,
        'pointsGranted': pointsGranted,
        'pointsRedeemed': pointsRedeemed,
        'pointsClawed': pointsClawed,
        'pointsExpired': pointsExpired,
        'pointsUnspent': pointsUnspent,
        'rsUnspent': rsUnspent,
      };
}

/// One allocation of a bill's redemption against one vintage —
/// the restore computation's memory (fold state, never stored).
class _Alloc {
  final String billId;
  final int points;
  int restored;
  _Alloc(this.billId, this.points, this.restored);
}

class _VintageState {
  final String earnEntryId;
  final String? billId;
  final String earnedOnISO;
  final String expiresOnISO;
  final double rsPerPoint;
  final int pointsGranted;
  int pointsRedeemed = 0;
  int pointsClawed = 0;
  int pointsExpired = 0;
  final List<_Alloc> allocations = [];
  _VintageState({
    required this.earnEntryId,
    required this.billId,
    required this.earnedOnISO,
    required this.expiresOnISO,
    required this.rsPerPoint,
    required this.pointsGranted,
  });
  int get pointsUnspent =>
      pointsGranted - pointsRedeemed - pointsClawed - pointsExpired;
  double get rsUnspent => _round2(pointsUnspent * rsPerPoint);
  LoyaltyVintage toVintage() => LoyaltyVintage(
        earnEntryId: earnEntryId,
        billId: billId,
        earnedOnISO: earnedOnISO,
        expiresOnISO: expiresOnISO,
        rsPerPoint: rsPerPoint,
        pointsGranted: pointsGranted,
        pointsRedeemed: pointsRedeemed,
        pointsClawed: pointsClawed,
        pointsExpired: pointsExpired,
        pointsUnspent: pointsUnspent,
        rsUnspent: rsUnspent,
      );
}

/// Replay one customer's loyalty history into vintages. Pure fold
/// over the journal in posting order (ts, then journal order —
/// the store appends chronologically, and equal instants keep
/// their append order; the sort below is stabilised by index
/// because Dart's List.sort is not stable).
List<_VintageState> _foldVintages(List<JournalEntry> entries, String customerId) {
  final indexed = <(JournalEntry, int)>[
    for (var i = 0; i < entries.length; i++) (entries[i], i),
  ]..retainWhere((p) => loyaltyEntryCustomerId(p.$1) == customerId);
  indexed.sort((a, b) {
    final c = a.$1.ts.compareTo(b.$1.ts);
    return c != 0 ? c : a.$2.compareTo(b.$2);
  });
  final ordered = indexed.map((p) => p.$1).toList();
  final vintages = <_VintageState>[];
  // Per-bill consumption stacks, in consumption order. Each
  // record is the SAME object the owning vintage's `allocations`
  // holds, so a restore updates both views at once.
  final byBillConsumption = <String, List<({_VintageState v, _Alloc rec})>>{};
  for (final e in ordered) {
    if (e.refType == 'loyalty_earn' && (e.points ?? 0) > 0) {
      final earnedOnISO = e.dateISO ?? businessDateISO(e.ts);
      final months = e.loyaltyExpiryMonths ?? loyaltyDefaults.expiryMonths.toInt();
      vintages.add(_VintageState(
        earnEntryId: e.id,
        billId: e.refId,
        earnedOnISO: earnedOnISO,
        expiresOnISO: addMonthsISO(earnedOnISO, months),
        rsPerPoint: e.rsPerPoint ?? loyaltyDefaults.pointValueRs,
        pointsGranted: e.points!,
      ));
      continue;
    }
    if (e.refType == 'loyalty_earn' && (e.points ?? 0) < 0) {
      // Clawback: shrink the SOURCE bill's vintage (design §1.4).
      // Defensive fallback (a source bill with no live vintage —
      // its earn was itself reversed wholesale): shrink FIFO.
      final take = -(e.points!);
      _VintageState? target;
      for (final v in vintages) {
        if (v.billId == e.loyaltySourceBillId) {
          target = v;
          break;
        }
      }
      target ??= vintages.isEmpty ? null : vintages.first;
      if (target != null) target.pointsClawed += take;
      continue;
    }
    if ((e.loyaltyPointsUsed ?? 0) > 0 && e.refId != null) {
      // Redemption inside a bill entry: consume FIFO from
      // vintages with unspent points, recording the allocation
      // so a later return can restore it in reverse.
      var need = e.loyaltyPointsUsed!;
      final allocs = <({_VintageState v, _Alloc rec})>[];
      for (final v in vintages) {
        if (need <= 0) break;
        final avail = v.pointsGranted - v.pointsRedeemed - v.pointsClawed - v.pointsExpired;
        if (avail <= 0) continue;
        final take = avail < need ? avail : need;
        v.pointsRedeemed += take;
        need -= take;
        final rec = _Alloc(e.refId!, take, 0);
        allocs.add((v: v, rec: rec));
        v.allocations.add(rec);
      }
      byBillConsumption[e.refId!] = allocs;
      continue;
    }
    if ((e.loyaltyPointsReturned ?? 0) > 0 && e.refId != null) {
      // Return / void re-credit: un-consume the source bill's
      // allocations in REVERSE order (the mirror image of the
      // FIFO consumption that created them).
      var give = e.loyaltyPointsReturned!;
      final allocs = byBillConsumption[e.refId] ?? const [];
      for (var k = allocs.length - 1; k >= 0 && give > 0; k--) {
        final a = allocs[k];
        final can = a.rec.points - a.rec.restored;
        if (can <= 0) continue;
        final back = can < give ? can : give;
        a.rec.restored += back;
        a.v.pointsRedeemed -= back;
        give -= back;
      }
      continue;
    }
    if (e.refType == 'loyalty_expire' && (e.points ?? 0) > 0) {
      // The expiry release names its vintage by refId (the earn
      // entry's id — the composer's contract). Fallback: the
      // oldest vintage with unspent points.
      _VintageState? target;
      for (final v in vintages) {
        if (v.earnEntryId == e.refId) {
          target = v;
          break;
        }
      }
      if (target == null) {
        for (final v in vintages) {
          if (v.pointsGranted - v.pointsRedeemed - v.pointsClawed - v.pointsExpired > 0) {
            target = v;
            break;
          }
        }
      }
      if (target != null) target.pointsExpired += e.points!;
      continue;
    }
  }
  return vintages;
}

/// One customer's vintages, oldest first, fully derived.
List<LoyaltyVintage> loyaltyVintages(List<JournalEntry> entries, String customerId) =>
    _foldVintages(entries, customerId).map((v) => v.toVintage()).toList();

class CustomerLoyalty {
  final String customerId;
  /// Derived points balance: Σ unspent over vintages (a
  /// clawback-driven debt reads negative — the customer owes
  /// points back; it is shown, never hidden).
  final int points;
  /// The subledger liability in rupees (the GL view). Asserted
  /// equal to Σ vintage rsUnspent by the suites.
  final double rupees;
  /// Points a redemption may consume right now: the net balance
  /// floored at zero (debt vintages are not spendable).
  final int redeemablePoints;
  final String tier; // "standard" | "silver" | "gold"
  /// The tier's earn multiplier (the NEXT earn's speed).
  final double tierMult;
  /// Points earned in the trailing 12 months (the tier basis).
  final int earned12m;
  final List<LoyaltyVintage> vintages;
  const CustomerLoyalty({
    required this.customerId,
    required this.points,
    required this.rupees,
    required this.redeemablePoints,
    required this.tier,
    required this.tierMult,
    required this.earned12m,
    required this.vintages,
  });

  Map<String, dynamic> toJson() => {
        'customerId': customerId,
        'points': points,
        'rupees': rupees,
        'redeemablePoints': redeemablePoints,
        'tier': tier,
        'tierMult': tierMult,
        'earned12m': earned12m,
        'vintages': vintages.map((v) => v.toJson()).toList(),
      };
}

/* ------------------------------------------------------------------ */
/* Tiers (design §1.6) — standing from earning, never stored           */
/* ------------------------------------------------------------------ */

/// Points EARNED (gross positive earns) by one customer in the
/// trailing `months` before `nowISO` — the tier qualification
/// basis. Clawbacks do not un-earn history for tier purposes:
/// tier measures custom, and it buys earn speed only.
int pointsEarnedInWindow(
  List<JournalEntry> entries,
  String customerId,
  String nowISO, [
  int months = 12,
]) {
  final from = _monthsBeforeInstant(nowISO, months);
  var n = 0;
  for (final e in entries) {
    if (e.refType != 'loyalty_earn' || (e.points ?? 0) <= 0) continue;
    if (e.ts.compareTo(from) < 0 || e.ts.compareTo(nowISO) > 0) continue;
    if (loyaltyEntryCustomerId(e) == customerId) n += e.points!;
  }
  return n;
}

({String tier, double mult}) tierForEarned(int earnedPoints, ResolvedLoyaltySettings s) {
  if (earnedPoints >= s.goldAt) return (tier: 'gold', mult: s.goldMult);
  if (earnedPoints >= s.silverAt) return (tier: 'silver', mult: s.silverMult);
  return (tier: 'standard', mult: 1.0);
}

/// One customer's full derived loyalty position.
CustomerLoyalty customerLoyalty(
  List<JournalEntry> entries,
  String customerId,
  ResolvedLoyaltySettings settings,
  String nowISO,
) {
  final vintages = loyaltyVintages(entries, customerId);
  final points = vintages.fold(0, (a, v) => a + v.pointsUnspent);
  final earned12m = pointsEarnedInWindow(entries, customerId, nowISO);
  final t = tierForEarned(earned12m, settings);
  return CustomerLoyalty(
    customerId: customerId,
    points: points,
    rupees: customerLoyaltyRupees(entries, customerId),
    redeemablePoints: points > 0 ? points : 0,
    tier: t.tier,
    tierMult: t.mult,
    earned12m: earned12m,
    vintages: vintages,
  );
}

/* ------------------------------------------------------------------ */
/* Programme-wide derivations (the loyalty desk)                       */
/* ------------------------------------------------------------------ */

class LoyaltyProgrammeTotals {
  /// GL(loyalty_payable) — the balance-sheet figure.
  final double liabilityRs;
  /// Σ per-customer derived points.
  final int pointsOutstanding;
  final int customersWithBalance;
  /// Unspent points in vintages expiring within `withinDays`
  /// (and not yet due) — the desk's forward warning.
  final int expiringSoonPoints;
  final double expiringSoonRs;
  /// Vintages past expiry whose points remain unspent and
  /// unposted — shown as "expired, awaiting posting"; the
  /// liability honestly includes them until the owner posts.
  final List<LoyaltyVintage> expiredUnposted;
  final int expiredUnpostedPoints;
  final double expiredUnpostedRs;
  const LoyaltyProgrammeTotals({
    required this.liabilityRs,
    required this.pointsOutstanding,
    required this.customersWithBalance,
    required this.expiringSoonPoints,
    required this.expiringSoonRs,
    required this.expiredUnposted,
    required this.expiredUnpostedPoints,
    required this.expiredUnpostedRs,
  });

  Map<String, dynamic> toJson() => {
        'liabilityRs': liabilityRs,
        'pointsOutstanding': pointsOutstanding,
        'customersWithBalance': customersWithBalance,
        'expiringSoonPoints': expiringSoonPoints,
        'expiringSoonRs': expiringSoonRs,
        'expiredUnposted': expiredUnposted.map((v) => v.toJson()).toList(),
        'expiredUnpostedPoints': expiredUnpostedPoints,
        'expiredUnpostedRs': expiredUnpostedRs,
      };
}

List<String> loyaltyCustomerIds(List<JournalEntry> entries) =>
    loyaltyRupeesByCustomer(entries).keys.toList();

bool _isDue(LoyaltyVintage v, String todayISO) =>
    v.pointsUnspent > 0 && v.expiresOnISO.compareTo(todayISO) <= 0;

LoyaltyProgrammeTotals loyaltyProgrammeTotals(
  List<JournalEntry> entries,
  String nowISO, [
  int withinDays = 30,
]) {
  final todayISO = businessDateISO(nowISO);
  final soonDate = addDaysISO(todayISO, withinDays);
  var pointsOutstanding = 0;
  var customersWithBalance = 0;
  var expiringSoonPoints = 0;
  var expiringSoonRs = 0.0;
  final expiredUnposted = <LoyaltyVintage>[];
  for (final cid in loyaltyCustomerIds(entries)) {
    final vintages = loyaltyVintages(entries, cid);
    final pts = vintages.fold(0, (a, v) => a + v.pointsUnspent);
    pointsOutstanding += pts;
    if (pts != 0 || customerLoyaltyRupees(entries, cid) != 0) {
      customersWithBalance += 1;
    }
    for (final v in vintages) {
      if (v.pointsUnspent <= 0) continue;
      if (_isDue(v, todayISO)) {
        expiredUnposted.add(v);
      } else if (v.expiresOnISO.compareTo(soonDate) <= 0) {
        expiringSoonPoints += v.pointsUnspent;
        expiringSoonRs = _round2(expiringSoonRs + v.rsUnspent);
      }
    }
  }
  return LoyaltyProgrammeTotals(
    liabilityRs: accountNormalBalance(entries, 'loyalty_payable'),
    pointsOutstanding: pointsOutstanding,
    customersWithBalance: customersWithBalance,
    expiringSoonPoints: expiringSoonPoints,
    expiringSoonRs: expiringSoonRs,
    expiredUnposted: expiredUnposted,
    expiredUnpostedPoints: expiredUnposted.fold(0, (a, v) => a + v.pointsUnspent),
    expiredUnpostedRs: _round2(expiredUnposted.fold(0.0, (a, v) => a + v.rsUnspent)),
  );
}

/// The derived expiry due-list for one customer (or every
/// customer when null): vintages past their snapshotted expiry
/// with points still unspent — nothing here posts anything.
List<({String customerId, LoyaltyVintage vintage})> loyaltyExpiryDue(
  List<JournalEntry> entries,
  String nowISO, [
  String? customerId,
]) {
  final todayISO = businessDateISO(nowISO);
  final ids = customerId != null ? [customerId] : loyaltyCustomerIds(entries);
  final out = <({String customerId, LoyaltyVintage vintage})>[];
  for (final cid in ids) {
    for (final v in loyaltyVintages(entries, cid)) {
      if (_isDue(v, todayISO)) out.add((customerId: cid, vintage: v));
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Earn (design §1.3)                                                  */
/* ------------------------------------------------------------------ */

class LoyaltyEarnQuote {
  final int points;
  /// points × the CURRENT pointValueRs — the liability the earn
  /// entry will recognise (and snapshot).
  final double rs;
  final String tier;
  final double mult;
  const LoyaltyEarnQuote({required this.points, required this.rs, required this.tier, required this.mult});

  Map<String, dynamic> toJson() => {'points': points, 'rs': rs, 'tier': tier, 'mult': mult};
}

/// What a bill of `netPayableRs` earns for this customer right
/// now: whole points, floored, at the tier multiplier the
/// customer's trailing-12-month earning buys. Null when the
/// programme is off, or nothing is earned (a sub-base bill, a
/// zero total). Walk-in is handled by the caller.
LoyaltyEarnQuote? loyaltyEarnQuote(
  List<JournalEntry> entries,
  String customerId,
  double netPayableRs,
  ResolvedLoyaltySettings s,
  String nowISO,
) {
  if (!s.enabled || !(netPayableRs > 0)) return null;
  final earned12m = pointsEarnedInWindow(entries, customerId, nowISO);
  final t = tierForEarned(earned12m, s);
  final points = ((netPayableRs / s.earnRsPerPointBase) * t.mult).floor();
  if (points <= 0) return null;
  return LoyaltyEarnQuote(points: points, rs: _round2(points * s.pointValueRs), tier: t.tier, mult: t.mult);
}

/// Compose the earn entry for a finalized bill (design §1.1):
/// Dr `expense_loyalty` / Cr `loyalty_payable` (ref = customerId),
/// refType `loyalty_earn`, refId = the bill's id, carrying the
/// points payload + the rate / horizon / multiplier snapshots.
/// Null when the bill earns nothing. Composed by the store
/// INSIDE the bill's posting flow and written in its batch.
JournalEntry? buildLoyaltyEarnEntry({
  required List<JournalEntry> journal,
  required Bill bill,
  required ResolvedLoyaltySettings settings,
  required String ts,
  int dayOffset = 0,
}) {
  if (bill.customerId == null) return null;
  final quote = loyaltyEarnQuote(journal, bill.customerId!, bill.total, settings, ts);
  if (quote == null) return null;
  final entry = makeEntry(
    'Loyalty points earned — Bill #${bill.billNo}',
    'loyalty_earn',
    bill.id,
    [
      JournalLine(account: 'expense_loyalty', debit: quote.rs),
      JournalLine(account: 'loyalty_payable', credit: quote.rs, ref: bill.customerId),
    ],
    ts: ts,
    dayOffset: dayOffset,
  );
  return entry.copyWith(
    points: quote.points,
    rsPerPoint: settings.pointValueRs,
    loyaltyExpiryMonths: settings.expiryMonths.toInt(),
    loyaltyTierMult: quote.mult,
  );
}

/* ------------------------------------------------------------------ */
/* Redemption (design §1.3) — a tender, quoted by the fold             */
/* ------------------------------------------------------------------ */

class LoyaltyRedemptionQuote {
  /// Points the tender will consume (clamped to the redeemable
  /// balance and to the rupee cap).
  final int points;
  /// Their FIFO rupee value — the bill leg's amount.
  final double rs;
  const LoyaltyRedemptionQuote({required this.points, required this.rs});

  Map<String, dynamic> toJson() => {'points': points, 'rs': rs};
}

/// Position without the tier computation (quote paths call this
/// per keystroke; tier needs a window scan).
({int points, int redeemablePoints, List<LoyaltyVintage> vintages}) _customerLoyaltyPositionRaw(
  List<JournalEntry> entries,
  String customerId,
) {
  final vintages = loyaltyVintages(entries, customerId);
  final points = vintages.fold(0, (a, v) => a + v.pointsUnspent);
  return (points: points, redeemablePoints: points > 0 ? points : 0, vintages: vintages);
}

/// Consume `pointsWanted` FIFO over the customer's unspent
/// vintages, never past `capRs` of value: the quote the desk
/// shows and the store re-validates at posting (the tender is
/// clamped to the derived balance at composition time — never
/// typed freehand past it). Whole points only; a point whose
/// value would cross the cap is left unspent.
LoyaltyRedemptionQuote loyaltyRedemptionQuote(
  List<JournalEntry> entries,
  String customerId,
  int pointsWanted,
  double capRs,
) {
  final position = _customerLoyaltyPositionRaw(entries, customerId);
  var budget = pointsWanted < 0 ? 0 : pointsWanted;
  if (budget > position.redeemablePoints) budget = position.redeemablePoints;
  var points = 0;
  var rs = 0.0;
  for (final v in position.vintages) {
    if (budget <= 0) break;
    if (v.pointsUnspent <= 0) continue;
    var take = v.pointsUnspent < budget ? v.pointsUnspent : budget;
    while (take > 0 && _round2(rs + take * v.rsPerPoint) > capRs) {
      take -= 1;
    }
    if (take <= 0) break;
    points += take;
    rs = _round2(rs + take * v.rsPerPoint);
    budget -= take;
  }
  return LoyaltyRedemptionQuote(points: points, rs: rs);
}

/// The rupee cap a bill of `netPayableRs` imposes on a points
/// tender: redeemCapPct of the amount that leaves the customer's
/// pocket, floored to the paisa.
double loyaltyRedeemCapRs(double netPayableRs, ResolvedLoyaltySettings s) =>
    ((netPayableRs * s.redeemCapPct) / 100 * 100).floor() / 100;

/* ------------------------------------------------------------------ */
/* Returns: re-credit + clawback (design §1.1/§1.4)                    */
/* ------------------------------------------------------------------ */

/// The bill's points facts, read off its journal entry: the
/// points its tender settled and the rupee leg they carried.
({int points, double rs}) billLoyaltyTender(List<JournalEntry> entries, String billId) {
  var points = 0;
  var rs = 0.0;
  for (final e in entries) {
    if (e.refId != billId) continue;
    if ((e.loyaltyPointsUsed ?? 0) > 0) {
      points += e.loyaltyPointsUsed!;
      for (final l in e.lines) {
        if (l.account == 'loyalty_payable') rs += l.debit - l.credit;
      }
    }
  }
  return (points: points, rs: _round2(rs));
}

/// Points already re-credited against a bill by its returns /
/// void (the fold's own inputs, summed).
int billLoyaltyReturnedPoints(List<JournalEntry> entries, String billId) {
  var n = 0;
  for (final e in entries) {
    if (e.refId == billId && (e.loyaltyPointsReturned ?? 0) > 0) {
      n += e.loyaltyPointsReturned!;
    }
  }
  return n;
}

/// What a return of `refundTotalRs` (the return engine's total
/// give-back: gross − discount share + exclusive tax share)
/// re-credits on a points-paid bill: the bill's tender unwinds
/// PROPORTIONALLY — the same fraction of the tender as the
/// fraction of the bill being given back — with the completing
/// return absorbing the exact remainder. The rupee figure is the
/// fold's LIFO restore value of those points (the mirror of the
/// FIFO consumption), so the re-credit lands on the vintages it
/// came from at their own snapshot rates and the §1.3 identity
/// survives the round trip.
LoyaltyRedemptionQuote loyaltyRecreditForReturn(
  List<JournalEntry> entries,
  Bill bill,
  double refundTotalRs,
  bool completesBill,
) {
  final tender = billLoyaltyTender(entries, bill.id);
  if (tender.points <= 0 || !(bill.total > 0) || !(refundTotalRs > 0)) {
    return const LoyaltyRedemptionQuote(points: 0, rs: 0);
  }
  final already = billLoyaltyReturnedPoints(entries, bill.id);
  final remaining = tender.points - already;
  if (remaining <= 0) return const LoyaltyRedemptionQuote(points: 0, rs: 0);
  var points = completesBill
      ? remaining
      : ((tender.points * refundTotalRs) / bill.total).round();
  if (points > remaining) points = remaining;
  if (points <= 0) return const LoyaltyRedemptionQuote(points: 0, rs: 0);
  // LIFO restore value: replay the customer's fold and price the
  // un-consumption of THIS bill's allocations, newest first.
  JournalEntry? billEntry;
  for (final e in entries) {
    if (e.refId == bill.id && (e.loyaltyPointsUsed ?? 0) > 0) {
      billEntry = e;
      break;
    }
  }
  final customerId = billEntry != null ? loyaltyEntryCustomerId(billEntry) : null;
  if (customerId == null) return const LoyaltyRedemptionQuote(points: 0, rs: 0);
  final rs = _restoreValueForBill(entries, customerId, bill.id, points);
  return LoyaltyRedemptionQuote(points: points, rs: rs);
}

/// Price the restoration of `points` points of one bill's
/// consumption, unwinding its allocations newest-first at the
/// vintages' snapshot rates. Mirrors the fold's bookkeeping —
/// both read the same allocations off the same replay, so the
/// composer's figure and the fold's state can never disagree.
double _restoreValueForBill(
  List<JournalEntry> entries,
  String customerId,
  String billId,
  int points,
) {
  final state = _foldVintages(entries, customerId);
  final stack = <({_VintageState v, _Alloc rec})>[];
  for (final v in state) {
    for (final a in v.allocations) {
      if (a.billId == billId) stack.add((v: v, rec: a));
    }
  }
  var give = points;
  var rs = 0.0;
  for (var k = stack.length - 1; k >= 0 && give > 0; k--) {
    final item = stack[k];
    final can = item.rec.points - item.rec.restored;
    if (can <= 0) continue;
    final back = can < give ? can : give;
    rs = _round2(rs + back * item.v.rsPerPoint);
    give -= back;
  }
  return rs;
}

/// The bill's earn entry (the live one — never a clawback, never
/// an already-reversed earn).
JournalEntry? billLoyaltyEarnEntry(List<JournalEntry> entries, String billId) {
  final reversedIds = entries.map((e) => e.reversesId).whereType<String>().toSet();
  for (final e in entries) {
    if (e.refType == 'loyalty_earn' &&
        e.refId == billId &&
        (e.points ?? 0) > 0 &&
        !reversedIds.contains(e.id)) {
      return e;
    }
  }
  return null;
}

/// Points of a bill's earn already clawed back by its returns.
int billLoyaltyClawedPoints(List<JournalEntry> entries, String billId) {
  var n = 0;
  for (final e in entries) {
    if (e.refType == 'loyalty_earn' &&
        (e.points ?? 0) < 0 &&
        e.loyaltySourceBillId == billId) {
      n += -(e.points!);
    }
  }
  return n;
}

/// The clawback a return owes (design §1.4): the earn attributable
/// to the returned portion, computed CUMULATIVELY (the F-3
/// discipline — the share due on prior returns + this one, minus
/// what prior clawbacks already took) and FLOORED, so the paisa /
/// point remainder always stays with the customer. A completing
/// return absorbs the earn's exact remainder — a fully-returned
/// bill keeps no earn. `priorRefundedRs` is Σ prior returns'
/// total give-backs (refund + udhaar reduction + points
/// re-credit), read off the SaleReturn docs by the caller.
int loyaltyClawbackPoints({
  required List<JournalEntry> journal,
  required Bill bill,
  required double refundTotalRs,
  required double priorRefundedRs,
  required bool completesBill,
}) {
  final earn = billLoyaltyEarnEntry(journal, bill.id);
  if (earn == null || !(bill.total > 0)) return 0;
  final earnPoints = earn.points ?? 0;
  final already = billLoyaltyClawedPoints(journal, bill.id);
  final remaining = earnPoints - already;
  if (remaining <= 0) return 0;
  if (completesBill) return remaining;
  final cumulative = ((earnPoints * (priorRefundedRs + refundTotalRs)) / bill.total).floor();
  final due = cumulative - already;
  final capped = due < remaining ? due : remaining;
  return capped > 0 ? capped : 0;
}

/// Compose the clawback companion for a return (or, with the
/// full remaining points, the void's earn reversal): a
/// `loyalty_earn` entry with a NEGATIVE points payload —
/// Dr `loyalty_payable` (ref = customerId) / Cr `expense_loyalty`
/// at the ORIGINAL earn's snapshot rate, refId = the return /
/// credit note's id, `loyaltySourceBillId` naming the bill whose
/// earn it takes back. Null when nothing is owed.
JournalEntry? buildLoyaltyClawbackEntry({
  required List<JournalEntry> journal,
  required Bill bill,
  required int clawPoints,
  required String refId,
  required String memo,
  required String ts,
  int dayOffset = 0,
  String? reversesId,
}) {
  if (bill.customerId == null || !(clawPoints > 0)) return null;
  final earn = billLoyaltyEarnEntry(journal, bill.id);
  if (earn == null) return null;
  final rate = earn.rsPerPoint ?? loyaltyDefaults.pointValueRs;
  final rs = _round2(clawPoints * rate);
  if (!(rs > 0)) return null;
  final entry = makeEntry(
    memo,
    'loyalty_earn',
    refId,
    [
      JournalLine(account: 'loyalty_payable', debit: rs, ref: bill.customerId),
      JournalLine(account: 'expense_loyalty', credit: rs),
    ],
    ts: ts,
    dayOffset: dayOffset,
    reversesId: reversesId,
  );
  return entry.copyWith(points: -clawPoints, loyaltySourceBillId: bill.id);
}

/* ------------------------------------------------------------------ */
/* Expiry (design §1.5) — derived list, owner-posted                   */
/* ------------------------------------------------------------------ */

/// Compose one vintage's expiry release: Dr `loyalty_payable`
/// (ref = customerId) / Cr `expense_loyalty` for its full unspent
/// remainder at its snapshot rate — the promised cost never
/// materialised, so the original cost reverses (never revenue).
/// refType `loyalty_expire`, refId = the earn entry's id (the
/// fold's targeting contract), `points` = the expired count.
/// Null when the vintage has nothing left to release.
JournalEntry? buildLoyaltyExpiryEntry({
  required String customerId,
  required String customerName,
  required LoyaltyVintage vintage,
  required String ts,
  int dayOffset = 0,
}) {
  final v = vintage;
  if (v.pointsUnspent <= 0) return null;
  final entry = makeEntry(
    'Loyalty points expired — $customerName',
    'loyalty_expire',
    v.earnEntryId,
    [
      JournalLine(account: 'loyalty_payable', debit: v.rsUnspent, ref: customerId),
      JournalLine(account: 'expense_loyalty', credit: v.rsUnspent),
    ],
    ts: ts,
    dayOffset: dayOffset,
  );
  return entry.copyWith(points: v.pointsUnspent);
}

/* ------------------------------------------------------------------ */
/* The loyalty report (design §1.7 — joins the customers family)       */
/* ------------------------------------------------------------------ */

class LoyaltyReportRow {
  final String customerId;
  final int earnedPoints;
  final int redeemedPoints;
  final int recreditedPoints;
  final int clawedPoints;
  final int expiredPoints;
  /// Closing position at the range end (all history < toTs).
  final int points;
  final double rupees;
  const LoyaltyReportRow({
    required this.customerId,
    required this.earnedPoints,
    required this.redeemedPoints,
    required this.recreditedPoints,
    required this.clawedPoints,
    required this.expiredPoints,
    required this.points,
    required this.rupees,
  });

  Map<String, dynamic> toJson() => {
        'customerId': customerId,
        'earnedPoints': earnedPoints,
        'redeemedPoints': redeemedPoints,
        'recreditedPoints': recreditedPoints,
        'clawedPoints': clawedPoints,
        'expiredPoints': expiredPoints,
        'points': points,
        'rupees': rupees,
      };
}

class LoyaltyReport {
  final int earnedPoints;
  final double earnedRs;
  final int redeemedPoints;
  final double redeemedRs;
  final int recreditedPoints;
  final double recreditedRs;
  final int clawedPoints;
  final double clawedRs;
  final int expiredPoints;
  final double expiredRs;
  /// Closing liability at the range end (the balance-sheet view).
  final double liabilityRs;
  final int liabilityPoints;
  final List<LoyaltyReportRow> rows;
  const LoyaltyReport({
    required this.earnedPoints,
    required this.earnedRs,
    required this.redeemedPoints,
    required this.redeemedRs,
    required this.recreditedPoints,
    required this.recreditedRs,
    required this.clawedPoints,
    required this.clawedRs,
    required this.expiredPoints,
    required this.expiredRs,
    required this.liabilityRs,
    required this.liabilityPoints,
    required this.rows,
  });

  Map<String, dynamic> toJson() => {
        'earnedPoints': earnedPoints,
        'earnedRs': earnedRs,
        'redeemedPoints': redeemedPoints,
        'redeemedRs': redeemedRs,
        'recreditedPoints': recreditedPoints,
        'recreditedRs': recreditedRs,
        'clawedPoints': clawedPoints,
        'clawedRs': clawedRs,
        'expiredPoints': expiredPoints,
        'expiredRs': expiredRs,
        'liabilityRs': liabilityRs,
        'liabilityPoints': liabilityPoints,
        'rows': rows.map((r) => r.toJson()).toList(),
      };
}

class _ReportAcc {
  int earnedPoints = 0;
  int redeemedPoints = 0;
  int recreditedPoints = 0;
  int clawedPoints = 0;
  int expiredPoints = 0;
}

/// Period movement + closing positions, folded from the journal
/// alone — the same fold the desk reads, so the report can never
/// disagree with the customer card. `range` is the reports
/// layer's half-open instant window ({ fromTs, toTs }).
LoyaltyReport loyaltyReport(List<JournalEntry> entries, {required String fromTs, required String toTs}) {
  bool inRange(JournalEntry e) => e.ts.compareTo(fromTs) >= 0 && e.ts.compareTo(toTs) < 0;
  final upToEnd = entries.where((e) => e.ts.compareTo(toTs) < 0).toList();
  var earnedPoints = 0, redeemedPoints = 0, recreditedPoints = 0, clawedPoints = 0, expiredPoints = 0;
  var earnedRs = 0.0, redeemedRs = 0.0, recreditedRs = 0.0, clawedRs = 0.0, expiredRs = 0.0;
  final perCustomer = <String, _ReportAcc>{};
  _ReportAcc rowOf(String cid) => perCustomer.putIfAbsent(cid, () => _ReportAcc());
  double lineSum(JournalEntry e, String account, bool debitSide) => e.lines
      .where((l) => l.account == account)
      .fold(0.0, (a, l) => a + (debitSide ? l.debit - l.credit : l.credit - l.debit));
  for (final e in entries) {
    if (!inRange(e)) continue;
    final cid = loyaltyEntryCustomerId(e);
    if (e.refType == 'loyalty_earn' && (e.points ?? 0) > 0 && cid != null) {
      final rs = lineSum(e, 'expense_loyalty', true);
      earnedPoints += e.points!;
      earnedRs = _round2(earnedRs + rs);
      rowOf(cid).earnedPoints += e.points!;
    } else if (e.refType == 'loyalty_earn' && (e.points ?? 0) < 0 && cid != null) {
      final rs = lineSum(e, 'loyalty_payable', true);
      clawedPoints += -(e.points!);
      clawedRs = _round2(clawedRs + rs);
      rowOf(cid).clawedPoints += -(e.points!);
    } else if (e.refType == 'loyalty_expire' && (e.points ?? 0) > 0 && cid != null) {
      final rs = lineSum(e, 'loyalty_payable', true);
      expiredPoints += e.points!;
      expiredRs = _round2(expiredRs + rs);
      rowOf(cid).expiredPoints += e.points!;
    }
    if ((e.loyaltyPointsUsed ?? 0) > 0 && cid != null) {
      final rs = lineSum(e, 'loyalty_payable', true);
      redeemedPoints += e.loyaltyPointsUsed!;
      redeemedRs = _round2(redeemedRs + rs);
      rowOf(cid).redeemedPoints += e.loyaltyPointsUsed!;
    }
    if ((e.loyaltyPointsReturned ?? 0) > 0 && cid != null) {
      final rs = lineSum(e, 'loyalty_payable', false);
      recreditedPoints += e.loyaltyPointsReturned!;
      recreditedRs = _round2(recreditedRs + rs);
      rowOf(cid).recreditedPoints += e.loyaltyPointsReturned!;
    }
  }
  final rows = <LoyaltyReportRow>[];
  for (final cid in loyaltyCustomerIds(upToEnd)) {
    final pos = _customerLoyaltyPositionRaw(upToEnd, cid);
    final acc = perCustomer[cid] ?? _ReportAcc();
    rows.add(LoyaltyReportRow(
      customerId: cid,
      earnedPoints: acc.earnedPoints,
      redeemedPoints: acc.redeemedPoints,
      recreditedPoints: acc.recreditedPoints,
      clawedPoints: acc.clawedPoints,
      expiredPoints: acc.expiredPoints,
      points: pos.points,
      rupees: customerLoyaltyRupees(upToEnd, cid),
    ));
  }
  rows.sort((a, b) => a.customerId.compareTo(b.customerId));
  return LoyaltyReport(
    earnedPoints: earnedPoints,
    earnedRs: earnedRs,
    redeemedPoints: redeemedPoints,
    redeemedRs: redeemedRs,
    recreditedPoints: recreditedPoints,
    recreditedRs: recreditedRs,
    clawedPoints: clawedPoints,
    clawedRs: clawedRs,
    expiredPoints: expiredPoints,
    expiredRs: expiredRs,
    liabilityRs: accountNormalBalance(upToEnd, 'loyalty_payable'),
    liabilityPoints: rows.fold(0, (a, r) => a + r.points),
    rows: rows,
  );
}

/// Display helper for surfaces: a customer's name from the
/// directory when known, else the id (a removed customer keeps
/// his ledger — the fold never depends on the directory).
String loyaltyCustomerName(List<Customer> customers, String customerId) {
  for (final c in customers) {
    if (c.id == customerId) return c.name;
  }
  return customerId;
}

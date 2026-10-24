/// Dukaan AI — Phase G · G5 plan derivations (Dart port of
/// web/lib/plans.ts; design: ERP-PHASE-G-DESIGN §3/§4/§6).
///
/// The CATALOGUE is generated data (plans_data.dart, §5.3); what
/// lives here is the CODE the design says is ported by hand and
/// proven by shared fixtures: the derived plan state with its
/// boundary semantics, the counter arithmetic, the caps, and the
/// store guard's pre-check — expression-for-expression the TS
/// functions, asserted against harness/fixtures/g5-core.json.
///
/// Doctrine carried from the TS source:
///  - Enforcement consumes the ASSIGNMENT SNAPSHOT on the
///    businesses doc, never the live catalogue.
///  - Plan STATE is derived, never stored: a pure function of
///    the registry doc + now.
///  - A VOIDED bill keeps its count — voiding is a commercial
///    correction carried by reversing entries, never quota
///    refunds; the counter arithmetic admits no decrease except
///    the month roll.
library;

import 'plans_data.dart';
import 'tenancy.dart';

/* ------------------------------------------------------------------ */
/* Module sets (§3.3) — the PermModules, partitioned exactly once    */
/* (41 since Phase H · H1 added the Growth row's `loyalty`).         */
/* ------------------------------------------------------------------ */

const Map<String, int> tierRankTable = {'core': 1, 'standard': 2, 'advanced': 3};

int tierRankOf(String tier) => tierRankTable[tier] ?? 0;

/// Cumulative module set per tier key (the snapshot's modulesTier).
/// Phase H · H2: the Growth row (design §5.1) joins Standard and
/// Advanced exactly as web/lib/plans.ts composes MODULE_SETS.
final Map<String, List<String>> moduleSets = {
  'core': [...coreModulesData],
  'standard': [
    ...coreModulesData,
    ...documentsModulesData,
    ...operationsModulesData,
    ...growthModulesData,
  ],
  'advanced': [
    ...coreModulesData,
    ...documentsModulesData,
    ...operationsModulesData,
    ...growthModulesData,
    ...advancedModulesData,
  ],
};

bool tierIncludesModule(String tier, String module) {
  final set = moduleSets[tier];
  return set != null && set.contains(module);
}

/// The lowest tier whose set contains the module — the locked
/// door's label source.
String moduleMinTier(String module) {
  if (advancedModulesData.contains(module)) return 'advanced';
  if (documentsModulesData.contains(module) ||
      operationsModulesData.contains(module) ||
      growthModulesData.contains(module)) {
    return 'standard';
  }
  return 'core';
}

/* ------------------------------------------------------------------ */
/* The catalogue (§3.1) + assignment snapshots (§3.2)                  */
/* ------------------------------------------------------------------ */

/// Annual billing = 10 × monthly (two months free) — §3.1.
const int annualMonthsCharged = annualMonthsChargedData;

/// Build an assignment snapshot from the catalogue (design §3.2).
/// A null catalogue limit with no override stores 0 in the
/// snapshot and every consumer reads 0 as unlimited.
PlanSnapshot snapshotFor(
  String planId,
  String nowISO, {
  String? periodTo,
  bool periodToSet = false,
  int? usersLimit,
  bool usersLimitSet = false,
  int? invoiceLimit,
  bool invoiceLimitSet = false,
  required String assignedBy,
}) {
  final tier = planCatalogueData[planId]!;
  var periodToV = periodToSet ? periodTo : null;
  String? trialEndsAt;
  if (planId == 'trial') {
    trialEndsAt = isoUtc(parseIso(nowISO).add(const Duration(days: trialDays)));
    periodToV = null;
  }
  if (planId == 'founding') {
    periodToV = null;
    trialEndsAt = null;
  }
  return PlanSnapshot(
    planId: planId,
    tierRank: tier.tierRank,
    usersLimit: usersLimitSet ? (usersLimit ?? 0) : (tier.usersLimit ?? 0),
    invoiceLimit: invoiceLimitSet ? (invoiceLimit ?? 0) : (tier.invoiceLimit ?? 0),
    modulesTier: tier.modulesTier,
    periodFrom: nowISO,
    periodTo: periodToV,
    trialEndsAt: trialEndsAt,
    assignedBy: assignedBy,
    assignedAt: nowISO,
  );
}

/* ------------------------------------------------------------------ */
/* Derived plan state (§3.6) — the truth table                         */
/* ------------------------------------------------------------------ */

// PlanState values: none | trial | active | grace | readonly |
// suspended | founding.
const int graceDays = 30;

/// THE plan-state function. Pure in (registry, now); the boundary
/// semantics are: the end instant itself still belongs to the
/// period (now <= end), grace runs through end + 30 days
/// inclusive, readonly begins 1ms later. Suspension overlays
/// everything, founding never expires.
String derivePlanState(BusinessRegistryDoc? registry, String nowISO) {
  if (registry == null) return 'none';
  if (registry.status == 'suspended') return 'suspended';
  final plan = registry.plan;
  if (plan.planId == 'founding') return 'founding';
  final end = plan.periodTo ?? plan.trialEndsAt;
  if (end == null) return 'active';
  final now = parseIso(nowISO).millisecondsSinceEpoch;
  final endMs = parseIso(end).millisecondsSinceEpoch;
  if (now <= endMs) return plan.periodTo != null ? 'active' : 'trial';
  if (now <= endMs + graceDays * 86400000) return 'grace';
  return 'readonly';
}

/// States in which posting creates are allowed (§3.6's table).
bool stateAllowsPosting(String state) =>
    state == 'none' || state == 'trial' || state == 'active' || state == 'founding';

/// The RULES' plan-postable, mirrored: while the registry's
/// `enforce` is false the rules observe and pass (§6.3).
bool rulesPlanPostable(BusinessRegistryDoc? registry, String nowISO) {
  if (registry == null || registry.enforce != true) return true;
  return stateAllowsPosting(derivePlanState(registry, nowISO));
}

/* ------------------------------------------------------------------ */
/* Counter arithmetic (§4.2) — the rules' transitions, mirrored       */
/* ------------------------------------------------------------------ */

/// The counter write an INVOICE EVENT's batch carries. Trial is
/// the one special case: the trial limit is a TOTAL pool (§3.1),
/// so a trial counter never rolls. Every other plan: same PKT
/// month ⇒ +1; a new PKT month ⇒ the roll {month, 1}.
BusinessCountersDoc nextInvoiceCounter(
  BusinessCountersDoc counters,
  PlanSnapshot? plan,
  String nowISO,
) {
  if (plan?.planId == 'trial') {
    return counters.copyWith(invoiceCount: counters.invoiceCount + 1);
  }
  final month = pktMonthKey(nowISO);
  if (month == counters.invoiceMonth) {
    return counters.copyWith(invoiceCount: counters.invoiceCount + 1);
  }
  return counters.copyWith(invoiceMonth: month, invoiceCount: 1);
}

/// The counter write a SEAT event's batch carries: +1 at invite,
/// −1 (floored at 0) at removal. Invoice fields ride unchanged.
BusinessCountersDoc nextMemberCounter(BusinessCountersDoc counters, int delta) {
  final next = counters.memberCount + delta;
  return counters.copyWith(memberCount: next < 0 ? 0 : next);
}

/// The counter doc's OWN update rule, mirrored: an update is
/// legal iff it changes exactly one counter family by exactly the
/// legal arithmetic, and NOTHING else changes (baseline included).
/// kind: invoice | member-plus | member-minus.
bool counterTransitionOk(
  BusinessCountersDoc before,
  BusinessCountersDoc after,
  String kind,
) {
  final sameMember = after.memberCount == before.memberCount;
  final sameInvoice =
      after.invoiceMonth == before.invoiceMonth && after.invoiceCount == before.invoiceCount;
  final sameBaseline = after.baseline == before.baseline;
  if (!sameBaseline) return false;
  if (kind == 'invoice') {
    if (!sameMember) return false;
    if (after.invoiceMonth == before.invoiceMonth &&
        after.invoiceCount == before.invoiceCount + 1) {
      return true;
    }
    return after.invoiceMonth.compareTo(before.invoiceMonth) > 0 && after.invoiceCount == 1;
  }
  if (!sameInvoice) return false;
  return kind == 'member-plus'
      ? after.memberCount == before.memberCount + 1
      : after.memberCount == before.memberCount - 1 && after.memberCount >= 0;
}

/// The invoice-event leg, mirrored: the batch's counter write is
/// the legal invoice transition AND the resulting count does not
/// exceed the snapshot's invoiceLimit (0 = unlimited).
bool invoiceEventAllowed(
  BusinessCountersDoc before,
  BusinessCountersDoc after,
  PlanSnapshot snapshot,
) {
  if (!counterTransitionOk(before, after, 'invoice')) return false;
  if (snapshot.invoiceLimit > 0 && after.invoiceCount > snapshot.invoiceLimit) {
    return false;
  }
  return true;
}

/// The user cap, mirrored (checked on the invite-claim leg in
/// rules): seats (memberCount — the claimant's seat is already
/// counted) + the owner must fit the snapshot's usersLimit.
/// A 0/absent limit is unlimited.
bool memberCapOk(BusinessCountersDoc counters, PlanSnapshot snapshot) {
  if (snapshot.usersLimit > 0 && counters.memberCount + 1 > snapshot.usersLimit) {
    return false;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* Tier gates for posting paths (§4.1)                                 */
/* ------------------------------------------------------------------ */

/// A journal refType whose module sits above Core is tier-checked
/// against the snapshot; everything unlisted is Core.
bool refTypeTierOk(PlanSnapshot snapshot, String refType) {
  final need = refTypeMinTierData[refType];
  if (need == null) return true;
  return tierRankOf(snapshot.modulesTier) >= (tierRankTable[need] ?? 0);
}

/// Operational collections whose CREATE is tier-checked in rules
/// (§4.1's named list).
bool collectionTierOk(PlanSnapshot snapshot, String collection) {
  final need = collectionCreateTierData[collection];
  if (need == null) return true;
  return tierRankOf(snapshot.modulesTier) >= (tierRankTable[need] ?? 0);
}

/* ------------------------------------------------------------------ */
/* The client gate + observation view (§4.1/§4.2, §6.3)                */
/* ------------------------------------------------------------------ */

// PlanRefusal values: state | invoice-cap | member-cap.
class PlanGate {
  final String state;
  final bool postable;
  final String? refusal;
  final int invoiceCountAfter;
  final int invoiceLimit; // 0 = unlimited
  final int membersTotal; // seats + owner
  final int usersLimit; // 0 = unlimited
  const PlanGate({
    required this.state,
    required this.postable,
    required this.refusal,
    required this.invoiceCountAfter,
    required this.invoiceLimit,
    required this.membersTotal,
    required this.usersLimit,
  });

  Map<String, dynamic> toJson() => {
        'state': state,
        'postable': postable,
        'refusal': refusal,
        'invoiceCountAfter': invoiceCountAfter,
        'invoiceLimit': invoiceLimit,
        'membersTotal': membersTotal,
        'usersLimit': usersLimit,
      };
}

/// The store guard's pre-check (§4.2): the same derivation the
/// rules run, so a refusal is explained BEFORE the attempt. While
/// `enforce` is false nothing is refused (observation mode, §6.3).
PlanGate planGate(
  BusinessRegistryDoc? registry,
  BusinessCountersDoc? counters,
  String nowISO,
) {
  final state = derivePlanState(registry, nowISO);
  final snapshot = registry?.plan;
  final invoiceLimit = snapshot?.invoiceLimit ?? 0;
  final usersLimit = snapshot?.usersLimit ?? 0;
  final invoiceCountAfter = (counters != null && snapshot != null)
      ? nextInvoiceCounter(counters, snapshot, nowISO).invoiceCount
      : 0;
  final membersTotal = (counters?.memberCount ?? 0) + 1;
  String? refusal;
  if (registry?.enforce == true) {
    if (!stateAllowsPosting(state)) {
      refusal = 'state';
    } else if (counters != null &&
        snapshot != null &&
        !invoiceEventAllowed(counters, nextInvoiceCounter(counters, snapshot, nowISO), snapshot)) {
      refusal = 'invoice-cap';
    }
  }
  return PlanGate(
    state: state,
    postable: refusal == null,
    refusal: refusal,
    invoiceCountAfter: invoiceCountAfter,
    invoiceLimit: invoiceLimit,
    membersTotal: membersTotal,
    usersLimit: usersLimit,
  );
}

/// The observation surface's derived-actual side: the counts
/// computed from the shop's own collections, to stand next to the
/// counters they should equal. In trial, the invoice actual is
/// the pool consumed since the trial began.
({int invoiceCount, int memberCount}) deriveActualCounters(
  List<BillCountRow> bills,
  List<SaleCountRow> sales,
  List<String> staffEmails,
  PlanSnapshot? plan,
  String nowISO,
) {
  final memberCount = staffEmails.length;
  if (plan?.planId == 'trial') {
    final from = plan!.periodFrom;
    var n = 0;
    for (final b in bills) {
      if (b.status != 'held' && b.ts.compareTo(from) >= 0) n++;
    }
    for (final s in sales) {
      if (s.billId != null) continue;
      if (s.kind != null && s.kind != 'sale') continue;
      if (s.ts.compareTo(from) >= 0) n++;
    }
    return (invoiceCount: n, memberCount: memberCount);
  }
  return (
    invoiceCount: countMonthlyInvoiceEvents(bills, sales, pktMonthKey(nowISO)),
    memberCount: memberCount,
  );
}

/* ---------------- the store-facing view + refusals ---------------- */

/// What the UI consumes: the assignment snapshot, the enforcement
/// flag, the DERIVED state, and the live counters. Null outside a
/// registered cloud business (pre-G), where every plan surface
/// stays dark and every gate passes.
class PlanView {
  final PlanSnapshot snapshot;
  final bool enforce;
  final bool suspended;
  final String state;
  final BusinessCountersDoc? counters;
  const PlanView({
    required this.snapshot,
    required this.enforce,
    required this.suspended,
    required this.state,
    required this.counters,
  });
}

PlanView planViewOf(
  BusinessRegistryDoc registry,
  BusinessCountersDoc? counters,
  String nowISO,
) {
  return PlanView(
    snapshot: registry.plan,
    enforce: registry.enforce,
    suspended: registry.status == 'suspended',
    state: derivePlanState(registry, nowISO),
    counters: counters,
  );
}

/// The invoice-event pre-check (postBill / recordSale): state
/// first, then the cap, only ever under enforcement.
String? planInvoiceRefusal(
  BusinessRegistryDoc? registry,
  BusinessCountersDoc? counters,
  String nowISO,
) {
  return planGate(registry, counters, nowISO).refusal;
}

/// The member pre-check (addStaff): the prospective seat must fit
/// the cap — memberCapOk read over the counter AS THE INVITE
/// WOULD LEAVE IT. No counter doc yet: nothing refused.
String? planMemberRefusal(
  BusinessRegistryDoc? registry,
  BusinessCountersDoc? counters,
) {
  if (registry == null || registry.enforce != true || counters == null) return null;
  return memberCapOk(nextMemberCounter(counters, 1), registry.plan) ? null : 'member-cap';
}

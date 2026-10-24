/// Dukaan AI — Phase G · G5 renewal core (Dart port of
/// web/lib/renewal.ts; design: ERP-PHASE-G-DESIGN §3.4/§3.5/§3.6).
///
/// Pure functions only — the owner-side mirror of the console
/// planners: the renewal quote, the payment-submission plan, the
/// shell's lifecycle banner derivation, and the suspension-reason
/// read-back, asserted against harness/fixtures/g5-core.json.
///
/// Doctrine (invariant 6): a subscription payment is a PLATFORM
/// record. The submission plan below names exactly one platform
/// collection — never a shop path, never a journal entry; the
/// paying shop's books are untouched by its own renewal. The
/// amount is never caller-supplied: it is composed here from the
/// catalogue (§3.2).
library;

import 'plans.dart';
import 'plans_data.dart';
import 'tenancy.dart';

/* ------------------------------------------------------------------ */
/* Shapes (§1.2, from web/lib/platform.ts)                             */
/* ------------------------------------------------------------------ */

/// A renewal record (§3.5). `id` is the doc id, attached by the
/// reading client — it is not a stored field.
class PlatformPaymentDoc {
  final String? id;
  final String businessId;
  final int amount;
  final String method; // raast | jazzcash | easypaisa | bank | cash
  final String reference;
  final String periodFrom;
  final String periodTo;
  final String planId;
  final String? billingPeriod; // monthly | annual (older records predate it)
  final String state; // submitted | confirmed | rejected
  final String submittedBy;
  final String? confirmedBy;
  final String submittedAt;
  final String? confirmedAt;
  final String? note; // the admin's settlement note (owner-visible on rejection)
  final String? ownerNote;
  const PlatformPaymentDoc({
    this.id,
    required this.businessId,
    required this.amount,
    required this.method,
    required this.reference,
    required this.periodFrom,
    required this.periodTo,
    required this.planId,
    required this.billingPeriod,
    required this.state,
    required this.submittedBy,
    required this.confirmedBy,
    required this.submittedAt,
    required this.confirmedAt,
    required this.note,
    required this.ownerNote,
  });

  factory PlatformPaymentDoc.fromMap(String id, Map<String, dynamic> m) => PlatformPaymentDoc(
        id: id,
        businessId: m['businessId']?.toString() ?? '',
        amount: (m['amount'] as num?)?.toInt() ?? 0,
        method: m['method']?.toString() ?? '',
        reference: m['reference']?.toString() ?? '',
        periodFrom: m['periodFrom']?.toString() ?? '',
        periodTo: m['periodTo']?.toString() ?? '',
        planId: m['planId']?.toString() ?? '',
        billingPeriod: m['billingPeriod']?.toString(),
        state: m['state']?.toString() ?? '',
        submittedBy: m['submittedBy']?.toString() ?? '',
        confirmedBy: m['confirmedBy']?.toString(),
        submittedAt: m['submittedAt']?.toString() ?? '',
        confirmedAt: m['confirmedAt']?.toString(),
        note: m['note']?.toString(),
        ownerNote: m['ownerNote']?.toString(),
      );
}

/// Platform display data (§6.1): the payment instructions and
/// support contact the renewal surface shows shopkeepers. A
/// single doc (`platformConfig/main`); every field is display
/// text, and an empty field simply does not render.
class PlatformConfigDoc {
  final String raastNumber;
  final String iban;
  final String bankName;
  final String accountTitle;
  final String instructions;
  final String supportContact;
  final String updatedBy;
  final String updatedAt;
  const PlatformConfigDoc({
    required this.raastNumber,
    required this.iban,
    required this.bankName,
    required this.accountTitle,
    required this.instructions,
    required this.supportContact,
    required this.updatedBy,
    required this.updatedAt,
  });

  static const empty = PlatformConfigDoc(
    raastNumber: '',
    iban: '',
    bankName: '',
    accountTitle: '',
    instructions: '',
    supportContact: '',
    updatedBy: '',
    updatedAt: '',
  );

  factory PlatformConfigDoc.fromMap(Map<String, dynamic> m) => PlatformConfigDoc(
        raastNumber: m['raastNumber']?.toString() ?? '',
        iban: m['iban']?.toString() ?? '',
        bankName: m['bankName']?.toString() ?? '',
        accountTitle: m['accountTitle']?.toString() ?? '',
        instructions: m['instructions']?.toString() ?? '',
        supportContact: m['supportContact']?.toString() ?? '',
        updatedBy: m['updatedBy']?.toString() ?? '',
        updatedAt: m['updatedAt']?.toString() ?? '',
      );

  bool get hasContent => [
        raastNumber,
        iban,
        bankName,
        accountTitle,
        instructions,
        supportContact,
      ].any((v) => v.trim().isNotEmpty);
}

/* ------------------------------------------------------------------ */
/* The quote (§3.5)                                                    */
/* ------------------------------------------------------------------ */

// BillingPeriod values: monthly | annual.

/// The tiers a shopkeeper can buy from the renewal surface.
const List<String> renewablePlanIds = ['basic', 'standard', 'advanced'];

class RenewalQuote {
  final String planId;
  final String billing;
  final int months;
  final int amount;
  final String periodFrom;
  final String periodTo;
  const RenewalQuote({
    required this.planId,
    required this.billing,
    required this.months,
    required this.amount,
    required this.periodFrom,
    required this.periodTo,
  });

  Map<String, dynamic> toJson() => {
        'planId': planId,
        'billing': billing,
        'months': months,
        'amount': amount,
        'periodFrom': periodFrom,
        'periodTo': periodTo,
      };
}

class QuoteResult {
  final bool ok;
  final RenewalQuote? quote;
  final String? reason;
  const QuoteResult._({required this.ok, this.quote, this.reason});
  factory QuoteResult.success(RenewalQuote quote) => QuoteResult._(ok: true, quote: quote);
  factory QuoteResult.refusal(String reason) => QuoteResult._(ok: false, reason: reason);
}

const int _dayMs = 86400000;

/// Calendar months added in UTC, the day clamped to the target
/// month's length (Jan 31 + 1 month is Feb 28, never Mar 3).
String addMonthsISO(String iso, int months) {
  final d = parseIso(iso);
  final day = d.day;
  final base = DateTime.utc(d.year, d.month + months, 1, d.hour, d.minute, d.second, d.millisecond);
  final lastDay = DateTime.utc(base.year, base.month + 1, 0).day;
  final clamped = day < lastDay ? day : lastDay;
  return isoUtc(DateTime.utc(base.year, base.month, clamped, d.hour, d.minute, d.second, d.millisecond));
}

/// The instant a renewed period starts from (§3.5's extension
/// rule): the LATER of the current period's end and now. Founding
/// has nothing to renew — null. A dateless paid snapshot renews
/// from now rather than bricking the shop.
String? renewalPeriodStart(PlanSnapshot? plan, String nowISO) {
  if (plan == null || plan.planId == 'founding') return null;
  final end = plan.periodTo ?? plan.trialEndsAt;
  if (end == null) return nowISO;
  return parseIso(end).millisecondsSinceEpoch > parseIso(nowISO).millisecondsSinceEpoch
      ? end
      : nowISO;
}

QuoteResult renewalQuote(
  BusinessRegistryDoc? registry,
  String planId,
  String billing,
  String nowISO,
) {
  if (registry == null) return QuoteResult.refusal('no-registry');
  if (registry.plan.planId == 'founding') return QuoteResult.refusal('not-applicable');
  if (registry.plan.planId == 'enterprise') return QuoteResult.refusal('custom-plan');
  if (planId == 'enterprise') return QuoteResult.refusal('custom-plan');
  if (!renewablePlanIds.contains(planId)) return QuoteResult.refusal('not-purchasable');
  final price = planCatalogueData[planId]?.priceMonthlyPKR;
  if (price == null) return QuoteResult.refusal('custom-plan');
  final start = renewalPeriodStart(registry.plan, nowISO);
  if (start == null) return QuoteResult.refusal('not-applicable');
  final months = billing == 'annual' ? 12 : 1;
  final amount = price * (billing == 'annual' ? annualMonthsCharged : 1);
  return QuoteResult.success(RenewalQuote(
    planId: planId,
    billing: billing,
    months: months,
    amount: amount,
    periodFrom: start,
    periodTo: addMonthsISO(start, months),
  ));
}

/* ------------------------------------------------------------------ */
/* The submission (§3.5 step 2)                                        */
/* ------------------------------------------------------------------ */

class SubmissionResult {
  final bool ok;
  final String? reason;
  final List<PlatformWrite> writes;
  const SubmissionResult._({required this.ok, this.reason, required this.writes});
  factory SubmissionResult.success(List<PlatformWrite> writes) =>
      SubmissionResult._(ok: true, writes: writes);
  factory SubmissionResult.refusal(String reason) =>
      SubmissionResult._(ok: false, reason: reason, writes: const []);
}

const List<String> _paymentMethods = ['raast', 'jazzcash', 'easypaisa', 'bank', 'cash'];

/// Plan the owner's renewal submission. The write set is ONE
/// platformPayments record, born `submitted` in the owner's own
/// name — the exact shape the platformPayments rules leg admits
/// (businessId == submittedBy == the caller's uid). Submission is
/// open in every derived state — trial, active, grace, readonly —
/// and while SUSPENDED (§2.4). Founding refuses.
SubmissionResult planRenewalSubmission({
  required BusinessRegistryDoc? registry,
  required String businessId,
  required String planId,
  required String billing,
  required String method,
  required String reference,
  String? ownerNote,
  required String actor,
  required String now,
}) {
  if (registry == null) return SubmissionResult.refusal('no-registry');
  if (actor != businessId) return SubmissionResult.refusal('not-owner');
  final quote = renewalQuote(registry, planId, billing, now);
  if (!quote.ok) return SubmissionResult.refusal(quote.reason!);
  if (!_paymentMethods.contains(method)) return SubmissionResult.refusal('bad-method');
  final ref = reference.trim();
  if (ref.isEmpty) return SubmissionResult.refusal('reference-required');
  final q = quote.quote!;
  final data = <String, dynamic>{
    'businessId': businessId,
    'amount': q.amount,
    'method': method,
    'reference': ref,
    'periodFrom': q.periodFrom,
    'periodTo': q.periodTo,
    'planId': q.planId,
    'billingPeriod': billing,
    'state': 'submitted',
    'submittedBy': actor,
    'confirmedBy': null,
    'submittedAt': now,
    'confirmedAt': null,
  };
  final note = (ownerNote ?? '').trim();
  if (note.isNotEmpty) data['ownerNote'] = note;
  return SubmissionResult.success([PlatformWrite.add('platformPayments', data)]);
}

/* ------------------------------------------------------------------ */
/* The lifecycle banner (§3.4/§3.6)                                    */
/* ------------------------------------------------------------------ */

class LifecycleBanner {
  final String kind; // trial | trial-approaching | trial-urgent | grace | readonly | suspended
  final int? daysLeft;
  final int? daysElapsed;
  final int? graceLeft;
  const LifecycleBanner({required this.kind, this.daysLeft, this.daysElapsed, this.graceLeft});

  Map<String, dynamic> toJson() => {
        'kind': kind,
        if (daysLeft != null) 'daysLeft': daysLeft,
        if (daysElapsed != null) 'daysElapsed': daysElapsed,
        if (graceLeft != null) 'graceLeft': graceLeft,
      };
}

/// The shell banner's derivation — a pure function of the plan
/// view + now. State is RE-derived at the caller's instant.
/// Banners are facts, not ads: the calm states (active, founding,
/// no registry) derive null.
LifecycleBanner? lifecycleBanner(PlanView view, String nowISO) {
  final probe = BusinessRegistryDoc(
    ownerUid: '',
    ownerEmail: '',
    name: '',
    phone: '',
    city: '',
    createdAt: '',
    status: view.suspended ? 'suspended' : 'active',
    enforce: view.enforce,
    plan: view.snapshot,
  );
  final state = derivePlanState(probe, nowISO);
  final now = parseIso(nowISO).millisecondsSinceEpoch;
  if (state == 'suspended') return const LifecycleBanner(kind: 'suspended');
  if (state == 'trial') {
    final end = view.snapshot.trialEndsAt;
    if (end == null) return const LifecycleBanner(kind: 'trial', daysLeft: 0);
    final raw = (parseIso(end).millisecondsSinceEpoch - now) / _dayMs;
    final daysLeft = raw.ceil() < 0 ? 0 : raw.ceil();
    if (daysLeft <= 1) return LifecycleBanner(kind: 'trial-urgent', daysLeft: daysLeft);
    if (daysLeft <= 7) return LifecycleBanner(kind: 'trial-approaching', daysLeft: daysLeft);
    return LifecycleBanner(kind: 'trial', daysLeft: daysLeft);
  }
  if (state == 'grace') {
    final end = view.snapshot.periodTo ?? view.snapshot.trialEndsAt;
    if (end == null) {
      return const LifecycleBanner(kind: 'grace', daysElapsed: 0, graceLeft: graceDays);
    }
    final endMs = parseIso(end).millisecondsSinceEpoch;
    final elapsedRaw = (now - endMs) / _dayMs;
    final leftRaw = (endMs + graceDays * _dayMs - now) / _dayMs;
    return LifecycleBanner(
      kind: 'grace',
      daysElapsed: elapsedRaw.floor() < 0 ? 0 : elapsedRaw.floor(),
      graceLeft: leftRaw.ceil() < 0 ? 0 : leftRaw.ceil(),
    );
  }
  if (state == 'readonly') return const LifecycleBanner(kind: 'readonly');
  return null;
}

/* ------------------------------------------------------------------ */
/* The suspension reason (§2.4)                                        */
/* ------------------------------------------------------------------ */

/// The reason the shop sees on its suspension banner: the
/// recorded reason of the LATEST suspension act — unless a later
/// activation superseded it (then there is nothing to show).
String? latestSuspensionReason(List<BusinessEventDoc> events) {
  var suspendedAt = '';
  var activatedAt = '';
  String? reason;
  for (final e in events) {
    if (e.kind == 'business.suspended' && e.at.compareTo(suspendedAt) > 0) {
      suspendedAt = e.at;
      reason = e.detail['reason'] is String ? e.detail['reason'] as String : null;
    }
    if (e.kind == 'business.activated' && e.at.compareTo(activatedAt) > 0) {
      activatedAt = e.at;
    }
  }
  if (suspendedAt.isEmpty || activatedAt.compareTo(suspendedAt) > 0) return null;
  return reason;
}

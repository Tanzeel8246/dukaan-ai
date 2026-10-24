/// Dukaan AI — WhatsApp marketing (Dart port of
/// web/lib/whatsapp.ts, ERP Phase H · H5; doctrine: Phase H
/// design §3). Pure functions only — no Firebase, no store, no
/// I/O — proven against the web functions by
/// harness/fixtures/h5-core.json (test/h5_fixtures_test.dart).
///
/// Doctrine (design §3): the shop's number, the shop's
/// customers, the shop's hand. Every marketing message is sent
/// from the shop's own WhatsApp, to the shop's own opted-in
/// customers, by the shopkeeper's own action. This module is the
/// ORGANISATION of that marketing — consent, audiences, template
/// rendering, the launch plan, the queue's re-checks, the
/// suggested reminders — as pure functions over the shop's data,
/// so the fixture suite can prove the doctrine against the same
/// code the desk runs. The TRANSPORT stays the shopkeeper's
/// WhatsApp: v1 opens wa.me links by hand (§3.4), so this module
/// builds no API client and claims no delivery knowledge — the
/// send log's states are exactly the states v1 can know (§3.4),
/// and the Cloud-API tier stays parked behind the Blaze decision
/// (§3.6) with the data model already shaped for it.
///
/// Nothing here posts: marketing moves no money, so this module
/// imports no journal composer and the store gains no makeEntry
/// site for it.
library;

import 'ledger.dart' show creditLotsRemaining;
import 'loyalty.dart' show customerLoyalty, resolveLoyaltySettings;
import 'periods.dart' show addDaysISO, businessDateISO;
import 'plans.dart' show PlanView, stateAllowsPosting, tierIncludesModule;
import 'types.dart';

/* ------------------------------------------------------------------ */
/* Doc types (web/lib/types.ts — the WhatsApp family)                  */
/* ------------------------------------------------------------------ */

/// A template's kind: an offer the shop wants to broadcast
/// ("promo"), or a service reminder the data suggested
/// ("reminder", §3.5). The kind drives which placeholders make
/// sense; it gates nothing.
class WaTemplate {
  final String id;
  final String name;
  final String kind; // promo | reminder
  /** The shop's own words, with placeholders {name}, {shop},
   *  {points}, {amount} (design §3.3). Starter templates ship as
   *  dictionary strings the owner copies and edits — never
   *  locked copy. */
  final String body;
  final String createdBy;
  final String ts;
  const WaTemplate({
    required this.id,
    this.name = '',
    this.kind = 'promo',
    this.body = '',
    this.createdBy = '',
    this.ts = '',
  });
  factory WaTemplate.fromMap(String id, Map<String, dynamic> m) => WaTemplate(
        id: id,
        name: _s(m['name']),
        kind: _s(m['kind'], 'promo'),
        body: _s(m['body']),
        createdBy: _s(m['createdBy']),
        ts: _s(m['ts']),
      );
  Map<String, dynamic> toMap() => {
        'name': name,
        'kind': kind,
        'body': body,
        'createdBy': createdBy,
        'ts': ts,
      };
}

/// The segment DEFINITION a campaign sends to — never a frozen
/// list (design §3.3): the audience is re-derived live at launch
/// and re-checked per recipient at send time. Params ride as
/// nullable fields; only the kind's own params are set, and
/// toMap writes exactly the web doc's shape.
class WaAudience {
  final String kind; // all_opted_in | tier | udhaar_outstanding | points_expiring | inactive | storefront_customers | service_due
  final String? tier; // silver | gold (kind: tier)
  final double? minRs; // kind: udhaar_outstanding
  final int? minDays; // kind: udhaar_outstanding
  final int? withinDays; // kind: points_expiring
  final int? days; // kind: inactive
  const WaAudience({
    required this.kind,
    this.tier,
    this.minRs,
    this.minDays,
    this.withinDays,
    this.days,
  });
  const WaAudience.allOptedIn() : this(kind: 'all_opted_in');
  const WaAudience.tierOf(String tier) : this(kind: 'tier', tier: tier);
  const WaAudience.udhaar({required double minRs, required int minDays})
      : this(kind: 'udhaar_outstanding', minRs: minRs, minDays: minDays);
  const WaAudience.pointsExpiring({required int withinDays})
      : this(kind: 'points_expiring', withinDays: withinDays);
  const WaAudience.inactive({required int days})
      : this(kind: 'inactive', days: days);
  const WaAudience.storefrontCustomers() : this(kind: 'storefront_customers');
  const WaAudience.serviceDue() : this(kind: 'service_due');
  factory WaAudience.fromMap(Map<String, dynamic> m) => WaAudience(
        kind: _s(m['kind'], 'all_opted_in'),
        tier: _sn(m['tier']),
        minRs: m['minRs'] is num ? (m['minRs'] as num).toDouble() : null,
        minDays: m['minDays'] is num ? (m['minDays'] as num).toInt() : null,
        withinDays:
            m['withinDays'] is num ? (m['withinDays'] as num).toInt() : null,
        days: m['days'] is num ? (m['days'] as num).toInt() : null,
      );
  Map<String, dynamic> toMap() => {
        'kind': kind,
        if (tier != null) 'tier': tier,
        if (minRs != null) 'minRs': minRs,
        if (minDays != null) 'minDays': minDays,
        if (withinDays != null) 'withinDays': withinDays,
        if (days != null) 'days': days,
      };
}

class WaCampaign {
  final String id;
  final String name;
  final String templateId;
  final WaAudience audience;
  /** The audience size AT LAUNCH (the log's denominator). Null
   *  while the campaign is a draft — a draft has resolved
   *  nobody, and the desk shows the live count instead. */
  final int? resolvedCount;
  final String createdBy;
  final String ts;
  final String state; // draft | sending | done
  const WaCampaign({
    required this.id,
    this.name = '',
    this.templateId = '',
    this.audience = const WaAudience.allOptedIn(),
    this.resolvedCount,
    this.createdBy = '',
    this.ts = '',
    this.state = 'draft',
  });
  factory WaCampaign.fromMap(String id, Map<String, dynamic> m) => WaCampaign(
        id: id,
        name: _s(m['name']),
        templateId: _s(m['templateId']),
        audience: m['audience'] is Map
            ? WaAudience.fromMap(Map<String, dynamic>.from(m['audience'] as Map))
            : const WaAudience.allOptedIn(),
        resolvedCount:
            m['resolvedCount'] is num ? (m['resolvedCount'] as num).toInt() : null,
        createdBy: _s(m['createdBy']),
        ts: _s(m['ts']),
        state: _s(m['state'], 'draft'),
      );
  WaCampaign copyWith({String? state, int? resolvedCount}) => WaCampaign(
        id: id,
        name: name,
        templateId: templateId,
        audience: audience,
        resolvedCount: resolvedCount ?? this.resolvedCount,
        createdBy: createdBy,
        ts: ts,
        state: state ?? this.state,
      );
  Map<String, dynamic> toMap() => {
        'name': name,
        'templateId': templateId,
        'audience': audience.toMap(),
        'resolvedCount': resolvedCount,
        'createdBy': createdBy,
        'ts': ts,
        'state': state,
      };
}

/// One row of the send log: a FACT, not a derivation (§3.3) —
/// who was queued for what, and what the shopkeeper did.
/// `sent` means exactly "the shopkeeper confirms he sent it"
/// (§3.4): v1's transport (wa.me, by hand) cannot know delivery
/// or read state, so no such state exists in this type.
class WaSend {
  final String id;
  final String campaignId;
  final String customerId;
  /** The recipient number AS QUEUED (a snapshot — the log
   *  records where the message was aimed, even if the customer
   *  later edits their number). */
  final String phone;
  final String state; // queued | opened | sent | skipped_optout | skipped_invalid
  final String ts;
  const WaSend({
    required this.id,
    this.campaignId = '',
    this.customerId = '',
    this.phone = '',
    this.state = 'queued',
    this.ts = '',
  });
  factory WaSend.fromMap(String id, Map<String, dynamic> m) => WaSend(
        id: id,
        campaignId: _s(m['campaignId']),
        customerId: _s(m['customerId']),
        phone: _s(m['phone']),
        state: _s(m['state'], 'queued'),
        ts: _s(m['ts']),
      );
  WaSend copyWith({String? state}) => WaSend(
        id: id,
        campaignId: campaignId,
        customerId: customerId,
        phone: phone,
        state: state ?? this.state,
        ts: ts,
      );
  Map<String, dynamic> toMap() => {
        'campaignId': campaignId,
        'customerId': customerId,
        'phone': phone,
        'state': state,
        'ts': ts,
      };
}

String _s(Object? v, [String dflt = '']) => v is String ? v : dflt;
String? _sn(Object? v) => v is String ? v : null;

/* ------------------------------------------------------------------ */
/* Settings (design §3.5)                                              */
/* ------------------------------------------------------------------ */

class ResolvedWaSettings {
  /** Days after a job's delivery when a service reminder comes
   *  due. The design names the interval as a settings field and
   *  pins no number; 90 is this module's default (a quarterly
   *  service rhythm), owner-tunable in the desk. */
  final int serviceIntervalDays;
  const ResolvedWaSettings({required this.serviceIntervalDays});
}

const waDefaults = ResolvedWaSettings(serviceIntervalDays: 90);

/// The single interpretation seam for the WhatsApp settings —
/// absent/malformed degrades field-by-field to the defaults
/// (the E-era resolver discipline, as core/loyalty's). `settings`
/// is the owner-doc settings map (the block rides under its
/// `whatsapp` key), as on the web.
ResolvedWaSettings resolveWaSettings(Map<String, dynamic>? settings) {
  final raw = settings?['whatsapp'];
  final Object? v = raw is Map ? raw['serviceIntervalDays'] : null;
  return ResolvedWaSettings(
    serviceIntervalDays:
        (v is num && v.isFinite && v > 0) ? v.floor() : waDefaults.serviceIntervalDays,
  );
}

/* ------------------------------------------------------------------ */
/* Consent (design §3.2) — a field with a history, default off         */
/* ------------------------------------------------------------------ */

/// The ONLY consent question the product ever asks of a customer
/// doc: absent and false are the same answer — NO.
bool customerOptedIn(Customer c) => c.waOptIn == true;

/// The stamp a consent act writes. Granting sources are exactly
/// the two captures a customer can agree through — the counter
/// (the customer form / profile toggle) and the storefront
/// conversion (applied when the order's customer is resolved,
/// §3.2). Revocation stamps the same shape with `agreed: false`
/// and the source of the act that recorded it, so the doc always
/// says WHAT the current state is, WHEN it was set and WHERE —
/// a history of one (the latest act), never a silent flag.
Map<String, dynamic> waConsentPatch(
  String source, // "counter" | "storefront"
  bool agreed,
  String nowISO,
) =>
    {
      'waOptIn': agreed,
      'waOptInAt': nowISO,
      'waOptInSource': source,
    };

/// The import guard (design §3.2 + the §6 checkpoint): a parsed
/// import row claiming consent — a `waOptIn: "yes"` column, a
/// stray waOptInSource — comes out with EVERY consent field
/// removed. An imported customer is an unconsented customer
/// until they agree at the counter like everyone else: a bought
/// list can never launder consent through a spreadsheet, and any
/// future import path that routes its rows through here cannot
/// set the flag by construction.
Map<String, dynamic> stripImportConsent(Map<String, dynamic> row) {
  final out = Map<String, dynamic>.from(row);
  out.remove('waOptIn');
  out.remove('waOptInAt');
  out.remove('waOptInSource');
  return out;
}

/* ------------------------------------------------------------------ */
/* Phone (the house wa.me normalisation, named once)                   */
/* ------------------------------------------------------------------ */

/// Local → international digits, exactly as the bill share has
/// always composed it (BillingDesk): strip non-digits, a leading
/// 0 becomes the 92 country code.
String waIntlPhone(String phone) {
  final digits = phone.replaceAll(RegExp(r'\D'), '');
  return digits.startsWith('0') ? '92${digits.substring(1)}' : digits;
}

/// A number WhatsApp can plausibly reach: 10–15 international
/// digits (a PK mobile lands at 12). Anything shorter/longer is
/// not a recipient — the queue marks it skipped_invalid rather
/// than opening a dead chat.
bool waPhoneOk(String phone) {
  final n = waIntlPhone(phone).length;
  return n >= 10 && n <= 15;
}

/// The v1 transport link (§3.4): the product's proven wa.me
/// pattern with the rendered message pre-filled. Opening it is
/// the shopkeeper's act; nothing here sends anything.
String waMeLink(String phone, String text) =>
    'https://wa.me/${waIntlPhone(phone)}?text=${Uri.encodeComponent(text)}';

/* ------------------------------------------------------------------ */
/* Templates (design §3.3)                                             */
/* ------------------------------------------------------------------ */

/// The placeholders a template body may carry. {points} is the
/// customer's derived loyalty balance (H1 synergy); {amount} is
/// the reminder context — the customer's outstanding udhaar.
const waPlaceholders = ['name', 'shop', 'points', 'amount'];

/// Render a template body for one recipient. Known placeholders
/// substitute; an unknown {token} is left standing — the queue
/// preview shows the shopkeeper exactly what would go out, and
/// a typo'd placeholder is visible paper, not a silent gap.
/// (amount rounds to whole rupees, as JS Math.round does for the
/// non-negative amounts this context carries.)
String renderWaMessage(
  String body, {
  required String name,
  required String shop,
  required int points,
  required double amount,
}) {
  final values = <String, String>{
    'name': name,
    'shop': shop,
    'points': '$points',
    'amount': '${amount.round()}',
  };
  return body.replaceAllMapped(RegExp(r'\{(\w+)\}'), (m) {
    final key = m.group(1)!;
    return values.containsKey(key) ? values[key]! : m.group(0)!;
  });
}

/* ------------------------------------------------------------------ */
/* Audiences (design §3.3/§3.5) — definitions resolved live           */
/* ------------------------------------------------------------------ */

/// Everything an audience derivation may read. The journal is
/// the loyalty fold's input; credits are the udhaar book; bills
/// and sale orders carry activity and storefront origin; jobs
/// carry service due-ness. `settings` is the owner-doc settings
/// map (the web's ShopSettings, untyped at this boundary like
/// every Dart core reader).
class WaAudienceData {
  final List<Customer> customers;
  final List<CreditEntry> credits;
  final List<JournalEntry> journal;
  final List<Bill> bills;
  final List<SaleOrder> saleOrders;
  final List<Job> jobs;
  final Map<String, dynamic> settings;
  final String nowISO;
  const WaAudienceData({
    required this.customers,
    required this.credits,
    required this.journal,
    required this.bills,
    required this.saleOrders,
    required this.jobs,
    required this.settings,
    required this.nowISO,
  });
}

int? _parseMs(String iso) => DateTime.tryParse(iso)?.millisecondsSinceEpoch;

/// One customer's udhaar position with FIFO age — the SHARED
/// lot allocation lib/ledger's `creditLotsRemaining` runs (the
/// same one the receivables aging uses, so the two can never
/// drift apart): return/void reversals net their own bill's lot,
/// repayments retire the OLDEST open lot first; what remains
/// carries its lot's age. (Fix Round 1 · F4: this function used
/// to carry its own FIFO copy, which skipped negative reversal
/// rows exactly like the pre-fix aging did.)
({double outstanding, int oldestAgeDays}) customerUdhaarPosition(
  List<CreditEntry> credits,
  String customerId,
) {
  final rows = credits.where((c) => c.customerId == customerId).toList();
  var outstanding = 0.0;
  var oldestAgeDays = 0;
  for (final lot in creditLotsRemaining(rows)) {
    outstanding += lot.remaining;
    if (lot.dayOffset > oldestAgeDays) oldestAgeDays = lot.dayOffset;
  }
  return (outstanding: outstanding, oldestAgeDays: oldestAgeDays);
}

/// The per-kind membership test, BEFORE the consent filter —
/// exported so the desk can show "segment size vs reachable"
/// honestly (a segment of 40 with 25 opted in is two facts,
/// not one).
bool waSegmentMatches(
  WaAudience audience,
  Customer customer,
  WaAudienceData data,
) {
  switch (audience.kind) {
    case 'all_opted_in':
      return true;
    case 'tier':
      final st = resolveLoyaltySettings(data.settings);
      return customerLoyalty(data.journal, customer.id, st, data.nowISO).tier ==
          audience.tier;
    case 'udhaar_outstanding':
      final pos = customerUdhaarPosition(data.credits, customer.id);
      return pos.outstanding > 0 &&
          pos.outstanding >= (audience.minRs ?? 0) &&
          pos.oldestAgeDays >= (audience.minDays ?? 0);
    case 'points_expiring':
      final st = resolveLoyaltySettings(data.settings);
      final today = businessDateISO(data.nowISO);
      final horizon = addDaysISO(today, (audience.withinDays ?? 0) < 0 ? 0 : (audience.withinDays ?? 0));
      final pos = customerLoyalty(data.journal, customer.id, st, data.nowISO);
      return pos.vintages.any(
        (v) =>
            v.pointsUnspent > 0 &&
            v.expiresOnISO.compareTo(today) > 0 &&
            v.expiresOnISO.compareTo(horizon) <= 0,
      );
    case 'inactive':
      final nowMs = _parseMs(data.nowISO) ?? 0;
      final cutoff = nowMs - (audience.days ?? 0) * 86400000;
      int? last;
      for (final b in data.bills) {
        if (b.customerId != customer.id) continue;
        if (b.status == 'held' || b.status == 'voided') continue;
        final t = _parseMs(b.ts);
        if (t != null && (last == null || t > last)) last = t;
      }
      /* No qualifying bill at all: no bill in N days is literally
       * true — the customer is in the book but has never bought. */
      return last == null || last <= cutoff;
    case 'storefront_customers':
      return data.saleOrders
          .any((o) => o.sourceType == 'storefront' && o.customerId == customer.id);
    case 'service_due':
      final interval = resolveWaSettings(data.settings).serviceIntervalDays;
      final nowMs = _parseMs(data.nowISO) ?? 0;
      final cutoff = nowMs - interval * 86400000;
      return data.jobs.any((j) {
        if (j.customerId != customer.id || j.status != 'delivered') {
          return false;
        }
        final t = _parseMs(j.ts);
        return t != null && t <= cutoff;
      });
  }
  return false;
}

/// THE audience: the segment definition resolved live, then the
/// consent filter — every kind, no exceptions. An audience can
/// never contain a customer who has not opted in, because this
/// function is the only resolution path and the filter is its
/// last step, not each kind's courtesy. Order is the customers'
/// own (directory) order — stable and deduped by construction
/// (one pass over the customer list).
List<Customer> resolveWaAudience(WaAudience audience, WaAudienceData data) {
  return data.customers
      .where((c) => customerOptedIn(c) && waSegmentMatches(audience, c, data))
      .toList();
}

int waAudienceCount(WaAudience audience, WaAudienceData data) =>
    resolveWaAudience(audience, data).length;

/* ------------------------------------------------------------------ */
/* Launch + the send queue (design §3.4)                               */
/* ------------------------------------------------------------------ */

/// Launch materialises the send log: one `queued` row per
/// RESOLVED recipient, phones stamped from the customer docs as
/// they stand at launch (the log records where each message was
/// aimed). Resolution runs the full consent filter at launch;
/// the queue then re-checks per recipient at send time
/// (waQueueStep) — consent is asked twice because it can change
/// between the two moments, and the later answer governs.
({List<WaSend> sends, int resolvedCount}) planWaLaunch(
  WaCampaign campaign,
  WaAudienceData data,
  String Function() newId,
) {
  final recipients = resolveWaAudience(campaign.audience, data);
  final sends = <WaSend>[
    for (final c in recipients)
      WaSend(
        id: newId(),
        campaignId: campaign.id,
        customerId: c.id,
        phone: c.phone,
        state: 'queued',
        ts: data.nowISO,
      ),
  ];
  return (sends: sends, resolvedCount: recipients.length);
}

/// The per-recipient re-check the queue runs when a row's turn
/// comes (§3.2/§3.4): consent is read from the customer doc AS
/// IT STANDS NOW — a customer who opted out after launch (or
/// whose doc is gone) is excluded here, at send time, however
/// clean the launch was. The number is judged on the row's
/// stamped phone: that is the number this campaign addresses.
/// Returns "ok" | "optout" | "invalid".
String waSendRecheck(WaSend send, Customer? customer) {
  if (customer == null || !customerOptedIn(customer)) return 'optout';
  if (!waPhoneOk(send.phone)) return 'invalid';
  return 'ok';
}

class WaQueueStep {
  final WaSend send;
  /** "send" = the row is workable now; the skip outcomes are
   *  the re-check's verdicts, written to the log as the
   *  terminal skipped_* states when the shopkeeper advances. */
  final String action; // send | skip-optout | skip-invalid
  final Customer? customer;
  const WaQueueStep({required this.send, required this.action, this.customer});
}

/// The queue's head: the first non-terminal row (queued or
/// opened), in log order. `afterId` is the session cursor for
/// "skip advances without sending" (§3.4): skipping writes
/// NOTHING — the row stays queued and resurfaces at the head
/// next session, because it was never sent and the log does not
/// pretend otherwise. There is deliberately no voluntary-skip
/// state in the send states: the log records facts (sent,
/// opened, consent-gone, number-bad), not intentions.
WaQueueStep? waQueueStep(
  List<WaSend> sends,
  List<Customer> customers,
  String? afterId,
) {
  final byId = <String, Customer>{for (final c in customers) c.id: c};
  var past = afterId == null;
  for (final s in sends) {
    if (!past) {
      if (s.id == afterId) past = true;
      continue;
    }
    if (s.state != 'queued' && s.state != 'opened') continue;
    final customer = byId[s.customerId];
    final recheck = waSendRecheck(s, customer);
    return WaQueueStep(
      send: s,
      action: recheck == 'ok'
          ? 'send'
          : recheck == 'optout'
              ? 'skip-optout'
              : 'skip-invalid',
      customer: customer,
    );
  }
  return null;
}

/// One queue act, applied to a row. The re-check OVERRIDES the
/// act: a row whose recipient has opted out (or whose number is
/// bad) lands in its skipped_* state whatever button brought it
/// here — the shopkeeper's tap is recorded only when the send it
/// describes could honestly happen. "sent" is the shopkeeper's
/// own confirmation (§3.4): this function records the claim; it
/// neither makes nor verifies a delivery.
WaSend waSendTransition(
  WaSend send,
  String act, // "opened" | "sent"
  Customer? customer,
) {
  final recheck = waSendRecheck(send, customer);
  if (recheck == 'optout') return send.copyWith(state: 'skipped_optout');
  if (recheck == 'invalid') return send.copyWith(state: 'skipped_invalid');
  if (send.state == 'queued' && act == 'opened') {
    return send.copyWith(state: 'opened');
  }
  if ((send.state == 'queued' || send.state == 'opened') && act == 'sent') {
    return send.copyWith(state: 'sent');
  }
  return send;
}

class WaCampaignProgress {
  final int total;
  final int queued;
  final int opened;
  final int sent;
  final int skippedOptout;
  final int skippedInvalid;
  /** sent + both skips: rows whose story is finished. */
  final int terminal;
  /** Every row terminal (or no rows): the campaign's sending
   *  story is complete and its state may close to "done". */
  final bool complete;
  const WaCampaignProgress({
    required this.total,
    required this.queued,
    required this.opened,
    required this.sent,
    required this.skippedOptout,
    required this.skippedInvalid,
    required this.terminal,
    required this.complete,
  });
  Map<String, dynamic> toJson() => {
        'total': total,
        'queued': queued,
        'opened': opened,
        'sent': sent,
        'skippedOptout': skippedOptout,
        'skippedInvalid': skippedInvalid,
        'terminal': terminal,
        'complete': complete,
      };
}

WaCampaignProgress waCampaignProgress(List<WaSend> sends) {
  int count(String s) => sends.where((x) => x.state == s).length;
  final sent = count('sent');
  final skippedOptout = count('skipped_optout');
  final skippedInvalid = count('skipped_invalid');
  final terminal = sent + skippedOptout + skippedInvalid;
  return WaCampaignProgress(
    total: sends.length,
    queued: count('queued'),
    opened: count('opened'),
    sent: sent,
    skippedOptout: skippedOptout,
    skippedInvalid: skippedInvalid,
    terminal: terminal,
    complete: terminal == sends.length,
  );
}

/// The message the queue would put in front of this recipient:
/// the campaign's template rendered with the customer's live
/// facts — name, the shop's name, derived points, outstanding
/// udhaar (the reminder's {amount}).
String waQueueMessage(
  String templateBody,
  Customer customer,
  WaAudienceData data,
) {
  final st = resolveLoyaltySettings(data.settings);
  final points =
      customerLoyalty(data.journal, customer.id, st, data.nowISO).points;
  final amount = customerUdhaarPosition(data.credits, customer.id).outstanding;
  return renderWaMessage(
    templateBody,
    name: customer.name,
    shop: _s(data.settings['shopName']),
    points: points,
    amount: amount,
  );
}

/* ------------------------------------------------------------------ */
/* Suggested reminders (design §3.5) — counts the data offers          */
/* ------------------------------------------------------------------ */

/// The panel's windows. Named here so the copy and the counts
/// can never disagree about what "due" means this week.
const waSuggestUdhaarMinDays = 7;
const waSuggestPointsWithinDays = 7;

class WaSuggestions {
  /// Opted-in customers with udhaar outstanding ≥ 7 days.
  final int udhaarCount;
  /// Opted-in customers with points expiring within 7 days.
  final int pointsExpiringCount;
  /// Opted-in customers with a service-due delivered job.
  final int serviceDueCount;
  final int serviceIntervalDays;
  const WaSuggestions({
    required this.udhaarCount,
    required this.pointsExpiringCount,
    required this.serviceDueCount,
    required this.serviceIntervalDays,
  });
  Map<String, dynamic> toJson() => {
        'udhaarCount': udhaarCount,
        'pointsExpiringCount': pointsExpiringCount,
        'serviceDueCount': serviceDueCount,
        'serviceIntervalDays': serviceIntervalDays,
      };
}

/// Today's candidates, counts only, derived when the desk opens
/// (client-derived like plan state — §3.5). Every count runs the
/// full audience resolution, consent filter included: the panel
/// never suggests messaging someone the shop may not message.
/// Nothing here sends, queues or writes — a suggestion becomes
/// a campaign only by the shopkeeper's own launch.
WaSuggestions waSuggestedReminders(WaAudienceData data) {
  return WaSuggestions(
    udhaarCount: waAudienceCount(
      const WaAudience.udhaar(minRs: 1, minDays: waSuggestUdhaarMinDays),
      data,
    ),
    pointsExpiringCount: waAudienceCount(
      const WaAudience.pointsExpiring(withinDays: waSuggestPointsWithinDays),
      data,
    ),
    serviceDueCount: waAudienceCount(const WaAudience.serviceDue(), data),
    serviceIntervalDays: resolveWaSettings(data.settings).serviceIntervalDays,
  );
}

/* ------------------------------------------------------------------ */
/* Plan gates (design §5.1 + invariant 5)                              */
/* ------------------------------------------------------------------ */

/// The module gate, read from the business's ASSIGNMENT
/// SNAPSHOT (its modulesTier), never the live catalogue — the G
/// doctrine the store guard mirrors: a Basic-snapshot shop is
/// refused even on the day the catalogue grows the whatsapp row,
/// and a Standard snapshot keeps the module through any later
/// catalogue reshuffle. A null plan view (demo, pre-G registry-
/// less shop) gates nothing, exactly as every G surface behaves.
bool waModuleAllowed(PlanView? planView) {
  if (planView == null) return true;
  return tierIncludesModule(planView.snapshot.modulesTier, 'whatsapp');
}

/// The sending gate: module present AND the plan state postable.
/// Plan expiry degrades H's SENDING surfaces (invariant 5) —
/// in grace/readonly/suspension the desk, templates and history
/// stay fully readable (they are the shop's own records), but
/// launching and queueing stop until renewal, exactly as
/// posting stops. Reads are never gated here or anywhere.
bool waSendingAllowed(PlanView? planView) {
  if (!waModuleAllowed(planView)) return false;
  if (planView == null) return true;
  return stateAllowsPosting(planView.state);
}

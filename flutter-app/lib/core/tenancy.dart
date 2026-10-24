/// Dukaan AI — Phase G · G5 tenancy core (Dart port of
/// web/lib/tenancy.ts; design: ERP-PHASE-G-DESIGN §1/§7).
///
/// Pure functions only — no Firebase, no store, no DOM — asserted
/// against the SAME truth tables the web harness proves, via the
/// shared fixtures (harness/fixtures/g5-core.json, exported from
/// the real TS functions). The store translates the write plans
/// below into Firestore batches; nothing here writes.
///
/// Doctrine (invariant 1): tenancy is METADATA outside the tenant
/// namespace. Every write plan produced here targets platform
/// collections only — never a `users/…` path.
library;

/// Format an instant exactly as JS `Date#toISOString()` does
/// (always millisecond precision, `Z`) — the string form every
/// platform doc carries and the fixtures compare.
String isoUtc(DateTime d) {
  final u = d.toUtc();
  String p(int n, [int w = 2]) => n.toString().padLeft(w, '0');
  return '${u.year.toString().padLeft(4, '0')}-${p(u.month)}-${p(u.day)}'
      'T${p(u.hour)}:${p(u.minute)}:${p(u.second)}.${p(u.millisecond, 3)}Z';
}

DateTime parseIso(String s) => DateTime.parse(s).toUtc();

/// resolveStaffRole over a RAW role value (the TS signature):
/// a recognised staff role wins; anything else is "manager".
String resolveRoleValue(Object? raw) {
  if (raw is String && (raw == 'manager' || raw == 'cashier' || raw == 'accountant')) {
    return raw;
  }
  return 'manager';
}

int _intOf(Object? v) => v is num ? v.toInt() : 0;
String _strOf(Object? v) => v?.toString() ?? '';
String? _strOrNull(Object? v) => v == null ? null : v.toString();

/* ------------------------------------------------------------------ */
/* Shapes (design §1.2 / §3.2)                                         */
/* ------------------------------------------------------------------ */

/// The plan ASSIGNMENT snapshot carried on a businesses doc (§3.2).
class PlanSnapshot {
  final String planId; // trial | basic | standard | advanced | enterprise | founding
  final int tierRank;
  final int usersLimit; // 0 = unlimited
  final int invoiceLimit; // 0 = unlimited
  final String modulesTier;
  final String periodFrom;
  final String? periodTo;
  final String? trialEndsAt;
  final String assignedBy; // signup | migration | admin
  final String assignedAt;
  const PlanSnapshot({
    required this.planId,
    required this.tierRank,
    required this.usersLimit,
    required this.invoiceLimit,
    required this.modulesTier,
    required this.periodFrom,
    required this.periodTo,
    required this.trialEndsAt,
    required this.assignedBy,
    required this.assignedAt,
  });

  factory PlanSnapshot.fromMap(Map<String, dynamic> m) => PlanSnapshot(
        planId: _strOf(m['planId']),
        tierRank: _intOf(m['tierRank']),
        usersLimit: _intOf(m['usersLimit']),
        invoiceLimit: _intOf(m['invoiceLimit']),
        modulesTier: _strOf(m['modulesTier']),
        periodFrom: _strOf(m['periodFrom']),
        periodTo: _strOrNull(m['periodTo']),
        trialEndsAt: _strOrNull(m['trialEndsAt']),
        assignedBy: _strOf(m['assignedBy']),
        assignedAt: _strOf(m['assignedAt']),
      );

  Map<String, dynamic> toMap() => {
        'planId': planId,
        'tierRank': tierRank,
        'usersLimit': usersLimit,
        'invoiceLimit': invoiceLimit,
        'modulesTier': modulesTier,
        'periodFrom': periodFrom,
        'periodTo': periodTo,
        'trialEndsAt': trialEndsAt,
        'assignedBy': assignedBy,
        'assignedAt': assignedAt,
      };
}

class BusinessRegistryDoc {
  final String ownerUid;
  final String ownerEmail;
  final String name;
  final String phone;
  final String city;
  final String createdAt;
  final String status; // active | suspended
  final bool enforce;
  final PlanSnapshot plan;
  const BusinessRegistryDoc({
    required this.ownerUid,
    required this.ownerEmail,
    required this.name,
    required this.phone,
    required this.city,
    required this.createdAt,
    required this.status,
    required this.enforce,
    required this.plan,
  });

  factory BusinessRegistryDoc.fromMap(Map<String, dynamic> m) => BusinessRegistryDoc(
        ownerUid: _strOf(m['ownerUid']),
        ownerEmail: _strOf(m['ownerEmail']),
        name: _strOf(m['name']),
        phone: _strOf(m['phone']),
        city: _strOf(m['city']),
        createdAt: _strOf(m['createdAt']),
        status: _strOf(m['status']),
        enforce: m['enforce'] == true,
        plan: PlanSnapshot.fromMap(
            m['plan'] is Map ? Map<String, dynamic>.from(m['plan'] as Map) : const {}),
      );

  Map<String, dynamic> toMap() => {
        'ownerUid': ownerUid,
        'ownerEmail': ownerEmail,
        'name': name,
        'phone': phone,
        'city': city,
        'createdAt': createdAt,
        'status': status,
        'enforce': enforce,
        'plan': plan.toMap(),
      };
}

class MembershipDoc {
  final String email;
  final String role;
  final String addedBy;
  final String addedAt;
  final String source; // invite | staff | owner
  const MembershipDoc({
    required this.email,
    required this.role,
    required this.addedBy,
    required this.addedAt,
    required this.source,
  });

  factory MembershipDoc.fromMap(Map<String, dynamic> m) => MembershipDoc(
        email: _strOf(m['email']),
        role: _strOf(m['role']),
        addedBy: _strOf(m['addedBy']),
        addedAt: _strOf(m['addedAt']),
        source: _strOf(m['source']),
      );

  Map<String, dynamic> toMap() => {
        'email': email,
        'role': role,
        'addedBy': addedBy,
        'addedAt': addedAt,
        'source': source,
      };
}

class InviteDoc {
  final String email;
  final String role;
  final String status; // pending | claimed
  final String invitedBy;
  final String createdAt;
  final String? claimedBy;
  final String? claimedAt;
  const InviteDoc({
    required this.email,
    required this.role,
    required this.status,
    required this.invitedBy,
    required this.createdAt,
    this.claimedBy,
    this.claimedAt,
  });

  factory InviteDoc.fromMap(Map<String, dynamic> m) => InviteDoc(
        email: _strOf(m['email']),
        role: _strOf(m['role']),
        status: _strOf(m['status']),
        invitedBy: _strOf(m['invitedBy']),
        createdAt: _strOf(m['createdAt']),
        claimedBy: _strOrNull(m['claimedBy']),
        claimedAt: _strOrNull(m['claimedAt']),
      );

  Map<String, dynamic> toMap() => {
        'email': email,
        'role': role,
        'status': status,
        'invitedBy': invitedBy,
        'createdAt': createdAt,
        if (claimedBy != null) 'claimedBy': claimedBy,
        if (claimedAt != null) 'claimedAt': claimedAt,
      };
}

class BusinessCountersDoc {
  final String invoiceMonth;
  final int invoiceCount;
  final int memberCount;
  final String? baseline; // "migration" on migration-born counters only
  const BusinessCountersDoc({
    required this.invoiceMonth,
    required this.invoiceCount,
    required this.memberCount,
    this.baseline,
  });

  factory BusinessCountersDoc.fromMap(Map<String, dynamic> m) => BusinessCountersDoc(
        invoiceMonth: _strOf(m['invoiceMonth']),
        invoiceCount: _intOf(m['invoiceCount']),
        memberCount: _intOf(m['memberCount']),
        baseline: _strOrNull(m['baseline']),
      );

  Map<String, dynamic> toMap() => {
        'invoiceMonth': invoiceMonth,
        'invoiceCount': invoiceCount,
        'memberCount': memberCount,
        if (baseline != null) 'baseline': baseline,
      };

  BusinessCountersDoc copyWith({String? invoiceMonth, int? invoiceCount, int? memberCount}) =>
      BusinessCountersDoc(
        invoiceMonth: invoiceMonth ?? this.invoiceMonth,
        invoiceCount: invoiceCount ?? this.invoiceCount,
        memberCount: memberCount ?? this.memberCount,
        baseline: baseline,
      );
}

class BusinessEventDoc {
  final String businessId;
  final String kind;
  final String actor;
  final String at;
  final Map<String, dynamic> detail;
  const BusinessEventDoc({
    required this.businessId,
    required this.kind,
    required this.actor,
    required this.at,
    required this.detail,
  });

  factory BusinessEventDoc.fromMap(Map<String, dynamic> m) => BusinessEventDoc(
        businessId: _strOf(m['businessId']),
        kind: _strOf(m['kind']),
        actor: _strOf(m['actor']),
        at: _strOf(m['at']),
        detail: m['detail'] is Map ? Map<String, dynamic>.from(m['detail'] as Map) : const {},
      );

  Map<String, dynamic> toMap() => {
        'businessId': businessId,
        'kind': kind,
        'actor': actor,
        'at': at,
        'detail': detail,
      };
}

/// One planned platform write. `index` is the caller's own
/// userMemberships merge (a read-modify-write of their own doc,
/// modelled here as data so the claim plan is fully assertable).
class PlatformWrite {
  final String kind; // set | update | add | index
  final String? path;
  final String? collection;
  final Map<String, dynamic>? data;
  final String? uid;
  final String? businessId;
  final String? role;
  const PlatformWrite._(this.kind, {this.path, this.collection, this.data, this.uid, this.businessId, this.role});
  factory PlatformWrite.set(String path, Map<String, dynamic> data) =>
      PlatformWrite._('set', path: path, data: data);
  factory PlatformWrite.update(String path, Map<String, dynamic> data) =>
      PlatformWrite._('update', path: path, data: data);
  factory PlatformWrite.add(String collection, Map<String, dynamic> data) =>
      PlatformWrite._('add', collection: collection, data: data);
  factory PlatformWrite.index(String uid, String businessId, String role) =>
      PlatformWrite._('index', uid: uid, businessId: businessId, role: role);

  Map<String, dynamic> toJson() => {
        'kind': kind,
        if (path != null) 'path': path,
        if (collection != null) 'collection': collection,
        if (data != null) 'data': data,
        if (uid != null) 'uid': uid,
        if (businessId != null) 'businessId': businessId,
        if (role != null) 'role': role,
      };
}

class BusinessSummary {
  final String businessId;
  final String name;
  final String role;
  final bool own;
  const BusinessSummary({
    required this.businessId,
    required this.name,
    required this.role,
    required this.own,
  });
}

/* ------------------------------------------------------------------ */
/* Plan snapshots (§3.1/§3.4 trial shape, §7.3 founding shape)         */
/* ------------------------------------------------------------------ */

const int trialUsersLimit = 2;
const int trialInvoiceLimit = 200;
const int trialDays = 14;
const int foundingUsersLimit = 10;
const int foundingInvoiceLimit = 10000;

PlanSnapshot trialPlanSnapshot(String nowISO) {
  final ends = parseIso(nowISO).add(const Duration(days: trialDays));
  return PlanSnapshot(
    planId: 'trial',
    tierRank: 0,
    usersLimit: trialUsersLimit,
    invoiceLimit: trialInvoiceLimit,
    modulesTier: 'standard', // the trial tastes Standard's set (§3.4)
    periodFrom: nowISO,
    periodTo: null,
    trialEndsAt: isoUtc(ends),
    assignedBy: 'signup',
    assignedAt: nowISO,
  );
}

PlanSnapshot foundingPlanSnapshot(String nowISO) {
  return PlanSnapshot(
    planId: 'founding',
    tierRank: 3, // Advanced's rank (§3.1)
    usersLimit: foundingUsersLimit,
    invoiceLimit: foundingInvoiceLimit,
    modulesTier: 'advanced', // Advanced's module set, no expiry (§7.3)
    periodFrom: nowISO,
    periodTo: null,
    trialEndsAt: null,
    assignedBy: 'migration',
    assignedAt: nowISO,
  );
}

/* ------------------------------------------------------------------ */
/* Counters baseline (§7.2 step 1)                                      */
/* ------------------------------------------------------------------ */

/// "YYYY-MM" of an instant on the PKT business calendar (UTC+5, no
/// DST — the same fixed offset lib/periods uses for dateISO).
String pktMonthKey(String instantISO) {
  final shifted = parseIso(instantISO).add(const Duration(hours: 5));
  final y = shifted.year;
  final m = shifted.month.toString().padLeft(2, '0');
  return '$y-$m';
}

/// A bill row, reduced to the fields the counter derivation reads.
typedef BillCountRow = ({String ts, String? status});

/// A sale row, reduced to the fields the counter derivation reads.
typedef SaleCountRow = ({String ts, String? billId, String? kind});

/// The §4.2 invoice-event definition, applied to a baseline count.
int countMonthlyInvoiceEvents(List<BillCountRow> bills, List<SaleCountRow> sales, String monthKey) {
  var n = 0;
  for (final b in bills) {
    if (b.status == 'held') continue;
    if (pktMonthKey(b.ts) == monthKey) n++;
  }
  for (final s in sales) {
    // Only the counter sale's OWN row is an event (§4.2): a bill's
    // line rows cite their bill (counted once, as the bill) and
    // return rows are kind "return". A row carrying neither field
    // (a bare record) reads as a counter sale.
    if (s.billId != null) continue;
    if (s.kind != null && s.kind != 'sale') continue;
    if (pktMonthKey(s.ts) == monthKey) n++;
  }
  return n;
}

/* ------------------------------------------------------------------ */
/* Lazy migration + trial birth (§7.2)                                 */
/* ------------------------------------------------------------------ */

/// The existing-shop migration (§7.2 step 1): registry doc with
/// the `founding` comp assignment, baseline counters, and the
/// audit event. ZERO writes inside `users/{uid}`, ZERO journal
/// entries. Idempotent: when the registry doc already exists the
/// plan is EMPTY.
List<PlatformWrite> planMigration({
  required String ownerUid,
  required String ownerEmail,
  required String shopName,
  required String phone,
  required List<String> staffEmails,
  required bool registryExists,
  required List<BillCountRow> bills,
  required List<SaleCountRow> sales,
  required String nowISO,
}) {
  if (registryExists) return const [];
  final month = pktMonthKey(nowISO);
  final invoiceCount = countMonthlyInvoiceEvents(bills, sales, month);
  final memberCount = staffEmails.length;
  final registry = BusinessRegistryDoc(
    ownerUid: ownerUid,
    ownerEmail: ownerEmail,
    name: shopName,
    phone: phone,
    city: '',
    createdAt: nowISO,
    status: 'active',
    enforce: false,
    plan: foundingPlanSnapshot(nowISO),
  );
  final counters = BusinessCountersDoc(
    invoiceMonth: month,
    invoiceCount: invoiceCount,
    memberCount: memberCount,
    baseline: 'migration',
  );
  final event = BusinessEventDoc(
    businessId: ownerUid,
    kind: 'business.migrated',
    actor: ownerUid,
    at: nowISO,
    detail: {'plan': 'founding', 'memberCount': memberCount, 'invoiceBaseline': invoiceCount},
  );
  return [
    PlatformWrite.set('businesses/$ownerUid', registry.toMap()),
    PlatformWrite.set('businessCounters/$ownerUid', counters.toMap()),
    PlatformWrite.add('businessEvents', event.toMap()),
  ];
}

/// A business born after G (§7.2 step 3): the trial registry shape
/// §4.3 validates — trial plan, zeroed counters for the birth
/// month, and the `trial.started` event.
List<PlatformWrite> planTrialBirth({
  required String ownerUid,
  required String ownerEmail,
  required String shopName,
  required String phone,
  required String nowISO,
}) {
  final registry = BusinessRegistryDoc(
    ownerUid: ownerUid,
    ownerEmail: ownerEmail,
    name: shopName,
    phone: phone,
    city: '',
    createdAt: nowISO,
    status: 'active',
    enforce: false,
    plan: trialPlanSnapshot(nowISO),
  );
  final counters = BusinessCountersDoc(
    invoiceMonth: pktMonthKey(nowISO),
    invoiceCount: 0,
    memberCount: 0,
  );
  final event = BusinessEventDoc(
    businessId: ownerUid,
    kind: 'trial.started',
    actor: ownerUid,
    at: nowISO,
    detail: {'plan': 'trial'},
  );
  return [
    PlatformWrite.set('businesses/$ownerUid', registry.toMap()),
    PlatformWrite.set('businessCounters/$ownerUid', counters.toMap()),
    PlatformWrite.add('businessEvents', event.toMap()),
  ];
}

/* ------------------------------------------------------------------ */
/* Access resolution — the truth table (§1.3)                          */
/* ------------------------------------------------------------------ */

class AccessResult {
  final bool access;
  final String role;
  final String? via; // owner | membership | legacy | null
  const AccessResult({required this.access, required this.role, required this.via});
}

/// Resolution order (clients and rules agree):
///   1. uid == businessId ⇒ owner.
///   2. Membership doc ⇒ its role — PROVIDED the caller's email is
///      still in the owner doc's staffEmails mirror (a removal
///      that lands on the mirror cuts BOTH legs at once).
///   3. Legacy staffIndex ⇒ its role, when the index points at
///      this business AND the mirror still carries the email.
///   4. Otherwise no access.
/// A missing/unrecognised role resolves to "manager".
AccessResult resolveAccess({
  required String callerUid,
  required String callerEmail,
  required String businessId,
  required List<String> staffEmails,
  required Map<String, dynamic>? membership,
  required Map<String, dynamic>? staffIndex,
}) {
  final email = callerEmail.trim().toLowerCase();
  if (callerUid != '' && callerUid == businessId) {
    return const AccessResult(access: true, role: 'owner', via: 'owner');
  }
  final inMirror = email != '' && staffEmails.contains(email);
  if (membership != null && inMirror) {
    return AccessResult(
      access: true,
      role: resolveRoleValue(membership['role']),
      via: 'membership',
    );
  }
  if (staffIndex != null && staffIndex['ownerUid'] == businessId && inMirror) {
    return AccessResult(
      access: true,
      role: resolveRoleValue(staffIndex['role']),
      via: 'legacy',
    );
  }
  return const AccessResult(access: false, role: 'none', via: null);
}

/* ------------------------------------------------------------------ */
/* Invite → claim (§1.3)                                               */
/* ------------------------------------------------------------------ */

class ClaimResult {
  final bool ok;
  final String? role;
  final String? reason; // no-invite | email-mismatch | already-claimed | not-pending
  final List<PlatformWrite> writes;
  const ClaimResult._({required this.ok, this.role, this.reason, required this.writes});
  factory ClaimResult.success(String role, List<PlatformWrite> writes) =>
      ClaimResult._(ok: true, role: role, writes: writes);
  factory ClaimResult.refusal(String reason) =>
      ClaimResult._(ok: false, reason: reason, writes: const []);
}

/// The claim plan: an invitee's sign-in turns a pending invite for
/// THEIR verified email into a uid-keyed membership with the
/// invited role, marks the invite claimed, adds their switcher
/// index entry and logs the act — one batch in the client.
/// Re-claiming your own claimed invite is an idempotent no-op;
/// someone else's claim is refused.
ClaimResult planClaim({
  required String businessId,
  required String callerUid,
  required String callerEmail,
  required InviteDoc? invite,
  required MembershipDoc? existingMembership,
  required String nowISO,
}) {
  final email = callerEmail.trim().toLowerCase();
  if (invite == null) return ClaimResult.refusal('no-invite');
  if (invite.email.trim().toLowerCase() != email) {
    return ClaimResult.refusal('email-mismatch');
  }
  if (invite.status == 'claimed') {
    if (invite.claimedBy == callerUid && existingMembership != null) {
      return ClaimResult.success(existingMembership.role, const []);
    }
    return ClaimResult.refusal('already-claimed');
  }
  if (invite.status != 'pending') return ClaimResult.refusal('not-pending');
  final role = resolveRoleValue(invite.role);
  final membership = MembershipDoc(
    email: email,
    role: role,
    addedBy: businessId,
    addedAt: nowISO,
    source: 'invite',
  );
  final event = BusinessEventDoc(
    businessId: businessId,
    kind: 'membership.claimed',
    actor: callerUid,
    at: nowISO,
    detail: {'email': email, 'role': role, 'source': 'invite'},
  );
  return ClaimResult.success(role, [
    PlatformWrite.set('businessMembers/$businessId/members/$callerUid', membership.toMap()),
    PlatformWrite.update('businessInvites/$businessId/invites/$email', {
      'status': 'claimed',
      'claimedBy': callerUid,
      'claimedAt': nowISO,
    }),
    PlatformWrite.index(callerUid, businessId, role),
    PlatformWrite.add('businessEvents', event.toMap()),
  ]);
}

/* ------------------------------------------------------------------ */
/* Legacy self-backfill (§7.2 step 2)                                  */
/* ------------------------------------------------------------------ */

/// A pre-G staffer's first G sign-in: the legacy leg already grants
/// them access (nobody's access depends on this backfill); their
/// own client mirrors the relationship into a membership doc
/// (source "staff") + switcher index entry. No-op when the index
/// doesn't point at this business or a membership already exists.
List<PlatformWrite> planLegacyBackfill({
  required String businessId,
  required String callerUid,
  required String callerEmail,
  required Map<String, dynamic>? staffIndex,
  required MembershipDoc? existingMembership,
  required String nowISO,
}) {
  if (existingMembership != null) return const [];
  if (staffIndex == null || staffIndex['ownerUid'] != businessId) return const [];
  final email = callerEmail.trim().toLowerCase();
  if (email.isEmpty) return const [];
  final role = resolveRoleValue(staffIndex['role']);
  final membership = MembershipDoc(
    email: email,
    role: role,
    addedBy: businessId,
    addedAt: nowISO,
    source: 'staff',
  );
  final event = BusinessEventDoc(
    businessId: businessId,
    kind: 'membership.backfilled',
    actor: callerUid,
    at: nowISO,
    detail: {'email': email, 'role': role, 'source': 'staff'},
  );
  return [
    PlatformWrite.set('businessMembers/$businessId/members/$callerUid', membership.toMap()),
    PlatformWrite.index(callerUid, businessId, role),
    PlatformWrite.add('businessEvents', event.toMap()),
  ];
}

/* ------------------------------------------------------------------ */
/* Switcher index — build + self-heal (§1.4)                           */
/* ------------------------------------------------------------------ */

class IndexEntry {
  final String businessId;
  /// A member's staff role — or "owner" for an additionally-owned
  /// business (FR2: the owner is never a MEMBER, but the index
  /// entry is what lists the business, so it carries the owner
  /// role explicitly).
  final String role;
  /// FR2: true when this entry lists a business the caller OWNS
  /// (registry-owner carve-out), not one they are a member of.
  final bool own;
  const IndexEntry({required this.businessId, required this.role, this.own = false});

  factory IndexEntry.fromMap(Map<String, dynamic> m) {
    final raw = m['role'];
    return IndexEntry(
      businessId: _strOf(m['businessId']),
      // FR2: "owner" survives the parse — the old resolver mapped
      // every unknown role to "manager", which would erase the
      // additionally-owned marker on the next read.
      role: raw == 'owner' ? 'owner' : resolveRoleValue(raw),
      own: m['own'] == true,
    );
  }

  Map<String, dynamic> toMap() => {'businessId': businessId, 'role': role, if (own) 'own': true};
}

/// Merge one entry into a userMemberships entry list (idempotent;
/// an existing entry's role is refreshed from the membership).
List<IndexEntry> indexWith(List<IndexEntry> entries, IndexEntry add) {
  final out = entries.where((e) => e.businessId != add.businessId).toList();
  out.add(add);
  return out;
}

class HealResult {
  final List<IndexEntry> kept;
  final List<String> dropped;
  const HealResult({required this.kept, required this.dropped});
}

/// Self-healing (§1.4): the index is a CACHE of memberships, never
/// a source of truth. An entry whose membership doc no longer
/// exists is dropped on sight (and reported in `dropped`); entries
/// are de-duplicated and their roles refreshed from the live
/// membership docs.
///
/// FR2 widening: `ownerOwned` lists businesses whose REGISTRY
/// names the caller as ownerUid. The G1 doctrine ("the owner is
/// never a member of their own business") means such businesses
/// have NO membership doc by design — without this carve-out,
/// healing would drop every additionally-owned business on the
/// next sign-in. An ownerOwned entry is kept with role "owner"
/// regardless of any membership doc.
HealResult healIndex(
  List<IndexEntry> entries,
  Map<String, MembershipDoc?> liveMemberships, [
  List<String> ownerOwned = const [],
]) {
  final kept = <IndexEntry>[];
  final dropped = <String>[];
  final seen = <String>{};
  final owned = ownerOwned.toSet();
  for (final e in entries) {
    if (seen.contains(e.businessId)) continue;
    seen.add(e.businessId);
    if (owned.contains(e.businessId)) {
      kept.add(IndexEntry(businessId: e.businessId, role: 'owner', own: true));
      continue;
    }
    final m = liveMemberships[e.businessId];
    if (m != null) {
      kept.add(IndexEntry(businessId: e.businessId, role: m.role));
    } else {
      dropped.add(e.businessId);
    }
  }
  return HealResult(kept: kept, dropped: dropped);
}

/// The switcher list: the person's own business first (from the
/// uid itself, never from a membership doc — §1.3), then their
/// memberships in stable name order.
///
/// FR2 widening: entries may carry `own` (an additionally-owned
/// business, from the registry-owner carve-out above). Owned
/// businesses sort before member businesses — the uid-shaped own
/// business first (business #1, the legacy position), then other
/// owned businesses in name order, then member businesses in
/// name order.
List<BusinessSummary> buildSwitcherList({
  required ({String businessId, String name})? own,
  required List<IndexEntry> entries,
  required Map<String, String> names,
}) {
  final out = <BusinessSummary>[];
  if (own != null) {
    out.add(BusinessSummary(
      businessId: own.businessId,
      name: names[own.businessId] ?? own.name,
      role: 'owner',
      own: true,
    ));
  }
  final rest = entries.where((e) => own == null || e.businessId != own.businessId).toList();
  int byName(IndexEntry a, IndexEntry b) =>
      (names[a.businessId] ?? a.businessId).compareTo(names[b.businessId] ?? b.businessId);
  final owned = rest.where((e) => e.own).toList()..sort(byName);
  final members = rest.where((e) => !e.own).toList()..sort(byName);
  for (final e in owned) {
    out.add(BusinessSummary(
      businessId: e.businessId,
      name: names[e.businessId] ?? '',
      role: 'owner',
      own: true,
    ));
  }
  for (final e in members) {
    out.add(BusinessSummary(
      businessId: e.businessId,
      name: names[e.businessId] ?? '',
      role: e.role,
      own: false,
    ));
  }
  return out;
}

/// Pick the active business from an ordered candidate list: the
/// first candidate that is actually in the switcher list wins.
/// The caller supplies the precedence (FR2: the server-persisted
/// activeBusinessId, then the device-local choice, then the
/// claim/legacy preferred business); a null result means "fall
/// back to list[0]" — the caller's decision, not this helper's.
BusinessSummary? pickActiveBusiness(
  List<BusinessSummary> list,
  List<String?> candidates,
) {
  for (final c in candidates) {
    if (c == null || c.isEmpty) continue;
    for (final b in list) {
      if (b.businessId == c) return b;
    }
  }
  return null;
}

/// The staff screen's per-row membership status (G1): a claimed
/// membership = joined; a pending invite = invited; a mirror entry
/// with neither is a pre-G legacy relationship.
String membershipStatusFor(
  String email,
  List<MembershipDoc> memberships,
  List<InviteDoc> invites,
) {
  final e = email.trim().toLowerCase();
  if (memberships.any((m) => m.email.trim().toLowerCase() == e)) return 'joined';
  if (invites.any((i) => i.email.trim().toLowerCase() == e && i.status == 'pending')) {
    return 'pending';
  }
  return 'legacy';
}

/* ------------------------------------------------------------------ */
/* Fix Round 2 · FR2 item 3 — new-business creation (Dart port of    */
/* web/lib/tenancy.ts's planNewBusinessPhase1/2 + skeleton).        */
/* Platform collections only, per the file's doctrine. A generated   */
/* business is born on the Free Trial rules exactly like any new    */
/* business — the founding assignment is the §7.2 migration of a    */
/* pre-G shop whose namespace already exists, and the rules pin     */
/* that (founding requires businessId == ownerUid). New businesses  */
/* start EMPTY (FR2 item 1); demo data arrives only through the    */
/* explicit owner act.                                               */
/* ------------------------------------------------------------------ */

class NewBusinessInput {
  final String businessId;
  final String ownerUid;
  final String ownerEmail;
  final String name;
  final String phone;
  final String address;
  final String nowISO;
  const NewBusinessInput({
    required this.businessId,
    required this.ownerUid,
    required this.ownerEmail,
    required this.name,
    required this.phone,
    required this.address,
    required this.nowISO,
  });
}

/// Creation-form validation (the client enforces the same): a
/// name is required (1–60 chars); phone/address are free text
/// capped at the lengths the registry already tolerates.
bool newBusinessInputOk({required String name, required String phone, required String address}) {
  final n = name.trim();
  if (n.isEmpty || n.length > 60) return false;
  if (phone.length > 16) return false;
  if (address.length > 200) return false;
  return true;
}

/// Phase 1: the registry (trial plan) + the creation audit
/// event. The registry's ownerUid is the CREATOR's uid — for a
/// generated id this is precisely what distinguishes it from
/// the legacy shape (where ownerUid == businessId).
List<PlatformWrite> planNewBusinessPhase1(NewBusinessInput input) {
  final registry = BusinessRegistryDoc(
    ownerUid: input.ownerUid,
    ownerEmail: input.ownerEmail,
    name: input.name.trim(),
    phone: input.phone,
    city: '',
    createdAt: input.nowISO,
    status: 'active',
    enforce: false,
    plan: trialPlanSnapshot(input.nowISO),
  );
  final event = BusinessEventDoc(
    businessId: input.businessId,
    kind: 'business.created',
    actor: input.ownerUid,
    at: input.nowISO,
    detail: {'name': input.name.trim(), 'via': 'new-business'},
  );
  return [
    PlatformWrite.set('businesses/${input.businessId}', registry.toMap()),
    PlatformWrite.add('businessEvents', event.toMap()),
  ];
}

/// Phase 2: the zeroed counters for the birth month + the
/// creator's switcher index entry (role "owner" — the owner is
/// never a MEMBER of their own business, so no members doc is
/// written; the index entry is what lists the business, and the
/// FR2 healing carve-out keeps it without a membership doc).
List<PlatformWrite> planNewBusinessPhase2(NewBusinessInput input) {
  final counters = BusinessCountersDoc(
    invoiceMonth: pktMonthKey(input.nowISO),
    invoiceCount: 0,
    memberCount: 0,
  );
  return [
    PlatformWrite.set('businessCounters/${input.businessId}', counters.toMap()),
    PlatformWrite.index(input.ownerUid, input.businessId, 'owner'),
  ];
}

/// The seed money accounts (web/lib/seed.ts getSeedAccounts —
/// fixed ids, fixed content, ts 2025-01-01) and the default
/// warehouse (wh-main), the structural docs a new business's
/// skeleton carries. Inlined copies drift; these are the same
/// fixed rows the web skeleton uses.
const List<Map<String, dynamic>> seedMoneyAccounts = [
  {'id': 'acc-till', 'name': 'Main Till', 'kind': 'cash', 'method': 'cash', 'legacyFor': 'cash', 'archived': false, 'sortOrder': 0, 'ts': '2025-01-01T00:00:00.000Z'},
  {'id': 'acc-wallet-legacy', 'name': 'Wallet & Bank', 'kind': 'wallet', 'method': null, 'legacyFor': 'wallet', 'archived': false, 'sortOrder': 1, 'ts': '2025-01-01T00:00:00.000Z'},
  {'id': 'acc-jazzcash', 'name': 'JazzCash', 'kind': 'wallet', 'method': 'jazzcash', 'legacyFor': null, 'archived': false, 'sortOrder': 2, 'ts': '2025-01-01T00:00:00.000Z'},
  {'id': 'acc-easypaisa', 'name': 'Easypaisa', 'kind': 'wallet', 'method': 'easypaisa', 'legacyFor': null, 'archived': false, 'sortOrder': 3, 'ts': '2025-01-01T00:00:00.000Z'},
  {'id': 'acc-bank', 'name': 'Bank Account', 'kind': 'bank', 'method': 'bank', 'legacyFor': null, 'archived': false, 'sortOrder': 4, 'ts': '2025-01-01T00:00:00.000Z'},
];

const Map<String, dynamic> seedDefaultWarehouse = {
  'id': 'wh-main',
  'name': 'Main Warehouse',
  'note': '',
  'isDefault': true,
  'archived': false,
  'sortOrder': 0,
  'ts': '2025-01-01T00:00:00.000Z',
};

class NewBusinessSkeleton {
  final Map<String, dynamic> ownerDoc;
  final List<Map<String, dynamic>> accounts;
  final Map<String, dynamic> warehouse;
  const NewBusinessSkeleton({
    required this.ownerDoc,
    required this.accounts,
    required this.warehouse,
  });
}

/// The tenant skeleton for a new business: the owner doc +
/// structural docs, with the same fixed ids and content the
/// first-business skeleton uses. Content collections are NOT
/// here — a new business starts EMPTY (FR2 item 1). The owner
/// doc carries demoState "none" and seedV2 true ("namespace
/// initialised" — the migration steps are no-ops).
NewBusinessSkeleton newBusinessSkeleton(NewBusinessInput input) {
  return NewBusinessSkeleton(
    ownerDoc: {
      'email': input.ownerEmail,
      'bornAt': input.nowISO,
      'seedV2': true,
      'demoState': 'none',
      'phaseA': {'accountsV1': true, 'rbacV1': true, 'taxV1': true, 'periodsV1': true},
      'phaseC': {'stockV1': true},
      'phaseD': {'hrV1': true},
      'defaultSalesTaxSlabId': null,
      'defaultPurchaseTaxSlabId': null,
      'fiscalYearStartMonth': 7,
      'fiscalYearStartDay': 1,
      'lockedThrough': '',
      'shopName': input.name.trim(),
      'address': input.address,
      'phone': input.phone,
      'staffEmails': <String>[],
      'staff': <Map<String, dynamic>>[],
    },
    accounts: seedMoneyAccounts.map((a) => Map<String, dynamic>.from(a)).toList(),
    warehouse: Map<String, dynamic>.from(seedDefaultWarehouse),
  );
}

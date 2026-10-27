/// Dukaan AI — the store (Dart analogue of web/components/
/// StoreProvider.tsx). One store object with listenable state;
/// subscriptions over the SAME collections the web reads; every
/// posting action composes through core/ composers, runs the guard
/// ([guardPostings] = preparePosting over lockedThrough) BEFORE any
/// write, and funnels cloud writes through ONE WriteBatch per money
/// event (operational docs + journal entry together — invariant 2).
///
/// Firestore with persistence enabled is the only on-device store
/// (design §3.1): there is no second database and no sync
/// translation. Offline batches queue in the SDK and flush in commit
/// order; a flush-time rules refusal lands in the rejected-write
/// tray (§3.5) — visible and recoverable, never silently dropped.
import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/backup.dart' as bk;
import '../core/boms.dart';
import '../core/cheques.dart';
import '../core/composers.dart';
import '../core/fiscal.dart';
import '../core/jobs.dart';
import '../core/loans.dart';
import '../core/payroll.dart';
import '../core/production.dart';
import '../core/stock.dart' as stock_core;
import '../core/transfers.dart' as tr_core;
import '../core/composers_f2.dart';
import '../core/documents.dart';
import '../core/ledger.dart';
import '../core/loyalty.dart';
import '../core/mc_workflow.dart' as mc;
import '../core/periods.dart';
import '../core/permissions.dart';
import '../core/plans.dart';
import '../core/renewal.dart';
import '../core/storefront.dart';
import '../core/tenancy.dart';
import '../core/types.dart';
import '../core/whatsapp.dart';

/// Collections the app subscribes to (of the web's 38). F1 brought
/// the counter spine; F2 adds the back office (suppliers, purchases,
/// documents, cheques, finance rows). F3–F4 add the rest; H5 adds
/// the WhatsApp marketing trio; the journal and owner doc are the
/// spine from day one.
const List<String> f1Collections = [
  'products', 'sales', 'bills', 'returns', 'credits', 'customers',
  'journal', 'accounts', 'taxSlabs', 'dayCloses', 'warehouses',
  'stockLevels',
  'expenses', 'supplierPayments', 'cashEntries',
  // F2:
  'suppliers', 'purchases', 'purchaseReturns', 'quotations',
  'saleOrders', 'deliveryChallans', 'purchaseOrders', 'notes',
  'cheques',
  // F3 operations:
  'stockTransfers', 'boms', 'productionOrders', 'jobs',
  // F4 HR / finance close / settings:
  'employees', 'attendance', 'payrollRuns', 'loans', 'periods', 'branding',
  // H5 WhatsApp marketing (design §3.3):
  'waTemplates', 'waCampaigns', 'waSends',
];

class RejectedWrite {
  final String at; // ISO instant the refusal surfaced
  final String reasonClass; // period-locked | permission | other
  final String detail;
  final List<Map<String, dynamic>> documents; // what was refused
  // G5 (design §1): the business this write belonged to, so the
  // tray can label entries per business after a switch. '' for
  // entries persisted before G5.
  final String businessId;
  const RejectedWrite({
    required this.at, required this.reasonClass, required this.detail,
    required this.documents, this.businessId = '',
  });
  Map<String, dynamic> toJson() => {
        'at': at, 'reasonClass': reasonClass, 'detail': detail,
        'documents': documents, 'businessId': businessId,
      };
  static RejectedWrite fromJson(Map<String, dynamic> m) => RejectedWrite(
        at: m['at']?.toString() ?? '', reasonClass: m['reasonClass']?.toString() ?? 'other',
        detail: m['detail']?.toString() ?? '',
        documents: (m['documents'] as List? ?? []).map((e) => Map<String, dynamic>.from(e as Map)).toList(),
        businessId: m['businessId']?.toString() ?? '',
      );
}

/// A document→bill conversion prefill (web BillDraftPrefill): the
/// billing desk opens with these lines/customer/terms; the source
/// citation rides along so [ShopStore.postBill] can recompute the
/// source document's cached status in the posting batch.
class BillPrefill {
  final List<BillLineInput> lines;
  final String? customerId;
  final String customerName;
  final String customerPhone;
  final String discountType;
  final double discountValue;
  final String? sourceType; // order | challan | quotation
  final String? sourceId;
  final String? warehouseId;
  const BillPrefill({
    required this.lines, this.customerId, this.customerName = '', this.customerPhone = '',
    this.discountType = 'flat', this.discountValue = 0, this.sourceType, this.sourceId,
    this.warehouseId,
  });
}

/* G5 doc normalisers — the web's StoreProvider/AuthProvider
 * convert platform Timestamps to ISO strings on read; the Dart
 * core types speak ISO only, so the same conversion happens at
 * this boundary (lib/core/tenancy shapes). */

String? _tsToIso(dynamic v) {
  if (v is Timestamp) return isoUtc(v.toDate());
  if (v is DateTime) return isoUtc(v);
  if (v is String) return v;
  return null;
}

Map<String, dynamic> _normRegistryMap(Map<String, dynamic> raw) {
  final plan = raw['plan'];
  return {
    ...raw,
    'createdAt': _tsToIso(raw['createdAt']) ?? '',
    if (plan is Map)
      'plan': {
        ...Map<String, dynamic>.from(plan),
        'periodFrom': _tsToIso(plan['periodFrom']),
        'periodTo': _tsToIso(plan['periodTo']),
        'trialEndsAt': _tsToIso(plan['trialEndsAt']),
      },
  };
}

Map<String, dynamic> _normPaymentMap(Map<String, dynamic> raw) => {
      ...raw,
      'periodFrom': _tsToIso(raw['periodFrom']),
      'periodTo': _tsToIso(raw['periodTo']),
      'submittedAt': _tsToIso(raw['submittedAt']) ?? '',
      'confirmedAt': _tsToIso(raw['confirmedAt']),
    };

Map<String, dynamic> _normEventMap(Map<String, dynamic> raw) => {
      ...raw,
      'at': _tsToIso(raw['at']) ?? '',
    };

/// G6: make a Firestore value JSON-safe for the backup file —
/// the web exportableDoc mirror (Timestamps become ISO strings,
/// recursively; everything else passes through).
dynamic _exportable(dynamic v) {
  if (v is Timestamp) return isoUtc(v.toDate());
  if (v is DateTime) return isoUtc(v);
  if (v is Map) {
    return {for (final e in v.entries) '${e.key}': _exportable(e.value)};
  }
  if (v is List) return [for (final x in v) _exportable(x)];
  return v;
}

Map<String, dynamic> _exportableDoc(Map<String, dynamic> raw) =>
    _exportable(raw) as Map<String, dynamic>;

/// H4: the web's normStoreOrder — a live inbox doc's createdAt is
/// a server Timestamp; the typed model carries its ISO form.
Map<String, dynamic> _normStoreOrderMap(Map<String, dynamic> raw) {
  final m = Map<String, dynamic>.from(raw);
  final ca = m['createdAt'];
  if (ca is Timestamp) m['createdAt'] = isoUtc(ca.toDate());
  return m;
}

class ShopStore extends ChangeNotifier {
  final FirebaseFirestore db = FirebaseFirestore.instance;
  final FirebaseAuth auth = FirebaseAuth.instance;

  User? user;
  String? ownerUid;
  String role = 'none'; // owner | manager | cashier | accountant | none
  bool ready = false;
  String? lastError;

  // Owner doc (settings + staff live here).
  Map<String, dynamic> ownerDoc = {};
  ShopSettingsView get settings => ShopSettingsView.fromMap(ownerDoc);
  String get lockedThrough => settings.lockedThrough;

  // Collections.
  List<Product> products = [];
  List<Sale> sales = [];
  List<Bill> bills = [];
  List<SaleReturn> returns = [];
  List<CreditEntry> credits = [];
  List<Customer> customers = [];
  List<JournalEntry> journal = [];
  List<MoneyAccount> accounts = [];
  List<TaxSlab> taxSlabs = [];
  List<DayClose> dayCloses = [];
  List<Warehouse> warehouses = [];
  List<StockLevel> stockLevels = [];
  // F2 typed operational rows (were raw maps read for day close).
  List<Expense> expenses = [];
  List<SupplierPayment> supplierPayments = [];
  List<CashEntry> cashEntries = [];
  // F2 back-office collections.
  List<Supplier> suppliers = [];
  List<Purchase> purchases = [];
  List<PurchaseReturn> purchaseReturns = [];
  List<Quotation> quotations = [];
  List<SaleOrder> saleOrders = [];
  List<DeliveryChallan> deliveryChallans = [];
  List<PurchaseOrder> purchaseOrders = [];
  List<DocNote> notes = [];
  List<Cheque> cheques = [];
  // F3 operations collections.
  List<StockTransfer> stockTransfers = [];
  List<Bom> boms = [];
  List<ProductionOrder> productionOrders = [];
  List<Job> jobs = [];
  // F4 HR / finance-close / settings collections.
  List<Employee> employees = [];
  List<AttendanceMonth> attendance = [];
  List<PayrollRun> payrollRuns = [];
  List<Loan> loans = [];
  List<PeriodDoc> periods = [];
  List<BrandingAsset> brandingAssets = [];

  /// A document→bill conversion prefill (design §F2): set by the
  /// documents desk, consumed once by the billing desk. Conversions
  /// write NOTHING themselves — the bill posts through [postBill]
  /// exactly once, citing the source, and the source's cached
  /// status is recomputed in that same batch.
  BillPrefill? billPrefill;

  // Sync centre state (§3.5).
  final Map<String, bool> _pendingByCollection = {};
  bool fromCache = false;
  int get pendingWrites => _pendingByCollection.values.where((b) => b).length;
  List<RejectedWrite> rejectedTray = [];

  String originDevice = 'App device';
  final List<StreamSubscription<dynamic>> _subs = [];

  // G5 — the SaaS layer (design §5): the session's businesses,
  // the ACTIVE business's plan registry + counters, the owner's
  // platform payments + config, and the plan refusal surface.
  List<BusinessSummary> businesses = [];
  String? activeBusinessId;
  bool noAccess = false;
  BusinessRegistryDoc? planRegistry;
  BusinessCountersDoc? planCounters;
  List<PlatformPaymentDoc> ownPayments = [];
  PlatformConfigDoc platformConfig = PlatformConfigDoc.empty;
  List<BusinessEventDoc> ownEvents = [];
  List<InviteDoc> businessInvites = [];
  List<({String memberUid, MembershipDoc doc})> businessMembers = [];
  String? planRefusal; // 'invoice-cap' | 'member-cap' | 'state:<state>'
  String? _ensuredRegistryFor;
  int _resolveRun = 0;
  final List<StreamSubscription<dynamic>> _sessionSubs = [];

  // H4 — the storefront (design §2): the ACTIVE business's
  // published snapshot (null = never published) and its store
  // order inbox, newest first. The inbox is paper until a member
  // converts a row; the snapshot is the shop's public face,
  // written by the owner alone.
  StorefrontDoc? storefront;
  List<StoreOrder> storeOrders = [];
  Timer? _autoRepublishTimer;

  // H5 — WhatsApp marketing (design §3): templates, campaigns
  // and the send log for the ACTIVE business. The log is a FACT
  // (who was queued, what the shopkeeper did); audiences are
  // never stored — core/whatsapp derives them live at launch.
  List<WaTemplate> waTemplates = [];
  List<WaCampaign> waCampaigns = [];
  List<WaSend> waSends = [];

  /// The active business's derived plan view (null pre-G / no
  /// registry — nothing gates, §3.6), recomputed on read exactly
  /// as the web derives it per render.
  PlanView? get planView =>
      planRegistry == null ? null : planViewOf(planRegistry!, planCounters, isoUtc(DateTime.now()));

  /// The console's suspension reason, shown only while suspended.
  String? get suspensionReason =>
      planView?.state == 'suspended' ? latestSuspensionReason(ownEvents) : null;

  void clearPlanRefusal() {
    if (planRefusal != null) {
      planRefusal = null;
      notifyListeners();
    }
  }

  /// Display name for any business id (switcher list first, then
  /// the own shop's settings name); '' when unknown.
  String businessNameFor(String bid) {
    for (final b in businesses) {
      if (b.businessId == bid && b.name.isNotEmpty) return b.name;
    }
    if (bid == user?.uid) return settings.shopName;
    return '';
  }

  /// Staff-row status for the active business (joined / pending /
  /// legacy) — the web's membershipStatusFor over live docs.
  String memberStatusFor(String email) => membershipStatusFor(
        email,
        businessMembers.map((m) => m.doc).toList(),
        businessInvites,
      );

  InviteDoc? _inviteFor(String email) {
    for (final i in businessInvites) {
      if (i.email == email) return i;
    }
    return null;
  }

  ({String memberUid, MembershipDoc doc})? _memberFor(String email) {
    for (final m in businessMembers) {
      if (m.doc.email == email) return m;
    }
    return null;
  }

  CollectionReference<Map<String, dynamic>> _col(String name) =>
      db.collection('users').doc(ownerUid).collection(name);
  DocumentReference<Map<String, dynamic>> get _ownerRef => db.collection('users').doc(ownerUid);

  Map<String, Product> get productsById => {for (final p in products) p.id: p};

  /* ---------------- lifecycle ---------------- */

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    originDevice = prefs.getString('dukaan-ai-device-label') ?? 'App device';
    // Cache-first identity (fix round 2026-10-25): the last-known
    // business list + role paint instantly on cold start, so the
    // shell never shows the empty/placeholder state while the
    // network resolution runs; _applyResolution overwrites them
    // with fresh values when it lands.
    _loadCachedIdentity(prefs);
    await _loadTray();
    auth.authStateChanges().listen((u) async {
      user = u;
      if (u == null) {
        _resolveRun++;
        _teardown();
        _detachSessionWatchers();
        role = 'none';
        ownerUid = null;
        businesses = [];
        activeBusinessId = null;
        // Signed out: the cached identity must not leak into the
        // next sign-in on this device.
        await _clearCachedIdentity();
        noAccess = false;
        planRegistry = null;
        planCounters = null;
        ownPayments = [];
        ownEvents = [];
        businessInvites = [];
        businessMembers = [];
        planRefusal = null;
        ready = true;
        notifyListeners();
        return;
      }
      await _resolveSession(u, initial: true);
      notifyListeners();
    });
  }

  /* ---------------- cache-first identity (fix round 2026-10-25) ---- */

  /// Keys for the last-known business identity. Only identity
  /// (ids, names, roles) is cached — never figures: money values
  /// are always live from the subscriptions, never stale paint.
  static const _cachedBusinessesKey = 'dukaan-ai-cached-businesses';
  static const _cachedActiveKey = 'dukaan-ai-cached-active';

  /// Hydrate the shell identity from the last resolution, before
  /// any network call. Never throws: a corrupt cache degrades to
  /// today's empty state, never to a crash.
  void _loadCachedIdentity(SharedPreferences prefs) {
    try {
      final raw = prefs.getString(_cachedBusinessesKey);
      if (raw == null || raw.isEmpty) return;
      final decoded = jsonDecode(raw);
      if (decoded is! List) return;
      final cached = <BusinessSummary>[];
      for (final e in decoded) {
        if (e is! Map) continue;
        final bid = e['businessId']?.toString() ?? '';
        final name = e['name']?.toString() ?? '';
        final role = e['role']?.toString() ?? '';
        if (bid.isEmpty || role.isEmpty) continue;
        cached.add(BusinessSummary(
          businessId: bid,
          name: name,
          role: role,
          own: e['own'] == true,
        ));
      }
      if (cached.isEmpty) return;
      businesses = cached;
      final activeId = prefs.getString(_cachedActiveKey);
      final match = cached.where((b) => b.businessId == activeId).toList();
      final active = match.isNotEmpty ? match.first : cached.first;
      activeBusinessId = active.businessId;
      ownerUid = active.businessId;
      role = active.role;
    } catch (_) {
      // Corrupt cache: ignore, resolution will overwrite.
    }
  }

  Future<void> _persistCachedIdentity() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final list = businesses
          .map((b) => {
                'businessId': b.businessId,
                'name': b.name,
                'role': b.role,
                'own': b.own,
              })
          .toList();
      await prefs.setString(_cachedBusinessesKey, jsonEncode(list));
      if (activeBusinessId != null) {
        await prefs.setString(_cachedActiveKey, activeBusinessId!);
      }
    } catch (_) {
      // Cache persistence must never break resolution.
    }
  }

  Future<void> _clearCachedIdentity() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_cachedBusinessesKey);
      await prefs.remove(_cachedActiveKey);
    } catch (_) {
      // Best effort only.
    }
  }

  /* ---------------- G5 session resolution (web AuthProvider) -------- */

  /// Execute a pure write plan (lib/tenancy) against Firestore,
  /// mirroring the web's applyPlatformWrites: set/update/add in
  /// ONE batch; 'index' writes are already resolved into the
  /// caller's in-memory entries and never reach here. Registry
  /// writes into businesses/ convert a string plan.trialEndsAt
  /// to a Timestamp (the console reads Timestamps), exactly as
  /// the web's executor does.
  Future<void> _applyPlatformWrites(List<PlatformWrite> writes) async {
    final live = writes.where((w) => w.kind != 'index').toList();
    if (live.isEmpty) return;
    final batch = db.batch();
    for (final w in live) {
      var data = w.data ?? const <String, dynamic>{};
      if (w.path != null && w.path!.startsWith('businesses/')) {
        final plan = data['plan'];
        if (plan is Map && plan['trialEndsAt'] is String) {
          data = {
            ...data,
            'plan': {
              ...Map<String, dynamic>.from(plan),
              'trialEndsAt': Timestamp.fromDate(DateTime.parse(plan['trialEndsAt'] as String)),
            },
          };
        }
      }
      switch (w.kind) {
        case 'set':
          batch.set(db.doc(w.path!), data);
        case 'update':
          batch.update(db.doc(w.path!), data);
        case 'add':
          batch.set(db.collection(w.collection!).doc(), data);
      }
    }
    await batch.commit();
  }

  /// Session resolution, mirroring web resolveSession leg for
  /// leg (design §5.1): ① claim pending invites for the verified
  /// email, ② the legacy staffIndex leg with membership backfill,
  /// ③ the userMemberships index healed against live membership
  /// docs (persisted only when it changed), ④ the caller's own
  /// business + display names. Every leg failure-isolated.
  Future<({List<BusinessSummary> list, String? preferredBid})> _resolveSessionReads(User u) async {
    final uid = u.uid;
    final email = (u.email ?? '').trim().toLowerCase();
    final nowISO = isoUtc(DateTime.now());
    var entries = <IndexEntry>[];
    String? preferredBid;

    Future<MembershipDoc?> membershipOf(String bid) async {
      try {
        final m = await db.collection('businessMembers').doc(bid).collection('members').doc(uid).get();
        return (m.exists && m.data() != null) ? MembershipDoc.fromMap(m.data()!) : null;
      } catch (_) {
        return null;
      }
    }

    /* ① pending-invite claims, wherever they live */
    if (email.isNotEmpty) {
      try {
        final snap = await db.collectionGroup('invites').where('email', isEqualTo: email).get();
        for (final d in snap.docs) {
          final bid = d.reference.parent.parent?.id;
          if (bid == null || bid == uid) continue;
          final invite = InviteDoc.fromMap(d.data());
          if (invite.status != 'pending') continue;
          final res = planClaim(
            businessId: bid, callerUid: uid, callerEmail: email,
            invite: invite, existingMembership: await membershipOf(bid), nowISO: nowISO,
          );
          if (res.ok) {
            try {
              await _applyPlatformWrites(res.writes);
            } catch (_) {}
            entries = indexWith(entries, IndexEntry(businessId: bid, role: res.role ?? 'manager'));
            preferredBid ??= bid;
          }
        }
      } catch (_) {
        /* index not deployed yet / offline — claims retry next sign-in */
      }
    }

    /* ② legacy staffIndex: backfill the membership mirror */
    String? legacyBid;
    var legacyRole = 'manager';
    if (email.isNotEmpty) {
      try {
        final idx = await db.collection('staffIndex').doc(email).get();
        if (idx.exists && idx.data() != null) {
          final data = idx.data()!;
          final idxOwner = data['ownerUid']?.toString() ?? '';
          if (idxOwner.isNotEmpty && idxOwner != uid) {
            legacyBid = idxOwner;
            legacyRole = resolveRoleValue(data['role']);
            final existing = await membershipOf(idxOwner);
            final writes = planLegacyBackfill(
              businessId: idxOwner, callerUid: uid, callerEmail: email,
              staffIndex: data,
              existingMembership: existing, nowISO: nowISO,
            );
            if (writes.isNotEmpty) {
              try {
                await _applyPlatformWrites(writes);
              } catch (_) {}
              entries = indexWith(entries, IndexEntry(businessId: idxOwner, role: legacyRole));
            } else if (existing != null) {
              entries = indexWith(
                entries,
                IndexEntry(
                  businessId: idxOwner,
                  role: resolveRoleValue(existing.role.isNotEmpty ? existing.role : data['role']),
                ),
              );
            } else {
              // Backfill refused (e.g. rules) — the legacy leg
              // still grants access (web parity).
              entries = indexWith(entries, IndexEntry(businessId: idxOwner, role: legacyRole));
            }
            preferredBid ??= idxOwner;
          }
        }
      } catch (_) {
        /* legacy leg unreadable — resolution continues */
      }
    }

    /* ③ the switcher index, healed against live memberships */
    var storedEntries = <IndexEntry>[];
    try {
      final ix = await db.collection('userMemberships').doc(uid).get();
      final raw = ix.data()?['entries'];
      if (raw is List) {
        for (final e in raw) {
          if (e is Map) {
            final bid = e['businessId']?.toString() ?? '';
            if (bid.isNotEmpty && bid != uid) {
              final entry = IndexEntry(businessId: bid, role: resolveRoleValue(e['role']));
              storedEntries = [...storedEntries, entry];
              entries = indexWith(entries, entry);
            }
          }
        }
      }
    } catch (_) {
      /* index unreadable — claims/backfill above still resolved */
    }
    if (entries.isNotEmpty) {
      final live = <String, MembershipDoc?>{};
      for (final e in entries) {
        live[e.businessId] = await membershipOf(e.businessId);
      }
      entries = healIndex(entries, live).kept;
      // The legacy-resolved business may legitimately have NO
      // membership doc yet (backfill refused) — it survives.
      if (legacyBid != null && !entries.any((e) => e.businessId == legacyBid)) {
        entries = indexWith(
          entries,
          IndexEntry(businessId: legacyBid, role: live[legacyBid]?.role ?? legacyRole),
        );
      }
      String enc(List<IndexEntry> l) =>
          jsonEncode([for (final e in l) {'businessId': e.businessId, 'role': e.role}]);
      if (enc(entries) != enc(storedEntries)) {
        try {
          await db.collection('userMemberships').doc(uid).set(
            {
              'entries': [for (final e in entries) {'businessId': e.businessId, 'role': e.role}],
              'updatedAt': nowISO,
            },
            SetOptions(merge: true),
          );
        } catch (_) {
          /* the healed list still drives this session */
        }
      }
    }

    /* ④ own business + display names */
    ({String businessId, String name})? own;
    try {
      final ownDoc = await db.collection('users').doc(uid).get();
      final ownReg = await db.collection('businesses').doc(uid).get();
      if (ownDoc.exists || ownReg.exists) own = (businessId: uid, name: '');
    } catch (_) {
      /* treated as no own business; the default-own path covers it */
    }
    final names = <String, String>{};
    final bids = <String>[
      if (own != null) uid,
      for (final e in entries)
        if (e.businessId != uid) e.businessId,
    ];
    for (final bid in bids) {
      try {
        final reg = await db.collection('businesses').doc(bid).get();
        final n = reg.data()?['name'];
        if (n is String && n.isNotEmpty) names[bid] = n;
      } catch (_) {}
      if (!names.containsKey(bid)) {
        try {
          final od = await db.collection('users').doc(bid).get();
          final sn = od.data()?['shopName'];
          if (sn is String && sn.isNotEmpty) names[bid] = sn;
        } catch (_) {}
      }
    }
    final list = buildSwitcherList(
      own: own == null ? null : (businessId: own.businessId, name: own.name),
      entries: entries,
      names: names,
    );
    return (list: list, preferredBid: preferredBid);
  }

  Future<void> _resolveSession(User u, {required bool initial}) async {
    final run = ++_resolveRun;
    try {
      final res = await _resolveSessionReads(u);
      if (run != _resolveRun || user?.uid != u.uid) return;
      await _applyResolution(u, res, initial: initial);
    } catch (_) {
      if (run != _resolveRun) return;
      if (initial) {
        // Resolution failed wholesale (offline first run): fall
        // back to the pre-G behaviour — own namespace, owner.
        businesses = [];
        activeBusinessId = u.uid;
        noAccess = false;
        ownerUid = u.uid;
        role = 'owner';
        _subscribeAll();
        _attachSessionWatchers();
        ready = true;
        notifyListeners();
      }
    }
  }

  Future<void> _applyResolution(
    User u,
    ({List<BusinessSummary> list, String? preferredBid}) res, {
    required bool initial,
  }) async {
    if (res.list.isEmpty) {
      if (initial) {
        // The pre-G default, preserved exactly: a signed-in
        // account with no memberships owns its own namespace.
        businesses = [];
        activeBusinessId = u.uid;
        noAccess = false;
        ownerUid = u.uid;
        role = 'owner';
      } else {
        // A re-resolution that finds nothing: the person was
        // removed from their last business mid-session.
        businesses = [];
        activeBusinessId = null;
        noAccess = true;
        ownerUid = null;
        role = 'none';
        _teardown();
        _detachSessionWatchers();
        ready = true;
        notifyListeners();
        return;
      }
    } else {
      final prefs = await SharedPreferences.getInstance();
      final persisted = prefs.getString('dukaan-ai-active-business');
      BusinessSummary? active;
      for (final b in res.list) {
        if (b.businessId == persisted) active = b;
      }
      if (active == null) {
        for (final b in res.list) {
          if (b.businessId == res.preferredBid) active = b;
        }
      }
      active ??= res.list.first;
      businesses = res.list;
      activeBusinessId = active.businessId;
      noAccess = false;
      ownerUid = active.businessId;
      role = active.role;
      // Cache-first identity: persist the resolved list + active
      // pick so the next cold start paints them instantly.
      await _persistCachedIdentity();
    }
    planRegistry = null;
    planCounters = null;
    ownPayments = [];
    ownEvents = [];
    businessInvites = [];
    businessMembers = [];
    _subscribeAll();
    _attachSessionWatchers();
    await _ensureRegistry(u);
    ready = true;
    notifyListeners();
  }

  /// Header switcher action: re-pointing ownerUid/role is the
  /// whole switch — every subscription tears down and the new
  /// business's attach (design §1.4). The pick persists under
  /// the web's key.
  Future<void> switchBusiness(String bid) async {
    BusinessSummary? target;
    for (final b in businesses) {
      if (b.businessId == bid) target = b;
    }
    if (target == null || bid == activeBusinessId) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('dukaan-ai-active-business', bid);
    // Keep the cache-first pick consistent with the switch.
    await prefs.setString(_cachedActiveKey, bid);
    activeBusinessId = bid;
    role = target.role;
    ownerUid = bid;
    noAccess = false;
    planRegistry = null;
    planCounters = null;
    ownPayments = [];
    ownEvents = [];
    businessInvites = [];
    businessMembers = [];
    _subscribeAll();
    _attachSessionWatchers();
    notifyListeners();
  }

  void _detachSessionWatchers() {
    for (final s in _sessionSubs) {
      s.cancel();
    }
    _sessionSubs.clear();
  }

  /// G1 watchers (design §5.1): the membership index changing
  /// under us (another device claimed/removed something) or the
  /// ACTIVE business's membership doc disappearing (the owner
  /// removed this member) re-resolves the session immediately —
  /// removal takes effect mid-session.
  void _attachSessionWatchers() {
    _detachSessionWatchers();
    final u = user;
    if (u == null) return;
    _sessionSubs.add(db.collection('userMemberships').doc(u.uid).snapshots().listen((snap) {
      if (!snap.exists) return;
      final raw = snap.data()?['entries'];
      final bids = <String>[
        if (raw is List)
          for (final e in raw)
            if (e is Map && e['businessId'] is String) e['businessId'] as String,
      ]..sort();
      final mine = businesses.where((b) => !b.own).map((b) => b.businessId).toList()..sort();
      if (bids.join(',') != mine.join(',')) {
        _resolveSession(u, initial: false);
      }
    }, onError: (_) {}));
    final active = activeBusinessId;
    if (active != null && active != u.uid) {
      _sessionSubs.add(db
          .collection('businessMembers')
          .doc(active)
          .collection('members')
          .doc(u.uid)
          .snapshots()
          .listen((snap) {
        if (!snap.exists) _resolveSession(u, initial: false);
      }, onError: (_) {}));
    }
  }

  /// G2 wiring (design §7.2): a pre-G own business with no
  /// registry yet receives its migration write plan on the
  /// owner's load — founding, or a Standard trial opening on
  /// the registry-birth date. One-shot per sign-in; every
  /// failure swallowed (the app still opens; web parity).
  Future<void> _ensureRegistry(User u) async {
    if (_ensuredRegistryFor == u.uid) return;
    _ensuredRegistryFor = u.uid;
    try {
      if (ownerUid != u.uid || role != 'owner') return;
      final regSnap = await db.collection('businesses').doc(u.uid).get();
      if (regSnap.exists) return;
      final me = await db.collection('users').doc(u.uid).get();
      if (!me.exists) return;
      final billsSnap = await _col('bills').get();
      final salesSnap = await _col('sales').get();
      final ownerData = me.data() ?? {};
      final writes = planMigration(
        ownerUid: u.uid,
        ownerEmail: ownerData['email']?.toString() ?? u.email ?? '',
        shopName: ownerData['shopName']?.toString() ?? '',
        phone: ownerData['phone']?.toString() ?? '',
        staffEmails: ((ownerData['staffEmails'] as List?) ?? const [])
            .map((e) => e.toString())
            .toList(),
        registryExists: false,
        bills: billsSnap.docs
            .map((d) => (ts: d.data()['ts']?.toString() ?? '', status: d.data()['status']?.toString()))
            .toList(),
        sales: salesSnap.docs
            .map((d) => (
                  ts: d.data()['ts']?.toString() ?? '',
                  billId: d.data()['billId']?.toString(),
                  kind: d.data()['kind']?.toString(),
                ))
            .toList(),
        nowISO: isoUtc(DateTime.now()),
      );
      await _applyPlatformWrites(writes);
    } catch (_) {}
  }

  /// Fix Round 1 · F3 (mirrors the web store's load re-base):
  /// derive a doc's effective `dayOffset` from its `ts` before
  /// any fromMap reads it. A stored dayOffset is a creation-day
  /// stamp (always 0, never recomputed), so without this every
  /// "today"-scoped derivation widens day after day — the
  /// owner's live shop counted its 22-Oct rows as "today" on
  /// 24-Oct. Docs without a parseable ts keep their stamp.
  Map<String, dynamic> _agedDoc(Map<String, dynamic> m) {
    final raw = m['dayOffset'];
    final ts = m['ts'];
    if (raw is! num || ts is! String) return m;
    final eff = dayOffsetForTs(ts, todayPktISO(), raw.toInt());
    if (eff == raw.toInt()) return m;
    return {...m, 'dayOffset': eff};
  }

  void _subscribeAll() {
    _teardown();
    storefront = null;
    storeOrders = [];
    void sub<T>(String name, T Function(String, Map<String, dynamic>) fromMap, void Function(List<T>) apply) {
      _subs.add(_col(name).snapshots().listen((snap) {
        _pendingByCollection[name] = snap.metadata.hasPendingWrites;
        fromCache = snap.metadata.isFromCache;
        apply(snap.docs.map((d) => fromMap(d.id, _agedDoc(d.data()))).toList());
        ready = true;
        notifyListeners();
      }, onError: (Object e) => lastError = e.toString()));
    }

    _subs.add(_ownerRef.snapshots().listen((snap) {
      ownerDoc = snap.data() ?? {};
      // Staff role may resolve from the owner doc's staff[] too.
      if (user != null && ownerUid != user!.uid) {
        final staff = (ownerDoc['staff'] as List?) ?? const [];
        for (final s in staff) {
          if (s is Map && (s['email']?.toString().toLowerCase() ?? '') == (user!.email ?? '').toLowerCase()) {
            role = resolveStaffRole(Map<String, dynamic>.from(s));
          }
        }
      }
      notifyListeners();
    }, onError: (Object e) => lastError = e.toString()));

    sub<Product>('products', (id, m) => Product.fromMap(id, m), (v) {
      products = v;
      // H4: a product change may move the store's PUBLIC content
      // — the auto-republish seam (§2.2), debounced like the web's.
      _scheduleAutoRepublish();
    });
    sub<Sale>('sales', (id, m) => Sale.fromMap(id, m), (v) => sales = v);
    sub<Bill>('bills', (id, m) => Bill.fromMap(id, m), (v) => bills = v);
    sub<SaleReturn>('returns', (id, m) => SaleReturn.fromMap(id, m), (v) => returns = v);
    sub<CreditEntry>('credits', (id, m) => CreditEntry.fromMap(id, m), (v) => credits = v);
    sub<Customer>('customers', (id, m) => Customer.fromMap(id, m), (v) => customers = v);
    sub<JournalEntry>('journal', (id, m) => JournalEntry.fromMap(id, m), (v) {
      journal = v..sort((a, b) => a.ts.compareTo(b.ts));
    });
    sub<MoneyAccount>('accounts', (id, m) => MoneyAccount.fromMap(id, m), (v) => accounts = v);
    sub<TaxSlab>('taxSlabs', (id, m) => TaxSlab.fromMap(id, m), (v) => taxSlabs = v);
    sub<DayClose>('dayCloses', (id, m) => DayClose.fromMap(id, m), (v) => dayCloses = v);
    sub<Warehouse>('warehouses', (id, m) => Warehouse.fromMap(id, m), (v) => warehouses = v);
    sub<StockLevel>('stockLevels', (id, m) => StockLevel.fromMap(id, m), (v) => stockLevels = v);
    sub<Expense>('expenses', (id, m) => Expense.fromMap(id, m), (v) => expenses = v);
    sub<SupplierPayment>('supplierPayments', (id, m) => SupplierPayment.fromMap(id, m), (v) => supplierPayments = v);
    sub<CashEntry>('cashEntries', (id, m) => CashEntry.fromMap(id, m), (v) => cashEntries = v);
    sub<Supplier>('suppliers', (id, m) => Supplier.fromMap(id, m), (v) => suppliers = v);
    sub<Purchase>('purchases', (id, m) => Purchase.fromMap(id, m), (v) => purchases = v);
    sub<PurchaseReturn>('purchaseReturns', (id, m) => PurchaseReturn.fromMap(id, m), (v) => purchaseReturns = v);
    sub<Quotation>('quotations', (id, m) => Quotation.fromMap(id, m), (v) => quotations = v);
    sub<SaleOrder>('saleOrders', (id, m) => SaleOrder.fromMap(id, m), (v) => saleOrders = v);
    sub<DeliveryChallan>('deliveryChallans', (id, m) => DeliveryChallan.fromMap(id, m), (v) => deliveryChallans = v);
    sub<PurchaseOrder>('purchaseOrders', (id, m) => PurchaseOrder.fromMap(id, m), (v) => purchaseOrders = v);
    sub<DocNote>('notes', (id, m) => DocNote.fromMap(id, m), (v) => notes = v);
    sub<Cheque>('cheques', (id, m) => Cheque.fromMap(id, m), (v) => cheques = v);
    sub<StockTransfer>('stockTransfers', (id, m) => StockTransfer.fromMap(id, m), (v) => stockTransfers = v);
    sub<Bom>('boms', (id, m) => Bom.fromMap(id, m), (v) => boms = v);
    sub<ProductionOrder>('productionOrders', (id, m) => ProductionOrder.fromMap(id, m), (v) => productionOrders = v);
    sub<Job>('jobs', (id, m) => Job.fromMap(id, m), (v) => jobs = v);
    sub<Employee>('employees', (id, m) => Employee.fromMap(id, m), (v) => employees = v);
    sub<AttendanceMonth>('attendance', (id, m) => AttendanceMonth.fromMap(id, m), (v) => attendance = v);
    sub<PayrollRun>('payrollRuns', (id, m) => PayrollRun.fromMap(id, m), (v) => payrollRuns = v);
    sub<Loan>('loans', (id, m) => Loan.fromMap(id, m), (v) => loans = v);
    sub<PeriodDoc>('periods', (id, m) => PeriodDoc.fromMap(id, m), (v) => periods = v);
    sub<BrandingAsset>('branding', (id, m) => BrandingAsset.fromMap(id, m), (v) => brandingAssets = v);
    // H5 (design §3.3): the WhatsApp marketing trio — templates
    // by name, campaigns + the send log by ts (the web's sub
    // comparators; the queue's own (ts, id) order is re-applied
    // inside advanceWaSend, as on the web).
    sub<WaTemplate>('waTemplates', (id, m) => WaTemplate.fromMap(id, m), (v) {
      waTemplates = v..sort((a, b) => a.name.compareTo(b.name));
    });
    sub<WaCampaign>('waCampaigns', (id, m) => WaCampaign.fromMap(id, m), (v) {
      waCampaigns = v..sort((a, b) => a.ts.compareTo(b.ts));
    });
    sub<WaSend>('waSends', (id, m) => WaSend.fromMap(id, m), (v) {
      waSends = v..sort((a, b) => a.ts.compareTo(b.ts));
    });

    // G5 (design §5.1): the SaaS layer for the ACTIVE business —
    // subscribed for every role, each listener swallowing its
    // errors (a missing index/permission never breaks the shop).
    _subs.add(db.collection('businesses').doc(ownerUid).snapshots().listen((snap) {
      planRegistry = (snap.exists && snap.data() != null)
          ? BusinessRegistryDoc.fromMap(_normRegistryMap(snap.data()!))
          : null;
      notifyListeners();
    }, onError: (_) {}));
    _subs.add(db.collection('businessCounters').doc(ownerUid).snapshots().listen((snap) {
      planCounters = (snap.exists && snap.data() != null)
          ? BusinessCountersDoc.fromMap(snap.data()!)
          : null;
      notifyListeners();
    }, onError: (_) {}));
    _subs.add(db
        .collection('businessEvents')
        .where('businessId', isEqualTo: ownerUid)
        .orderBy('at', descending: true)
        .limit(50)
        .snapshots()
        .listen((snap) {
      ownEvents = snap.docs.map((d) => BusinessEventDoc.fromMap(_normEventMap(d.data()))).toList();
      notifyListeners();
    }, onError: (_) {}));
    _subs.add(db.collection('businessInvites').doc(ownerUid).collection('invites').snapshots().listen((snap) {
      businessInvites = snap.docs.map((d) => InviteDoc.fromMap(d.data())).toList();
      notifyListeners();
    }, onError: (_) {}));
    _subs.add(db.collection('businessMembers').doc(ownerUid).collection('members').snapshots().listen((snap) {
      businessMembers = [
        for (final d in snap.docs) (memberUid: d.id, doc: MembershipDoc.fromMap(d.data())),
      ];
      notifyListeners();
    }, onError: (_) {}));
    if (role == 'owner') {
      // The owner's own platform payments + the console's
      // payment instructions (owner-only reads, as on web).
      _subs.add(db
          .collection('platformPayments')
          .where('businessId', isEqualTo: ownerUid)
          .orderBy('submittedAt', descending: true)
          .snapshots()
          .listen((snap) {
        ownPayments = snap.docs.map((d) => PlatformPaymentDoc.fromMap(d.id, _normPaymentMap(d.data()))).toList();
        notifyListeners();
      }, onError: (_) {}));
      _subs.add(db.collection('platformConfig').doc('main').snapshots().listen((snap) {
        platformConfig = (snap.exists && snap.data() != null)
            ? PlatformConfigDoc.fromMap(snap.data()!)
            : PlatformConfigDoc.empty;
        notifyListeners();
      }, onError: (_) {}));
    }

    // H4 (design §2): the storefront snapshot + order inbox for
    // the ACTIVE business — member reads through rules v10 (the
    // snapshot's public leg is separate and unauthenticated).
    // Each listener swallows its errors like the G-layer subs: a
    // missing composite index never breaks the shop.
    _subs.add(db
        .collection('storefronts')
        .where('businessId', isEqualTo: ownerUid)
        .limit(1)
        .snapshots()
        .listen((snap) {
      storefront = snap.docs.isEmpty ? null : StorefrontDoc.fromMap(snap.docs.first.data());
      notifyListeners();
    }, onError: (_) {}));
    _subs.add(db
        .collection('storeOrders')
        .where('businessId', isEqualTo: ownerUid)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .listen((snap) {
      storeOrders = [
        for (final d in snap.docs) StoreOrder.fromMap(d.id, _normStoreOrderMap(d.data())),
      ];
      notifyListeners();
    }, onError: (_) {}));
  }

  void _teardown() {
    _autoRepublishTimer?.cancel();
    _autoRepublishTimer = null;
    for (final s in _subs) {
      s.cancel();
    }
    _subs.clear();
    _pendingByCollection.clear();
  }

  Future<void> signOut() => auth.signOut();

  /* ---------------- the guard + batch funnel ---------------- */

  /// The A5 choke point: stamp + lock-check EVERY entry before any
  /// write is composed. A refusal is atomic — nothing half-commits.
  List<JournalEntry> guardPostings(List<JournalEntry> entries) =>
      entries.map((e) => preparePosting(e.copyWith(originDevice: e.originDevice ?? originDevice), lockedThrough)).toList();

  /* ---------------- G5 plan gate + counter rides ---------------- */

  /// The posting refusal, checked BEFORE composing (web parity:
  /// planInvoiceCheck at the top of postBill/recordSale). A
  /// refusal is surfaced as the shell's plan banner — never a
  /// raw rules error (§5.4). No registry ⇒ nothing refuses.
  bool _planInvoiceCheck() {
    final reg = planRegistry;
    if (reg == null) return true;
    final refusal = planInvoiceRefusal(reg, planCounters, isoUtc(DateTime.now()));
    if (refusal == null) return true;
    planRefusal = refusal;
    notifyListeners();
    return false;
  }

  /// The counter ride (§4.2): the FULL counter shape,
  /// re-derived from the live doc, written inside the posting
  /// batch (merge: the migration baseline marker survives).
  void _rideInvoiceCounter(WriteBatch batch) {
    final reg = planRegistry;
    final ctr = planCounters;
    if (reg == null || ctr == null || ownerUid == null) return;
    final next = nextInvoiceCounter(ctr, reg.plan, isoUtc(DateTime.now()));
    batch.set(
      db.collection('businessCounters').doc(ownerUid),
      next.toMap(),
      SetOptions(merge: true),
    );
  }

  void _rideMemberCounter(WriteBatch batch, int delta) {
    final ctr = planCounters;
    if (ctr == null || ownerUid == null) return;
    batch.set(
      db.collection('businessCounters').doc(ownerUid),
      nextMemberCounter(ctr, delta).toMap(),
      SetOptions(merge: true),
    );
  }

  void _addBusinessEvent(WriteBatch batch, String kind, Map<String, dynamic> detail) {
    if (ownerUid == null || user == null) return;
    batch.set(db.collection('businessEvents').doc(), {
      'businessId': ownerUid,
      'kind': kind,
      'actor': user!.uid,
      'at': _now(),
      'detail': detail,
    });
  }

  /// Renewal submission (design §5.5, owner role): ONE platform
  /// write born `submitted` — ZERO journal effect; the posting
  /// choke point above is untouched. Returns web's outcome
  /// vocabulary: a quote refusal name, 'unavailable' or
  /// 'write-failed'.
  Future<({bool ok, String? reason})> submitRenewalPayment({
    required String planId,
    required String billing,
    required String method,
    required String reference,
    String? ownerNote,
  }) async {
    if (role != 'owner' || ownerUid == null || user == null || ownerUid != user!.uid) {
      return (ok: false, reason: 'unavailable');
    }
    final res = planRenewalSubmission(
      registry: planRegistry,
      businessId: ownerUid!,
      planId: planId,
      billing: billing,
      method: method,
      reference: reference,
      ownerNote: ownerNote,
      actor: user!.uid,
      now: isoUtc(DateTime.now()),
    );
    if (!res.ok) return (ok: false, reason: res.reason);
    try {
      await _applyPlatformWrites(res.writes);
      return (ok: true, reason: null);
    } catch (_) {
      return (ok: false, reason: 'write-failed');
    }
  }

  /* ---------------- Phase G · G6: backup & restore ----------------
   * Design §9 + §3.7, the web actions' mirrors: the export
   * assembles from the owner's own one-shot reads and consults
   * nothing about the business's plan (reads are never gated);
   * the restore executes the pure core's plan — document writes
   * in plan order, in batches, the restore.performed event last —
   * and composes no journal entry. */

  Future<Map<String, dynamic>?> exportBusinessBackup() async {
    if (role != 'owner' || ownerUid == null || user == null || ownerUid != user!.uid) {
      return null;
    }
    final bid = ownerUid!;
    try {
      final collections = <String, List<Map<String, dynamic>>>{};
      for (final name in bk.tenantCollections) {
        final snap = await db.collection('users').doc(bid).collection(name).get();
        collections[name] = [
          for (final d in snap.docs) _exportableDoc({...d.data(), 'id': d.id}),
        ];
      }
      final ownerSnap = await db.collection('users').doc(bid).get();
      Future<Map<String, dynamic>?> single(String path) async {
        final s = await db.doc(path).get();
        return (s.exists && s.data() != null) ? _exportableDoc(s.data()!) : null;
      }

      Future<List<bk.KeyedDoc>> keyed(String path) async {
        final snap = await db.collection(path).get();
        return [
          for (final d in snap.docs)
            bk.KeyedDoc(key: d.id, data: _exportableDoc(d.data())),
        ];
      }

      Future<List<bk.KeyedDoc>> slice(String name) async {
        final snap =
            await db.collection(name).where('businessId', isEqualTo: bid).get();
        return [
          for (final d in snap.docs)
            bk.KeyedDoc(key: d.id, data: _exportableDoc(d.data())),
        ];
      }

      // H4: the business's published snapshot for the backup's
      // platform slice (keyed by its slug — the doc id).
      Future<bk.KeyedDoc?> front() async {
        final snap = await db
            .collection('storefronts')
            .where('businessId', isEqualTo: bid)
            .limit(1)
            .get();
        if (snap.docs.isEmpty) return null;
        final d = snap.docs.first;
        return bk.KeyedDoc(key: d.id, data: _exportableDoc(d.data()));
      }

      return bk.assembleBackup(
        businessId: bid,
        exportedAt: isoUtc(DateTime.now()),
        exportedBy: 'flutter',
        owner: (ownerSnap.exists && ownerSnap.data() != null)
            ? _exportableDoc(ownerSnap.data()!)
            : <String, dynamic>{},
        collections: collections,
        platform: bk.BackupPlatformSlice(
          registry: await single('businesses/$bid'),
          counters: await single('businessCounters/$bid'),
          stats: await single('businessStats/$bid'),
          members: await keyed('businessMembers/$bid/members'),
          invites: await keyed('businessInvites/$bid/invites'),
          events: await slice('businessEvents'),
          payments: await slice('platformPayments'),
          storefront: await front(),
          storeOrders: await slice('storeOrders'),
        ),
      );
    } catch (_) {
      return null;
    }
  }

  Future<bk.RestorePlan?> planBusinessRestore(Object? file) async {
    if (role != 'owner' || ownerUid == null || user == null || ownerUid != user!.uid) {
      return null;
    }
    final bid = ownerUid!;
    try {
      final collections = <String, List<Map<String, dynamic>>>{};
      for (final name in bk.tenantCollections) {
        final snap = await db.collection('users').doc(bid).collection(name).get();
        collections[name] = [
          for (final d in snap.docs) {...d.data(), 'id': d.id},
        ];
      }
      final ownerSnap = await db.collection('users').doc(bid).get();
      Future<List<bk.KeyedDoc>> keyed(String path) async {
        final snap = await db.collection(path).get();
        return [
          for (final d in snap.docs) bk.KeyedDoc(key: d.id, data: d.data()),
        ];
      }

      // H4: the restore's storefront subset probe — the target
      // business's own snapshot (any slug) + inbox. The orders
      // ride exportableDoc so their createdAt compares like with
      // like (ISO in the file, Timestamp on the live doc).
      final frontSnap = await db
          .collection('storefronts')
          .where('businessId', isEqualTo: bid)
          .limit(1)
          .get();
      final orderSnap =
          await db.collection('storeOrders').where('businessId', isEqualTo: bid).get();

      return bk.planRestore(
        file: file,
        targetBusinessId: bid,
        target: bk.RestoreTarget(
          owner: ownerSnap.exists ? ownerSnap.data() : null,
          collections: collections,
          members: await keyed('businessMembers/$bid/members'),
          invites: await keyed('businessInvites/$bid/invites'),
          storefront: frontSnap.docs.isEmpty
              ? null
              : bk.KeyedDoc(key: frontSnap.docs.first.id, data: frontSnap.docs.first.data()),
          storeOrders: [
            for (final d in orderSnap.docs)
              bk.KeyedDoc(key: d.id, data: _exportableDoc(d.data())),
          ],
        ),
        actorUid: user!.uid,
        nowISO: isoUtc(DateTime.now()),
      );
    } catch (_) {
      return null;
    }
  }

  Future<({bool ok, String? reason})> executeBusinessRestore(
      bk.RestorePlan plan) async {
    if (role != 'owner' || ownerUid == null || user == null || ownerUid != user!.uid) {
      return (ok: false, reason: 'unavailable');
    }
    if (!plan.ok) return (ok: false, reason: plan.reason);
    try {
      var batch = db.batch();
      var n = 0;
      Future<void> flush() async {
        if (n > 0) {
          await batch.commit();
          batch = db.batch();
          n = 0;
        }
      }

      for (final w in plan.writes) {
        if (w.kind == 'set') {
          var data = w.data;
          // H4: an inbox doc's createdAt rides the backup as an
          // ISO string (the export's canonical form); restore it
          // as the timestamp it was born as, so a restored inbox
          // is indistinguishable in type from a live one.
          if (w.path!.startsWith('storeOrders/') && data['createdAt'] is String) {
            data = {
              ...data,
              'createdAt': Timestamp.fromDate(DateTime.parse(data['createdAt'] as String)),
            };
          }
          batch.set(db.doc(w.path!), data);
        } else {
          batch.set(db.collection(w.collection!).doc(), w.data);
        }
        n++;
        if (n >= 450) await flush();
      }
      await flush();
      return (ok: true, reason: null);
    } catch (_) {
      return (ok: false, reason: 'write-failed');
    }
  }

  /* ---------------- Phase H · H4: the storefront ----------------
   * Design §2, the web actions' mirrors. The publish write is the
   * owner's alone (rules v10 key it to the uid in the doc's
   * businessId); conversion and dismissal are member acts on the
   * `storefront` matrix row, and conversion additionally rides
   * the `saleOrders` row (it births an SO). NOTHING here composes
   * a journal entry: the inbox is paper, the SO is a Phase B
   * document, and money exists only when a bill is later posted
   * from that SO through the ordinary desks. */

  /// The E2 logo asset's data URL for the snapshot (the public
  /// page may read nothing else, so the snapshot carries it).
  String? get _logoDataUrl {
    for (final b in brandingAssets) {
      if (b.kind == 'logo') return b.dataUrl;
    }
    return null;
  }

  /// Publish (or re-publish) the storefront snapshot — OWNER-only
  /// (the public face is an owner act, rules v10 enforce it),
  /// cloud-only. The slug is claimed on the first publish and can
  /// never change afterwards.
  Future<({bool ok, String? reason})> publishStorefront({
    String? slug,
    String? tagline,
    bool taglineSet = false,
    String? notice,
    bool noticeSet = false,
    List<String> excludedProductIds = const [],
    List<String> includeProductIds = const [],
  }) async {
    if (role != 'owner' || ownerUid == null || user == null) {
      return (ok: false, reason: 'unavailable');
    }
    final prev = storefront;
    final slugV = prev?.slug ?? (slug ?? '').trim();
    if (prev == null) {
      final problem = slugProblem(slugV);
      if (problem != null) return (ok: false, reason: 'slug-$problem');
    }
    final snapshot = assembleStorefrontSnapshot(
      businessId: ownerUid!,
      slug: slugV,
      shopName: settings.shopName,
      phone: settings.phone,
      city: planRegistry?.city,
      citySet: true,
      logoDataUrl: _logoDataUrl,
      logoSet: true,
      products: products,
      excludedProductIds: excludedProductIds,
      includeProductIds: includeProductIds,
      tagline: tagline,
      taglineSet: taglineSet,
      notice: notice,
      noticeSet: noticeSet,
      previous: prev,
      nowISO: _now(),
    );
    try {
      await db.collection('storefronts').doc(slugV).set(snapshot.toMap());
      // The slug label rides the owner doc so print/link seams
      // can render the store link without a platform read.
      await updateSettings({'storefrontSlug': slugV});
      return (ok: true, reason: null);
    } catch (_) {
      return (ok: false, reason: 'write-failed');
    }
  }

  /// Switch the store off — the doc and slug are kept; the
  /// public page and the order intake close together (the create
  /// leg requires `enabled`). Owner-only.
  Future<({bool ok, String? reason})> unpublishStorefront() async {
    final prev = storefront;
    if (role != 'owner' || ownerUid == null || user == null || prev == null) {
      return (ok: false, reason: 'unavailable');
    }
    try {
      await db.collection('storefronts').doc(prev.slug).set({
        ...prev.toMap(),
        'enabled': false,
        'updatedAt': _now(),
      });
      return (ok: true, reason: null);
    } catch (_) {
      return (ok: false, reason: 'write-failed');
    }
  }

  /// The auto-republish preference (owner).
  Future<void> setStorefrontAutoRepublish(bool on) async {
    await updateSettings({
      'storefront': {'autoRepublish': on},
    });
  }

  void _scheduleAutoRepublish() {
    _autoRepublishTimer?.cancel();
    _autoRepublishTimer = Timer(const Duration(milliseconds: 1200), () {
      unawaited(_autoRepublishTick());
    });
  }

  /* §2.2's client setting: while the store is live and the owner
   * opted in, a product change re-publishes — but only when the
   * PUBLIC content actually moved (storefrontContentEqual), so
   * the subscription's own echo never loops a write. */
  Future<void> _autoRepublishTick() async {
    final prev = storefront;
    if (role != 'owner' || ownerUid == null || user == null || prev == null || !prev.enabled) {
      return;
    }
    if (settings.storefrontBlock['autoRepublish'] != true) return;
    final next = assembleStorefrontSnapshot(
      businessId: ownerUid!,
      slug: prev.slug,
      shopName: settings.shopName,
      phone: settings.phone,
      city: planRegistry?.city,
      citySet: true,
      logoDataUrl: _logoDataUrl,
      logoSet: true,
      products: products,
      previous: prev,
      nowISO: _now(),
    );
    if (storefrontContentEqual(prev, next)) return;
    try {
      await db.collection('storefronts').doc(prev.slug).set(next.toMap());
    } catch (_) {
      /* best effort — the desk's manual Republish remains */
    }
  }

  /// Convert one inbox order into a sale order — re-priced
  /// against live data at the moment of the act, the customer
  /// resolved (phone-matched, else created), the SO born `open`,
  /// and the inbox doc flipped to `converted` in the SAME batch:
  /// the state is the exactly-once claim.
  Future<({bool ok, String? reason, String? soNumber})> convertStoreOrder(
      String orderId) async {
    if (!can(role, 'storefront', 'write') || !can(role, 'saleOrders', 'write')) {
      return (ok: false, reason: 'forbidden', soNumber: null);
    }
    StoreOrder? order;
    for (final o in storeOrders) {
      if (o.id == orderId) {
        order = o;
        break;
      }
    }
    if (order == null || order.state != 'new') {
      return (ok: false, reason: 'not-new', soNumber: null);
    }
    // Re-plan at the moment of the act — never trust a plan the
    // screen composed earlier against staler data.
    final plan = planStoreConversion(order, storefront, products, customers);
    if (plan == null) {
      return (ok: false, reason: 'nothing-to-convert', soNumber: null);
    }
    final nowISO = _now();
    final number = nextDocNumber(
        'saleOrder', saleOrders.map((o) => o.number).toList(), settings.docSeries);
    // Resolve the customer: the phone match when one exists,
    // else a new customer born from the order's own details — in
    // the SAME batch as the SO and the state flip.
    // Phase H · H6 (audit fix 2): storefront consent is applied
    // HERE, when the order's customer is resolved — from the
    // ORDER's own waOptIn flag, the customer's tick on the
    // public checkout form, and from nothing else. An order
    // without the flag stamps nothing.
    final consent =
        order.waOptIn ? waConsentPatch('storefront', true, nowISO) : null;
    var customerId = plan.customer?.id;
    Customer? newCustomer;
    if (plan.customer == null) {
      newCustomer = Customer(
        id: newId('cu'),
        name: order.customerName,
        phone: order.phone,
        address: '',
        note: '',
        ts: nowISO,
        waOptIn: consent != null ? true : null,
        waOptInAt: consent != null ? nowISO : null,
        waOptInSource: consent != null ? 'storefront' : null,
      );
      customerId = newCustomer.id;
    }
    final soBuilt = buildStoreSaleOrder(
      order,
      plan,
      number: number,
      customerId: customerId,
      customerName: plan.customer?.name ?? order.customerName,
      customerPhone: plan.customer?.phone ?? order.phone,
      products: products,
      taxSlabs: taxSlabs,
      settings: settings,
      nowISO: nowISO,
    );
    if (user == null || ownerUid == null) {
      // A signed-out store holds no inbox (the web's demo path is
      // unreachable the same way); kept so the action is total
      // over the store's modes.
      return (ok: false, reason: 'unavailable', soNumber: null);
    }
    final soId = newId('so');
    try {
      final batch = db.batch();
      if (newCustomer != null) {
        batch.set(_col('customers').doc(newCustomer.id), newCustomer.toMap());
      } else if (consent != null && plan.customer != null) {
        batch.update(_col('customers').doc(plan.customer!.id), consent);
      }
      batch.set(_col('saleOrders').doc(soId), {
        ...soBuilt.toMap(),
        'originDevice': originDevice,
      });
      batch.update(db.collection('storeOrders').doc(order.id), {
        'state': 'converted',
        'convertedSoId': soId,
        'convertedBy': user!.uid,
        'convertedAt': nowISO,
      });
      await batch.commit();
      return (ok: true, reason: null, soNumber: number);
    } catch (_) {
      return (ok: false, reason: 'write-failed', soNumber: null);
    }
  }

  /// Dismiss one inbox order (actor + timestamp stamped;
  /// dismissed paper is kept, never deleted).
  Future<({bool ok, String? reason})> dismissStoreOrder(String orderId) async {
    if (!can(role, 'storefront', 'write')) {
      return (ok: false, reason: 'forbidden');
    }
    StoreOrder? order;
    for (final o in storeOrders) {
      if (o.id == orderId) {
        order = o;
        break;
      }
    }
    if (order == null || order.state != 'new') {
      return (ok: false, reason: 'not-new');
    }
    if (user == null || ownerUid == null) {
      return (ok: false, reason: 'unavailable');
    }
    try {
      await db.collection('storeOrders').doc(order.id).update({
        'state': 'dismissed',
        'dismissedBy': user!.uid,
        'dismissedAt': _now(),
      });
      return (ok: true, reason: null);
    } catch (_) {
      return (ok: false, reason: 'write-failed');
    }
  }

  /* ---------------- Phase H · H5: WhatsApp marketing ----------------
   * Design §3, the web actions' mirrors: the organisation of
   * marketing — consent, templates, campaigns, the send queue,
   * the log — as tenant collections written through the generic
   * doc path (the send step opens wa.me in the shopkeeper's own
   * WhatsApp, §3.4). NOTHING here composes a journal entry:
   * marketing moves no money, and the Dart makeEntry site count
   * does not grow for it. */

  /// The audience-derivation input over live store state (the
  /// web desk's waData, assembled identically).
  WaAudienceData get waAudienceData => WaAudienceData(
        customers: customers,
        credits: credits,
        journal: journal,
        bills: bills,
        saleOrders: saleOrders,
        jobs: jobs,
        settings: ownerDoc,
        nowISO: _now(),
      );

  Future<String> saveWaTemplate({
    String? id,
    required String name,
    required String kind,
    required String body,
  }) async {
    if (!can(role, 'whatsapp', 'write')) return '';
    final now = _now();
    WaTemplate? existing;
    if (id != null) {
      for (final x in waTemplates) {
        if (x.id == id) existing = x;
      }
    }
    final tpl = WaTemplate(
      id: id ?? newId('wt'),
      name: name.trim(),
      kind: kind,
      body: body,
      createdBy: existing?.createdBy ?? user?.uid ?? '',
      ts: existing?.ts ?? now,
    );
    if (tpl.name.isEmpty || tpl.body.trim().isEmpty) return '';
    await _col('waTemplates').doc(tpl.id).set(tpl.toMap());
    return tpl.id;
  }

  Future<void> deleteWaTemplate(String id) async {
    if (!can(role, 'whatsapp', 'write')) return;
    await _col('waTemplates').doc(id).delete();
  }

  Future<String> createWaCampaign({
    required String name,
    required String templateId,
    required WaAudience audience,
  }) async {
    if (!can(role, 'whatsapp', 'write')) return '';
    if (name.trim().isEmpty || templateId.isEmpty) return '';
    final campaign = WaCampaign(
      id: newId('wc'),
      name: name.trim(),
      templateId: templateId,
      audience: audience,
      resolvedCount: null,
      createdBy: user?.uid ?? '',
      ts: _now(),
      state: 'draft',
    );
    await _col('waCampaigns').doc(campaign.id).set(campaign.toMap());
    return campaign.id;
  }

  Future<({bool ok, String? reason, int? count})> launchWaCampaign(
      String campaignId) async {
    if (!can(role, 'whatsapp', 'write')) {
      return (ok: false, reason: 'forbidden', count: null);
    }
    WaCampaign? campaign;
    for (final c in waCampaigns) {
      if (c.id == campaignId) campaign = c;
    }
    if (campaign == null || campaign.state != 'draft') {
      return (ok: false, reason: 'not-draft', count: null);
    }
    if (!waTemplates.any((x) => x.id == campaign!.templateId)) {
      return (ok: false, reason: 'no-template', count: null);
    }
    // The plan gates read the ASSIGNMENT SNAPSHOT (core/whatsapp
    // mirrors the doctrine): a shop whose snapshot lacks the
    // module is refused even if today's catalogue grants it,
    // and a lapsed plan pauses sending — never reading.
    final pv = planView;
    if (!waModuleAllowed(pv)) {
      return (ok: false, reason: 'plan-module', count: null);
    }
    if (!waSendingAllowed(pv)) {
      return (ok: false, reason: 'plan-state', count: null);
    }
    final plan = planWaLaunch(campaign, waAudienceData, () => newId('ws'));
    for (final s in plan.sends) {
      await _col('waSends').doc(s.id).set(s.toMap());
    }
    final launched = campaign.copyWith(
      state: 'sending',
      resolvedCount: plan.resolvedCount,
    );
    await _col('waCampaigns').doc(launched.id).set(launched.toMap());
    return (ok: true, reason: null, count: plan.resolvedCount);
  }

  Future<({bool ok, String? reason, String? outcome})> advanceWaSend(
    String campaignId,
    String act, // "opened" | "sent"
    String? afterId,
  ) async {
    if (!can(role, 'whatsapp', 'write')) {
      return (ok: false, reason: 'forbidden', outcome: null);
    }
    WaCampaign? campaign;
    for (final c in waCampaigns) {
      if (c.id == campaignId) campaign = c;
    }
    if (campaign == null || campaign.state != 'sending') {
      return (ok: false, reason: 'not-sending', outcome: null);
    }
    final sends = waSends.where((s) => s.campaignId == campaignId).toList()
      ..sort((a, b) {
        final t = a.ts.compareTo(b.ts);
        return t != 0 ? t : a.id.compareTo(b.id);
      });
    final step = waQueueStep(sends, customers, afterId);
    if (step == null) {
      return (ok: false, reason: 'queue-empty', outcome: null);
    }
    // A sendable head under a paused plan refuses BEFORE any
    // write (invariant 5: sending degrades; reading and the
    // log's truth do not — a skip verdict below still records,
    // because it sends nothing).
    if (step.action == 'send' && !waSendingAllowed(planView)) {
      return (ok: false, reason: 'plan-state', outcome: null);
    }
    final next = waSendTransition(step.send, act, step.customer);
    await _col('waSends').doc(next.id).set(next.toMap());
    final after = [
      for (final s in sends) s.id == next.id ? next : s,
    ];
    if (waCampaignProgress(after).complete) {
      final closed = campaign.copyWith(state: 'done');
      await _col('waCampaigns').doc(closed.id).set(closed.toMap());
    }
    return (ok: true, reason: null, outcome: next.state);
  }

  Future<void> finishWaCampaign(String campaignId) async {
    if (!can(role, 'whatsapp', 'write')) return;
    for (final c in waCampaigns) {
      if (c.id == campaignId && c.state == 'sending') {
        final closed = c.copyWith(state: 'done');
        await _col('waCampaigns').doc(closed.id).set(closed.toMap());
      }
    }
  }

  /// One consent act on a customer (grant or revoke), stamped
  /// with its source. Rides saveCustomer's own customersManage
  /// guard — consent is customer data, written like it.
  Future<void> setCustomerWaConsent(
    String customerId,
    bool agreed,
    String source, // "counter" | "storefront"
  ) async {
    if (!can(role, 'customersManage', 'write')) return;
    await _col('customers')
        .doc(customerId)
        .update(waConsentPatch(source, agreed, _now()));
  }

  Future<void> setWaServiceIntervalDays(int days) async {
    final resolved = resolveWaSettings({
      'whatsapp': {'serviceIntervalDays': days},
    });
    await updateSettings({
      'whatsapp': {'serviceIntervalDays': resolved.serviceIntervalDays},
    });
  }

  /// Commit one batch; a server refusal (rules deny at flush — the
  /// §3.3 backstop case) is recorded into the rejected tray with the
  /// batch's documents, never silently dropped (§3.5).
  Future<void> _commit(WriteBatch batch, List<Map<String, dynamic>> Function() describe) async {
    try {
      await batch.commit();
    } catch (e) {
      final msg = e.toString();
      final reasonClass = msg.contains('period-locked')
          ? 'period-locked'
          : (e is FirebaseException && e.code == 'permission-denied')
              ? 'permission'
              : 'other';
      rejectedTray = [
        ...rejectedTray,
        RejectedWrite(
          at: DateTime.now().toUtc().toIso8601String(),
          reasonClass: reasonClass,
          detail: msg,
          documents: describe(),
          businessId: ownerUid ?? '',
        ),
      ];
      await _saveTray();
      notifyListeners();
      rethrow;
    }
  }

  void _postEntry(WriteBatch batch, JournalEntry entry) {
    batch.set(_col('journal').doc(entry.id), entry.toMap());
  }

  /// MC Billing workflow adoption (mobile): EVERY product-stock
  /// write moves BOTH stock columns in the same update — the
  /// mobile `stockQty` plus the web parity pair `current_stock` /
  /// `current_qty`. A sale that moves only one column was the
  /// known mobile parity gap; the offline-bill sync parity test
  /// (mc.offlineBillParity) pins all three equal after a sale.
  void _stockIncrement(WriteBatch batch, String productId, double delta) {
    if (delta == 0) return;
    batch.update(_col('products').doc(productId), {
      'stockQty': FieldValue.increment(delta),
      'current_stock': FieldValue.increment(delta),
      'current_qty': FieldValue.increment(delta),
    });
  }

  void _levelDelta(WriteBatch batch, String warehouseId, String productId, double delta) {
    final id = '${warehouseId}__$productId';
    batch.set(
      _col('stockLevels').doc(id),
      {'productId': productId, 'warehouseId': warehouseId, 'qty': FieldValue.increment(delta)},
      SetOptions(merge: true),
    );
  }

  /// F3: the store's selectors delegate to the pure core
  /// (lib/core/stock.dart): the §1.3 resolution rule lives there and
  /// is byte-proven against the web by the F3 golden fixtures. The
  /// F1 per-pair fallback above these lines read a missing row at
  /// the default warehouse as the product total even when the
  /// product had rows elsewhere — the web rule is product-level:
  /// once a product has ANY row, rows are the complete truth.
  String get defaultWarehouseId => stock_core.defaultWarehouseId(warehouses);

  double qtyAtWh(Product p, String warehouseId) =>
      stock_core.qtyAtWarehouse(p, stockLevels, warehouses, warehouseId);

  /* ---------------- rejected tray persistence ---------------- */

  Future<File> get _trayFile async {
    final dir = await getApplicationDocumentsDirectory();
    return File('${dir.path}/rejected_writes.json');
  }

  Future<void> _loadTray() async {
    try {
      final f = await _trayFile;
      if (await f.exists()) {
        final list = jsonDecode(await f.readAsString()) as List;
        rejectedTray = list.map((e) => RejectedWrite.fromJson(Map<String, dynamic>.from(e as Map))).toList();
      }
    } catch (_) {
      rejectedTray = [];
    }
  }

  Future<void> _saveTray() async {
    try {
      final f = await _trayFile;
      await f.writeAsString(jsonEncode(rejectedTray.map((e) => e.toJson()).toList()));
    } catch (_) {}
  }

  Future<void> dismissRejected(int index) async {
    rejectedTray = [...rejectedTray]..removeAt(index);
    await _saveTray();
    notifyListeners();
  }

  /* ---------------- billing ---------------- */

  /// Online mint hardening (§3.6 part 2): when online, re-read the
  /// series from the SERVER before minting a bill number.
  Future<int> mintBillNo() async {
    var nos = bills.map((b) => b.billNo).toList();
    if (!fromCache) {
      try {
        final snap = await _col('bills').get(const GetOptions(source: Source.server));
        nos = snap.docs.map((d) => (d.data()['billNo'] as num?)?.toInt() ?? 0).toList();
      } catch (_) {}
    }
    return nextBillNo(nos);
  }

  /// Build + price a bill (no writes). Returns null on bad lines.
  Bill? buildBill({
    required List<BillLineInput> lines,
    required List<BillPayment> payments,
    String? customerId,
    String customerName = '',
    String customerPhone = '',
    String discountType = 'flat',
    double discountValue = 0,
    String status = 'held',
    String? warehouseId,
    int? billNo,
    String? id,
    String? sourceType,
    String? sourceId,
  }) {
    final priced = priceBillLines(lines, productsById);
    if (priced == null) return null;
    final discount = discountOf(priced.subtotal, discountType, discountValue);
    final stamped = stampBillTaxes(priced.items, productsById, taxSlabs,
        defaultSalesTaxSlabId: settings.defaultSalesTaxSlabId, discountAmount: discount);
    return Bill(
      id: id ?? newId('bill'),
      billNo: billNo ?? 0,
      customerId: customerId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      items: stamped.items,
      subtotal: priced.subtotal,
      discountType: discountType,
      discountValue: discountValue,
      discountAmount: discount,
      taxAmount: stamped.taxAmount,
      total: stamped.total,
      payments: payments,
      status: status,
      warehouseId: warehouseId,
      sourceType: sourceType,
      sourceId: sourceId,
      dayOffset: 0,
      ts: DateTime.now().toUtc().toIso8601String(),
      originDevice: originDevice,
    );
  }

  /// Post a finalized bill: entry + bill + sale rows + stock + udhaar
  /// row in ONE batch, guard first. Held bills are plain doc writes
  /// (no entry) via [saveHeldBill].
  Future<bool> postBill(Bill bill) async {
    if (!can(role, 'billing', 'write')) return false;
    if (!_planInvoiceCheck()) return false;
    // B5: a cheque payment part with an invalid draft (or a
    // non-positive amount) refuses the WHOLE bill before anything
    // composes — a bill never posts half-captured. Valid parts get
    // their registry ids stamped here; the docs write below.
    final stampedPayments = <BillPayment>[];
    for (final p in bill.payments) {
      if (p.instrument == 'cheque') {
        if (!isValidChequeDraft(p.cheque) || p.amount <= 0) return false;
        stampedPayments.add(BillPayment(
          method: p.method, amount: p.amount, accountId: null,
          instrument: 'cheque', chequeId: p.chequeId ?? newId('chq'), cheque: p.cheque,
        ));
      } else {
        stampedPayments.add(p);
      }
    }
    bill = Bill(
      id: bill.id, billNo: bill.billNo, customerId: bill.customerId,
      customerName: bill.customerName, customerPhone: bill.customerPhone,
      items: bill.items, subtotal: bill.subtotal, discountType: bill.discountType,
      discountValue: bill.discountValue, discountAmount: bill.discountAmount,
      taxAmount: bill.taxAmount, total: bill.total, payments: stampedPayments,
      status: bill.status, returnedQty: bill.returnedQty, sourceType: bill.sourceType,
      sourceId: bill.sourceId, warehouseId: bill.warehouseId, dayOffset: bill.dayOffset,
      ts: bill.ts, originDevice: bill.originDevice,
    );
    final billWh = bill.warehouseId ?? defaultWarehouseId;
    // Stock must be held AT the bill's warehouse (web §1.6).
    final need = <String, double>{};
    for (final it in bill.items) {
      need[it.productId] = (need[it.productId] ?? 0) + it.qty;
    }
    for (final e in need.entries) {
      final p = productsById[e.key];
      if (p == null || qtyAtWh(p, billWh) < e.value - 1e-9) return false;
    }
    // H2: a points tender validates against the DERIVED loyalty
    // position before anything composes (web postBill discipline):
    // the desk's quote must still be exactly covered — balance AND
    // the settings cap — or the whole bill refuses rather than
    // posting a leg the liability cannot cover.
    final loyaltySt = resolveLoyaltySettings(ownerDoc);
    final rawPointsParts = bill.payments.where((p) => p.instrument == 'points').toList();
    if (rawPointsParts.isNotEmpty) {
      if (bill.customerId == null) return false;
      final wantedPoints = rawPointsParts.fold(
          0, (a, p) => a + ((p.loyaltyPoints ?? 0) > 0 ? p.loyaltyPoints! : 0));
      final wantedRs = roundPaisa(rawPointsParts.fold(0.0, (a, p) => a + p.amount));
      final quote = loyaltyRedemptionQuote(
        journal, bill.customerId!, wantedPoints,
        loyaltyRedeemCapRs(bill.total, loyaltySt),
      );
      if (quote.points != wantedPoints || (quote.rs - wantedRs).abs() > 0.005) {
        return false;
      }
    }
    final priced = priceBillLines(
      bill.items.map((i) => BillLineInput(productId: i.productId, qty: i.qty, unitPrice: i.unitPrice)).toList(),
      productsById,
    );
    if (priced == null) return false;
    final composed = composeBillEntry(
      bill: Bill(
        id: bill.id, billNo: bill.billNo, customerId: bill.customerId,
        customerName: bill.customerName, customerPhone: bill.customerPhone,
        items: bill.items, subtotal: bill.subtotal, discountType: bill.discountType,
        discountValue: bill.discountValue, discountAmount: bill.discountAmount,
        taxAmount: bill.taxAmount, total: bill.total, payments: bill.payments,
        status: 'paid', returnedQty: bill.returnedQty, sourceType: bill.sourceType,
        sourceId: bill.sourceId, warehouseId: billWh, dayOffset: 0, ts: bill.ts,
        originDevice: originDevice,
      ),
      pricedItems: priced.items,
      costTotal: priced.costTotal,
      accounts: accounts,
      productsById: productsById,
      originDevice: originDevice,
    );
    // H2: the earn companion composes off the PRE-bill journal and
    // is guarded + posted in the bill's own batch — a bill and its
    // earn can never half-land.
    final earnEntry = buildLoyaltyEarnEntry(
      journal: journal, bill: composed.bill, settings: loyaltySt,
      ts: composed.entry.ts,
    );
    final List<JournalEntry> guarded;
    try {
      guarded = guardPostings([composed.entry, if (earnEntry != null) earnEntry]);
    } on PeriodLockedError {
      lastError = 'period-locked';
      notifyListeners();
      return false;
    }
    final batch = db.batch();
    batch.set(_col('bills').doc(bill.id), composed.bill.toMap());
    for (final s in composed.saleRows) {
      batch.set(_col('sales').doc(s.id), s.toMap());
    }
    // MC workflow §3 — STOCK DEDUCTS EXACTLY ONCE, AT THE INVOICE:
    // the bill posting here is the one deduction for these goods.
    // A challan citing the same order deducts NOTHING (dispatch
    // writes status + number only), so SO → challan → invoice
    // can never double-deduct. Both stock columns move together.
    for (final it in priced.items) {
      _stockIncrement(batch, it.productId, -it.qty);
      _levelDelta(batch, billWh, it.productId, -it.qty);
    }
    if (composed.creditRow != null) {
      batch.set(_col('credits').doc(composed.creditRow!.id), composed.creditRow!.toMap());
    }
    // B5: the cheque registry docs ride the SAME batch as the bill.
    for (final p in composed.bill.payments) {
      if (p.instrument == 'cheque' && p.cheque != null) {
        final doc = chequeDocForBillPayment(
          bill: composed.bill, payment: p, draft: p.cheque!,
          entryId: guarded.first.id, originDevice: originDevice,
        );
        batch.set(_col('cheques').doc(doc.id), doc.toMap());
      }
    }
    _conversionStatusUpdates(batch, composed.bill);
    for (final e in guarded) {
      _postEntry(batch, e);
    }
    _rideInvoiceCounter(batch);
    await _commit(batch, () => [composed.bill.toMap()]);
    return true;
  }

  /// §2.2: when a posted bill cites a source document, the source's
  /// cached status is recomputed from the derivations over bills
  /// INCLUDING the new one, in the same batch (one hop up from a
  /// challan to its order).
  void _conversionStatusUpdates(WriteBatch batch, Bill newBill) {
    if (newBill.sourceId == null) return;
    final allBills = [...bills.where((b) => b.id != newBill.id), newBill];
    void updateOrder(SaleOrder o) {
      final derived = deriveOrderStatus(o, allBills, deliveryChallans);
      if (derived != o.status) {
        batch.update(_col('saleOrders').doc(o.id), {'status': derived});
      }
    }

    switch (newBill.sourceType) {
      case 'order':
        for (final o in saleOrders) {
          if (o.id == newBill.sourceId) updateOrder(o);
        }
      case 'challan':
        for (final c in deliveryChallans) {
          if (c.id != newBill.sourceId) continue;
          final derived = deriveChallanStatus(c, allBills);
          if (derived != c.status) {
            batch.update(_col('deliveryChallans').doc(c.id), {'status': derived});
          }
          if (c.orderId != null) {
            for (final o in saleOrders) {
              if (o.id == c.orderId) updateOrder(o);
            }
          }
        }
      case 'quotation':
        for (final q in quotations) {
          if (q.id != newBill.sourceId) continue;
          final derived = deriveQuotationStatus(q, saleOrders, allBills);
          if (derived != q.status) {
            batch.update(_col('quotations').doc(q.id), {'status': derived});
          }
        }
      case 'job':
        // §5.4: posting a bill sourced from a job flips the job to
        // delivered in the same batch (delivered is terminal).
        for (final j in jobs) {
          if (j.id != newBill.sourceId) continue;
          if (j.status != 'delivered' && j.status != 'cancelled') {
            batch.update(_col('jobs').doc(j.id), {'status': 'delivered'});
          }
        }
    }
  }

  Future<void> saveHeldBill(Bill bill) async {
    final batch = db.batch();
    batch.set(_col('bills').doc(bill.id), bill.toMap());
    await batch.commit();
  }

  Future<void> discardHeldBill(String billId) async {
    await _col('bills').doc(billId).delete();
  }

  /* ---------------- sales counter ---------------- */

  Future<bool> recordCounterSale(Product product, double qty) async {
    if (!can(role, 'salesCounter', 'write')) return false;
    if (!_planInvoiceCheck()) return false;
    if (qty <= 0 || product.stockQty < qty) return false;
    final defWh = defaultWarehouseId;
    if (qtyAtWh(product, defWh) < qty) return false;
    final sale = Sale(
      id: 's-${DateTime.now().millisecondsSinceEpoch.toRadixString(36)}',
      productId: product.id, qty: qty, unitPrice: product.salePrice,
      unitCost: product.costPrice, total: qty * product.salePrice,
      billId: null, kind: 'sale', dayOffset: 0,
      ts: DateTime.now().toUtc().toIso8601String(),
    );
    final entry = composeCounterSaleEntry(
      saleId: sale.id, product: product, qty: qty, slabs: taxSlabs,
      accounts: accounts, defaultSalesTaxSlabId: settings.defaultSalesTaxSlabId,
    );
    final List<JournalEntry> guarded;
    try {
      guarded = guardPostings([entry]);
    } on PeriodLockedError {
      lastError = 'period-locked';
      notifyListeners();
      return false;
    }
    final batch = db.batch();
    batch.set(_col('sales').doc(sale.id), sale.toMap());
    _stockIncrement(batch, product.id, -qty);
    _levelDelta(batch, defWh, product.id, -qty);
    _postEntry(batch, guarded.single);
    _rideInvoiceCounter(batch);
    await _commit(batch, () => [sale.toMap()]);
    return true;
  }

  /* ---------------- returns & void ---------------- */

  Future<SaleReturn?> recordReturn({
    required Bill bill,
    required List<({String productId, double qty})> lines,
    String refundMethod = 'cash',
    String? refundAccountId,
    bool issueNote = false,
  }) async {
    if (!can(role, 'returns', 'write')) return null;
    // The formal note flow gates on creditDebitNotes (G-2), not on
    // the returns row — the accountant has notes without returns.
    if (issueNote && !can(role, 'creditDebitNotes', 'write')) return null;
    // H2: the note id is minted BEFORE composing — the return's
    // loyalty clawback cites it as its refId when a note wraps the
    // return (web parity); the note doc below uses the same id.
    final noteId = issueNote ? newId('note') : null;
    final composed = composeReturnEntry(
      bill: bill,
      priorReturns: returns.where((r) => r.billId == bill.id).toList(),
      credits: credits,
      lines: lines,
      productsById: productsById,
      journal: journal,
      refundMethod: refundMethod,
      refundAccountId: refundAccountId,
      accounts: accounts,
      originDevice: originDevice,
      noteId: noteId,
    );
    if (composed == null) return null;
    final List<JournalEntry> guarded;
    try {
      guarded = guardPostings([composed.entry, if (composed.clawback != null) composed.clawback!]);
    } on PeriodLockedError {
      lastError = 'period-locked';
      notifyListeners();
      return null;
    }
    final returnedQty = {...bill.returnedQty};
    for (final it in composed.saleReturn.items) {
      returnedQty[it.productId] = (returnedQty[it.productId] ?? 0) + it.qty;
    }
    final allReturned = bill.items.every((i) => (returnedQty[i.productId] ?? 0) >= i.qty);
    final billWh = bill.warehouseId ?? defaultWarehouseId;
    final batch = db.batch();
    batch.set(_col('returns').doc(composed.saleReturn.id), composed.saleReturn.toMap());
    batch.update(_col('bills').doc(bill.id), {
      'returnedQty': returnedQty,
      'status': allReturned ? 'returned' : 'partially_returned',
    });
    for (final it in composed.saleReturn.items) {
      _stockIncrement(batch, it.productId, it.qty);
      _levelDelta(batch, billWh, it.productId, it.qty);
    }
    for (final s in composed.negSales) {
      batch.set(_col('sales').doc(s.id), s.toMap());
    }
    if (composed.creditReversal != null) {
      batch.set(_col('credits').doc(composed.creditReversal!.id), composed.creditReversal!.toMap());
    }
    if (issueNote) {
      final note = composeCreditNote(
        noteId: noteId!, bill: bill, ret: composed.saleReturn,
        journalEntryId: guarded.first.id, existingNotes: notes,
        docSeries: settings.docSeries, originDevice: originDevice,
      );
      batch.set(_col('notes').doc(note.id), note.toMap());
    }
    for (final e in guarded) {
      _postEntry(batch, e);
    }
    await _commit(batch, () => [composed.saleReturn.toMap()]);
    return composed.saleReturn;
  }

  /// Void a posted bill — the FULL engine (F2): cheque parts follow
  /// their registry state (handed back / refunded from the deposit
  /// account / no line), the handed-back docs close as "returned" in
  /// the same batch. The PIN gate is applied by the UI layer per
  /// E5 — the store knows nothing of the gate.
  Future<bool> voidBill(Bill bill) async {
    if (!can(role, 'billingVoid', 'write')) return false;
    final composed = composeVoidFull(
      bill: bill, credits: credits, accounts: accounts,
      productsById: productsById, cheques: cheques, journal: journal,
      originDevice: originDevice,
    );
    if (composed == null) return false;
    final List<JournalEntry> guarded;
    try {
      guarded = guardPostings([composed.entry, if (composed.clawback != null) composed.clawback!]);
    } on PeriodLockedError {
      lastError = 'period-locked';
      notifyListeners();
      return false;
    }
    final billWh = bill.warehouseId ?? defaultWarehouseId;
    final batch = db.batch();
    batch.set(_col('returns').doc(composed.saleReturn.id), composed.saleReturn.toMap());
    batch.update(_col('bills').doc(bill.id), {
      'returnedQty': {for (final i in bill.items) i.productId: i.qty},
      'status': 'voided',
    });
    for (final it in bill.items) {
      _stockIncrement(batch, it.productId, it.qty);
      _levelDelta(batch, billWh, it.productId, it.qty);
    }
    for (final s in composed.negSales) {
      batch.set(_col('sales').doc(s.id), s.toMap());
    }
    if (composed.creditReversal != null) {
      batch.set(_col('credits').doc(composed.creditReversal!.id), composed.creditReversal!.toMap());
    }
    for (final c in composed.chequeUpdates) {
      batch.set(_col('cheques').doc(c.id), c.toMap());
    }
    for (final e in guarded) {
      _postEntry(batch, e);
    }
    await _commit(batch, () => [composed.saleReturn.toMap()]);
    return true;
  }

  /// H2: post every due vintage's expiry release (the loyalty
  /// desk's owner action) — one entry per due vintage, guarded
  /// together, one batch; returns how many posted. The releases
  /// reverse the earn cost (Cr expense_loyalty), never revenue.
  Future<int> postLoyaltyExpiries() async {
    if (!can(role, 'loyalty', 'write')) return 0;
    final nowIso = DateTime.now().toUtc().toIso8601String();
    final due = loyaltyExpiryDue(journal, nowIso);
    if (due.isEmpty) return 0;
    final names = {for (final c in customers) c.id: c.name};
    final entries = <JournalEntry>[];
    for (final d in due) {
      final e = buildLoyaltyExpiryEntry(
        customerId: d.customerId,
        customerName: names[d.customerId] ?? d.customerId,
        vintage: d.vintage,
        ts: nowIso,
      );
      if (e != null) entries.add(e);
    }
    if (entries.isEmpty) return 0;
    final List<JournalEntry> guarded;
    try {
      guarded = guardPostings(entries);
    } on PeriodLockedError {
      lastError = 'period-locked';
      notifyListeners();
      return 0;
    }
    final batch = db.batch();
    for (final e in guarded) {
      _postEntry(batch, e);
    }
    await _commit(batch, () => []);
    return guarded.length;
  }

  /* ---------------- inventory ---------------- */

  Future<void> saveProduct(Product p, {required bool isNew}) async {
    if (!can(role, 'inventoryManage', 'write')) return;
    final batch = db.batch();
    if (isNew) {
      // Both web stock columns start equal to stockQty, so a new
      // product is in parity from birth (never 0 in one column
      // while the other carries stock).
      batch.set(_col('products').doc(p.id), {
        ...p.toMap(), 'current_stock': p.stockQty, 'current_qty': p.stockQty,
      });
    } else {
      batch.update(_col('products').doc(p.id), p.toMap());
    }
    await batch.commit();
  }

  Future<bool> adjustStock(Product product, double rawDelta, String reason, String note, {String? warehouseId}) async {
    if (!can(role, 'stockAdjustments', 'write')) return false;
    final composed = composeAdjustmentEntry(product: product, rawDelta: rawDelta, reason: reason);
    if (composed == null) return false;
    final List<JournalEntry> guarded;
    try {
      guarded = guardPostings([composed.entry]);
    } on PeriodLockedError {
      lastError = 'period-locked';
      notifyListeners();
      return false;
    }
    // F3 (§1.5): the adjustment lands at the desk-chosen warehouse
    // (resolved like every other stamp); the entry itself is the
    // class-aware composer above — warehouse-free, as on the web.
    final wh = stock_core.resolveWarehouseId(warehouses, warehouseId);
    final batch = db.batch();
    batch.set(_col('adjustments').doc(composed.adjId), {
      'productId': product.id, 'productName': product.name, 'delta': composed.delta,
      'reason': reason, 'note': note, 'dayOffset': 0, 'warehouseId': wh,
      'ts': DateTime.now().toUtc().toIso8601String(),
      if (originDevice.isNotEmpty) 'originDevice': originDevice,
    });
    batch.update(_col('products').doc(product.id), {'stockQty': composed.newQty, 'current_stock': composed.newQty, 'current_qty': composed.newQty});
    _levelDelta(batch, wh, product.id, composed.delta);
    _postEntry(batch, guarded.single);
    await _commit(batch, () => []);
    return true;
  }

  /* ---------------- customers & udhaar ---------------- */

  Future<void> saveCustomer(Customer c, {required bool isNew}) async {
    if (!can(role, 'customersManage', 'write')) return;
    if (isNew) {
      await _col('customers').doc(c.id).set(c.toMap());
    } else {
      await _col('customers').doc(c.id).update(c.toMap());
    }
  }

  Future<bool> giveCredit({
    required String? customerId,
    required String customerName,
    required String customerPhone,
    required double amount,
    String note = '',
  }) async {
    if (!can(role, 'creditGive', 'write')) return false;
    final row = CreditEntry(
      id: newId('cr'), customerId: customerId, customerName: customerName,
      customerPhone: customerPhone, kind: 'credit', amount: amount, note: note,
      billId: null, dayOffset: 0, ts: DateTime.now().toUtc().toIso8601String(),
      originDevice: originDevice,
    );
    final entry = composeCreditGivenEntry(row: row, accounts: accounts);
    final List<JournalEntry> guarded;
    try {
      guarded = guardPostings([entry]);
    } on PeriodLockedError {
      lastError = 'period-locked';
      notifyListeners();
      return false;
    }
    final batch = db.batch();
    batch.set(_col('credits').doc(row.id), row.toMap());
    _postEntry(batch, guarded.single);
    await _commit(batch, () => [row.toMap()]);
    return true;
  }

  Future<bool> addRepayment({
    required String? customerId,
    required String customerName,
    required String customerPhone,
    required double amount,
    required String method,
    String? accountId,
    String note = '',
    ChequeDraft? chequeDraft,
  }) async {
    if (!can(role, 'creditRepayment', 'write')) return false;
    // B5: a cheque repayment captures its registry doc in the same
    // batch; an invalid draft refuses the repayment outright.
    final isCheque = chequeDraft != null;
    if (isCheque && (!isValidChequeDraft(chequeDraft) || amount <= 0)) return false;
    final row = CreditEntry(
      id: newId('cr'), customerId: customerId, customerName: customerName,
      customerPhone: customerPhone, kind: 'repayment', amount: amount,
      method: method,
      accountId: isCheque ? null : resolveAccountId(accounts, method, accountId),
      instrument: isCheque ? 'cheque' : null,
      chequeId: isCheque ? newId('chq') : null,
      voucherNo: nextDocNumber('receiptVoucher',
          credits.where((e) => e.kind == 'repayment').map((e) => e.voucherNo).toList(),
          settings.docSeries),
      note: note, billId: null, dayOffset: 0,
      ts: DateTime.now().toUtc().toIso8601String(), originDevice: originDevice,
    );
    final entry = composeRepaymentEntry(row: row, accounts: accounts);
    final List<JournalEntry> guarded;
    try {
      guarded = guardPostings([entry]);
    } on PeriodLockedError {
      lastError = 'period-locked';
      notifyListeners();
      return false;
    }
    final batch = db.batch();
    batch.set(_col('credits').doc(row.id), row.toMap());
    if (isCheque) {
      final doc = chequeDocForRepayment(
        row: row, draft: chequeDraft, entryId: guarded.single.id,
        originDevice: originDevice,
      );
      batch.set(_col('cheques').doc(doc.id), doc.toMap());
    }
    _postEntry(batch, guarded.single);
    await _commit(batch, () => [row.toMap()]);
    return true;
  }

  /// MC workflow §5 — a customer receipt SPLIT AT ENTRY: the
  /// caller states the bill-payment part and the advance part of
  /// one cash receipt. ONE atomic balanced entry posts (Dr money
  /// for the total; Cr receivables for the bill part; Cr
  /// `customer_advances` for the advance — the dedicated unearned
  /// account, see mc_workflow.dart), plus one credit row per part (the
  /// advance row carries kind 'advance' so the customer ledger
  /// shows it). Old advances are never restated: this only posts
  /// the new receipt. A cheque receipt is a bill payment only and
  /// keeps the existing addRepayment path.
  Future<bool> recordCustomerReceipt({
    required String? customerId,
    required String customerName,
    required String customerPhone,
    required double billPayment,
    required double advance,
    required String method,
    String? accountId,
    String? billId,
    String note = '',
  }) async {
    if (!can(role, 'creditRepayment', 'write')) return false;
    final split = mc.normalizeReceiptSplit(
      total: billPayment + advance, billPayment: billPayment, advance: advance,
    );
    if (split == null) return false;
    final ts = _now();
    final entry = mc.composeReceiptSplitEntry(
      receiptId: newId('rcpt'), customerId: customerId, customerName: customerName,
      method: method, accountId: resolveAccountId(accounts, method, accountId),
      billPayment: split.billPayment, advance: split.advance, ts: ts,
    );
    final List<JournalEntry> guarded;
    try {
      guarded = guardPostings([entry]);
    } on PeriodLockedError {
      lastError = 'period-locked';
      notifyListeners();
      return false;
    }
    final batch = db.batch();
    if (split.billPayment > 0) {
      final billRowId = newId('cr');
      batch.set(_col('credits').doc(billRowId), CreditEntry(
        id: billRowId, customerId: customerId, customerName: customerName,
        customerPhone: customerPhone, kind: 'repayment', amount: split.billPayment,
        method: method, accountId: resolveAccountId(accounts, method, accountId),
        voucherNo: nextDocNumber('receiptVoucher',
            credits.where((e) => e.kind == 'repayment').map((e) => e.voucherNo).toList(),
            settings.docSeries),
        note: note, billId: billId, dayOffset: 0, ts: ts, originDevice: originDevice,
      ).toMap());
    }
    if (split.advance > 0) {
      final advRowId = newId('cr');
      batch.set(_col('credits').doc(advRowId), CreditEntry(
        id: advRowId, customerId: customerId, customerName: customerName,
        customerPhone: customerPhone, kind: 'advance', amount: split.advance,
        method: method, accountId: resolveAccountId(accounts, method, accountId),
        voucherNo: nextDocNumber('receiptVoucher',
            credits.map((e) => e.voucherNo).toList(), settings.docSeries),
        note: note, billId: billId, dayOffset: 0, ts: ts, originDevice: originDevice,
      ).toMap());
    }
    _postEntry(batch, guarded.single);
    await _commit(batch, () => [guarded.single.toMap()]);
    return true;
  }

  /* ---------------- day close ---------------- */

  /// Journal-derived expected cash for the default till account:
  /// pre-today balance + today's journal movement (web §1.4 — equals
  /// the account's full derived balance by construction).
  double expectedCashToday(MoneyAccount account) {
    final opening = moneyAccountBalance(journal, account) - accountDayNet(journal, account, 0);
    return expectedCloseForAccount(journal, account, opening);
  }

  Future<void> saveDayClose(DayClose row) async {
    if (!can(role, 'dayClose', 'write')) return;
    await _col('dayCloses').doc(row.id).set(row.toMap());
  }

  /* ================= F2 · back office ================= */

  /// Guard a set of entries; null (with lastError set) when the
  /// period lock refuses — the F2 actions' shared choke point.
  List<JournalEntry>? _tryGuard(List<JournalEntry> entries) {
    try {
      return guardPostings(entries);
    } on PeriodLockedError {
      lastError = 'period-locked';
      notifyListeners();
      return null;
    }
  }

  String _now() => DateTime.now().toUtc().toIso8601String();

  /* ---------------- suppliers & purchases ---------------- */

  Future<void> saveSupplier(Supplier s, {required bool isNew}) async {
    if (!can(role, 'suppliersManage', 'write')) return;
    if (isNew) {
      await _col('suppliers').doc(s.id).set(s.toMap());
    } else {
      await _col('suppliers').doc(s.id).update(s.toMap());
    }
  }

  /// F-13: a supplier with a balance or ANY purchase/payment
  /// history is never deleted — the subledger would orphan.
  Future<bool> deleteSupplier(String supplierId) async {
    if (!can(role, 'suppliersManage', 'write')) return false;
    final balance = supplierBalance(purchases, supplierPayments, supplierId, purchaseReturns);
    if (balance.abs() > 0.009) return false;
    if (purchases.any((p) => p.supplierId == supplierId)) return false;
    if (supplierPayments.any((p) => p.supplierId == supplierId)) return false;
    await _col('suppliers').doc(supplierId).delete();
    return true;
  }

  /// recordPurchase: stock in at cost (the product's cost becomes
  /// the latest line's), levels at the purchase warehouse, the
  /// PO's cached status recomputed when received against one.
  Future<bool> recordPurchase({
    required String supplierId,
    required List<({String productId, double qty, double unitCost})> lines,
    String note = '',
    String? sourcePoId,
    String? warehouseId,
  }) async {
    if (!can(role, 'suppliersManage', 'write')) return false;
    final wh = warehouseId ?? defaultWarehouseId;
    final composed = composePurchaseEntry(
      purchaseId: newId('pur'), supplierId: supplierId, lines: lines,
      productsById: productsById, slabs: taxSlabs,
      defaultPurchaseTaxSlabId: settings.defaultPurchaseTaxSlabId, note: note,
    );
    final purchase = Purchase(
      id: composed.purchase.id, supplierId: supplierId, items: composed.purchase.items,
      total: composed.purchase.total, netTotal: composed.purchase.netTotal,
      taxAmount: composed.purchase.taxAmount, note: note, sourcePoId: sourcePoId,
      warehouseId: wh, dayOffset: 0, ts: composed.purchase.ts,
    );
    final guarded = _tryGuard([composed.entry]);
    if (guarded == null) return false;
    final batch = db.batch();
    batch.set(_col('purchases').doc(purchase.id), purchase.toMap());
    for (final it in purchase.items) {
      batch.update(_col('products').doc(it.productId), {
        'stockQty': FieldValue.increment(it.qty),
        'current_stock': FieldValue.increment(it.qty),
        'current_qty': FieldValue.increment(it.qty),
        'costPrice': it.unitCost,
      });
      _levelDelta(batch, wh, it.productId, it.qty);
    }
    if (sourcePoId != null) {
      for (final po in purchaseOrders) {
        if (po.id != sourcePoId) continue;
        final derived = derivePoStatus(po, [...purchases, purchase]);
        if (derived != po.status) {
          batch.update(_col('purchaseOrders').doc(po.id), {'status': derived});
        }
      }
    }
    _postEntry(batch, guarded.single);
    await _commit(batch, () => [purchase.toMap()]);
    return true;
  }

  Future<bool> recordSupplierPayment({
    required Supplier supplier,
    required double amount,
    required String method,
    String? accountId,
    String note = '',
    ChequeDraft? chequeDraft,
  }) async {
    if (!can(role, 'supplierPayments', 'write')) return false;
    final composed = composeSupplierPayment(
      paymentId: newId('spay'), supplier: supplier, amount: amount,
      method: method, accountId: accountId, note: note,
      instrument: chequeDraft != null ? 'cheque' : null, chequeDraft: chequeDraft,
      accounts: accounts, existingPayments: supplierPayments,
      docSeries: settings.docSeries, originDevice: originDevice,
    );
    if (composed == null) return false;
    final guarded = _tryGuard([composed.entry]);
    if (guarded == null) return false;
    final batch = db.batch();
    batch.set(_col('supplierPayments').doc(composed.row.id), composed.row.toMap());
    if (composed.cheque != null) {
      batch.set(_col('cheques').doc(composed.cheque!.id), composed.cheque!.toMap());
    }
    _postEntry(batch, guarded.single);
    await _commit(batch, () => [composed.row.toMap()]);
    return true;
  }

  Future<bool> recordPurchaseReturn({
    required Purchase purchase,
    required List<({String productId, double qty})> picks,
    required String settlement,
    String? method,
    String? accountId,
    String reason = '',
  }) async {
    if (!can(role, 'creditDebitNotes', 'write')) return false; // G-2
    final supplier = suppliers.where((s) => s.id == purchase.supplierId).firstOrNull;
    final composed = composePurchaseReturn(
      returnId: newId('pret'), noteId: newId('note'), purchase: purchase,
      allPurchaseReturns: purchaseReturns, picks: picks, settlement: settlement,
      method: method, accountId: accountId, productsById: productsById,
      accounts: accounts, existingNotes: notes, docSeries: settings.docSeries,
      supplierName: supplier?.name ?? '', reason: reason, originDevice: originDevice,
    );
    if (composed == null) return false;
    final guarded = _tryGuard([composed.entry]);
    if (guarded == null) return false;
    final wh = purchase.warehouseId ?? defaultWarehouseId;
    final batch = db.batch();
    batch.set(_col('purchaseReturns').doc(composed.ret.id), composed.ret.toMap());
    batch.set(_col('notes').doc(composed.note.id), composed.note.toMap());
    for (final it in composed.ret.items) {
      _stockIncrement(batch, it.productId, -it.qty);
      _levelDelta(batch, wh, it.productId, -it.qty);
    }
    _postEntry(batch, guarded.single);
    await _commit(batch, () => [composed.ret.toMap()]);
    return true;
  }

  /* ---------------- expenses (F-5 mirror corrections) ---------------- */

  Future<bool> addExpense({
    required String category,
    required double amount,
    required String method,
    String? accountId,
    String note = '',
    int dayOffset = 0,
    ChequeDraft? chequeDraft,
  }) async {
    if (!can(role, 'expenses', 'write')) return false;
    final composed = composeExpense(
      expenseId: newId('exp'), category: category, amount: amount,
      method: method, accountId: accountId, note: note, dayOffset: dayOffset,
      instrument: chequeDraft != null ? 'cheque' : null, chequeDraft: chequeDraft,
      accounts: accounts, journal: journal, originDevice: originDevice,
    );
    if (composed == null) return false;
    final guarded = _tryGuard([composed.entry]);
    if (guarded == null) return false;
    final batch = db.batch();
    batch.set(_col('expenses').doc(composed.row.id), composed.row.toMap());
    if (composed.cheque != null) {
      batch.set(_col('cheques').doc(composed.cheque!.id), composed.cheque!.toMap());
    }
    _postEntry(batch, guarded.single);
    await _commit(batch, () => [composed.row.toMap()]);
    return true;
  }

  /// F-5: an edit is a mirror reversal + a corrected repost; a
  /// cheque expense's correction is refused once its cheque has
  /// left "issued", and an amount change syncs the registry doc.
  Future<bool> updateExpense(Expense updated) async {
    if (!can(role, 'expenses', 'write')) return false;
    final orig = expenses.where((e) => e.id == updated.id).firstOrNull;
    if (orig == null) return false;
    Cheque? chq;
    if (orig.chequeId != null) {
      chq = cheques.where((c) => c.id == orig.chequeId).firstOrNull;
    }
    final isChequeExpense = orig.instrument == 'cheque' && orig.chequeId != null;
    if (isChequeExpense && chq != null && chq.status != 'issued') return false;
    final original = findUnreversedPosting(journal, orig.id);
    if (original == null) return false;
    final now = _now();
    final targetTs = DateTime.parse(now)
        .subtract(Duration(days: updated.dayOffset))
        .toUtc()
        .toIso8601String();
    final dating = correctionDating(lockedThrough, original.ts, targetTs, updated.dayOffset, now);
    final corrected = orig.copyWith(
      category: updated.category, amount: updated.amount, method: updated.method,
      accountId: updated.accountId, note: updated.note,
      dayOffset: dating.dayOffset, ts: dating.ts,
    );
    final mirror = mirrorReversal(original,
        memo: 'Expense reversal — ${orig.category}', refType: 'expense_reversal', ts: now);
    final repost = expenseEntryFor(corrected, accounts: accounts, entryId: original.id, journal: journal).entry;
    final guarded = _tryGuard([mirror, repost]);
    if (guarded == null) return false;
    final batch = db.batch();
    batch.set(_col('expenses').doc(corrected.id), corrected.toMap());
    if (isChequeExpense && chq != null && corrected.amount != orig.amount) {
      batch.update(_col('cheques').doc(chq.id), {'amount': corrected.amount});
    }
    for (final e in guarded) {
      _postEntry(batch, e);
    }
    await _commit(batch, () => [corrected.toMap()]);
    return true;
  }

  /// F-5 delete: mirror reversal + row removal; an issued-cheque
  /// expense's registry doc closes as "bounced" citing the reversal.
  Future<bool> deleteExpense(String expenseId) async {
    if (!can(role, 'expenses', 'write')) return false;
    final orig = expenses.where((e) => e.id == expenseId).firstOrNull;
    if (orig == null) return false;
    Cheque? chq;
    if (orig.chequeId != null) {
      chq = cheques.where((c) => c.id == orig.chequeId).firstOrNull;
    }
    final isChequeExpense = orig.instrument == 'cheque' && orig.chequeId != null;
    if (isChequeExpense && chq != null && chq.status != 'issued') return false;
    final original = findUnreversedPosting(journal, orig.id);
    if (original == null) return false;
    final mirror = mirrorReversal(original,
        memo: 'Expense reversal — ${orig.category}', refType: 'expense_reversal', ts: _now());
    final guarded = _tryGuard([mirror]);
    if (guarded == null) return false;
    final batch = db.batch();
    batch.delete(_col('expenses').doc(orig.id));
    if (isChequeExpense && chq != null) {
      final closed = chq.copyWith(
        status: 'bounced',
        entryIds: {...chq.entryIds, 'bounced': guarded.single.id},
      );
      batch.set(_col('cheques').doc(closed.id), closed.toMap());
    }
    _postEntry(batch, guarded.single);
    await _commit(batch, () => [orig.toMap()]);
    return true;
  }

  /* ---------------- finance: cash, transfers, tax ---------------- */

  Future<bool> addCashEntry({
    required String kind,
    required double amount,
    required String method,
    String? accountId,
    String note = '',
  }) async {
    if (!can(role, 'finance', 'write')) return false;
    final composed = composeCashEntry(
      cashEntryId: newId('cash'), kind: kind, amount: amount, method: method,
      accountId: accountId, note: note, accounts: accounts, originDevice: originDevice,
    );
    final guarded = _tryGuard([composed.entry]);
    if (guarded == null) return false;
    final batch = db.batch();
    batch.set(_col('cashEntries').doc(composed.row.id), composed.row.toMap());
    _postEntry(batch, guarded.single);
    await _commit(batch, () => [composed.row.toMap()]);
    return true;
  }

  Future<bool> transferFunds({
    required MoneyAccount from,
    required MoneyAccount to,
    required double amount,
    String note = '',
  }) async {
    if (!can(role, 'transfers', 'write')) return false;
    final composed = composeTransfer(
      cashEntryId: newId('cash'), from: from, to: to, amount: amount,
      note: note, originDevice: originDevice,
    );
    if (composed == null) return false;
    final guarded = _tryGuard([composed.entry]);
    if (guarded == null) return false;
    final batch = db.batch();
    batch.set(_col('cashEntries').doc(composed.row.id), composed.row.toMap());
    _postEntry(batch, guarded.single);
    await _commit(batch, () => [composed.row.toMap()]);
    return true;
  }

  Future<bool> recordTaxPayment({
    required double amount,
    required String method,
    String? accountId,
    String note = '',
  }) async {
    if (!can(role, 'finance', 'write')) return false;
    final composed = composeTaxPayment(
      cashEntryId: newId('cash'), amount: amount, method: method,
      accountId: accountId, note: note, accounts: accounts, journal: journal,
      originDevice: originDevice,
    );
    if (composed == null) return false;
    final guarded = _tryGuard([composed.entry]);
    if (guarded == null) return false;
    final batch = db.batch();
    batch.set(_col('cashEntries').doc(composed.row.id), composed.row.toMap());
    _postEntry(batch, guarded.single);
    await _commit(batch, () => [composed.row.toMap()]);
    return true;
  }

  /* ---------------- cheques lifecycle ---------------- */

  Future<bool> _chequeTransition(ComposedChequeTransition? composed) async {
    if (composed == null) return false;
    final guarded = _tryGuard(composed.entries);
    if (guarded == null) return false;
    final batch = db.batch();
    batch.set(_col('cheques').doc(composed.next.id), composed.next.toMap());
    if (composed.creditRow != null) {
      batch.set(_col('credits').doc(composed.creditRow!.id), composed.creditRow!.toMap());
    }
    if (composed.reversalRow != null) {
      batch.set(_col('supplierPayments').doc(composed.reversalRow!.id), composed.reversalRow!.toMap());
    }
    for (final e in guarded) {
      _postEntry(batch, e);
    }
    await _commit(batch, () => [composed.next.toMap()]);
    return true;
  }

  Future<bool> depositCheque(Cheque cheque, {String? accountId}) async {
    if (!can(role, 'cheques', 'write')) return false;
    return _chequeTransition(composeChequeDeposit(
      cheque: cheque, accountId: accountId, accounts: accounts,
    ));
  }

  Future<bool> clearCheque(Cheque cheque) async {
    if (!can(role, 'cheques', 'write')) return false;
    return _chequeTransition(composeChequeClear(cheque: cheque, accounts: accounts));
  }

  Future<bool> bounceCheque(Cheque cheque, {double charges = 0}) async {
    if (!can(role, 'cheques', 'write')) return false;
    return _chequeTransition(composeChequeBounce(
      cheque: cheque, charges: charges, accounts: accounts, bills: bills,
      credits: credits, supplierPayments: supplierPayments, originDevice: originDevice,
    ));
  }

  Future<bool> returnCheque(Cheque cheque) async {
    if (!can(role, 'cheques', 'write')) return false;
    return _chequeTransition(composeChequeReturn(
      cheque: cheque, bills: bills, credits: credits, originDevice: originDevice,
    ));
  }

  /* ---------------- documents (non-posting) ---------------- */

  /// composeDocLines (web documents.ts): snapshot lines from
  /// catalogue products; null on unknown product / bad qty / price.
  List<DocLine>? _composeDocLines(List<({String productId, double qty, double unitPrice})> picks) {
    final out = <DocLine>[];
    for (final p in picks) {
      final product = productsById[p.productId];
      if (product == null || p.qty <= 0 || p.unitPrice < 0) return null;
      out.add(DocLine(
        productId: product.id, name: product.name, qty: p.qty,
        unitPrice: p.unitPrice, total: round2(p.qty * p.unitPrice),
      ));
    }
    return out.isEmpty ? null : out;
  }

  List<PoLine>? _composePoLines(List<({String productId, double qty, double unitCost})> picks) {
    final out = <PoLine>[];
    for (final p in picks) {
      final product = productsById[p.productId];
      if (product == null || p.qty <= 0 || p.unitCost < 0) return null;
      out.add(PoLine(
        productId: product.id, name: product.name, qty: p.qty,
        unitCost: p.unitCost, total: round2(p.qty * p.unitCost),
      ));
    }
    return out.isEmpty ? null : out;
  }

  double round2(double n) => roundPaisa(n);

  /* ----- quotations ----- */

  Future<String?> saveQuotation({
    String? id,
    String? customerId,
    String customerName = '',
    String customerPhone = '',
    required List<({String productId, double qty, double unitPrice})> picks,
    String discountType = 'flat',
    double discountValue = 0,
    String? validUntil,
    String note = '',
  }) async {
    if (!can(role, 'quotations', 'write')) return null;
    final lines = _composeDocLines(picks);
    if (lines == null) return null;
    final totals = estimateDocTotals(lines, discountType, discountValue,
        products: products, slabs: taxSlabs, settings: settings);
    if (id != null) {
      final existing = quotations.where((q) => q.id == id).firstOrNull;
      if (existing == null || existing.status != 'draft') return null;
      final updated = Quotation(
        id: id, number: existing.number, customerId: customerId,
        customerName: customerName, customerPhone: customerPhone, lines: lines,
        subtotal: totals.subtotal, discountType: discountType, discountValue: discountValue,
        discountAmount: totals.discountAmount, estimatedTax: totals.estimatedTax,
        total: totals.total, validUntil: validUntil, note: note, status: 'draft',
        issuedTs: existing.issuedTs, dayOffset: 0, ts: existing.ts, originDevice: originDevice,
      );
      await _col('quotations').doc(id).set(updated.toMap());
      return id;
    }
    final q = Quotation(
      id: newId('qt'), customerId: customerId, customerName: customerName,
      customerPhone: customerPhone, lines: lines, subtotal: totals.subtotal,
      discountType: discountType, discountValue: discountValue,
      discountAmount: totals.discountAmount, estimatedTax: totals.estimatedTax,
      total: totals.total, validUntil: validUntil, note: note, status: 'draft',
      dayOffset: 0, ts: _now(), originDevice: originDevice,
    );
    await _col('quotations').doc(q.id).set(q.toMap());
    return q.id;
  }

  Future<bool> deleteQuotation(String id) async {
    if (!can(role, 'quotations', 'write')) return false;
    final q = quotations.where((x) => x.id == id).firstOrNull;
    if (q == null || q.status != 'draft') return false;
    await _col('quotations').doc(id).delete();
    return true;
  }

  Future<bool> issueQuotation(String id) async {
    if (!can(role, 'quotations', 'write')) return false;
    final q = quotations.where((x) => x.id == id).firstOrNull;
    if (q == null || q.status != 'draft') return false;
    final number = nextDocNumber('quotation', quotations.map((x) => x.number).toList(), settings.docSeries);
    await _col('quotations').doc(id).update({'status': 'issued', 'number': number, 'issuedTs': _now()});
    return true;
  }

  Future<bool> decideQuotation(String id, {required bool accept}) async {
    if (!can(role, 'quotations', 'write')) return false;
    final q = quotations.where((x) => x.id == id).firstOrNull;
    if (q == null || q.status != 'issued') return false;
    await _col('quotations').doc(id).update({'status': accept ? 'accepted' : 'rejected'});
    return true;
  }

  Future<bool> cancelQuotation(String id) async {
    if (!can(role, 'quotations', 'write')) return false;
    final q = quotations.where((x) => x.id == id).firstOrNull;
    if (q == null || q.status == 'converted' || q.status == 'cancelled') return false;
    if (quotationConvertedTotalQty(q, saleOrders, bills).values.any((v) => v > 0)) return false;
    await _col('quotations').doc(id).update({'status': 'cancelled'});
    return true;
  }

  /// Convert (part of) a quotation into a NEW draft sale order
  /// citing it; the quotation's cached status is recomputed in the
  /// same commit. Picks clamp to the derived remaining qty.
  Future<String?> convertQuotationToOrder(String quotationId, List<({String productId, double qty})> picks) async {
    if (!can(role, 'quotations', 'write')) return null;
    final q = quotations.where((x) => x.id == quotationId).firstOrNull;
    if (q == null || (q.status != 'issued' && q.status != 'accepted')) return null;
    final converted = quotationConvertedTotalQty(q, saleOrders, bills);
    final lines = <DocLine>[];
    for (final p in picks) {
      final src = q.lines.where((l) => l.productId == p.productId).firstOrNull;
      if (src == null) continue;
      final remaining = src.qty - (converted[src.productId] ?? 0);
      final qty = p.qty < remaining ? p.qty : remaining;
      if (qty <= 0) continue;
      lines.add(DocLine(
        productId: src.productId, name: src.name, qty: qty,
        unitPrice: src.unitPrice, total: round2(qty * src.unitPrice),
        sourceProductId: src.productId,
      ));
    }
    if (lines.isEmpty) return null;
    final totals = estimateDocTotals(lines, q.discountType, q.discountValue,
        products: products, slabs: taxSlabs, settings: settings);
    final order = SaleOrder(
      id: newId('so'), customerId: q.customerId, customerName: q.customerName,
      customerPhone: q.customerPhone, lines: lines, subtotal: totals.subtotal,
      discountType: q.discountType, discountValue: q.discountValue,
      discountAmount: totals.discountAmount, estimatedTax: totals.estimatedTax,
      total: totals.total, source: (type: 'quotation', id: q.id),
      note: q.note, status: 'draft', dayOffset: 0, ts: _now(), originDevice: originDevice,
    );
    final batch = db.batch();
    batch.set(_col('saleOrders').doc(order.id), order.toMap());
    final derived = deriveQuotationStatus(q, [...saleOrders, order], bills);
    if (derived != q.status) {
      batch.update(_col('quotations').doc(q.id), {'status': derived});
    }
    await batch.commit();
    return order.id;
  }

  BillPrefill? _prefillFromLines({
    required List<DocLine> lines,
    required String? customerId,
    required String customerName,
    required String customerPhone,
    required String discountType,
    required double discountValue,
    required String sourceType,
    required String sourceId,
    String? warehouseId,
  }) {
    if (lines.isEmpty) return null;
    final prefill = BillPrefill(
      lines: [
        for (final l in lines)
          BillLineInput(productId: l.productId, qty: l.qty, unitPrice: l.unitPrice, sourceProductId: l.productId),
      ],
      customerId: customerId, customerName: customerName, customerPhone: customerPhone,
      discountType: discountType, discountValue: discountValue,
      sourceType: sourceType, sourceId: sourceId, warehouseId: warehouseId,
    );
    billPrefill = prefill;
    notifyListeners();
    return prefill;
  }

  Future<BillPrefill?> convertQuotationToBill(String quotationId, List<({String productId, double qty})> picks) async {
    if (!can(role, 'quotations', 'view')) return null;
    final q = quotations.where((x) => x.id == quotationId).firstOrNull;
    if (q == null || (q.status != 'issued' && q.status != 'accepted')) return null;
    // MC workflow §2 — converted quotations are LOCKED: a quotation
    // whose derived status is already `converted` (fully converted
    // via orders and/or bills) refuses any further conversion, even
    // if its stored status still reads issued/accepted. The
    // remaining-qty clamp below is the second line of defence.
    if (mc.quotationLockedForConversion(q, saleOrders, bills)) return null;
    final converted = quotationConvertedTotalQty(q, saleOrders, bills);
    final lines = <DocLine>[];
    for (final p in picks) {
      final src = q.lines.where((l) => l.productId == p.productId).firstOrNull;
      if (src == null) continue;
      final remaining = src.qty - (converted[src.productId] ?? 0);
      final qty = p.qty < remaining ? p.qty : remaining;
      if (qty <= 0) continue;
      lines.add(src.copyWith(qty: qty, sourceProductId: src.productId));
    }
    return _prefillFromLines(
      lines: lines, customerId: q.customerId, customerName: q.customerName,
      customerPhone: q.customerPhone, discountType: q.discountType,
      discountValue: q.discountValue, sourceType: 'quotation', sourceId: q.id,
    );
  }

  /* ----- sale orders ----- */

  Future<String?> saveSaleOrder({
    String? id,
    String? customerId,
    String customerName = '',
    String customerPhone = '',
    required List<({String productId, double qty, double unitPrice})> picks,
    String discountType = 'flat',
    double discountValue = 0,
    String? expectedDate,
    String? warehouseId,
    String note = '',
  }) async {
    if (!can(role, 'saleOrders', 'write')) return null;
    final lines = _composeDocLines(picks);
    if (lines == null) return null;
    final totals = estimateDocTotals(lines, discountType, discountValue,
        products: products, slabs: taxSlabs, settings: settings);
    if (id != null) {
      final existing = saleOrders.where((o) => o.id == id).firstOrNull;
      if (existing == null || existing.status != 'draft') return null;
      final updated = SaleOrder(
        id: id, number: existing.number, customerId: customerId,
        customerName: customerName, customerPhone: customerPhone, lines: lines,
        subtotal: totals.subtotal, discountType: discountType, discountValue: discountValue,
        discountAmount: totals.discountAmount, estimatedTax: totals.estimatedTax,
        total: totals.total, source: existing.source, expectedDate: expectedDate,
        warehouseId: warehouseId, note: note, status: 'draft',
        dayOffset: 0, ts: existing.ts, originDevice: originDevice,
      );
      await _col('saleOrders').doc(id).set(updated.toMap());
      return id;
    }
    final o = SaleOrder(
      id: newId('so'), customerId: customerId, customerName: customerName,
      customerPhone: customerPhone, lines: lines, subtotal: totals.subtotal,
      discountType: discountType, discountValue: discountValue,
      discountAmount: totals.discountAmount, estimatedTax: totals.estimatedTax,
      total: totals.total, expectedDate: expectedDate, warehouseId: warehouseId,
      note: note, status: 'draft', dayOffset: 0, ts: _now(), originDevice: originDevice,
    );
    await _col('saleOrders').doc(o.id).set(o.toMap());
    return o.id;
  }

  Future<bool> deleteSaleOrder(String id) async {
    if (!can(role, 'saleOrders', 'write')) return false;
    final o = saleOrders.where((x) => x.id == id).firstOrNull;
    if (o == null || o.status != 'draft') return false;
    await _col('saleOrders').doc(id).delete();
    return true;
  }

  Future<bool> confirmSaleOrder(String id) async {
    if (!can(role, 'saleOrders', 'write')) return false;
    final o = saleOrders.where((x) => x.id == id).firstOrNull;
    if (o == null || o.status != 'draft') return false;
    final number = nextDocNumber('saleOrder', saleOrders.map((x) => x.number).toList(), settings.docSeries);
    await _col('saleOrders').doc(id).update({'status': 'open', 'number': number});
    return true;
  }

  Future<bool> cancelSaleOrder(String id) async {
    if (!can(role, 'saleOrders', 'write')) return false;
    final o = saleOrders.where((x) => x.id == id).firstOrNull;
    if (o == null || o.status == 'cancelled') return false;
    if (orderBilledQty(o, bills, deliveryChallans).values.any((v) => v > 0)) return false;
    if (orderDeliveredQty(o, deliveryChallans).values.any((v) => v > 0)) return false;
    await _col('saleOrders').doc(id).update({'status': 'cancelled'});
    return true;
  }

  Future<BillPrefill?> convertOrderToBill(String orderId, List<({String productId, double qty})> picks) async {
    if (!can(role, 'saleOrders', 'view')) return null;
    final o = saleOrders.where((x) => x.id == orderId).firstOrNull;
    if (o == null || (o.status != 'open' && o.status != 'partially_fulfilled')) return null;
    final billed = orderBilledQty(o, bills, deliveryChallans);
    final lines = <DocLine>[];
    for (final p in picks) {
      final src = o.lines.where((l) => l.productId == p.productId).firstOrNull;
      if (src == null) continue;
      final remaining = src.qty - (billed[src.productId] ?? 0);
      final qty = p.qty < remaining ? p.qty : remaining;
      if (qty <= 0) continue;
      lines.add(src.copyWith(qty: qty, sourceProductId: src.productId));
    }
    return _prefillFromLines(
      lines: lines, customerId: o.customerId, customerName: o.customerName,
      customerPhone: o.customerPhone, discountType: o.discountType,
      discountValue: o.discountValue, sourceType: 'order', sourceId: o.id,
      warehouseId: o.warehouseId,
    );
  }

  /* ----- delivery challans (ride the saleOrders row — G-1) ----- */

  bool _challanLinesFitOrder(SaleOrder order, List<DocLine> lines, {String? excludeChallanId}) {
    final delivered = orderDeliveredQty(
      order,
      deliveryChallans.where((c) => c.id != excludeChallanId),
    );
    for (final l in lines) {
      final src = order.lines.where((x) => x.productId == l.productId).firstOrNull;
      if (src == null) return false;
      final remaining = src.qty - (delivered[l.productId] ?? 0);
      if (l.qty > remaining + 1e-9) return false;
    }
    return true;
  }

  Future<String?> saveChallan({
    String? id,
    String? orderId,
    String? customerId,
    String customerName = '',
    String customerPhone = '',
    required List<({String productId, double qty, double unitPrice})> picks,
    String vehicleNo = '',
    String driverName = '',
    String? warehouseId,
    String note = '',
  }) async {
    if (!can(role, 'saleOrders', 'write')) return null;
    final lines = _composeDocLines(picks);
    if (lines == null) return null;
    SaleOrder? order;
    if (orderId != null) {
      order = saleOrders.where((o) => o.id == orderId).firstOrNull;
      if (order == null) return null;
      if (!_challanLinesFitOrder(order, lines, excludeChallanId: id)) return null;
    }
    if (id != null) {
      final existing = deliveryChallans.where((c) => c.id == id).firstOrNull;
      if (existing == null || existing.status != 'draft') return null;
      final updated = DeliveryChallan(
        id: id, number: existing.number, orderId: orderId, customerId: customerId,
        customerName: customerName, customerPhone: customerPhone, lines: lines,
        vehicleNo: vehicleNo, driverName: driverName, warehouseId: warehouseId,
        note: note, status: 'draft', dayOffset: 0, ts: existing.ts, originDevice: originDevice,
      );
      await _col('deliveryChallans').doc(id).set(updated.toMap());
      return id;
    }
    final c = DeliveryChallan(
      id: newId('dc'), orderId: orderId, customerId: customerId,
      customerName: customerName, customerPhone: customerPhone, lines: lines,
      vehicleNo: vehicleNo, driverName: driverName, warehouseId: warehouseId,
      note: note, status: 'draft', dayOffset: 0, ts: _now(), originDevice: originDevice,
    );
    await _col('deliveryChallans').doc(c.id).set(c.toMap());
    return c.id;
  }

  Future<bool> deleteChallan(String id) async {
    if (!can(role, 'saleOrders', 'write')) return false;
    final c = deliveryChallans.where((x) => x.id == id).firstOrNull;
    if (c == null || c.status != 'draft') return false;
    await _col('deliveryChallans').doc(id).delete();
    return true;
  }

  /// MC workflow §3 — dispatching a challan deducts NOTHING.
  /// The stock deduction happens exactly once, at the invoice
  /// (see postBill). This update writes status + number only.
  Future<bool> dispatchChallan(String id) async {
    if (!can(role, 'saleOrders', 'write')) return false;
    final c = deliveryChallans.where((x) => x.id == id).firstOrNull;
    if (c == null || c.status != 'draft') return false;
    if (c.orderId != null) {
      final order = saleOrders.where((o) => o.id == c.orderId).firstOrNull;
      if (order == null) return false;
      final derived = deriveOrderStatus(order, bills, deliveryChallans);
      if (derived != 'open' && derived != 'partially_fulfilled') return false;
      if (!_challanLinesFitOrder(order, c.lines, excludeChallanId: id)) return false;
    }
    final number = nextDocNumber('challan', deliveryChallans.map((x) => x.number).toList(), settings.docSeries);
    await _col('deliveryChallans').doc(id).update({'status': 'dispatched', 'number': number});
    return true;
  }

  Future<bool> cancelChallan(String id) async {
    if (!can(role, 'saleOrders', 'write')) return false;
    final c = deliveryChallans.where((x) => x.id == id).firstOrNull;
    if (c == null || c.status == 'cancelled') return false;
    if (challanBilledQty(c, bills).values.any((v) => v > 0)) return false;
    await _col('deliveryChallans').doc(id).update({'status': 'cancelled'});
    return true;
  }

  Future<BillPrefill?> convertChallanToBill(String challanId, List<({String productId, double qty})> picks) async {
    if (!can(role, 'saleOrders', 'view')) return null;
    final c = deliveryChallans.where((x) => x.id == challanId).firstOrNull;
    if (c == null || (c.status != 'dispatched' && c.status != 'partially_billed')) return null;
    SaleOrder? order;
    if (c.orderId != null) {
      order = saleOrders.where((o) => o.id == c.orderId).firstOrNull;
    }
    final billedHere = challanBilledQty(c, bills);
    final billedOrder = order != null ? orderBilledQty(order, bills, deliveryChallans) : const <String, double>{};
    final lines = <DocLine>[];
    for (final p in picks) {
      final src = c.lines.where((l) => l.productId == p.productId).firstOrNull;
      if (src == null) continue;
      var remaining = src.qty - (billedHere[src.productId] ?? 0);
      if (order != null) {
        final orderLine = order.lines.where((l) => l.productId == p.productId).firstOrNull;
        if (orderLine == null) continue;
        final orderRemaining = orderLine.qty - (billedOrder[src.productId] ?? 0);
        if (orderRemaining < remaining) remaining = orderRemaining;
      }
      final qty = p.qty < remaining ? p.qty : remaining;
      if (qty <= 0) continue;
      // Price = the ORDER's agreed price when order-cited.
      final price = order?.lines.where((l) => l.productId == p.productId).firstOrNull?.unitPrice ?? src.unitPrice;
      lines.add(DocLine(
        productId: src.productId, name: src.name, qty: qty, unitPrice: price,
        total: round2(qty * price), sourceProductId: src.productId,
      ));
    }
    return _prefillFromLines(
      lines: lines, customerId: c.customerId, customerName: c.customerName,
      customerPhone: c.customerPhone,
      discountType: order?.discountType ?? 'flat',
      discountValue: order?.discountValue ?? 0,
      sourceType: 'challan', sourceId: c.id,
      warehouseId: c.warehouseId ?? order?.warehouseId,
    );
  }

  Future<String?> convertOrderToChallan(
    String orderId,
    List<({String productId, double qty})> picks, {
    String vehicleNo = '',
    String driverName = '',
    String? warehouseId,
  }) async {
    if (!can(role, 'saleOrders', 'write')) return null;
    final o = saleOrders.where((x) => x.id == orderId).firstOrNull;
    if (o == null || (o.status != 'open' && o.status != 'partially_fulfilled')) return null;
    final lines = <DocLine>[];
    for (final p in picks) {
      final src = o.lines.where((l) => l.productId == p.productId).firstOrNull;
      if (src == null || p.qty <= 0) continue;
      lines.add(src.copyWith(qty: p.qty, sourceProductId: src.productId));
    }
    if (lines.isEmpty) return null;
    if (!_challanLinesFitOrder(o, lines)) return null;
    return saveChallan(
      orderId: o.id, customerId: o.customerId, customerName: o.customerName,
      customerPhone: o.customerPhone,
      picks: [for (final l in lines) (productId: l.productId, qty: l.qty, unitPrice: l.unitPrice)],
      vehicleNo: vehicleNo, driverName: driverName,
      warehouseId: warehouseId ?? o.warehouseId,
    );
  }

  /* ----- purchase orders ----- */

  Future<String?> savePurchaseOrder({
    String? id,
    required String supplierId,
    required List<({String productId, double qty, double unitCost})> picks,
    String? expectedDate,
    String? warehouseId,
    String note = '',
  }) async {
    if (!can(role, 'purchaseOrders', 'write')) return null;
    final supplier = suppliers.where((s) => s.id == supplierId).firstOrNull;
    if (supplier == null) return null;
    final lines = _composePoLines(picks);
    if (lines == null) return null;
    final total = round2(lines.fold(0.0, (a, l) => a + l.total));
    if (id != null) {
      final existing = purchaseOrders.where((p) => p.id == id).firstOrNull;
      if (existing == null || existing.status != 'draft') return null;
      final updated = PurchaseOrder(
        id: id, number: existing.number, supplierId: supplierId,
        supplierName: supplier.name, lines: lines, total: total,
        expectedDate: expectedDate, warehouseId: warehouseId, note: note,
        status: 'draft', dayOffset: 0, ts: existing.ts, originDevice: originDevice,
      );
      await _col('purchaseOrders').doc(id).set(updated.toMap());
      return id;
    }
    final po = PurchaseOrder(
      id: newId('po'), supplierId: supplierId, supplierName: supplier.name,
      lines: lines, total: total, expectedDate: expectedDate,
      warehouseId: warehouseId, note: note, status: 'draft',
      dayOffset: 0, ts: _now(), originDevice: originDevice,
    );
    await _col('purchaseOrders').doc(po.id).set(po.toMap());
    return po.id;
  }

  Future<bool> deletePurchaseOrder(String id) async {
    if (!can(role, 'purchaseOrders', 'write')) return false;
    final po = purchaseOrders.where((x) => x.id == id).firstOrNull;
    if (po == null || po.status != 'draft') return false;
    await _col('purchaseOrders').doc(id).delete();
    return true;
  }

  Future<bool> issuePurchaseOrder(String id) async {
    if (!can(role, 'purchaseOrders', 'write')) return false;
    final po = purchaseOrders.where((x) => x.id == id).firstOrNull;
    if (po == null || po.status != 'draft') return false;
    final number = nextDocNumber('purchaseOrder', purchaseOrders.map((x) => x.number).toList(), settings.docSeries);
    await _col('purchaseOrders').doc(id).update({'status': 'issued', 'number': number});
    return true;
  }

  Future<bool> cancelPurchaseOrder(String id) async {
    if (!can(role, 'purchaseOrders', 'write')) return false;
    final po = purchaseOrders.where((x) => x.id == id).firstOrNull;
    if (po == null || po.status == 'cancelled') return false;
    if (poReceivedQty(po, purchases).values.any((v) => v > 0)) return false;
    await _col('purchaseOrders').doc(id).update({'status': 'cancelled'});
    return true;
  }

  /// Receive goods against a PO: composePoReceiptLines validates
  /// against the DERIVED received qty; the receipt posts through
  /// [recordPurchase] with the PO citation (which recomputes the
  /// PO's cached status in the same batch).
  Future<bool> receiveAgainstPo(
    PurchaseOrder po,
    List<({String productId, double qty, double? unitCost})> picks, {
    String? warehouseId,
  }) async {
    if (!can(role, 'purchaseOrders', 'write')) return false;
    final lines = composePoReceiptLines(
      po, purchases, products,
      [for (final p in picks) PoReceiptPick(productId: p.productId, qty: p.qty, unitCost: p.unitCost)],
    );
    if (lines == null) return false;
    return recordPurchase(
      supplierId: po.supplierId,
      lines: [for (final l in lines) (productId: l.productId, qty: l.qty, unitCost: l.unitCost)],
      sourcePoId: po.id,
      warehouseId: warehouseId ?? po.warehouseId,
    );
  }

  /* ================= F3 · operations ================= */

  /// Live actions are dated today — dayOffset 0 in this
  /// codebase's convention (the composers and F1/F2 actions all
  /// stamp 0 for "now"; backdating is a voucher-desk concern).
  int _todayOffset() => 0;

  void _productDelta(WriteBatch batch, String productId, double delta) {
    _stockIncrement(batch, productId, delta);
  }

  /* ---------------- warehouses (§1) ---------------- */

  Future<bool> addWarehouse({required String name, String note = '', bool makeDefault = false}) async {
    if (!can(role, 'warehouses', 'write')) return false;
    final trimmed = name.trim();
    if (trimmed.isEmpty) return false;
    final id = _col('warehouses').doc().id;
    final sort = warehouses.fold<int>(0, (m, w) => w.sortOrder > m ? w.sortOrder : m);
    final batch = db.batch();
    if (makeDefault) {
      for (final w in warehouses) {
        if (w.isDefault) batch.update(_col('warehouses').doc(w.id), {'isDefault': false});
      }
    }
    batch.set(_col('warehouses').doc(id), {
      'name': trimmed, 'isDefault': makeDefault || warehouses.isEmpty,
      'archived': false, 'note': note.trim(), 'sortOrder': sort + 1, 'ts': _now(),
    });
    await _commit(batch, () => [
          {'collection': 'warehouses', 'id': id, 'name': trimmed},
        ]);
    return true;
  }

  Future<bool> updateWarehouse(Warehouse w, {String? name, String? note, bool? archived}) async {
    if (!can(role, 'warehouses', 'write')) return false;
    if (archived == true && w.isDefault) return false; // the default can't be archived (§1.2)
    final patch = <String, dynamic>{
      if (name != null && name.trim().isNotEmpty) 'name': name.trim(),
      if (note != null) 'note': note.trim(),
      if (archived != null) 'archived': archived,
    };
    if (patch.isEmpty) return false;
    await _col('warehouses').doc(w.id).update(patch);
    return true;
  }

  Future<bool> setDefaultWarehouse(String id) async {
    if (!can(role, 'warehouses', 'write')) return false;
    final target = warehouses.where((w) => w.id == id).firstOrNull;
    if (target == null || target.archived || target.isDefault) return false;
    final batch = db.batch();
    for (final w in warehouses) {
      if (w.isDefault) batch.update(_col('warehouses').doc(w.id), {'isDefault': false});
    }
    batch.update(_col('warehouses').doc(id), {'isDefault': true});
    await _commit(batch, () => [
          {'collection': 'warehouses', 'id': id, 'isDefault': true},
        ]);
    return true;
  }

  /// §1.7 recount: repair drifted products' default-warehouse
  /// rows (rows only — no journal entry). Returns the count.
  Future<int> recountStockLevels() async {
    if (!can(role, 'warehouses', 'write')) return 0;
    final rec = stock_core.recountLevels(products, stockLevels, warehouses, stockTransfers);
    if (rec.repaired == 0) return 0;
    final before = {for (final l in stockLevels) l.id: l};
    final batch = db.batch();
    for (final l in rec.levels) {
      final prev = before[l.id];
      if (prev == null || prev.qty != l.qty) {
        batch.set(_col('stockLevels').doc(l.id), l.toMap());
      }
    }
    await _commit(batch, () => [
          {'collection': 'stockLevels', 'recount': rec.repaired},
        ]);
    return rec.repaired;
  }

  /// §3.1/§4.1: a class toggle posts ONE reclass entry for the
  /// on-hand value (the pure builder returns null when nothing
  /// moves) and writes the new class in the same batch. (The
  /// web's updateProduct also writes a revaluation adjustment
  /// doc; the Flutter product editor saves fields plainly — the
  /// class toggle is the one money-moving part and it posts
  /// identically.)
  Future<bool> changeProductClass(Product product, String newClass) async {
    if (!can(role, 'inventory', 'write')) return false;
    final target = newClass == 'raw' ? 'raw' : 'goods';
    if ((product.stockClass ?? 'goods') == target) return false;
    final entry = tr_core.buildReclassEntry(product, target, product.stockQty, product.costPrice);
    final batch = db.batch();
    if (entry != null) {
      final guarded = _tryGuard([entry]);
      if (guarded == null) return false;
      _postEntry(batch, guarded.single);
    }
    batch.update(_col('products').doc(product.id), {'stockClass': target});
    await _commit(batch, () => [
          {'collection': 'products', 'id': product.id, 'stockClass': target},
          if (entry != null) entry.toMap(),
        ]);
    return true;
  }

  /* ---------------- stock transfers (§2) ---------------- */

  /// The one commit behind every transfer movement: an optional
  /// journal entry (close-short only), the movement doc with its
  /// level deltas, and the transfer's own lines/status/number —
  /// atomically (§2.3/§2.4).
  Future<bool> _commitTransferMovement(
    StockTransfer t, {
    required List<StockTransferLine> lines,
    required String status,
    required Map<String, double> deltas,
    required String note,
    String? mintNumber,
    JournalEntry? entry,
  }) async {
    final batch = db.batch();
    JournalEntry? guardedEntry;
    if (entry != null) {
      final guarded = _tryGuard([entry]);
      if (guarded == null) return false;
      guardedEntry = guarded.single;
      _postEntry(batch, guardedEntry);
    }
    if (deltas.isNotEmpty) {
      final adjId = newId('adj');
      final movement = [
        for (final e in deltas.entries)
          {
            'warehouseId': e.key.substring(0, e.key.indexOf('__')),
            'productId': e.key.substring(e.key.indexOf('__') + 2),
            'qty': e.value,
          },
      ];
      batch.set(_col('stockAdjustments').doc(adjId), {
        'type': 'transfer', 'refId': t.id, 'refNumber': mintNumber ?? t.number ?? '',
        'fromWarehouseId': t.fromWarehouseId, 'toWarehouseId': t.toWarehouseId,
        'note': note, 'movement': movement, 'dayOffset': _todayOffset(), 'ts': _now(),
        if (originDevice.isNotEmpty) 'originDevice': originDevice,
      });
      deltas.forEach((levelId, delta) {
        final wh = levelId.substring(0, levelId.indexOf('__'));
        final pid = levelId.substring(levelId.indexOf('__') + 2);
        _levelDelta(batch, wh, pid, delta);
      });
    }
    batch.update(_col('stockTransfers').doc(t.id), {
      'lines': lines.map((l) => l.toMap()).toList(),
      'status': status,
      if (mintNumber != null) 'number': mintNumber,
      'ts': _now(),
    });
    await _commit(batch, () => [
          t.toMap(),
          if (guardedEntry != null) guardedEntry.toMap(),
        ]);
    return true;
  }

  Future<bool> createStockTransfer({
    required String fromWarehouseId,
    required String toWarehouseId,
    required List<({String productId, double qty})> picks,
    String note = '',
  }) async {
    if (!can(role, 'warehouses', 'write')) return false;
    if (tr_core.transferRouteProblem(fromWarehouseId, toWarehouseId, warehouses) != null) return false;
    final lines = tr_core.composeTransferLines(products, picks.map((p) => (productId: p.productId, qty: p.qty)).toList());
    if (lines == null) return false;
    final id = _col('stockTransfers').doc().id;
    final t = StockTransfer(
      id: id, fromWarehouseId: fromWarehouseId, toWarehouseId: toWarehouseId,
      lines: lines, status: 'draft', note: note, dayOffset: _todayOffset(),
    );
    await _col('stockTransfers').doc(id).set(t.toMap());
    return true;
  }

  Future<bool> updateStockTransfer(
    StockTransfer t, {
    String? fromWarehouseId,
    String? toWarehouseId,
    List<({String productId, double qty})>? picks,
    String? note,
  }) async {
    if (!can(role, 'warehouses', 'write')) return false;
    if (!tr_core.canTransferTransition(t, 'edit')) return false;
    final from = fromWarehouseId ?? t.fromWarehouseId;
    final to = toWarehouseId ?? t.toWarehouseId;
    if (tr_core.transferRouteProblem(from, to, warehouses) != null) return false;
    List<StockTransferLine>? lines;
    if (picks != null) {
      lines = tr_core.composeTransferLines(products, picks);
      if (lines == null) return false;
    }
    await _col('stockTransfers').doc(t.id).update({
      'fromWarehouseId': from, 'toWarehouseId': to,
      if (lines != null) 'lines': lines.map((l) => l.toMap()).toList(),
      if (note != null) 'note': note,
      'ts': _now(),
    });
    return true;
  }

  Future<bool> deleteStockTransfer(StockTransfer t) async {
    if (!can(role, 'warehouses', 'write')) return false;
    if (!tr_core.canTransferTransition(t, 'delete')) return false;
    await _col('stockTransfers').doc(t.id).delete();
    return true;
  }

  Future<bool> cancelStockTransfer(StockTransfer t) async {
    if (!can(role, 'warehouses', 'write')) return false;
    if (!tr_core.canTransferTransition(t, 'cancel')) return false;
    await _col('stockTransfers').doc(t.id).update({'status': 'cancelled', 'ts': _now()});
    return true;
  }

  /// Dispatch mints the TR- number, drops the source rows and
  /// posts NOTHING (§2.3). Availability is re-derived here, at
  /// the source warehouse only.
  Future<bool> dispatchStockTransfer(StockTransfer t) async {
    if (!can(role, 'warehouses', 'write')) return false;
    if (!tr_core.canTransferTransition(t, 'dispatch')) return false;
    if (tr_core.transferRouteProblem(t.fromWarehouseId, t.toWarehouseId, warehouses) != null) return false;
    for (final l in t.lines) {
      final p = productsById[l.productId];
      if (p == null || qtyAtWh(p, t.fromWarehouseId) < l.qtySent - 1e-9) return false;
    }
    final number = t.number ??
        nextDocNumber('stockTransfer', stockTransfers.map((x) => x.number).toList(), settings.docSeries);
    final deltas = <String, double>{};
    for (final l in t.lines) {
      final key = stock_core.levelIdFor(t.fromWarehouseId, l.productId);
      deltas[key] = (deltas[key] ?? 0) - l.qtySent;
    }
    return _commitTransferMovement(t,
        lines: t.lines, status: 'dispatched', deltas: deltas, note: 'Dispatched', mintNumber: number);
  }

  /// Receive posts NOTHING either: destination rows rise by the
  /// picked quantities; the status derives from the lines.
  Future<bool> receiveStockTransfer(
      StockTransfer t, List<({String productId, double qty})> picks) async {
    if (!can(role, 'warehouses', 'write')) return false;
    if (!tr_core.canTransferTransition(t, 'receive')) return false;
    final valid = tr_core.validateReceivePicks(t, picks);
    if (valid == null) return false;
    final applied = tr_core.applyReceivePicks(t.lines, valid);
    final deltas = <String, double>{};
    for (final p in valid) {
      if (p.qty <= 0) continue;
      final key = stock_core.levelIdFor(t.toWarehouseId, p.productId);
      deltas[key] = (deltas[key] ?? 0) + p.qty;
    }
    return _commitTransferMovement(t,
        lines: applied, status: tr_core.statusAfterReceive(applied), deltas: deltas, note: 'Received');
  }

  /// Close short: THE one posting transfer event (§2.4) — the
  /// shortages value out of the class accounts into
  /// inventory_loss, dated today, through the guard.
  Future<bool> closeStockTransfer(StockTransfer t) async {
    if (!can(role, 'warehouses', 'write')) return false;
    if (!tr_core.canTransferTransition(t, 'closeShort')) return false;
    final shortages = tr_core.transferShortages(t);
    final entry = shortages.isEmpty
        ? null
        : tr_core.buildTransferLossEntry(t, shortages, productsById);
    // Line state derives from the quantities (the Dart line type
    // carries no per-line status); the transfer closes as
    // 'received'. Product-total write-downs ride the same commit
    // as the entry (§1.5's mirror identity on the shortfall leg).
    return _closeShortWithProducts(t, t.lines, entry);
  }

  Future<bool> _closeShortWithProducts(
      StockTransfer t, List<StockTransferLine> lines, JournalEntry? entry) async {
    final batch = db.batch();
    JournalEntry? guardedEntry;
    if (entry != null) {
      final guarded = _tryGuard([entry]);
      if (guarded == null) return false;
      guardedEntry = guarded.single;
      _postEntry(batch, guardedEntry);
    }
    for (final s in tr_core.transferShortages(t)) {
      _productDelta(batch, s.productId, -s.qty);
    }
    batch.update(_col('stockTransfers').doc(t.id), {
      'lines': lines.map((l) => l.toMap()).toList(),
      'status': 'received',
      'ts': _now(),
    });
    await _commit(batch, () => [
          t.toMap(),
          if (guardedEntry != null) guardedEntry.toMap(),
        ]);
    return true;
  }

  /// Return-to-source: the un-received remainder goes back to
  /// the source rows (§2.4). No entry, ever.
  Future<bool> returnStockTransfer(StockTransfer t) async {
    if (!can(role, 'warehouses', 'write')) return false;
    if (!tr_core.canTransferTransition(t, 'returnToSource')) return false;
    final deltas = <String, double>{};
    for (final l in t.lines) {
      final remaining = tr_core.lineRemaining(l);
      if (remaining <= 0) continue;
      final toKey = stock_core.levelIdFor(t.toWarehouseId, l.productId);
      final fromKey = stock_core.levelIdFor(t.fromWarehouseId, l.productId);
      deltas[toKey] = (deltas[toKey] ?? 0) - remaining;
      deltas[fromKey] = (deltas[fromKey] ?? 0) + remaining;
    }
    return _commitTransferMovement(t,
        lines: t.lines, status: 'returned', deltas: deltas, note: 'Returned to source');
  }

  /* ---------------- BOM (§3) ---------------- */

  /// Save a BOM as a NEW immutable version (§3.2): the draft is
  /// validated by the pure core; the new version activates and
  /// the previous actives for the output deactivate — old
  /// versions are never edited or deleted.
  Future<bool> saveBomVersion({
    required String outputProductId,
    required double outputQty,
    required List<({String productId, double qty})> lines,
    double labourCost = 0,
    double overheadCost = 0,
  }) async {
    if (!can(role, 'manufacturing', 'write')) return false;
    final output = productsById[outputProductId];
    if (output == null) return false;
    final draft = BomDraft(
      outputProductId: outputProductId, outputQty: outputQty,
      labourCost: labourCost, overheadCost: overheadCost,
      lines: [for (final l in lines) (productId: l.productId, qty: l.qty)],
    );
    if (validateBomDraft(products, draft) != null) return false;
    final bomLines = [
      for (final l in lines)
        BomLine(productId: l.productId, name: productsById[l.productId]?.name ?? l.productId, qty: l.qty),
    ];
    final version = nextBomVersion(boms, outputProductId);
    final id = _col('boms').doc().id;
    final bom = Bom(
      id: id, outputProductId: outputProductId, outputName: output.name,
      outputQty: outputQty, lines: bomLines, labourCost: labourCost,
      overheadCost: overheadCost, version: version, active: true, ts: _now(),
    );
    final batch = db.batch();
    batch.set(_col('boms').doc(id), bom.toMap());
    for (final b in boms) {
      if (b.outputProductId == outputProductId && b.active) {
        batch.update(_col('boms').doc(b.id), {'active': false});
      }
    }
    await _commit(batch, () => [bom.toMap()]);
    return true;
  }

  /* ---------------- production (§4) ---------------- */

  Future<bool> _commitProductionEvent(
    ProductionOrder order,
    ProductionEvent event,
    JournalEntry? entry, {
    void Function(WriteBatch batch)? extra,
  }) async {
    final batch = db.batch();
    JournalEntry? guardedEntry;
    if (entry != null) {
      final guarded = _tryGuard([entry]);
      if (guarded == null) return false;
      guardedEntry = guarded.single;
      _postEntry(batch, guardedEntry);
    }
    extra?.call(batch);
    final events = [...order.events, event];
    final updated = order.copyWith(events: events);
    batch.update(_col('productionOrders').doc(order.id), {
      'events': events.map((e) => e.toMap()).toList(),
      'status': deriveProductionStatus(updated),
      'ts': _now(),
    });
    await _commit(batch, () => [
          updated.toMap(),
          if (guardedEntry != null) guardedEntry.toMap(),
        ]);
    return true;
  }

  Future<bool> createProductionOrder({
    required String outputProductId,
    required String warehouseId,
    required double plannedQty,
    bool openNow = true,
  }) async {
    if (!can(role, 'manufacturing', 'write')) return false;
    final output = productsById[outputProductId];
    final bom = activeBomFor(boms, outputProductId);
    if (output == null || bom == null || plannedQty <= 0) return false;
    if (output.isRaw) return false;
    final id = _col('productionOrders').doc().id;
    final order = ProductionOrder(
      id: id,
      number: openNow
          ? nextDocNumber('productionOrder', productionOrders.map((x) => x.number).toList(), settings.docSeries)
          : null,
      outputProductId: outputProductId, outputName: output.name,
      warehouseId: stock_core.resolveWarehouseId(warehouses, warehouseId),
      plannedQty: plannedQty, status: openNow ? 'open' : 'draft',
      bomId: bom.id, bomVersion: bom.version,
      bomSnapshot: snapshotOfBom(bom), dayOffset: _todayOffset(),
    );
    await _col('productionOrders').doc(id).set(order.toMap());
    return true;
  }

  Future<bool> updateProductionOrder(ProductionOrder o, {double? plannedQty, String? warehouseId}) async {
    if (!can(role, 'manufacturing', 'write')) return false;
    if (o.status != 'draft' || o.events.isNotEmpty) return false;
    final patch = <String, dynamic>{
      if (plannedQty != null && plannedQty > 0) 'plannedQty': plannedQty,
      if (warehouseId != null) 'warehouseId': warehouseId,
      'ts': _now(),
    };
    if (patch.length == 1) return false;
    await _col('productionOrders').doc(o.id).update(patch);
    return true;
  }

  Future<bool> openProductionOrder(ProductionOrder o) async {
    if (!can(role, 'manufacturing', 'write')) return false;
    if (o.status != 'draft') return false;
    await _col('productionOrders').doc(o.id).update({
      'status': 'open',
      'number': o.number ??
          nextDocNumber('productionOrder', productionOrders.map((x) => x.number).toList(), settings.docSeries),
      'ts': _now(),
    });
    return true;
  }

  Future<bool> deleteProductionOrder(ProductionOrder o) async {
    if (!can(role, 'manufacturing', 'write')) return false;
    if (o.status != 'draft' || o.events.isNotEmpty) return false;
    await _col('productionOrders').doc(o.id).delete();
    return true;
  }

  Future<bool> cancelProductionOrder(ProductionOrder o) async {
    if (!can(role, 'manufacturing', 'write')) return false;
    if (o.events.isNotEmpty) return false; // orders with events close out, never bare-cancel (§4.4)
    if (o.status == 'completed' || o.status == 'cancelled') return false;
    await _col('productionOrders').doc(o.id).update({'status': 'cancelled', 'ts': _now()});
    return true;
  }

  /// Issue components (+ conversion) into WIP: values at the
  /// shelf cost AT THE ORDER'S WAREHOUSE (§4.2), through the
  /// guard, one entry + one event.
  Future<bool> issueProductionMaterials(ProductionOrder order, IssueInput input) async {
    if (!can(role, 'manufacturing', 'write')) return false;
    final res = prepareIssue(order, products, stockLevels, warehouses, accounts, input);
    if (res.prepared == null) return false;
    final prepared = res.prepared!;
    return _commitProductionEvent(order, prepared.event, prepared.entry, extra: (batch) {
      for (final l in prepared.lines) {
        _productDelta(batch, l.productId, -l.qty);
        _levelDelta(batch, order.warehouseId, l.productId, -l.qty);
      }
    });
  }

  /// Completion: the absorption F is final ⇒ the event takes
  /// the ENTIRE pool (§4.3 — WIP ends at exactly zero); the
  /// output's moving cost becomes V/F and the units land in
  /// the order warehouse's row.
  Future<bool> completeProduction(ProductionOrder order, double qty, {bool finalCompletion = false}) async {
    if (!can(role, 'manufacturing', 'write')) return false;
    final abs = completionAbsorb(order, qty, finalCompletion);
    if (abs.problem != null || abs.value == null) return false;
    final value = abs.value!;
    final entry = buildCompletionEntry(order, qty, value);
    final event = ProductionEvent(kind: 'completion', qty: qty, value: value, entryId: entry.id);
    return _commitProductionEvent(order, event, entry, extra: (batch) {
      _productDelta(batch, order.outputProductId, qty);
      _levelDelta(batch, order.warehouseId, order.outputProductId, qty);
      batch.update(_col('products').doc(order.outputProductId),
          {'costPrice': round2(value / qty)});
    });
  }

  Future<bool> scrapProduction(ProductionOrder order, double qty) async {
    if (!can(role, 'manufacturing', 'write')) return false;
    final abs = scrapAbsorb(order, qty);
    if (abs.problem != null || abs.value == null) return false;
    final value = abs.value!;
    final entry = buildScrapEntry(order, qty, value, 'scrap');
    final event = ProductionEvent(kind: 'scrap', qty: qty, value: value, entryId: entry.id);
    return _commitProductionEvent(order, event, entry);
  }

  /// Close-out: the residual pool becomes production_scrap;
  /// with no pool left the close is a status write only (§4.4).
  Future<bool> closeProductionOrder(ProductionOrder order) async {
    if (!can(role, 'manufacturing', 'write')) return false;
    if (order.status != 'open') return false;
    final pool = poolOf(order);
    if (pool <= 0) {
      await _col('productionOrders').doc(order.id).update({
        'status': producedQty(order) > 0 ? 'completed' : 'cancelled',
        'ts': _now(),
      });
      return true;
    }
    final entry = buildScrapEntry(order, 0, pool, 'closeout');
    final event = ProductionEvent(kind: 'closeout', value: pool, entryId: entry.id);
    return _commitProductionEvent(order, event, entry);
  }

  /* ---------------- jobs (§5) ---------------- */

  Future<bool> createJob({
    required String title,
    String? customerId,
    String customerName = '',
    String customerPhone = '',
    String description = '',
    String? warehouseId,
    String? stage,
    String? dueDateISO,
    double labourCost = 0,
    String note = '',
  }) async {
    if (!can(role, 'jobTracker', 'write')) return false;
    if (title.trim().isEmpty) return false;
    final stages = effectiveJobStages(settings);
    final id = _col('jobs').doc().id;
    final wh = stock_core.resolveWarehouseId(warehouses, warehouseId);
    final job = Job(
      id: id,
      number: nextDocNumber('job', jobs.map((x) => x.number).toList(), settings.docSeries),
      title: title.trim(), customerId: customerId, customerName: customerName.trim(),
      customerPhone: customerPhone.trim(), description: description.trim(),
      warehouseId: wh, stage: stage ?? stages.first, labourCost: labourCost,
      dueDateISO: dueDateISO, note: note, dayOffset: _todayOffset(),
    );
    final withStatus = job.copyWith(status: deriveJobStatus(job, stages));
    await _col('jobs').doc(id).set(withStatus.toMap());
    return true;
  }

  Future<bool> updateJob(Job j, {String? title, String? description, double? labourCost, String? dueDateISO, String? note}) async {
    if (!can(role, 'jobTracker', 'write')) return false;
    if (j.status == 'delivered' || j.status == 'cancelled') return false;
    final patch = <String, dynamic>{
      if (title != null && title.trim().isNotEmpty) 'title': title.trim(),
      if (description != null) 'description': description.trim(),
      if (labourCost != null) 'labourCost': labourCost,
      if (dueDateISO != null) 'dueDateISO': dueDateISO,
      if (note != null) 'note': note,
      'ts': _now(),
    };
    if (patch.length == 1) return false;
    await _col('jobs').doc(j.id).update(patch);
    return true;
  }

  Future<bool> setJobStage(Job j, String stage) async {
    if (!can(role, 'jobTracker', 'write')) return false;
    if (j.status == 'delivered' || j.status == 'cancelled') return false;
    final updated = j.copyWith(stage: stage);
    await _col('jobs').doc(j.id).update({
      'stage': stage,
      'status': deriveJobStatus(updated, effectiveJobStages(settings)),
      'ts': _now(),
    });
    return true;
  }

  Future<bool> deliverJob(Job j) async {
    if (!can(role, 'jobTracker', 'write')) return false;
    if (j.status == 'delivered' || j.status == 'cancelled') return false;
    await _col('jobs').doc(j.id).update({'status': 'delivered', 'ts': _now()});
    return true;
  }

  Future<bool> cancelJob(Job j) async {
    if (!can(role, 'jobTracker', 'write')) return false;
    if (j.status == 'delivered' || j.status == 'cancelled') return false;
    await _col('jobs').doc(j.id).update({'status': 'cancelled', 'ts': _now()});
    return true;
  }

  /// Material issue/return (§5.3): valued at shelf cost at the
  /// JOB's warehouse, posted through the guard, event appended
  /// in the same batch.
  Future<bool> _commitJobMaterial(Job job, String kind, List<({String productId, double qty})> picks) async {
    if (!can(role, 'jobTracker', 'write')) return false;
    final res = prepareMaterialEvent(job, products, stockLevels, warehouses, kind, picks);
    if (res.prepared == null) return false;
    final prepared = res.prepared!;
    final batch = db.batch();
    final guarded = _tryGuard([prepared.entry]);
    if (guarded == null) return false;
    _postEntry(batch, guarded.single);
    for (final l in prepared.lines) {
      final sign = kind == 'issue' ? -1.0 : 1.0;
      _productDelta(batch, l.productId, sign * l.qty);
      _levelDelta(batch, job.warehouseId, l.productId, sign * l.qty);
    }
    final events = [...job.materialEvents, ...prepared.events];
    batch.update(_col('jobs').doc(job.id), {
      'materialEvents': events.map((e) => e.toMap()).toList(),
      'ts': _now(),
    });
    await _commit(batch, () => [
          job.toMap(),
          guarded.single.toMap(),
        ]);
    return true;
  }

  Future<bool> issueJobMaterials(Job job, List<({String productId, double qty})> picks) =>
      _commitJobMaterial(job, 'issue', picks);

  Future<bool> returnJobMaterials(Job job, List<({String productId, double qty})> picks) =>
      _commitJobMaterial(job, 'return', picks);

  /// §5.4: hand the job to the billing desk (no write here —
  /// the bill posts once through [postBill], which flips the
  /// job to delivered in its batch).
  bool convertJobToBill(Job job) {
    if (!can(role, 'billing', 'write')) return false;
    if (job.status == 'delivered' || job.status == 'cancelled') return false;
    billPrefill = BillPrefill(
      sourceType: 'job',
      sourceId: job.id,
      customerId: job.customerId,
      customerName: job.customerName,
      customerPhone: job.customerPhone,
      lines: const [],
    );
    notifyListeners();
    return true;
  }

  /* ================= F4 · HR, loans, fiscal close, settings ================= */
  /* Mirrors web StoreProvider's Phase D actions: the same gates
   * (lib/permissions matrix), the same compositions (core ports
   * of lib/payroll, lib/loans, lib/fiscal), the same ONE-batch
   * doc+entry commits through the guard. */

  Employee? employeeById(String id) {
    for (final e in employees) {
      if (e.id == id) return e;
    }
    return null;
  }

  PayrollRun? runById(String id) {
    for (final r in payrollRuns) {
      if (r.id == id) return r;
    }
    return null;
  }

  Loan? loanById(String id) {
    for (final l in loans) {
      if (l.id == id) return l;
    }
    return null;
  }

  AttendanceMonth? attendanceDoc(String employeeId, String month) {
    final id = attendanceDocId(employeeId, month);
    for (final a in attendance) {
      if (a.id == id) return a;
    }
    return null;
  }

  /* ---------------- employees (D1, design §1) ---------------- */

  Future<String?> addEmployee({
    required String name,
    String phone = '',
    String designation = '',
    String? linkedUserEmail,
    String? joinDateISO,
    String payBasis = 'monthly',
    double baseAmount = 0,
    List<PayLine> allowances = const [],
    int paidLeaveDays = 0,
    String note = '',
  }) async {
    if (!can(role, 'staffDirectory', 'write')) return null;
    final trimmed = name.trim();
    if (trimmed.isEmpty) return null;
    final email = (linkedUserEmail ?? '').trim().toLowerCase();
    final emp = Employee(
      id: newId('emp'),
      name: trimmed,
      phone: phone.trim(),
      designation: designation.trim(),
      linkedUserEmail: email.isEmpty ? null : email,
      joinDateISO: (joinDateISO ?? '').trim().isEmpty ? null : joinDateISO!.trim(),
      payBasis: payBasis,
      baseAmount: baseAmount < 0 ? 0 : baseAmount,
      allowances: [
        for (final a in allowances)
          if (a.label.trim().isNotEmpty || a.amount > 0)
            PayLine(label: a.label.trim(), amount: a.amount < 0 ? 0 : a.amount),
      ],
      paidLeaveDays: paidLeaveDays < 0 ? 0 : paidLeaveDays,
      active: true,
      note: note,
      ts: _now(),
    );
    await _col('employees').doc(emp.id).set(emp.toMap());
    return emp.id;
  }

  /// Edit an employee's terms (web `updateEmployee`): the name
  /// can never be blanked; terms changes never rewrite history.
  Future<bool> saveEmployee(Employee emp) async {
    if (!can(role, 'staffDirectory', 'write')) return false;
    if (employeeById(emp.id) == null) return false;
    if (emp.name.trim().isEmpty) return false;
    await _col('employees').doc(emp.id).set(emp.toMap());
    return true;
  }

  Future<bool> setEmployeeActive(String id, bool active) async {
    if (!can(role, 'staffDirectory', 'write')) return false;
    final cur = employeeById(id);
    if (cur == null) return false;
    await _col('employees').doc(id).set(cur.copyWith(active: active).toMap());
    return true;
  }

  /// Hard delete is refused while any record cites the employee
  /// (design §1.5) — deactivation is the normal path.
  Future<bool> deleteEmployee(String id) async {
    if (!can(role, 'staffDirectory', 'write')) return false;
    if (employeeById(id) == null) return false;
    final cited = attendance.any((a) => a.employeeId == id) ||
        payrollRuns.any((r) => r.lines.any((l) => l.employeeId == id)) ||
        loans.any((l) => l.partyId == id) ||
        journal.any((e) => e.lines.any((l) => l.ref == id));
    if (cited) return false;
    await _col('employees').doc(id).delete();
    return true;
  }

  /* ---------------- attendance (D1, design §1.3) ---------------- */

  Future<bool> setAttendanceMark(String employeeId, String month, int day, String? mark) async {
    if (!can(role, 'staffDirectory', 'write')) return false;
    if (employeeById(employeeId) == null) return false;
    if (!RegExp(r'^\d{4}-\d{2}$').hasMatch(month)) return false;
    if (day < 1 || day > 31) return false;
    if (mark != null && !attendanceCycle.contains(mark)) return false;
    final existing = attendanceDoc(employeeId, month);
    final days = <String, String>{...?existing?.days};
    if (mark == null) {
      days.remove('$day');
    } else {
      days['$day'] = mark;
    }
    final doc = AttendanceMonth(
      id: attendanceDocId(employeeId, month),
      employeeId: employeeId,
      month: month,
      days: days,
      ts: existing?.ts ?? _now(),
    );
    await _col('attendance').doc(doc.id).set(doc.toMap());
    return true;
  }

  /* ---------------- payroll (D2, design §2) ---------------- */

  Future<void> _commitPayroll(PayrollRun run, List<JournalEntry> entries) async {
    final batch = db.batch();
    batch.set(_col('payrollRuns').doc(run.id), run.toMap());
    for (final e in entries) {
      _postEntry(batch, e);
    }
    await _commit(batch, () => [run.toMap(), for (final e in entries) e.toMap()]);
  }

  /// Open the month's run: the existing DRAFT when one is open
  /// (compose is idempotent), else a fresh draft built from the
  /// directory + attendance snapshots (§2.3).
  Future<String?> composePayrollRun(String month) async {
    if (!can(role, 'payroll', 'write')) return null;
    for (final r in payrollRuns) {
      if (r.month == month && r.status == 'draft') return r.id;
    }
    final lines = buildRunLines(employees, attendance, month);
    final run = PayrollRun(
      id: newId('run'),
      month: month,
      lines: lines,
      totals: payrollRunTotals(lines),
      status: 'draft',
      dayOffset: 0,
      ts: _now(),
    );
    await _col('payrollRuns').doc(run.id).set(run.toMap());
    return run.id;
  }

  /// Save desk edits to a DRAFT run: every line re-derives its
  /// gross/net through payrollLineTotals (§2.3).
  Future<bool> updatePayrollRun(PayrollRun run) async {
    if (!can(role, 'payroll', 'write')) return false;
    final cur = runById(run.id);
    if (cur == null || cur.status != 'draft') return false;
    final lines = run.lines.map(payrollLineTotals).toList();
    final next = cur.copyWith(lines: lines, totals: payrollRunTotals(lines), note: run.note);
    await _col('payrollRuns').doc(run.id).set(next.toMap());
    return true;
  }

  /// Draft deletion is owner-only (design §2.3).
  Future<bool> deletePayrollRun(String id) async {
    if (role != 'owner') return false;
    final cur = runById(id);
    if (cur == null || cur.status != 'draft') return false;
    await _col('payrollRuns').doc(id).delete();
    return true;
  }

  /// Finalise: mint PAY- and post the ONE net accrual entry in
  /// the same batch (§2.4). Refused once the month has a posted
  /// run standing.
  Future<bool> finalisePayrollRun(String id) async {
    if (!can(role, 'payroll', 'write')) return false;
    final cur = runById(id);
    if (cur == null || cur.status != 'draft') return false;
    if (payrollRuns.any((r) => r.id != id && r.month == cur.month && r.status == 'posted')) {
      return false;
    }
    final number = nextDocNumber(
      'payrollRun',
      payrollRuns.map((r) => r.number).whereType<String>().toList(),
      settings.docSeries,
    );
    final numbered = cur.copyWith(number: number);
    final entry = buildPayrollAccrualEntry(numbered);
    if (entry == null) return false;
    final guarded = _tryGuard([entry]);
    if (guarded == null) return false;
    final posted = numbered.copyWith(status: 'posted', accrualEntryId: guarded.single.id);
    await _commitPayroll(posted, guarded);
    return true;
  }

  /// Pay one line (or the unassigned production bucket when
  /// [employeeId] is null): ONE payment entry + its diary event
  /// in the run's batch. The cap is the derived balance — the
  /// accrual less what this run already paid (§2.4).
  Future<bool> payPayrollEmployee({
    required String runId,
    required String? employeeId,
    required double amount,
    required String method,
    String? accountId,
  }) async {
    if (!can(role, 'payroll', 'write')) return false;
    if (method == 'credit') return false;
    final amt = roundPaisa(amount);
    if (!(amt > 0)) return false;
    final cur = runById(runId);
    if (cur == null || cur.status != 'posted') return false;
    final String name;
    final double cap;
    if (employeeId == null) {
      name = 'Production labour';
      cap = salaryPayableComposition(journal).unassignedAccrued;
    } else {
      PayrollRunLine? line;
      for (final l in cur.lines) {
        if (l.employeeId == employeeId) line = l;
      }
      if (line == null) return false;
      name = line.name;
      cap = line.netAccrued - paidForRun(cur, employeeId);
    }
    if (amt > cap + 0.001) return false;
    final resolved = resolveAccountId(accounts, method, accountId);
    final entry = buildPayrollPaymentEntry(
      run: cur, employeeId: employeeId, name: name,
      amount: amt, method: method, accountId: resolved,
    );
    final guarded = _tryGuard([entry]);
    if (guarded == null) return false;
    final event = PayrollPaymentEvent(
      employeeId: employeeId, name: name, amount: amt, method: method,
      accountId: resolved, entryId: guarded.single.id, dayOffset: 0, ts: _now(),
    );
    await _commitPayroll(cur.copyWith(payments: [...cur.payments, event]), guarded);
    return true;
  }

  /// Reverse one payment: a mirror entry + a negative diary
  /// event (§2.6). The position moves; the cash record stands.
  Future<bool> reversePayrollPayment(String runId, String entryId) async {
    if (!can(role, 'payroll', 'write')) return false;
    final cur = runById(runId);
    if (cur == null || cur.status != 'posted') return false;
    PayrollPaymentEvent? ev;
    for (final p in cur.payments) {
      if (p.entryId == entryId) ev = p;
    }
    if (ev == null || !(ev.amount > 0)) return false;
    if (journal.any((e) => e.reversesId == entryId)) return false;
    JournalEntry? original;
    for (final e in journal) {
      if (e.id == entryId) original = e;
    }
    if (original == null) return false;
    final mirror = buildMirrorEntry(original, 'Salary payment reversal — ${ev.name}');
    final guarded = _tryGuard([mirror]);
    if (guarded == null) return false;
    final negated = ev.copyWith(amount: -ev.amount, entryId: guarded.single.id, ts: _now());
    await _commitPayroll(cur.copyWith(payments: [...cur.payments, negated]), guarded);
    return true;
  }

  /// Reverse a whole run: its accrual is mirrored; payments
  /// already made STAND as advance positions (§2.6).
  Future<bool> reversePayrollRun(String id) async {
    if (!can(role, 'payroll', 'write')) return false;
    final cur = runById(id);
    if (cur == null || cur.status != 'posted' || cur.accrualEntryId == null) return false;
    JournalEntry? original;
    for (final e in journal) {
      if (e.id == cur.accrualEntryId) original = e;
    }
    if (original == null) return false;
    if (journal.any((e) => e.reversesId == original!.id)) return false;
    final mirror = buildMirrorEntry(
      original,
      cur.number != null ? 'Payroll reversal ${cur.number} — ${cur.month}' : 'Payroll reversal — ${cur.month}',
    );
    final guarded = _tryGuard([mirror]);
    if (guarded == null) return false;
    await _commitPayroll(cur.copyWith(status: 'reversed'), guarded);
    return true;
  }

  /// A salary advance: Dr salary_payable (ref = employee) / Cr
  /// money (§2.4). Returns the posted entry's id; recovery is
  /// derived at run time, never posted.
  Future<String?> giveSalaryAdvance({
    required String employeeId,
    required double amount,
    required String method,
    String? accountId,
  }) async {
    if (!can(role, 'payroll', 'write')) return null;
    if (method == 'credit') return null;
    final amt = roundPaisa(amount);
    if (!(amt > 0)) return null;
    final emp = employeeById(employeeId);
    if (emp == null) return null;
    final resolved = resolveAccountId(accounts, method, accountId);
    final entry = buildSalaryAdvanceEntry(
      employeeId: emp.id, name: emp.name, amount: amt, method: method, accountId: resolved,
    );
    final guarded = _tryGuard([entry]);
    if (guarded == null) return null;
    final batch = db.batch();
    _postEntry(batch, guarded.single);
    await _commit(batch, () => [guarded.single.toMap()]);
    return guarded.single.id;
  }

  /* ---------------- loans (D3, design §3) ---------------- */

  Future<void> _commitLoan(Loan loan, List<JournalEntry> entries) async {
    final batch = db.batch();
    batch.set(_col('loans').doc(loan.id), loan.toMap());
    for (final e in entries) {
      _postEntry(batch, e);
    }
    await _commit(batch, () => [loan.toMap(), for (final e in entries) e.toMap()]);
  }

  /// Create a loan AND post its drawdown in one batch — a cloud
  /// loan is born drawn (§3.4). Terms refusals (charged
  /// receivable lending included) return null.
  Future<String?> createLoan({
    required String direction,
    required String partyName,
    String? partyId,
    required double principal,
    required String chargeType,
    required double chargeRate,
    required double feeAmount,
    required String startDateISO,
    required int instalmentCount,
    required String instalmentEvery,
    required String firstDueISO,
    required String method,
    String? accountId,
    String note = '',
  }) async {
    if (!can(role, 'loans', 'write')) return null;
    if (method == 'credit') return null;
    final p = roundPaisa(principal);
    final fee = roundPaisa(feeAmount);
    final terms = LoanTerms(
      direction: direction, partyName: partyName, principal: p,
      chargeType: chargeType, chargeRate: chargeRate, feeAmount: fee,
      instalmentCount: instalmentCount,
    );
    if (loanTermsError(terms) != null) return null;
    if (!isValidDateISO(startDateISO) || !isValidDateISO(firstDueISO)) return null;
    final resolved = resolveAccountId(accounts, method, accountId);
    final loan = Loan(
      id: newId('loan'),
      number: nextDocNumber('loan', loans.map((l) => l.number).toList(), settings.docSeries),
      direction: direction,
      partyName: partyName.trim(),
      partyId: partyId,
      principal: p,
      chargeType: chargeType,
      chargeRate: (chargeType == 'flat' || chargeType == 'reducing') ? chargeRate : 0,
      chargeAmount: loanChargeAmount(chargeType: chargeType, principal: p, chargeRate: chargeRate, feeAmount: fee),
      startDateISO: startDateISO,
      instalmentCount: instalmentCount,
      instalmentEvery: instalmentEvery,
      firstDueISO: firstDueISO,
      events: const [],
      status: 'active',
      note: note.trim(),
      dayOffset: 0,
      ts: _now(),
    );
    final entry = buildLoanDrawdownEntry(loan, method: method, accountId: resolved, feeAmount: fee);
    final guarded = _tryGuard([entry]);
    if (guarded == null) return null;
    final now = _now();
    final events = <LoanEvent>[
      LoanEvent(kind: 'drawdown', amount: p, principalPart: p, chargePart: 0,
          accountId: resolved, entryId: guarded.single.id, dayOffset: 0, ts: now),
      if (fee > 0)
        LoanEvent(kind: 'fee', amount: fee, principalPart: 0, chargePart: fee,
            accountId: resolved, entryId: guarded.single.id, dayOffset: 0, ts: now),
    ];
    await _commitLoan(loan.copyWith(events: events), guarded);
    return loan.id;
  }

  /// Accrue the NEXT instalment's charge — a discrete,
  /// desk-confirmed event only (§3.4); ordinal by construction.
  Future<bool> accrueLoanCharge(String loanId) async {
    if (!can(role, 'loans', 'write')) return false;
    final cur = loanById(loanId);
    if (cur == null || cur.status != 'active') return false;
    final next = nextChargeAccrual(cur);
    if (next == null) return false;
    final entry = buildLoanChargeEntry(cur, instalment: next);
    final guarded = _tryGuard([entry]);
    if (guarded == null) return false;
    final event = LoanEvent(
      kind: 'charge', amount: next.chargePart, principalPart: 0,
      chargePart: next.chargePart, accountId: null,
      entryId: guarded.single.id, dayOffset: 0, ts: _now(),
    );
    final nextLoan = cur.copyWith(events: [...cur.events, event]);
    await _commitLoan(nextLoan.copyWith(status: loanStatusFor(nextLoan)), guarded);
    return true;
  }

  /// Repay: the journal line is the whole amount; the split is
  /// diary attribution (default charges-first, desk-editable).
  Future<bool> repayLoan({
    required String loanId,
    required double amount,
    required String method,
    String? accountId,
    double? splitPrincipalPart,
    double? splitChargePart,
  }) async {
    if (!can(role, 'loans', 'write')) return false;
    if (method == 'credit') return false;
    final cur = loanById(loanId);
    if (cur == null || cur.status != 'active') return false;
    final amt = roundPaisa(amount);
    final split = (splitPrincipalPart != null && splitChargePart != null)
        ? (principalPart: roundPaisa(splitPrincipalPart), chargePart: roundPaisa(splitChargePart))
        : defaultRepaymentSplit(cur, amt);
    if (repaymentSplitError(cur, amt, split) != null) return false;
    final resolved = resolveAccountId(accounts, method, accountId);
    final entry = buildLoanRepaymentEntry(cur, amount: amt, method: method, accountId: resolved);
    final guarded = _tryGuard([entry]);
    if (guarded == null) return false;
    final event = LoanEvent(
      kind: 'repayment', amount: amt, principalPart: split.principalPart,
      chargePart: split.chargePart, accountId: resolved,
      entryId: guarded.single.id, dayOffset: 0, ts: _now(),
    );
    final nextLoan = cur.copyWith(events: [...cur.events, event]);
    await _commitLoan(nextLoan.copyWith(status: loanStatusFor(nextLoan)), guarded);
    return true;
  }

  /// Reverse one loan event by mirror; its diary events negate
  /// in the same batch. A drawdown reverses only when no
  /// repayment or charge stands against it (§3.4) — the loan
  /// then reads cancelled.
  Future<bool> reverseLoanEvent(String loanId, String entryId) async {
    if (!can(role, 'loans', 'write')) return false;
    final cur = loanById(loanId);
    if (cur == null) return false;
    final standing = cur.events.where((e) => e.entryId == entryId && e.amount > 0).toList();
    if (standing.isEmpty) return false;
    if (journal.any((e) => e.reversesId == entryId)) return false;
    JournalEntry? original;
    for (final e in journal) {
      if (e.id == entryId) original = e;
    }
    if (original == null) return false;
    final kinds = standing.map((e) => e.kind).toSet();
    if (kinds.contains('drawdown')) {
      final othersStanding = cur.events.any((e) =>
          e.entryId != entryId && e.amount > 0 && (e.kind == 'repayment' || e.kind == 'charge'));
      if (othersStanding) return false;
    }
    final mirror = buildMirrorEntry(original, 'Loan reversal ${cur.number} — ${cur.partyName}');
    final guarded = _tryGuard([mirror]);
    if (guarded == null) return false;
    final now = _now();
    final negated = [
      for (final ev in standing)
        LoanEvent(
          kind: ev.kind, amount: -ev.amount, principalPart: -ev.principalPart,
          chargePart: -ev.chargePart, accountId: ev.accountId,
          entryId: guarded.single.id, dayOffset: 0, ts: now,
        ),
    ];
    final next = cur.copyWith(events: [...cur.events, ...negated]);
    await _commitLoan(
      next.copyWith(status: kinds.contains('drawdown') ? 'cancelled' : loanStatusFor(next)),
      guarded,
    );
    return true;
  }

  /// Delete is owner-only and only for a loan with NO events —
  /// a loan that has posted is reversed, never deleted (§3.3).
  Future<bool> deleteLoan(String id) async {
    if (role != 'owner') return false;
    final cur = loanById(id);
    if (cur == null || cur.events.isNotEmpty) return false;
    await _col('loans').doc(id).delete();
    return true;
  }

  /* ---------------- periods + fiscal-year close (A5/D4) ---------------- */

  /// Close the books through a date (owner-only). Reasons
  /// mirror the web PeriodActionResult for dictionary mapping.
  Future<({bool ok, String? reason})> closePeriod(String throughDate, {String note = ''}) async {
    if (!can(role, 'periods', 'write')) return (ok: false, reason: 'permission');
    if (!isValidDateISO(throughDate)) return (ok: false, reason: 'invalid');
    if (!canCloseThroughDate(throughDate)) return (ok: false, reason: 'rail');
    final to = endOfDayPktInstant(throughDate);
    final cur = lockedThrough;
    if (cur.isNotEmpty && to.compareTo(cur) <= 0) return (ok: false, reason: 'backwards');
    final doc = PeriodDoc(
      id: newId('per'), kind: 'period', from: cur, to: to, action: 'close',
      byUid: user?.uid ?? '', byEmail: user?.email ?? '', ts: _now(), note: note.trim(),
    );
    final batch = db.batch();
    batch.set(_col('periods').doc(doc.id), doc.toMap());
    batch.update(_ownerRef, {'lockedThrough': to});
    await _commit(batch, () => [doc.toMap()]);
    return (ok: true, reason: null);
  }

  /// Reopen to an earlier through-date (or fully, when null).
  /// A reason is mandatory — the trail records real movements.
  Future<({bool ok, String? reason})> reopenPeriod(String? throughDate, String reason) async {
    if (!can(role, 'periods', 'write')) return (ok: false, reason: 'permission');
    if (reason.trim().isEmpty) return (ok: false, reason: 'reason');
    final cur = lockedThrough;
    if (cur.isEmpty) return (ok: false, reason: 'nothing');
    var to = '';
    if (throughDate != null) {
      if (!isValidDateISO(throughDate)) return (ok: false, reason: 'invalid');
      to = endOfDayPktInstant(throughDate);
      if (to.compareTo(cur) >= 0) return (ok: false, reason: 'backwards');
    }
    final doc = PeriodDoc(
      id: newId('per'), kind: 'period', from: cur, to: to, action: 'reopen',
      byUid: user?.uid ?? '', byEmail: user?.email ?? '', ts: _now(), note: reason.trim(),
    );
    final batch = db.batch();
    batch.set(_col('periods').doc(doc.id), doc.toMap());
    batch.update(_ownerRef, {'lockedThrough': to});
    await _commit(batch, () => [doc.toMap()]);
    return (ok: true, reason: null);
  }

  /// Close a fiscal year (owner-only, design §4): the derived
  /// checklist is recomputed HERE before any write; ONE
  /// fy_close entry + the audit doc + the lock advance commit
  /// in a single batch.
  Future<({bool ok, String? reason})> closeFiscalYear(
    String fyStartDate, {
    String note = '',
    bool ackWarnings = false,
  }) async {
    if (!can(role, 'fiscalClose', 'write')) return (ok: false, reason: 'permission');
    if (!isValidDateISO(fyStartDate)) return (ok: false, reason: 'invalid');
    final range = fiscalYearRange(settings, startOfDayPktInstant(fyStartDate));
    if (range.startDate != fyStartDate) return (ok: false, reason: 'invalid');
    if (range.endDate.compareTo(todayPktISO()) >= 0) return (ok: false, reason: 'notpast');
    final state = fiscalCloseState(journal, periods, range);
    if (state.closed) return (ok: false, reason: 'closed');
    final checklist = fiscalYearCloseChecklist(
      journal: journal, payrollRuns: payrollRuns,
      productionOrders: productionOrders, cheques: cheques,
      products: products, range: range, lockedThrough: lockedThrough,
    );
    if (!checklist.hardGatesPass) return (ok: false, reason: 'gate');
    if (checklist.warningIds.isNotEmpty && !ackWarnings) return (ok: false, reason: 'warnings');
    final periodId = newId('per');
    final entry = buildFiscalClosingEntry(journal, range, periodId);
    JournalEntry? guardedEntry;
    if (entry != null) {
      final g = _tryGuard([entry]);
      if (g == null) return (ok: false, reason: 'locked');
      guardedEntry = g.single;
    }
    final cur = lockedThrough;
    final lockTarget = endOfDayPktInstant(range.endDate);
    final doc = PeriodDoc(
      id: periodId, kind: 'fiscal_year', from: range.fromTs, to: lockTarget,
      action: 'close', byUid: user?.uid ?? '', byEmail: user?.email ?? '',
      ts: _now(), note: note.trim(), prevLockedThrough: cur,
      entryId: guardedEntry?.id, warningsAcked: ackWarnings,
    );
    final batch = db.batch();
    if (guardedEntry != null) _postEntry(batch, guardedEntry);
    batch.set(_col('periods').doc(doc.id), doc.toMap());
    if (lockTarget.compareTo(cur) > 0) {
      batch.update(_ownerRef, {'lockedThrough': lockTarget});
    }
    await _commit(batch, () => [doc.toMap(), if (guardedEntry != null) guardedEntry.toMap()]);
    return (ok: true, reason: null);
  }

  /// Reopen a closed fiscal year by mirror (owner-only, §4.4):
  /// stack discipline first, then the mirror + reopen doc +
  /// the restored pre-close lock in one batch.
  Future<({bool ok, String? reason})> reopenFiscalYear(String fyStartDate, String reason) async {
    if (!can(role, 'fiscalClose', 'write')) return (ok: false, reason: 'permission');
    if (reason.trim().isEmpty) return (ok: false, reason: 'reason');
    if (!isValidDateISO(fyStartDate)) return (ok: false, reason: 'invalid');
    final range = fiscalYearRange(settings, startOfDayPktInstant(fyStartDate));
    if (range.startDate != fyStartDate) return (ok: false, reason: 'invalid');
    final state = fiscalCloseState(journal, periods, range);
    if (!state.closed || state.closeDoc == null) return (ok: false, reason: 'notclosed');
    if (fiscalReopenBlocker(journal, periods, state.closeDoc!) != null) {
      return (ok: false, reason: 'stack');
    }
    JournalEntry? mirror;
    if (state.entry != null) {
      final g = _tryGuard([buildFiscalReopenEntry(state.entry!, _now())]);
      if (g == null) return (ok: false, reason: 'locked');
      mirror = g.single;
    }
    final closeDoc = state.closeDoc!;
    final doc = PeriodDoc(
      id: newId('per'), kind: 'fiscal_year', from: closeDoc.from, to: closeDoc.to,
      action: 'reopen', byUid: user?.uid ?? '', byEmail: user?.email ?? '',
      ts: _now(), note: reason.trim(), prevLockedThrough: lockedThrough,
      entryId: mirror?.id, reopensPeriodId: closeDoc.id,
    );
    final batch = db.batch();
    if (mirror != null) _postEntry(batch, mirror);
    batch.set(_col('periods').doc(doc.id), doc.toMap());
    batch.update(_ownerRef, {'lockedThrough': closeDoc.prevLockedThrough ?? ''});
    await _commit(batch, () => [doc.toMap(), if (mirror != null) mirror.toMap()]);
    return (ok: true, reason: null);
  }

  /* ---------------- settings: profile, staff, accounts, tax, branding ---------------- */

  /// Merge a settings patch onto the owner doc (owner-only).
  /// The staff fields are NEVER written through here — they
  /// move only through the staff actions below (web parity).
  Future<bool> updateSettings(Map<String, dynamic> patch) async {
    if (!can(role, 'settingsProfile', 'write')) return false;
    final clean = Map<String, dynamic>.from(patch)
      ..remove('staff')
      ..remove('staffEmails');
    if (clean.isEmpty) return false;
    await _ownerRef.set(clean, SetOptions(merge: true));
    return true;
  }

  List<Map<String, dynamic>> get staffList {
    final raw = ownerDoc['staff'];
    if (raw is List) {
      return [
        for (final s in raw)
          if (s is Map) Map<String, dynamic>.from(s),
      ];
    }
    return const [];
  }

  /// G shape (design §1.3/§4.2): inviting writes the owner-doc
  /// mirror, a PENDING INVITE (the claimable grant — no
  /// staffIndex write anymore), the member-counter ride (+1)
  /// and the audit event, in one batch. The member cap is
  /// pre-checked with the web's refusal surface.
  Future<bool> addStaff(String emailRaw, String staffRole) async {
    if (!can(role, 'staffManage', 'write')) return false;
    final email = emailRaw.trim().toLowerCase();
    if (email.isEmpty) return false;
    final emails = ((ownerDoc['staffEmails'] as List?) ?? const []).map((e) => e.toString()).toList();
    if (emails.contains(email)) return false;
    final reg = planRegistry;
    if (reg != null) {
      final refusal = planMemberRefusal(reg, planCounters);
      if (refusal != null) {
        planRefusal = refusal;
        notifyListeners();
        return false;
      }
    }
    final member = <String, dynamic>{'email': email, 'role': staffRole, 'addedAt': _now()};
    final staff = [...staffList.where((m) => m['email'] != email), member];
    final batch = db.batch();
    batch.update(_ownerRef, {
      'staffEmails': FieldValue.arrayUnion([email]),
      'staff': staff,
    });
    batch.set(db.collection('businessInvites').doc(ownerUid).collection('invites').doc(email), {
      'email': email,
      'role': staffRole,
      'status': 'pending',
      'invitedBy': user?.uid ?? ownerUid,
      'createdAt': _now(),
    });
    _rideMemberCounter(batch, 1);
    _addBusinessEvent(batch, 'invite.created', {'email': email, 'role': staffRole});
    await _commit(batch, () => [member]);
    return true;
  }

  /// The role follows the person's live grant: the invite while
  /// pending, the membership once claimed, the legacy index
  /// only when neither exists (web G4 parity).
  Future<bool> setStaffRole(String emailRaw, String staffRole) async {
    if (!can(role, 'staffManage', 'write')) return false;
    final email = emailRaw.trim().toLowerCase();
    if (!staffList.any((m) => m['email'] == email)) return false;
    final staff = [
      for (final m in staffList)
        if (m['email'] == email) {...m, 'role': staffRole} else m,
    ];
    final invite = _inviteFor(email);
    final member = _memberFor(email);
    final batch = db.batch();
    batch.update(_ownerRef, {'staff': staff});
    if (invite != null) {
      batch.set(
        db.collection('businessInvites').doc(ownerUid).collection('invites').doc(email),
        {'role': staffRole},
        SetOptions(merge: true),
      );
    }
    if (member != null) {
      batch.set(
        db.collection('businessMembers').doc(ownerUid).collection('members').doc(member.memberUid),
        {'role': staffRole},
        SetOptions(merge: true),
      );
    }
    if (invite == null && member == null) {
      batch.set(db.collection('staffIndex').doc(email), {
        'ownerUid': ownerUid, 'email': email, 'role': staffRole,
      }, SetOptions(merge: true));
    }
    _addBusinessEvent(batch, 'membership.roleChanged', {'email': email, 'role': staffRole});
    await _commit(batch, () => staff);
    return true;
  }

  /// Removal cuts every leg at once (mirror, index, invite,
  /// membership); the seat rides back (−1) only when an invite
  /// or a membership actually existed (web §4.2). The removed
  /// person's own session loses this business on re-resolution.
  Future<bool> removeStaff(String emailRaw) async {
    if (!can(role, 'staffManage', 'write')) return false;
    final email = emailRaw.trim().toLowerCase();
    if (email.isEmpty) return false;
    final staff = staffList.where((m) => m['email'] != email).toList();
    final invite = _inviteFor(email);
    final member = _memberFor(email);
    final batch = db.batch();
    batch.update(_ownerRef, {
      'staffEmails': FieldValue.arrayRemove([email]),
      'staff': staff,
    });
    batch.delete(db.collection('staffIndex').doc(email));
    if (invite != null) {
      batch.delete(db.collection('businessInvites').doc(ownerUid).collection('invites').doc(email));
    }
    if (member != null) {
      batch.delete(db.collection('businessMembers').doc(ownerUid).collection('members').doc(member.memberUid));
    }
    if (invite != null || member != null) _rideMemberCounter(batch, -1);
    _addBusinessEvent(batch, 'membership.removed', {'email': email});
    await _commit(batch, () => staff);
    return true;
  }

  /* Money accounts (A2/A3 — owner-only writes). */

  Future<bool> addMoneyAccount({required String name, required String kind, String? method}) async {
    if (!can(role, 'accountsManage', 'write')) return false;
    final trimmed = name.trim();
    if (trimmed.isEmpty) return false;
    var maxOrder = -1;
    for (final a in accounts) {
      if (a.sortOrder > maxOrder) maxOrder = a.sortOrder;
    }
    final account = MoneyAccount(
      id: newId('acc'), name: trimmed, kind: kind, method: method,
      legacyFor: null, archived: false, sortOrder: maxOrder + 1, ts: _now(),
    );
    final batch = db.batch();
    batch.set(_col('accounts').doc(account.id), account.toMap());
    // Exactly one default per method: a previous holder yields.
    if (method != null) {
      for (final prev in accounts) {
        if (!prev.archived && prev.method == method && prev.id != account.id) {
          batch.set(_col('accounts').doc(prev.id), prev.copyWith(clearMethod: true).toMap());
        }
      }
    }
    await _commit(batch, () => [account.toMap()]);
    return true;
  }

  Future<bool> renameMoneyAccount(String id, String name) async {
    if (!can(role, 'accountsManage', 'write')) return false;
    final trimmed = name.trim();
    if (trimmed.isEmpty) return false;
    MoneyAccount? cur;
    for (final a in accounts) {
      if (a.id == id) cur = a;
    }
    if (cur == null) return false;
    await _col('accounts').doc(id).set(cur.copyWith(name: trimmed).toMap());
    return true;
  }

  Future<bool> archiveMoneyAccount(String id) async {
    if (!can(role, 'accountsManage', 'write')) return false;
    MoneyAccount? cur;
    for (final a in accounts) {
      if (a.id == id) cur = a;
    }
    if (cur == null) return false;
    // Legacy accounts are rename-only, forever (web R-3).
    if (cur.legacyFor != null) return false;
    await _col('accounts').doc(id).set(cur.copyWith(archived: true, clearMethod: true).toMap());
    return true;
  }

  Future<bool> setDefaultMoneyAccount(String id, String method) async {
    if (!can(role, 'accountsManage', 'write')) return false;
    if (method == 'credit') return false;
    MoneyAccount? target;
    for (final a in accounts) {
      if (a.id == id && !a.archived) target = a;
    }
    if (target == null) return false;
    final compatible = method == 'cash' ? target.kind == 'cash' : target.kind != 'cash';
    if (!compatible) return false;
    final t = target;
    final batch = db.batch();
    batch.set(_col('accounts').doc(id), t.copyWith(method: method).toMap());
    for (final prev in accounts) {
      if (!prev.archived && prev.method == method && prev.id != id) {
        batch.set(_col('accounts').doc(prev.id), prev.copyWith(clearMethod: true).toMap());
      }
    }
    await _commit(batch, () => [t.toMap()]);
    return true;
  }

  /* Tax slabs (A4 — owner-only). The settings' default pointers
   * are the source of truth; every slab's isDefault flag is
   * DERIVED from them and rewritten in the same batch. */

  void _writeTaxDefaults(WriteBatch batch, String? salesId, String? purchaseId, List<TaxSlab> slabs) {
    for (final s in slabs) {
      final derived = s.id == salesId || s.id == purchaseId;
      if (s.isDefault != derived) {
        batch.set(_col('taxSlabs').doc(s.id), s.copyWith(isDefault: derived).toMap());
      }
    }
    batch.set(_ownerRef, {
      'defaultSalesTaxSlabId': salesId,
      'defaultPurchaseTaxSlabId': purchaseId,
    }, SetOptions(merge: true));
  }

  Future<bool> addTaxSlab({
    required String name,
    required String kind,
    required double rate,
    required String appliesTo,
    bool inclusive = false,
    bool isDefault = false,
  }) async {
    if (!can(role, 'taxSlabs', 'write')) return false;
    final trimmed = name.trim();
    if (trimmed.isEmpty) return false;
    final slab = TaxSlab(
      id: newId('tax'), name: trimmed, kind: kind, rate: rate,
      appliesTo: appliesTo, inclusive: inclusive, isDefault: false,
      active: true, ts: _now(),
    );
    final batch = db.batch();
    batch.set(_col('taxSlabs').doc(slab.id), slab.toMap());
    if (isDefault) {
      var sales = settings.defaultSalesTaxSlabId;
      var purchase = settings.defaultPurchaseTaxSlabId;
      if (appliesTo == 'sales' || appliesTo == 'both') sales = slab.id;
      if (appliesTo == 'purchase' || appliesTo == 'both') purchase = slab.id;
      _writeTaxDefaults(batch, sales, purchase, [...taxSlabs, slab]);
    }
    await _commit(batch, () => [slab.toMap()]);
    return true;
  }

  Future<bool> updateTaxSlab(TaxSlab slab) async {
    if (!can(role, 'taxSlabs', 'write')) return false;
    if (slab.name.trim().isEmpty) return false;
    if (!taxSlabs.any((s) => s.id == slab.id)) return false;
    final coversSales = slab.appliesTo == 'sales' || slab.appliesTo == 'both';
    final coversPurchase = slab.appliesTo == 'purchase' || slab.appliesTo == 'both';
    var sales = settings.defaultSalesTaxSlabId;
    var purchase = settings.defaultPurchaseTaxSlabId;
    if (sales == slab.id && !coversSales) sales = null;
    if (purchase == slab.id && !coversPurchase) purchase = null;
    if (slab.isDefault) {
      if (coversSales) sales = slab.id;
      if (coversPurchase) purchase = slab.id;
    }
    final batch = db.batch();
    batch.set(_col('taxSlabs').doc(slab.id), slab.toMap());
    _writeTaxDefaults(batch, sales, purchase,
        taxSlabs.map((s) => s.id == slab.id ? slab : s).toList());
    await _commit(batch, () => [slab.toMap()]);
    return true;
  }

  Future<bool> deleteTaxSlab(String id) async {
    if (!can(role, 'taxSlabs', 'write')) return false;
    if (!taxSlabs.any((s) => s.id == id)) return false;
    final batch = db.batch();
    batch.delete(_col('taxSlabs').doc(id));
    var sales = settings.defaultSalesTaxSlabId;
    var purchase = settings.defaultPurchaseTaxSlabId;
    if (sales == id) sales = null;
    if (purchase == id) purchase = null;
    _writeTaxDefaults(batch, sales, purchase, taxSlabs.where((s) => s.id != id).toList());
    await _commit(batch, () => [{'deletedTaxSlab': id}]);
    return true;
  }

  Future<bool> setTaxDefault(String direction, String? slabId) async {
    if (!can(role, 'taxSlabs', 'write')) return false;
    var sales = settings.defaultSalesTaxSlabId;
    var purchase = settings.defaultPurchaseTaxSlabId;
    if (direction == 'sales') {
      sales = slabId;
    } else if (direction == 'purchase') {
      purchase = slabId;
    } else {
      return false;
    }
    final batch = db.batch();
    _writeTaxDefaults(batch, sales, purchase, taxSlabs);
    await _commit(batch, () => [{'taxDefault$direction': slabId}]);
    return true;
  }

  /* Brand assets (E2) — owner-only writes; the asset arrives
   * fully formed from the core/branding pipeline, its cap
   * already enforced. Doc id is pinned to the slot kind. */

  Future<bool> setBrandingAsset(BrandingAsset asset) async {
    if (role != 'owner') return false;
    final pinned = BrandingAsset(
      id: asset.kind, kind: asset.kind, dataUrl: asset.dataUrl,
      mime: asset.mime, width: asset.width, height: asset.height,
      bytes: asset.bytes, updatedAt: asset.updatedAt,
    );
    await _col('branding').doc(asset.kind).set(pinned.toMap());
    return true;
  }

  Future<bool> removeBrandingAsset(String kind) async {
    if (role != 'owner') return false;
    await _col('branding').doc(kind).delete();
    return true;
  }
}

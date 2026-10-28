/// Dukaan AI — Flutter app root (Phase F · F1).
///
/// One backend, the owner's existing Firebase project; the app is a
/// second surface over the same namespace and the same journal
/// contract (design §1). Firestore persistent cache is the only
/// on-device store. The app NEVER seeds (the web seeded the shop
/// once) and never writes demo data.
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart' hide TextDirection;
import 'package:provider/provider.dart';

import 'app_state.dart';
import 'core/permissions.dart';
import 'core/plans.dart';
import 'core/renewal.dart';
import 'core/tenancy.dart';
import 'data/firebase_options.dart';
import 'data/store.dart';
import 'features/billing.dart';
import 'features/cheques.dart';
import 'features/counter.dart';
import 'features/customers.dart';
import 'features/dashboard.dart';
import 'features/day_close.dart';
import 'features/documents.dart';
import 'features/expenses.dart';
import 'features/finance.dart';
import 'features/forecast.dart';
import 'features/inventory.dart';
import 'features/jobs.dart';
import 'features/loans.dart';
import 'features/loyalty.dart';
import 'features/manufacturing.dart';
import 'features/reports.dart';
import 'features/settings.dart';
import 'features/staff.dart';
import 'features/storefront.dart';
import 'features/whatsapp.dart';
import 'features/suppliers.dart';
import 'features/sync.dart';
import 'features/transfers.dart';
import 'features/warehouses.dart';
import 'l10n/app_strings.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  // The §3.1 posture: persistent cache ON (the Flutter default —
  // stated explicitly because the whole offline contract rides on
  // it), unlimited cache size for a shop's full history.
  FirebaseFirestore.instance.settings = const Settings(
    persistenceEnabled: true,
    cacheSizeBytes: Settings.CACHE_SIZE_UNLIMITED,
  );
  final appState = AppState();
  await appState.init();
  final store = ShopStore();
  await store.init();
  runApp(MultiProvider(
    providers: [
      ChangeNotifierProvider.value(value: appState),
      ChangeNotifierProvider.value(value: store),
    ],
    child: const DukaanApp(),
  ));
}

/// Money format (web fmtRs parity): western digits, grouped,
/// no decimals for whole rupees.
String fmtRs(num v) {
  final n = NumberFormat('#,##0.##', 'en');
  return 'Rs ${n.format(v)}';
}

/// Nastaliq text theme (fix round 2026-10-25): the bundled
/// NotoNastaliqUrdu face on every style. Nastaliq glyphs are tall,
/// so body/display/title styles get the print-proven 1.9 line
/// height and compact label styles 1.6 — otherwise tall glyphs
/// clip in buttons and nav labels.
TextTheme _nastaliqTheme(TextTheme t) {
  TextStyle? body(TextStyle? s) => s?.copyWith(fontFamily: 'NotoNastaliqUrdu', height: 1.9);
  TextStyle? label(TextStyle? s) => s?.copyWith(fontFamily: 'NotoNastaliqUrdu', height: 1.6);
  return t.copyWith(
    displayLarge: body(t.displayLarge),
    displayMedium: body(t.displayMedium),
    displaySmall: body(t.displaySmall),
    headlineLarge: body(t.headlineLarge),
    headlineMedium: body(t.headlineMedium),
    headlineSmall: body(t.headlineSmall),
    titleLarge: body(t.titleLarge),
    titleMedium: body(t.titleMedium),
    titleSmall: body(t.titleSmall),
    bodyLarge: body(t.bodyLarge),
    bodyMedium: body(t.bodyMedium),
    bodySmall: body(t.bodySmall),
    labelLarge: label(t.labelLarge),
    labelMedium: label(t.labelMedium),
    labelSmall: label(t.labelSmall),
  );
}

class DukaanApp extends StatelessWidget {
  const DukaanApp({super.key});

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final baseTheme = app.tokens.toThemeData();
    return MaterialApp(
      title: 'Dukaan AI',
      debugShowCheckedModeBanner: false,
      // Script faces (§4.5): PS/FA render in the bundled Naskh face
      // (one Naskh asset so the counter renders correctly offline);
      // UR renders in the bundled Nastaliq face (fix round
      // 2026-10-25 — previously the platform default, which is why
      // Urdu never looked Nastaliq); EN the platform default.
      theme: app.isNaskh
          ? baseTheme.copyWith(
              textTheme: baseTheme.textTheme.apply(fontFamily: 'NotoNaskhArabic'),
              primaryTextTheme:
                  baseTheme.primaryTextTheme.apply(fontFamily: 'NotoNaskhArabic'),
            )
          : app.isNastaliq
              ? baseTheme.copyWith(
                  textTheme: _nastaliqTheme(baseTheme.textTheme),
                  primaryTextTheme: _nastaliqTheme(baseTheme.primaryTextTheme),
                )
              : baseTheme,
      locale: Locale(app.lang),
      builder: (context, child) => Directionality(
        textDirection: app.isRtl ? TextDirection.rtl : TextDirection.ltr,
        child: child ?? const SizedBox.shrink(),
      ),
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final store = context.watch<ShopStore>();
    final app = context.watch<AppState>();
    if (store.user == null) return const LoginScreen();
    if (app.locked) return const PinLockScreen();
    // G5: a session whose re-resolution found no business at
    // all (removed from the last one mid-session, §5.1).
    if (store.noAccess) return const NoAccessScreen();
    return const AppShell();
  }
}

/* ---------------- no-access (G5) ---------------- */

class NoAccessScreen extends StatelessWidget {
  const NoAccessScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final tokens = context.watch<AppState>().tokens;
    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Icon(Icons.block_outlined, size: 44, color: tokens.danger),
              const SizedBox(height: 12),
              Text(s.raw('biz.noAccessTitle'), textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 8),
              Text(s.raw('biz.noAccessBody'), textAlign: TextAlign.center, style: TextStyle(color: tokens.muted)),
              const SizedBox(height: 20),
              ElevatedButton(onPressed: () => store.signOut(), child: Text(s.actionLogout)),
            ]),
          ),
        ),
      ),
    );
  }
}

/* ---------------- plan-locked module door (G5) ---------------- */

/// A destination the active business's plan tier does not
/// include (§5.4): the door stays visible and explains itself
/// with the web's upgrade copy — never a dead end, never data.
class LockedModulePage extends StatelessWidget {
  final String planModule;
  final VoidCallback onOpenSettings;
  const LockedModulePage({super.key, required this.planModule, required this.onOpenSettings});

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final tokens = context.watch<AppState>().tokens;
    final view = store.planView;
    final minTier = moduleMinTier(planModule);
    String fill(String key, Map<String, String> p) {
      var out = s.raw(key);
      p.forEach((k, v) => out = out.replaceAll('{$k}', v));
      return out;
    }

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 440),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(Icons.lock_outline, size: 44, color: tokens.muted),
            const SizedBox(height: 12),
            Text(s.raw('plan.lockedTitle'), textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(
              fill('plan.lockedBody', {
                'tier': s.raw('plan.name.$minTier'),
                'plan': view == null ? '' : s.raw('plan.name.${view.snapshot.planId}'),
              }),
              textAlign: TextAlign.center,
              style: TextStyle(color: tokens.muted),
            ),
            const SizedBox(height: 6),
            Text(
              fill('plan.includedIn', {'tier': s.raw('plan.name.$minTier')}),
              style: TextStyle(color: tokens.muted, fontSize: 12),
            ),
            if (store.role == 'owner') ...[
              const SizedBox(height: 16),
              ElevatedButton(onPressed: onOpenSettings, child: Text(s.raw('renew.cta'))),
            ],
          ]),
        ),
      ),
    );
  }
}

/* ---------------- login ---------------- */

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await FirebaseAuth.instance.signInWithEmailAndPassword(
        email: _email.text.trim(),
        password: _password.text,
      );
    } on FirebaseAuthException catch (e) {
      setState(() => _error = e.message ?? e.code);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final tokens = context.watch<AppState>().tokens;
    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 400),
          child: Card(
            margin: const EdgeInsets.all(20),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Text(s.authLoginTitle, style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 4),
                Text(s.authLoginSub, style: TextStyle(color: tokens.muted)),
                const SizedBox(height: 20),
                TextField(controller: _email, keyboardType: TextInputType.emailAddress,
                    decoration: InputDecoration(labelText: s.authEmail, hintText: s.authEmailPlaceholder)),
                const SizedBox(height: 12),
                TextField(controller: _password, obscureText: true, onSubmitted: (_) => _submit(),
                    decoration: InputDecoration(labelText: s.authPassword, hintText: s.authPasswordPlaceholder)),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(_error!, style: TextStyle(color: tokens.danger)),
                ],
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: _busy ? null : _submit,
                  child: Text(_busy ? s.authWait : s.authSubmitLogin),
                ),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}

/* ---------------- PIN lock screen ---------------- */

class PinLockScreen extends StatefulWidget {
  const PinLockScreen({super.key});
  @override
  State<PinLockScreen> createState() => _PinLockScreenState();
}

class _PinLockScreenState extends State<PinLockScreen> {
  final _pin = TextEditingController();
  String? _error;

  Future<void> _submit() async {
    final app = context.read<AppState>();
    final result = await app.tryUnlock(_pin.text.trim());
    if (result == null) return; // gate rebuilds unlocked
    setState(() {
      _error = result.startsWith('wait:')
          ? S.current.raw('pin.lock.paused').replaceAll('{sec}', result.substring(5))
          : S.current.raw('pin.lock.wrong');
      _pin.clear();
    });
  }

  Future<void> _forgot() async {
    // E4 recovery: reauthenticate with Firebase, then wipe the
    // device PIN record. Password re-entry happens here; a failed
    // reauth changes nothing.
    final store = context.read<ShopStore>();
    final email = store.user?.email ?? '';
    final password = await showDialog<String>(
      context: context,
      builder: (ctx) {
        final c = TextEditingController();
        return AlertDialog(
          title: Text(S.current.raw('pin.forgot')),
          content: TextField(controller: c, obscureText: true,
              decoration: InputDecoration(labelText: S.current.authPassword, hintText: email)),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: Text(S.current.actionCancel)),
            ElevatedButton(onPressed: () => Navigator.pop(ctx, c.text), child: Text(S.current.actionConfirm)),
          ],
        );
      },
    );
    if (password == null || password.isEmpty || !mounted) return;
    try {
      final cred = EmailAuthProvider.credential(email: email, password: password);
      await store.user!.reauthenticateWithCredential(cred);
      await context.read<AppState>().wipePinAfterReauth();
    } on FirebaseAuthException catch (e) {
      setState(() => _error = e.message ?? e.code);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final tokens = context.watch<AppState>().tokens;
    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 360),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Icon(Icons.lock_outline, size: 44, color: tokens.accent),
              const SizedBox(height: 12),
              Text(s.raw('pin.title'), textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 16),
              TextField(
                controller: _pin, obscureText: true, keyboardType: TextInputType.number,
                textAlign: TextAlign.center, onSubmitted: (_) => _submit(),
                decoration: InputDecoration(labelText: s.raw('pin.lock.prompt')),
              ),
              if (_error != null) ...[
                const SizedBox(height: 10),
                Text(_error!, textAlign: TextAlign.center, style: TextStyle(color: tokens.danger)),
              ],
              const SizedBox(height: 16),
              ElevatedButton(onPressed: _submit, child: Text(s.actionConfirm)),
              TextButton(onPressed: _forgot, child: Text(s.raw('pin.forgot'))),
            ]),
          ),
        ),
      ),
    );
  }
}

/* ---------------- app shell ---------------- */

class AppShell extends StatefulWidget {
  const AppShell({super.key});
  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _index = 0;
  bool _showMore = false;

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final app = context.watch<AppState>();
    final store = context.watch<ShopStore>();
    final tokens = app.tokens;
    final wide = MediaQuery.of(context).size.width >= 900;

    // One module list drives the rail (wide) and the More grid
    // (narrow). F2 modules appear only when the role may view them
    // (the web RBAC, mirrored by core/permissions.dart).
    final role = store.role;
    bool sees(String module) => can(role, module, 'view');
    // G5: each destination also names its PLAN module (§3.3) —
    // a destination whose module sits above the snapshot's tier
    // renders the locked door instead of its page. Reports,
    // Settings and the app-only Sync Centre are never plan-locked
    // (web parity: planModuleForHref returns null for them).
    final modules = <({IconData icon, String label, Widget page, String? planModule})>[
      (icon: Icons.dashboard_outlined, label: s.navDashboard, page: const DashboardScreen(), planModule: 'dashboard'),
      (icon: Icons.receipt_long_outlined, label: s.raw('nav.billing'), page: const BillingScreen(), planModule: 'billing'),
      (icon: Icons.point_of_sale_outlined, label: s.raw('nav.sales'), page: const CounterScreen(), planModule: 'salesCounter'),
      (icon: Icons.inventory_2_outlined, label: s.raw('nav.inventory'), page: const InventoryScreen(), planModule: 'inventoryView'),
      if (sees('warehouses'))
        (icon: Icons.warehouse_outlined, label: s.raw('nav.warehouses'), page: const WarehousesScreen(), planModule: 'warehouses'),
      if (sees('warehouses'))
        (icon: Icons.swap_horiz_outlined, label: s.raw('nav.stockTransfers'), page: const TransfersScreen(), planModule: 'warehouses'),
      if (sees('manufacturing'))
        (icon: Icons.precision_manufacturing_outlined, label: s.raw('nav.manufacturing'), page: const ManufacturingScreen(), planModule: 'manufacturing'),
      if (sees('jobTracker'))
        (
          icon: Icons.work_outline,
          label: s.raw('nav.jobs'),
          page: JobsScreen(onOpenBilling: () => setState(() => _index = 1)),
          planModule: 'jobTracker',
        ),
      (icon: Icons.people_outline, label: s.raw('nav.customers'), page: const CustomersScreen(), planModule: 'customersManage'),
      if (sees('loyalty'))
        (icon: Icons.stars_outlined, label: s.raw('nav.loyalty'), page: const LoyaltyScreen(), planModule: 'loyalty'),
      if (sees('storefront'))
        (icon: Icons.storefront_outlined, label: s.raw('nav.storefront'), page: const StorefrontScreen(), planModule: 'storefront'),
      if (sees('whatsapp'))
        (icon: Icons.campaign_outlined, label: s.raw('nav.whatsapp'), page: const WhatsAppScreen(), planModule: 'whatsapp'),
      if (sees('suppliersManage') || sees('supplierPayments'))
        (icon: Icons.business_outlined, label: s.raw('nav.suppliers'), page: const SuppliersScreen(), planModule: 'suppliersManage'),
      if (sees('quotations') || sees('saleOrders') || sees('purchaseOrders') || sees('creditDebitNotes'))
        (
          icon: Icons.description_outlined,
          label: s.raw('nav.quotations'),
          page: DocumentsScreen(onOpenBilling: () => setState(() => _index = 1)),
          planModule: 'quotations',
        ),
      if (sees('cheques'))
        (icon: Icons.account_balance_outlined, label: s.raw('nav.cheques'), page: const ChequesScreen(), planModule: 'cheques'),
      if (sees('expenses'))
        (icon: Icons.payments_outlined, label: s.raw('nav.expenses'), page: const ExpensesScreen(), planModule: 'expenses'),
      if (sees('staffDirectory'))
        (icon: Icons.badge_outlined, label: s.navStaff, page: const StaffScreen(), planModule: 'staffDirectory'),
      if (sees('loans'))
        (icon: Icons.handshake_outlined, label: s.navLoans, page: const LoansScreen(), planModule: 'loans'),
      if (sees('finance'))
        (icon: Icons.account_balance_wallet_outlined, label: s.raw('nav.finance'), page: const FinanceScreen(), planModule: 'finance'),
      (icon: Icons.assessment_outlined, label: s.raw('nav.reports'), page: const ReportsScreen(), planModule: null),
      if (sees('forecast'))
        (icon: Icons.trending_up_outlined, label: s.raw('nav.forecast'), page: const ForecastScreen(), planModule: 'forecast'),
      (icon: Icons.lock_clock_outlined, label: s.raw('nav.dayclose'), page: const DayCloseScreen(), planModule: 'dayCloseHistory'),
      (icon: Icons.sync_outlined, label: app.isUrdu ? 'ہم وقتی مرکز' : 'Sync Centre', page: const SyncScreen(), planModule: null), // app-only surface (§3.5): no web dictionary key yet
      (icon: Icons.settings_outlined, label: s.navSettings, page: const SettingsScreen(), planModule: null),
    ];
    // Dashboard quick actions need the finished list to resolve a
    // plan-module id to its tab index (gated modules shift indices
    // by role, so never hard-code). Wired here — a closure inside
    // the literal above cannot reference the list being declared.
    modules[0] = (
      icon: modules[0].icon,
      label: modules[0].label,
      page: DashboardScreen(onOpenModule: (m) {
        final i = modules.indexWhere((x) => x.planModule == m);
        if (i >= 0) setState(() { _index = i; _showMore = false; });
      }),
      planModule: modules[0].planModule,
    );
    final sel = _index < modules.length ? _index : 0;
    final planView = store.planView;
    bool locked(String? planModule) =>
        planView != null && planModule != null && !tierIncludesModule(planView.snapshot.modulesTier, planModule);
    void goSettings() => setState(() {
          _index = modules.length - 1; // Settings is always last
          _showMore = false;
        });
    final pages = [
      for (final m in modules)
        locked(m.planModule)
            ? LockedModulePage(planModule: m.planModule!, onOpenSettings: goSettings)
            : m.page,
    ];
    final dests = [
      for (final m in modules) (icon: m.icon, label: m.label, locked: locked(m.planModule)),
    ];

    // G5 shell banners (§5.4): the lifecycle banner (trial /
    // grace / read-only / suspended) and the dismissible posting
    // refusal — the web AppShell's copy, assembled identically.
    String fill(String key, [Map<String, String> p = const {}]) {
      var out = s.raw(key);
      p.forEach((k, v) => out = out.replaceAll('{$k}', v));
      return out;
    }

    Widget bannerShell(IconData icon, List<String> lines, {bool alert = false, VoidCallback? cta, VoidCallback? onClose}) {
      return Container(
        width: double.infinity,
        color: alert ? tokens.danger.withValues(alpha: 0.08) : tokens.accent.withValues(alpha: 0.08),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(children: [
          Icon(icon, size: 18, color: alert ? tokens.danger : tokens.accentText),
          const SizedBox(width: 10),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              for (final line in lines) Text(line, style: const TextStyle(fontSize: 13)),
            ]),
          ),
          if (cta != null) TextButton(onPressed: cta, child: Text(s.raw('renew.cta'))),
          if (onClose != null)
            IconButton(
              icon: const Icon(Icons.close, size: 16),
              tooltip: s.raw('action.close'),
              onPressed: onClose,
            ),
        ]),
      );
    }

    Widget? planBanner;
    final lifecycle = planView == null ? null : lifecycleBanner(planView, isoUtc(DateTime.now()));
    if (planView != null && lifecycle != null) {
      switch (lifecycle.kind) {
        case 'suspended':
          final reason = store.suspensionReason;
          planBanner = bannerShell(Icons.block_outlined, [
            s.raw('plan.suspendedBanner'),
            if (reason != null) fill('renew.banner.suspendedReason', {'reason': reason}),
            s.raw('renew.banner.suspendedRemedy'),
          ], alert: true, cta: goSettings);
        case 'trial':
          final limit = planView.snapshot.invoiceLimit;
          final used = planView.counters?.invoiceCount ?? 0;
          final left = limit - used < 0 ? 0 : limit - used;
          planBanner = bannerShell(Icons.hourglass_bottom_outlined, [
            fill('plan.trialBanner', {'days': '${lifecycle.daysLeft ?? 0}', 'left': '$left', 'limit': '$limit'}),
          ]);
        case 'trial-approaching':
          planBanner = bannerShell(Icons.hourglass_top_outlined, [
            fill('renew.banner.trialApproaching', {'days': '${lifecycle.daysLeft ?? 0}'}),
          ], cta: goSettings);
        case 'trial-urgent':
          planBanner = bannerShell(Icons.hourglass_top_outlined, [
            fill('renew.banner.trialUrgent', {'days': '${lifecycle.daysLeft ?? 0}'}),
          ], alert: true, cta: goSettings);
        case 'grace':
          planBanner = bannerShell(Icons.schedule_outlined, [
            fill('plan.graceBanner', {'days': '${lifecycle.daysElapsed ?? 0}'}),
            fill('renew.banner.graceLeft', {'days': '${lifecycle.graceLeft ?? 0}'}),
          ], alert: true, cta: goSettings);
        case 'readonly':
          planBanner = bannerShell(Icons.lock_outline, [
            s.raw('plan.readonlyBanner'),
          ], alert: true, cta: goSettings);
      }
    }

    Widget? refusalBanner;
    final refusal = store.planRefusal;
    if (refusal != null) {
      final String text;
      if (refusal == 'invoice-cap') {
        text = fill('plan.limitInvoices', {'limit': '${planView?.snapshot.invoiceLimit ?? 0}'});
      } else if (refusal == 'member-cap') {
        text = fill('plan.limitMembers', {'limit': '${planView?.snapshot.usersLimit ?? 0}'});
      } else {
        final state = refusal.startsWith('state:') ? refusal.substring(6) : refusal;
        text = fill('plan.postingPaused', {'state': s.raw('plan.state.$state')});
      }
      refusalBanner = bannerShell(Icons.error_outline, [text], alert: true, onClose: store.clearPlanRefusal);
    }

    // G5 header business switcher (§5.2): chrome only when the
    // session spans more than one business — a single-business
    // user sees the plain shop name, exactly as before.
    BusinessSummary? activeBiz;
    for (final b in store.businesses) {
      if (b.businessId == store.activeBusinessId) activeBiz = b;
    }
    final shopTitle = store.ownerDoc['shopName']?.toString() ?? 'Dukaan AI';
    final header = Container(
      color: tokens.card,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(children: [
        if (store.businesses.length <= 1)
          Text(shopTitle, style: Theme.of(context).textTheme.titleMedium)
        else
          PopupMenuButton<String>(
            tooltip: s.raw('biz.switchBusiness'),
            onSelected: (bid) => store.switchBusiness(bid),
            itemBuilder: (_) => [
              for (final b in store.businesses)
                PopupMenuItem(
                  value: b.businessId,
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Icon(
                      b.businessId == store.activeBusinessId ? Icons.check : Icons.storefront_outlined,
                      size: 16,
                    ),
                    const SizedBox(width: 8),
                    Text(b.name.isNotEmpty ? b.name : s.raw('shell.brandFallback')),
                    const SizedBox(width: 8),
                    Text(
                      b.own ? s.raw('biz.yourBusiness') : b.role,
                      style: TextStyle(color: tokens.muted, fontSize: 12),
                    ),
                  ]),
                ),
            ],
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Text(
                activeBiz != null && activeBiz.name.isNotEmpty ? activeBiz.name : shopTitle,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const Icon(Icons.arrow_drop_down),
            ]),
          ),
        const SizedBox(width: 12),
        // Sync status chip (§3.5 visibility): cache/pending/rejected.
        Chip(
          avatar: Icon(
            store.rejectedTray.isNotEmpty
                ? Icons.error_outline
                : store.pendingWrites > 0
                    ? Icons.cloud_upload_outlined
                    : Icons.cloud_done_outlined,
            size: 16,
            color: store.rejectedTray.isNotEmpty ? tokens.danger : tokens.accentText,
          ),
          label: Text(store.rejectedTray.isNotEmpty
              ? '${store.rejectedTray.length}'
              : store.pendingWrites > 0
                  ? '${store.pendingWrites}'
                  : s.syncOnline),
          visualDensity: VisualDensity.compact,
        ),
        const Spacer(),
        // The owner's shell directive: account cluster in the header.
        PopupMenuButton<String>(
          icon: const Icon(Icons.palette_outlined),
          tooltip: s.raw('shell.chooseTheme'),
          onSelected: (v) => app.setTheme(v),
          itemBuilder: (_) => [
            for (final id in ['emerald', 'sand', 'ocean', 'midnight', 'dusk'])
              PopupMenuItem(
                value: id,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (app.themeId == id) ...[
                      const Icon(Icons.check, size: 16),
                      const SizedBox(width: 8),
                    ],
                    Text(s.raw('shell.theme.$id')),
                  ],
                ),
              ),
          ],
        ),
        // Language picker (Phase H §4.2): four locales, each option
        // in its own name; a PS/FA locale not yet 100% human-reviewed
        // carries the "Draft preview" badge (from the generated
        // review-state table) — on its menu row and, when active, on
        // the button itself.
        PopupMenuButton<String>(
          tooltip: s.settingsLanguageTitle,
          onSelected: (v) => app.setLang(v),
          itemBuilder: (_) => [
            for (final l in kLangs)
              PopupMenuItem(
                value: l,
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Text(switch (l) {
                    'ur' => s.settingsLangUrdu,
                    'ps' => s.settingsLangPashto,
                    'fa' => s.settingsLangFarsi,
                    _ => s.settingsLangEnglish,
                  }),
                  if (S.localeIsDraft(l)) ...[
                    const SizedBox(width: 8),
                    _DraftBadge(label: s.settingsLangDraftPreview),
                  ],
                  if (app.lang == l) ...[
                    const SizedBox(width: 8),
                    const Icon(Icons.check, size: 16),
                  ],
                ]),
              ),
          ],
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.language, size: 18),
              const SizedBox(width: 6),
              Text(s.shellLangName),
              if (S.localeIsDraft(app.lang)) ...[
                const SizedBox(width: 8),
                _DraftBadge(label: s.settingsLangDraftPreview),
              ],
            ]),
          ),
        ),
        if (app.hasPin)
          IconButton(icon: const Icon(Icons.lock_outline), tooltip: s.raw('pin.lockNow'), onPressed: () => app.lockNow()),
        PopupMenuButton<String>(
          icon: const Icon(Icons.account_circle_outlined),
          onSelected: (v) async {
            if (v == 'out') await store.signOut();
          },
          itemBuilder: (_) => [
            PopupMenuItem(enabled: false, child: Text('${store.user?.email ?? ''} · ${store.role}')),
            PopupMenuItem(value: 'out', child: Text(s.actionLogout)),
          ],
        ),
      ]),
    );

    // Narrow: the bottom bar carries the three counter-critical
    // destinations + a More grid with every module (14 destinations
    // do not fit a phone's bottom bar).
    final moreGrid = GridView.count(
      crossAxisCount: 3,
      padding: const EdgeInsets.all(16),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      children: [
        for (var i = 0; i < modules.length; i++)
          Card(
            child: InkWell(
              onTap: () => setState(() {
                _index = i;
                _showMore = false;
              }),
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Icon(modules[i].icon, size: 28),
                const SizedBox(height: 8),
                Text(modules[i].label, textAlign: TextAlign.center, style: const TextStyle(fontSize: 12)),
                if (dests[i].locked) ...[
                  const SizedBox(height: 4),
                  Icon(Icons.lock, size: 12, color: tokens.muted),
                ],
              ]),
            ),
          ),
      ],
    );

    final body = Column(children: [
      header,
      const Divider(height: 1),
      if (planBanner != null) planBanner,
      if (refusalBanner != null) refusalBanner,
      Expanded(child: !wide && _showMore ? moreGrid : pages[sel]),
    ]);

    if (wide) {
      return Scaffold(
        body: Row(children: [
          SingleChildScrollView(
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: MediaQuery.of(context).size.height),
              child: IntrinsicHeight(
                child: NavigationRail(
                  backgroundColor: tokens.sbBg,
                  selectedIndex: sel,
                  onDestinationSelected: (i) => setState(() => _index = i),
                  labelType: NavigationRailLabelType.all,
                  destinations: [
                    for (final d in dests)
                      NavigationRailDestination(
                        icon: d.locked
                            ? Stack(children: [
                                Icon(d.icon),
                                PositionedDirectional(
                                  top: 0,
                                  end: 0,
                                  child: Icon(Icons.lock, size: 10, color: tokens.muted),
                                ),
                              ])
                            : Icon(d.icon),
                        label: Text(d.label, style: const TextStyle(fontSize: 11)),
                      ),
                  ],
                ),
              ),
            ),
          ),
          Expanded(child: body),
        ]),
      );
    }
    return Scaffold(
      body: body,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _showMore ? 3 : (sel <= 2 ? sel : 3),
        onDestinationSelected: (i) => setState(() {
          if (i == 3) {
            _showMore = true;
          } else {
            _showMore = false;
            _index = i;
          }
        }),
        destinations: [
          for (var i = 0; i < 3 && i < dests.length; i++)
            NavigationDestination(icon: Icon(dests[i].icon), label: dests[i].label),
          NavigationDestination(icon: const Icon(Icons.grid_view_outlined), label: app.isUrdu ? 'مزید' : 'More'),
        ],
      ),
    );
  }
}

/// The §4.2 "Draft preview" chip (amber, small) — shown beside a PS/FA
/// locale whose review manifest is not yet at 100% reviewed.
class _DraftBadge extends StatelessWidget {
  final String label;
  const _DraftBadge({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 1),
      decoration: BoxDecoration(
        color: Colors.amber.withValues(alpha: 0.16),
        border: Border.all(color: Colors.amber.withValues(alpha: 0.55)),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 10.5,
          fontWeight: FontWeight.w700,
          color: Color(0xFF8A5A00),
        ),
      ),
    );
  }
}

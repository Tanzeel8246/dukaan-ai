import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'providers/store_provider.dart';
import 'screens/alerts_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/inventory_screen.dart';
import 'screens/login_screen.dart';
import 'screens/sales_screen.dart';
import 'services/auth_service.dart';

/// Dukaan AI — offline-first Flutter companion app.
///
/// Boots into the local sqflite database. Firebase is optional: without
/// google-services.json / GoogleService-Info.plist the app runs fully
/// offline and SyncService stays dormant. When Firebase IS configured,
/// the auth gate requires email/password sign-in (same accounts as the
/// web app) and cloud sync is scoped to the user's own namespace.
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AuthService.init();
  runApp(const DukaanAiApp());
}

class DukaanAiApp extends StatelessWidget {
  const DukaanAiApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Warm shopkeeper palette, mirroring the web app:
    // light = warm paper, dark = deep espresso. Accent = profit green.
    const seed = Color(0xFF15803D);
    return ChangeNotifierProvider(
      create: (_) => StoreProvider()..init(),
      child: MaterialApp(
        title: 'Dukaan AI',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(
            seedColor: seed,
            brightness: Brightness.light,
          ).copyWith(surface: const Color(0xFFFAF7F0)),
          fontFamily: 'Roboto',
        ),
        darkTheme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(
            seedColor: seed,
            brightness: Brightness.dark,
          ).copyWith(surface: const Color(0xFF171009)),
        ),
        home: const AuthGate(),
      ),
    );
  }
}

/// Decides between the login wall and the app:
///  - Firebase not configured → straight into the app (offline demo mode).
///  - Configured + signed out → [LoginScreen].
///  - Configured + signed in → the app, after a one-time sync kick.
class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    if (!AuthService.firebaseReady) return const HomeShell();
    return StreamBuilder<User?>(
      stream: AuthService.authChanges(),
      builder: (context, snap) {
        if (snap.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        if (snap.data == null) return const LoginScreen();
        return const SignedInShell();
      },
    );
  }
}

/// One-time sync kick after sign-in, then the regular shell.
class SignedInShell extends StatefulWidget {
  const SignedInShell({super.key});

  @override
  State<SignedInShell> createState() => _SignedInShellState();
}

class _SignedInShellState extends State<SignedInShell> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<StoreProvider>().onAuthReady();
    });
  }

  @override
  Widget build(BuildContext context) => const HomeShell();
}

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  static const _screens = [
    DashboardScreen(),
    InventoryScreen(),
    SalesScreen(),
    AlertsScreen(),
  ];

  static const _titles = ['Dashboard', 'Inventory', 'Sales', 'Alerts'];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.shopping_basket_outlined,
                  color: Colors.white, size: 20),
            ),
            const SizedBox(width: 10),
            Text('Dukaan AI · ${_titles[_index]}'),
          ],
        ),
        actions: [
          Consumer<StoreProvider>(
            builder: (context, store, _) => IconButton(
              icon: Icon(
                store.sync.available ? Icons.cloud_done_outlined : Icons.cloud_off_outlined,
              ),
              tooltip: store.sync.available
                  ? 'Cloud sync on — tap to sync now'
                  : 'Offline demo mode',
              onPressed: () async {
                await store.sync.syncNow();
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(store.sync.available
                          ? 'Sync complete.'
                          : 'Offline mode — enable Firebase to sync.'),
                    ),
                  );
                }
              },
            ),
          ),
        ],
      ),
      body: IndexedStack(index: _index, children: _screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          NavigationDestination(
            icon: Icon(Icons.inventory_2_outlined),
            selectedIcon: Icon(Icons.inventory_2),
            label: 'Inventory',
          ),
          NavigationDestination(
            icon: Icon(Icons.point_of_sale_outlined),
            selectedIcon: Icon(Icons.point_of_sale),
            label: 'Sales',
          ),
          NavigationDestination(
            icon: Icon(Icons.notifications_outlined),
            selectedIcon: Icon(Icons.notifications),
            label: 'Alerts',
          ),
        ],
      ),
    );
  }
}

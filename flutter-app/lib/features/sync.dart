/// Sync centre (design §3.5) + device settings. The offline truth,
/// visible: connection/cache state, how many writes are still
/// queued in the Firestore cache, and the REJECTED-WRITE TRAY —
/// batches the server refused at flush (period lock, permissions)
/// stay here, with their documents, until the owner or a manager
/// dismisses them. Nothing is ever silently dropped. Below it, the
/// device-local controls: this device's label (stamped as
/// originDevice on composed documents) and the PIN lock (E4/E5).
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../app_state.dart';
import '../core/permissions.dart';
import '../core/pinlock.dart';
import '../data/store.dart';
import '../l10n/app_strings.dart';

class SyncScreen extends StatefulWidget {
  const SyncScreen({super.key});
  @override
  State<SyncScreen> createState() => _SyncScreenState();
}

class _SyncScreenState extends State<SyncScreen> {
  final _deviceLabel = TextEditingController();

  @override
  void initState() {
    super.initState();
    SharedPreferences.getInstance().then((p) {
      if (mounted) _deviceLabel.text = p.getString('dukaan-ai-device-label') ?? '';
    });
  }

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final app = context.watch<AppState>();
    final tokens = app.tokens;
    final canDismiss = store.role == 'owner' || store.role == 'manager';

    return ListView(padding: const EdgeInsets.all(16), children: [
      Text(app.isUrdu ? 'ہم وقتی مرکز' : 'Sync Centre', style: Theme.of(context).textTheme.headlineSmall),
      const SizedBox(height: 12),
      Card(child: Column(children: [
        ListTile(
          leading: Icon(store.fromCache ? Icons.cloud_off_outlined : Icons.cloud_done_outlined,
              color: store.fromCache ? tokens.amberText : tokens.accentText),
          title: Text(store.fromCache ? (app.isUrdu ? 'آف لائن — مقامی کیش سے' : 'Offline — reading local cache') : (app.isUrdu ? 'آن لائن' : 'Online')),
          subtitle: Text('Pending writes: ${store.pendingWrites}'),
        ),
      ])),
      const SizedBox(height: 16),
      Text(app.isUrdu ? 'مسترد شدہ تحریریں' : 'Rejected writes', style: Theme.of(context).textTheme.titleMedium),
      // G5 (design §1): the tray is device-global, but entries are
      // labelled per business and this view shows the ACTIVE
      // business's entries — a switch never mixes two shops'
      // refusals. Entries persisted before G5 carry no business
      // id; they belong to the account's own shop.
      Builder(builder: (context) {
        final activeBid = store.ownerUid ?? '';
        final activeIsOwn = activeBid == store.user?.uid;
        bool visible(RejectedWrite w) =>
            w.businessId.isEmpty ? activeIsOwn : w.businessId == activeBid;
        final shown = <int>[
          for (var i = 0; i < store.rejectedTray.length; i++)
            if (visible(store.rejectedTray[i])) i,
        ];
        final hiddenCount = store.rejectedTray.length - shown.length;
        String labelFor(RejectedWrite w) {
          final name = store.businessNameFor(w.businessId.isEmpty ? activeBid : w.businessId);
          return name.isNotEmpty ? name : (app.isUrdu ? 'کاروبار' : 'Business');
        }

        return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (shown.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Text(s.raw('common.none'), style: TextStyle(color: tokens.muted)),
            ),
          for (final i in shown)
            Card(
              color: tokens.dangerSoft,
              child: ListTile(
                leading: Icon(Icons.error_outline, color: tokens.danger),
                title: Text('${labelFor(store.rejectedTray[i])} · ${store.rejectedTray[i].reasonClass} · ${store.rejectedTray[i].at}'),
                subtitle: Text(store.rejectedTray[i].detail, maxLines: 3, overflow: TextOverflow.ellipsis),
                trailing: canDismiss
                    ? IconButton(icon: const Icon(Icons.delete_outline), onPressed: () => store.dismissRejected(i))
                    : null,
              ),
            ),
          if (hiddenCount > 0)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Text(
                app.isUrdu
                    ? '$hiddenCount مسترد شدہ تحریریں آپ کے دوسرے کاروبار کی ہیں — دیکھنے کے لیے کاروبار بدلیں۔'
                    : '$hiddenCount rejected write(s) belong to your other business — switch business to review them.',
                style: TextStyle(color: tokens.muted),
              ),
            ),
        ]);
      }),
      const Divider(height: 32),
      Text(app.isUrdu ? 'یہ آلہ' : 'This device', style: Theme.of(context).textTheme.titleMedium),
      const SizedBox(height: 8),
      TextField(
        controller: _deviceLabel,
        decoration: InputDecoration(labelText: app.isUrdu ? 'آلے کا نام (originDevice)' : 'Device label (originDevice)'),
        onSubmitted: (v) async {
          final p = await SharedPreferences.getInstance();
          await p.setString('dukaan-ai-device-label', v.trim());
          store.originDevice = v.trim().isEmpty ? 'App device' : v.trim();
        },
      ),
      const SizedBox(height: 16),
      Text(s.raw('pin.title'), style: Theme.of(context).textTheme.titleMedium),
      Text(app.hasPin ? s.raw('pin.statusSet') : s.raw('pin.statusNone'), style: TextStyle(color: tokens.muted)),
      const SizedBox(height: 8),
      Wrap(spacing: 8, children: [
        ElevatedButton(onPressed: () => _pinDialog(context), child: Text(app.hasPin ? s.raw('pin.change') : s.raw('pin.set'))),
        if (app.hasPin) OutlinedButton(onPressed: () => app.lockNow(), child: Text(s.raw('pin.lockNow'))),
      ]),
      if (app.hasPin) ...[
        SwitchListTile(
          title: Text(s.raw('pin.gate')),
          subtitle: Text(s.raw('pin.gateSub')),
          value: app.pinPrefs.gateSensitive,
          onChanged: (v) => app.setPinPrefs(PinLockPrefs(idleMinutes: app.pinPrefs.idleMinutes, gateSensitive: v)),
        ),
        ListTile(
          title: Text(s.raw('pin.idle')),
          trailing: DropdownButton<int>(
            value: app.pinPrefs.idleMinutes,
            items: const [
              DropdownMenuItem(value: 0, child: Text('0')),
              DropdownMenuItem(value: 5, child: Text('5')),
              DropdownMenuItem(value: 15, child: Text('15')),
              DropdownMenuItem(value: 30, child: Text('30')),
            ],
            onChanged: (v) {
              if (v != null) app.setPinPrefs(PinLockPrefs(idleMinutes: v, gateSensitive: app.pinPrefs.gateSensitive));
            },
          ),
        ),
      ],
      if (store.role == 'owner' || can(store.role, 'settings', 'view'))
        Padding(padding: const EdgeInsets.only(top: 8), child: Text('${store.user?.email ?? ''} · ${store.role}', style: TextStyle(color: tokens.muted))),
    ]);
  }

  Future<void> _pinDialog(BuildContext context) async {
    final app = context.read<AppState>();
    final s = S.current;
    final pin = await showDialog<String>(
      context: context,
      builder: (ctx) {
        final c = TextEditingController();
        final c2 = TextEditingController();
        return AlertDialog(
          title: Text(app.hasPin ? s.raw('pin.change') : s.raw('pin.set')),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(controller: c, obscureText: true, keyboardType: TextInputType.number,
                decoration: InputDecoration(labelText: s.raw('pin.newPin'))),
            TextField(controller: c2, obscureText: true, keyboardType: TextInputType.number,
                decoration: InputDecoration(labelText: s.raw('pin.confirmPin'))),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: Text(s.actionCancel)),
            ElevatedButton(
              onPressed: () {
                if (c.text != c2.text || !isValidPinFormat(c.text)) {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(s.raw('pin.errMismatch'))));
                  return;
                }
                Navigator.pop(ctx, c.text);
              },
              child: Text(s.actionSave),
            ),
          ],
        );
      },
    );
    if (pin != null) await app.setPin(pin);
  }
}

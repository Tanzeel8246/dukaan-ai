/// The E5 sensitive-action gate as a UI helper (design §4.6): when
/// this device has a PIN AND the owner enabled gating, a sensitive
/// action asks for the PIN first. Fail or cancel composes NOTHING —
/// callers must check the returned bool before composing any write.
/// The store knows nothing of the gate.
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../app_state.dart';
import '../core/pinlock.dart';
import '../l10n/app_strings.dart';

Future<bool> runSensitiveGate(BuildContext context, String action) async {
  final app = context.read<AppState>();
  if (!sensitiveActions.contains(action) || !app.gateRequired) return true;
  final pin = await showDialog<String>(
    context: context,
    builder: (ctx) {
      final c = TextEditingController();
      return AlertDialog(
        title: Text(S.current.raw('pin.gate.title')),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          Text(S.current.raw('pin.gate.body')),
          const SizedBox(height: 12),
          TextField(
            controller: c, obscureText: true, keyboardType: TextInputType.number,
            decoration: InputDecoration(labelText: S.current.raw('pin.lock.prompt')),
          ),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(S.current.actionCancel)),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, c.text), child: Text(S.current.actionConfirm)),
        ],
      );
    },
  );
  if (pin == null || pin.isEmpty) return gateAllows(true, 'cancel');
  final ok = await app.challengePin(pin);
  return gateAllows(true, ok ? 'pass' : 'fail');
}

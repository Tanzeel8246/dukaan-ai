/// Cheque registry (F2): IN cheques in the drawer / at the bank
/// and OUT cheques issued, with the web's lifecycle actions —
/// deposit (registry only), clear, bounce (with bank charges and
/// the compensating ledger row), return — each action gated by
/// canChequeTransition, the composer's own truth table.
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../app_state.dart';
import '../core/cheques.dart';
import '../core/permissions.dart';
import '../core/periods.dart';
import '../core/types.dart';
import '../data/store.dart';
import '../l10n/app_strings.dart';
import '../main.dart' show fmtRs;
import 'f2_common.dart';

class ChequesScreen extends StatefulWidget {
  const ChequesScreen({super.key});
  @override
  State<ChequesScreen> createState() => _ChequesScreenState();
}

class _ChequesScreenState extends State<ChequesScreen> {
  String _view = 'all';
  final _query = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final tokens = context.watch<AppState>().tokens;
    final canWrite = can(store.role, 'cheques', 'write');

    var rows = [...store.cheques]..sort((a, b) => a.dueDateISO.compareTo(b.dueDateISO));
    rows = switch (_view) {
      'drawer' => chequesInDrawer(rows),
      'atBank' => chequesAtBank(rows),
      'issued' => rows.where((c) => c.direction == 'out' && c.status == 'issued').toList(),
      'due' => chequesDue(rows, todayPktISO()),
      'cleared' => rows.where((c) => c.status == 'cleared').toList(),
      'bounced' => rows.where((c) => c.status == 'bounced').toList(),
      'returned' => rows.where((c) => c.status == 'returned').toList(),
      _ => rows,
    };
    final q = _query.text.trim().toLowerCase();
    if (q.isNotEmpty) {
      rows = rows.where((c) => c.chequeNo.toLowerCase().contains(q) || c.partyName.toLowerCase().contains(q)).toList();
    }

    return Column(children: [
      Padding(
        padding: const EdgeInsets.all(12),
        child: Wrap(spacing: 12, runSpacing: 8, children: [
          StatCard(label: s.raw('chq.sum.drawer'), value: fmtRs(unclearedInTotal(store.cheques))),
          StatCard(label: s.raw('chq.sum.atBank'), value: fmtRs(chequesAtBank(store.cheques).fold<double>(0, (a, c) => a + c.amount))),
          StatCard(label: s.raw('chq.sum.pendingOut'), value: fmtRs(pendingOutTotal(store.cheques))),
        ]),
      ),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: Row(children: [
          Expanded(
            child: TextField(
              controller: _query,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(prefixIcon: const Icon(Icons.search), hintText: s.raw('chq.searchPh'), isDense: true),
            ),
          ),
          const SizedBox(width: 8),
          DropdownButton<String>(
            value: _view,
            items: [
              for (final v in ['all', 'drawer', 'atBank', 'issued', 'due', 'cleared', 'bounced', 'returned'])
                DropdownMenuItem(value: v, child: Text(s.raw('chq.view.$v'))),
            ],
            onChanged: (v) => setState(() => _view = v ?? 'all'),
          ),
        ]),
      ),
      Expanded(
        child: rows.isEmpty
            ? Center(child: Text(s.raw('chq.empty')))
            : ListView.separated(
                itemCount: rows.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (ctx, i) {
                  final c = rows[i];
                  final overdue = chequeIsOverdue(c, todayPktISO());
                  return ListTile(
                    title: Text('${c.chequeNo} · ${c.bankName} · ${fmtRs(c.amount)}'),
                    subtitle: Text(
                      '${c.direction == 'in' ? s.raw('chq.dir.in') : s.raw('chq.dir.out')} · ${c.partyName} · ${s.raw('chq.status.${c.status}')} · ${s.raw('chq.dueOn')} ${c.dueDateISO}${overdue ? ' · ${s.raw('chq.overdue')}' : ''}',
                      style: overdue ? TextStyle(color: tokens.danger) : null,
                    ),
                    trailing: canWrite ? _actions(context, store, c) : null,
                  );
                },
              ),
      ),
    ]);
  }

  Widget? _actions(BuildContext context, ShopStore store, Cheque c) {
    final s = S.current;
    final buttons = <Widget>[];
    if (canChequeTransition(c, 'deposit')) {
      buttons.add(IconButton(icon: const Icon(Icons.account_balance_outlined, size: 19), tooltip: s.raw('chq.action.deposit'), onPressed: () => _deposit(context, c)));
    }
    if (canChequeTransition(c, 'clear')) {
      buttons.add(IconButton(icon: const Icon(Icons.check_circle_outline, size: 19), tooltip: s.raw('chq.action.clear'), onPressed: () => _confirm(context, s.raw('chq.action.clear'), () => store.clearCheque(c))));
    }
    if (canChequeTransition(c, 'bounce')) {
      buttons.add(IconButton(icon: const Icon(Icons.error_outline, size: 19), tooltip: s.raw('chq.action.bounce'), onPressed: () => _bounce(context, c)));
    }
    if (canChequeTransition(c, 'return')) {
      buttons.add(IconButton(icon: const Icon(Icons.undo_outlined, size: 19), tooltip: s.raw('chq.action.return'), onPressed: () => _confirm(context, s.raw('chq.action.return'), () => store.returnCheque(c))));
    }
    return buttons.isEmpty ? null : Wrap(children: buttons);
  }

  Future<void> _confirm(BuildContext context, String title, Future<bool> Function() run) async {
    final s = S.current;
    final go = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(s.actionConfirm)),
        ],
      ),
    );
    if (go == true) await run();
  }

  Future<void> _deposit(BuildContext context, Cheque c) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    final banks = store.accounts.where((a) => !a.archived && a.kind == 'bank').toList();
    String? accountId = banks.firstOrNull?.id;
    final go = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setLocal) => AlertDialog(
        title: Text(s.raw('chq.deposit.title')),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          Text(s.raw('chq.deposit.hint')),
          AccountDropdown(accounts: banks, value: accountId, label: s.raw('chq.deposit.account'), onChanged: (v) => setLocal(() => accountId = v)),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(s.raw('chq.action.deposit'))),
        ],
      )),
    );
    if (go == true && accountId != null) await store.depositCheque(c, accountId: accountId);
  }

  Future<void> _bounce(BuildContext context, Cheque c) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    final charges = TextEditingController(text: '0');
    final go = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(s.raw('chq.bounce.title')),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          Text(c.direction == 'in' ? s.raw('chq.bounce.hintIn') : s.raw('chq.bounce.hintOut')),
          if (c.direction == 'in')
            TextField(controller: charges, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: s.raw('chq.field.charges'))),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(s.raw('chq.action.bounce'))),
        ],
      ),
    );
    if (go == true) {
      await store.bounceCheque(c, charges: double.tryParse(charges.text.trim()) ?? 0);
    }
  }
}

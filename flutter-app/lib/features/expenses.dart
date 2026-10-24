/// Expenses (F2): the register with add / edit / delete. Edits
/// and deletes ride the web's F-5 mirror semantics through the
/// store (the original entry is reversed, never mutated); a
/// cheque expense captures its draft here and its registry amount
/// follows corrections while the cheque is still 'issued'.
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/permissions.dart';
import '../core/types.dart';
import '../data/store.dart';
import '../l10n/app_strings.dart';
import '../main.dart' show fmtRs;
import 'f2_common.dart';

const expenseCategories = ['rent', 'electricity', 'salary', 'transport', 'other'];

class ExpensesScreen extends StatelessWidget {
  const ExpensesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final canWrite = can(store.role, 'expenses', 'write');
    final rows = [...store.expenses]..sort((a, b) => b.ts.compareTo(a.ts));
    final monthTotal = rows
        .where((e) => e.ts.substring(0, 7) == DateTime.now().toIso8601String().substring(0, 7))
        .fold<double>(0, (a, e) => a + e.amount);
    return Column(children: [
      Padding(
        padding: const EdgeInsets.all(12),
        child: Row(children: [
          Expanded(child: Text('${s.raw('exp.sum.monthExpenses')}: ${fmtRs(monthTotal)}')),
          if (canWrite)
            ElevatedButton.icon(
              onPressed: () => _expenseForm(context, null),
              icon: const Icon(Icons.add, size: 18),
              label: Text(s.raw('exp.add')),
            ),
        ]),
      ),
      Expanded(
        child: rows.isEmpty
            ? Center(child: Text(s.raw('exp.empty')))
            : ListView.separated(
                itemCount: rows.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (ctx, i) {
                  final e = rows[i];
                  final cheque = e.chequeId == null ? null : store.cheques.where((c) => c.id == e.chequeId).firstOrNull;
                  return ListTile(
                    title: Text('${e.category} · ${fmtRs(e.amount)}'),
                    subtitle: Text('${fmtDate(e.ts)} · ${e.method}${cheque != null ? ' · ${s.raw('chq.title')} ${cheque.chequeNo} (${cheque.status})' : ''}${e.note.isNotEmpty ? ' · ${e.note}' : ''}'),
                    trailing: canWrite
                        ? Wrap(children: [
                            IconButton(icon: const Icon(Icons.edit_outlined, size: 19), onPressed: () => _expenseForm(context, e)),
                            IconButton(icon: const Icon(Icons.delete_outline, size: 19), onPressed: () => _delete(context, e)),
                          ])
                        : null,
                  );
                },
              ),
      ),
    ]);
  }

  Future<void> _delete(BuildContext context, Expense e) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    final go = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(s.raw('exp.delete.title')),
        content: Text(s.raw('exp.delete.body')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.raw('exp.delete.keep'))),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(s.raw('exp.delete.confirm'))),
        ],
      ),
    );
    if (go == true) await store.deleteExpense(e.id);
  }

  Future<void> _expenseForm(BuildContext context, Expense? existing) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    final amount = TextEditingController(text: existing?.amount.toString() ?? '');
    final note = TextEditingController(text: existing?.note ?? '');
    final dayOffset = TextEditingController(text: '${existing?.dayOffset ?? 0}');
    var category = existing?.category ?? 'other';
    var method = existing?.method ?? 'cash';
    String? accountId = existing?.accountId;
    var isCheque = existing?.instrument == 'cheque';
    final chqNo = TextEditingController();
    final chqBank = TextEditingController();
    final chqIssue = TextEditingController();
    final chqDue = TextEditingController();
    // Editing a cheque expense re-reads its draft from the registry.
    if (existing?.chequeId != null) {
      final doc = store.cheques.where((c) => c.id == existing!.chequeId).firstOrNull;
      if (doc != null) {
        chqNo.text = doc.chequeNo;
        chqBank.text = doc.bankName;
        chqIssue.text = doc.issueDateISO;
        chqDue.text = doc.dueDateISO;
      }
    }
    final go = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setLocal) => AlertDialog(
        title: Text(existing == null ? s.raw('exp.add') : s.raw('exp.edit')),
        content: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
          DropdownButtonFormField<String>(
            initialValue: category,
            decoration: InputDecoration(labelText: s.raw('exp.field.category'), isDense: true),
            items: [
              for (final c in expenseCategories)
                DropdownMenuItem(value: c, child: Text(s.raw('common.expenseCat.$c'))),
            ],
            onChanged: (v) => setLocal(() => category = v ?? 'other'),
          ),
          TextField(controller: amount, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: s.raw('exp.field.amount'))),
          MethodDropdown(value: method, onChanged: (v) => setLocal(() => method = v)),
          AccountDropdown(accounts: store.accounts, value: accountId, onChanged: (v) => setLocal(() => accountId = v)),
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(s.raw('chq.payOption')),
            value: isCheque,
            onChanged: existing == null ? (v) => setLocal(() => isCheque = v ?? false) : null,
          ),
          if (isCheque) ChequeDraftFields(chequeNo: chqNo, bankName: chqBank, issueDate: chqIssue, dueDate: chqDue),
          TextField(controller: note, decoration: InputDecoration(labelText: s.raw('exp.field.note'))),
          TextField(controller: dayOffset, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: s.raw('exp.field.date'))),
        ])),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(s.actionSave)),
        ],
      )),
    );
    if (go != true) return;
    final v = double.tryParse(amount.text.trim()) ?? 0;
    if (v <= 0) return;
    // The draft rides only the CREATE (it is input-only, never
    // stored); an edit mirror-corrects the money fields and the
    // registry amount follows — the draft itself is immutable.
    final draft = existing == null && isCheque ? ChequeDraftFields.draftOf(chqNo, chqBank, chqIssue, chqDue) : null;
    if (existing == null) {
      await store.addExpense(
        category: category,
        amount: v,
        method: method,
        accountId: accountId,
        note: note.text.trim(),
        dayOffset: int.tryParse(dayOffset.text.trim()) ?? 0,
        chequeDraft: draft,
      );
    } else {
      final updated = existing.copyWith(
        category: category,
        amount: v,
        method: method,
        accountId: accountId,
        note: note.text.trim(),
        dayOffset: int.tryParse(dayOffset.text.trim()) ?? existing.dayOffset,
      );
      final ok = await store.updateExpense(updated);
      if (!ok && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(store.lastError ?? s.raw('exp.err.amount'))));
      }
    }
  }
}

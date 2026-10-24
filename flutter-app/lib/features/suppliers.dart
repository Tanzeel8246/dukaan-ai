/// Suppliers + purchases (F2): the directory with live payable
/// positions, the per-supplier statement (purchases / payments /
/// returns, running balance), purchase entry (goods/raw lines with
/// tax slabs — the F1 composer), supplier payments (PV-, cheque
/// aware) and purchase returns (DN-, offset or cash refund).
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';

import '../app_state.dart';
import '../core/ledger.dart';
import '../core/permissions.dart';
import '../core/reports.dart';
import '../core/search.dart';
import '../core/types.dart';
import '../data/store.dart';
import '../l10n/app_strings.dart';
import '../main.dart' show fmtRs;
import 'f2_common.dart';

class SuppliersScreen extends StatefulWidget {
  const SuppliersScreen({super.key});
  @override
  State<SuppliersScreen> createState() => _SuppliersScreenState();
}

class _SuppliersScreenState extends State<SuppliersScreen> {
  final _query = TextEditingController();
  Supplier? _selected;

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final wide = MediaQuery.of(context).size.width >= 900;
    final canManage = can(store.role, 'suppliersManage', 'write');

    final list = store.suppliers.where((x) => matchesAny(_query.text, [x.name, x.phone])).toList();
    final directory = Column(children: [
      Padding(
        padding: const EdgeInsets.all(12),
        child: Row(children: [
          Expanded(
            child: TextField(
              controller: _query,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(prefixIcon: const Icon(Icons.search), hintText: s.raw('sup.searchPlaceholder')),
            ),
          ),
          if (canManage) ...[
            const SizedBox(width: 8),
            ElevatedButton.icon(onPressed: () => _editSupplier(context, null), icon: const Icon(Icons.add, size: 18), label: Text(s.actionAdd)),
          ],
        ]),
      ),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: Align(
          alignment: AlignmentDirectional.centerStart,
          child: Text('${s.raw('sup.kpi.payableLabel')}: ${fmtRs(payablesTotal(store.journal))}'),
        ),
      ),
      Expanded(
        child: ListView.separated(
          itemCount: list.length,
          separatorBuilder: (_, __) => const Divider(height: 1),
          itemBuilder: (ctx, i) {
            final sup = list[i];
            final bal = supplierBalance(store.purchases, store.supplierPayments, sup.id, store.purchaseReturns);
            return ListTile(
              title: Text(sup.name),
              subtitle: Text(sup.phone),
              trailing: Text(fmtRs(bal), style: TextStyle(fontWeight: FontWeight.w600, color: bal > 0 ? null : Colors.grey)),
              selected: _selected?.id == sup.id,
              onTap: () => setState(() => _selected = sup),
            );
          },
        ),
      ),
    ]);

    final detail = _selected == null
        ? Center(child: Text(s.raw('common.none')))
        : _SupplierDetail(supplier: _selected!);

    if (wide) {
      return Row(children: [
        SizedBox(width: 380, child: directory),
        const VerticalDivider(width: 1),
        Expanded(child: detail),
      ]);
    }
    return _selected == null
        ? directory
        : Column(children: [
            ListTile(leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => setState(() => _selected = null)), title: Text(_selected!.name)),
            Expanded(child: detail),
          ]);
  }

  Future<void> _editSupplier(BuildContext context, Supplier? existing) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    final name = TextEditingController(text: existing?.name ?? '');
    final phone = TextEditingController(text: existing?.phone ?? '');
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(existing == null ? s.raw('sup.form.addTitle') : s.raw('sup.form.editTitle')),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: name, decoration: InputDecoration(labelText: s.raw('sup.form.name'))),
          TextField(controller: phone, decoration: InputDecoration(labelText: s.raw('sup.form.phone'))),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(s.actionSave)),
        ],
      ),
    );
    if (saved != true || name.text.trim().isEmpty) return;
    await store.saveSupplier(
      Supplier(id: existing?.id ?? newId('sup'), name: name.text.trim(), phone: phone.text.trim()),
      isNew: existing == null,
    );
  }
}

class _SupplierDetail extends StatelessWidget {
  final Supplier supplier;
  const _SupplierDetail({required this.supplier});

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final tokens = context.watch<AppState>().tokens;
    final bal = supplierBalance(store.purchases, store.supplierPayments, supplier.id, store.purchaseReturns);
    final range = resolveReportRange('fiscal', settings: store.settings);
    final stmt = supplierStatement(store.purchases, store.supplierPayments, store.purchaseReturns, supplier.id, range);
    final purchases = store.purchases.where((p) => p.supplierId == supplier.id).toList()
      ..sort((a, b) => b.ts.compareTo(a.ts));
    final canPay = can(store.role, 'supplierPayments', 'write');
    final canBuy = can(store.role, 'suppliersManage', 'write');
    return ListView(padding: const EdgeInsets.all(16), children: [
      Row(children: [
        Expanded(child: Text(supplier.name, style: Theme.of(context).textTheme.titleLarge)),
        Text(fmtRs(bal), style: Theme.of(context).textTheme.titleLarge?.copyWith(color: bal > 0 ? tokens.amberText : null)),
      ]),
      Text(supplier.phone, style: TextStyle(color: tokens.muted)),
      const SizedBox(height: 12),
      Wrap(spacing: 8, children: [
        if (canBuy)
          ElevatedButton.icon(onPressed: () => showPurchaseEntry(context, supplier), icon: const Icon(Icons.add_shopping_cart_outlined, size: 16), label: Text(s.raw('sup.purchase.title'))),
        if (canPay)
          ElevatedButton.icon(onPressed: () => showSupplierPayment(context, supplier), icon: const Icon(Icons.payments_outlined, size: 16), label: Text(s.raw('sup.payment.title'))),
        OutlinedButton.icon(
          onPressed: () {
            final body = StringBuffer('${supplier.name}\n');
            for (final e in stmt.events) {
              body.writeln('${fmtDate(e.ts)} · ${e.kind} · ${fmtRs(e.amount)} → ${fmtRs(e.balance)}');
            }
            body.writeln('${s.raw('sup.detail.balanceLabel')}: ${fmtRs(bal)}');
            Share.share(body.toString());
          },
          icon: const Icon(Icons.share_outlined, size: 16),
          label: Text(s.raw('credit.statement')),
        ),
      ]),
      const SizedBox(height: 16),
      Text(s.raw('sup.detail.purchasesTitle'), style: Theme.of(context).textTheme.titleMedium),
      if (purchases.isEmpty) Text(s.raw('sup.detail.noPurchases')),
      for (final p in purchases)
        ListTile(
          dense: true,
          title: Text('${fmtRs(p.total)} · ${p.items.map((i) => '${i.name} ×${i.qty}').join(', ')}', style: const TextStyle(fontSize: 13)),
          subtitle: Text('${fmtDate(p.ts)}${p.sourcePoId != null ? ' · PO' : ''}${p.note.isNotEmpty ? ' · ${p.note}' : ''}'),
          trailing: can(store.role, 'creditDebitNotes', 'write')
              ? IconButton(
                  icon: const Icon(Icons.assignment_return_outlined, size: 19),
                  tooltip: s.raw('sup.preturn.button'),
                  onPressed: () => showPurchaseReturn(context, p),
                )
              : null,
        ),
      const SizedBox(height: 12),
      Text(s.raw('credit.statement'), style: Theme.of(context).textTheme.titleMedium),
      for (final e in stmt.events.reversed)
        ListTile(
          dense: true,
          title: Text('${e.kind} · ${fmtRs(e.amount)}', style: const TextStyle(fontSize: 13)),
          subtitle: Text(fmtDate(e.ts)),
          trailing: Text(fmtRs(e.balance), style: const TextStyle(fontSize: 13)),
        ),
    ]);
  }
}

/// Purchase entry: POS-style line builder over the product list
/// (tap to add, qty + cost editable per line).
Future<void> showPurchaseEntry(BuildContext context, Supplier supplier, {String? sourcePoId, List<({Product product, double qty, double unitCost})>? seedLines}) async {
  final store = context.read<ShopStore>();
  final s = S.current;
  final lines = <_PurLine>[
    for (final seed in seedLines ?? <({Product product, double qty, double unitCost})>[])
      _PurLine(seed.product, seed.qty, seed.unitCost),
  ];
  final note = TextEditingController();
  final saved = await showDialog<bool>(
    context: context,
    builder: (ctx) => StatefulBuilder(builder: (ctx, setLocal) {
      final total = lines.fold<double>(0, (a, l) => a + l.qty * l.unitCost);
      return AlertDialog(
        title: Text('${s.raw('sup.purchase.title')} · ${supplier.name}'),
        content: SizedBox(
          width: 560,
          child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
            DropdownButtonFormField<String>(
              initialValue: null,
              decoration: InputDecoration(labelText: s.raw('sup.purchase.product'), isDense: true),
              items: [
                for (final p in store.products)
                  DropdownMenuItem(value: p.id, child: Text('${p.name} · ${p.sku}')),
              ],
              onChanged: (id) {
                if (id == null) return;
                final p = store.productsById[id];
                if (p == null) return;
                setLocal(() {
                  final existing = lines.where((l) => l.product.id == id).firstOrNull;
                  if (existing != null) {
                    existing.qty += 1;
                  } else {
                    lines.add(_PurLine(p, 1, p.costPrice));
                  }
                });
              },
            ),
            for (final l in lines)
              Row(children: [
                Expanded(child: Text(l.product.name, style: const TextStyle(fontSize: 13))),
                SizedBox(
                  width: 64,
                  child: TextFormField(
                    initialValue: l.qty.toString(),
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(labelText: s.raw('sup.purchase.qty'), isDense: true),
                    onChanged: (v) => setLocal(() => l.qty = double.tryParse(v) ?? 0),
                  ),
                ),
                const SizedBox(width: 6),
                SizedBox(
                  width: 84,
                  child: TextFormField(
                    initialValue: l.unitCost.toString(),
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(labelText: s.raw('sup.purchase.unitCost'), isDense: true),
                    onChanged: (v) => setLocal(() => l.unitCost = double.tryParse(v) ?? 0),
                  ),
                ),
                SizedBox(width: 84, child: Text(fmtRs(l.qty * l.unitCost), textAlign: TextAlign.end, style: const TextStyle(fontSize: 13))),
                IconButton(icon: const Icon(Icons.close, size: 17), onPressed: () => setLocal(() => lines.remove(l))),
              ]),
            TextField(controller: note, decoration: InputDecoration(labelText: s.raw('sup.purchase.note'), isDense: true)),
            const SizedBox(height: 8),
            Align(alignment: AlignmentDirectional.centerEnd, child: Text('${s.raw('sup.purchase.grossTotal')}: ${fmtRs(total)}', style: const TextStyle(fontWeight: FontWeight.w600))),
          ])),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
          ElevatedButton(onPressed: lines.isEmpty ? null : () => Navigator.pop(ctx, true), child: Text(s.actionSave)),
        ],
      );
    }),
  );
  if (saved != true || lines.isEmpty) return;
  final ok = await store.recordPurchase(
    supplierId: supplier.id,
    lines: [for (final l in lines) (productId: l.product.id, qty: l.qty, unitCost: l.unitCost)],
    note: note.text.trim(),
    sourcePoId: sourcePoId,
  );
  if (!ok && context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(store.lastError ?? s.raw('sup.purchase.errFailed'))));
  }
}

class _PurLine {
  final Product product;
  double qty;
  double unitCost;
  _PurLine(this.product, this.qty, this.unitCost);
}

/// Supplier payment (PV-): cash/bank/wallet, or a cheque drawn on a
/// bank account (instrument 'cheque' — value moves on clearance).
Future<void> showSupplierPayment(BuildContext context, Supplier supplier) async {
  final store = context.read<ShopStore>();
  final s = S.current;
  final amount = TextEditingController();
  final note = TextEditingController();
  var method = 'cash';
  String? accountId;
  var isCheque = false;
  final chqNo = TextEditingController();
  final chqBank = TextEditingController();
  final chqIssue = TextEditingController();
  final chqDue = TextEditingController();
  final go = await showDialog<bool>(
    context: context,
    builder: (ctx) => StatefulBuilder(builder: (ctx, setLocal) => AlertDialog(
      title: Text('${s.raw('sup.payment.title')} · ${supplier.name}'),
      content: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: amount, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: s.raw('common.amount'))),
        MethodDropdown(value: method, onChanged: (v) => setLocal(() => method = v)),
        AccountDropdown(accounts: store.accounts, value: accountId, onChanged: (v) => setLocal(() => accountId = v)),
        CheckboxListTile(
          contentPadding: EdgeInsets.zero,
          title: Text(s.raw('chq.payOption')),
          value: isCheque,
          onChanged: (v) => setLocal(() => isCheque = v ?? false),
        ),
        if (isCheque) ChequeDraftFields(chequeNo: chqNo, bankName: chqBank, issueDate: chqIssue, dueDate: chqDue),
        TextField(controller: note, decoration: InputDecoration(labelText: s.raw('sup.payment.note'))),
      ])),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
        ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(s.actionConfirm)),
      ],
    )),
  );
  if (go != true) return;
  final v = double.tryParse(amount.text.trim()) ?? 0;
  if (v <= 0) return;
  final ok = await store.recordSupplierPayment(
    supplier: supplier,
    amount: v,
    method: method,
    accountId: accountId,
    note: note.text.trim(),
    chequeDraft: isCheque ? ChequeDraftFields.draftOf(chqNo, chqBank, chqIssue, chqDue) : null,
  );
  if (!ok && context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(store.lastError ?? s.raw('sup.payment.errAmount'))));
  }
}

/// Purchase return against one purchase (DN-): per-line return
/// quantities clamped by the composer's cumulative rule; settled
/// by payable offset or cash refund.
Future<void> showPurchaseReturn(BuildContext context, Purchase purchase) async {
  final store = context.read<ShopStore>();
  final s = S.current;
  final qtys = <String, TextEditingController>{
    for (final i in purchase.items) i.productId: TextEditingController(text: '0'),
  };
  final reason = TextEditingController();
  var settlement = 'payable_offset';
  String? accountId;
  final go = await showDialog<bool>(
    context: context,
    builder: (ctx) => StatefulBuilder(builder: (ctx, setLocal) => AlertDialog(
      title: Text(s.raw('sup.preturn.title')),
      content: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
        for (final i in purchase.items)
          Row(children: [
            Expanded(child: Text('${i.name} ×${i.qty}', style: const TextStyle(fontSize: 13))),
            SizedBox(
              width: 72,
              child: TextField(
                controller: qtys[i.productId],
                keyboardType: TextInputType.number,
                decoration: InputDecoration(labelText: s.raw('sup.preturn.qty'), isDense: true),
              ),
            ),
          ]),
        DropdownButtonFormField<String>(
          initialValue: settlement,
          decoration: InputDecoration(labelText: s.raw('sup.preturn.settlement'), isDense: true),
          items: [
            DropdownMenuItem(value: 'payable_offset', child: Text(s.raw('sup.preturn.offset'))),
            DropdownMenuItem(value: 'cash_refund', child: Text(s.raw('sup.preturn.refund'))),
          ],
          onChanged: (v) => setLocal(() => settlement = v ?? 'payable_offset'),
        ),
        if (settlement == 'cash_refund')
          AccountDropdown(accounts: store.accounts, value: accountId, onChanged: (v) => setLocal(() => accountId = v)),
        TextField(controller: reason, decoration: InputDecoration(labelText: s.raw('sup.preturn.reason'))),
      ])),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
        ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(s.raw('sup.preturn.submit'))),
      ],
    )),
  );
  if (go != true) return;
  final picks = <({String productId, double qty})>[
    for (final i in purchase.items)
      if ((double.tryParse(qtys[i.productId]!.text.trim()) ?? 0) > 0)
        (productId: i.productId, qty: double.tryParse(qtys[i.productId]!.text.trim()) ?? 0),
  ];
  if (picks.isEmpty) return;
  final ok = await store.recordPurchaseReturn(
    purchase: purchase,
    picks: picks,
    settlement: settlement,
    accountId: accountId,
    reason: reason.text.trim(),
  );
  if (!ok && context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(store.lastError ?? s.raw('sup.preturn.failed'))));
  }
}

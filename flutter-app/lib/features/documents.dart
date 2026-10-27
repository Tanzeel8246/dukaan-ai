/// Document chain (F2): quotations, sale orders, delivery
/// challans, purchase orders, credit/debit notes and the RV/PV
/// voucher register. Documents are non-posting (the store enforces
/// it); fulfilment shown here is always DERIVED from bills and
/// purchases via core/documents.dart, never the cached status.
/// Conversions hand a BillPrefill to the billing desk — exactly
/// once, clamped by the derived remainders.
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';

import '../core/documents.dart';
import '../core/mc_workflow.dart' show formatDdMmYyyy;
import '../core/ledger.dart' show fmtQty;
import '../core/print_docs.dart';
import '../core/permissions.dart';
import '../core/periods.dart';
import '../core/types.dart';
import '../data/store.dart';
import '../l10n/app_strings.dart';
import '../main.dart' show fmtRs;
import 'f2_common.dart';
import 'print/doc_view.dart';
import 'suppliers.dart' show showPurchaseEntry;

class DocumentsScreen extends StatefulWidget {
  /// Called after a conversion fills the billing desk's prefill.
  final VoidCallback onOpenBilling;
  const DocumentsScreen({super.key, required this.onOpenBilling});
  @override
  State<DocumentsScreen> createState() => _DocumentsScreenState();
}

class _DocumentsScreenState extends State<DocumentsScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 6, vsync: this);

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    return Column(children: [
      TabBar(
        controller: _tabs,
        isScrollable: true,
        tabs: [
          Tab(text: s.raw('nav.quotations')),
          Tab(text: s.raw('nav.saleOrders')),
          Tab(text: s.raw('nav.deliveryChallans')),
          Tab(text: s.raw('nav.purchaseOrders')),
          Tab(text: s.raw('nav.notes')),
          Tab(text: s.raw('voucher.receiptTitle')),
        ],
      ),
      Expanded(
        child: TabBarView(controller: _tabs, children: [
          _QuotationsTab(onOpenBilling: widget.onOpenBilling),
          _OrdersTab(onOpenBilling: widget.onOpenBilling),
          _ChallansTab(onOpenBilling: widget.onOpenBilling),
          const _PurchaseOrdersTab(),
          const _NotesTab(),
          const _VouchersTab(),
        ]),
      ),
    ]);
  }
}

String _status(BuildContext context, String status) => S.current.raw('doc.status.$status');

Widget _docHeader(BuildContext context, String title, VoidCallback? onAdd) {
  return Padding(
    padding: const EdgeInsets.all(12),
    child: Row(children: [
      Expanded(child: Text(title, style: Theme.of(context).textTheme.titleMedium)),
      if (onAdd != null)
        ElevatedButton.icon(onPressed: onAdd, icon: const Icon(Icons.add, size: 18), label: Text(S.current.actionAdd)),
    ]),
  );
}

/// Shared line editor for quotations / orders / challans / POs:
/// product dropdown adds a line; qty + price editable inline.
class _LineEditor extends StatefulWidget {
  final List<({Product product, double qty, double price})> initial;
  final bool costPrices;
  const _LineEditor({super.key, required this.initial, this.costPrices = false});
  @override
  State<_LineEditor> createState() => _LineEditorState();
}

class _LineEditorState extends State<_LineEditor> {
  late final List<({Product product, double qty, double price})> lines = [...widget.initial];

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    return Column(mainAxisSize: MainAxisSize.min, children: [
      DropdownButtonFormField<String>(
        initialValue: null,
        decoration: InputDecoration(labelText: s.raw('sup.purchase.product'), isDense: true),
        items: [
          for (final p in store.products) DropdownMenuItem(value: p.id, child: Text('${p.name} · ${p.sku}')),
        ],
        onChanged: (id) {
          final p = id == null ? null : store.productsById[id];
          if (p == null) return;
          setState(() {
            final existing = lines.where((l) => l.product.id == id).firstOrNull;
            if (existing != null) {
              final i = lines.indexOf(existing);
              lines[i] = (product: p, qty: existing.qty + 1, price: existing.price);
            } else {
              lines.add((product: p, qty: 1, price: widget.costPrices ? p.costPrice : p.salePrice));
            }
          });
        },
      ),
      for (final l in lines)
        Row(children: [
          Expanded(child: Text(l.product.name, style: const TextStyle(fontSize: 13))),
          SizedBox(
            width: 60,
            child: TextFormField(
              initialValue: '${l.qty}',
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(isDense: true),
              onChanged: (v) {
                final i = lines.indexOf(l);
                lines[i] = (product: l.product, qty: double.tryParse(v) ?? 0, price: l.price);
              },
            ),
          ),
          const SizedBox(width: 6),
          SizedBox(
            width: 80,
            child: TextFormField(
              initialValue: '${l.price}',
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(isDense: true),
              onChanged: (v) {
                final i = lines.indexOf(l);
                lines[i] = (product: l.product, qty: l.qty, price: double.tryParse(v) ?? 0);
              },
            ),
          ),
          IconButton(icon: const Icon(Icons.close, size: 17), onPressed: () => setState(() => lines.remove(l))),
        ]),
      Align(
        alignment: AlignmentDirectional.centerEnd,
        child: Text(fmtRs(lines.fold<double>(0, (a, l) => a + l.qty * l.price)), style: const TextStyle(fontWeight: FontWeight.w600)),
      ),
    ]);
  }
}

/// Line editor + party name. Returns (partyName, lines) or null.
Future<(String, List<({String productId, double qty, double unitPrice})>)?> _editLines(
  BuildContext context,
  List<({Product product, double qty, double price})> initial, {
  bool costPrices = false,
  String partyLabel = '',
  String partyInitial = '',
}) async {
  final key = GlobalKey<_LineEditorState>();
  final s = S.current;
  final party = TextEditingController(text: partyInitial);
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      content: SizedBox(
        width: 520,
        child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: party, decoration: InputDecoration(labelText: partyLabel, isDense: true)),
          const SizedBox(height: 8),
          _LineEditor(key: key, initial: initial, costPrices: costPrices),
        ])),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
        ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(s.actionSave)),
      ],
    ),
  );
  if (ok != true) return null;
  final lines = key.currentState?.lines ?? const [];
  return (
    party.text.trim(),
    [
      for (final l in lines)
        if (l.qty > 0) (productId: l.product.id, qty: l.qty, unitPrice: l.price),
    ],
  );
}

// ── Quotations ──────────────────────────────────────────────────

class _QuotationsTab extends StatelessWidget {
  final VoidCallback onOpenBilling;
  const _QuotationsTab({required this.onOpenBilling});

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final canWrite = can(store.role, 'quotations', 'write');
    final rows = [...store.quotations]..sort((a, b) => b.ts.compareTo(a.ts));
    return Column(children: [
      _docHeader(context, s.raw('nav.quotations'), canWrite ? () => _create(context) : null),
      Expanded(
        child: ListView.separated(
          itemCount: rows.length,
          separatorBuilder: (_, __) => const Divider(height: 1),
          itemBuilder: (ctx, i) {
            final q = rows[i];
            final status = displayQuotationStatus(q, store.saleOrders, store.bills, todayPktISO());
            return ListTile(
              title: Text('${q.number ?? s.raw('doc.status.draft')} · ${q.customerName} · ${fmtRs(q.total)}'),
              subtitle: Text('${fmtDate(q.ts)} · ${_status(context, status)} · ${q.lines.map((it) => '${it.name} ×${it.qty}').join(', ')}'),
              trailing: canWrite ? _actions(context, store, q, status) : null,
            );
          },
        ),
      ),
    ]);
  }

  Widget _actions(BuildContext context, ShopStore store, Quotation q, String status) {
    final s = S.current;
    return PopupMenuButton<String>(
      onSelected: (a) async {
        switch (a) {
          case 'issue':
            await store.issueQuotation(q.id);
          case 'accept':
            await store.decideQuotation(q.id, accept: true);
          case 'reject':
            await store.decideQuotation(q.id, accept: false);
          case 'cancel':
            await store.cancelQuotation(q.id);
          case 'delete':
            await store.deleteQuotation(q.id);
          case 'toOrder':
            final picks = await _conversionPicks(context, q.lines,
                quotationConvertedTotalQty(q, store.saleOrders, store.bills),
                title: s.raw('nav.saleOrders'));
            if (picks != null && picks.isNotEmpty) await store.convertQuotationToOrder(q.id, picks);
          case 'toBill':
            final picks = await _conversionPicks(context, q.lines,
                quotationConvertedTotalQty(q, store.saleOrders, store.bills),
                title: s.raw('nav.billing'));
            if (picks == null || picks.isEmpty) break;
            // MC workflow §2 — one-click conversion WITH a real
            // confirmation: the invoice date is the CONVERSION
            // date (today), never the quotation's date, and a
            // converted quotation is locked against re-conversion.
            final confirmed = await showDialog<bool>(
              context: context,
              builder: (ctx) => AlertDialog(
                title: Text(s.raw('mc.doc.convertConfirm')),
                content: Text(s.raw('mc.doc.convertConfirmBody').replaceAll(
                    '{date}', formatDdMmYyyy(DateTime.now().toUtc().toIso8601String()))),
                actions: [
                  TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
                  ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(s.actionConfirm)),
                ],
              ),
            );
            if (confirmed != true) break;
            final prefill = await store.convertQuotationToBill(q.id, picks);
            if (prefill != null) onOpenBilling();
          case 'share':
            Share.share(_docShareText(q.number ?? '', q.customerName, [for (final it in q.lines) (name: it.name, qty: it.qty, price: it.unitPrice)], q.total));
        }
        if (store.lastError != null && context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(store.lastError!)));
        }
      },
      itemBuilder: (ctx) => [
        if (q.status == 'draft') PopupMenuItem(value: 'issue', child: Text(s.raw('doc.status.issued'))),
        if (q.status == 'issued') PopupMenuItem(value: 'accept', child: Text(s.raw('doc.status.accepted'))),
        if (q.status == 'issued') PopupMenuItem(value: 'reject', child: Text(s.raw('doc.status.rejected'))),
        if (q.status == 'issued' || q.status == 'accepted') PopupMenuItem(value: 'toOrder', child: Text(s.raw('nav.saleOrders'))),
        if (q.status == 'issued' || q.status == 'accepted') PopupMenuItem(value: 'toBill', child: Text(s.raw('nav.billing'))),
        if (status != 'converted' && q.status != 'cancelled') PopupMenuItem(value: 'cancel', child: Text(s.raw('doc.status.cancelled'))),
        if (q.status == 'draft') PopupMenuItem(value: 'delete', child: Text(s.actionDelete)),
        PopupMenuItem(value: 'share', child: Text(s.raw('credit.statement'))),
      ],
    );
  }

  Future<void> _create(BuildContext context) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    final result = await _editLines(context, const [], partyLabel: s.raw('credit.give.namePlaceholder'));
    if (result == null || result.$2.isEmpty) return;
    await store.saveQuotation(customerName: result.$1, picks: result.$2);
  }
}

/// F5 — per-line pick quantities for conversions (closes the
/// F2-declared partial "conversion picks default to full
/// remaining"). Each line defaults to its REMAINING quantity
/// (derived, never the cached status); the desk may take less,
/// and 0 skips the line. The store's convert* functions clamp to
/// the same remainders again, so an over-type can never
/// over-convert.
Future<List<({String productId, double qty})>?> _pickConversionLines(
  BuildContext context, {
  required String title,
  required List<({String productId, String name, double maxQty})> lines,
}) async {
  final s = S.current;
  final controllers = [
    for (final l in lines) TextEditingController(text: fmtQty(l.maxQty)),
  ];
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title),
      content: SizedBox(
        width: 360,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              for (var i = 0; i < lines.length; i++)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(children: [
                    Expanded(child: Text('${lines[i].name} · ×${fmtQty(lines[i].maxQty)}')),
                    SizedBox(
                      width: 84,
                      child: TextField(
                        controller: controllers[i],
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: InputDecoration(labelText: s.raw('doc.lines.qty'), isDense: true),
                      ),
                    ),
                  ]),
                ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
        FilledButton(onPressed: () => Navigator.pop(ctx, true), child: Text(s.actionConfirm)),
      ],
    ),
  );
  if (confirmed != true) {
    for (final c in controllers) {
      c.dispose();
    }
    return null;
  }
  final out = <({String productId, double qty})>[];
  for (var i = 0; i < lines.length; i++) {
    var qty = double.tryParse(controllers[i].text.trim()) ?? 0;
    if (qty > lines[i].maxQty) qty = lines[i].maxQty;
    if (qty > 0) out.add((productId: lines[i].productId, qty: qty));
    controllers[i].dispose();
  }
  return out;
}

/// The remaining-quantity view of a document's lines + the pick
/// editor on top. Returns null on cancel, [] when nothing remains.
Future<List<({String productId, double qty})>?> _conversionPicks(
  BuildContext context,
  List<DocLine> lines,
  Map<String, double> doneByProduct, {
  required String title,
}) {
  final remaining = [
    for (final l in lines)
      if (l.qty - (doneByProduct[l.productId] ?? 0) > 0)
        (productId: l.productId, name: l.name, maxQty: l.qty - (doneByProduct[l.productId] ?? 0)),
  ];
  if (remaining.isEmpty) return Future.value(const []);
  return _pickConversionLines(context, title: title, lines: remaining);
}

String _docShareText(String docNo, String party, List<({String name, double qty, double price})> lines, double total) {
  final b = StringBuffer('$docNo · $party\n');
  for (final l in lines) {
    b.writeln('${l.name} ×${l.qty} — ${fmtRs(l.qty * l.price)}');
  }
  b.writeln(fmtRs(total));
  return b.toString();
}

// ── Sale orders ─────────────────────────────────────────────────

class _OrdersTab extends StatelessWidget {
  final VoidCallback onOpenBilling;
  const _OrdersTab({required this.onOpenBilling});

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final canWrite = can(store.role, 'saleOrders', 'write');
    final rows = [...store.saleOrders]..sort((a, b) => b.ts.compareTo(a.ts));
    return Column(children: [
      _docHeader(context, s.raw('nav.saleOrders'), canWrite ? () => _create(context) : null),
      Expanded(
        child: ListView.separated(
          itemCount: rows.length,
          separatorBuilder: (_, __) => const Divider(height: 1),
          itemBuilder: (ctx, i) {
            final o = rows[i];
            final status = o.status == 'draft' ? 'draft' : deriveOrderStatus(o, store.bills, store.deliveryChallans);
            return ListTile(
              title: Text('${o.number ?? s.raw('doc.status.draft')} · ${o.customerName} · ${fmtRs(o.total)}'),
              subtitle: Text('${fmtDate(o.ts)} · ${_status(context, status)}'),
              trailing: canWrite ? _actions(context, store, o, status) : null,
            );
          },
        ),
      ),
    ]);
  }

  Widget _actions(BuildContext context, ShopStore store, SaleOrder o, String status) {
    final s = S.current;
    return PopupMenuButton<String>(
      onSelected: (a) async {
        switch (a) {
          case 'confirm':
            await store.confirmSaleOrder(o.id);
          case 'cancel':
            await store.cancelSaleOrder(o.id);
          case 'delete':
            await store.deleteSaleOrder(o.id);
          case 'toBill':
            final picks = await _conversionPicks(context, o.lines,
                orderBilledQty(o, store.bills, store.deliveryChallans),
                title: s.raw('nav.billing'));
            if (picks == null || picks.isEmpty) break;
            final prefill = await store.convertOrderToBill(o.id, picks);
            if (prefill != null) onOpenBilling();
          case 'toChallan':
            final picks = await _conversionPicks(context, o.lines,
                orderDeliveredQty(o, store.deliveryChallans),
                title: s.raw('nav.deliveryChallans'));
            if (picks != null && picks.isNotEmpty) await store.convertOrderToChallan(o.id, picks);
        }
        if (store.lastError != null && context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(store.lastError!)));
        }
      },
      itemBuilder: (ctx) => [
        if (o.status == 'draft') PopupMenuItem(value: 'confirm', child: Text(s.actionConfirm)),
        if (o.status == 'open' || o.status == 'partially_fulfilled') PopupMenuItem(value: 'toBill', child: Text(s.raw('nav.billing'))),
        if (o.status == 'open' || o.status == 'partially_fulfilled') PopupMenuItem(value: 'toChallan', child: Text(s.raw('nav.deliveryChallans'))),
        if (o.status != 'cancelled') PopupMenuItem(value: 'cancel', child: Text(s.raw('doc.status.cancelled'))),
        if (o.status == 'draft') PopupMenuItem(value: 'delete', child: Text(s.actionDelete)),
      ],
    );
  }

  Future<void> _create(BuildContext context) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    final result = await _editLines(context, const [], partyLabel: s.raw('credit.give.namePlaceholder'));
    if (result == null || result.$2.isEmpty) return;
    await store.saveSaleOrder(customerName: result.$1, picks: result.$2);
  }
}

// ── Delivery challans ───────────────────────────────────────────

class _ChallansTab extends StatelessWidget {
  final VoidCallback onOpenBilling;
  const _ChallansTab({required this.onOpenBilling});

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final canWrite = can(store.role, 'saleOrders', 'write');
    final rows = [...store.deliveryChallans]..sort((a, b) => b.ts.compareTo(a.ts));
    return Column(children: [
      _docHeader(context, s.raw('nav.deliveryChallans'), canWrite ? () => _create(context) : null),
      Expanded(
        child: ListView.separated(
          itemCount: rows.length,
          separatorBuilder: (_, __) => const Divider(height: 1),
          itemBuilder: (ctx, i) {
            final d = rows[i];
            final status = d.status == 'draft' ? 'draft' : deriveChallanStatus(d, store.bills);
            return ListTile(
              title: Text('${d.number ?? s.raw('doc.status.draft')} · ${d.customerName} · ${d.lines.map((it) => '${it.name} ×${it.qty}').join(', ')}'),
              subtitle: Text('${fmtDate(d.ts)} · ${_status(context, status)}${d.orderId != null ? ' · SO' : ''}'),
              trailing: canWrite ? _actions(context, store, d) : null,
            );
          },
        ),
      ),
    ]);
  }

  Widget _actions(BuildContext context, ShopStore store, DeliveryChallan d) {
    final s = S.current;
    return PopupMenuButton<String>(
      onSelected: (a) async {
        switch (a) {
          case 'dispatch':
            await store.dispatchChallan(d.id);
          case 'cancel':
            await store.cancelChallan(d.id);
          case 'delete':
            await store.deleteChallan(d.id);
          case 'toBill':
            final picks = await _conversionPicks(context, d.lines,
                challanBilledQty(d, store.bills),
                title: s.raw('nav.billing'));
            if (picks == null || picks.isEmpty) break;
            final prefill = await store.convertChallanToBill(d.id, picks);
            if (prefill != null) onOpenBilling();
          case 'print':
            // MC workflow §3 — challan print (own letterhead,
            // quantities only, DD/MM/YYYY).
            showDocPrintSheet(
              context,
              challanDocPage(
                challan: d,
                ownerDoc: store.ownerDoc,
                title: s.raw('nav.deliveryChallans'),
                dateLabel: s.raw('common.date'),
                vehicleLabel: s.raw('challan.vehicleNo'),
                driverLabel: s.raw('challan.driverName'),
                receivedByLabel: s.raw('voucher.signature'),
                qty: (q) => fmtQty(q),
              ),
              jobName: 'challan-${d.id}',
              width: 700,
            );
        }
        if (store.lastError != null && context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(store.lastError!)));
        }
      },
      itemBuilder: (ctx) => [
        if (d.status == 'draft') PopupMenuItem(value: 'dispatch', child: Text(s.raw('doc.status.dispatched'))),
        if (d.status == 'dispatched' || d.status == 'partially_billed') PopupMenuItem(value: 'toBill', child: Text(s.raw('nav.billing'))),
        PopupMenuItem(value: 'print', child: Text(s.actionPrint)),
        if (d.status != 'cancelled') PopupMenuItem(value: 'cancel', child: Text(s.raw('doc.status.cancelled'))),
        if (d.status == 'draft') PopupMenuItem(value: 'delete', child: Text(s.actionDelete)),
      ],
    );
  }

  Future<void> _create(BuildContext context) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    final result = await _editLines(context, const [], partyLabel: s.raw('credit.give.namePlaceholder'));
    if (result == null || result.$2.isEmpty) return;
    await store.saveChallan(customerName: result.$1, picks: result.$2);
  }
}

// ── Purchase orders ─────────────────────────────────────────────

class _PurchaseOrdersTab extends StatelessWidget {
  const _PurchaseOrdersTab();

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final canWrite = can(store.role, 'purchaseOrders', 'write');
    final rows = [...store.purchaseOrders]..sort((a, b) => b.ts.compareTo(a.ts));
    return Column(children: [
      _docHeader(context, s.raw('nav.purchaseOrders'), canWrite ? () => _create(context) : null),
      Expanded(
        child: ListView.separated(
          itemCount: rows.length,
          separatorBuilder: (_, __) => const Divider(height: 1),
          itemBuilder: (ctx, i) {
            final po = rows[i];
            final status = po.status == 'draft' ? 'draft' : derivePoStatus(po, store.purchases);
            return ListTile(
              title: Text('${po.number ?? s.raw('doc.status.draft')} · ${po.supplierName} · ${fmtRs(po.total)}'),
              subtitle: Text('${fmtDate(po.ts)} · ${_status(context, status)}'),
              trailing: canWrite ? _actions(context, store, po) : null,
            );
          },
        ),
      ),
    ]);
  }

  Widget _actions(BuildContext context, ShopStore store, PurchaseOrder po) {
    final s = S.current;
    return PopupMenuButton<String>(
      onSelected: (a) async {
        switch (a) {
          case 'issue':
            await store.issuePurchaseOrder(po.id);
          case 'cancel':
            await store.cancelPurchaseOrder(po.id);
          case 'delete':
            await store.deletePurchaseOrder(po.id);
          case 'receive':
            final supplier = store.suppliers.where((x) => x.id == po.supplierId).firstOrNull;
            if (supplier == null) break;
            final remaining = <({Product product, double qty, double unitCost})>[];
            final received = poReceivedQty(po, store.purchases);
            for (final l in po.lines) {
              final left = l.qty - (received[l.productId] ?? 0);
              if (left > 0) {
                remaining.add((product: store.productsById[l.productId]!, qty: left, unitCost: l.unitCost));
              }
            }
            if (context.mounted && remaining.isNotEmpty) {
              await showPurchaseEntry(context, supplier, sourcePoId: po.id, seedLines: remaining);
            }
        }
        if (store.lastError != null && context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(store.lastError!)));
        }
      },
      itemBuilder: (ctx) => [
        if (po.status == 'draft') PopupMenuItem(value: 'issue', child: Text(s.raw('doc.status.issued'))),
        if (po.status == 'issued' || po.status == 'partially_received') PopupMenuItem(value: 'receive', child: Text(s.raw('sup.receiveAgainstPo'))),
        if (po.status != 'cancelled') PopupMenuItem(value: 'cancel', child: Text(s.raw('doc.status.cancelled'))),
        if (po.status == 'draft') PopupMenuItem(value: 'delete', child: Text(s.actionDelete)),
      ],
    );
  }

  Future<void> _create(BuildContext context) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    if (store.suppliers.isEmpty) return;
    var supplier = store.suppliers.first;
    final picked = await showDialog<Supplier>(
      context: context,
      builder: (ctx) => SimpleDialog(
        title: Text(s.raw('nav.suppliers')),
        children: [
          for (final sup in store.suppliers)
            SimpleDialogOption(onPressed: () => Navigator.pop(ctx, sup), child: Text(sup.name)),
        ],
      ),
    );
    if (picked != null) supplier = picked;
    if (!context.mounted) return;
    final result = await _editLines(context, const [], costPrices: true, partyLabel: s.raw('sup.form.name'), partyInitial: supplier.name);
    if (result == null || result.$2.isEmpty) return;
    await store.savePurchaseOrder(supplierId: supplier.id, picks: [for (final l in result.$2) (productId: l.productId, qty: l.qty, unitCost: l.unitPrice)]);
  }
}

// ── Notes (CN / DN) ─────────────────────────────────────────────

class _NotesTab extends StatelessWidget {
  const _NotesTab();

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final rows = [...store.notes]..sort((a, b) => b.ts.compareTo(a.ts));
    if (rows.isEmpty) return Center(child: Text(s.raw('note.empty')));
    return ListView.separated(
      itemCount: rows.length,
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (ctx, i) {
        final n = rows[i];
        return ListTile(
          title: Text('${n.number} · ${n.partyName} · ${fmtRs(n.total)}'),
          subtitle: Text('${fmtDate(n.ts)} · ${n.kind == 'credit' ? s.raw('note.filter.credit') : s.raw('note.filter.debit')} · ${n.settlement}${n.reason.isNotEmpty ? ' · ${n.reason}' : ''}'),
        );
      },
    );
  }
}

// ── Vouchers (RV / PV register) ─────────────────────────────────

class _VouchersTab extends StatelessWidget {
  const _VouchersTab();

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final rvs = [...store.credits.where((e) => e.kind == 'repayment')]..sort((a, b) => b.ts.compareTo(a.ts));
    final pvs = [...store.supplierPayments.where((p) => p.kind != 'reversal')]..sort((a, b) => b.ts.compareTo(a.ts));
    final supplierName = {for (final sup in store.suppliers) sup.id: sup.name};
    return ListView(padding: const EdgeInsets.all(12), children: [
      Text(s.raw('credit.repayment'), style: Theme.of(context).textTheme.titleMedium),
      for (final r in rvs)
        ListTile(
          dense: true,
          title: Text('${r.voucherNo ?? 'RV'} · ${r.customerName} · ${fmtRs(r.amount)}'),
          subtitle: Text('${fmtDate(r.ts)} · ${r.method}'),
          trailing: Row(mainAxisSize: MainAxisSize.min, children: [
            IconButton(
              icon: const Icon(Icons.print_outlined, size: 18),
              onPressed: () {
                final v = receiptVoucherData(r, store.customers, store.bills, store.accounts, store.journal);
                if (v == null) return;
                showDocPrintSheet(context, voucherDocPage(
                  v: v, ownerDoc: store.ownerDoc,
                  title: s.raw('voucher.receiptTitle'),
                  dateLabel: s.commonDate,
                  amountLabel: s.commonAmount,
                  balanceLabel: s.voucherBalanceAfterCustomer,
                  signatureLabel: s.raw('voucher.signature'),
                  chequeLabel: s.raw('chq.col.cheque'),
                  bankLabel: s.raw('chq.field.bank'),
                  money: fmtRs,
                ), jobName: v.number);
              },
            ),
            IconButton(
              icon: const Icon(Icons.share_outlined, size: 18),
              onPressed: () {
                final v = receiptVoucherData(r, store.customers, store.bills, store.accounts, store.journal);
                if (v == null) return;
                Share.share('${v.number} · ${v.partyName} · ${fmtRs(v.amount)}\n${v.accountName ?? ''} · ${v.balanceAfter != null ? fmtRs(v.balanceAfter!) : ''}');
              },
            ),
          ]),
        ),
      const SizedBox(height: 12),
      Text(s.raw('sup.payment.title'), style: Theme.of(context).textTheme.titleMedium),
      for (final p in pvs)
        ListTile(
          dense: true,
          title: Text('${p.voucherNo ?? 'PV'} · ${supplierName[p.supplierId] ?? ''} · ${fmtRs(p.amount)}'),
          subtitle: Text('${fmtDate(p.ts)} · ${p.method}'),
          trailing: Row(mainAxisSize: MainAxisSize.min, children: [
            IconButton(
              icon: const Icon(Icons.print_outlined, size: 18),
              onPressed: () {
                final v = paymentVoucherData(p, store.suppliers, store.accounts, store.journal);
                if (v == null) return;
                showDocPrintSheet(context, voucherDocPage(
                  v: v, ownerDoc: store.ownerDoc,
                  title: s.raw('voucher.paymentTitle'),
                  dateLabel: s.commonDate,
                  amountLabel: s.commonAmount,
                  balanceLabel: s.voucherBalanceAfterSupplier,
                  signatureLabel: s.raw('voucher.signature'),
                  chequeLabel: s.raw('chq.col.cheque'),
                  bankLabel: s.raw('chq.field.bank'),
                  money: fmtRs,
                ), jobName: v.number);
              },
            ),
            IconButton(
              icon: const Icon(Icons.share_outlined, size: 18),
              onPressed: () {
                final v = paymentVoucherData(p, store.suppliers, store.accounts, store.journal);
                if (v == null) return;
                Share.share('${v.number} · ${v.partyName} · ${fmtRs(v.amount)}\n${v.accountName ?? ''} · ${v.balanceAfter != null ? fmtRs(v.balanceAfter!) : ''}');
              },
            ),
          ]),
        ),
    ]);
  }
}

/// Stock transfers (F3, Phase C §2): draft → dispatch → receive
/// (partial allowed) → close-short / return-to-source. Movements
/// post NOTHING; only close-short books the shortage as a stock
/// loss — and that is confirmed with its per-line amounts first.
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/ledger.dart';
import '../core/permissions.dart';
import '../core/transfers.dart' as tr_core;
import '../core/types.dart';
import '../data/store.dart';
import '../l10n/app_strings.dart';
import '../main.dart' show fmtRs;
import 'f3_common.dart';

class TransfersScreen extends StatelessWidget {
  const TransfersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final canWrite = can(store.role, 'warehouses', 'write');
    final transfers = [...store.stockTransfers]..sort((a, b) => b.ts.compareTo(a.ts));
    final inTransit = tr_core.inTransitTotalQty(store.stockTransfers);
    final open = store.stockTransfers.where(tr_core.isOpenTransfer).length;
    String whName(String id) => store.warehouses.where((w) => w.id == id).firstOrNull?.name ?? id;

    return Column(children: [
      Padding(
        padding: const EdgeInsets.all(12),
        child: Row(children: [
          Expanded(child: Text(s.raw('tr.subtitle'), style: Theme.of(context).textTheme.bodySmall)),
          if (canWrite)
            ElevatedButton.icon(
              onPressed: () => _editTransfer(context, null),
              icon: const Icon(Icons.add, size: 18),
              label: Text(s.raw('tr.add')),
            ),
        ]),
      ),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: Align(
          alignment: AlignmentDirectional.centerStart,
          child: Text(inTransit > 0
              ? '${f3('tr.summary.inTransit', {'qty': fmtQty(inTransit)})} · ${f3('tr.summary.open', {'count': '$open'})}'
              : s.raw('tr.summary.none')),
        ),
      ),
      const SizedBox(height: 8),
      Expanded(
        child: transfers.isEmpty
            ? Center(child: Text(s.raw('tr.empty')))
            : ListView.separated(
                itemCount: transfers.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (ctx, i) {
                  final t = transfers[i];
                  final sent = t.lines.fold<double>(0, (a, l) => a + l.qtySent);
                  final received = t.lines.fold<double>(0, (a, l) => a + l.qtyReceived);
                  return ListTile(
                    title: Text('${t.number ?? s.raw('tr.status.draft')} · ${whName(t.fromWarehouseId)} → ${whName(t.toWarehouseId)}'),
                    subtitle: Text(
                        '${s.raw('tr.col.sent')}: ${fmtQty(sent)} · ${s.raw('tr.col.received')}: ${fmtQty(received)}'
                        '${t.note.isEmpty ? '' : ' · ${t.note}'}'),
                    trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                      Chip(label: Text(s.raw('tr.status.${t.status}')), visualDensity: VisualDensity.compact),
                      if (canWrite) _actions(context, t),
                    ]),
                  );
                },
              ),
      ),
    ]);
  }

  Widget _actions(BuildContext context, StockTransfer t) {
    final s = S.current;
    bool canDo(String a) => tr_core.canTransferTransition(t, a);
    return PopupMenuButton<String>(
      onSelected: (v) => _runAction(context, t, v),
      itemBuilder: (_) => [
        if (canDo('edit')) PopupMenuItem(value: 'edit', child: Text(s.raw('tr.action.edit'))),
        if (canDo('dispatch')) PopupMenuItem(value: 'dispatch', child: Text(s.raw('tr.action.dispatch'))),
        if (canDo('receive')) PopupMenuItem(value: 'receive', child: Text(s.raw('tr.action.receive'))),
        if (canDo('closeShort')) PopupMenuItem(value: 'closeShort', child: Text(s.raw('tr.action.closeShort'))),
        if (canDo('returnToSource')) PopupMenuItem(value: 'return', child: Text(s.raw('tr.action.returnToSource'))),
        if (canDo('cancel')) PopupMenuItem(value: 'cancel', child: Text(s.raw('tr.action.cancelTransfer'))),
        if (canDo('delete')) PopupMenuItem(value: 'delete', child: Text(s.raw('tr.action.delete'))),
      ],
    );
  }

  Future<void> _runAction(BuildContext context, StockTransfer t, String action) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    String whName(String id) => store.warehouses.where((w) => w.id == id).firstOrNull?.name ?? id;
    switch (action) {
      case 'edit':
        await _editTransfer(context, t);
      case 'dispatch':
        if (await store.dispatchStockTransfer(t) && context.mounted) {
          final fresh = store.stockTransfers.where((x) => x.id == t.id).firstOrNull;
          f3Notice(context, f3('tr.notice.dispatched', {'number': fresh?.number ?? t.number ?? ''}));
        }
      case 'receive':
        await _receiveDialog(context, t);
      case 'closeShort':
        await _closeDialog(context, t);
      case 'return':
        final remaining = t.lines.fold<double>(0, (a, l) => a + tr_core.lineRemaining(l));
        final ok = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: Text(f3('tr.return.title', {'number': t.number ?? ''})),
            content: Text(f3('tr.return.body', {'qty': fmtQty(remaining), 'name': whName(t.fromWarehouseId)})),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
              ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(s.raw('tr.return.submit'))),
            ],
          ),
        );
        if (ok == true && await store.returnStockTransfer(t) && context.mounted) {
          f3Notice(context, f3('tr.notice.returned', {'number': t.number ?? '', 'name': whName(t.fromWarehouseId)}));
        }
      case 'cancel':
        if (await store.cancelStockTransfer(t) && context.mounted) {
          f3Notice(context, s.raw('tr.notice.cancelled'));
        }
      case 'delete':
        if (await store.deleteStockTransfer(t) && context.mounted) {
          f3Notice(context, s.raw('tr.notice.deleted'));
        }
    }
  }

  Future<void> _editTransfer(BuildContext context, StockTransfer? existing) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    var fromId = existing?.fromWarehouseId ?? store.defaultWarehouseId;
    var toId = existing?.toWarehouseId ??
        store.warehouses.where((w) => !w.archived && w.id != fromId).firstOrNull?.id;
    final note = TextEditingController(text: existing?.note ?? '');
    var picks = <PickLine>[
      if (existing != null)
        for (final l in existing.lines) PickLine(l.productId, l.qtySent),
    ];
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          title: Text(existing == null ? s.raw('tr.form.addTitle') : s.raw('tr.form.editTitle')),
          content: SizedBox(
            width: 520,
            child: SingleChildScrollView(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                WarehouseDropdown(
                  warehouses: store.warehouses,
                  value: fromId,
                  label: s.raw('tr.form.from'),
                  onChanged: (v) => setLocal(() => fromId = v ?? fromId),
                ),
                WarehouseDropdown(
                  warehouses: store.warehouses,
                  value: toId,
                  label: s.raw('tr.form.to'),
                  onChanged: (v) => setLocal(() => toId = v),
                ),
                TextField(controller: note, decoration: InputDecoration(labelText: s.raw('tr.form.note'), hintText: s.raw('tr.form.notePh'))),
                const SizedBox(height: 8),
                PickLinesEditor(
                  products: store.products,
                  initial: picks,
                  onChanged: (v) => picks = v,
                  hintFor: (p) => f3('tr.lines.atSource', {
                    'qty': fmtQty(store.qtyAtWh(p, fromId)),
                  }),
                ),
              ]),
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
            ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(s.actionSave)),
          ],
        ),
      ),
    );
    if (saved != true || toId == null) return;
    final lines = [for (final p in picks) (productId: p.productId, qty: p.qty)];
    if (existing == null) {
      if (await store.createStockTransfer(fromWarehouseId: fromId, toWarehouseId: toId!, picks: lines, note: note.text.trim()) &&
          context.mounted) {
        f3Notice(context, s.raw('tr.notice.created'));
      }
    } else {
      if (await store.updateStockTransfer(existing,
              fromWarehouseId: fromId, toWarehouseId: toId, picks: lines, note: note.text.trim()) &&
          context.mounted) {
        f3Notice(context, s.raw('tr.notice.updated'));
      }
    }
  }

  Future<void> _receiveDialog(BuildContext context, StockTransfer t) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    final ctrls = {
      for (final l in t.lines) l.productId: TextEditingController(text: fmtQty(tr_core.lineRemaining(l))),
    };
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(f3('tr.receive.title', {'number': t.number ?? ''})),
        content: SizedBox(
          width: 440,
          child: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Text(s.raw('tr.receive.help')),
              const SizedBox(height: 8),
              for (final l in t.lines)
                Row(children: [
                  Expanded(child: Text(l.name)),
                  Text(f3('tr.receive.stillOut', {'qty': fmtQty(tr_core.lineRemaining(l))})),
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 90,
                    child: TextField(
                      controller: ctrls[l.productId],
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(labelText: s.raw('tr.receive.thisTime'), isDense: true),
                    ),
                  ),
                ]),
            ]),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(s.raw('tr.receive.submit'))),
        ],
      ),
    );
    if (saved != true) return;
    final picks = [
      for (final l in t.lines)
        (productId: l.productId, qty: double.tryParse(ctrls[l.productId]!.text.trim()) ?? 0),
    ];
    final ok = await store.receiveStockTransfer(t, picks);
    if (!context.mounted) return;
    if (!ok) {
      f3Notice(context, s.raw('tr.err.overReceive'));
      return;
    }
    final fresh = store.stockTransfers.where((x) => x.id == t.id).firstOrNull;
    f3Notice(
        context,
        fresh?.status == 'received'
            ? f3('tr.notice.receivedFull', {'number': t.number ?? ''})
            : f3('tr.notice.received', {'number': t.number ?? ''}));
  }

  Future<void> _closeDialog(BuildContext context, StockTransfer t) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    final shortages = tr_core.transferShortages(t);
    final loss = tr_core.transferLossValue(shortages, store.productsById);
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(f3('tr.close.title', {'number': t.number ?? ''})),
        content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(s.raw('tr.close.body')),
          const SizedBox(height: 8),
          for (final sh in shortages)
            Text(f3('tr.close.line', {
              'name': sh.name,
              'qty': fmtQty(sh.qty),
              'amount': fmtRs(sh.qty * (store.productsById[sh.productId]?.costPrice ?? 0)),
            })),
          const Divider(),
          Text('${s.raw('tr.close.total')}: ${fmtRs(loss)}', style: const TextStyle(fontWeight: FontWeight.w600)),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(s.raw('tr.close.submit'))),
        ],
      ),
    );
    if (ok == true && await store.closeStockTransfer(t) && context.mounted) {
      f3Notice(context, f3('tr.notice.closedShort', {'number': t.number ?? '', 'amount': fmtRs(loss)}));
    }
  }
}

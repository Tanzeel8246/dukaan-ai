/// Warehouses (F3, Phase C §1): the location directory with
/// default/archive management, the per-warehouse stock view
/// (on hand / promised / available / incoming — the §1.6
/// selectors), and the §1.7 drift recount. Warehouses are
/// archived, never deleted; the default can't be archived.
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../app_state.dart';
import '../core/permissions.dart';
import '../core/mc_workflow.dart' show warehouseCardCounts;
import '../core/stock.dart' as stock_core;
import '../core/transfers.dart' as tr_core;
import '../core/types.dart';
import '../data/store.dart';
import '../l10n/app_strings.dart';
import '../main.dart' show fmtRs;
import 'f3_common.dart';

class WarehousesScreen extends StatefulWidget {
  const WarehousesScreen({super.key});
  @override
  State<WarehousesScreen> createState() => _WarehousesScreenState();
}

class _WarehousesScreenState extends State<WarehousesScreen> {
  Warehouse? _selected;

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final tokens = context.watch<AppState>().tokens;
    final canWrite = can(store.role, 'warehouses', 'write');
    final sorted = stock_core.sortedWarehouses(store.warehouses);
    final drift = stock_core.stockDrift(store.products, store.stockLevels, store.stockTransfers);
    final sel = _selected == null
        ? null
        : store.warehouses.where((w) => w.id == _selected!.id).firstOrNull ?? sorted.firstOrNull;

    final directory = Column(children: [
      Padding(
        padding: const EdgeInsets.all(12),
        child: Row(children: [
          Expanded(child: Text(s.raw('wh.subtitle'), style: Theme.of(context).textTheme.bodySmall)),
          if (canWrite)
            ElevatedButton.icon(
              onPressed: () => _editWarehouse(context, null),
              icon: const Icon(Icons.add, size: 18),
              label: Text(s.raw('wh.add')),
            ),
        ]),
      ),
      if (drift.isNotEmpty)
        Card(
          color: tokens.amberSoft,
          margin: const EdgeInsets.symmetric(horizontal: 12),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(s.raw('wh.drift.title'), style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 4),
              Text(f3('wh.drift.body', {'count': '${drift.length}'})),
              for (final d in drift.take(5))
                Text(f3('wh.drift.item', {
                  'name': store.productsById[d.productId]?.name ?? d.productId,
                  'rows': '${d.rowsTotal}',
                  'total': '${d.stockQty}',
                })),
              if (canWrite)
                Align(
                  alignment: AlignmentDirectional.centerEnd,
                  child: TextButton.icon(
                    onPressed: () async {
                      final n = await store.recountStockLevels();
                      if (context.mounted) f3Notice(context, f3('wh.drift.done', {'count': '$n'}));
                    },
                    icon: const Icon(Icons.build_outlined, size: 18),
                    label: Text(s.raw('wh.drift.recount')),
                  ),
                ),
            ]),
          ),
        ),
      Expanded(
        child: sorted.isEmpty
            ? Center(child: Text(s.raw('wh.empty')))
            : ListView.separated(
                itemCount: sorted.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (ctx, i) {
                  final w = sorted[i];
                  final value = store.products.fold<double>(
                      0, (a, p) => a + stock_core.qtyAtWarehouse(p, store.stockLevels, store.warehouses, w.id) * p.costPrice);
                  return ListTile(
                    title: Row(children: [
                      Expanded(child: Text(w.name)),
                      if (w.isDefault)
                        Chip(label: Text(s.raw('wh.defaultBadge')), visualDensity: VisualDensity.compact),
                      if (w.archived)
                        Chip(label: Text(s.raw('wh.archivedBadge')), visualDensity: VisualDensity.compact),
                    ]),
                    subtitle: Text([
                      w.note.isEmpty ? f3('wh.valueHere', {'amount': fmtRs(value)}) : w.note,
                      // MC workflow §9 — REAL item/unit counts, never
                      // 0 while stock exists (derived, not cached).
                      s.raw('mc.wh.itemsUnits')
                          .replaceAll('{items}', '${warehouseCardCounts(store.products, store.stockLevels, store.warehouses, w.id).items}')
                          .replaceAll('{units}', '${warehouseCardCounts(store.products, store.stockLevels, store.warehouses, w.id).units}'),
                    ].join(' · ')),
                    selected: sel?.id == w.id,
                    onTap: () => setState(() => _selected = w),
                    trailing: canWrite
                        ? PopupMenuButton<String>(
                            onSelected: (v) => _warehouseAction(context, w, v),
                            itemBuilder: (_) => [
                              PopupMenuItem(value: 'edit', child: Text(s.raw('wh.edit'))),
                              if (!w.isDefault && !w.archived)
                                PopupMenuItem(value: 'default', child: Text(s.raw('wh.makeDefault'))),
                              if (!w.archived && !w.isDefault)
                                PopupMenuItem(value: 'archive', child: Text(s.raw('wh.archive'))),
                              if (w.archived)
                                PopupMenuItem(value: 'unarchive', child: Text(s.raw('wh.unarchive'))),
                            ],
                          )
                        : null,
                  );
                },
              ),
      ),
    ]);

    final detail = sel == null ? Center(child: Text(s.raw('common.none'))) : _WarehouseStock(warehouse: sel);
    final wide = MediaQuery.of(context).size.width >= 900;
    if (wide) {
      return Row(children: [
        SizedBox(width: 400, child: directory),
        const VerticalDivider(width: 1),
        Expanded(child: detail),
      ]);
    }
    return _selected == null || sel == null
        ? directory
        : Column(children: [
            ListTile(
              leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => setState(() => _selected = null)),
              title: Text(sel.name),
            ),
            Expanded(child: detail),
          ]);
  }

  Future<void> _warehouseAction(BuildContext context, Warehouse w, String action) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    switch (action) {
      case 'edit':
        await _editWarehouse(context, w);
      case 'default':
        if (await store.setDefaultWarehouse(w.id) && context.mounted) {
          f3Notice(context, f3('wh.notice.defaultSet', {'name': w.name}));
        }
      case 'archive':
        if (w.isDefault) {
          if (context.mounted) f3Notice(context, s.raw('wh.cannotArchiveDefault'));
          return;
        }
        if (await store.updateWarehouse(w, archived: true) && context.mounted) {
          f3Notice(context, s.raw('wh.notice.archived'));
        }
      case 'unarchive':
        if (await store.updateWarehouse(w, archived: false) && context.mounted) {
          f3Notice(context, s.raw('wh.notice.unarchived'));
        }
    }
  }

  Future<void> _editWarehouse(BuildContext context, Warehouse? existing) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    final name = TextEditingController(text: existing?.name ?? '');
    final note = TextEditingController(text: existing?.note ?? '');
    var makeDefault = existing?.isDefault ?? store.warehouses.isEmpty;
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          title: Text(existing == null ? s.raw('wh.form.addTitle') : s.raw('wh.form.editTitle')),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(controller: name, decoration: InputDecoration(labelText: s.raw('wh.form.name'), hintText: s.raw('wh.form.namePh'))),
            TextField(controller: note, decoration: InputDecoration(labelText: s.raw('wh.form.note'), hintText: s.raw('wh.form.notePh'))),
            if (existing == null)
              CheckboxListTile(
                value: makeDefault,
                onChanged: (v) => setLocal(() => makeDefault = v ?? false),
                title: Text(s.raw('wh.makeDefault')),
                contentPadding: EdgeInsets.zero,
              ),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
            ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(s.actionSave)),
          ],
        ),
      ),
    );
    if (saved != true) return;
    if (name.text.trim().isEmpty) {
      if (context.mounted) f3Notice(context, s.raw('wh.err.nameRequired'));
      return;
    }
    if (existing == null) {
      if (await store.addWarehouse(name: name.text, note: note.text, makeDefault: makeDefault) && context.mounted) {
        f3Notice(context, f3('wh.notice.created', {'name': name.text.trim()}));
      }
    } else {
      if (await store.updateWarehouse(existing, name: name.text, note: note.text) && context.mounted) {
        f3Notice(context, s.raw('wh.notice.updated'));
      }
    }
  }
}

class _WarehouseStock extends StatelessWidget {
  final Warehouse warehouse;
  const _WarehouseStock({required this.warehouse});

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final availability = stock_core.availabilityByProductAtWarehouse(store.products,
        store.stockLevels, store.warehouses, store.saleOrders, store.deliveryChallans, store.bills, warehouse.id);
    final incomingMap = tr_core.incomingByProductAtWarehouse(store.stockTransfers, warehouse.id);
    final rows = <({Product p, double onHand, double promised, double incoming})>[];
    var totalValue = 0.0;
    for (final p in store.products) {
      final a = availability[p.id];
      final onHand = a?.onHand ?? 0;
      final inc = incomingMap[p.id] ?? 0;
      if (onHand == 0 && inc == 0) continue;
      rows.add((p: p, onHand: onHand, promised: a?.promised ?? 0, incoming: inc));
      totalValue += onHand * p.costPrice;
    }
    return Column(children: [
      Padding(
        padding: const EdgeInsets.all(12),
        child: Row(children: [
          Expanded(
            child: Text(s.raw('wh.stockTitle'), style: Theme.of(context).textTheme.titleMedium),
          ),
          Text(f3('wh.valueHere', {'amount': fmtRs(totalValue)})),
        ]),
      ),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: Row(children: [
          Expanded(child: Text(s.raw('wh.col.product'), style: const TextStyle(fontWeight: FontWeight.w600))),
          SizedBox(width: 70, child: Text(s.raw('wh.col.onHand'), textAlign: TextAlign.end)),
          SizedBox(width: 70, child: Text(s.raw('wh.col.promised'), textAlign: TextAlign.end)),
          SizedBox(width: 80, child: Text(s.raw('wh.col.available'), textAlign: TextAlign.end)),
          SizedBox(width: 80, child: Text(s.raw('tr.col.incoming'), textAlign: TextAlign.end)),
          SizedBox(width: 90, child: Text(s.raw('wh.col.value'), textAlign: TextAlign.end)),
        ]),
      ),
      const Divider(),
      Expanded(
        child: rows.isEmpty
            ? Center(child: Text(s.raw('wh.stockEmpty')))
            : ListView.separated(
                itemCount: rows.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (ctx, i) {
                  final r = rows[i];
                  final avail = r.onHand - r.promised;
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    child: Row(children: [
                      Expanded(child: Text(r.p.name)),
                      SizedBox(width: 70, child: Text('${r.onHand}', textAlign: TextAlign.end)),
                      SizedBox(width: 70, child: Text('${r.promised}', textAlign: TextAlign.end)),
                      SizedBox(width: 80, child: Text('$avail', textAlign: TextAlign.end)),
                      SizedBox(width: 80, child: Text('${r.incoming}', textAlign: TextAlign.end)),
                      SizedBox(width: 90, child: Text(fmtRs(r.onHand * r.p.costPrice), textAlign: TextAlign.end)),
                    ]),
                  );
                },
              ),
      ),
    ]);
  }
}

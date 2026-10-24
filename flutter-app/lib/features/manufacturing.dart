/// Manufacturing (F3, Phase C §3+§4): immutable-version BOM
/// recipes and production orders whose event log is the
/// subledger — issue into WIP, completions absorbing the pool
/// (the final one to exactly zero), scrap and close-out
/// write-offs. Money moves only through the store's guarded
/// production actions.
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/boms.dart';
import '../core/ledger.dart';
import '../core/permissions.dart';
import '../core/production.dart';
import '../core/types.dart';
import '../data/store.dart';
import '../l10n/app_strings.dart';
import '../main.dart' show fmtRs;
import 'f2_common.dart' show AccountDropdown;
import 'f3_common.dart';

class ManufacturingScreen extends StatefulWidget {
  const ManufacturingScreen({super.key});
  @override
  State<ManufacturingScreen> createState() => _ManufacturingScreenState();
}

class _ManufacturingScreenState extends State<ManufacturingScreen> {
  ProductionOrder? _selected;

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final canWrite = can(store.role, 'manufacturing', 'write');
    final orders = [...store.productionOrders]..sort((a, b) => b.ts.compareTo(a.ts));
    final outputs = <String>{for (final b in store.boms) b.outputProductId};

    final listPane = Column(children: [
      Padding(
        padding: const EdgeInsets.all(12),
        child: Row(children: [
          Expanded(
            child: Text(s.raw('mfg.po.title'), style: Theme.of(context).textTheme.titleMedium),
          ),
          if (canWrite)
            ElevatedButton.icon(
              onPressed: () => _createOrder(context),
              icon: const Icon(Icons.add, size: 18),
              label: Text(s.raw('mfg.po.new')),
            ),
        ]),
      ),
      Expanded(
        child: orders.isEmpty
            ? Center(child: Text(s.raw('mfg.po.empty')))
            : ListView.separated(
                itemCount: orders.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (ctx, i) {
                  final o = orders[i];
                  return ListTile(
                    title: Text('${o.number ?? s.raw('mfg.po.draftLabel')} · ${o.outputName}'),
                    subtitle: Text(
                        '${s.raw('mfg.po.planned')}: ${fmtQty(o.plannedQty)} · ${s.raw('mfg.po.produced')}: ${fmtQty(producedQty(o))} · ${s.raw('mfg.po.pool')}: ${fmtRs(poolOf(o))}'),
                    trailing: Chip(
                        label: Text(s.raw('mfg.po.status.${o.status}')), visualDensity: VisualDensity.compact),
                    selected: _selected?.id == o.id,
                    onTap: () => setState(() => _selected = o),
                  );
                },
              ),
      ),
      const Divider(),
      Padding(
        padding: const EdgeInsets.all(12),
        child: Row(children: [
          Expanded(child: Text(s.raw('mfg.subtitle'), style: Theme.of(context).textTheme.bodySmall)),
          if (canWrite)
            TextButton.icon(
              onPressed: () => _editBom(context, null, null),
              icon: const Icon(Icons.add, size: 18),
              label: Text(s.raw('mfg.newRecipe')),
            ),
        ]),
      ),
      SizedBox(
        height: 190,
        child: outputs.isEmpty
            ? Center(child: Text(s.raw('mfg.empty')))
            : ListView(
                children: [
                  for (final outId in outputs)
                    Builder(builder: (ctx) {
                      final active = activeBomFor(store.boms, outId);
                      final versions = bomsForOutput(store.boms, outId);
                      final product = store.productsById[outId];
                      return ListTile(
                        dense: true,
                        title: Text('${product?.name ?? outId} — v${active?.version ?? '—'}'),
                        subtitle: Text(active == null
                            ? s.raw('mfg.noRecipe')
                            : '${s.raw('mfg.batchCost')}: ${fmtRs(bomBatchMaterialCost(active, store.products) + active.labourCost + active.overheadCost)} · ${versions.length} v'),
                        trailing: canWrite
                            ? PopupMenuButton<String>(
                                onSelected: (v) {
                                  if (v == 'new') _editBom(context, active, null);
                                  if (v == 'history') _bomHistory(context, outId);
                                },
                                itemBuilder: (_) => [
                                  PopupMenuItem(value: 'new', child: Text(s.raw('mfg.newVersion'))),
                                  PopupMenuItem(value: 'history', child: Text(s.raw('mfg.history'))),
                                ],
                              )
                            : null,
                        onTap: () => _bomHistory(context, outId),
                      );
                    }),
                ],
              ),
      ),
    ]);

    final sel = _selected == null
        ? null
        : store.productionOrders.where((o) => o.id == _selected!.id).firstOrNull;
    final detail = sel == null
        ? Center(child: Text(s.raw('common.none')))
        : _ProductionDetail(order: sel, canWrite: canWrite);
    final wide = MediaQuery.of(context).size.width >= 900;
    if (wide) {
      return Row(children: [
        SizedBox(width: 420, child: listPane),
        const VerticalDivider(width: 1),
        Expanded(child: detail),
      ]);
    }
    return _selected == null || sel == null
        ? listPane
        : Column(children: [
            ListTile(
              leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => setState(() => _selected = null)),
              title: Text(sel.outputName),
            ),
            Expanded(child: detail),
          ]);
  }

  Future<void> _bomHistory(BuildContext context, String outputProductId) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    final versions = bomsForOutput(store.boms, outputProductId);
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(s.raw('mfg.history')),
        content: SizedBox(
          width: 460,
          child: SingleChildScrollView(
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(s.raw('mfg.immutableNote'), style: Theme.of(ctx).textTheme.bodySmall),
              const SizedBox(height: 8),
              for (final b in versions)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('v${b.version}${b.active ? ' · ${s.raw('mfg.activeBadge')}' : ''} · ${s.raw('mfg.form.batchSize')}: ${fmtQty(b.outputQty)}',
                        style: const TextStyle(fontWeight: FontWeight.w600)),
                    for (final l in b.lines) Text('  ${l.name} × ${fmtQty(l.qty)}'),
                    Text('  ${s.raw('mfg.ev.labour')}: ${fmtRs(b.labourCost)} · ${s.raw('mfg.ev.overhead')}: ${fmtRs(b.overheadCost)}'),
                  ]),
                ),
            ]),
          ),
        ),
        actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: Text(s.actionCancel))],
      ),
    );
  }

  Future<void> _editBom(BuildContext context, Bom? base, String? fixedOutputId) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    final goods = store.products.where((p) => !p.isRaw).toList();
    var outputId = base?.outputProductId ?? fixedOutputId ?? (goods.isEmpty ? null : goods.first.id);
    final batch = TextEditingController(text: fmtQty(base?.outputQty ?? 1));
    final labour = TextEditingController(text: fmtQty(base?.labourCost ?? 0));
    final overhead = TextEditingController(text: fmtQty(base?.overheadCost ?? 0));
    var picks = <PickLine>[
      if (base != null) for (final l in base.lines) PickLine(l.productId, l.qty),
    ];
    final bomDialogTitle =
        base == null ? s.raw('mfg.form.newTitle') : f3('mfg.form.versionTitle', {'name': base.outputName});
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          title: Text(bomDialogTitle),
          content: SizedBox(
            width: 540,
            child: SingleChildScrollView(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                DropdownButtonFormField<String>(
                  initialValue: outputId,
                  decoration: InputDecoration(labelText: s.raw('mfg.form.output')),
                  items: [for (final p in goods) DropdownMenuItem(value: p.id, child: Text(p.name))],
                  onChanged: (v) => setLocal(() => outputId = v),
                ),
                TextField(
                  controller: batch,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(labelText: s.raw('mfg.form.batchSize')),
                ),
                Row(children: [
                  Expanded(
                    child: TextField(
                      controller: labour,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(labelText: s.raw('mfg.form.labour')),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: overhead,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(labelText: s.raw('mfg.form.overhead')),
                    ),
                  ),
                ]),
                const SizedBox(height: 8),
                Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: Text(s.raw('mfg.form.components'), style: const TextStyle(fontWeight: FontWeight.w600)),
                ),
                PickLinesEditor(
                  products: store.products,
                  initial: picks,
                  onChanged: (v) => picks = v,
                  searchHintKey: 'mfg.form.noResults',
                ),
              ]),
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
            ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(s.raw('mfg.form.saveVersion'))),
          ],
        ),
      ),
    );
    if (saved != true || outputId == null) return;
    final ok = await store.saveBomVersion(
      outputProductId: outputId!,
      outputQty: double.tryParse(batch.text.trim()) ?? 0,
      lines: [for (final p in picks) (productId: p.productId, qty: p.qty)],
      labourCost: double.tryParse(labour.text.trim()) ?? 0,
      overheadCost: double.tryParse(overhead.text.trim()) ?? 0,
    );
    if (!ok && context.mounted) f3Notice(context, s.raw('mfg.err.generic'));
  }

  Future<void> _createOrder(BuildContext context) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    final withBom = store.products.where((p) => activeBomFor(store.boms, p.id) != null).toList();
    if (withBom.isEmpty) {
      f3Notice(context, s.raw('mfg.noRecipe'));
      return;
    }
    var outputId = withBom.first.id;
    var whId = store.defaultWarehouseId;
    final planned = TextEditingController(text: '10');
    var openNow = true;
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          title: Text(s.raw('mfg.po.form.title')),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            DropdownButtonFormField<String>(
              initialValue: outputId,
              decoration: InputDecoration(labelText: s.raw('mfg.po.form.recipe')),
              items: [for (final p in withBom) DropdownMenuItem(value: p.id, child: Text(p.name))],
              onChanged: (v) => setLocal(() => outputId = v ?? outputId),
            ),
            WarehouseDropdown(warehouses: store.warehouses, value: whId, onChanged: (v) => setLocal(() => whId = v ?? whId)),
            TextField(
              controller: planned,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(labelText: s.raw('mfg.po.form.plannedQty')),
            ),
            CheckboxListTile(
              value: openNow,
              onChanged: (v) => setLocal(() => openNow = v ?? true),
              title: Text(s.raw('mfg.po.open')),
              contentPadding: EdgeInsets.zero,
            ),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
            ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(s.raw('mfg.po.form.save'))),
          ],
        ),
      ),
    );
    if (saved != true) return;
    final qty = double.tryParse(planned.text.trim()) ?? 0;
    if (qty <= 0) {
      if (context.mounted) f3Notice(context, s.raw('mfg.po.err.badQty'));
      return;
    }
    await store.createProductionOrder(
        outputProductId: outputId, warehouseId: whId, plannedQty: qty, openNow: openNow);
  }
}

class _ProductionDetail extends StatelessWidget {
  final ProductionOrder order;
  final bool canWrite;
  const _ProductionDetail({required this.order, required this.canWrite});

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final produced = producedQty(order);
    final pool = poolOf(order);
    final unitCost = produced > 0 ? completedValue(order) / produced : null;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('${order.number ?? s.raw('mfg.po.draftLabel')} · ${order.outputName}',
            style: Theme.of(context).textTheme.titleMedium),
        Text(f3('mfg.po.snapshotNote', {'v': '${order.bomVersion}'}), style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: 8),
        StatLine(s.raw('mfg.po.planned'), fmtQty(order.plannedQty)),
        StatLine(s.raw('mfg.po.produced'), fmtQty(produced)),
        StatLine(s.raw('mfg.po.remaining'), fmtQty(order.plannedQty - produced > 0 ? order.plannedQty - produced : 0)),
        StatLine(s.raw('mfg.po.issuedTotal'), fmtRs(issuedValue(order))),
        StatLine(s.raw('mfg.po.completedTotal'), fmtRs(completedValue(order))),
        StatLine(s.raw('mfg.po.writtenOff'), fmtRs(writtenOffValue(order))),
        StatLine(s.raw('mfg.po.pool'), fmtRs(pool)),
        if (unitCost != null) StatLine(s.raw('mfg.po.unitCostNow'), fmtRs(unitCost)),
        const Divider(),
        Text(s.raw('mfg.print.components'), style: const TextStyle(fontWeight: FontWeight.w600)),
        for (final l in order.bomSnapshot.lines)
          Text('${l.name} × ${fmtQty(l.qty)} ${s.raw('mfg.perBatchSuffix')}'),
        const Divider(),
        if (canWrite)
          Wrap(spacing: 8, runSpacing: 8, children: [
            if (order.status == 'draft')
              ElevatedButton(onPressed: () => store.openProductionOrder(order), child: Text(s.raw('mfg.po.open'))),
            if (order.status == 'open') ...[
              ElevatedButton(onPressed: () => _issueDialog(context, order), child: Text(s.raw('mfg.po.issue'))),
              ElevatedButton(onPressed: () => _completeDialog(context, order), child: Text(s.raw('mfg.po.complete'))),
              OutlinedButton(onPressed: () => _scrapDialog(context, order), child: Text(s.raw('mfg.po.scrap'))),
              OutlinedButton(onPressed: () => _closeOrder(context, order), child: Text(s.raw('mfg.po.close'))),
            ],
            if (order.events.isEmpty && order.status != 'completed' && order.status != 'cancelled')
              TextButton(onPressed: () => store.cancelProductionOrder(order), child: Text(s.raw('mfg.po.cancel'))),
            if (order.status == 'draft')
              TextButton(onPressed: () => store.deleteProductionOrder(order), child: Text(s.raw('mfg.po.delete'))),
          ]),
        const SizedBox(height: 8),
        Text(s.raw('mfg.po.events'), style: const TextStyle(fontWeight: FontWeight.w600)),
        if (order.events.isEmpty) Text(s.raw('mfg.po.noEvents')),
        for (final e in order.events.reversed)
          ListTile(
            dense: true,
            title: Text(s.raw('mfg.ev.${e.kind == 'closeout' ? 'closeout' : e.kind}')),
            subtitle: Text([
              if (e.qty > 0) fmtQty(e.qty),
              if (e.lines != null) for (final l in e.lines!) '${l.name} × ${fmtQty(l.qty)}',
              if (e.labourCost != null) '${s.raw('mfg.ev.labour')}: ${fmtRs(e.labourCost!)}',
              if (e.overheadCost != null) '${s.raw('mfg.ev.overhead')}: ${fmtRs(e.overheadCost!)}',
              if (e.paidFromAccountId == 'accrue') s.raw('mfg.ev.accrued'),
              if (e.paidFromAccountId != null && e.paidFromAccountId != 'accrue')
                f3('mfg.ev.paidFrom', {'name': store.accounts.where((a) => a.id == e.paidFromAccountId).firstOrNull?.name ?? ''}),
            ].join(' · ')),
            trailing: Text(fmtRs(e.value)),
          ),
      ]),
    );
  }

  Future<void> _issueDialog(BuildContext context, ProductionOrder order) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    final runQty = TextEditingController(text: fmtQty(remainingPlannedQty(order) > 0 ? remainingPlannedQty(order) : order.plannedQty));
    final labour = TextEditingController();
    final overhead = TextEditingController();
    var picks = <PickLine>[];
    var settlement = 'paid';
    String? accountId = store.accounts.where((a) => !a.archived).firstOrNull?.id;
    void seed(double run) {
      picks = [for (final l in defaultIssueLines(order, run)) PickLine(l.productId, l.qty)];
      final conv = defaultIssueConversion(order, run);
      labour.text = fmtQty(conv.labourCost);
      overhead.text = fmtQty(conv.overheadCost);
    }

    seed(double.tryParse(runQty.text) ?? order.plannedQty);
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) {
          final materials = picks.fold<double>(
              0, (a, p) => a + p.qty * (store.productsById[p.productId]?.costPrice ?? 0));
          final total = materials + (double.tryParse(labour.text) ?? 0) + (double.tryParse(overhead.text) ?? 0);
          return AlertDialog(
            title: Text(f3('mfg.issue.title', {'name': order.outputName})),
            content: SizedBox(
              width: 540,
              child: SingleChildScrollView(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  TextField(
                    controller: runQty,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: InputDecoration(labelText: s.raw('mfg.issue.runQty')),
                    onChanged: (v) => setLocal(() => seed(double.tryParse(v) ?? 0)),
                  ),
                  Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: Text(s.raw('mfg.issue.components'), style: const TextStyle(fontWeight: FontWeight.w600)),
                  ),
                  PickLinesEditor(
                    products: store.products,
                    initial: picks,
                    onChanged: (v) => setLocal(() => picks = v),
                    searchHintKey: 'mfg.form.noResults',
                    hintFor: (p) => f3('mfg.issue.atWarehouse', {
                      'qty': fmtQty(store.qtyAtWh(p, order.warehouseId)),
                      'unit': p.unit,
                    }),
                  ),
                  Row(children: [
                    Expanded(
                      child: TextField(
                        controller: labour,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: InputDecoration(labelText: s.raw('mfg.issue.labour')),
                        onChanged: (_) => setLocal(() {}),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: overhead,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: InputDecoration(labelText: s.raw('mfg.issue.overhead')),
                        onChanged: (_) => setLocal(() {}),
                      ),
                    ),
                  ]),
                  const SizedBox(height: 8),
                  Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: Text(s.raw('mfg.issue.settlement'), style: const TextStyle(fontWeight: FontWeight.w600)),
                  ),
                  RadioGroup<String>(
                    groupValue: settlement,
                    onChanged: (v) => setLocal(() => settlement = v ?? 'paid'),
                    child: Column(children: [
                      RadioListTile<String>(value: 'paid', title: Text(s.raw('mfg.issue.paidNow')), dense: true),
                      RadioListTile<String>(value: 'accrue', title: Text(s.raw('mfg.issue.accrue')), dense: true),
                    ]),
                  ),
                  if (settlement == 'paid')
                    AccountDropdown(accounts: store.accounts, value: accountId, onChanged: (v) => setLocal(() => accountId = v)),
                  const Divider(),
                  StatLine(s.raw('mfg.issue.materialsValue'), fmtRs(materials)),
                  StatLine(s.raw('mfg.issue.totalValue'), fmtRs(total)),
                ]),
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
              ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(s.raw('mfg.issue.submit'))),
            ],
          );
        },
      ),
    );
    if (saved != true) return;
    final ok = await store.issueProductionMaterials(
      order,
      IssueInput(
        runQty: double.tryParse(runQty.text.trim()) ?? 0,
        lines: [for (final p in picks) (productId: p.productId, qty: p.qty)],
        labourCost: double.tryParse(labour.text.trim()) ?? 0,
        overheadCost: double.tryParse(overhead.text.trim()) ?? 0,
        settlement: settlement,
        paidFromAccountId: accountId,
      ),
    );
    if (!ok && context.mounted) f3Notice(context, s.raw('mfg.po.err.generic'));
  }

  Future<void> _completeDialog(BuildContext context, ProductionOrder order) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    final qtyCtrl = TextEditingController(text: fmtQty(remainingPlannedQty(order)));
    var isFinal = remainingPlannedQty(order) > 0 ? false : true;
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) {
          final qty = double.tryParse(qtyCtrl.text.trim()) ?? 0;
          final abs = completionAbsorb(order, qty, isFinal);
          return AlertDialog(
            title: Text(f3('mfg.complete.title', {'name': order.outputName})),
            content: Column(mainAxisSize: MainAxisSize.min, children: [
              TextField(
                controller: qtyCtrl,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: InputDecoration(labelText: s.raw('mfg.complete.qty')),
                onChanged: (_) => setLocal(() {}),
              ),
              CheckboxListTile(
                value: isFinal,
                onChanged: (v) => setLocal(() => isFinal = v ?? false),
                title: Text(s.raw('mfg.complete.final')),
                contentPadding: EdgeInsets.zero,
              ),
              if (abs.value != null) ...[
                StatLine(s.raw('mfg.complete.value'), fmtRs(abs.value!)),
                StatLine(s.raw('mfg.complete.unitCost'), fmtRs(abs.unitCost ?? 0)),
              ],
              if (abs.problem != null)
                Text(s.raw('mfg.po.err.generic'), style: TextStyle(color: Theme.of(ctx).colorScheme.error)),
            ]),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
              ElevatedButton(
                onPressed: abs.value == null ? null : () => Navigator.pop(ctx, true),
                child: Text(s.raw('mfg.complete.submit')),
              ),
            ],
          );
        },
      ),
    );
    if (saved != true) return;
    final qty = double.tryParse(qtyCtrl.text.trim()) ?? 0;
    final ok = await store.completeProduction(order, qty, finalCompletion: isFinal);
    if (!ok && context.mounted) f3Notice(context, s.raw('mfg.po.err.generic'));
  }

  Future<void> _scrapDialog(BuildContext context, ProductionOrder order) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    final qtyCtrl = TextEditingController(text: '1');
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) {
          final qty = double.tryParse(qtyCtrl.text.trim()) ?? 0;
          final abs = scrapAbsorb(order, qty);
          return AlertDialog(
            title: Text(f3('mfg.scrap.title', {'name': order.outputName})),
            content: Column(mainAxisSize: MainAxisSize.min, children: [
              TextField(
                controller: qtyCtrl,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: InputDecoration(labelText: s.raw('mfg.scrap.qty')),
                onChanged: (_) => setLocal(() {}),
              ),
              if (abs.value != null) StatLine(s.raw('mfg.scrap.value'), fmtRs(abs.value!)),
            ]),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
              ElevatedButton(
                onPressed: abs.value == null ? null : () => Navigator.pop(ctx, true),
                child: Text(s.raw('mfg.scrap.submit')),
              ),
            ],
          );
        },
      ),
    );
    if (saved != true) return;
    final ok = await store.scrapProduction(order, double.tryParse(qtyCtrl.text.trim()) ?? 0);
    if (!ok && context.mounted) f3Notice(context, s.raw('mfg.po.err.generic'));
  }

  Future<void> _closeOrder(BuildContext context, ProductionOrder order) async {
    final s = S.current;
    final store = context.read<ShopStore>();
    final pool = poolOf(order);
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(s.raw('mfg.po.close')),
        content: Text(pool > 0 ? f3('mfg.close.confirm', {'amount': fmtRs(pool)}) : s.raw('mfg.close.confirmEmpty')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(s.raw('mfg.close.submit'))),
        ],
      ),
    );
    if (ok == true) await store.closeProductionOrder(order);
  }
}

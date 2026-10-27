/// Inventory (design §5, F1 row): search the shelf, add/edit
/// products, adjust stock through the guarded adjustment composer
/// (the applied delta clamps to the shelf — F-11), and CSV import
/// for a first shelf load. Full warehouse views are F3; this screen
/// reads the default warehouse's levels via the store.
import 'dart:convert';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../app_state.dart';
import '../core/ledger.dart' show newId;
import '../core/search.dart';
import '../core/types.dart';
import '../data/store.dart';
import '../l10n/app_strings.dart';
import '../main.dart' show fmtRs;
import 'f3_common.dart' show WarehouseDropdown;

class InventoryScreen extends StatefulWidget {
  const InventoryScreen({super.key});
  @override
  State<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen> {
  final _query = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final tokens = context.watch<AppState>().tokens;
    final list = filterProducts(store.products.toList(), _query.text, includeCategory: true);
    return Column(children: [
      Padding(
        padding: const EdgeInsets.all(12),
        child: Row(children: [
          Expanded(
            child: TextField(
              controller: _query,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(prefixIcon: const Icon(Icons.search), hintText: s.actionSearch),
            ),
          ),
          const SizedBox(width: 8),
          OutlinedButton.icon(onPressed: () => _importCsv(context), icon: const Icon(Icons.upload_file_outlined, size: 18), label: Text(s.raw('inv.importCsv'))),
          const SizedBox(width: 8),
          ElevatedButton.icon(onPressed: () => _editProduct(context, null), icon: const Icon(Icons.add, size: 18), label: Text(s.raw('inv.addProduct'))),
        ]),
      ),
      Expanded(
        child: ListView.separated(
          itemCount: list.length,
          separatorBuilder: (_, __) => const Divider(height: 1),
          itemBuilder: (ctx, i) {
            final p = list[i];
            final low = p.stockQty <= p.reorderLevel;
            return ListTile(
              title: Row(children: [
                Flexible(child: Text(p.name)),
                if (p.isRaw) ...[
                  const SizedBox(width: 8),
                  Chip(label: Text(s.raw('inv.rawBadge')), visualDensity: VisualDensity.compact),
                ],
              ]),
              subtitle: Text('${p.id} · ${p.sku} · ${p.category} · ${fmtRs(p.costPrice)} / ${fmtRs(p.salePrice)}'),
              trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                Text('${p.stockQty}', style: TextStyle(fontWeight: FontWeight.w600, color: low ? tokens.danger : null)),
                IconButton(icon: const Icon(Icons.tune_outlined, size: 19), tooltip: s.raw('inv.adjustTitle'), onPressed: () => _adjust(context, p)),
                IconButton(icon: const Icon(Icons.edit_outlined, size: 19), onPressed: () => _editProduct(context, p)),
              ]),
            );
          },
        ),
      ),
    ]);
  }

  Future<void> _editProduct(BuildContext context, Product? existing) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    final name = TextEditingController(text: existing?.name ?? '');
    final urdu = TextEditingController(text: existing?.urduName ?? '');
    final sku = TextEditingController(text: existing?.sku ?? '');
    final category = TextEditingController(text: existing?.category ?? '');
    final cost = TextEditingController(text: existing?.costPrice.toString() ?? '');
    final sale = TextEditingController(text: existing?.salePrice.toString() ?? '');
    final stock = TextEditingController(text: existing?.stockQty.toString() ?? '0');
    // F3 (§3.1): the stock class. On an existing product a change
    // posts the reclass entry via store.changeProductClass —
    // the plain save below must therefore write the NEW class
    // only after that action ran (it writes the class itself).
    var stockClass = existing?.stockClass ?? 'goods';
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
        title: Text(existing == null ? s.raw('inv.addProduct') : s.actionEdit),
        content: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(controller: name, decoration: InputDecoration(labelText: s.raw('inv.name'))),
            TextField(controller: urdu, decoration: InputDecoration(labelText: s.raw('inv.urduName'))),
            TextField(controller: sku, decoration: const InputDecoration(labelText: 'SKU')),
            TextField(controller: category, decoration: InputDecoration(labelText: s.raw('inv.category'))),
            TextField(controller: cost, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: s.raw('inv.costPrice'))),
            TextField(controller: sale, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: s.raw('inv.salePrice'))),
            DropdownButtonFormField<String>(
              initialValue: stockClass,
              decoration: InputDecoration(labelText: s.raw('inv.form.class')),
              items: [
                DropdownMenuItem(value: 'goods', child: Text(s.raw('inv.class.goods'))),
                DropdownMenuItem(value: 'raw', child: Text(s.raw('inv.class.raw'))),
              ],
              onChanged: (v) => setLocal(() => stockClass = v ?? 'goods'),
            ),
            Text(s.raw('inv.form.classHint'), style: Theme.of(ctx).textTheme.bodySmall),
            if (existing != null && stockClass != (existing.stockClass ?? 'goods'))
              Text(
                s.raw('inv.form.classReclassNote').replaceAll('{amount}', fmtRs(existing.stockQty * existing.costPrice)),
                style: Theme.of(ctx).textTheme.bodySmall,
              ),
            if (existing == null)
              TextField(controller: stock, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: s.raw('inv.stock'))),
          ]),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(s.actionSave)),
        ],
        ),
      ),
    );
    if (saved != true || name.text.trim().isEmpty) return;
    // A class change on an existing product posts its reclass
    // entry FIRST (valued at the pre-edit on-hand × cost); the
    // plain save then carries the new class with the other
    // fields. A refused reclass (period lock) leaves the class
    // untouched — never a silent class write.
    var classForSave = existing?.stockClass;
    if (existing != null && stockClass != (existing.stockClass ?? 'goods')) {
      final ok = await store.changeProductClass(existing, stockClass);
      if (!ok) return;
      classForSave = stockClass == 'raw' ? 'raw' : null;
    }
    final p = Product(
      id: existing?.id ?? newId('p'),
      name: name.text.trim(),
      urduName: urdu.text.trim(),
      sku: sku.text.trim(),
      category: category.text.trim(),
      costPrice: double.tryParse(cost.text) ?? 0,
      salePrice: double.tryParse(sale.text) ?? 0,
      stockQty: existing?.stockQty ?? (double.tryParse(stock.text) ?? 0),
      reorderLevel: existing?.reorderLevel ?? 5,
      stockClass: existing == null ? (stockClass == 'raw' ? 'raw' : null) : classForSave,
    );
    await store.saveProduct(p, isNew: existing == null);
  }

  Future<void> _adjust(BuildContext context, Product p) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    final delta = TextEditingController();
    final note = TextEditingController();
    var reason = 'damage';
    // F3 (§1.5): the adjustment lands at a chosen warehouse.
    var whId = store.defaultWarehouseId;
    final go = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
        title: Text('${s.raw('inv.adjustTitle')} — ${p.name}'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          DropdownButtonFormField<String>(
            initialValue: reason,
            items: const [
              DropdownMenuItem(value: 'damage', child: Text('damage')),
              DropdownMenuItem(value: 'correction', child: Text('correction')),
              DropdownMenuItem(value: 'found', child: Text('found')),
              DropdownMenuItem(value: 'theft', child: Text('theft')),
            ],
            onChanged: (v) => reason = v ?? 'damage',
          ),
          WarehouseDropdown(
            warehouses: store.warehouses,
            value: whId,
            onChanged: (v) => setLocal(() => whId = v ?? whId),
          ),
          TextField(controller: delta, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: s.raw('inv.adjust.delta'))),
          TextField(controller: note, decoration: InputDecoration(labelText: s.raw('common.note'))),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(s.actionSave)),
        ],
        ),
      ),
    );
    if (go != true) return;
    final d = double.tryParse(delta.text.trim()) ?? 0;
    if (d != 0) await store.adjustStock(p, d, reason, note.text.trim(), warehouseId: whId);
  }

  Future<void> _importCsv(BuildContext context) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    final picked = await FilePicker.platform.pickFiles(type: FileType.custom, allowedExtensions: ['csv'], withData: true);
    final bytes = picked?.files.single.bytes;
    if (bytes == null) return;
    final lines = const LineSplitter().convert(utf8.decode(bytes));
    var added = 0, skipped = 0;
    for (final line in lines.skip(1)) {
      final cells = line.split(',').map((c) => c.trim()).toList();
      if (cells.length < 4 || cells[0].isEmpty) {
        skipped++;
        continue;
      }
      // name, sku, cost, sale, [stock]
      final p = Product(
        id: newId('p'),
        name: cells[0],
        sku: cells.length > 1 ? cells[1] : '',
        costPrice: double.tryParse(cells[2]) ?? 0,
        salePrice: double.tryParse(cells[3]) ?? 0,
        stockQty: cells.length > 4 ? (double.tryParse(cells[4]) ?? 0) : 0,
      );
      await store.saveProduct(p, isNew: true);
      added++;
    }
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('${s.raw('inv.import.done').replaceAll('{count}', '$added')}'
            '${skipped > 0 ? ' · ${s.raw('inv.import.doneSkipped').replaceAll('{count}', '$skipped')}' : ''}'),
      ));
    }
  }
}

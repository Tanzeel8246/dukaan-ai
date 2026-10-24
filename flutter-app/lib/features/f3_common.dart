/// Shared F3 building blocks: placeholder filling in the house
/// style, a notice snackbar, a warehouse dropdown, and the
/// product pick-lines editor (type → tap/Enter adds the line —
/// the owner's POS-style rule; never search→dropdown→Add).
import 'package:flutter/material.dart';

import '../core/ledger.dart';
import '../core/search.dart';
import '../core/types.dart';
import '../l10n/app_strings.dart';

String f3(String key, [Map<String, String> params = const {}]) {
  var out = S.current.raw(key);
  params.forEach((k, v) => out = out.replaceAll('{$k}', v));
  return out;
}

void f3Notice(BuildContext context, String text) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
}

/// Active-warehouse dropdown (archived warehouses never take
/// new movements — §1.2/§2.1).
class WarehouseDropdown extends StatelessWidget {
  final List<Warehouse> warehouses;
  final String? value;
  final ValueChanged<String?> onChanged;
  final String? label;
  const WarehouseDropdown({
    super.key,
    required this.warehouses,
    required this.value,
    required this.onChanged,
    this.label,
  });

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final active = warehouses.where((w) => !w.archived).toList();
    final current = active.any((w) => w.id == value) ? value : (active.isEmpty ? null : active.first.id);
    return DropdownButtonFormField<String>(
      initialValue: current,
      decoration: InputDecoration(labelText: label ?? s.raw('wh.pickerLabel')),
      items: [
        for (final w in active)
          DropdownMenuItem(
            value: w.id,
            child: Text(w.isDefault ? '${w.name} ${s.raw('wh.pickerDefaultSuffix')}' : w.name),
          ),
      ],
      onChanged: onChanged,
    );
  }
}

/// One editable pick line.
class PickLine {
  String productId;
  double qty;
  PickLine(this.productId, this.qty);
}

/// The pick-lines editor: a search field whose results add a
/// line on tap (or Enter for the first match), then per-line
/// quantity fields. [hintFor] renders a per-product hint (stock
/// at a warehouse, net held by a job…); [initialQtyFor] seeds a
/// newly added line's quantity.
class PickLinesEditor extends StatefulWidget {
  final List<Product> products;
  final List<PickLine> initial;
  final ValueChanged<List<PickLine>> onChanged;
  final String searchHintKey;
  final String Function(Product p)? hintFor;
  final double Function(Product p)? initialQtyFor;
  final bool Function(Product p)? includeProduct;
  const PickLinesEditor({
    super.key,
    required this.products,
    required this.initial,
    required this.onChanged,
    this.searchHintKey = 'tr.lines.searchPh',
    this.hintFor,
    this.initialQtyFor,
    this.includeProduct,
  });

  @override
  State<PickLinesEditor> createState() => _PickLinesEditorState();
}

class _PickLinesEditorState extends State<PickLinesEditor> {
  late List<PickLine> _lines;
  final _search = TextEditingController();
  String _query = '';

  @override
  void initState() {
    super.initState();
    _lines = [for (final l in widget.initial) PickLine(l.productId, l.qty)];
  }

  void _emit() => widget.onChanged([for (final l in _lines) PickLine(l.productId, l.qty)]);

  void _add(Product p) {
    final existing = _lines.where((l) => l.productId == p.id).firstOrNull;
    setState(() {
      if (existing != null) {
        existing.qty += 1;
      } else {
        _lines.add(PickLine(p.id, widget.initialQtyFor?.call(p) ?? 1));
      }
      _search.clear();
      _query = '';
    });
    _emit();
  }

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final pool = widget.products
        .where((p) => widget.includeProduct?.call(p) ?? true)
        .where((p) => !_lines.any((l) => l.productId == p.id) || true)
        .toList();
    final results = _query.trim().isEmpty
        ? const <Product>[]
        : pool.where((p) => matchesAny(_query, [p.name, p.urduName, p.sku])).take(6).toList();
    final byId = {for (final p in widget.products) p.id: p};
    return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      TextField(
        controller: _search,
        onChanged: (v) => setState(() => _query = v),
        onSubmitted: (_) {
          if (results.isNotEmpty) _add(results.first);
        },
        decoration: InputDecoration(
          prefixIcon: const Icon(Icons.search),
          hintText: f3(widget.searchHintKey, {'query': ''}),
        ),
      ),
      if (results.isNotEmpty)
        Container(
          constraints: const BoxConstraints(maxHeight: 180),
          child: ListView(
            shrinkWrap: true,
            children: [
              for (final p in results)
                ListTile(
                  dense: true,
                  title: Text(p.name),
                  subtitle: widget.hintFor == null ? null : Text(widget.hintFor!(p)),
                  trailing: const Icon(Icons.add_circle_outline, size: 18),
                  onTap: () => _add(p),
                ),
            ],
          ),
        ),
      const SizedBox(height: 8),
      for (var i = 0; i < _lines.length; i++)
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 2),
          child: Row(children: [
            Expanded(child: Text(byId[_lines[i].productId]?.name ?? _lines[i].productId)),
            if (widget.hintFor != null && byId[_lines[i].productId] != null)
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: Text(widget.hintFor!(byId[_lines[i].productId]!),
                    style: Theme.of(context).textTheme.bodySmall),
              ),
            SizedBox(
              width: 90,
              child: TextFormField(
                initialValue: fmtQty(_lines[i].qty),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: InputDecoration(labelText: s.raw('job.mat.qty'), isDense: true),
                onChanged: (v) {
                  _lines[i].qty = double.tryParse(v.trim()) ?? 0;
                  _emit();
                },
              ),
            ),
            IconButton(
              icon: const Icon(Icons.close, size: 18),
              onPressed: () {
                setState(() => _lines.removeAt(i));
                _emit();
              },
            ),
          ]),
        ),
    ]);
  }
}

/// A labelled quantity/value stat row used by the F3 detail
/// panes.
class StatLine extends StatelessWidget {
  final String label;
  final String value;
  const StatLine(this.label, this.value, {super.key});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(children: [
          Expanded(child: Text(label, style: Theme.of(context).textTheme.bodyMedium)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ]),
      );
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/store_provider.dart';
import '../widgets/product_tile.dart';

/// Dukaan AI — inventory list with search + per-row stock stepper.
class InventoryScreen extends StatefulWidget {
  const InventoryScreen({super.key});

  @override
  State<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen> {
  String _query = '';
  bool _lowOnly = false;

  @override
  Widget build(BuildContext context) {
    final store = context.watch<StoreProvider>();
    if (!store.ready) {
      return const Center(child: CircularProgressIndicator());
    }
    final q = _query.trim().toLowerCase();
    var list = store.products;
    if (_lowOnly) list = list.where((p) => p.isLowStock).toList();
    if (q.isNotEmpty) {
      list = list
          .where((p) =>
              p.name.toLowerCase().contains(q) ||
              p.urduName.contains(_query.trim()) ||
              p.sku.toLowerCase().contains(q))
          .toList();
    }
    // Worst stock health first.
    list = [...list]
      ..sort((a, b) => (a.stockQty / (a.reorderLevel == 0 ? 1 : a.reorderLevel))
          .compareTo(b.stockQty / (b.reorderLevel == 0 ? 1 : b.reorderLevel)));

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: TextField(
            decoration: const InputDecoration(
              prefixIcon: Icon(Icons.search),
              hintText: 'Search name, SKU…',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.all(Radius.circular(28)),
              ),
              contentPadding: EdgeInsets.symmetric(vertical: 0),
            ),
            onChanged: (v) => setState(() => _query = v),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              FilterChip(
                label: Text('Low stock only (${store.lowStock.length})'),
                selected: _lowOnly,
                onSelected: (v) => setState(() => _lowOnly = v),
              ),
              const Spacer(),
              Text('${list.length} items',
                  style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
        ),
        Expanded(
          child: list.isEmpty
              ? const Center(child: Text('No products match.'))
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                  itemCount: list.length,
                  itemBuilder: (context, i) {
                    final p = list[i];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: ProductTile(
                        product: p,
                        onAdjust: (delta) => store.adjustStock(p.id, delta),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

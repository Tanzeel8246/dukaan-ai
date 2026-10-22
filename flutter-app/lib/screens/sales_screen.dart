import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../models/product.dart';
import '../providers/store_provider.dart';

final _pkr = NumberFormat('#,##0', 'en_PK');

/// Dukaan AI — record a sale (works fully offline; queued and synced later).
class SalesScreen extends StatefulWidget {
  const SalesScreen({super.key});

  @override
  State<SalesScreen> createState() => _SalesScreenState();
}

class _SalesScreenState extends State<SalesScreen> {
  Product? _selected;
  int _qty = 1;
  String? _notice;
  bool _noticeOk = true;

  Future<void> _submit() async {
    final store = context.read<StoreProvider>();
    final p = _selected;
    if (p == null) {
      setState(() {
        _notice = 'Please choose a product first.';
        _noticeOk = false;
      });
      return;
    }
    final ok = await store.recordSale(p.id, _qty);
    setState(() {
      if (ok) {
        _notice =
            'Recorded: $_qty × ${p.name} = Rs ${_pkr.format(_qty * p.salePrice)}. ${store.sync.available ? "Will sync." : "Saved offline."}';
        _noticeOk = true;
        _qty = 1;
      } else {
        _notice = 'Not enough stock (only ${p.stockQty} ${p.unit} available).';
        _noticeOk = false;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final store = context.watch<StoreProvider>();
    if (!store.ready) {
      return const Center(child: CircularProgressIndicator());
    }
    final today = store.salesOnDay(0);
    final byId = {for (final p in store.products) p.id: p};

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Record a sale',
            style: Theme.of(context)
                .textTheme
                .headlineSmall
                ?.copyWith(fontWeight: FontWeight.w800)),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                DropdownButtonFormField<Product>(
                  initialValue: _selected,
                  decoration: const InputDecoration(
                    labelText: 'Product',
                    border: OutlineInputBorder(),
                  ),
                  items: [
                    for (final p in store.products)
                      DropdownMenuItem(
                        value: p,
                        enabled: p.stockQty > 0,
                        child: Text(
                          '${p.name} — Rs ${_pkr.format(p.salePrice)} (${p.stockQty} left)',
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                  ],
                  onChanged: (p) => setState(() {
                    _selected = p;
                    _qty = 1;
                    _notice = null;
                  }),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    const Text('Quantity',
                        style: TextStyle(fontWeight: FontWeight.w600)),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.remove_circle_outline),
                      onPressed: _qty > 1
                          ? () => setState(() => _qty--)
                          : null,
                    ),
                    Text('$_qty',
                        style: Theme.of(context)
                            .textTheme
                            .titleLarge
                            ?.copyWith(fontWeight: FontWeight.w800)),
                    IconButton(
                      icon: const Icon(Icons.add_circle_outline),
                      onPressed: () => setState(() => _qty++),
                    ),
                  ],
                ),
                if (_selected != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(
                      'Total: Rs ${_pkr.format(_qty * _selected!.salePrice)}',
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.w800),
                    ),
                  ),
                if (_notice != null)
                  Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: (_noticeOk ? Colors.green : Colors.red)
                          .withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(_notice!,
                        style: TextStyle(
                            color: _noticeOk
                                ? Colors.green.shade800
                                : Colors.red.shade800)),
                  ),
                FilledButton.icon(
                  onPressed: _selected == null ? null : _submit,
                  icon: const Icon(Icons.point_of_sale_outlined),
                  label: const Text('Record sale'),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("Today's counter",
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 24,
                  children: [
                    _stat(context, 'Rs ${_pkr.format(store.revenueOnDay(0))}',
                        'Revenue'),
                    _stat(context, '${store.unitsOnDay(0)}', 'Items sold'),
                    _stat(context,
                        'Rs ${_pkr.format(store.profitOnDay(0))}', 'Profit'),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        for (final s in today)
          Card(
            child: ListTile(
              title: Text(byId[s.productId]?.name ?? 'Unknown product',
                  style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text(
                  '${s.qty} × Rs ${_pkr.format(s.unitPrice)}${s.synced ? '' : ' · queued'}'),
              trailing: Text('Rs ${_pkr.format(s.total)}',
                  style: const TextStyle(fontWeight: FontWeight.w800)),
            ),
          ),
        if (today.isEmpty)
          const Padding(
            padding: EdgeInsets.all(24),
            child: Center(child: Text('No sales recorded today yet.')),
          ),
      ],
    );
  }

  Widget _stat(BuildContext context, String value, String label) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value,
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.w800)),
          Text(label, style: Theme.of(context).textTheme.bodySmall),
        ],
      );
}

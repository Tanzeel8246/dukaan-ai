import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../providers/store_provider.dart';

final _pkr = NumberFormat('#,##0', 'en_PK');

/// Dukaan AI — low-stock alerts with reorder suggestions
/// (7-day moving average, same math as the web app).
class AlertsScreen extends StatelessWidget {
  const AlertsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final store = context.watch<StoreProvider>();
    if (!store.ready) {
      return const Center(child: CircularProgressIndicator());
    }
    final rows = store.products
        .map((p) => (
              product: p,
              avg: store.avgDailySales(p.id),
              days: store.daysOfStock(p),
              reorder: store.suggestedReorder(p),
            ))
        .where((r) => r.product.isLowStock || r.reorder > 0)
        .toList()
      ..sort((a, b) => a.days.compareTo(b.days));

    final reorderCost = rows.fold<double>(
        0, (s, r) => s + r.reorder * r.product.costPrice);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Low-stock alerts',
            style: Theme.of(context)
                .textTheme
                .headlineSmall
                ?.copyWith(fontWeight: FontWeight.w800)),
        const SizedBox(height: 4),
        Text(
          rows.isEmpty
              ? 'All stock healthy — nothing to reorder.'
              : '${rows.length} items need attention · est. cost Rs ${_pkr.format(reorderCost)}',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant),
        ),
        const SizedBox(height: 12),
        for (final r in rows)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(r.product.name,
                            style: const TextStyle(
                                fontWeight: FontWeight.w700, fontSize: 16)),
                      ),
                      Chip(
                        label: Text(
                          r.product.isCritical ? 'Critical' : 'Low',
                          style: const TextStyle(fontSize: 11),
                        ),
                        backgroundColor:
                            (r.product.isCritical ? Colors.red : Colors.amber)
                                .withValues(alpha: 0.15),
                        side: BorderSide.none,
                        visualDensity: VisualDensity.compact,
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '${r.product.stockQty} ${r.product.unit} left'
                    '${r.avg > 0 ? ' · sells ~${r.avg.toStringAsFixed(1)}/day · lasts ~${r.days.floor()} days' : ' · no recent sales'}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 8),
                  LinearProgressIndicator(
                    value: r.days.isInfinite
                        ? 1.0
                        : (r.days / 14).clamp(0.05, 1.0),
                    backgroundColor: Theme.of(context)
                        .colorScheme
                        .surfaceContainerHighest,
                    color: r.product.isCritical
                        ? Colors.red
                        : Colors.amber.shade800,
                    minHeight: 8,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  if (r.reorder > 0)
                    Padding(
                      padding: const EdgeInsets.only(top: 10),
                      child: Row(
                        children: [
                          const Icon(Icons.local_shipping_outlined, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Order ${r.reorder} ${r.product.unit} '
                              '(~Rs ${_pkr.format(r.reorder * r.product.costPrice)})',
                              style: const TextStyle(
                                  fontWeight: FontWeight.w700),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

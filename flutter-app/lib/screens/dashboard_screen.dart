import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../providers/store_provider.dart';
import '../widgets/kpi_card.dart';

final _pkr = NumberFormat('#,##0', 'en_PK');

/// Dukaan AI — dashboard: KPIs, 7-day revenue bars, low-stock preview.
class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final store = context.watch<StoreProvider>();
    if (!store.ready) {
      return const Center(child: CircularProgressIndicator());
    }
    final low = store.lowStock;
    final bars = List.generate(7, (i) {
      final d = 6 - i;
      final date = DateTime.now().subtract(Duration(days: d));
      return (
        label: d == 0 ? 'Today' : DateFormat('EEE').format(date),
        revenue: store.revenueOnDay(d),
      );
    });
    final maxRev = bars.fold<double>(1, (m, b) => b.revenue > m ? b.revenue : m);

    return RefreshIndicator(
      onRefresh: () => store.sync.syncNow(),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Assalam-o-Alaikum!',
              style: Theme.of(context)
                  .textTheme
                  .headlineSmall
                  ?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text('Your dukaan at a glance.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant)),
          const SizedBox(height: 16),
          KpiCard(
            icon: Icons.inventory_2_outlined,
            color: Colors.brown,
            label: 'STOCK VALUE (COST)',
            value: 'Rs ${_pkr.format(store.stockValue)}',
            sub: '${store.products.length} products on shelf',
          ),
          KpiCard(
            icon: Icons.warning_amber_outlined,
            color: Colors.amber.shade800,
            label: 'LOW-STOCK ALERTS',
            value: '${low.length}',
            sub: low.isEmpty ? 'all healthy' : 'need reorder soon',
          ),
          KpiCard(
            icon: Icons.payments_outlined,
            color: Colors.green.shade700,
            label: "TODAY'S SALES",
            value: 'Rs ${_pkr.format(store.revenueOnDay(0))}',
            sub: '${store.unitsOnDay(0)} items sold',
          ),
          KpiCard(
            icon: Icons.trending_up_outlined,
            color: Colors.green.shade700,
            label: "TODAY'S PROFIT",
            value: 'Rs ${_pkr.format(store.profitOnDay(0))}',
            sub: 'gross margin',
          ),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Last 7 days revenue',
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 150,
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        for (final b in bars)
                          Expanded(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                Text('${_pkr.format(b.revenue / 1000)}k',
                                    style: Theme.of(context).textTheme.labelSmall),
                                const SizedBox(height: 4),
                                Container(
                                  height: 90 * (b.revenue / maxRev) + 4,
                                  margin: const EdgeInsets.symmetric(horizontal: 6),
                                  decoration: BoxDecoration(
                                    color: b.label == 'Today'
                                        ? Colors.amber.shade700
                                        : Colors.green.shade700
                                            .withValues(alpha: 0.85),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Text(b.label,
                                    style:
                                        Theme.of(context).textTheme.labelSmall),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Running low',
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  if (low.isEmpty)
                    const Text('Nothing below reorder level. Shelf is healthy.'),
                  for (final p in low.take(5))
                    ListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      leading: Icon(Icons.warning_amber,
                          color: Colors.amber.shade800, size: 20),
                      title: Text(p.name,
                          style: const TextStyle(fontWeight: FontWeight.w600)),
                      trailing: Text('${p.stockQty} ${p.unit} left'),
                    ),
                ],
              ),
            ),
          ),
          if (!store.sync.available)
            const Padding(
              padding: EdgeInsets.only(top: 8),
              child: Text(
                'Offline demo mode — add Firebase config to enable cloud sync.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ),
        ],
      ),
    );
  }
}

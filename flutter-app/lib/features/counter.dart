/// Sales counter (design §5): quick single-product cash sales. The
/// picker is the billing desk's utility — search narrows, one tap
/// sells at the default till from the default warehouse, with the
/// sale's entry composed by the fixture-proven counter composer.
/// Quantity-first flow: the qty stepper sets the amount the next
/// tap sells.
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../app_state.dart';
import '../core/search.dart';
import '../data/store.dart';
import '../l10n/app_strings.dart';
import '../main.dart' show fmtRs;

class CounterScreen extends StatefulWidget {
  const CounterScreen({super.key});
  @override
  State<CounterScreen> createState() => _CounterScreenState();
}

class _CounterScreenState extends State<CounterScreen> {
  final _query = TextEditingController();
  double _qty = 1;

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final tokens = context.watch<AppState>().tokens;
    final list = filterProducts(store.products.toList(), _query.text);
    return Column(children: [
      Padding(
        padding: const EdgeInsets.all(16),
        child: Row(children: [
          Expanded(
            child: TextField(
              controller: _query,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(prefixIcon: const Icon(Icons.search), hintText: s.billingFindProduct),
            ),
          ),
          const SizedBox(width: 12),
          IconButton(onPressed: () => setState(() => _qty = _qty > 1 ? _qty - 1 : 1), icon: const Icon(Icons.remove_circle_outline)),
          Text('$_qty', style: Theme.of(context).textTheme.titleMedium),
          IconButton(onPressed: () => setState(() => _qty += 1), icon: const Icon(Icons.add_circle_outline)),
        ]),
      ),
      Expanded(
        child: ListView.separated(
          itemCount: list.length,
          separatorBuilder: (_, __) => const Divider(height: 1),
          itemBuilder: (ctx, i) {
            final p = list[i];
            final out = p.stockQty < _qty;
            return ListTile(
              title: Text(p.name),
              subtitle: Text('${p.sku} · ${fmtRs(p.salePrice)} · stock ${p.stockQty}'),
              trailing: Icon(Icons.add_shopping_cart_outlined, color: out ? tokens.muted2 : tokens.accent),
              enabled: !out,
              onTap: () async {
                final ok = await store.recordCounterSale(p, _qty);
                if (ctx.mounted) {
                  ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(
                    content: Text(ok ? '${p.name} × $_qty — ${fmtRs(p.salePrice * _qty)}' : s.billingErrBillFailed),
                  ));
                }
              },
            );
          },
        ),
      ),
    ]);
  }
}

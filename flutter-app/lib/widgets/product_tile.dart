import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/product.dart';

final _pkr = NumberFormat('#,##0', 'en_PK');

/// Dukaan AI — inventory list row with a +/- stock stepper.
class ProductTile extends StatelessWidget {
  final Product product;
  final ValueChanged<int> onAdjust;

  const ProductTile({super.key, required this.product, required this.onAdjust});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final border = product.isCritical
        ? scheme.error
        : product.isLowStock
            ? Colors.amber.shade700
            : null;
    return Card(
      shape: border == null
          ? null
          : RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(color: border, width: 1.4),
            ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(product.name,
                      style: Theme.of(context)
                          .textTheme
                          .titleSmall
                          ?.copyWith(fontWeight: FontWeight.w700)),
                  Text('Rs ${_pkr.format(product.salePrice)} · ${product.sku}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: scheme.onSurfaceVariant)),
                  if (product.isLowStock)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Chip(
                        label: Text(product.isCritical ? 'Critical' : 'Low stock',
                            style: const TextStyle(fontSize: 11)),
                        visualDensity: VisualDensity.compact,
                        backgroundColor: (product.isCritical
                                ? scheme.error
                                : Colors.amber.shade700)
                            .withValues(alpha: 0.12),
                        side: BorderSide.none,
                        padding: EdgeInsets.zero,
                      ),
                    ),
                ],
              ),
            ),
            // Stock stepper
            IconButton(
              icon: const Icon(Icons.remove_circle_outline),
              onPressed: product.stockQty > 0 ? () => onAdjust(-1) : null,
              tooltip: 'Decrease stock',
            ),
            SizedBox(
              width: 56,
              child: Text('${product.stockQty}',
                  textAlign: TextAlign.center,
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w800)),
            ),
            IconButton(
              icon: const Icon(Icons.add_circle_outline),
              onPressed: () => onAdjust(1),
              tooltip: 'Increase stock',
            ),
          ],
        ),
      ),
    );
  }
}

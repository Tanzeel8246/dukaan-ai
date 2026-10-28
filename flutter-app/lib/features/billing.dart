/// Billing / POS (design §5 + the owner's standing POS contract):
/// type in the finder → ONE tap adds (repeat taps increment), focus
/// returns to the finder, the cart is sticky, and completing a bill
/// opens the receipt INSTANTLY as a modal with Print / 80mm /
/// WhatsApp / New bill. Held bills park without a journal entry;
/// finalizing mints the number (max+1 with a server re-read when
/// online, §3.6). Returns and void live on bill history; void is an
/// E5 sensitive action.
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';

import '../app_state.dart';
import '../core/composers.dart';
import '../core/jobs.dart' show jobMaterialNetQty;
import '../core/ledger.dart' show effectiveBillStatus;
import '../core/loyalty.dart';
import '../core/permissions.dart';
import '../core/print.dart';
import '../core/search.dart';
import '../core/types.dart';
import '../data/store.dart';
import '../l10n/app_strings.dart';
import '../main.dart' show fmtRs;
import '../platform/direct_printing.dart';
import '../platform/printing.dart';
import 'f2_common.dart';
import 'pin_gate.dart';
import 'print/receipt_view.dart';

class _CartLine {
  final Product product;
  double qty;
  double unitPrice;
  final String? sourceProductId;
  _CartLine(this.product, this.qty, this.unitPrice, {this.sourceProductId});
}

class _PayRow {
  String method;
  double amount;
  bool isCheque = false;
  // H2: a points row rides the cash method; its input is a points
  // COUNT, and every points row aggregates into ONE tender part
  // priced by the fold's quote (never by typed rupees).
  bool isPoints = false;
  int points = 0;
  final chqNo = TextEditingController();
  final chqBank = TextEditingController();
  final chqIssue = TextEditingController();
  final chqDue = TextEditingController();
  _PayRow(this.method, this.amount);
}

class BillingScreen extends StatefulWidget {
  const BillingScreen({super.key});
  @override
  State<BillingScreen> createState() => _BillingScreenState();
}

class _BillingScreenState extends State<BillingScreen> {
  final _search = TextEditingController();
  final _searchFocus = FocusNode();
  final List<_CartLine> _cart = [];
  final List<_PayRow> _payments = [_PayRow('cash', 0)];
  String _discountType = 'flat';
  double _discountValue = 0;
  Customer? _customer;
  final _advanceCtl = TextEditingController();
  bool _busy = false;
  String? _sourceType;
  String? _sourceId;
  String? _warehouseId;
  double _cashTendered = 0;

  void _applyQuickCash(double amount, double total) {
    setState(() {
      _cashTendered = amount;
      final cashRow = _payments.where((p) => p.method == 'cash' && !p.isCheque && !p.isPoints).firstOrNull;
      final amtToPost = amount >= total ? total : amount;
      if (cashRow != null) {
        cashRow.amount = amtToPost;
      } else {
        _payments.insert(0, _PayRow('cash', amtToPost));
      }
    });
  }

  @override
  void initState() {
    super.initState();
    // F2: a document conversion (quotation / order / challan)
    // hands its remaining lines over as a prefill — consumed once,
    // here, when the desk is (re)created by the tab switch.
    final store = context.read<ShopStore>();
    final prefill = store.billPrefill;
    if (prefill != null) {
      store.billPrefill = null;
      _sourceType = prefill.sourceType;
      _sourceId = prefill.sourceId;
      _warehouseId = prefill.warehouseId;
      _discountType = prefill.discountType;
      _discountValue = prefill.discountValue;
      for (final l in prefill.lines) {
        final p = store.productsById[l.productId];
        if (p != null) {
          _cart.add(_CartLine(p, l.qty, l.unitPrice ?? p.salePrice, sourceProductId: l.sourceProductId));
        }
      }
      if (prefill.customerId != null) {
        _customer = store.customers.where((c) => c.id == prefill.customerId).firstOrNull ??
            Customer(id: prefill.customerId!, name: prefill.customerName, phone: prefill.customerPhone);
      } else if (prefill.customerName.isNotEmpty) {
        _customer = Customer(id: '', name: prefill.customerName, phone: prefill.customerPhone);
      }
    }
  }

  void _add(Product p) {
    setState(() {
      final existing = _cart.where((l) => l.product.id == p.id).firstOrNull;
      if (existing != null) {
        existing.qty += 1;
      } else {
        _cart.add(_CartLine(p, 1, p.salePrice));
      }
      _search.clear();
    });
    _searchFocus.requestFocus();
  }

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final tokens = context.watch<AppState>().tokens;
    final results = filterProducts(
      store.products.toList(),
      _search.text,
    ).take(30).toList();
    final held = store.bills.where((b) => b.status == 'held').toList();

    final subtotal = _cart.fold<double>(0, (a, l) => a + l.qty * l.unitPrice);
    final discount = _discountType == 'percent' ? subtotal * _discountValue / 100 : _discountValue;
    final priced = _cart.isEmpty
        ? null
        : priceBillLines(
            _cart.map((l) => BillLineInput(productId: l.product.id, qty: l.qty, unitPrice: l.unitPrice)).toList(),
            store.productsById,
          );
    final stamped = priced == null
        ? null
        : stampBillTaxes(priced.items, store.productsById, store.taxSlabs,
            defaultSalesTaxSlabId: store.settings.defaultSalesTaxSlabId,
            discountAmount: discount.clamp(0, subtotal).toDouble());
    final total = stamped?.total ?? 0;
    // H2: loyalty derivations for the desk — the customer's folded
    // position, the aggregate redemption quote for every points
    // row, and the earn preview (the same folds the store posts
    // against, so the desk can never quote what posting refuses).
    final loyaltySt = resolveLoyaltySettings(store.ownerDoc);
    final customerId = _customer != null && _customer!.id.isNotEmpty ? _customer!.id : null;
    final nowIso = DateTime.now().toUtc().toIso8601String();
    final loyaltyPos = customerId != null
        ? customerLoyalty(store.journal, customerId, loyaltySt, nowIso)
        : null;
    final wantedPoints = _payments
        .where((p) => p.isPoints)
        .fold(0, (a, p) => a + (p.points > 0 ? p.points : 0));
    final pointsQuote = customerId != null && wantedPoints > 0
        ? loyaltyRedemptionQuote(store.journal, customerId, wantedPoints,
            loyaltyRedeemCapRs(total, loyaltySt))
        : const LoyaltyRedemptionQuote(points: 0, rs: 0);
    final earnQuote = customerId != null && total > 0
        ? loyaltyEarnQuote(store.journal, customerId, total, loyaltySt, nowIso)
        : null;
    final hasPointsRow = _payments.any((p) => p.isPoints);
    final paidSum = _payments.fold<double>(0, (a, p) => a + (p.isPoints ? 0 : p.amount)) +
        (hasPointsRow ? pointsQuote.rs : 0);
    final creditPart = (total - paidSum).clamp(0, double.infinity).toDouble();
    final changeDue = _cashTendered > total ? _cashTendered - total : 0.0;

    // F3 (§5.4, R-C7): billing a job shows its issued materials
    // up top — they already left the shelf at job cost and must
    // NOT be added as bill lines again.
    final sourceJob = _sourceType == 'job' && _sourceId != null
        ? store.jobs.where((j) => j.id == _sourceId).firstOrNull
        : null;

    Widget cartPanel = Card(
      margin: const EdgeInsets.all(12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          if (sourceJob != null) ...[
            Text(
              s.raw('job.bill.materialsTitle').replaceAll('{number}', sourceJob.number),
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            Text(s.raw('job.bill.materialsSub'), style: TextStyle(color: tokens.muted, fontSize: 12)),
            for (final pid in {for (final e in sourceJob.materialEvents) e.productId})
              if (jobMaterialNetQty(sourceJob, pid) > 0)
                Text(
                  '· ${sourceJob.materialEvents.where((e) => e.productId == pid).first.name} × ${jobMaterialNetQty(sourceJob, pid)}',
                  style: const TextStyle(fontSize: 12),
                ),
            const Divider(),
          ],
          if (_cart.isEmpty)
            Text(s.billingCartEmpty, style: TextStyle(color: tokens.muted))
          else
            for (final l in _cart)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(children: [
                  Expanded(child: Text('${l.product.name}\n${fmtRs(l.unitPrice)}', style: const TextStyle(fontSize: 13))),
                  IconButton(icon: const Icon(Icons.remove, size: 18), onPressed: () => setState(() => l.qty = (l.qty - 1).clamp(0, 1e9).toDouble())),
                  SizedBox(width: 34, child: Text('${l.qty % 1 == 0 ? l.qty.toInt() : l.qty}', textAlign: TextAlign.center)),
                  IconButton(icon: const Icon(Icons.add, size: 18), onPressed: () => setState(() => l.qty += 1)),
                  SizedBox(width: 76, child: Text(fmtRs(l.qty * l.unitPrice), textAlign: TextAlign.end)),
                  IconButton(icon: const Icon(Icons.close, size: 18), onPressed: () => setState(() => _cart.remove(l))),
                ]),
              ),
          const Divider(),
          Row(children: [
            Expanded(child: Text(s.billingDiscount)),
            DropdownButton<String>(
              value: _discountType,
              items: [
                DropdownMenuItem(value: 'flat', child: Text(s.billingDiscountFlat)),
                DropdownMenuItem(value: 'percent', child: Text(s.billingDiscountPercent)),
              ],
              onChanged: (v) => setState(() => _discountType = v ?? 'flat'),
            ),
            SizedBox(
              width: 90,
              child: TextField(
                keyboardType: TextInputType.number,
                onChanged: (v) => setState(() => _discountValue = double.tryParse(v) ?? 0),
                decoration: const InputDecoration(isDense: true),
              ),
            ),
          ]),
          const SizedBox(height: 6),
          InkWell(
            onTap: () => _pickCustomer(context),
            child: Row(children: [
              const Icon(Icons.person_outline, size: 18),
              const SizedBox(width: 6),
              Expanded(child: Text(_customer?.name ?? s.billingCustomerName)),
              const Icon(Icons.chevron_right, size: 18),
            ]),
          ),
          const SizedBox(height: 8),
          for (var i = 0; i < _payments.length; i++)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 3),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Row(children: [
                  DropdownButton<String>(
                    value: _payments[i].isPoints ? 'points' : _payments[i].method,
                    items: [
                      for (final m in ['cash', 'bank', 'wallet', 'card', 'credit'])
                        DropdownMenuItem(value: m, child: Text(m == 'credit' ? 'Credit (Udhaar)' : m)),
                      // H2: the points tender is offered only on a
                      // named customer's bill (web parity).
                      if (customerId != null || _payments[i].isPoints)
                        DropdownMenuItem(value: 'points', child: Text(s.raw('bill.payPoints'))),
                    ],
                    onChanged: (v) => setState(() {
                      if (v == 'points') {
                        _payments[i].isPoints = true;
                        _payments[i].method = 'cash';
                        _payments[i].isCheque = false;
                      } else {
                        _payments[i].isPoints = false;
                        _payments[i].method = v ?? 'cash';
                        if (v == 'credit') {
                          final otherPaid = _payments
                              .asMap()
                              .entries
                              .where((e) => e.key != i)
                              .fold<double>(0, (a, e) => a + (e.value.isPoints ? 0 : e.value.amount));
                          final rem = (total - otherPaid).clamp(0, double.infinity).toDouble();
                          if (rem > 0) _payments[i].amount = rem;
                        }
                      }
                    }),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _payments[i].isPoints
                        ? TextField(
                            keyboardType: TextInputType.number,
                            decoration: InputDecoration(isDense: true, hintText: s.raw('bill.pointsUsePh')),
                            onChanged: (v) => setState(() => _payments[i].points = int.tryParse(v.trim()) ?? 0),
                          )
                        : TextField(
                            keyboardType: TextInputType.number,
                            decoration: InputDecoration(isDense: true, hintText: fmtRs(total)),
                            onChanged: (v) => setState(() => _payments[i].amount = double.tryParse(v) ?? 0),
                          ),
                  ),
                  if (_payments[i].method == 'bank')
                    InkWell(
                      onTap: () => setState(() => _payments[i].isCheque = !_payments[i].isCheque),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        Checkbox(value: _payments[i].isCheque, onChanged: (v) => setState(() => _payments[i].isCheque = v ?? false)),
                        Text(s.raw('chq.payOption'), style: const TextStyle(fontSize: 12)),
                      ]),
                    ),
                  IconButton(
                    icon: const Icon(Icons.add_circle_outline, size: 18),
                    onPressed: () => setState(() => _payments.add(_PayRow('cash', 0))),
                  ),
                ]),
                if (_payments[i].isCheque)
                  ChequeDraftFields(
                    chequeNo: _payments[i].chqNo,
                    bankName: _payments[i].chqBank,
                    issueDate: _payments[i].chqIssue,
                    dueDate: _payments[i].chqDue,
                  ),
                if (_payments[i].isPoints)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      '${s.raw('bill.pointsBalance')}: ${loyaltyPos?.redeemablePoints ?? 0}'
                      '${pointsQuote.points > 0 ? ' · ${pointsQuote.points} = ${fmtRs(pointsQuote.rs)}' : ''}'
                      ' · ${s.raw('bill.pointsMaxNote').replaceAll('{cap}', '${loyaltySt.redeemCapPct % 1 == 0 ? loyaltySt.redeemCapPct.toInt() : loyaltySt.redeemCapPct}')}',
                      style: TextStyle(color: tokens.muted, fontSize: 12),
                    ),
                  ),
              ]),
            ),
          if (creditPart > 0.005)
            Text('${s.raw('bill.creditPart')}: ${fmtRs(creditPart)}', style: TextStyle(color: tokens.amberText)),
          if (changeDue > 0.005)
            Container(
              margin: const EdgeInsets.symmetric(vertical: 4),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: tokens.accentSoft,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'واپسی (Change Due): ${fmtRs(changeDue)}',
                style: TextStyle(color: tokens.accentText, fontWeight: FontWeight.bold),
              ),
            ),
          Padding(
            padding: const EdgeInsets.only(top: 6, bottom: 4),
            child: Wrap(
              spacing: 6,
              runSpacing: 4,
              children: [
                ActionChip(
                  label: Text(s.billingGrandTotal),
                  onPressed: total > 0 ? () => _applyQuickCash(total, total) : null,
                ),
                ActionChip(
                  label: const Text('Rs 100'),
                  onPressed: total > 0 ? () => _applyQuickCash(100, total) : null,
                ),
                ActionChip(
                  label: const Text('Rs 500'),
                  onPressed: total > 0 ? () => _applyQuickCash(500, total) : null,
                ),
                ActionChip(
                  label: const Text('Rs 1,000'),
                  onPressed: total > 0 ? () => _applyQuickCash(1000, total) : null,
                ),
                ActionChip(
                  label: const Text('Rs 5,000'),
                  onPressed: total > 0 ? () => _applyQuickCash(5000, total) : null,
                ),
              ],
            ),
          ),
          // MC workflow §1 — advance taken AT BILLING time, for a
          // named customer: separate from the bill total, it posts
          // to the customer's advance account after the bill posts.
          if (_customer != null)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: TextField(
                controller: _advanceCtl,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(labelText: s.raw('mc.bill.advance'), helperText: s.raw('mc.bill.advanceHelp'), isDense: true),
              ),
            ),
          // H2: the earn preview — what this bill will grant.
          // Walk-in bills say plainly that they earn nothing.
          if (loyaltySt.enabled && _cart.isNotEmpty) ...[
            const SizedBox(height: 4),
            if (customerId != null)
              if (earnQuote != null)
                Text(
                  '${s.raw('bill.earnPreview').replaceAll('{points}', '${earnQuote.points}')}'
                  '${loyaltyPos != null && loyaltyPos.tier != 'standard' ? ' · ${s.raw('loyalty.tier.${loyaltyPos.tier}')} ' : ''}',
                  style: TextStyle(color: tokens.muted, fontSize: 12),
                )
              else
                const SizedBox.shrink()
            else
              Text(s.raw('bill.walkinNoEarn'), style: TextStyle(color: tokens.muted, fontSize: 12)),
          ],
          const SizedBox(height: 8),
          Row(children: [Expanded(child: Text(s.billingGrandTotal)), Text(fmtRs(total), style: Theme.of(context).textTheme.titleLarge)]),
          const SizedBox(height: 10),
          Row(children: [
            OutlinedButton(onPressed: _cart.isEmpty || _busy ? null : () => _hold(context, total), child: Text(s.billingHoldBill)),
            const SizedBox(width: 8),
            Expanded(
              child: ElevatedButton(
                onPressed: _cart.isEmpty || _busy ? null : () => _complete(context, total, creditPart),
                child: Text(s.billingCompleteBill),
              ),
            ),
          ]),
        ]),
      ),
    );

    final finder = Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
        child: Row(children: [
          Expanded(child: Text(s.billingHistoryTitle, style: Theme.of(context).textTheme.titleSmall)),
          TextButton(onPressed: () => _showHistory(context), child: Text(s.actionViewAll)),
        ]),
      ),
      Padding(
        padding: const EdgeInsets.fromLTRB(12, 6, 12, 6),
        child: TextField(
          controller: _search,
          focusNode: _searchFocus,
          autofocus: true,
          onChanged: (_) => setState(() {}),
          onSubmitted: (q) {
            final bySku = findProductBySku(store.products, q);
            if (bySku != null) _add(bySku);
          },
          decoration: InputDecoration(prefixIcon: const Icon(Icons.search), hintText: s.billingFindProduct),
        ),
      ),
      Expanded(
        child: ListView.separated(
          itemCount: results.length,
          separatorBuilder: (_, __) => const Divider(height: 1),
          itemBuilder: (ctx, i) {
            final p = results[i];
            return ListTile(
              title: Text(p.name),
              subtitle: Text('${p.sku} · ${fmtRs(p.salePrice)} · ${p.stockQty}'),
              trailing: const Icon(Icons.add_circle_outline),
              onTap: () => _add(p),
            );
          },
        ),
      ),
      if (held.isNotEmpty)
        Container(
          color: tokens.card2,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          child: Row(children: [
            Text('${s.billingHoldBill}: ${held.length}'),
            const Spacer(),
            TextButton(onPressed: () => _showHeld(context, held), child: Text(s.actionViewAll)),
          ]),
        ),
    ]);

    final wide = MediaQuery.of(context).size.width >= 900;
    if (wide) {
      return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Expanded(flex: 3, child: finder),
        SizedBox(width: 420, child: SingleChildScrollView(child: cartPanel)),
      ]);
    }
    return Column(children: [
      Expanded(child: finder),
      ConstrainedBox(constraints: const BoxConstraints(maxHeight: 320), child: SingleChildScrollView(child: cartPanel)),
    ]);
  }

  Future<void> _pickCustomer(BuildContext context) async {
    final store = context.read<ShopStore>();
    final picked = await showDialog<Customer>(
      context: context,
      builder: (ctx) => SimpleDialog(
        title: Text(S.current.billingCustomerName),
        children: [
          for (final c in store.customers)
            SimpleDialogOption(onPressed: () => Navigator.pop(ctx, c), child: Text('${c.name} · ${c.phone}')),
        ],
      ),
    );
    if (picked != null) setState(() => _customer = picked);
  }

  Bill? _buildBill(ShopStore store, {required String status, int? billNo, double deskTotal = 0}) {
    final payments = <BillPayment>[];
    var pointsEmitted = false;
    for (final p in _payments) {
      if (p.isPoints) {
        // H2: every points row aggregates into ONE tender part,
        // emitted at the first points row's position and priced
        // by the fold's quote — never by typed rupees.
        if (!pointsEmitted) {
          pointsEmitted = true;
          final cid = _customer != null && _customer!.id.isNotEmpty ? _customer!.id : null;
          final wanted = _payments
              .where((r) => r.isPoints)
              .fold(0, (a, r) => a + (r.points > 0 ? r.points : 0));
          if (cid != null && wanted > 0) {
            final st = resolveLoyaltySettings(store.ownerDoc);
            final q = loyaltyRedemptionQuote(
                store.journal, cid, wanted, loyaltyRedeemCapRs(deskTotal, st));
            if (q.points > 0) {
              payments.add(BillPayment(
                  method: 'cash', amount: q.rs, instrument: 'points', loyaltyPoints: q.points));
            }
          }
        }
        continue;
      }
      if (p.amount <= 0) continue;
      payments.add(BillPayment(
        method: p.method,
        amount: p.amount,
        instrument: p.isCheque ? 'cheque' : null,
        cheque: p.isCheque ? ChequeDraftFields.draftOf(p.chqNo, p.chqBank, p.chqIssue, p.chqDue) : null,
      ));
    }
    return store.buildBill(
      lines: _cart.map((l) => BillLineInput(productId: l.product.id, qty: l.qty, unitPrice: l.unitPrice, sourceProductId: l.sourceProductId)).toList(),
      payments: payments,
      customerId: _customer != null && _customer!.id.isNotEmpty ? _customer!.id : null,
      customerName: _customer?.name ?? '',
      customerPhone: _customer?.phone ?? '',
      discountType: _discountType,
      discountValue: _discountValue,
      status: status,
      billNo: billNo,
      warehouseId: _warehouseId,
      sourceType: _sourceType,
      sourceId: _sourceId,
    );
  }

  Future<void> _hold(BuildContext context, double total) async {
    final store = context.read<ShopStore>();
    final bill = _buildBill(store, status: 'held', deskTotal: total);
    if (bill == null) return;
    await store.saveHeldBill(bill);
    setState(() {
      _cart.clear();
      _sourceType = null;
      _sourceId = null;
      _cashTendered = 0;
      _payments
        ..clear()
        ..add(_PayRow('cash', 0));
    });
  }

  Future<void> _complete(BuildContext context, double total, double creditPart) async {
    final s = S.current;
    final store = context.read<ShopStore>();
    if (creditPart > 0.005 && _customer == null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(s.billingErrCreditNeedsName)));
      return;
    }
    // H2: points belong to a named customer — a points row on a
    // walk-in bill can never quote (the store refuses it too).
    if (_payments.any((p) => p.isPoints) && (_customer == null || _customer!.id.isEmpty)) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(s.raw('bill.pointsNeedsCustomer'))));
      return;
    }
    setState(() => _busy = true);
    final billNo = await store.mintBillNo();
    final initialStatus = creditPart >= total - 0.01 ? 'unpaid' : (creditPart > 0.005 ? 'partial' : 'paid');
    var bill = _buildBill(store, status: initialStatus, billNo: billNo, deskTotal: total);
    if (bill == null) {
      setState(() => _busy = false);
      return;
    }
    // Credit part becomes a credit payment row (the composer's
    // contract: payments + credit == total within tolerance).
    if (creditPart > 0.005) {
      bill = Bill(
        id: bill.id, billNo: bill.billNo, customerId: bill.customerId,
        customerName: bill.customerName, customerPhone: bill.customerPhone,
        items: bill.items, subtotal: bill.subtotal, discountType: bill.discountType,
        discountValue: bill.discountValue, discountAmount: bill.discountAmount,
        taxAmount: bill.taxAmount, total: bill.total,
        payments: [...bill.payments, BillPayment(method: 'credit', amount: creditPart)],
        status: initialStatus, warehouseId: bill.warehouseId, dayOffset: 0, ts: bill.ts,
        sourceType: bill.sourceType, sourceId: bill.sourceId,
        originDevice: bill.originDevice,
      );
    }
    final ok = await store.postBill(bill);
    // Advance-at-billing: a separate split receipt (bill part 0)
    // in the same completion flow, after the bill itself posts.
    final advAtBilling = double.tryParse(_advanceCtl.text.trim()) ?? 0;
    if (ok && advAtBilling > 0 && _customer != null) {
      await store.recordCustomerReceipt(
        customerId: _customer!.id, customerName: _customer!.name, customerPhone: _customer!.phone,
        billPayment: 0, advance: advAtBilling, method: 'cash', billId: bill.id,
      );
    }
    setState(() => _busy = false);
    if (!ok) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(s.billingErrBillFailed)));
      }
      return;
    }
    setState(() {
      _cart.clear();
      _advanceCtl.clear();
      _cashTendered = 0;
      _payments
        ..clear()
        ..add(_PayRow('cash', 0));
      _customer = null;
      _sourceType = null;
      _sourceId = null;
    });
    if (context.mounted) await showReceiptModal(context, bill);
  }

  Future<void> _showHistory(BuildContext context) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    final bills = store.bills.where((b) => b.status != 'held').toList()
      ..sort((a, b) => b.ts.compareTo(a.ts));
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(s.billingHistoryTitle),
        content: SizedBox(
          width: 520,
          height: 460,
          child: bills.isEmpty
              ? Text(s.billingHistoryEmpty)
              : ListView(children: [
                  for (final b in bills.take(60))
                    Builder(builder: (context) {
                      final effStatus = effectiveBillStatus(b, store.credits);
                      return ListTile(
                        title: Text('#${b.billNo} · ${b.customerName.isEmpty ? s.raw('billing.walkIn') : b.customerName} · ${fmtRs(b.total)}'),
                        subtitle: Text('${b.ts.substring(0, 10)} · $effStatus'),
                        trailing: Wrap(spacing: 2, children: [
                          IconButton(icon: const Icon(Icons.print_outlined, size: 19), onPressed: () => showReceiptModal(ctx, b)),
                          if (b.status == 'paid' || b.status == 'partially_returned' || effStatus == 'paid' || effStatus == 'partial' || effStatus == 'unpaid')
                            IconButton(icon: const Icon(Icons.undo_outlined, size: 19), onPressed: () => _returnFlow(ctx, b)),
                          if (b.status == 'paid' || effStatus == 'paid' || effStatus == 'partial' || effStatus == 'unpaid')
                            IconButton(
                              icon: const Icon(Icons.block_outlined, size: 19),
                              onPressed: () async {
                                if (!await runSensitiveGate(ctx, 'voidBill')) return;
                                await store.voidBill(b);
                                if (ctx.mounted) Navigator.pop(ctx);
                              },
                            ),
                        ]),
                      );
                    }),
                ]),
        ),
        actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: Text(s.actionClose))],
      ),
    );
  }

  Future<void> _returnFlow(BuildContext context, Bill bill) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    final qtys = <String, double>{};
    var issueNote = false;
    final canNote = can(store.role, 'creditDebitNotes', 'write');
    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          title: Text(s.raw('returns.title')),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            for (final it in bill.items)
              Row(children: [
                Expanded(child: Text(it.name)),
                IconButton(icon: const Icon(Icons.remove, size: 18), onPressed: () => setLocal(() => qtys[it.productId] = ((qtys[it.productId] ?? 0) - 1).clamp(0, it.qty).toDouble())),
                Text('${qtys[it.productId] ?? 0}'),
                IconButton(icon: const Icon(Icons.add, size: 18), onPressed: () => setLocal(() => qtys[it.productId] = ((qtys[it.productId] ?? 0) + 1).clamp(0, it.qty).toDouble())),
              ]),
            if (canNote)
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(s.raw('note.filter.credit')),
                value: issueNote,
                onChanged: (v) => setLocal(() => issueNote = v ?? false),
              ),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: Text(s.actionCancel)),
            ElevatedButton(
              onPressed: () async {
                final lines = qtys.entries.where((e) => e.value > 0).map((e) => (productId: e.key, qty: e.value)).toList();
                if (lines.isNotEmpty) await store.recordReturn(bill: bill, lines: lines, issueNote: issueNote);
                if (ctx.mounted) Navigator.pop(ctx);
              },
              child: Text(s.actionConfirm),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showHeld(BuildContext context, List<Bill> held) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(s.billingHoldBill),
        content: SizedBox(
          width: 420,
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            for (final b in held)
              ListTile(
                title: Text('${b.customerName.isEmpty ? s.raw('billing.walkIn') : b.customerName} · ${fmtRs(b.total)}'),
                subtitle: Text(b.ts),
                trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                  IconButton(
                    icon: const Icon(Icons.play_arrow_outlined),
                    onPressed: () async {
                      Navigator.pop(ctx);
                      // Resume into the cart.
                      setState(() {
                        _cart.clear();
                        for (final it in b.items) {
                          final p = store.productsById[it.productId];
                          if (p != null) _cart.add(_CartLine(p, it.qty, it.unitPrice));
                        }
                      });
                      await store.discardHeldBill(b.id);
                    },
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete_outline),
                    onPressed: () async {
                      await store.discardHeldBill(b.id);
                      if (ctx.mounted) Navigator.pop(ctx);
                    },
                  ),
                ]),
              ),
          ]),
        ),
        actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: Text(s.actionClose))],
      ),
    );
  }
}

/// Direct POS printer selection (F2 §8): device-local. "Share
/// sheet" is the F1 default; Bluetooth lists paired devices, USB
/// lists attached ones — an empty list is a normal state (no
/// printer), never an error.
Future<void> showPrinterSettingsDialog(BuildContext context) async {
  final current = await PrinterSettings.load();
  final bluetooth = await pairedBluetoothPrinters();
  final usb = await attachedUsbDevices();
  if (!context.mounted) return;
  final s = S.current;
  await showDialog<void>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Text('POS printer'),
      content: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          ListTile(
            leading: const Icon(Icons.share_outlined),
            title: const Text('Share sheet'),
            subtitle: const Text('ESC/POS .bin via share sheet'),
            selected: current == null,
            onTap: () async {
              await PrinterSettings.save(null);
              if (ctx.mounted) Navigator.pop(ctx);
            },
          ),
          for (final b in bluetooth)
            ListTile(
              leading: const Icon(Icons.bluetooth),
              title: Text(b.name),
              subtitle: Text(b.macAdress),
              selected: current?.mac == b.macAdress,
              onTap: () async {
                await PrinterSettings.save(DirectPrinterConfig(
                  transport: 'bluetooth', label: b.name, mac: b.macAdress));
                if (ctx.mounted) Navigator.pop(ctx);
              },
            ),
          for (final d in usb)
            ListTile(
              leading: const Icon(Icons.usb_outlined),
              title: Text(d.productName ?? d.deviceName),
              subtitle: Text(d.deviceName),
              selected: current?.vid == d.vid && current?.pid == d.pid,
              onTap: () async {
                await PrinterSettings.save(DirectPrinterConfig(
                  transport: 'usb', label: d.productName ?? d.deviceName, vid: d.vid, pid: d.pid));
                if (ctx.mounted) Navigator.pop(ctx);
              },
            ),
          if (bluetooth.isEmpty && usb.isEmpty)
            const ListTile(
              leading: Icon(Icons.info_outline),
              title: Text('No direct printer found'),
              subtitle: Text('Pair a Bluetooth printer or attach a USB printer, then reopen this dialog.'),
            ),
        ]),
      ),
      actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: Text(s.actionClose))],
    ),
  );
}

/// The completion receipt — shown INSTANTLY after posting (owner's
/// contract), with the design's three transports.
Future<void> showReceiptModal(BuildContext context, Bill bill) async {
  final store = context.read<ShopStore>();
  final s = S.current;
  final boundaryKey = GlobalKey();
  final data = receiptForBill(
    bill: bill,
    ownerDoc: store.ownerDoc,
    productsById: store.productsById,
    money: fmtRs,
    walkInLabel: s.raw('billing.walkIn'),
    billNoText: s.raw('billing.billNo'),
  );
  await showDialog<void>(
    context: context,
    builder: (ctx) => AlertDialog(
      content: SingleChildScrollView(
        child: RepaintBoundary(
          key: boundaryKey,
          child: ReceiptView(
            data: data,
            money: fmtRs,
            totalLabel: s.billingGrandTotal,
            discountLabel: s.billingDiscount,
            taxLabel: s.raw('bill.tax'),
            thanksFallback: s.raw('bill.thanks'),
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () async {
            final png = await captureReceiptPng(boundaryKey);
            if (png != null) await SystemPrintPrinter().printPng(png, jobName: 'bill-${bill.billNo}', thermal: false);
          },
          child: Text(s.actionPrint),
        ),
        TextButton(
          onPressed: () async {
            final png = await captureReceiptPng(boundaryKey);
            if (png == null) return;
            // F2 §8: a configured direct printer (Bluetooth/USB)
            // gets the job first; ANY failure falls back to the
            // share-sheet .bin path — absence is never an error
            // the cashier has to understand.
            final direct = await configuredDirectPrinter();
            var delivered = false;
            if (direct != null) {
              try {
                await direct.printPng(png, jobName: 'bill-${bill.billNo}', thermal: true);
                delivered = true;
              } catch (_) {
                delivered = false;
              }
            }
            if (!delivered) {
              await PosRasterPrinter().printPng(png, jobName: 'bill-${bill.billNo}', thermal: true);
            }
          },
          child: const Text('80mm'),
        ),
        IconButton(
          icon: const Icon(Icons.print_outlined, size: 19),
          tooltip: 'POS printer',
          onPressed: () => showPrinterSettingsDialog(context),
        ),
        TextButton(
          onPressed: () => Share.share(receiptPlainText(data, fmtRs, thanksFallback: s.raw('bill.thanks'))),
          child: Text(s.actionWhatsapp),
        ),
        ElevatedButton(onPressed: () => Navigator.pop(ctx), child: Text(s.raw('billing.newBill'))),
      ],
    ),
  );
}

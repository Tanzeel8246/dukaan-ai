/// Customers + udhaar ledger (design §5): the directory with live
/// outstanding balances from the credits ledger, a per-customer
/// statement, standalone udhaar (posted Dr receivables / Cr cash —
/// never revenue, F-4) and repayments with RV- document numbers.
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';

import '../app_state.dart';
import '../core/ledger.dart';
import '../core/loyalty.dart';
import '../core/permissions.dart';
import '../core/search.dart';
import '../core/types.dart';
import '../core/whatsapp.dart';
import '../data/store.dart';
import '../l10n/app_strings.dart';
import '../main.dart' show fmtRs;
import 'f2_common.dart';

/// Outstanding for a directory customer: rows keyed by their id
/// PLUS legacy rows keyed by name|phone (the web groups both ways;
/// the directory joins them — see _CustomerDetail's filter).
double _dueFor(ShopStore store, Customer c) {
  var due = 0.0;
  for (final e in store.credits) {
    final match = e.customerId == c.id ||
        (e.customerId == null && e.customerName == c.name && e.customerPhone == c.phone);
    if (!match) continue;
    due += e.kind == 'credit' ? e.amount : -e.amount;
  }
  return due;
}

class CustomersScreen extends StatefulWidget {
  const CustomersScreen({super.key});
  @override
  State<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends State<CustomersScreen> {
  final _query = TextEditingController();
  Customer? _selected;

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final wide = MediaQuery.of(context).size.width >= 900;

    final list = store.customers.where((c) => customerMatches(c, _query.text)).toList();
    // H2: derived loyalty positions, folded from the journal —
    // the directory line + profile card read them; nothing is
    // stored on the customer (web parity).
    final loyaltySt = resolveLoyaltySettings(store.ownerDoc);
    final loyaltyNow = DateTime.now().toUtc().toIso8601String();
    final loyaltyIds = loyaltyCustomerIds(store.journal).toSet();
    CustomerLoyalty? posOf(String id) => loyaltyIds.contains(id)
        ? customerLoyalty(store.journal, id, loyaltySt, loyaltyNow)
        : null;
    final directory = Column(children: [
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
          ElevatedButton.icon(onPressed: () => _editCustomer(context, null), icon: const Icon(Icons.person_add_outlined, size: 18), label: Text(s.actionAdd)),
        ]),
      ),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: Align(alignment: AlignmentDirectional.centerStart,
            child: Text('${s.raw('credit.sum.totalOutstanding')}: ${fmtRs(totalOutstandingCredit(store.credits))}')),
      ),
      Expanded(
        child: ListView.separated(
          itemCount: list.length,
          separatorBuilder: (_, __) => const Divider(height: 1),
          itemBuilder: (ctx, i) {
            final c = list[i];
            final due = _dueFor(store, c);
            final lp = posOf(c.id);
            final pointsLine = lp != null && (lp.points != 0 || lp.rupees != 0)
                ? '${s.raw('cust.loyaltyPoints')}: ${lp.points} · ${fmtRs(lp.rupees)} · ${s.raw('loyalty.tier.${lp.tier}')}'
                : null;
            // H5: the consent marker rides the directory line —
            // an opted-in customer is visible at a glance (web parity).
            final subLines = [
              c.phone,
              if (pointsLine != null) pointsLine,
              if (customerOptedIn(c)) '✓ ${s.raw('wa.consent.on')}',
            ];
            return ListTile(
              title: Text(c.name),
              subtitle: Text(subLines.join('\n')),
              isThreeLine: subLines.length > 1,
              trailing: Text(fmtRs(due), style: TextStyle(fontWeight: FontWeight.w600, color: due > 0 ? null : Colors.grey)),
              selected: _selected?.id == c.id,
              onTap: () => setState(() => _selected = c),
            );
          },
        ),
      ),
    ]);

    final detail = _selected == null
        ? Center(child: Text(s.raw('common.none')))
        : _CustomerDetail(customer: _selected!);

    if (wide) {
      return Row(children: [
        SizedBox(width: 380, child: directory),
        const VerticalDivider(width: 1),
        Expanded(child: detail),
      ]);
    }
    return _selected == null ? directory : Column(children: [
      ListTile(leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => setState(() => _selected = null)), title: Text(_selected!.name)),
      Expanded(child: detail),
    ]);
  }

  Future<void> _editCustomer(BuildContext context, Customer? existing) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    final name = TextEditingController(text: existing?.name ?? '');
    final phone = TextEditingController(text: existing?.phone ?? '');
    final address = TextEditingController(text: existing?.address ?? '');
    // H5: consent rides the form (web parity) — a NEW customer
    // starts unstamped (absent = NO); an edit touches the stamp
    // only when the checkbox actually changed state.
    var waChecked = existing != null && customerOptedIn(existing);
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setLocal) => AlertDialog(
        title: Text(existing == null ? s.actionAdd : s.actionEdit),
        content: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: name, decoration: InputDecoration(labelText: s.raw('credit.give.namePlaceholder'))),
          TextField(controller: phone, decoration: InputDecoration(labelText: s.raw('credit.give.phonePlaceholder'))),
          TextField(controller: address, decoration: InputDecoration(labelText: s.raw('cust.address'))),
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(s.raw('wa.consent.label')),
            subtitle: Text(s.raw('wa.consent.sub')),
            value: waChecked,
            onChanged: (v) => setLocal(() => waChecked = v ?? false),
          ),
        ])),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(s.actionSave)),
        ],
      )),
    );
    if (saved != true || name.text.trim().isEmpty) return;
    final nowISO = DateTime.now().toUtc().toIso8601String();
    final stampChanged = existing == null
        ? waChecked
        : waChecked != customerOptedIn(existing);
    final patch = stampChanged
        ? waConsentPatch('counter', waChecked, nowISO)
        : const <String, dynamic>{};
    await store.saveCustomer(
      Customer(
        id: existing?.id ?? newId('cust'),
        name: name.text.trim(),
        phone: phone.text.trim(),
        address: address.text.trim(),
        // An unchanged edit carries the existing stamp through
        // (saveCustomer writes the whole doc); a changed one is
        // re-stamped with its moment + source (core/whatsapp).
        waOptIn: (patch['waOptIn'] as bool?) ?? existing?.waOptIn,
        waOptInAt: (patch['waOptInAt'] as String?) ?? existing?.waOptInAt,
        waOptInSource:
            (patch['waOptInSource'] as String?) ?? existing?.waOptInSource,
      ),
      isNew: existing == null,
    );
  }
}

class _CustomerDetail extends StatelessWidget {
  final Customer customer;
  const _CustomerDetail({required this.customer});

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final tokens = context.watch<AppState>().tokens;
    final entries = store.credits.where((e) => e.customerId == customer.id || (e.customerId == null && e.customerName == customer.name)).toList()
      ..sort((a, b) => a.ts.compareTo(b.ts));
    final due = _dueFor(store, customer);
    // H2: the profile's loyalty line (points · value · tier),
    // shown whenever the customer has any loyalty history.
    final loyaltySt = resolveLoyaltySettings(store.ownerDoc);
    final lp = loyaltyCustomerIds(store.journal).contains(customer.id)
        ? customerLoyalty(store.journal, customer.id, loyaltySt, DateTime.now().toUtc().toIso8601String())
        : null;
    return ListView(padding: const EdgeInsets.all(16), children: [
      Row(children: [
        Expanded(child: Text(customer.name, style: Theme.of(context).textTheme.titleLarge)),
        Text(fmtRs(due), style: Theme.of(context).textTheme.titleLarge?.copyWith(color: due > 0 ? tokens.amberText : null)),
      ]),
      Text(customer.phone, style: TextStyle(color: tokens.muted)),
      // H5: the WhatsApp consent state on the profile, with its
      // moment + source and the one-tap toggle (web parity). The
      // stamp rides the store's consent action — state, moment
      // and source move together, never separately (§3.2).
      const SizedBox(height: 8),
      Card(
        color: tokens.card2,
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Row(children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(
                    customerOptedIn(customer)
                        ? s.raw('wa.consent.on')
                        : s.raw('wa.consent.off'),
                    style: const TextStyle(fontWeight: FontWeight.w600)),
                if (customer.waOptInAt != null)
                  Text(
                    s
                        .raw('wa.consent.since')
                        .replaceAll('{date}', customer.waOptInAt!.substring(0, 10))
                        .replaceAll(
                            '{source}',
                            s.raw(customer.waOptInSource == 'storefront'
                                ? 'wa.consent.sourceStorefront'
                                : 'wa.consent.sourceCounter')),
                    style: TextStyle(color: tokens.muted, fontSize: 12),
                  ),
              ]),
            ),
            if (can(store.role, 'customersManage', 'write'))
              TextButton(
                onPressed: () async {
                  final next = !customerOptedIn(customer);
                  await store.setCustomerWaConsent(customer.id, next, 'counter');
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                        content: Text(s
                            .raw('wa.notice.consentSaved')
                            .replaceAll('{name}', customer.name))));
                  }
                },
                child: Text(s.raw(customerOptedIn(customer)
                    ? 'wa.consent.optOut'
                    : 'wa.consent.optIn')),
              ),
          ]),
        ),
      ),
      if (lp != null && lp.vintages.isNotEmpty) ...[
        const SizedBox(height: 8),
        Card(
          color: tokens.card2,
          child: Padding(
            padding: const EdgeInsets.all(10),
            child: RichText(
              text: TextSpan(
                style: DefaultTextStyle.of(context).style,
                children: [
                  TextSpan(text: '${s.raw('cust.loyaltyPoints')}: '),
                  TextSpan(text: '${lp.points}', style: const TextStyle(fontWeight: FontWeight.bold)),
                  TextSpan(text: ' · ${fmtRs(lp.rupees)} · ${s.raw('loyalty.tier.${lp.tier}')}'),
                ],
              ),
            ),
          ),
        ),
      ],
      const SizedBox(height: 12),
      Wrap(spacing: 8, children: [
        ElevatedButton.icon(onPressed: () => _give(context), icon: const Icon(Icons.arrow_upward, size: 16), label: Text(s.raw('credit.give'))),
        ElevatedButton.icon(onPressed: () => _repay(context), icon: const Icon(Icons.arrow_downward, size: 16), label: Text(s.raw('credit.repay'))),
        OutlinedButton.icon(
          onPressed: () {
            final body = StringBuffer('${customer.name}\n');
            for (final e in entries) {
              body.writeln('${e.ts.substring(0, 10)} · ${e.kind} · ${fmtRs(e.amount)}');
            }
            body.writeln('${s.raw('credit.sum.totalOutstanding')}: ${fmtRs(due)}');
            Share.share(body.toString());
          },
          icon: const Icon(Icons.share_outlined, size: 16),
          label: Text(s.raw('credit.statement')),
        ),
      ]),
      const SizedBox(height: 12),
      for (final e in entries.reversed)
        ListTile(
          dense: true,
          title: Text('${e.kind == 'credit' ? s.raw('credit.given') : s.raw('credit.repayment')} · ${fmtRs(e.amount)}'),
          subtitle: Text('${e.ts.substring(0, 10)}${e.voucherNo != null ? ' · ${e.voucherNo}' : ''}${e.note.isNotEmpty ? ' · ${e.note}' : ''}'),
        ),
    ]);
  }

  Future<void> _give(BuildContext context) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    final amount = TextEditingController();
    final note = TextEditingController();
    final go = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(s.raw('credit.give')),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: amount, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: s.raw('common.amount'))),
          TextField(controller: note, decoration: InputDecoration(labelText: s.raw('credit.give.notePlaceholder'))),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(s.actionConfirm)),
        ],
      ),
    );
    if (go != true) return;
    final v = double.tryParse(amount.text.trim()) ?? 0;
    if (v > 0) {
      await store.giveCredit(customerId: customer.id, customerName: customer.name, customerPhone: customer.phone, amount: v, note: note.text.trim());
    }
  }

  Future<void> _repay(BuildContext context) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    final amount = TextEditingController();
    var method = 'cash';
    var isCheque = false;
    final chqNo = TextEditingController();
    final chqBank = TextEditingController();
    final chqIssue = TextEditingController();
    final chqDue = TextEditingController();
    final go = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setLocal) => AlertDialog(
        title: Text(s.raw('credit.repay.title')),
        content: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: amount, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: s.raw('common.amount'))),
          DropdownButtonFormField<String>(
            initialValue: method,
            items: const [
              DropdownMenuItem(value: 'cash', child: Text('cash')),
              DropdownMenuItem(value: 'bank', child: Text('bank')),
              DropdownMenuItem(value: 'wallet', child: Text('wallet')),
            ],
            onChanged: (v) => setLocal(() => method = v ?? 'cash'),
          ),
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(s.raw('chq.payOption')),
            value: isCheque,
            onChanged: (v) => setLocal(() => isCheque = v ?? false),
          ),
          if (isCheque) ChequeDraftFields(chequeNo: chqNo, bankName: chqBank, issueDate: chqIssue, dueDate: chqDue),
        ])),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(s.actionConfirm)),
        ],
      )),
    );
    if (go != true) return;
    final v = double.tryParse(amount.text.trim()) ?? 0;
    if (v > 0) {
      await store.addRepayment(
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        amount: v,
        method: method,
        chequeDraft: isCheque ? ChequeDraftFields.draftOf(chqNo, chqBank, chqIssue, chqDue) : null,
      );
    }
  }
}

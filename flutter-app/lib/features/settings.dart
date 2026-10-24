/// Settings (F4): the remaining editors — shop profile, money
/// accounts, tax slabs, document numbering, job stages, print
/// design, brand assets, Raast, period locks, fiscal-year close,
/// staff & roles and Tally ledger names. Every write goes
/// through the store's owner-gated actions; sensitive closes run
/// the E5 PIN gate first (the F1 pattern). Calm theme surfaces
/// only — print previews render in the fixed print palette.
import 'dart:convert';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:image/image.dart' as img;
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';

import '../core/backup.dart' as bk;
import '../core/branding.dart';
import '../core/documents.dart';
import '../core/fiscal.dart';
import '../core/ledger.dart';
import '../core/loyalty.dart';
import '../core/permissions.dart';
import '../core/periods.dart';
import '../core/plans.dart';
import '../core/print.dart';
import '../core/raast.dart';
import '../core/renewal.dart';
import '../core/tally.dart';
import '../core/tenancy.dart';
import '../core/types.dart';
import '../data/store.dart';
import '../l10n/app_strings.dart';
import '../main.dart' show fmtRs;
import 'f2_common.dart';
import 'f3_common.dart';
import 'pin_gate.dart';
import 'print/receipt_view.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final owner = store.role == 'owner';
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(s.raw('settings.lead')),
        const SizedBox(height: 12),
        _section(context, s.raw('settings.accountTitle'), [
          _kvRow(s.raw('settings.accountEmail'), store.user?.email ?? ''),
          _kvRow(s.raw('settings.accountRole'), store.role),
          _kvRow(s.raw('settings.shopName'), store.settings.shopName),
        ]),
        if (can(store.role, 'settingsProfile', 'view')) const _ProfileSection(),
        if (owner) const _PlanSection(),
        if (owner) const _BackupSection(),
        if (can(store.role, 'accountsManage', 'view')) const _AccountsSection(),
        if (can(store.role, 'taxSlabs', 'view')) const _TaxSection(),
        if (owner) const _SeriesSection(),
        if (owner) const _JobStagesSection(),
        if (owner) const _PrintDesignSection(),
        if (owner) const _BrandingSection(),
        if (owner) const _RaastSection(),
        if (owner) const _PeriodsSection(),
        if (owner) const _FiscalSection(),
        if (owner) const _LoyaltySection(),
        if (can(store.role, 'staffManage', 'view')) const _StaffRolesSection(),
        if (owner) const _TallyNamesSection(),
      ],
    );
  }
}

Widget _section(BuildContext context, String title, List<Widget> children) => Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          ...children,
        ]),
      ),
    );

Widget _kvRow(String k, String v) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(children: [
        Expanded(child: Text(k)),
        Flexible(child: Text(v, style: const TextStyle(fontWeight: FontWeight.w600))),
      ]),
    );

/* ---------------- profile ---------------- */

class _ProfileSection extends StatefulWidget {
  const _ProfileSection();
  @override
  State<_ProfileSection> createState() => _ProfileSectionState();
}

class _ProfileSectionState extends State<_ProfileSection> {
  final _name = TextEditingController();
  final _nameAlt = TextEditingController();
  final _address = TextEditingController();
  final _phone = TextEditingController();
  bool _seeded = false;

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    if (!_seeded) {
      _seeded = true;
      _name.text = store.settings.shopName;
      _nameAlt.text = store.settings.shopNameAlt ?? '';
      _address.text = store.settings.address;
      _phone.text = store.settings.phone;
    }
    final canWrite = can(store.role, 'settingsProfile', 'write');
    return _section(context, s.raw('settings.profileTitle'), [
      Text(s.raw('settings.profileSub')),
      TextField(controller: _name, enabled: canWrite,
          decoration: InputDecoration(labelText: s.raw('settings.shopName'))),
      TextField(controller: _nameAlt, enabled: canWrite,
          decoration: InputDecoration(labelText: s.raw('print.shopNameAlt'))),
      TextField(controller: _address, enabled: canWrite,
          decoration: InputDecoration(labelText: s.raw('common.address'))),
      TextField(controller: _phone, enabled: canWrite,
          decoration: InputDecoration(labelText: s.raw('common.phone'))),
      const SizedBox(height: 8),
      if (canWrite)
        FilledButton(
          onPressed: () async {
            final done = await store.updateSettings({
              'shopName': _name.text.trim(),
              'shopNameAlt': _nameAlt.text.trim().isEmpty ? null : _nameAlt.text.trim(),
              'address': _address.text.trim(),
              'phone': _phone.text.trim(),
            });
            if (context.mounted && done) f3Notice(context, s.raw('settings.saved'));
          },
          child: Text(s.raw('action.save')),
        ),
    ]);
  }
}

/* ---------------- money accounts ---------------- */

class _AccountsSection extends StatelessWidget {
  const _AccountsSection();

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final canWrite = can(store.role, 'accountsManage', 'write');
    return _section(context, s.raw('settings.acct.title'), [
      Text(s.raw('settings.acct.sub')),
      const SizedBox(height: 4),
      for (final a in store.accounts)
        ListTile(
          dense: true,
          title: Text(a.name),
          subtitle: Text([
            s.raw('settings.acct.kind${a.kind == 'cash' ? 'Cash' : a.kind == 'bank' ? 'Bank' : 'Wallet'}'),
            if (a.method != null) '${s.raw('settings.acct.defaultBadge')}: ${a.method}',
            if (a.legacyFor != null) s.raw('settings.acct.legacyNote'),
            if (a.archived) s.raw('settings.acct.archived'),
          ].join(' · ')),
          trailing: Row(mainAxisSize: MainAxisSize.min, children: [
            Text(fmtRs(refNormalBalance(store.journal, glForAccount(a), a.id))),
            if (canWrite && !a.archived)
              PopupMenuButton<String>(
                onSelected: (v) {
                  if (v == 'rename') _renameAccount(context, a);
                  if (v == 'archive') store.archiveMoneyAccount(a.id);
                  if (v.startsWith('def:')) {
                    store.setDefaultMoneyAccount(a.id, v.substring(4));
                  }
                },
                itemBuilder: (context) => [
                  PopupMenuItem(value: 'rename', child: Text(s.raw('settings.acct.rename'))),
                  for (final m in const ['cash', 'jazzcash', 'easypaisa', 'bank'])
                    if ((m == 'cash') == (a.kind == 'cash'))
                      PopupMenuItem(value: 'def:$m', child: Text('${s.raw('settings.acct.defaultShort')}: $m')),
                  if (a.legacyFor == null)
                    PopupMenuItem(value: 'archive', child: Text(s.raw('settings.acct.archive'))),
                ],
              ),
          ]),
        ),
      if (canWrite)
        Wrap(spacing: 8, children: [
          FilledButton.icon(
            onPressed: () => _addAccount(context),
            icon: const Icon(Icons.add, size: 16),
            label: Text(s.raw('settings.acct.add')),
          ),
          OutlinedButton.icon(
            onPressed: () => _transfer(context),
            icon: const Icon(Icons.swap_horiz, size: 16),
            label: Text(s.raw('settings.acct.transfer')),
          ),
        ]),
    ]);
  }
}

Future<void> _addAccount(BuildContext context) async {
  final s = S.current;
  final store = context.read<ShopStore>();
  final name = TextEditingController();
  var kind = 'cash';
  final ok = await showDialog<bool>(
    context: context,
    builder: (context) => StatefulBuilder(
      builder: (context, setLocal) => AlertDialog(
        title: Text(s.raw('settings.acct.addTitle')),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: name, decoration: InputDecoration(labelText: s.raw('settings.acct.name'))),
          DropdownButtonFormField<String>(
            initialValue: kind,
            decoration: InputDecoration(labelText: s.raw('settings.acct.kind')),
            items: [
              DropdownMenuItem(value: 'cash', child: Text(s.raw('settings.acct.kindCash'))),
              DropdownMenuItem(value: 'bank', child: Text(s.raw('settings.acct.kindBank'))),
              DropdownMenuItem(value: 'wallet', child: Text(s.raw('settings.acct.kindWallet'))),
            ],
            onChanged: (v) => setLocal(() => kind = v ?? 'cash'),
          ),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(s.raw('action.cancel'))),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(s.raw('settings.acct.add'))),
        ],
      ),
    ),
  );
  if (ok != true || !context.mounted) return;
  final done = await store.addMoneyAccount(name: name.text, kind: kind);
  if (context.mounted && !done) f3Notice(context, s.raw('settings.acct.errName'));
}

Future<void> _renameAccount(BuildContext context, MoneyAccount a) async {
  final s = S.current;
  final store = context.read<ShopStore>();
  final name = TextEditingController(text: a.name);
  final ok = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(s.raw('settings.acct.rename')),
      content: TextField(controller: name, decoration: InputDecoration(labelText: s.raw('settings.acct.name'))),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: Text(s.raw('action.cancel'))),
        FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(s.raw('action.save'))),
      ],
    ),
  );
  if (ok == true) await store.renameMoneyAccount(a.id, name.text);
}

Future<void> _transfer(BuildContext context) async {
  final s = S.current;
  final store = context.read<ShopStore>();
  final live = store.accounts.where((a) => !a.archived).toList();
  if (live.length < 2) return;
  MoneyAccount from = live.first;
  MoneyAccount to = live[1];
  final amount = TextEditingController();
  final note = TextEditingController();
  final ok = await showDialog<bool>(
    context: context,
    builder: (context) => StatefulBuilder(
      builder: (context, setLocal) => AlertDialog(
        title: Text(s.raw('settings.acct.transferTitle')),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          DropdownButtonFormField<String>(
            initialValue: from.id,
            decoration: InputDecoration(labelText: s.raw('settings.acct.from')),
            items: [for (final a in live) DropdownMenuItem(value: a.id, child: Text(a.name))],
            onChanged: (v) => setLocal(() => from = live.firstWhere((a) => a.id == v)),
          ),
          DropdownButtonFormField<String>(
            initialValue: to.id,
            decoration: InputDecoration(labelText: s.raw('settings.acct.to')),
            items: [for (final a in live) DropdownMenuItem(value: a.id, child: Text(a.name))],
            onChanged: (v) => setLocal(() => to = live.firstWhere((a) => a.id == v)),
          ),
          TextField(controller: amount, keyboardType: TextInputType.number,
              decoration: InputDecoration(labelText: s.raw('settings.acct.amount'))),
          TextField(controller: note, decoration: InputDecoration(labelText: s.raw('settings.acct.note'))),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(s.raw('action.cancel'))),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(s.raw('settings.acct.doTransfer'))),
        ],
      ),
    ),
  );
  if (ok != true || !context.mounted) return;
  final done = await store.transferFunds(
    from: from, to: to, amount: double.tryParse(amount.text) ?? 0, note: note.text.trim(),
  );
  if (context.mounted) {
    f3Notice(context, done ? s.raw('settings.acct.transferDone') : s.raw('settings.acct.errAmount'));
  }
}

/* ---------------- tax slabs ---------------- */

class _TaxSection extends StatelessWidget {
  const _TaxSection();

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final canWrite = can(store.role, 'taxSlabs', 'write');
    return _section(context, s.raw('tax.title'), [
      Text(s.raw('tax.sub')),
      for (final t in store.taxSlabs)
        ListTile(
          dense: true,
          title: Text(t.name),
          subtitle: Text([
            t.kind == 'percent' ? '${t.rate}% ${s.raw('tax.ratePercent')}' : '${fmtRs(t.rate)} ${s.raw('tax.rateFixed')}',
            s.raw(t.appliesTo == 'both' ? 'tax.appliesBoth' : t.appliesTo == 'sales' ? 'tax.appliesSales' : 'tax.appliesPurchases'),
            if (t.inclusive) s.raw('tax.inclusiveBadge') else s.raw('tax.exclusiveBadge'),
            if (t.id == store.settings.defaultSalesTaxSlabId) s.raw('tax.defaultSales'),
            if (t.id == store.settings.defaultPurchaseTaxSlabId) s.raw('tax.defaultPurchases'),
            if (!t.active) s.raw('tax.inactive'),
          ].join(' · ')),
          trailing: canWrite
              ? PopupMenuButton<String>(
                  onSelected: (v) async {
                    if (v == 'edit') _taxEditor(context, t);
                    if (v == 'delete') {
                      final done = await store.deleteTaxSlab(t.id);
                      if (context.mounted && done) f3Notice(context, s.raw('tax.removed'));
                    }
                    if (v == 'defSales') store.setTaxDefault('sales', t.id);
                    if (v == 'defPurchase') store.setTaxDefault('purchase', t.id);
                  },
                  itemBuilder: (context) => [
                    PopupMenuItem(value: 'edit', child: Text(s.raw('tax.edit'))),
                    PopupMenuItem(value: 'defSales', child: Text(s.raw('tax.defaultSales'))),
                    PopupMenuItem(value: 'defPurchase', child: Text(s.raw('tax.defaultPurchases'))),
                    PopupMenuItem(value: 'delete', child: Text(s.raw('action.delete'))),
                  ],
                )
              : null,
        ),
      if (store.taxSlabs.isEmpty) Text(s.raw('tax.empty')),
      if (canWrite)
        FilledButton.icon(
          onPressed: () => _taxEditor(context, null),
          icon: const Icon(Icons.add, size: 16),
          label: Text(s.raw('tax.add')),
        ),
    ]);
  }
}

Future<void> _taxEditor(BuildContext context, TaxSlab? existing) async {
  final s = S.current;
  final store = context.read<ShopStore>();
  final name = TextEditingController(text: existing?.name ?? '');
  final rate = TextEditingController(text: existing?.rate.toString() ?? '');
  var kind = existing?.kind ?? 'percent';
  var appliesTo = existing?.appliesTo ?? 'both';
  var inclusive = existing?.inclusive ?? false;
  var isDefault = existing?.isDefault ?? false;
  var active = existing?.active ?? true;
  final ok = await showDialog<bool>(
    context: context,
    builder: (context) => StatefulBuilder(
      builder: (context, setLocal) => AlertDialog(
        title: Text(s.raw(existing == null ? 'tax.addTitle' : 'tax.editTitle')),
        content: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(controller: name, decoration: InputDecoration(labelText: s.raw('tax.name'))),
            DropdownButtonFormField<String>(
              initialValue: kind,
              decoration: InputDecoration(labelText: s.raw('tax.kind')),
              items: [
                DropdownMenuItem(value: 'percent', child: Text(s.raw('tax.kindPercent'))),
                DropdownMenuItem(value: 'fixed', child: Text(s.raw('tax.kindFixed'))),
              ],
              onChanged: (v) => setLocal(() => kind = v ?? 'percent'),
            ),
            TextField(controller: rate, keyboardType: TextInputType.number,
                decoration: InputDecoration(labelText: s.raw(kind == 'percent' ? 'tax.ratePercent' : 'tax.rateFixed'))),
            DropdownButtonFormField<String>(
              initialValue: appliesTo,
              decoration: InputDecoration(labelText: s.raw('tax.appliesTo')),
              items: [
                DropdownMenuItem(value: 'sales', child: Text(s.raw('tax.appliesSales'))),
                DropdownMenuItem(value: 'purchase', child: Text(s.raw('tax.appliesPurchases'))),
                DropdownMenuItem(value: 'both', child: Text(s.raw('tax.appliesBoth'))),
              ],
              onChanged: (v) => setLocal(() => appliesTo = v ?? 'both'),
            ),
            SwitchListTile(value: inclusive, onChanged: (v) => setLocal(() => inclusive = v),
                title: Text(s.raw('tax.inclusive'))),
            SwitchListTile(value: isDefault, onChanged: (v) => setLocal(() => isDefault = v),
                title: Text(s.raw('tax.defaultBadge'))),
            if (existing != null)
              SwitchListTile(value: active, onChanged: (v) => setLocal(() => active = v),
                  title: Text(s.raw('tax.active'))),
          ]),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(s.raw('action.cancel'))),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(s.raw('action.save'))),
        ],
      ),
    ),
  );
  if (ok != true || !context.mounted) return;
  final r = double.tryParse(rate.text) ?? -1;
  final bool done;
  if (existing == null) {
    done = await store.addTaxSlab(
      name: name.text, kind: kind, rate: r, appliesTo: appliesTo,
      inclusive: inclusive, isDefault: isDefault,
    );
  } else {
    done = await store.updateTaxSlab(existing.copyWith(
      name: name.text.trim(), kind: kind, rate: r, appliesTo: appliesTo,
      inclusive: inclusive, isDefault: isDefault, active: active,
    ));
  }
  if (context.mounted) {
    f3Notice(context, done ? s.raw('tax.saved') : s.raw('tax.errName'));
  }
}

/* ---------------- document numbering ---------------- */

class _SeriesSection extends StatefulWidget {
  const _SeriesSection();
  @override
  State<_SeriesSection> createState() => _SeriesSectionState();
}

class _SeriesSectionState extends State<_SeriesSection> {
  final Map<String, TextEditingController> _ctrls = {};
  bool _seeded = false;

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    if (!_seeded) {
      _seeded = true;
      for (final id in seriesIds) {
        _ctrls[id] = TextEditingController(text: store.settings.docSeries[id] ?? seriesDefaultPrefix[id]);
      }
    }
    return _section(context, s.raw('settings.docSeriesTitle'), [
      Text(s.raw('settings.docSeriesSub')),
      for (final id in seriesIds)
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 2),
          child: Row(children: [
            Expanded(child: Text(s.raw('settings.series.$id'))),
            SizedBox(
              width: 110,
              child: TextField(controller: _ctrls[id], decoration: const InputDecoration(isDense: true)),
            ),
          ]),
        ),
      const SizedBox(height: 8),
      FilledButton(
        onPressed: () async {
          final done = await store.updateSettings({
            'docSeries': {for (final id in seriesIds) id: _ctrls[id]!.text},
          });
          if (context.mounted && done) f3Notice(context, s.raw('settings.docSeriesSaved'));
        },
        child: Text(s.raw('action.save')),
      ),
    ]);
  }
}

/* ---------------- job stages ---------------- */

class _JobStagesSection extends StatefulWidget {
  const _JobStagesSection();
  @override
  State<_JobStagesSection> createState() => _JobStagesSectionState();
}

class _JobStagesSectionState extends State<_JobStagesSection> {
  List<String>? _stages;
  final _new = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final stages = _stages ??= [...store.settings.jobStages];
    return _section(context, s.raw('job.stages.title'), [
      Text(s.raw('job.stages.sub')),
      for (var i = 0; i < stages.length; i++)
        ListTile(
          dense: true,
          leading: Text('${i + 1}'),
          title: Text(stages[i]),
          trailing: Row(mainAxisSize: MainAxisSize.min, children: [
            IconButton(icon: const Icon(Icons.arrow_upward, size: 16),
                onPressed: i == 0 ? null : () => setState(() {
                      final v = stages.removeAt(i);
                      stages.insert(i - 1, v);
                    })),
            IconButton(icon: const Icon(Icons.arrow_downward, size: 16),
                onPressed: i == stages.length - 1 ? null : () => setState(() {
                      final v = stages.removeAt(i);
                      stages.insert(i + 1, v);
                    })),
            IconButton(icon: const Icon(Icons.close, size: 16),
                onPressed: stages.length <= 1 ? null : () => setState(() => stages.removeAt(i))),
          ]),
        ),
      Row(children: [
        Expanded(child: TextField(controller: _new,
            decoration: InputDecoration(labelText: s.raw('action.add'), isDense: true))),
        IconButton(
          icon: const Icon(Icons.add),
          onPressed: () {
            final v = _new.text.trim();
            if (v.isEmpty) return;
            setState(() {
              stages.add(v);
              _new.clear();
            });
          },
        ),
      ]),
      const SizedBox(height: 8),
      FilledButton(
        onPressed: () async {
          final done = await store.updateSettings({'jobStages': stages});
          if (context.mounted && done) f3Notice(context, s.raw('job.stages.saved'));
        },
        child: Text(s.raw('action.save')),
      ),
    ]);
  }
}

/* ---------------- print design ---------------- */

class _PrintDesignSection extends StatefulWidget {
  const _PrintDesignSection();
  @override
  State<_PrintDesignSection> createState() => _PrintDesignSectionState();
}

class _PrintDesignSectionState extends State<_PrintDesignSection> {
  Map<String, dynamic>? _design;
  final _footer = TextEditingController();
  final _thanks = TextEditingController();
  bool _seeded = false;

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final raw = (store.ownerDoc['printDesign'] as Map?)?.cast<String, dynamic>() ?? {};
    _design ??= Map<String, dynamic>.from(raw);
    if (!_seeded) {
      _seeded = true;
      _footer.text = raw['footerNote']?.toString() ?? '';
      _thanks.text = raw['thanksText']?.toString() ?? '';
    }
    final d = _design!;
    bool b(String k, bool def) => d[k] is bool ? d[k] as bool : def;
    String str(String k, String def) => d[k]?.toString() ?? def;
    final view = resolvePrintDesign({'printDesign': d});
    final sample = ReceiptData(
      shopName: store.settings.shopName,
      shopPhone: store.settings.phone,
      shopAddress: store.settings.address,
      logoDataUrl: brandingDataUrls(store.brandingAssets)['logo'],
      billNoLabel: 'INV-0001',
      dateLabel: todayPktISO(),
      customerLabel: s.raw('print.previewBill'),
      customerPhone: null,
      lines: const [
        (name: 'Sample item', urduName: null, sku: 'SKU-1', qty: 2, unitPrice: 500, lineTotal: 1000, tax: 0),
      ],
      subtotal: 1000, discount: 0, tax: 0, total: 1000,
      payments: const [(label: 'Cash', amount: 1000)],
      creditPart: 0,
      design: view,
      raastIban: view.showRaastQr ? store.ownerDoc['raastIban']?.toString() : null,
    );
    return _section(context, s.raw('print.title'), [
      Text(s.raw('print.sub')),
      DropdownButtonFormField<String>(
        initialValue: str('paper', 'a4'),
        decoration: InputDecoration(labelText: s.raw('print.paper')),
        items: [
          DropdownMenuItem(value: 'a4', child: Text(s.raw('print.paper.a4'))),
          DropdownMenuItem(value: 'a4-compact', child: Text(s.raw('print.paper.a4compact'))),
          DropdownMenuItem(value: 'a5', child: Text(s.raw('print.paper.a5'))),
          DropdownMenuItem(value: 'thermal80', child: Text(s.raw('print.paper.thermal80'))),
        ],
        onChanged: (v) => setState(() => d['paper'] = v),
      ),
      DropdownButtonFormField<String>(
        initialValue: str('fontScale', 'standard'),
        decoration: InputDecoration(labelText: s.raw('print.fontScale')),
        items: [
          DropdownMenuItem(value: 'standard', child: Text(s.raw('print.fontScale.standard'))),
          DropdownMenuItem(value: 'large', child: Text(s.raw('print.fontScale.large'))),
        ],
        onChanged: (v) => setState(() => d['fontScale'] = v),
      ),
      DropdownButtonFormField<String>(
        initialValue: str('headerMode', 'text'),
        decoration: InputDecoration(labelText: s.raw('print.headerMode')),
        items: [
          DropdownMenuItem(value: 'text', child: Text(s.raw('print.headerMode.text'))),
          DropdownMenuItem(value: 'logoText', child: Text(s.raw('print.headerMode.logoText'))),
          DropdownMenuItem(value: 'letterhead', child: Text(s.raw('print.headerMode.letterhead'))),
        ],
        onChanged: (v) => setState(() => d['headerMode'] = v),
      ),
      DropdownButtonFormField<String>(
        initialValue: str('stampMode', 'paid'),
        decoration: InputDecoration(labelText: s.raw('print.brand.stampMode')),
        items: [
          DropdownMenuItem(value: 'paid', child: Text(s.raw('print.brand.stampPaid'))),
          DropdownMenuItem(value: 'paidDue', child: Text(s.raw('print.brand.stampAlso'))),
          DropdownMenuItem(value: 'off', child: Text(s.raw('print.brand.stampNever'))),
        ],
        onChanged: (v) => setState(() => d['stampMode'] = v),
      ),
      for (final (key, label) in [
        ('showLogo', 'print.showLogo'),
        ('showShopName', 'print.showShopName'),
        ('showAddress', 'print.showAddress'),
        ('showPhone', 'print.showPhone'),
        ('colSku', 'print.colSku'),
        ('colUrduName', 'print.colUrduName'),
        ('colTax', 'print.colTax'),
        ('colDiscount', 'print.colDiscount'),
        ('showThanks', 'print.showThanks'),
        ('showRaastQr', 'print.raast.showToggle'),
        ('raastDynamic', 'print.raast.dynamicToggle'),
      ])
        SwitchListTile(
          value: b(key, key == 'showShopName' || key == 'showAddress' || key == 'showPhone' || key == 'showThanks' || key == 'raastDynamic'),
          onChanged: (v) => setState(() => d[key] = v),
          title: Text(s.raw(label)),
          dense: true,
        ),
      TextField(controller: _footer, decoration: InputDecoration(labelText: s.raw('print.footerNote'))),
      TextField(controller: _thanks, decoration: InputDecoration(labelText: s.raw('print.thanksText'))),
      const SizedBox(height: 8),
      FilledButton(
        onPressed: () async {
          final patch = Map<String, dynamic>.from(d)
            ..['footerNote'] = _footer.text
            ..['thanksText'] = _thanks.text;
          final done = await store.updateSettings({'printDesign': patch});
          if (context.mounted && done) f3Notice(context, s.raw('print.saved'));
        },
        child: Text(s.raw('action.save')),
      ),
      const SizedBox(height: 12),
      Text(s.raw('print.previewTitle'), style: Theme.of(context).textTheme.titleSmall),
      const SizedBox(height: 6),
      Center(
        child: ReceiptView(
          data: sample,
          money: (v) => fmtRs(v),
          totalLabel: s.raw('common.total'),
          discountLabel: s.raw('print.col.discount'),
          taxLabel: s.raw('print.col.tax'),
          thanksFallback: s.raw('billing.rcpt.thanks'),
          width: 302,
        ),
      ),
    ]);
  }
}

/* ---------------- brand assets ---------------- */

class _BrandingSection extends StatelessWidget {
  const _BrandingSection();

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final byKind = brandingByKind(store.brandingAssets);
    final total = brandingTotalBytes(store.brandingAssets);
    return _section(context, s.raw('print.brand.title'), [
      Text(s.raw('print.brand.sub')),
      Text('${s.raw('print.brand.totalLine')}: ${(total / 1000).toStringAsFixed(1)} KB / ${(brandingTotalCapBytes / 1000).toStringAsFixed(0)} KB'),
      for (final kind in brandingKinds)
        ListTile(
          dense: true,
          leading: byKind[kind] != null
              ? Image.memory(base64Decode(byKind[kind]!.dataUrl.split(',').last),
                  width: 40, height: 40, fit: BoxFit.contain)
              : const Icon(Icons.image_outlined),
          title: Text(s.raw(kind == 'raastQrImage' ? 'print.brand.raastQr' : 'print.brand.$kind')),
          subtitle: Text(byKind[kind] == null
              ? s.raw('print.brand.empty')
              : '${byKind[kind]!.width}×${byKind[kind]!.height} · '
                  '${(byKind[kind]!.bytes / 1000).toStringAsFixed(1)} KB'),
          trailing: Row(mainAxisSize: MainAxisSize.min, children: [
            TextButton(
              onPressed: () => _pickAsset(context, kind),
              child: Text(s.raw(byKind[kind] == null ? 'print.brand.upload' : 'print.brand.replace')),
            ),
            if (byKind[kind] != null)
              TextButton(
                onPressed: () async {
                  await store.removeBrandingAsset(kind);
                  if (context.mounted) f3Notice(context, s.raw('print.brand.removed'));
                },
                child: Text(s.raw('print.brand.remove')),
              ),
          ]),
        ),
      Text(s.raw('print.brand.capNote'), style: Theme.of(context).textTheme.bodySmall),
      if (byKind['raastQrImage'] != null) Text(s.raw('print.brand.raastNote')),
    ]);
  }
}

Future<void> _pickAsset(BuildContext context, String kind) async {
  final s = S.current;
  final store = context.read<ShopStore>();
  final picked = await FilePicker.platform.pickFiles(type: FileType.image, withData: true);
  final bytes = picked?.files.single.bytes;
  if (bytes == null || !context.mounted) return;
  final decoded = img.decodeImage(bytes);
  if (decoded == null) {
    f3Notice(context, s.raw('print.brand.badType'));
    return;
  }
  final hasAlpha = decoded.hasAlpha;
  final outcome = runCompressionPlan(
    kind,
    width: decoded.width,
    height: decoded.height,
    hasAlpha: hasAlpha,
    encode: (step) {
      final resized = img.copyResize(decoded, width: step.width, height: step.height);
      final List<int> out;
      final String mime;
      if (step.mime == 'image/png') {
        out = img.encodePng(resized);
        mime = 'image/png';
      } else if (step.mime == 'image/webp') {
        // The `image` package has no WebP encoder; the ladder's
        // PNG/JPEG steps carry the plan on this platform.
        out = img.encodePng(resized);
        mime = 'image/png';
      } else {
        out = img.encodeJpg(resized, quality: (step.quality ?? 0.82) * 100 ~/ 1);
        mime = 'image/jpeg';
      }
      final dataUrl = 'data:$mime;base64,${base64Encode(out)}';
      return (dataUrl: dataUrl, bytes: out.length);
    },
  );
  if (!outcome.ok || outcome.dataUrl == null || outcome.step == null) {
    if (context.mounted) {
      f3Notice(context,
          '${s.raw('print.brand.tooLarge')}: ${(outcome.lastBytes / 1000).toStringAsFixed(1)} KB > ${(outcome.capBytes / 1000).toStringAsFixed(0)} KB');
    }
    return;
  }
  final asset = buildBrandingAsset(
    kind,
    outcome.dataUrl!,
    outcome.step!.width.toDouble(),
    outcome.step!.height.toDouble(),
    DateTime.now().toUtc().toIso8601String(),
  );
  if (asset == null) {
    if (context.mounted) f3Notice(context, s.raw('print.brand.tooLarge'));
    return;
  }
  final done = await store.setBrandingAsset(asset);
  if (context.mounted && done) f3Notice(context, s.raw('print.brand.saved'));
}

/// PkIbanResult codes → the dictionary's print.raast.err.* keys.
String _ibanErrKey(String? code) => switch (code) {
      'alias' => 'alias',
      'notPk' => 'notPk',
      'badLength' => 'length',
      'badChecksum' => 'checksum',
      _ => 'format',
    };

/* ---------------- Raast ---------------- */

class _RaastSection extends StatefulWidget {
  const _RaastSection();
  @override
  State<_RaastSection> createState() => _RaastSectionState();
}

class _RaastSectionState extends State<_RaastSection> {
  final _iban = TextEditingController();
  final _fiName = TextEditingController();
  bool _seeded = false;

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    if (!_seeded) {
      _seeded = true;
      _iban.text = store.ownerDoc['raastIban']?.toString() ?? '';
      _fiName.text = store.ownerDoc['raastFiName']?.toString() ?? '';
    }
    final check = _iban.text.trim().isEmpty ? null : validatePkIban(_iban.text);
    final fiError = _fiName.text.trim().isEmpty ? null : validateRaastFiName(_fiName.text);
    return _section(context, s.raw('print.raast.title'), [
      Text(s.raw('print.raast.sub')),
      TextField(
        controller: _iban,
        onChanged: (_) => setState(() {}),
        decoration: InputDecoration(
          labelText: s.raw('print.raast.ibanLabel'),
          helperText: check == null
              ? null
              : check.ok
                  ? groupIban(check.iban)
                  : s.raw('print.raast.err.${_ibanErrKey(check.code)}'),
        ),
      ),
      TextField(
        controller: _fiName,
        onChanged: (_) => setState(() {}),
        decoration: InputDecoration(
          labelText: s.raw('print.raast.fiLabel'),
          helperText: fiError == null ? null : s.raw('print.raast.err.fi'),
        ),
      ),
      const SizedBox(height: 6),
      Text(s.raw('print.raast.provisional'),
          style: TextStyle(color: Theme.of(context).colorScheme.tertiary)),
      Text(s.raw('print.raast.dynamicNote'), style: Theme.of(context).textTheme.bodySmall),
      const SizedBox(height: 8),
      FilledButton(
        onPressed: (check != null && !check.ok) || fiError != null
            ? null
            : () async {
                final done = await store.updateSettings({
                  'raastIban': check?.iban ?? '',
                  'raastFiName': _fiName.text.trim(),
                });
                if (context.mounted && done) f3Notice(context, s.raw('print.raast.saved'));
              },
        child: Text(s.raw('action.save')),
      ),
    ]);
  }
}

/* ---------------- periods ---------------- */

class _PeriodsSection extends StatelessWidget {
  const _PeriodsSection();

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final history = store.periods.where((p) => p.kind == 'period').toList()
      ..sort((a, b) => b.ts.compareTo(a.ts));
    return _section(context, s.raw('settings.per.lockTitle'), [
      Text(store.lockedThrough.isEmpty
          ? s.raw('settings.per.open')
          : '${s.raw('settings.per.closed')}: ${fmtDate(store.lockedThrough)}'),
      const SizedBox(height: 6),
      Wrap(spacing: 8, children: [
        FilledButton.icon(
          onPressed: () => _closePeriod(context),
          icon: const Icon(Icons.lock_outline, size: 16),
          label: Text(s.raw('settings.per.close')),
        ),
        OutlinedButton.icon(
          onPressed: store.lockedThrough.isEmpty ? null : () => _reopenPeriod(context),
          icon: const Icon(Icons.lock_open_outlined, size: 16),
          label: Text(s.raw('settings.per.reopen')),
        ),
      ]),
      if (history.isNotEmpty) ...[
        const Divider(),
        Text(s.raw('settings.per.historyTitle'), style: Theme.of(context).textTheme.titleSmall),
        for (final p in history.take(12))
          ListTile(
            dense: true,
            leading: Icon(p.action == 'close' ? Icons.lock_outline : Icons.lock_open_outlined, size: 16),
            title: Text('${fmtDate(p.from)} → ${p.to.isEmpty ? '—' : fmtDate(p.to)}'),
            subtitle: Text('${p.byEmail} · ${fmtDate(p.ts)}${p.note.isNotEmpty ? ' · ${p.note}' : ''}'),
          ),
      ],
    ]);
  }
}

Future<void> _closePeriod(BuildContext context) async {
  final s = S.current;
  final store = context.read<ShopStore>();
  final date = TextEditingController(text: todayPktISO());
  final note = TextEditingController();
  final ok = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(s.raw('settings.per.close')),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        Text(s.raw('settings.per.closeConfirm')),
        TextField(controller: date, decoration: InputDecoration(labelText: s.raw('settings.per.closeLabel'), hintText: 'YYYY-MM-DD')),
        TextField(controller: note, decoration: InputDecoration(labelText: s.raw('settings.per.closeNote'))),
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: Text(s.raw('action.cancel'))),
        FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(s.raw('settings.per.actionClose'))),
      ],
    ),
  );
  if (ok != true || !context.mounted) return;
  final gated = await runSensitiveGate(context, 'periodClose');
  if (!gated || !context.mounted) return;
  final res = await store.closePeriod(date.text.trim(), note: note.text);
  if (context.mounted && !res.ok) {
    f3Notice(context, s.raw(_periodErrorKey(res.reason)));
  }
}

/// PeriodActionResult reasons → the dictionary's settings.per
/// error keys (capitalised suffixes, web parity).
String _periodErrorKey(String? reason) => switch (reason) {
      'rail' => 'settings.per.errRail',
      'backwards' => 'settings.per.errBackwards',
      'invalid' => 'settings.per.errDate',
      'reason' => 'settings.per.errReason',
      'nothing' => 'settings.per.errNothing',
      _ => 'common.accessDenied',
    };

Future<void> _reopenPeriod(BuildContext context) async {
  final s = S.current;
  final store = context.read<ShopStore>();
  final date = TextEditingController();
  final reason = TextEditingController();
  final ok = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(s.raw('settings.per.reopen')),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: date, decoration: InputDecoration(labelText: s.raw('settings.per.reopenLabel'), hintText: 'YYYY-MM-DD')),
        TextField(controller: reason, decoration: InputDecoration(labelText: s.raw('settings.per.reason'))),
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: Text(s.raw('action.cancel'))),
        FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(s.raw('settings.per.actionReopen'))),
      ],
    ),
  );
  if (ok != true || !context.mounted) return;
  final gated = await runSensitiveGate(context, 'periodReopen');
  if (!gated || !context.mounted) return;
  final res = await store.reopenPeriod(
    date.text.trim().isEmpty ? null : date.text.trim(),
    reason.text,
  );
  if (context.mounted && !res.ok) {
    f3Notice(context, s.raw(_periodErrorKey(res.reason)));
  }
}

/* ---------------- fiscal-year close ---------------- */

class _FiscalSection extends StatefulWidget {
  const _FiscalSection();
  @override
  State<_FiscalSection> createState() => _FiscalSectionState();
}

class _FiscalSectionState extends State<_FiscalSection> {
  String? _fyStart;
  bool _ack = false;

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    _fyStart ??= previousFiscalYear(store.settings).startDate;
    final range = fiscalYearRange(store.settings, startOfDayPktInstant(_fyStart!));
    final state = fiscalCloseState(store.journal, store.periods, range);
    final checklist = fiscalYearCloseChecklist(
      journal: store.journal, payrollRuns: store.payrollRuns,
      productionOrders: store.productionOrders, cheques: store.cheques,
      products: store.products, range: range, lockedThrough: store.lockedThrough,
    );
    final summary = state.closed && state.entry != null
        ? closingEntrySummary(state.entry!)
        : null;
    final openings = state.closed
        ? balanceSheetBalances(store.journal, range.toTs)
        : const <AccountBalanceRow>[];
    return _section(context, s.raw('fin.fy.title'), [
      Text(s.raw('fin.fy.caption')),
      Row(children: [
        Expanded(child: Text('${s.raw('fin.fy.pick')}: ${fyLabel(range)}')),
        IconButton(icon: const Icon(Icons.chevron_left),
            onPressed: () => setState(() => _fyStart = _shiftFy(store, -1))),
        IconButton(icon: const Icon(Icons.chevron_right),
            onPressed: () => setState(() => _fyStart = _shiftFy(store, 1))),
      ]),
      Chip(label: Text(s.raw(state.closed ? 'fin.fy.statusClosed' : 'fin.fy.statusOpen'))),
      const SizedBox(height: 6),
      Text(s.raw('fin.fy.checklist'), style: Theme.of(context).textTheme.titleSmall),
      for (final item in checklist.items)
        ListTile(
          dense: true,
          leading: Icon(
            item.severity == 'gate'
                ? (item.triggered ? Icons.error_outline : Icons.check_circle_outline)
                : item.severity == 'warning'
                    ? (item.triggered ? Icons.warning_amber_outlined : Icons.check_circle_outline)
                    : Icons.info_outline,
            size: 18,
          ),
          title: Text(s.raw('fin.fy.check.${_checkKey(item.id)}')),
          subtitle: Text(s.raw(item.id == 'lock'
              ? (checklist.lockCoversFyEnd ? 'fin.fy.check.lockAlready' : 'fin.fy.check.lockWill')
              : 'fin.fy.check.${_checkKey(item.id)}Detail')),
        ),
      if (summary != null) ...[
        const Divider(),
        Text(s.raw('fin.fy.summaryTitle'), style: Theme.of(context).textTheme.titleSmall),
        _kvRow(s.raw(summary.net >= 0 ? 'fin.fy.summaryNetProfit' : 'fin.fy.summaryNetLoss'),
            fmtRs(summary.net.abs())),
        _kvRow(s.raw('fin.fy.closedOn'), fmtDate(state.closeDoc?.ts ?? '')),
      ],
      if (state.closed) ...[
        const Divider(),
        Text(s.raw('fin.fy.openingsTitle'), style: Theme.of(context).textTheme.titleSmall),
        Text(s.raw('fin.fy.openingsCaption'), style: Theme.of(context).textTheme.bodySmall),
        if (openings.isEmpty) Text(s.raw('fin.fy.openingsEmpty')),
        for (final o in openings) _kvRow(accountLabel(o.account), fmtRs(o.balance)),
      ],
      const SizedBox(height: 8),
      if (!state.closed) ...[
        if (checklist.warningIds.isNotEmpty)
          CheckboxListTile(
            value: _ack,
            onChanged: (v) => setState(() => _ack = v ?? false),
            title: Text(s.raw('fin.fy.ackWarnings')),
            dense: true,
          ),
        FilledButton.icon(
          onPressed: () => _closeFy(context, range.startDate),
          icon: const Icon(Icons.lock_outline, size: 16),
          label: Text(s.raw('fin.fy.close')),
        ),
      ] else
        OutlinedButton.icon(
          onPressed: () => _reopenFy(context, range.startDate),
          icon: const Icon(Icons.lock_open_outlined, size: 16),
          label: Text(s.raw('fin.fy.reopen')),
        ),
    ]);
  }

  String _shiftFy(ShopStore store, int delta) {
    final cur = fiscalYearRange(store.settings, startOfDayPktInstant(_fyStart!));
    final y = int.parse(cur.startDate.substring(0, 4)) + delta;
    final md = cur.startDate.substring(4);
    return '$y$md';
  }

  String _checkKey(String id) => switch (id) {
        'trialBalance' => 'tb',
        'purchasesClearing' => 'clearing',
        'draftPayroll' => 'draftPayroll',
        'productionPools' => 'production',
        'salaryPayable' => 'salary',
        'cheques' => 'cheques',
        'stock' => 'stock',
        'lock' => 'lock',
        _ => id,
      };

  Future<void> _closeFy(BuildContext context, String fyStart) async {
    final s = S.current;
    final store = context.read<ShopStore>();
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(s.raw('fin.fy.closeConfirmTitle')),
        content: Text(s.raw('fin.fy.closeConfirmBody')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(s.raw('action.cancel'))),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(s.raw('fin.fy.close'))),
        ],
      ),
    );
    if (confirm != true || !context.mounted) return;
    final gated = await runSensitiveGate(context, 'fiscalClose');
    if (!gated || !context.mounted) return;
    final res = await store.closeFiscalYear(fyStart, ackWarnings: _ack);
    if (context.mounted) {
      f3Notice(context, res.ok ? s.raw('fin.fy.closedNotice') : s.raw(_fyErrorKey(res.reason)));
    }
  }

  Future<void> _reopenFy(BuildContext context, String fyStart) async {
    final s = S.current;
    final store = context.read<ShopStore>();
    final reason = TextEditingController();
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(s.raw('fin.fy.reopenConfirmTitle')),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          Text(s.raw('fin.fy.reopenConfirmBody')),
          TextField(controller: reason,
              decoration: InputDecoration(labelText: s.raw('fin.fy.reopenReason'))),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(s.raw('action.cancel'))),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(s.raw('fin.fy.reopen'))),
        ],
      ),
    );
    if (confirm != true || !context.mounted) return;
    final gated = await runSensitiveGate(context, 'fiscalReopen');
    if (!gated || !context.mounted) return;
    final res = await store.reopenFiscalYear(fyStart, reason.text);
    if (context.mounted) {
      f3Notice(context, res.ok ? s.raw('fin.fy.reopenedNotice') : s.raw(_fyErrorKey(res.reason)));
    }
  }
}

/// Fiscal close/reopen reasons → the dictionary's fin.fy.err*
/// keys (the web FiscalClosePanel's mapping).
String _fyErrorKey(String? reason) => switch (reason) {
      'invalid' => 'fin.fy.errInvalid',
      'notpast' => 'fin.fy.errNotPast',
      'closed' => 'fin.fy.errClosed',
      'gate' => 'fin.fy.errGate',
      'warnings' => 'fin.fy.errWarnings',
      'locked' => 'fin.fy.errLocked',
      'notclosed' => 'fin.fy.errNotClosed',
      'stack' => 'fin.fy.errStack',
      'reason' => 'fin.fy.errReason',
      _ => 'common.accessDenied',
    };

/* ---------------- plan & renewal (G5) ---------------- */

/// The web PlanPanel, ported (design §5.4/§5.5): the plan
/// observation rows (snapshot, derived state, hard counters next
/// to the actuals derived from the shop's own collections) and
/// the renewal surface — platformConfig instructions read-only,
/// a quote that re-derives on every change, ONE platform write
/// born `submitted`, and the owner's payment history. Renders
/// nothing without a plan view (pre-G namespace); owner-only,
/// matching the web mount.
class _PlanSection extends StatefulWidget {
  const _PlanSection();
  @override
  State<_PlanSection> createState() => _PlanSectionState();
}

class _PlanSectionState extends State<_PlanSection> {
  String? _planChoice;
  String _billing = 'monthly';
  String _method = 'raast';
  final _reference = TextEditingController();
  final _note = TextEditingController();
  bool _busy = false;
  ({bool ok, String text})? _msg;

  static const _tierPlanKey = {
    'core': 'plan.name.basic',
    'standard': 'plan.name.standard',
    'advanced': 'plan.name.advanced',
  };
  static const _methodKey = {
    'raast': 'platform.pay.raast',
    'jazzcash': 'common.pay.jazzcash',
    'easypaisa': 'common.pay.easypaisa',
    'bank': 'common.pay.bank',
    'cash': 'common.pay.cash',
  };
  static const _methods = ['raast', 'jazzcash', 'easypaisa', 'bank', 'cash'];

  String _fmtDate(String? iso) {
    if (iso == null) return '—';
    final d = DateTime.tryParse(iso);
    if (d == null) return '—';
    final local = d.toLocal();
    return '${local.day} ${S.current.raw('common.month.${local.month - 1}')} ${local.year}';
  }

  String _fill(String key, Map<String, String> p) {
    var out = S.current.raw(key);
    p.forEach((k, v) => out = out.replaceAll('{$k}', v));
    return out;
  }

  String _limit(int n) => n > 0 ? '$n' : '∞';

  String _chosen(ShopStore store) =>
      _planChoice ??
      (renewablePlanIds.contains(store.planView?.snapshot.planId)
          ? store.planView!.snapshot.planId
          : 'standard');

  Future<void> _submit(ShopStore store) async {
    final s = S.current;
    if (_reference.text.trim().isEmpty) {
      setState(() => _msg = (ok: false, text: s.raw('renew.error.referenceRequired')));
      return;
    }
    setState(() {
      _busy = true;
      _msg = null;
    });
    final res = await store.submitRenewalPayment(
      planId: _chosen(store),
      billing: _billing,
      method: _method,
      reference: _reference.text,
      ownerNote: _note.text,
    );
    if (!mounted) return;
    setState(() {
      _busy = false;
      if (res.ok) {
        _reference.clear();
        _note.clear();
        _msg = (ok: true, text: s.raw('renew.submit.done'));
      } else if (res.reason == 'reference-required') {
        _msg = (ok: false, text: s.raw('renew.error.referenceRequired'));
      } else if (res.reason == 'unavailable' || res.reason == 'write-failed') {
        _msg = (ok: false, text: s.raw('renew.submit.failed'));
      } else {
        _msg = (ok: false, text: s.raw('renew.error.quoteChanged'));
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final view = store.planView;
    if (view == null) return const SizedBox.shrink();
    final snap = view.snapshot;
    final staffEmails = ((store.ownerDoc['staffEmails'] as List?) ?? const [])
        .map((e) => e.toString())
        .toList();
    final actual = deriveActualCounters(
      store.bills.map((b) => (ts: b.ts, status: b.status)).toList(),
      store.sales.map((x) => (ts: x.ts, billId: x.billId, kind: x.kind)).toList(),
      staffEmails,
      snap,
      isoUtc(DateTime.now()),
    );
    final chosen = _chosen(store);
    final quoteRes = (snap.planId == 'founding' || snap.planId == 'enterprise')
        ? null
        : renewalQuote(store.planRegistry, chosen, _billing, isoUtc(DateTime.now()));
    final cfg = store.platformConfig;
    PlatformPaymentDoc? pending;
    for (final p in store.ownPayments) {
      if (p.state == 'submitted') {
        pending = p;
        break;
      }
    }

    return Column(children: [
      _section(context, s.raw('plan.panel.title'), [
        Text(
          view.enforce ? s.raw('plan.panel.enforceOn') : s.raw('plan.panel.enforceOff'),
          style: Theme.of(context).textTheme.bodySmall,
        ),
        _kvRow(s.raw('plan.panel.plan'), s.raw('plan.name.${snap.planId}')),
        _kvRow(s.raw('plan.panel.state'), s.raw('plan.state.${view.state}')),
        _kvRow(s.raw('plan.panel.modules'), s.raw(_tierPlanKey[snap.modulesTier] ?? 'plan.name.basic')),
        if (snap.trialEndsAt != null)
          _kvRow(s.raw('plan.panel.trialEnds'), _fmtDate(snap.trialEndsAt))
        else
          _kvRow(s.raw('plan.panel.period'), '${_fmtDate(snap.periodFrom)} → ${_fmtDate(snap.periodTo)}'),
        _kvRow(
          s.raw('plan.panel.invoices'),
          '${s.raw('plan.panel.counter')}: ${view.counters?.invoiceCount ?? '—'} · '
          '${s.raw('plan.panel.actual')}: ${actual.invoiceCount} / ${_limit(snap.invoiceLimit)}',
        ),
        _kvRow(
          s.raw('plan.panel.members'),
          '${s.raw('plan.panel.counter')}: ${view.counters?.memberCount ?? '—'} · '
          '${s.raw('plan.panel.actual')}: ${actual.memberCount} / ${_limit(snap.usersLimit)}',
        ),
      ]),
      if (snap.planId != 'founding')
        _section(context, s.raw('renew.title'), [
          if (snap.planId == 'enterprise')
            Text(s.raw('renew.enterpriseNote'))
          else ...[
            Text(s.raw('renew.intro'), style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 8),
            Text(s.raw('renew.instructionsTitle'), style: Theme.of(context).textTheme.titleSmall),
            if (cfg.hasContent) ...[
              if (cfg.raastNumber.trim().isNotEmpty) _kvRow(s.raw('renew.raastNumber'), cfg.raastNumber),
              if (cfg.iban.trim().isNotEmpty) _kvRow(s.raw('renew.iban'), cfg.iban),
              if (cfg.bankName.trim().isNotEmpty) _kvRow(s.raw('renew.bank'), cfg.bankName),
              if (cfg.accountTitle.trim().isNotEmpty) _kvRow(s.raw('renew.accountTitle'), cfg.accountTitle),
              if (cfg.instructions.trim().isNotEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Text(cfg.instructions),
                ),
              if (cfg.supportContact.trim().isNotEmpty) _kvRow(s.raw('renew.supportLabel'), cfg.supportContact),
            ] else
              Text(s.raw('renew.instructionsNone'), style: Theme.of(context).textTheme.bodySmall),
            if (pending != null) ...[
              const SizedBox(height: 8),
              Text(
                '${s.raw('renew.pay.pending')} — ${s.raw('plan.name.${pending.planId}')} · '
                '${fmtRs(pending.amount)} · ${pending.reference}',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ],
            if (_msg != null) ...[
              const SizedBox(height: 8),
              Text(_msg!.text, style: TextStyle(color: _msg!.ok ? null : Theme.of(context).colorScheme.error)),
            ],
            const SizedBox(height: 8),
            Row(children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: chosen,
                  decoration: InputDecoration(labelText: s.raw('renew.planLabel'), isDense: true),
                  items: [
                    for (final id in renewablePlanIds)
                      DropdownMenuItem(value: id, child: Text(s.raw('plan.name.$id'))),
                  ],
                  onChanged: (v) => setState(() => _planChoice = v),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: _billing,
                  decoration: InputDecoration(labelText: s.raw('renew.billingLabel'), isDense: true),
                  items: [
                    DropdownMenuItem(value: 'monthly', child: Text(s.raw('renew.billing.monthly'))),
                    DropdownMenuItem(value: 'annual', child: Text(s.raw('renew.billing.annual'))),
                  ],
                  onChanged: (v) => setState(() => _billing = v ?? 'monthly'),
                ),
              ),
            ]),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              initialValue: _method,
              decoration: InputDecoration(labelText: s.raw('renew.methodLabel'), isDense: true),
              items: [
                for (final mth in _methods)
                  DropdownMenuItem(value: mth, child: Text(s.raw(_methodKey[mth]!))),
              ],
              onChanged: (v) => setState(() => _method = v ?? 'raast'),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _reference,
              decoration: InputDecoration(
                labelText: s.raw('renew.referenceLabel'),
                hintText: s.raw('renew.referenceHint'),
                isDense: true,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _note,
              decoration: InputDecoration(labelText: s.raw('renew.noteLabel'), isDense: true),
            ),
            if (quoteRes != null && quoteRes.ok) ...[
              const SizedBox(height: 8),
              Text(
                '${s.raw('renew.amount')}: ${fmtRs(quoteRes.quote!.amount)} · '
                '${_fill('renew.periodPreview', {'from': _fmtDate(quoteRes.quote!.periodFrom), 'to': _fmtDate(quoteRes.quote!.periodTo)})}',
              ),
            ],
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _busy || quoteRes == null || !quoteRes.ok ? null : () => _submit(store),
              child: Text(s.raw('renew.submit')),
            ),
            if (store.ownPayments.isNotEmpty) ...[
              const SizedBox(height: 16),
              Text(s.raw('renew.historyTitle'), style: Theme.of(context).textTheme.titleSmall),
              for (final p in store.ownPayments.take(5))
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(
                      '${s.raw(p.state == 'confirmed'
                          ? 'platform.pay.confirmed'
                          : p.state == 'rejected'
                              ? 'platform.pay.reject'
                              : 'platform.pay.submitted')} · '
                      '${s.raw('plan.name.${p.planId}')} · '
                      '${s.raw(p.billingPeriod == 'annual' ? 'renew.billing.annual' : 'renew.billing.monthly')} · '
                      '${fmtRs(p.amount)} · ${s.raw(_methodKey[p.method] ?? 'platform.pay.raast')} · ${p.reference}',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    Text(
                      '${_fmtDate(p.periodFrom)} → ${_fmtDate(p.periodTo)} · ${_fmtDate(p.submittedAt)}'
                      '${p.ownerNote != null && p.ownerNote!.isNotEmpty ? ' · ${p.ownerNote}' : ''}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    if (p.state == 'confirmed')
                      Text(
                        _fill('renew.pay.confirmedPeriod', {'date': _fmtDate(p.periodTo)}),
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    if (p.state == 'rejected')
                      Text(
                        '${p.note != null && p.note!.isNotEmpty ? '${p.note} — ' : ''}${s.raw('renew.pay.rejectedHint')}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                  ]),
                ),
            ],
          ],
        ]),
    ]);
  }
}

/* ---------------- staff & roles ---------------- */

class _StaffRolesSection extends StatelessWidget {
  const _StaffRolesSection();

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final canWrite = can(store.role, 'staffManage', 'write');
    final staff = store.staffList;
    return _section(context, s.raw('settings.staffTitle'), [
      Text(s.raw('settings.staffSub')),
      Text(s.raw('settings.staffOnlyNote'), style: Theme.of(context).textTheme.bodySmall),
      for (final m in staff)
        ListTile(
          dense: true,
          title: Text(m['email']?.toString() ?? ''),
          subtitle: Text(
            '${m['role']?.toString() ?? ''} · ${switch (store.memberStatusFor(m['email']?.toString() ?? '')) {
              'joined' => s.raw('biz.memberJoined'),
              'pending' => s.raw('biz.memberPending'),
              _ => s.raw('biz.memberLegacy'),
            }}',
          ),
          trailing: canWrite
              ? PopupMenuButton<String>(
                  onSelected: (v) {
                    if (v == 'remove') store.removeStaff(m['email']?.toString() ?? '');
                    if (v.startsWith('role:')) {
                      store.setStaffRole(m['email']?.toString() ?? '', v.substring(5));
                    }
                  },
                  itemBuilder: (context) => [
                    for (final r in const ['manager', 'cashier', 'accountant'])
                      PopupMenuItem(value: 'role:$r', child: Text('${s.raw('settings.staffRole')}: $r')),
                    PopupMenuItem(value: 'remove', child: Text(s.raw('action.remove'))),
                  ],
                )
              : null,
        ),
      if (canWrite) _AddStaffForm(),
    ]);
  }
}

class _AddStaffForm extends StatefulWidget {
  @override
  State<_AddStaffForm> createState() => _AddStaffFormState();
}

class _AddStaffFormState extends State<_AddStaffForm> {
  final _email = TextEditingController();
  String _role = 'cashier';

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    return Row(children: [
      Expanded(
        child: TextField(
          controller: _email,
          decoration: InputDecoration(
              labelText: s.raw('settings.staffEmail'),
              hintText: s.raw('settings.staffEmailPlaceholder'),
              isDense: true),
        ),
      ),
      const SizedBox(width: 8),
      DropdownButton<String>(
        value: _role,
        items: [
          for (final r in const ['manager', 'cashier', 'accountant'])
            DropdownMenuItem(value: r, child: Text(r)),
        ],
        onChanged: (v) => setState(() => _role = v ?? 'cashier'),
      ),
      IconButton(
        icon: const Icon(Icons.person_add_outlined),
        onPressed: () async {
          final email = _email.text.trim();
          if (!email.contains('@')) {
            f3Notice(context, s.raw('settings.invalidEmail'));
            return;
          }
          final done = await store.addStaff(email, _role);
          if (context.mounted && done) _email.clear();
        },
      ),
    ]);
  }
}

/* ---------------- Tally ledger names ---------------- */

/* ---------------- loyalty programme (H2) ---------------- */

/// The programme terms (design §1.7): the commercial figures live
/// in settings; every composer reads them through core/loyalty's
/// resolver, never from literals. Owner-only (rendered for the
/// owner; the save is owner-gated in the store). The form seeds
/// from the RESOLVER's values, and an unparseable number is
/// omitted from the write (the stored value survives).
class _LoyaltySection extends StatefulWidget {
  const _LoyaltySection();
  @override
  State<_LoyaltySection> createState() => _LoyaltySectionState();
}

class _LoyaltySectionState extends State<_LoyaltySection> {
  static const _fields = [
    ('earnRsPerPointBase', 'set.loyalty.earnBase'),
    ('pointValueRs', 'set.loyalty.pointValue'),
    ('redeemCapPct', 'set.loyalty.redeemCap'),
    ('expiryMonths', 'set.loyalty.expiryMonths'),
    ('silverAt', 'set.loyalty.silverAt'),
    ('goldAt', 'set.loyalty.goldAt'),
    ('silverMult', 'set.loyalty.silverMult'),
    ('goldMult', 'set.loyalty.goldMult'),
  ];
  final Map<String, TextEditingController> _ctrls = {
    for (final f in _fields) f.$1: TextEditingController(),
  };
  bool _enabled = false;
  bool _seeded = false;

  String _numStr(double v) =>
      v == v.truncateToDouble() ? v.toInt().toString() : v.toString();

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    if (!_seeded) {
      _seeded = true;
      final r = resolveLoyaltySettings(store.ownerDoc);
      _enabled = r.enabled;
      final values = <String, double>{
        'earnRsPerPointBase': r.earnRsPerPointBase,
        'pointValueRs': r.pointValueRs,
        'redeemCapPct': r.redeemCapPct,
        'expiryMonths': r.expiryMonths,
        'silverAt': r.silverAt,
        'goldAt': r.goldAt,
        'silverMult': r.silverMult,
        'goldMult': r.goldMult,
      };
      values.forEach((k, v) => _ctrls[k]!.text = _numStr(v));
    }
    return _section(context, s.raw('set.loyalty.title'), [
      Text(s.raw('set.loyalty.sub')),
      SwitchListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(s.raw('set.loyalty.enabled')),
        value: _enabled,
        onChanged: (v) => setState(() => _enabled = v),
      ),
      for (final f in _fields)
        TextField(
          controller: _ctrls[f.$1],
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: InputDecoration(labelText: s.raw(f.$2)),
        ),
      const SizedBox(height: 8),
      Text(s.raw('set.loyalty.note')),
      const SizedBox(height: 8),
      FilledButton(
        onPressed: () async {
          final loyalty = <String, dynamic>{'enabled': _enabled};
          for (final f in _fields) {
            final v = double.tryParse(_ctrls[f.$1]!.text.trim());
            if (v != null && v.isFinite) loyalty[f.$1] = v;
          }
          final done = await store.updateSettings({'loyalty': loyalty});
          if (context.mounted && done) f3Notice(context, s.raw('settings.saved'));
        },
        child: Text(s.raw('action.save')),
      ),
    ]);
  }
}

class _TallyNamesSection extends StatefulWidget {
  const _TallyNamesSection();
  @override
  State<_TallyNamesSection> createState() => _TallyNamesSectionState();
}

class _TallyNamesSectionState extends State<_TallyNamesSection> {
  final Map<String, TextEditingController> _ctrls = {};
  bool _seeded = false;

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    if (!_seeded) {
      _seeded = true;
      for (final code in tallyLedgerMap.keys) {
        _ctrls[code] = TextEditingController(
            text: store.settings.tallyLedgerNames[code] ?? tallyLedgerMap[code]!.name);
      }
    }
    return _section(context, s.raw('fin.export.ledgerNames'), [
      Text(s.raw('fin.export.ledgerNamesCaption')),
      for (final code in tallyLedgerMap.keys)
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 2),
          child: Row(children: [
            Expanded(child: Text('${accountLabel(code)} · ${tallyLedgerMap[code]!.group}')),
            SizedBox(
              width: 170,
              child: TextField(controller: _ctrls[code], decoration: const InputDecoration(isDense: true)),
            ),
          ]),
        ),
      const SizedBox(height: 8),
      FilledButton(
        onPressed: () async {
          final done = await store.updateSettings({
            'tallyLedgerNames': {
              for (final code in tallyLedgerMap.keys)
                if (_ctrls[code]!.text.trim().isNotEmpty &&
                    _ctrls[code]!.text.trim() != tallyLedgerMap[code]!.name)
                  code: _ctrls[code]!.text.trim(),
            },
          });
          if (context.mounted && done) f3Notice(context, s.raw('fin.export.ledgerSaved'));
        },
        child: Text(s.raw('action.save')),
      ),
    ]);
  }
}

/* ---------------- backup & restore (G6) ---------------- */

/// The web BackupPanel, ported (design §9): export assembles one
/// JSON file from the owner's own reads (available in every plan
/// state — it is reads only) and shares it; restore is the
/// two-step transplant: pick a file → the store verifies it
/// against its own manifest and plans against a probe of THIS
/// business, writing nothing → the summary or the refusal shows →
/// only an explicit confirmation executes the writes. The pure
/// planner is fixture-proven against the web lib
/// (test/g6_fixtures_test.dart).
class _BackupSection extends StatefulWidget {
  const _BackupSection();
  @override
  State<_BackupSection> createState() => _BackupSectionState();
}

class _BackupSectionState extends State<_BackupSection> {
  bool _exportBusy = false;
  String? _exportMsg;
  String? _fingerprint;
  String _stage = 'idle';
  String? _refusal;
  bk.RestorePlan? _plan;
  Map<String, dynamic>? _file;
  int _written = 0;

  static const _refusalKeys = {
    'not-a-backup': 'backup.refused.notABackup',
    'unknown-format': 'backup.refused.unknownFormat',
    'manifest-mismatch': 'backup.refused.manifestMismatch',
    'target-not-empty': 'backup.refused.targetNotEmpty',
  };

  String _fill(String key, Map<String, String> p) {
    var out = S.current.raw(key);
    p.forEach((k, v) => out = out.replaceAll('{$k}', v));
    return out;
  }

  String _fmtDate(String? iso) {
    if (iso == null) return '—';
    final d = DateTime.tryParse(iso);
    if (d == null) return '—';
    final local = d.toLocal();
    return '${local.day} ${S.current.raw('common.month.${local.month - 1}')} ${local.year}';
  }

  Future<void> _export(ShopStore store) async {
    setState(() {
      _exportBusy = true;
      _exportMsg = null;
    });
    final file = await store.exportBusinessBackup();
    if (!mounted) return;
    if (file == null) {
      setState(() {
        _exportBusy = false;
        _exportMsg = S.current.raw('backup.exportFailed');
      });
      return;
    }
    final manifest = (file['manifest'] as Map).cast<String, dynamic>();
    final day = (file['exportedAt'] as String).substring(0, 10);
    final bid = manifest['businessId'] as String;
    final body = const JsonEncoder.withIndent('  ').convert(file);
    await Share.shareXFiles([
      XFile.fromData(utf8.encode(body),
          name: 'dukaan-backup-${bid.substring(0, 8)}-$day.json',
          mimeType: 'application/json'),
    ]);
    if (!mounted) return;
    setState(() {
      _exportBusy = false;
      _fingerprint = manifest['journalFingerprint'] as String;
      _exportMsg = _fill('backup.exportDone', {
        'docs': '${manifest['totalDocs']}',
        'journal': '${manifest['journalCount']}',
      });
    });
  }

  Future<void> _pick(ShopStore store) async {
    final picked = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['json'],
      withData: true,
    );
    if (picked == null || picked.files.isEmpty || picked.files.first.bytes == null) {
      return;
    }
    setState(() {
      _stage = 'checking';
      _plan = null;
      _file = null;
      _refusal = null;
    });
    Object? parsed;
    try {
      parsed = jsonDecode(utf8.decode(picked.files.first.bytes!));
    } catch (_) {
      setState(() {
        _stage = 'refused';
        _refusal = 'not-a-backup';
      });
      return;
    }
    final plan = await store.planBusinessRestore(parsed);
    if (!mounted) return;
    if (plan == null) {
      setState(() => _stage = 'failed');
      return;
    }
    if (!plan.ok) {
      setState(() {
        _stage = 'refused';
        _refusal = plan.reason;
      });
      return;
    }
    if (plan.alreadyRestored) {
      setState(() => _stage = 'already');
      return;
    }
    setState(() {
      _stage = 'ready';
      _plan = plan;
      _file = (parsed as Map).cast<String, dynamic>();
    });
  }

  Future<void> _restore(ShopStore store) async {
    final plan = _plan;
    if (plan == null) return;
    setState(() => _stage = 'restoring');
    final res = await store.executeBusinessRestore(plan);
    if (!mounted) return;
    setState(() {
      if (res.ok) {
        _stage = 'done';
        _written = plan.writes.where((w) => w.kind == 'set').length;
      } else {
        _stage = 'failed';
      }
    });
  }

  String get _sourceName {
    final f = _file;
    if (f == null) return '';
    final platform = (f['platform'] as Map?)?.cast<String, dynamic>();
    final registry = (platform?['registry'] as Map?)?.cast<String, dynamic>();
    final name = registry?['name'];
    if (name is String && name.isNotEmpty) return name;
    final manifest = (f['manifest'] as Map).cast<String, dynamic>();
    return '${manifest['businessId']}';
  }

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    return _section(context, s.raw('backup.title'), [
      Text(s.raw('backup.sub')),
      const SizedBox(height: 12),
      Text(s.raw('backup.exportTitle'),
          style: const TextStyle(fontWeight: FontWeight.w600)),
      const SizedBox(height: 4),
      Text(s.raw('backup.exportBody')),
      const SizedBox(height: 8),
      Wrap(spacing: 8, children: [
        OutlinedButton.icon(
          onPressed: _exportBusy ? null : () => _export(store),
          icon: const Icon(Icons.download_outlined, size: 16),
          label: Text(_exportBusy ? s.raw('backup.exporting') : s.raw('backup.exportButton')),
        ),
      ]),
      if (_exportMsg != null) ...[
        const SizedBox(height: 6),
        Text(_exportMsg!),
      ],
      if (_fingerprint != null) ...[
        const SizedBox(height: 4),
        Text('${s.raw('backup.fingerprint')}: ${_fingerprint!.substring(0, 16)}…'),
      ],
      const Divider(height: 28),
      Text(s.raw('backup.restoreTitle'),
          style: const TextStyle(fontWeight: FontWeight.w600)),
      const SizedBox(height: 4),
      Text(s.raw('backup.restoreBody')),
      const SizedBox(height: 8),
      Wrap(spacing: 8, children: [
        OutlinedButton.icon(
          onPressed: (_stage == 'checking' || _stage == 'restoring')
              ? null
              : () => _pick(store),
          icon: const Icon(Icons.upload_outlined, size: 16),
          label: Text(_stage == 'checking' ? s.raw('backup.restoreReading') : s.raw('backup.restorePick')),
        ),
        if (_stage == 'ready')
          FilledButton(
            onPressed: () => _restore(store),
            child: Text(s.raw('backup.restoreConfirm')),
          ),
      ]),
      if (_stage == 'restoring') ...[
        const SizedBox(height: 6),
        Text(s.raw('backup.restoring')),
      ],
      if (_stage == 'refused' && _refusal != null) ...[
        const SizedBox(height: 6),
        Text(s.raw(_refusalKeys[_refusal] ?? 'backup.restoreFailed')),
      ],
      if (_stage == 'ready' && _file != null) ...[
        const SizedBox(height: 6),
        Text(_fill('backup.restoreSource', {
          'business': _sourceName,
          'date': _fmtDate(_file!['exportedAt'] as String?),
        })),
        Text(_fill('backup.restoreSummary', {
          'docs': '${_plan!.writes.where((w) => w.kind == 'set').length}',
          'journal': '${(_file!['manifest'] as Map)['journalCount']}',
        })),
      ],
      if (_stage == 'done') ...[
        const SizedBox(height: 6),
        Text(_fill('backup.restoreDone', {'written': '$_written'})),
      ],
      if (_stage == 'already') ...[
        const SizedBox(height: 6),
        Text(s.raw('backup.restoreAlready')),
      ],
      if (_stage == 'failed') ...[
        const SizedBox(height: 6),
        Text(s.raw('backup.restoreFailed')),
      ],
    ]);
  }
}

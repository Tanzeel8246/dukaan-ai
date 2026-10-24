/// Job tracker (F3, Phase C §5): customer work orders with
/// stage flow, materials issued at job cost, advances pooled in
/// the CUSTOMER's advance balance (recorded with the §5.3 note
/// through the ordinary repayment action), job profit, and the
/// billing hand-off (the bill posts once through postBill and
/// flips the job to delivered in its own batch).
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/jobs.dart';
import '../core/ledger.dart';
import '../core/print_docs.dart';
import '../core/permissions.dart';
import '../core/search.dart';
import '../core/types.dart';
import '../data/store.dart';
import '../l10n/app_strings.dart';
import '../main.dart' show fmtRs;
import 'f2_common.dart' show AccountDropdown, MethodDropdown;
import 'f3_common.dart';
import 'print/doc_view.dart';

class JobsScreen extends StatefulWidget {
  final VoidCallback? onOpenBilling;
  const JobsScreen({super.key, this.onOpenBilling});
  @override
  State<JobsScreen> createState() => _JobsScreenState();
}

class _JobsScreenState extends State<JobsScreen> {
  final _query = TextEditingController();
  Job? _selected;

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final canWrite = can(store.role, 'jobTracker', 'write');
    final list = store.jobs
        .where((j) => matchesAny(_query.text, [j.number, j.title, j.customerName, j.customerPhone]))
        .toList()
      ..sort((a, b) => b.ts.compareTo(a.ts));

    final listPane = Column(children: [
      Padding(
        padding: const EdgeInsets.all(12),
        child: Row(children: [
          Expanded(
            child: TextField(
              controller: _query,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(prefixIcon: const Icon(Icons.search), hintText: s.raw('job.searchPh')),
            ),
          ),
          if (canWrite) ...[
            const SizedBox(width: 8),
            ElevatedButton.icon(
              onPressed: () => _editJob(context, null),
              icon: const Icon(Icons.add, size: 18),
              label: Text(s.raw('job.new')),
            ),
          ],
        ]),
      ),
      Expanded(
        child: store.jobs.isEmpty
            ? Center(child: Text(s.raw('job.empty')))
            : list.isEmpty
                ? Center(child: Text(s.raw('job.noResults')))
                : ListView.separated(
                    itemCount: list.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (ctx, i) {
                      final j = list[i];
                      final profit = jobProfitFigures(j, store.bills);
                      final overdue = j.dueDateISO != null &&
                          j.status != 'delivered' &&
                          j.status != 'cancelled' &&
                          j.dueDateISO!.compareTo(DateTime.now().toIso8601String().substring(0, 10)) < 0;
                      return ListTile(
                        title: Text('${j.number} · ${j.title}'),
                        subtitle: Text([
                          j.customerName,
                          if (j.dueDateISO != null) '${s.raw('job.due')}: ${j.dueDateISO}',
                          if (overdue) s.raw('job.overdue'),
                        ].where((x) => x.isNotEmpty).join(' · ')),
                        trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
                          Chip(label: Text(s.raw('job.status.${j.status}')), visualDensity: VisualDensity.compact),
                          Text('${s.raw('job.profit')}: ${fmtRs(profit.profit)}',
                              style: Theme.of(context).textTheme.bodySmall),
                        ]),
                        selected: _selected?.id == j.id,
                        onTap: () => setState(() => _selected = j),
                      );
                    },
                  ),
      ),
    ]);

    final sel = _selected == null ? null : store.jobs.where((j) => j.id == _selected!.id).firstOrNull;
    final detail = sel == null
        ? Center(child: Text(s.raw('common.none')))
        : _JobDetail(job: sel, canWrite: canWrite, onOpenBilling: widget.onOpenBilling);
    final wide = MediaQuery.of(context).size.width >= 900;
    if (wide) {
      return Row(children: [
        SizedBox(width: 420, child: listPane),
        const VerticalDivider(width: 1),
        Expanded(child: detail),
      ]);
    }
    return _selected == null || sel == null
        ? listPane
        : Column(children: [
            ListTile(
              leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => setState(() => _selected = null)),
              title: Text(sel.number),
            ),
            Expanded(child: detail),
          ]);
  }

  Future<void> _editJob(BuildContext context, Job? existing) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    final title = TextEditingController(text: existing?.title ?? '');
    final description = TextEditingController(text: existing?.description ?? '');
    final name = TextEditingController(text: existing?.customerName ?? '');
    final phone = TextEditingController(text: existing?.customerPhone ?? '');
    final labour = TextEditingController(text: fmtQty(existing?.labourCost ?? 0));
    final due = TextEditingController(text: existing?.dueDateISO ?? '');
    final note = TextEditingController(text: existing?.note ?? '');
    Customer? customer = existing?.customerId == null
        ? null
        : store.customers.where((c) => c.id == existing!.customerId).firstOrNull;
    var whId = existing?.warehouseId ?? store.defaultWarehouseId;
    final dialogTitle =
        existing == null ? s.raw('job.form.newTitle') : f3('job.form.editTitle', {'number': existing.number});
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          title: Text(dialogTitle),
          content: SizedBox(
            width: 480,
            child: SingleChildScrollView(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                TextField(controller: title, decoration: InputDecoration(labelText: s.raw('job.form.title'), hintText: s.raw('job.form.titlePh'))),
                TextField(controller: description, decoration: InputDecoration(labelText: s.raw('job.form.description'))),
                DropdownButtonFormField<String>(
                  initialValue: customer?.id,
                  decoration: InputDecoration(labelText: s.raw('job.form.customer')),
                  items: [
                    for (final c in store.customers) DropdownMenuItem(value: c.id, child: Text(c.name)),
                  ],
                  onChanged: (v) => setLocal(() {
                    customer = store.customers.where((c) => c.id == v).firstOrNull;
                    if (customer != null) {
                      name.text = customer!.name;
                      phone.text = customer!.phone;
                    }
                  }),
                ),
                TextField(controller: name, decoration: InputDecoration(labelText: s.raw('job.form.name'))),
                TextField(controller: phone, decoration: InputDecoration(labelText: s.raw('job.form.phone'))),
                if (existing == null)
                  WarehouseDropdown(warehouses: store.warehouses, value: whId, onChanged: (v) => setLocal(() => whId = v ?? whId)),
                TextField(
                  controller: labour,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(labelText: s.raw('job.form.labour')),
                ),
                TextField(controller: due, decoration: InputDecoration(labelText: s.raw('job.form.due'), hintText: 'YYYY-MM-DD')),
                TextField(controller: note, decoration: InputDecoration(labelText: s.raw('job.form.note'))),
              ]),
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
            ElevatedButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: Text(existing == null ? s.raw('job.form.save') : s.raw('job.form.saveEdit'))),
          ],
        ),
      ),
    );
    if (saved != true) return;
    if (title.text.trim().isEmpty) {
      if (context.mounted) f3Notice(context, s.raw('job.form.errTitle'));
      return;
    }
    if (existing == null) {
      final ok = await store.createJob(
        title: title.text,
        customerId: customer?.id,
        customerName: name.text,
        customerPhone: phone.text,
        description: description.text,
        warehouseId: whId,
        dueDateISO: due.text.trim().isEmpty ? null : due.text.trim(),
        labourCost: double.tryParse(labour.text.trim()) ?? 0,
        note: note.text.trim(),
      );
      if (!ok && context.mounted) f3Notice(context, s.raw('job.form.errSave'));
    } else {
      final ok = await store.updateJob(
        existing,
        title: title.text,
        description: description.text,
        labourCost: double.tryParse(labour.text.trim()) ?? 0,
        dueDateISO: due.text.trim().isEmpty ? null : due.text.trim(),
        note: note.text.trim(),
      );
      if (ok && context.mounted) f3Notice(context, f3('job.notice.updated', {'number': existing.number}));
    }
  }
}

class _JobDetail extends StatelessWidget {
  final Job job;
  final bool canWrite;
  final VoidCallback? onOpenBilling;
  const _JobDetail({required this.job, required this.canWrite, this.onOpenBilling});

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final stages = effectiveJobStages(store.settings);
    final profit = jobProfitFigures(job, store.bills);
    final advances = jobAdvanceTotal(job, store.credits);
    final bills = jobBills(job, store.bills);
    final terminal = job.status == 'delivered' || job.status == 'cancelled';
    final whName = store.warehouses.where((w) => w.id == job.warehouseId).firstOrNull?.name ?? job.warehouseId;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('${job.number} · ${job.title}', style: Theme.of(context).textTheme.titleMedium),
        Text([job.customerName, job.customerPhone, if (job.description.isNotEmpty) job.description].where((x) => x.isNotEmpty).join(' · ')),
        const SizedBox(height: 8),
        StatLine(s.raw('job.stage'), job.stage),
        StatLine(s.raw('wh.pickerLabel'), whName),
        if (job.dueDateISO != null) StatLine(s.raw('job.due'), job.dueDateISO!),
        StatLine(s.raw('job.revenue'), fmtRs(profit.revenue)),
        StatLine(s.raw('job.materials'), fmtRs(profit.materials)),
        StatLine(s.raw('job.billCogs'), fmtRs(profit.billCogs)),
        StatLine(s.raw('job.labour'), fmtRs(profit.labour)),
        StatLine(s.raw('job.profit'), fmtRs(profit.profit)),
        StatLine(s.raw('job.advanceTotal'), fmtRs(advances)),
        const Divider(),
        // F5: the designed work slip (web DocPrintSheet job sheet —
        // materials events, net materials, the receiver's ruled
        // line) on the shared print transports.
        Wrap(spacing: 8, children: [
          OutlinedButton.icon(
            icon: const Icon(Icons.print_outlined, size: 18),
            label: Text(s.raw('job.act.print')),
            onPressed: () {
              final page = jobSlipDocPage(
                job: job, ownerDoc: store.ownerDoc, warehouseName: whName,
                title: s.raw('job.print.title'),
                customerLabel: s.raw('job.print.customer'),
                stageLabel: s.raw('job.print.stage'),
                dueLabel: s.raw('job.print.due'),
                warehouseLabel: s.raw('wh.pickerLabel'),
                materialsTitle: s.raw('job.print.materials'),
                issuedLabel: s.raw('job.print.issued'),
                returnedLabel: s.raw('job.print.returned'),
                netMaterialsLabel: s.raw('job.print.net'),
                labourLabel: s.raw('job.print.labour'),
                receivedByLabel: s.raw('job.print.receivedBy'),
                noMaterialsLabel: s.raw('job.print.noMaterials'),
                money: fmtRs, qty: fmtQty,
              );
              showDocPrintSheet(context, page, jobName: 'workslip-${job.number}');
            },
          ),
        ]),
        const SizedBox(height: 8),
        if (canWrite && !terminal)
          Wrap(spacing: 8, runSpacing: 8, children: [
            PopupMenuButton<String>(
              onSelected: (v) async {
                if (await store.setJobStage(job, v) && context.mounted) {
                  f3Notice(context, f3('job.notice.stage', {'number': job.number, 'stage': v}));
                }
              },
              itemBuilder: (_) => [
                for (final st in stages) PopupMenuItem(value: st, child: Text(st)),
              ],
              child: Chip(label: Text(s.raw('job.act.stage')), visualDensity: VisualDensity.compact),
            ),
            ElevatedButton(onPressed: () => _materialsDialog(context, job, 'issue'), child: Text(s.raw('job.act.issue'))),
            OutlinedButton(onPressed: () => _materialsDialog(context, job, 'return'), child: Text(s.raw('job.act.return'))),
            OutlinedButton(onPressed: () => _advanceDialog(context, job), child: Text(s.raw('job.act.advance'))),
            ElevatedButton(
              onPressed: () {
                if (store.convertJobToBill(job)) {
                  f3Notice(context, f3('job.notice.draftReady', {'number': job.number}));
                  onOpenBilling?.call();
                }
              },
              child: Text(s.raw('job.act.bill')),
            ),
            TextButton(
              onPressed: () async {
                final ok = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: Text(f3('job.confirm.deliver', {'number': job.number})),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
                      ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(s.actionConfirm)),
                    ],
                  ),
                );
                if (ok == true && await store.deliverJob(job) && context.mounted) {
                  f3Notice(context, f3('job.notice.delivered', {'number': job.number}));
                }
              },
              child: Text(s.raw('job.act.deliver')),
            ),
            TextButton(
              onPressed: () async {
                final ok = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: Text(f3('job.confirm.cancel', {'number': job.number})),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
                      ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(s.actionConfirm)),
                    ],
                  ),
                );
                if (ok == true && await store.cancelJob(job) && context.mounted) {
                  f3Notice(context, f3('job.notice.cancelled', {'number': job.number}));
                }
              },
              child: Text(s.raw('job.act.cancel')),
            ),
          ]),
        const SizedBox(height: 8),
        Text(s.raw('job.materials'), style: const TextStyle(fontWeight: FontWeight.w600)),
        if (job.materialEvents.isEmpty) Text(s.raw('job.noMaterials')),
        for (final e in job.materialEvents.reversed)
          ListTile(
            dense: true,
            title: Text('${e.name} × ${fmtQty(e.qty)}'),
            subtitle: Text(s.raw(e.kind == 'issue' ? 'job.ev.issue' : 'job.ev.return')),
            trailing: Text(fmtRs(e.value)),
          ),
        const Divider(),
        Text(s.raw('job.advances'), style: const TextStyle(fontWeight: FontWeight.w600)),
        Builder(builder: (ctx) {
          final rows = jobAdvanceRows(job, store.credits);
          if (rows.isEmpty) return Text(s.raw('job.noAdvances'));
          return Column(children: [
            for (final r in rows)
              ListTile(dense: true, title: Text(fmtRs(r.amount)), subtitle: Text(r.note)),
          ]);
        }),
        const Divider(),
        Text(s.raw('job.bills'), style: const TextStyle(fontWeight: FontWeight.w600)),
        if (bills.isEmpty) Text(s.raw('job.noBills')),
        for (final b in bills)
          ListTile(dense: true, title: Text('#${b.billNo}'), trailing: Text(fmtRs(b.total))),
      ]),
    );
  }

  Future<void> _materialsDialog(BuildContext context, Job job, String kind) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    var picks = <PickLine>[];
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(f3(kind == 'issue' ? 'job.mat.issueTitle' : 'job.mat.returnTitle', {'number': job.number})),
        content: SizedBox(
          width: 520,
          child: PickLinesEditor(
            products: store.products,
            initial: const [],
            onChanged: (v) => picks = v,
            searchHintKey: 'job.mat.productPh',
            hintFor: (p) => kind == 'issue'
                ? f3('job.mat.available', {'qty': fmtQty(store.qtyAtWh(p, job.warehouseId))})
                : f3('job.mat.held', {'qty': fmtQty(jobMaterialNetQty(job, p.id))}),
            includeProduct: kind == 'issue' ? null : (p) => jobMaterialNetQty(job, p.id) > 0,
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
          ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: Text(kind == 'issue' ? s.raw('job.mat.issueSave') : s.raw('job.mat.returnSave'))),
        ],
      ),
    );
    if (saved != true) return;
    final lines = [for (final p in picks) (productId: p.productId, qty: p.qty)];
    final ok = kind == 'issue' ? await store.issueJobMaterials(job, lines) : await store.returnJobMaterials(job, lines);
    if (!context.mounted) return;
    f3Notice(
        context,
        ok
            ? f3(kind == 'issue' ? 'job.notice.issued' : 'job.notice.returned', {'number': job.number})
            : s.raw('job.mat.err.failed'));
  }

  Future<void> _advanceDialog(BuildContext context, Job job) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    final amount = TextEditingController();
    var method = 'cash';
    String? accountId;
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          title: Text(f3('job.adv.title', {'number': job.number})),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            Text(s.raw('job.adv.sub'), style: Theme.of(ctx).textTheme.bodySmall),
            TextField(
              controller: amount,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(labelText: s.raw('job.adv.amount')),
            ),
            MethodDropdown(value: method, onChanged: (v) => setLocal(() => method = v)),
            AccountDropdown(accounts: store.accounts, value: accountId, onChanged: (v) => setLocal(() => accountId = v)),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
            ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(s.raw('job.adv.save'))),
          ],
        ),
      ),
    );
    if (saved != true) return;
    final amt = double.tryParse(amount.text.trim()) ?? 0;
    if (amt <= 0) {
      if (context.mounted) f3Notice(context, s.raw('job.adv.errAmount'));
      return;
    }
    // §5.3: the advance is an ordinary repayment INTO the
    // customer's pool, carrying the job's note — never a
    // job-level posting of its own.
    final ok = await store.addRepayment(
      customerId: job.customerId,
      customerName: job.customerName,
      customerPhone: job.customerPhone,
      amount: amt,
      method: method,
      accountId: accountId,
      note: advanceNoteFor(job),
    );
    if (context.mounted) {
      f3Notice(context, ok ? f3('job.adv.done', {'amount': fmtRs(amt), 'number': job.number}) : s.raw('job.adv.errFailed'));
    }
  }
}

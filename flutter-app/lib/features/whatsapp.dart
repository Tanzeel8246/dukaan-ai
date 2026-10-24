/// WhatsApp desk (Phase H · H5 — web WhatsAppView parity).
///
/// The member side of wa.me marketing: consent-honest audiences
/// resolved live, templates, campaigns, and the one-by-one send
/// queue. NOTHING is sent by the app itself: Open composes the
/// wa.me link and hands it to the OS share sheet (the apps ride
/// share_plus for every outbound gesture — storefront-QR
/// precedent), and "sent" exists only as the shopkeeper's own
/// confirmation. The send-time re-check in the store governs
/// every confirm: an opt-out after launch lands skipped_optout,
/// a bad number skipped_invalid — the log never claims a
/// delivery the shopkeeper did not make (§3.4).
///
/// RBAC: the `whatsapp` matrix row (owner/manager full,
/// accountant read, cashier none) — the nav hides the page from
/// roles that cannot view it.
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';

import '../app_state.dart';
import '../core/permissions.dart';
import '../core/whatsapp.dart';
import '../data/store.dart';
import '../l10n/app_strings.dart';
import '../main.dart' show fmtRs;
import 'f2_common.dart' show fmtDate;

class WhatsAppScreen extends StatefulWidget {
  const WhatsAppScreen({super.key});
  @override
  State<WhatsAppScreen> createState() => _WhatsAppScreenState();
}

class _WhatsAppScreenState extends State<WhatsAppScreen> {
  // Template editor
  final _tplName = TextEditingController();
  final _tplBody = TextEditingController();
  String _tplKind = 'promo';
  String? _tplEditingId;
  String? _tplDeleteArm;
  // Campaign composer
  final _campName = TextEditingController();
  String? _campTemplateId;
  String _audKind = 'all_opted_in';
  final _minRs = TextEditingController(text: '1');
  final _minDays = TextEditingController(text: '7');
  final _withinDays = TextEditingController(text: '30');
  final _inactiveDays = TextEditingController(text: '60');
  String _tier = 'silver';
  // Queue
  String? _queueFor;
  String? _skipCursor;
  // Service interval
  final _interval = TextEditingController();
  int? _intervalSeeded;
  // Banner
  String? _banner;
  bool _bannerOk = true;
  bool _busy = false;

  @override
  void dispose() {
    _tplName.dispose();
    _tplBody.dispose();
    _campName.dispose();
    _minRs.dispose();
    _minDays.dispose();
    _withinDays.dispose();
    _inactiveDays.dispose();
    _interval.dispose();
    super.dispose();
  }

  String _fill(String key, [Map<String, String> p = const {}]) {
    var out = S.current.raw(key);
    p.forEach((k, v) => out = out.replaceAll('{$k}', v));
    return out;
  }

  void _flash(String msg, bool ok) => setState(() {
        _banner = msg;
        _bannerOk = ok;
      });

  WaAudience _composerAudience() {
    double num(TextEditingController c, double d) =>
        double.tryParse(c.text.trim()) ?? d;
    int days(TextEditingController c, int d) =>
        int.tryParse(c.text.trim()) ?? d;
    return switch (_audKind) {
      'udhaar_outstanding' =>
        WaAudience.udhaar(minRs: num(_minRs, 1), minDays: days(_minDays, 7)),
      'points_expiring' =>
        WaAudience.pointsExpiring(withinDays: days(_withinDays, 30)),
      'tier' => WaAudience.tierOf(_tier),
      'inactive' => WaAudience.inactive(days: days(_inactiveDays, 60)),
      'storefront_customers' => const WaAudience.storefrontCustomers(),
      'service_due' => const WaAudience.serviceDue(),
      _ => const WaAudience.allOptedIn(),
    };
  }

  String _audLabel(String kind) => S.current.raw(switch (kind) {
        'all_opted_in' => 'wa.aud.all',
        'udhaar_outstanding' => 'wa.aud.udhaar',
        'points_expiring' => 'wa.aud.points',
        'inactive' => 'wa.aud.inactive',
        'storefront_customers' => 'wa.aud.storefront',
        'service_due' => 'wa.aud.serviceDue',
        _ => 'wa.aud.$kind',
      });

  String _audBadge(WaAudience a) {
    final s = S.current;
    return switch (a.kind) {
      'udhaar_outstanding' =>
        '${_audLabel(a.kind)} · ≥ ${fmtRs(a.minRs ?? 0)} · ≥ ${a.minDays ?? 0}d',
      'points_expiring' => '${_audLabel(a.kind)} · ≤ ${a.withinDays ?? 0}d',
      'tier' => '${_audLabel(a.kind)} · ${s.raw('loyalty.tier.${a.tier ?? 'silver'}')}',
      'inactive' => '${_audLabel(a.kind)} · ≥ ${a.days ?? 0}d',
      _ => _audLabel(a.kind),
    };
  }

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final tokens = context.watch<AppState>().tokens;
    final canWrite = can(store.role, 'whatsapp', 'write');
    final moduleOk = waModuleAllowed(store.planView);
    final sendingOk = waSendingAllowed(store.planView);
    final data = store.waAudienceData;
    final suggestions = waSuggestedReminders(data);
    final interval = resolveWaSettings(store.ownerDoc).serviceIntervalDays;
    if (_intervalSeeded != interval) {
      _intervalSeeded = interval;
      _interval.text = '$interval';
    }

    final activeCampaign = _queueFor == null
        ? null
        : store.waCampaigns.where((c) => c.id == _queueFor).firstOrNull;
    final activeSends = activeCampaign == null
        ? const <WaSend>[]
        : (store.waSends.where((x) => x.campaignId == activeCampaign.id).toList()
          ..sort((a, b) {
            final t = a.ts.compareTo(b.ts);
            return t != 0 ? t : a.id.compareTo(b.id);
          }));
    final activeTpl = activeCampaign == null
        ? null
        : store.waTemplates
            .where((t) => t.id == activeCampaign.templateId)
            .firstOrNull;
    final step = activeCampaign == null
        ? null
        : waQueueStep(activeSends, store.customers, _skipCursor);

    return ListView(padding: const EdgeInsets.all(16), children: [
      Text(s.raw('wa.title'), style: Theme.of(context).textTheme.titleLarge),
      const SizedBox(height: 4),
      Text(s.raw('wa.subtitle'), style: TextStyle(color: tokens.muted)),
      const SizedBox(height: 12),
      if (_banner != null)
        Card(
          color: tokens.card2,
          child: Padding(
            padding: const EdgeInsets.all(10),
            child: Text(_banner!,
                style: TextStyle(color: _bannerOk ? null : tokens.amberText)),
          ),
        ),
      // The honest limits — always shown, plan or no plan.
      Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(s.raw('wa.titleLimits'),
                style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            Text(s.raw('wa.limits.line1')),
            Text(s.raw('wa.limits.line2')),
            Text(s.raw('wa.limits.line3')),
          ]),
        ),
      ),
      const SizedBox(height: 12),
      if (!moduleOk)
        Card(
          color: tokens.card2,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(s.raw('wa.lockedTitle'),
                  style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 4),
              Text(s.raw('wa.lockedBody')),
            ]),
          ),
        )
      else ...[
        if (!sendingOk)
          Card(
            color: tokens.card2,
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Text(s.raw('wa.sendingPaused')),
            ),
          ),
        const SizedBox(height: 4),
        // Suggested reminders — counts only.
        Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(s.raw('wa.suggest.title'),
                  style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              if (suggestions.udhaarCount == 0 &&
                  suggestions.pointsExpiringCount == 0 &&
                  suggestions.serviceDueCount == 0)
                Text(s.raw('wa.suggest.none'))
              else ...[
                if (suggestions.udhaarCount > 0)
                  _suggestRow(
                    _fill('wa.suggest.udhaar',
                        {'count': '${suggestions.udhaarCount}'}),
                    canWrite,
                    () => _startSuggestion(store, 'udhaar_outstanding'),
                  ),
                if (suggestions.pointsExpiringCount > 0)
                  _suggestRow(
                    _fill('wa.suggest.points', {
                      'count': '${suggestions.pointsExpiringCount}',
                      'days': '7',
                    }),
                    canWrite,
                    () => _startSuggestion(store, 'points_expiring'),
                  ),
                if (suggestions.serviceDueCount > 0)
                  _suggestRow(
                    _fill('wa.suggest.serviceDue',
                        {'count': '${suggestions.serviceDueCount}'}),
                    canWrite,
                    () => _startSuggestion(store, 'service_due'),
                  ),
              ],
            ]),
          ),
        ),
        const SizedBox(height: 12),
        // Service interval (settings writers only — the store
        // enforces the same guard).
        if (can(store.role, 'settings', 'write'))
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(s.raw('wa.settings.title'),
                    style: const TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 6),
                Text(s.raw('wa.settings.serviceHint')),
                const SizedBox(height: 8),
                Row(children: [
                  SizedBox(
                    width: 110,
                    child: TextField(
                      controller: _interval,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                          labelText: s.raw('wa.settings.serviceInterval')),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: _busy
                        ? null
                        : () async {
                            final d = int.tryParse(_interval.text.trim());
                            if (d == null) return;
                            setState(() => _busy = true);
                            await store.setWaServiceIntervalDays(d);
                            if (mounted) setState(() => _busy = false);
                          },
                    child: Text(s.raw('wa.settings.save')),
                  ),
                ]),
              ]),
            ),
          ),
        if (can(store.role, 'settings', 'write')) const SizedBox(height: 12),
        // Templates.
        Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(s.raw('wa.tpl.title'),
                  style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              if (store.waTemplates.isEmpty)
                Text(s.raw('wa.tpl.empty'))
              else
                for (final t in store.waTemplates)
                  ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    title: Text(t.name),
                    subtitle: Text(t.body, maxLines: 2, overflow: TextOverflow.ellipsis),
                    trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                      Chip(
                          label: Text(s.raw(t.kind == 'reminder'
                              ? 'wa.tpl.kindReminder'
                              : 'wa.tpl.kindPromo'))),
                      if (canWrite) ...[
                        IconButton(
                          icon: const Icon(Icons.edit_outlined, size: 18),
                          onPressed: () => setState(() {
                            _tplEditingId = t.id;
                            _tplName.text = t.name;
                            _tplKind = t.kind;
                            _tplBody.text = t.body;
                            _tplDeleteArm = null;
                          }),
                        ),
                        TextButton(
                          onPressed: () async {
                            if (_tplDeleteArm != t.id) {
                              setState(() => _tplDeleteArm = t.id);
                              return;
                            }
                            await store.deleteWaTemplate(t.id);
                            if (mounted) {
                              setState(() {
                                _tplDeleteArm = null;
                                if (_tplEditingId == t.id) {
                                  _tplEditingId = null;
                                  _tplName.clear();
                                  _tplBody.clear();
                                }
                              });
                            }
                          },
                          child: Text(_tplDeleteArm == t.id
                              ? s.raw('wa.tpl.deleteSure')
                              : s.raw('wa.tpl.delete')),
                        ),
                      ],
                    ]),
                  ),
              if (canWrite) ...[
                const Divider(),
                Wrap(spacing: 6, children: [
                  for (final st in const [
                    ('starterPromo1', 'promo'),
                    ('starterPromo2', 'promo'),
                    ('starterReminder1', 'reminder'),
                    ('starterReminder2', 'reminder'),
                  ])
                    ActionChip(
                      label: Text(s.raw('wa.tpl.${st.$1}Name')),
                      onPressed: () => setState(() {
                        _tplEditingId = null;
                        _tplName.text = s.raw('wa.tpl.${st.$1}Name');
                        _tplKind = st.$2;
                        _tplBody.text = s.raw('wa.tpl.${st.$1}');
                      }),
                    ),
                ]),
                const SizedBox(height: 4),
                Text(s.raw('wa.tpl.use'),
                    style: TextStyle(color: tokens.muted, fontSize: 12)),
                const SizedBox(height: 8),
                TextField(
                  controller: _tplName,
                  decoration: InputDecoration(labelText: s.raw('wa.tpl.name')),
                ),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  initialValue: _tplKind,
                  decoration: InputDecoration(labelText: s.raw('wa.tpl.kind')),
                  items: [
                    DropdownMenuItem(
                        value: 'promo', child: Text(s.raw('wa.tpl.kindPromo'))),
                    DropdownMenuItem(
                        value: 'reminder',
                        child: Text(s.raw('wa.tpl.kindReminder'))),
                  ],
                  onChanged: (v) => setState(() => _tplKind = v ?? 'promo'),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: _tplBody,
                  minLines: 3,
                  maxLines: 5,
                  decoration: InputDecoration(
                      labelText: s.raw('wa.tpl.body'),
                      helperText: s.raw('wa.tpl.placeholders')),
                ),
                const SizedBox(height: 8),
                Align(
                  alignment: AlignmentDirectional.centerEnd,
                  child: ElevatedButton(
                    onPressed: _busy
                        ? null
                        : () async {
                            setState(() => _busy = true);
                            await store.saveWaTemplate(
                              id: _tplEditingId,
                              name: _tplName.text,
                              kind: _tplKind,
                              body: _tplBody.text,
                            );
                            if (!mounted) return;
                            setState(() {
                              _busy = false;
                              _tplEditingId = null;
                              _tplName.clear();
                              _tplBody.clear();
                            });
                          },
                    child: Text(s.raw('wa.tpl.save')),
                  ),
                ),
              ],
            ]),
          ),
        ),
        const SizedBox(height: 12),
        // Campaigns: composer + list.
        Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(s.raw('wa.camp.title'),
                  style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              if (canWrite) ...[
                TextField(
                  controller: _campName,
                  decoration: InputDecoration(labelText: s.raw('wa.camp.name')),
                ),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  initialValue: _campTemplateId,
                  decoration:
                      InputDecoration(labelText: s.raw('wa.camp.template')),
                  items: [
                    DropdownMenuItem<String>(
                        value: null, child: Text(s.raw('wa.camp.templateNone'))),
                    for (final t in store.waTemplates)
                      DropdownMenuItem(value: t.id, child: Text(t.name)),
                  ],
                  onChanged: (v) => setState(() => _campTemplateId = v),
                ),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  initialValue: _audKind,
                  decoration:
                      InputDecoration(labelText: s.raw('wa.camp.audience')),
                  items: [
                    for (final k in const [
                      'all_opted_in',
                      'udhaar_outstanding',
                      'points_expiring',
                      'tier',
                      'inactive',
                      'storefront_customers',
                      'service_due',
                    ])
                      DropdownMenuItem(value: k, child: Text(_audLabel(k))),
                  ],
                  onChanged: (v) => setState(() => _audKind = v ?? 'all_opted_in'),
                ),
                if (_audKind == 'udhaar_outstanding')
                  Row(children: [
                    Expanded(
                      child: TextField(
                        controller: _minRs,
                        keyboardType: TextInputType.number,
                        onChanged: (_) => setState(() {}),
                        decoration:
                            InputDecoration(labelText: s.raw('wa.aud.minRs')),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: _minDays,
                        keyboardType: TextInputType.number,
                        onChanged: (_) => setState(() {}),
                        decoration:
                            InputDecoration(labelText: s.raw('wa.aud.minDays')),
                      ),
                    ),
                  ]),
                if (_audKind == 'points_expiring')
                  TextField(
                    controller: _withinDays,
                    keyboardType: TextInputType.number,
                    onChanged: (_) => setState(() {}),
                    decoration:
                        InputDecoration(labelText: s.raw('wa.aud.withinDays')),
                  ),
                if (_audKind == 'tier')
                  DropdownButtonFormField<String>(
                    initialValue: _tier,
                    items: [
                      DropdownMenuItem(
                          value: 'silver',
                          child: Text(s.raw('loyalty.tier.silver'))),
                      DropdownMenuItem(
                          value: 'gold',
                          child: Text(s.raw('loyalty.tier.gold'))),
                    ],
                    onChanged: (v) => setState(() => _tier = v ?? 'silver'),
                  ),
                if (_audKind == 'inactive')
                  TextField(
                    controller: _inactiveDays,
                    keyboardType: TextInputType.number,
                    onChanged: (_) => setState(() {}),
                    decoration: InputDecoration(
                        labelText: s.raw('wa.aud.inactiveDays')),
                  ),
                const SizedBox(height: 6),
                // Live reach — the same derivation the launch will run.
                Text(_fill('wa.camp.reach',
                    {'count': '${waAudienceCount(_composerAudience(), data)}'})),
                const SizedBox(height: 8),
                Align(
                  alignment: AlignmentDirectional.centerEnd,
                  child: ElevatedButton(
                    onPressed: _busy || _campTemplateId == null
                        ? null
                        : () async {
                            setState(() => _busy = true);
                            await store.createWaCampaign(
                              name: _campName.text,
                              templateId: _campTemplateId!,
                              audience: _composerAudience(),
                            );
                            if (!mounted) return;
                            setState(() {
                              _busy = false;
                              _campName.clear();
                            });
                          },
                    child: Text(s.raw('wa.camp.create')),
                  ),
                ),
                const Divider(),
              ],
              if (store.waCampaigns.isEmpty)
                Text(s.raw('wa.camp.empty'))
              else
                for (final c in store.waCampaigns)
                  _campaignRow(context, store, c, canWrite, sendingOk),
            ]),
          ),
        ),
        // The queue for the opened campaign.
        if (activeCampaign != null) ...[
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('${s.raw('wa.queue.title')} — ${activeCampaign.name}',
                    style: const TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 6),
                if (step == null)
                  Text(s.raw('wa.queue.done'))
                else ...[
                  Text(
                      '${step.customer?.name ?? ''} · ${step.send.phone}',
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  Text(activeTpl == null
                      ? ''
                      : waQueueMessage(activeTpl.body, step.customer!, data)),
                  const SizedBox(height: 8),
                  Wrap(spacing: 8, children: [
                    ElevatedButton(
                      onPressed: _busy
                          ? null
                          : () => _advance(context, store, activeCampaign,
                              'opened', step),
                      child: Text(s.raw('wa.queue.send')),
                    ),
                    OutlinedButton(
                      onPressed: _busy
                          ? null
                          : () => _advance(context, store, activeCampaign,
                              'sent', step),
                      child: Text(s.raw('wa.queue.sent')),
                    ),
                    TextButton(
                      // The session cursor writes NOTHING — the row
                      // resurfaces at the head next visit (§3.4).
                      onPressed: () =>
                          setState(() => _skipCursor = step.send.id),
                      child: Text(s.raw('wa.queue.skip')),
                    ),
                  ]),
                  const SizedBox(height: 6),
                  Text(_fill('wa.queue.remaining', {
                    'count':
                        '${activeSends.where((x) => x.state == 'queued' || x.state == 'opened').length}',
                  })),
                ],
                const SizedBox(height: 6),
                Text(s.raw('wa.queue.honestNote'),
                    style: TextStyle(color: tokens.muted, fontSize: 12)),
                const Divider(),
                Text(s.raw('wa.log.title'),
                    style: const TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                for (final x in activeSends.reversed)
                  ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    title: Text(_nameOf(store, x.customerId)),
                    subtitle: Text('${x.phone} · ${fmtDate(x.ts)}'),
                    trailing: Chip(label: Text(_sendStateLabel(x.state))),
                  ),
              ]),
            ),
          ),
        ],
      ],
    ]);
  }

  Widget _suggestRow(String text, bool canWrite, VoidCallback onStart) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(children: [
        Expanded(child: Text(text)),
        if (canWrite)
          TextButton(
              onPressed: onStart, child: Text(S.current.raw('wa.suggest.start'))),
      ]),
    );
  }

  void _startSuggestion(ShopStore store, String kind) {
    final reminder = store.waTemplates
        .where((t) => t.kind == 'reminder')
        .firstOrNull;
    setState(() {
      _audKind = kind;
      if (kind == 'udhaar_outstanding') {
        _minRs.text = '1';
        _minDays.text = '7';
      }
      if (kind == 'points_expiring') _withinDays.text = '7';
      if (_campTemplateId == null && reminder != null) {
        _campTemplateId = reminder.id;
      }
    });
  }

  Widget _campaignRow(BuildContext context, ShopStore store, WaCampaign c,
      bool canWrite, bool sendingOk) {
    final s = S.current;
    final sends = store.waSends.where((x) => x.campaignId == c.id).toList();
    final p = waCampaignProgress(sends);
    final skipped = p.skippedOptout + p.skippedInvalid;
    final progress = _fill('wa.camp.progress', {
      'sent': '${p.sent}',
      'skipped': '$skipped',
      'total': '${p.total}',
    });
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(c.name),
      subtitle: Text('${_audBadge(c.audience)} · $progress'),
      trailing: Row(mainAxisSize: MainAxisSize.min, children: [
        Chip(
            label: Text(s.raw(switch (c.state) {
          'sending' => 'wa.camp.stateSending',
          'done' => 'wa.camp.stateDone',
          _ => 'wa.camp.stateDraft',
        }))),
        if (canWrite && c.state == 'draft')
          ElevatedButton(
            onPressed: _busy || !sendingOk
                ? null
                : () async {
                    setState(() => _busy = true);
                    final res = await store.launchWaCampaign(c.id);
                    if (!mounted) return;
                    setState(() {
                      _busy = false;
                      if (res.ok) {
                        _queueFor = c.id;
                        _skipCursor = null;
                      }
                    });
                    _flash(
                        res.ok
                            ? _fill('wa.camp.launched',
                                {'count': '${res.count ?? 0}'})
                            : s.raw('wa.camp.failed'),
                        res.ok);
                  },
            child: Text(s.raw('wa.camp.launch')),
          ),
        if (c.state == 'sending') ...[
          TextButton(
            onPressed: () => setState(() {
              _queueFor = c.id;
              _skipCursor = null;
            }),
            child: Text(s.raw('wa.camp.open')),
          ),
          if (canWrite)
            TextButton(
              onPressed: () async {
                await store.finishWaCampaign(c.id);
                if (mounted) {
                  setState(() {
                    if (_queueFor == c.id) _queueFor = null;
                  });
                }
              },
              child: Text(s.raw('wa.camp.finish')),
            ),
        ],
      ]),
    );
  }

  String _nameOf(ShopStore store, String customerId) {
    for (final c in store.customers) {
      if (c.id == customerId) return c.name;
    }
    return customerId;
  }

  String _sendStateLabel(String state) => S.current.raw(switch (state) {
        'opened' => 'wa.sendState.opened',
        'sent' => 'wa.sendState.sent',
        'skipped_optout' => 'wa.sendState.skippedOptout',
        'skipped_invalid' => 'wa.sendState.skippedInvalid',
        _ => 'wa.sendState.queued',
      });

  /// One queue act through the store. 'opened' additionally
  /// hands the composed wa.me link to the OS share sheet — the
  /// apps' only outbound transport (no url_launcher, no bulk
  /// API); the store has already recorded the state the
  /// re-check produced, and a skip verdict never opens anything.
  Future<void> _advance(BuildContext context, ShopStore store,
      WaCampaign campaign, String act, WaQueueStep step) async {
    final s = S.current;
    final tpl =
        store.waTemplates.where((t) => t.id == campaign.templateId).firstOrNull;
    setState(() => _busy = true);
    final res = await store.advanceWaSend(campaign.id, act, _skipCursor);
    if (!mounted) return;
    setState(() {
      _busy = false;
      _skipCursor = null;
    });
    if (!res.ok) {
      _flash(s.raw('wa.camp.failed'), false);
      return;
    }
    if (res.outcome == 'skipped_optout') {
      _flash(s.raw('wa.queue.skippedOptout'), false);
      return;
    }
    if (res.outcome == 'skipped_invalid') {
      _flash(s.raw('wa.queue.skippedInvalid'), false);
      return;
    }
    if (act == 'opened' && tpl != null && step.customer != null) {
      final msg = waQueueMessage(tpl.body, step.customer!, store.waAudienceData);
      await Share.share(waMeLink(step.send.phone, msg));
    }
  }
}

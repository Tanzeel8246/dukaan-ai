/// Storefront desk (Phase H · H4 — web StorefrontView parity).
///
/// The member side of the online store: publish/unpublish the
/// snapshot, preview it exactly as the public page models it,
/// and work the order inbox — convert (with the live-price drift
/// shown BEFORE confirming) or dismiss. The public page itself
/// is a web surface; nothing here renders for the public, and
/// nothing here posts money: a conversion births an ordinary
/// Phase B sale order through the store, and the journal only
/// ever sees the bill that may follow it.
///
/// RBAC: the `storefront` matrix row (owner/manager full,
/// accountant read, cashier none) — the nav hides the page from
/// roles that cannot view it; publishing itself is owner-only
/// (the store enforces it; the buttons follow).
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';

import '../app_state.dart';
import '../core/permissions.dart';
import '../core/plans.dart' show tierIncludesModule;
import '../core/storefront.dart';
import '../data/store.dart';
import '../l10n/app_strings.dart';
import '../main.dart' show fmtRs;
import '../theme/themes.dart' show DukaanTokens;

class StorefrontScreen extends StatefulWidget {
  const StorefrontScreen({super.key});
  @override
  State<StorefrontScreen> createState() => _StorefrontScreenState();
}

class _StorefrontScreenState extends State<StorefrontScreen> {
  final _slug = TextEditingController();
  final _tagline = TextEditingController();
  final _notice = TextEditingController();
  String? _seededFor; // the slug (or '') the form was seeded from
  Set<String>? _shownIds;
  String? _banner;
  bool _bannerOk = true;
  bool _busy = false;
  bool _copied = false;

  @override
  void dispose() {
    _slug.dispose();
    _tagline.dispose();
    _notice.dispose();
    super.dispose();
  }

  String _fill(String key, [Map<String, String> p = const {}]) {
    var out = S.current.raw(key);
    p.forEach((k, v) => out = out.replaceAll('{$k}', v));
    return out;
  }

  void _seed(ShopStore store) {
    final key = store.storefront?.slug ?? '';
    if (_seededFor == key) return;
    _seededFor = key;
    final doc = store.storefront;
    _slug.text = doc?.slug ?? suggestSlug(store.settings.shopName);
    _tagline.text = doc?.tagline ?? '';
    _notice.text = doc?.notice ?? '';
    _shownIds = null;
  }

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final tokens = context.watch<AppState>().tokens;
    _seed(store);
    final doc = store.storefront;
    final canWrite = can(store.role, 'storefront', 'write');
    final isOwner = store.role == 'owner';
    final planView = store.planView;
    final lit = planView != null
        ? storefrontLitState(planView.snapshot.modulesTier, planView.state, doc)
        : false;
    final String stateText;
    if (doc == null || !doc.enabled) {
      stateText = s.raw('store.state.disabled');
    } else if (lit) {
      stateText = s.raw('store.state.lit');
    } else if (planView == null) {
      stateText = s.raw('store.state.noPlan');
    } else if (!tierIncludesModule(planView.snapshot.modulesTier, 'storefront')) {
      stateText = s.raw('store.state.darkPlan');
    } else {
      stateText = _fill('store.state.darkState', {'state': planView.state});
    }
    final counts = storeOrderCounts(store.storeOrders);
    final prevHidden = <String>{
      for (final p in doc?.products ?? const <StorefrontProduct>[])
        if (p.stockState == 'hidden') p.productId,
    };
    final shown = _shownIds ??
        <String>{
          for (final p in store.products)
            if (!prevHidden.contains(p.id)) p.id,
        };
    final slugErr = doc == null && _slug.text.trim().isNotEmpty
        ? slugProblem(_slug.text.trim())
        : null;
    final url = doc != null ? storefrontUrl(doc.slug) : null;

    return ListView(padding: const EdgeInsets.all(16), children: [
      Text(s.raw('store.title'), style: Theme.of(context).textTheme.titleLarge),
      const SizedBox(height: 4),
      Text(s.raw('store.subtitle'), style: TextStyle(color: tokens.muted)),
      const SizedBox(height: 12),
      if (_banner != null)
        Card(
          color: tokens.card2,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Text(_banner!,
                style: TextStyle(color: _bannerOk ? tokens.text : tokens.danger)),
          ),
        ),
      /* ---- status card ---- */
      Card(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Icon(doc != null && doc.enabled && lit
                  ? Icons.storefront
                  : Icons.storefront_outlined),
              const SizedBox(width: 8),
              Expanded(child: Text(stateText, style: Theme.of(context).textTheme.titleMedium)),
            ]),
            if (url != null) ...[
              const SizedBox(height: 10),
              Text(s.raw('store.linkLabel'), style: TextStyle(color: tokens.muted)),
              const SizedBox(height: 2),
              SelectableText(url, style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              Wrap(spacing: 8, children: [
                OutlinedButton.icon(
                  onPressed: () async {
                    await Clipboard.setData(ClipboardData(text: url));
                    if (!mounted) return;
                    setState(() => _copied = true);
                  },
                  icon: const Icon(Icons.copy, size: 16),
                  label: Text(_copied ? s.raw('store.copied') : s.raw('store.copyLink')),
                ),
                OutlinedButton.icon(
                  onPressed: () => _showPreview(context, store),
                  icon: const Icon(Icons.visibility_outlined, size: 16),
                  label: Text(s.raw('store.previewLink')),
                ),
              ]),
              const SizedBox(height: 6),
              Text(_fill('store.updatedAt', {'date': doc!.updatedAt}),
                  style: TextStyle(color: tokens.muted)),
            ],
          ]),
        ),
      ),
      const SizedBox(height: 12),
      /* ---- publish card ---- */
      if (canWrite)
        Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (doc == null) ...[
                TextField(
                  controller: _slug,
                  enabled: isOwner && !_busy,
                  decoration: InputDecoration(
                    labelText: s.raw('store.slugLabel'),
                    helperText: s.raw('store.slugHelp'),
                    errorText: slugErr != null
                        ? s.raw('store.slugError.$slugErr')
                        : null,
                  ),
                  onChanged: (_) => setState(() {}),
                ),
              ] else ...[
                Text(s.raw('store.slugLabel'), style: TextStyle(color: tokens.muted)),
                Text(doc.slug, style: const TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 2),
                Text(s.raw('store.slugImmutable'), style: TextStyle(color: tokens.muted)),
              ],
              const SizedBox(height: 10),
              TextField(
                controller: _tagline,
                enabled: isOwner && !_busy,
                decoration: InputDecoration(
                  labelText: s.raw('store.taglineLabel'),
                  hintText: s.raw('store.taglinePh'),
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _notice,
                enabled: isOwner && !_busy,
                decoration: InputDecoration(
                  labelText: s.raw('store.noticeLabel'),
                  hintText: s.raw('store.noticePh'),
                ),
              ),
              const SizedBox(height: 10),
              Row(children: [
                Text('${s.raw('store.phoneLabel')}: ',
                    style: TextStyle(color: tokens.muted)),
                Text(store.settings.phone.isEmpty ? '—' : store.settings.phone),
              ]),
              const SizedBox(height: 14),
              Text(s.raw('store.productsTitle'),
                  style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 4),
              Text(s.raw('store.productsHelp'), style: TextStyle(color: tokens.muted)),
              const SizedBox(height: 6),
              for (final p in store.products)
                CheckboxListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  controlAffinity: ListTileControlAffinity.leading,
                  value: shown.contains(p.id),
                  onChanged: !isOwner || _busy
                      ? null
                      : (v) => setState(() {
                            final next = {...shown};
                            if (v == true) {
                              next.add(p.id);
                            } else {
                              next.remove(p.id);
                            }
                            _shownIds = next;
                          }),
                  title: Text(p.name),
                  subtitle: Text(
                      '${fmtRs(p.salePrice)} · ${s.raw('mc.store.stockQty').replaceAll('{qty}', '${p.stockQty}')} · ${s.raw('store.band.${shown.contains(p.id) ? stockBandFor(p.stockQty, p.reorderLevel) : 'hidden'}')}'),
                ),
              if (isOwner) ...[
                const SizedBox(height: 6),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(s.raw('store.autoRepublish')),
                  value: store.settings.storefrontBlock['autoRepublish'] == true,
                  onChanged: _busy
                      ? null
                      : (v) => store.setStorefrontAutoRepublish(v),
                ),
                const SizedBox(height: 8),
                Wrap(spacing: 8, children: [
                  ElevatedButton.icon(
                    onPressed: _busy || (doc == null && slugErr != null)
                        ? null
                        : () => _publish(store, shown, prevHidden),
                    icon: const Icon(Icons.publish, size: 16),
                    label: Text(doc == null
                        ? s.raw('store.publish')
                        : s.raw('store.republish')),
                  ),
                  if (doc != null && doc.enabled)
                    OutlinedButton.icon(
                      onPressed: _busy ? null : () => _unpublish(store),
                      icon: const Icon(Icons.visibility_off, size: 16),
                      label: Text(s.raw('store.unpublish')),
                    ),
                ]),
              ],
            ]),
          ),
        ),
      const SizedBox(height: 12),
      /* ---- the inbox ---- */
      Card(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(
                child: Text(s.raw('store.inboxTitle'),
                    style: Theme.of(context).textTheme.titleMedium),
              ),
              _countChip(s.raw('store.stateNew'), counts.fresh),
              _countChip(s.raw('store.stateConverted'), counts.converted),
              _countChip(s.raw('store.stateDismissed'), counts.dismissed),
            ]),
            const SizedBox(height: 8),
            if (store.storeOrders.isEmpty)
              Text(s.raw('store.inboxEmpty'), style: TextStyle(color: tokens.muted))
            else
              for (final o in store.storeOrders)
                _orderTile(context, store, o, canWrite, tokens),
          ]),
        ),
      ),
    ]);
  }

  Widget _countChip(String label, int n) {
    return Padding(
      padding: const EdgeInsets.only(left: 6),
      child: Chip(
        label: Text('$label: $n'),
        visualDensity: VisualDensity.compact,
      ),
    );
  }

  Widget _orderTile(
      BuildContext context, ShopStore store, StoreOrder o, bool canWrite, DukaanTokens tokens) {
    final s = S.current;
    final stateLabel = o.state == 'new'
        ? s.raw('store.stateNew')
        : o.state == 'converted'
            ? s.raw('store.stateConverted')
            : s.raw('store.stateDismissed');
    String lineName(String pid) {
      for (final p in store.products) {
        if (p.id == pid) return p.name;
      }
      for (final p in store.storefront?.products ?? const <StorefrontProduct>[]) {
        if (p.productId == pid) return p.name;
      }
      return pid;
    }

    String? convertedNumber;
    if (o.convertedSoId != null) {
      for (final so in store.saleOrders) {
        if (so.id == o.convertedSoId) convertedNumber = so.number;
      }
    }
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        border: Border.all(color: tokens.line),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(
            child: Text(o.customerName,
                style: const TextStyle(fontWeight: FontWeight.w600)),
          ),
          Chip(label: Text(stateLabel), visualDensity: VisualDensity.compact),
        ]),
        Text('${s.raw('store.col.phone')}: ${o.phone}',
            style: TextStyle(color: tokens.muted)),
        Text(
            '${s.raw('store.col.fulfilment')}: ${s.raw('store.fulfilment.${o.fulfilment}')}',
            style: TextStyle(color: tokens.muted)),
        const SizedBox(height: 4),
        for (final l in o.lines)
          Text('${lineName(l.productId)} × ${l.qty}'),
        if (o.note != null && o.note!.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text('${s.raw('store.noteFromCustomer')}: ${o.note}',
              style: TextStyle(color: tokens.muted)),
        ],
        if (o.state == 'converted' && convertedNumber != null) ...[
          const SizedBox(height: 6),
          Text(_fill('store.convertedTo', {'number': convertedNumber})),
        ],
        if (o.state == 'new' && canWrite) ...[
          const SizedBox(height: 8),
          Wrap(spacing: 8, children: [
            ElevatedButton.icon(
              onPressed: _busy ? null : () => _showConvert(context, store, o),
              icon: const Icon(Icons.receipt_long_outlined, size: 16),
              label: Text(s.raw('store.convert')),
            ),
            OutlinedButton(
              onPressed: _busy ? null : () => _dismiss(store, o),
              child: Text(s.raw('store.dismiss')),
            ),
          ]),
        ],
        if (o.state == 'converted' && convertedNumber != null) ...[
          const SizedBox(height: 6),
          TextButton.icon(
            onPressed: () => Share.share(
                '${_fill('store.convertedOk', {'number': convertedNumber!})} · ${store.settings.shopName}'),
            icon: const Icon(Icons.chat_outlined, size: 16),
            label: Text(s.raw('store.convertWa')),
          ),
        ],
      ]),
    );
  }

  Future<void> _publish(ShopStore store, Set<String> shown, Set<String> prevHidden) async {
    setState(() => _busy = true);
    final excluded = [
      for (final p in store.products)
        if (!shown.contains(p.id)) p.id,
    ];
    final included = [
      for (final id in prevHidden)
        if (shown.contains(id)) id,
    ];
    final res = await store.publishStorefront(
      slug: store.storefront == null
          ? (_slug.text.trim().isEmpty
              ? suggestSlug(store.settings.shopName)
              : _slug.text.trim())
          : null,
      tagline: _tagline.text.trim().isEmpty ? null : _tagline.text.trim(),
      taglineSet: true,
      notice: _notice.text.trim().isEmpty ? null : _notice.text.trim(),
      noticeSet: true,
      excludedProductIds: excluded,
      includeProductIds: included,
    );
    if (!mounted) return;
    setState(() {
      _busy = false;
      if (res.ok) {
        _banner = S.current.raw('store.publishedOk');
        _bannerOk = true;
        _shownIds = null;
      } else if (res.reason != null && res.reason!.startsWith('slug-')) {
        _banner = S.current.raw('store.slugError.${res.reason!.substring(5)}');
        _bannerOk = false;
      } else {
        _banner = S.current.raw('store.publishFailed');
        _bannerOk = false;
      }
    });
  }

  Future<void> _unpublish(ShopStore store) async {
    setState(() => _busy = true);
    final res = await store.unpublishStorefront();
    if (!mounted) return;
    setState(() {
      _busy = false;
      _banner = res.ok
          ? S.current.raw('store.unpublishedOk')
          : S.current.raw('store.publishFailed');
      _bannerOk = res.ok;
    });
  }

  Future<void> _dismiss(ShopStore store, StoreOrder o) async {
    setState(() => _busy = true);
    final res = await store.dismissStoreOrder(o.id);
    if (!mounted) return;
    setState(() {
      _busy = false;
      _banner = res.ok
          ? S.current.raw('store.dismissedOk')
          : S.current.raw('store.convertFailed');
      _bannerOk = res.ok;
    });
  }

  Future<void> _showConvert(BuildContext context, ShopStore store, StoreOrder o) async {
    final s = S.current;
    // The drift table is planned against LIVE data at the moment
    // of the act — and the store re-plans inside the conversion
    // itself, so this sheet can never confirm stale prices into
    // an order (§2.5).
    final plan = planStoreConversion(o, store.storefront, store.products, store.customers);
    if (!context.mounted) return;
    if (plan == null) {
      setState(() {
        _banner = s.raw('store.convertFailed');
        _bannerOk = false;
      });
      return;
    }
    final total = plan.lines.fold<double>(0, (a, l) => a + l.total);
    // H6 (audit fix 2): consent is the customer's OWN tick on
    // the public checkout form, carried on the order itself —
    // the dialog only DISPLAYS it (below); the store stamps it
    // at conversion from the order's flag alone (§3.2).
    final go = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setLocal) => AlertDialog(
        title: Text(s.raw('store.driftTitle')),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(plan.customer != null
                  ? _fill('store.customerMatch', {'name': plan.customer!.name})
                  : s.raw('store.customerNew')),
              const SizedBox(height: 6),
              Text(s.raw('store.driftNote')),
              const SizedBox(height: 10),
              for (final d in plan.drift)
                Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('${d.name} × ${d.qty % 1 == 0 ? d.qty.toInt() : d.qty}',
                          style: const TextStyle(fontWeight: FontWeight.w600)),
                      if (d.productMissing)
                        Text(s.raw('store.drift.missing'))
                      else
                        Text(
                            '${s.raw('store.drift.published')}: ${d.publishedPrice != null ? fmtRs(d.publishedPrice!) : '—'}'
                            '  ·  ${s.raw('store.drift.live')}: ${fmtRs(d.livePrice!)}'
                            '${d.priceChanged ? ' (${s.raw('store.drift.changed')})' : ''}'),
                    ],
                  ),
                ),
              const SizedBox(height: 6),
              Text(_fill('store.orderTotal', {'total': fmtRs(total)}),
                  style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              if (o.waOptIn)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Chip(
                    avatar: const Icon(Icons.check, size: 16),
                    label: Text(s.raw('wa.consent.storefrontLabel')),
                  ),
                ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(s.raw('action.cancel')),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(s.raw('store.convert')),
          ),
        ],
      )),
    );
    if (go != true) return;
    setState(() => _busy = true);
    final res = await store.convertStoreOrder(o.id);
    if (!mounted) return;
    setState(() {
      _busy = false;
      if (res.ok) {
        _banner = _fill('store.convertedOk', {'number': res.soNumber ?? ''});
        _bannerOk = true;
      } else {
        _banner = s.raw('store.convertFailed');
        _bannerOk = false;
      }
    });
  }

  Future<void> _showPreview(BuildContext context, ShopStore store) async {
    final doc = store.storefront;
    if (doc == null) return;
    final s = S.current;
    final model = storefrontPageModel(doc);
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Row(children: [
          Expanded(child: Text(model.shopName)),
          Chip(label: Text(s.raw('shop.previewBadge'))),
        ]),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (model.tagline != null) Text(model.tagline!),
              if (model.notice != null) ...[
                const SizedBox(height: 4),
                Text(model.notice!),
              ],
              const SizedBox(height: 8),
              for (final g in model.groups) ...[
                if (g.category.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 8, bottom: 4),
                    child: Text(g.category,
                        style: const TextStyle(fontWeight: FontWeight.w700)),
                  ),
                for (final c in g.cards)
                  ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    title: Text(c.name),
                    subtitle: Text(
                        '${fmtRs(c.price)} / ${c.unit} · ${s.raw('store.band.${c.stockState}')}'),
                    trailing: c.orderable
                        ? null
                        : Text(s.raw('shop.outOfStock')),
                  ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(s.raw('action.close')),
          ),
        ],
      ),
    );
  }
}

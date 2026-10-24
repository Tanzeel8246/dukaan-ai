/// Phase H · H4 — the Dart storefront port proven against the
/// REAL web functions: harness/fixtures/h4-core.json is exported
/// from the compiled TypeScript (fixtures-export-h4.js) over the
/// H3 suite's own cases. Every truth table (slugs, bands, the lit
/// rule, the inbox shape validator), every snapshot assembly,
/// the conversion plans with their drift, the member-side
/// journey (compose → inbox → plan → SO born open with source
/// stamps), and the backup platform slice (H3 additions:
/// storefront + storeOrders, seam filter, slug-conflict refusal,
/// pre-H3 files still verify) are compared value-for-value.
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:dukaan_ai/core/backup.dart' as bk;
import 'package:dukaan_ai/core/storefront.dart';
import 'package:dukaan_ai/core/tenancy.dart';
import 'package:dukaan_ai/core/types.dart';

Map<String, dynamic> mm(dynamic v) => (v as Map).cast<String, dynamic>();
List<dynamic> ll(dynamic v) => v as List<dynamic>;

bool deepEq(dynamic a, dynamic b) {
  if (a is num && b is num) return a.toDouble() == b.toDouble();
  if (a is Map && b is Map) {
    if (a.length != b.length) return false;
    for (final k in a.keys) {
      if (!b.containsKey(k) || !deepEq(a[k], b[k])) return false;
    }
    return true;
  }
  if (a is List && b is List) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (!deepEq(a[i], b[i])) return false;
    }
    return true;
  }
  return a == b;
}

void expectDeep(dynamic actual, dynamic expected, String what) {
  expect(deepEq(actual, expected), isTrue,
      reason: '$what\nactual:   ${jsonEncode(actual)}\nexpected: ${jsonEncode(expected)}');
}

void main() {
  final fx = mm(jsonDecode(
      File('../harness/fixtures/h4-core.json').readAsStringSync()));
  final now = fx['now'] as String;
  final biz = fx['businessId'] as String;
  final products = [
    for (final p in ll(fx['products'])) Product.fromMap(p['id'] as String, mm(p)),
  ];
  Product product(String id) => products.firstWhere((p) => p.id == id);

  StorefrontDoc assemble({
    StorefrontDoc? previous,
    List<String> excluded = const [],
    List<String> include = const [],
    List<Product>? prods,
    String? at,
  }) =>
      assembleStorefrontSnapshot(
        businessId: biz,
        slug: 'madina-store',
        shopName: fx['settings']['shopName'] as String,
        phone: fx['settings']['phone'] as String,
        city: 'Sargodha',
        citySet: true,
        logoDataUrl: null,
        logoSet: true,
        products: prods ?? products,
        excludedProductIds: excluded,
        includeProductIds: include,
        previous: previous,
        nowISO: at ?? now,
      );

  group('slugs, suggestions, bands', () {
    test('the slug truth table', () {
      for (final c in ll(fx['slugCases'])) {
        final input = c['input'] as String;
        expect(slugProblem(input), c['problem'], reason: 'slugProblem($input)');
        expect(slugOk(input), c['ok'], reason: 'slugOk($input)');
      }
    });
    test('suggestions', () {
      for (final c in ll(fx['suggestCases'])) {
        expect(suggestSlug(c['name'] as String), c['slug']);
      }
    });
    test('stock bands — never counts', () {
      for (final c in ll(fx['bandCases'])) {
        expect(
          stockBandFor((c['stockQty'] as num).toDouble(),
              (c['reorderLevel'] as num).toDouble()),
          c['band'],
        );
      }
    });
    test('the link seams', () {
      final links = mm(fx['linkCases']);
      expect(storefrontPath('madina-store'), links['path']);
      expect(storefrontUrl('madina-store'), links['url']);
      expect(resolveStorefrontLink('madina-store'), links['resolved']);
      expect(resolveStorefrontLink(''), links['resolvedEmpty']);
      expect(resolveStorefrontLink(null), links['resolvedNull']);
    });
  });

  group('snapshot assembly + the republish seam', () {
    final cases = mm(fx['snapshotCases']);
    test('first publish', () {
      expectDeep(assemble().toMap(), cases['first'], 'first snapshot');
    });
    test('hide, stickiness, re-show, price move', () {
      final first = StorefrontDoc.fromMap(mm(cases['first']));
      final hidden = assemble(previous: first, excluded: ['p-tea']);
      expectDeep(hidden.toMap(), cases['hidden'], 'hidden snapshot');
      final still = assemble(previous: hidden);
      expectDeep(still.toMap(), cases['stillHidden'], 'sticky hidden');
      final shown = assemble(previous: hidden, include: ['p-tea']);
      expectDeep(shown.toMap(), cases['shown'], 're-shown');
      final moved = assemble(
        previous: first,
        prods: [
          for (final p in products)
            p.id == 'p-rice'
                ? Product.fromMap(p.id, {...p.toMap(), 'id': p.id, 'salePrice': 1500})
                : p,
        ],
      );
      expectDeep(moved.toMap(), cases['priceMoved'], 'price moved');
    });
    test('content equality — the auto-republish seam', () {
      final first = StorefrontDoc.fromMap(mm(cases['first']));
      final restamped = assemble(previous: first, at: '2026-10-24T10:00:00.000Z');
      expect(storefrontContentEqual(first, restamped),
          cases['contentEqualRestamped']);
      final moved = StorefrontDoc.fromMap(mm(cases['priceMoved']));
      expect(storefrontContentEqual(first, moved), cases['contentEqualPriceMoved']);
      expect(storefrontContentEqual(first, null), cases['contentEqualNull']);
      expect(storefrontContentEqual(first, first), cases['contentEqualSame']);
    });
    test('the public page model — hidden products never render', () {
      // The exporter's model is built over the HIDDEN snapshot:
      // the hidden card (p-tea) is absent from cards and groups.
      final hidden = StorefrontDoc.fromMap(mm(cases['hidden']));
      expectDeep(storefrontPageModel(hidden).toMap(), fx['pageModel'], 'page model');
    });
  });

  group('the lit rule', () {
    test('registry-level cases', () {
      for (final c in ll(fx['litCases'])) {
        final registry =
            c['registry'] == null ? null : BusinessRegistryDoc.fromMap(mm(c['registry']));
        final doc = c['doc'] == null ? null : StorefrontDoc.fromMap(mm(c['doc']));
        expect(storefrontLit(registry, doc, now), c['lit'],
            reason: 'lit case ${c['name']}');
      }
    });
    test('tier × state × enabled', () {
      final first = StorefrontDoc.fromMap(mm(fx['snapshotCases']['first']));
      for (final c in ll(fx['litStateCases'])) {
        final doc = StorefrontDoc.fromMap({
          ...first.toMap(),
          'enabled': c['enabled'],
          'modulesTier': c['tier'],
        });
        expect(storefrontLitState(c['tier'] as String, c['state'] as String, doc),
            c['lit'],
            reason: 'litState ${c['tier']}/${c['state']}/enabled=${c['enabled']}');
      }
    });
  });

  group('the inbox — strict shape, compose, phones', () {
    test('the validator accept/refuse table', () {
      for (final c in ll(fx['shapeCases'])) {
        expect(storeOrderShapeOk(c['data']), c['ok'],
            reason: 'shape case ${c['name']}');
      }
    });
    test('compose merges duplicates; overflow refuses whole', () {
      final cc = mm(fx['composeCases']);
      final merged = composeStoreOrder(
        customerName: '  Ahmed Raza ',
        phone: '0301-2345678',
        note: ' ',
        fulfilment: 'delivery',
        lines: const [
          (productId: 'p-rice', qty: 2.0),
          (productId: 'p-rice', qty: 3.0),
          (productId: 'p-oil', qty: 1.0),
        ],
        businessId: biz,
        slug: 'madina-store',
        nowISO: now,
      );
      expectDeep(merged, cc['merged'], 'composed merged order');
      final overflow = composeStoreOrder(
        customerName: 'A',
        phone: '0301-2345678',
        fulfilment: 'pickup',
        lines: const [
          (productId: 'p-rice', qty: 600.0),
          (productId: 'p-rice', qty: 600.0),
        ],
        businessId: biz,
        slug: 'madina-store',
        nowISO: now,
      );
      expect(overflow, cc['overflow']);
    });
    test('phone normalization', () {
      for (final c in ll(fx['phoneCases'])) {
        expect(normalizePhone(c['phone'] as String), c['normalized']);
      }
    });
  });

  group('conversion planning + the SO builder', () {
    final cc = mm(fx['conversionCases']);
    final customers = [
      for (final c in ll(cc['customers']))
        Customer.fromMap(c['id'] as String, mm(c)),
    ];
    final order = StoreOrder.fromMap('ord-1', mm(cc['order']));
    final snapshot = StorefrontDoc.fromMap(mm(fx['snapshotCases']['first']));
    final productsMoved = [
      for (final p in ll(cc['productsMoved']))
        Product.fromMap(p['id'] as String, mm(p)),
    ];
    final settings = ShopSettingsView.fromMap(mm(fx['settings']));

    test('the clean plan', () {
      final plan = planStoreConversion(order, snapshot, products, customers);
      expect(plan, isNotNull);
      expectDeep(plan!.toMap(), cc['clean'], 'clean plan');
    });
    test('the drift plan — both prices, dropped product flagged', () {
      final plan = planStoreConversion(order, snapshot, productsMoved, customers);
      expect(plan, isNotNull);
      expectDeep(plan!.toMap(), cc['drift'], 'drift plan');
    });
    test('refusals: all-missing, converted, dismissed', () {
      final oilOnly = StoreOrder.fromMap('ord-1', {
        ...mm(cc['order']),
        'lines': [
          {'productId': 'p-oil', 'qty': 1},
        ],
      });
      expect(planStoreConversion(oilOnly, snapshot, productsMoved, customers) == null,
          cc['allMissingNull']);
      final converted = StoreOrder.fromMap(
          'ord-1', {...mm(cc['order']), 'state': 'converted'});
      expect(planStoreConversion(converted, snapshot, products, customers) == null,
          cc['convertedNull']);
      final dismissed = StoreOrder.fromMap(
          'ord-1', {...mm(cc['order']), 'state': 'dismissed'});
      expect(planStoreConversion(dismissed, snapshot, products, customers) == null,
          cc['dismissedNull']);
    });
    test('no snapshot — the plan still forms, published prices unknown', () {
      final plan = planStoreConversion(order, null, products, customers);
      expect(plan, isNotNull);
      expectDeep(plan!.toMap(), cc['noSnapshotPlan'], 'no-snapshot plan');
    });
    test('the SO from the drift plan — born open, source-stamped', () {
      final plan = planStoreConversion(order, snapshot, productsMoved, customers)!;
      final so = buildStoreSaleOrder(
        order,
        plan,
        number: 'SO-1',
        customerId: 'cu-1',
        customerName: 'Ahmed Raza',
        customerPhone: '+92 301 2345678',
        products: productsMoved,
        taxSlabs: const [],
        settings: settings,
        nowISO: now,
      );
      expectDeep(_soShape(so), cc['soFromDrift'], 'SO from drift');
      expect(so.status, 'open');
      expect(so.sourceType, 'storefront');
      expect(so.sourceOrderId, 'ord-1');
    });
    test('inbox counts', () {
      final counts = storeOrderCounts([
        order,
        StoreOrder.fromMap('o2', {...mm(cc['order']), 'state': 'converted'}),
        StoreOrder.fromMap('o3', {...mm(cc['order']), 'state': 'dismissed'}),
      ]);
      expect(counts.fresh, cc['counts']['fresh']);
      expect(counts.converted, cc['counts']['converted']);
      expect(counts.dismissed, cc['counts']['dismissed']);
    });
    test('the matched customer is the fixture customer', () {
      expect(product('p-rice').name, 'Rice Basmati 5kg');
      final plan = planStoreConversion(order, snapshot, products, customers)!;
      expect(plan.customer?.id, 'cu-1');
    });
  });

  group('the member-side journey, replayed', () {
    test('compose → inbox → plan → convert: SO-9 born open', () {
      final j = mm(fx['journey']);
      final composed = composeStoreOrder(
        customerName: 'Ahmed Raza',
        phone: '0301-2345678',
        fulfilment: 'pickup',
        lines: const [(productId: 'p-rice', qty: 2.0)],
        businessId: biz,
        slug: 'madina-store',
        nowISO: now,
      );
      expect(composed, isNotNull);
      final expectedOrder = {...mm(j['order'])};
      expectedOrder.remove('id');
      expectDeep(composed, expectedOrder, 'journey composed order');
      final order = StoreOrder.fromMap('ord-9', composed!);
      final snapshot = StorefrontDoc.fromMap(mm(fx['snapshotCases']['first']));
      final customers = [
        for (final c in ll(mm(fx['conversionCases'])['customers']))
          Customer.fromMap(c['id'] as String, mm(c)),
      ];
      final plan = planStoreConversion(order, snapshot, products, customers);
      expect(plan, isNotNull);
      expectDeep(plan!.toMap(), j['plan'], 'journey plan');
      final so = buildStoreSaleOrder(
        order,
        plan,
        number: 'SO-9',
        customerId: 'cu-1',
        customerName: 'Ahmed Raza',
        customerPhone: '0301-2345678',
        products: products,
        taxSlabs: const [],
        settings: ShopSettingsView.fromMap(mm(fx['settings'])),
        nowISO: now,
      );
      expectDeep(_soShape(so), j['so'], 'journey SO');
      // Exactly-once: the same order, once converted, plans no more.
      final converted = StoreOrder.fromMap(
          'ord-9', {...composed, 'state': 'converted'});
      expect(planStoreConversion(converted, snapshot, products, customers), isNull);
    });
  });

  group('backup parity — the H3 platform slice', () {
    final bc = mm(fx['backupCases']);
    final inputs = mm(bc['inputs']);

    bk.KeyedDoc kd(dynamic v) =>
        bk.KeyedDoc(key: v['key'] as String, data: mm(v['data']));
    List<bk.KeyedDoc> kds(dynamic v) => [for (final e in ll(v)) kd(e)];

    bk.BackupPlatformSlice sliceOf(Map<String, dynamic> raw) =>
        bk.BackupPlatformSlice(
          // The singles ride the Dart slice as bare data maps
          // (their doc keys are always the businessId itself).
          registry: raw['registry'] == null ? null : mm(mm(raw['registry'])['data']),
          counters: raw['counters'] == null ? null : mm(mm(raw['counters'])['data']),
          stats: raw['stats'] == null ? null : mm(mm(raw['stats'])['data']),
          members: kds(raw['members']),
          invites: kds(raw['invites']),
          events: kds(raw['events']),
          payments: kds(raw['payments']),
          storefront: raw['storefront'] == null ? null : kd(raw['storefront']),
          storeOrders: kds(raw['storeOrders']),
        );

    Map<String, dynamic> assembleFrom(Map<String, dynamic> inp) =>
        bk.assembleBackup(
          businessId: inp['businessId'] as String,
          exportedAt: inp['exportedAt'] as String,
          exportedBy: inp['exportedBy'] as String,
          owner: mm(inp['owner']),
          collections: {
            for (final e in mm(inp['collections']).entries)
              e.key: [for (final d in ll(e.value)) mm(d)],
          },
          platform: sliceOf(mm(inp['platform'])),
        );

    test('assemble: the file is byte-equal in structure, H3 slice included', () {
      final assembled = assembleFrom(inputs);
      // H5 lineage amendment: assembleBackup now also emits the
      // WhatsApp trio (empty arrays + zero counts — the H4-era
      // inputs carry no WA docs). The trio's own bytes are proven
      // in h5_fixtures_test.dart; project it out here so this
      // comparison stays about exactly the slices H4 pinned.
      for (final wa in const ['waTemplates', 'waCampaigns', 'waSends']) {
        mm(assembled['collections']).remove(wa);
        mm(mm(assembled['manifest'])['counts']).remove(wa);
      }
      expectDeep(assembled, bc['file'], 'assembled backup file');
    });
    test('the seam: a FOREIGN storefront is dropped at assembly', () {
      final snapFirst = mm(fx['snapshotCases']['first']);
      final foreignInputs = {
        ...inputs,
        'platform': {
          ...mm(inputs['platform']),
          'storefront': {
            'key': 'other-shop',
            'data': {...snapFirst, 'businessId': 'another-shop', 'slug': 'other-shop'},
          },
          'storeOrders': <dynamic>[],
        },
      };
      final file = assembleFrom(foreignInputs);
      final expected = mm(bc['foreignFront']);
      expect(mm(file['platform'])['storefront'], expected['storefront']);
      expectDeep(mm(file['manifest'])['platformCounts'], expected['counts'],
          'foreign-front platform counts');
    });
    test('verify: the H4 file and a pre-H3 legacy file both verify', () {
      final file = mm(bc['file']);
      expect(bk.verifyBackup(file).ok, bc['fileVerifies']);
      final legacy = mm(jsonDecode(jsonEncode(file)));
      mm(legacy['platform']).remove('storefront');
      mm(legacy['platform']).remove('storeOrders');
      mm(mm(legacy['manifest'])['platformCounts']).remove('storefront');
      mm(mm(legacy['manifest'])['platformCounts']).remove('storeOrders');
      expect(bk.verifyBackup(legacy).ok, bc['legacyVerifies']);
    });

    Map<String, dynamic> planShape(bk.RestorePlan p) => p.ok
        ? {
            'ok': true,
            'skipped': p.skipped,
            'alreadyRestored': p.alreadyRestored,
            'setPaths': [
              for (final w in p.writes)
                if (w.kind == 'set') w.path,
            ],
            'addCollections': [
              for (final w in p.writes)
                if (w.kind == 'add') w.collection,
            ],
            'eventKind': p.event?['kind'],
          }
        : {'ok': false, 'reason': p.reason, 'conflicts': p.conflicts};

    bk.RestorePlan planFor(bk.RestoreTarget target) => bk.planRestore(
          file: mm(bc['file']),
          targetBusinessId: biz,
          target: target,
          actorUid: biz,
          nowISO: now,
        );

    test('restore plans: empty, foreign slug, changed content, foreign order', () {
      expectDeep(planShape(planFor(bk.emptyNamespace())), bc['planEmpty'],
          'plan into an empty namespace');
      final foreignSlug = bk.emptyNamespace()
        ..storefront = bk.KeyedDoc(
            key: 'someone-else', data: {'businessId': biz, 'slug': 'someone-else'});
      expectDeep(planShape(planFor(foreignSlug)), bc['planForeignSlug'],
          'plan against a foreign slug');
      final snapFirst = mm(fx['snapshotCases']['first']);
      final diffContent = bk.emptyNamespace()
        ..storefront = bk.KeyedDoc(
            key: 'madina-store',
            data: {...snapFirst, 'shopName': 'A Different Shop'});
      expectDeep(planShape(planFor(diffContent)), bc['planSlugDiffContent'],
          'plan against the same slug, different content');
      final goodOrder =
          mm(ll(fx['shapeCases']).firstWhere((c) => c['name'] == 'good')['data']);
      final foreignOrder = bk.emptyNamespace()
        ..storeOrders = [bk.KeyedDoc(key: 'ord-9', data: goodOrder)];
      expectDeep(planShape(planFor(foreignOrder)), bc['planForeignOrder'],
          'plan against a foreign inbox doc');
    });
    test('restore plan: the resume — everything already landed', () {
      final t = mm(bc['planResumeTarget']);
      final target = bk.RestoreTarget(
        owner: mm(t['owner']),
        collections: {
          for (final e in mm(t['collections']).entries)
            e.key: [for (final d in ll(e.value)) mm(d)],
        },
        members: kds(t['members']),
        invites: kds(t['invites']),
        storefront: kd(t['storefront']),
        storeOrders: kds(t['storeOrders']),
      );
      expectDeep(planShape(planFor(target)), bc['planResume'], 'resume plan');
    });
  });
}

Map<String, dynamic> _soShape(SaleOrder so) => {
      'number': so.number,
      'customerId': so.customerId,
      'customerName': so.customerName,
      'customerPhone': so.customerPhone,
      'lines': so.lines.map((l) => l.toMap()).toList(),
      'subtotal': so.subtotal,
      'discountType': so.discountType,
      'discountValue': so.discountValue,
      'discountAmount': so.discountAmount,
      'estimatedTax': so.estimatedTax,
      'total': so.total,
      'source': so.source,
      'sourceType': so.sourceType,
      'sourceOrderId': so.sourceOrderId,
      'expectedDate': so.expectedDate,
      'note': so.note,
      'status': so.status,
      'dayOffset': so.dayOffset,
      'ts': so.ts,
    };

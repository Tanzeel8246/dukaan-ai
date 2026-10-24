/// G5 catalogue invariants (design §3.2/§3.3): the generated
/// catalogue data must partition the app's RBAC modules exactly
/// (40 at G5; H2 added the Growth band — loyalty — for 41; H4 pin
/// amendment: storefront joins the Advanced band for 42 — the
/// web's H3 catalogue pin, Phase H design §2.6/§5.1; H5 pin
/// amendment: whatsapp joins the Growth band beside loyalty for
/// 43 — the web's WA catalogue pin, Phase H design §3.1/§5.1)
/// (core ⊂ standard ⊂ advanced, disjoint tier bands), ranks must
/// order the tiers, and the catalogue figures must match the
/// design's plan table. These are unit checks on the generated
/// data + the pure Dart derivations — the fixture suite proves
/// semantics against web; this suite proves the static shape.
import 'package:flutter_test/flutter_test.dart';
import 'package:dukaan_ai/core/permissions_data.dart';
import 'package:dukaan_ai/core/plans.dart';
import 'package:dukaan_ai/core/plans_data.dart';

void main() {
  group('catalogue partition (§3.2/§3.3)', () {
    test('the five tier bands are disjoint and cover all 43 modules', () {
      final bands = [coreModulesData, documentsModulesData, operationsModulesData, growthModulesData, advancedModulesData];
      final seen = <String>{};
      for (final band in bands) {
        for (final mod in band) {
          expect(seen.add(mod), isTrue, reason: '$mod appears in two bands');
        }
      }
      expect(seen.length, 43);
      expect(seen, permModules.toSet());
      expect(coreModulesData.length, 26);
      expect(documentsModulesData.length, 6);
      expect(operationsModulesData.length, 2);
      // H4 pin amendment: the Advanced band gains storefront (6 → 7).
      expect(advancedModulesData.length, 7);
      expect(advancedModulesData.contains('storefront'), isTrue);
      // H2: the Growth band holds the loyalty module.
      // H5 pin amendment: whatsapp joins it (the Growth pair).
      expect(growthModulesData, ['loyalty', 'whatsapp']);
    });

    test('cumulative tier sets nest: core ⊂ standard ⊂ advanced', () {
      expect(moduleSets['core']!.length, 26);
      // H5 pin amendment: the Standard cumulative set gains whatsapp (35 → 36).
      expect(moduleSets['standard']!.length, 36);
      // H4 pin amendment: the Advanced cumulative set gains storefront (41 → 42).
      // H5 pin amendment: it gains whatsapp with the Growth band (42 → 43).
      expect(moduleSets['advanced']!.length, 43);
      expect(moduleSets['standard']!.toSet().containsAll(moduleSets['core']!), isTrue);
      expect(moduleSets['advanced']!.toSet().containsAll(moduleSets['standard']!), isTrue);
    });

    test('tierIncludesModule / moduleMinTier agree with the bands', () {
      expect(tierIncludesModule('core', 'billing'), isTrue);
      expect(tierIncludesModule('core', 'quotations'), isFalse);
      expect(tierIncludesModule('standard', 'quotations'), isTrue);
      expect(tierIncludesModule('standard', 'warehouses'), isTrue);
      expect(tierIncludesModule('standard', 'manufacturing'), isFalse);
      expect(tierIncludesModule('advanced', 'manufacturing'), isTrue);
      expect(tierIncludesModule('advanced', 'staffDirectory'), isTrue);
      expect(tierIncludesModule('standard', 'staffDirectory'), isFalse);
      expect(moduleMinTier('billing'), 'core');
      expect(moduleMinTier('quotations'), 'standard');
      expect(moduleMinTier('warehouses'), 'standard');
      expect(moduleMinTier('jobTracker'), 'standard');
      expect(moduleMinTier('manufacturing'), 'advanced');
      expect(moduleMinTier('loans'), 'advanced');
      // Unlisted modules sit at Core (the TS moduleMinTier default).
      expect(moduleMinTier('not-a-module'), 'core');
    });

    test('ranks: module tiers core < standard < advanced; plan ranks order the catalogue', () {
      expect(tierRankOf('core'), 1);
      expect(tierRankOf('standard'), 2);
      expect(tierRankOf('advanced'), 3);
      expect(tierRankTable.length, 3);
      expect(planCatalogueData['trial']!.tierRank, 0);
      expect(planCatalogueData['basic']!.tierRank, 1);
      expect(planCatalogueData['standard']!.tierRank, 2);
      expect(planCatalogueData['advanced']!.tierRank, 3);
      expect(planCatalogueData['founding']!.tierRank, 3);
      expect(planCatalogueData['enterprise']!.tierRank, 4);
    });

    test('catalogue figures match the design plan table', () {
      final trial = planCatalogueData['trial']!;
      expect(trial.priceMonthlyPKR, 0);
      expect(trial.usersLimit, 2);
      expect(trial.invoiceLimit, 200);
      // The trial runs on the Standard module set (design §3.1).
      expect(trial.modulesTier, 'standard');
      final basic = planCatalogueData['basic']!;
      expect(basic.priceMonthlyPKR, 1500);
      expect(basic.usersLimit, 3);
      expect(basic.invoiceLimit, 500);
      final standard = planCatalogueData['standard']!;
      expect(standard.priceMonthlyPKR, 2500);
      expect(standard.usersLimit, 5);
      expect(standard.invoiceLimit, 2000);
      expect(standard.modulesTier, 'standard');
      final advanced = planCatalogueData['advanced']!;
      expect(advanced.priceMonthlyPKR, 4000);
      expect(advanced.usersLimit, 10);
      expect(advanced.invoiceLimit, 10000);
      final enterprise = planCatalogueData['enterprise']!;
      expect(enterprise.priceMonthlyPKR, isNull);
      expect(enterprise.usersLimit, isNull);
      expect(enterprise.invoiceLimit, isNull);
      final founding = planCatalogueData['founding']!;
      expect(founding.priceMonthlyPKR, isNull);
      expect(founding.usersLimit, 10);
      expect(founding.invoiceLimit, 10000);
      expect(founding.modulesTier, 'advanced');
      expect(annualMonthsChargedData, 10);
    });

    test('door maps: ref types and collection tiers mirror the web tables', () {
      // Journal refTypes above Core (§4.1) — unlisted means Core.
      expect(refTypeMinTierData['purchase_return'], 'standard');
      expect(refTypeMinTierData['cheque_clearing'], 'standard');
      expect(refTypeMinTierData['job_material'], 'standard');
      expect(refTypeMinTierData['production_issue'], 'advanced');
      expect(refTypeMinTierData['loan_drawdown'], 'advanced');
      expect(refTypeMinTierData['fy_close'], 'advanced');
      final standardSnap = snapshotFor('standard', '2026-10-23T10:00:00.000Z', assignedBy: 'admin');
      final basicSnap = snapshotFor('basic', '2026-10-23T10:00:00.000Z', assignedBy: 'admin');
      final advancedSnap = snapshotFor('advanced', '2026-10-23T10:00:00.000Z', assignedBy: 'admin');
      expect(refTypeTierOk(standardSnap, 'bill'), isTrue); // unlisted ⇒ Core
      expect(refTypeTierOk(standardSnap, 'purchase_return'), isTrue);
      expect(refTypeTierOk(basicSnap, 'purchase_return'), isFalse);
      expect(refTypeTierOk(standardSnap, 'production_issue'), isFalse);
      expect(refTypeTierOk(advancedSnap, 'production_issue'), isTrue);
      // Operational collections whose CREATE is tier-checked.
      expect(collectionCreateTierData['loans'], 'advanced');
      expect(collectionCreateTierData['employees'], 'advanced');
      expect(collectionCreateTierData['jobs'], 'standard');
      expect(collectionTierOk(advancedSnap, 'loans'), isTrue);
      expect(collectionTierOk(standardSnap, 'loans'), isFalse);
      expect(collectionTierOk(standardSnap, 'jobs'), isTrue);
      expect(collectionTierOk(basicSnap, 'jobs'), isFalse);
    });
  });
}

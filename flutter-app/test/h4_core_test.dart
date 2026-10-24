/// Phase H · H4 — native (non-fixture) checks for the storefront
/// port: the RBAC row, the plan-tier gate, the settings link seam,
/// and the SaleOrder source stamps' round-trip. The semantic
/// truth tables live in h4_fixtures_test.dart (proven against the
/// web functions); these pin the app-side wiring contracts.
import 'package:flutter_test/flutter_test.dart';
import 'package:dukaan_ai/core/permissions.dart';
import 'package:dukaan_ai/core/plans.dart';
import 'package:dukaan_ai/core/storefront.dart';
import 'package:dukaan_ai/core/types.dart';

void main() {
  group('RBAC — the storefront row', () {
    test('owner and manager run the desk; accountant reads; cashier is out', () {
      expect(can('owner', 'storefront', 'view'), isTrue);
      expect(can('owner', 'storefront', 'write'), isTrue);
      expect(can('manager', 'storefront', 'view'), isTrue);
      expect(can('manager', 'storefront', 'write'), isTrue);
      expect(can('accountant', 'storefront', 'view'), isTrue);
      expect(can('accountant', 'storefront', 'write'), isFalse);
      expect(can('cashier', 'storefront', 'view'), isFalse);
      expect(can('cashier', 'storefront', 'write'), isFalse);
    });
  });

  group('the plan gate — storefront is an Advanced module', () {
    test('tier membership', () {
      expect(moduleMinTier('storefront'), 'advanced');
      expect(tierIncludesModule('core', 'storefront'), isFalse);
      expect(tierIncludesModule('standard', 'storefront'), isFalse);
      expect(tierIncludesModule('advanced', 'storefront'), isTrue);
    });
  });

  group('the settings link seam', () {
    test('the cached slug resolves; absence stays null', () {
      final withSlug = ShopSettingsView.fromMap(const {
        'shopName': 'Madina General Store',
        'storefrontSlug': 'madina-store',
      });
      expect(withSlug.storefrontSlug, 'madina-store');
      expect(resolveStorefrontLink(withSlug.storefrontSlug),
          'https://dukaan-ai.codehubb.com/s/madina-store');
      final without = ShopSettingsView.fromMap(const {'shopName': 'X'});
      expect(without.storefrontSlug, isNull);
      expect(resolveStorefrontLink(without.storefrontSlug), isNull);
    });
    test('the auto-republish block rides settings verbatim', () {
      final v = ShopSettingsView.fromMap(const {
        'storefront': {'autoRepublish': true},
      });
      expect(v.storefrontBlock['autoRepublish'], isTrue);
      final off = ShopSettingsView.fromMap(const {});
      expect(off.storefrontBlock['autoRepublish'], isNot(true));
    });
  });

  group('SaleOrder source stamps', () {
    SaleOrder born() => SaleOrder(
          id: 'so-1',
          number: 'SO-1',
          customerId: 'cu-1',
          customerName: 'Ahmed Raza',
          customerPhone: '0301-2345678',
          lines: const [],
          subtotal: 0,
          discountType: 'flat',
          discountValue: 0,
          discountAmount: 0,
          estimatedTax: 0,
          total: 0,
          status: 'open',
          sourceType: 'storefront',
          sourceOrderId: 'ord-1',
          dayOffset: 0,
          ts: '2026-10-23T10:00:00.000Z',
        );
    test('the stamps round-trip through toMap/fromMap', () {
      final so = born();
      final back = SaleOrder.fromMap(so.id, so.toMap());
      expect(back.sourceType, 'storefront');
      expect(back.sourceOrderId, 'ord-1');
      expect(back.status, 'open');
    });
    test('an unstamped order emits no source keys (pre-H4 shape kept)', () {
      final plain = SaleOrder(
        id: 'so-2',
        number: 'SO-2',
        lines: const [],
        subtotal: 0,
        discountType: 'flat',
        discountValue: 0,
        discountAmount: 0,
        estimatedTax: 0,
        total: 0,
        status: 'open',
        dayOffset: 0,
        ts: '2026-10-23T10:00:00.000Z',
      );
      expect(plain.toMap().containsKey('sourceType'), isFalse);
      expect(plain.toMap().containsKey('sourceOrderId'), isFalse);
      final back = SaleOrder.fromMap(plain.id, plain.toMap());
      expect(back.sourceType, isNull);
      expect(back.sourceOrderId, isNull);
    });
  });

  group('typed inbox counts', () {
    StoreOrder order(String id, String state) => StoreOrder.fromMap(id, {
          'businessId': 'biz',
          'slug': 'madina-store',
          'customerName': 'A',
          'phone': '0301-2345678',
          'lines': [
            {'productId': 'p-rice', 'qty': 1},
          ],
          'fulfilment': 'pickup',
          'createdAt': '2026-10-23T10:00:00.000Z',
          'state': state,
        });
    test('fresh / converted / dismissed', () {
      final counts = storeOrderCounts([
        order('o1', 'new'),
        order('o2', 'new'),
        order('o3', 'converted'),
        order('o4', 'dismissed'),
      ]);
      expect(counts.fresh, 2);
      expect(counts.converted, 1);
      expect(counts.dismissed, 1);
      final empty = storeOrderCounts(const []);
      expect(empty.fresh + empty.converted + empty.dismissed, 0);
    });
  });
}

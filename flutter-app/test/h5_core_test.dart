/// Phase H · H5 — native (non-fixture) checks for the WhatsApp
/// port: the RBAC row, the plan-tier gate, the doc shapes the
/// store writes (audience params ride only their own kind's
/// keys; a draft campaign carries resolvedCount: null), the
/// consent fields' round-trip on Customer, and the degenerate
/// edges (empty queue, empty progress, no-row udhaar). The
/// semantic truth tables live in h5_fixtures_test.dart (proven
/// against the web functions); these pin the app-side wiring
/// contracts.
import 'package:flutter_test/flutter_test.dart';
import 'package:dukaan_ai/core/permissions.dart';
import 'package:dukaan_ai/core/plans.dart';
import 'package:dukaan_ai/core/types.dart';
import 'package:dukaan_ai/core/whatsapp.dart';

void main() {
  group('RBAC — the whatsapp row', () {
    test('owner and manager run the desk; accountant reads; cashier is out',
        () {
      expect(can('owner', 'whatsapp', 'view'), isTrue);
      expect(can('owner', 'whatsapp', 'write'), isTrue);
      expect(can('manager', 'whatsapp', 'view'), isTrue);
      expect(can('manager', 'whatsapp', 'write'), isTrue);
      expect(can('accountant', 'whatsapp', 'view'), isTrue);
      expect(can('accountant', 'whatsapp', 'write'), isFalse);
      expect(can('cashier', 'whatsapp', 'view'), isFalse);
      expect(can('cashier', 'whatsapp', 'write'), isFalse);
    });
  });

  group('the plan gate — whatsapp is a Standard (Growth) module', () {
    test('tier membership', () {
      expect(moduleMinTier('whatsapp'), 'standard');
      expect(tierIncludesModule('core', 'whatsapp'), isFalse);
      expect(tierIncludesModule('standard', 'whatsapp'), isTrue);
      expect(tierIncludesModule('advanced', 'whatsapp'), isTrue);
    });
  });

  group('doc shapes the store writes', () {
    test('an audience doc carries only its own kind\'s params', () {
      expect(const WaAudience.allOptedIn().toMap(), {'kind': 'all_opted_in'});
      expect(const WaAudience.udhaar(minRs: 100, minDays: 7).toMap(), {
        'kind': 'udhaar_outstanding',
        'minRs': 100.0,
        'minDays': 7,
      });
      expect(const WaAudience.tierOf('gold').toMap(),
          {'kind': 'tier', 'tier': 'gold'});
      expect(WaAudience.fromMap(const {'kind': 'inactive', 'days': 30}).days,
          30);
    });
    test('a draft campaign serialises with resolvedCount: null', () {
      const c = WaCampaign(id: 'wc-1', name: 'Eid', templateId: 'wt-1');
      final m = c.toMap();
      expect(m.containsKey('resolvedCount'), isTrue);
      expect(m['resolvedCount'], isNull);
      expect(m['state'], 'draft');
      final back = WaCampaign.fromMap('wc-1', m);
      expect(back.resolvedCount, isNull);
      expect(back.audience.kind, 'all_opted_in');
    });
    test('a send row round-trips; copyWith moves only the state', () {
      const s = WaSend(
          id: 'ws-1',
          campaignId: 'wc-1',
          customerId: 'cu-1',
          phone: '0300-1112233',
          ts: '2026-11-15T10:00:00.000Z');
      final back = WaSend.fromMap('ws-1', s.toMap());
      expect(back.phone, '0300-1112233');
      expect(back.copyWith(state: 'sent').state, 'sent');
      expect(back.copyWith(state: 'sent').phone, '0300-1112233');
    });
  });

  group('consent on the Customer doc', () {
    test('an unstamped customer writes NO consent keys (web patch parity)',
        () {
      const c = Customer(id: 'cu-1', name: 'A');
      expect(c.toMap().containsKey('waOptIn'), isFalse);
      expect(customerOptedIn(c), isFalse);
    });
    test('a stamped customer round-trips all three fields', () {
      final c = Customer.fromMap('cu-1', const {
        'name': 'A',
        'waOptIn': true,
        'waOptInAt': '2026-10-01T00:00:00.000Z',
        'waOptInSource': 'storefront',
      });
      expect(customerOptedIn(c), isTrue);
      expect(c.toMap()['waOptInSource'], 'storefront');
    });
    test('stripImportConsent does not mutate its input row', () {
      final row = <String, dynamic>{'name': 'X', 'waOptIn': 'yes'};
      final out = stripImportConsent(row);
      expect(row.containsKey('waOptIn'), isTrue);
      expect(out.containsKey('waOptIn'), isFalse);
    });
  });

  group('degenerate edges', () {
    test('an empty queue has no head; empty progress is complete', () {
      expect(waQueueStep(const [], const [], null), isNull);
      final p = waCampaignProgress(const []);
      expect(p.total, 0);
      expect(p.complete, isTrue);
    });
    test('udhaar position of a customer with no rows is zero', () {
      final pos = customerUdhaarPosition(const [], 'nobody');
      expect(pos.outstanding, 0);
      expect(pos.oldestAgeDays, 0);
    });
    test('a transition on a terminal row is a no-op (facts stay facts)', () {
      const s = WaSend(id: 'ws-9', phone: '0300-1112233', state: 'sent');
      const c = Customer(id: 'cu-1', waOptIn: true);
      expect(waSendTransition(s, 'sent', c).state, 'sent');
      expect(waSendTransition(s, 'opened', c).state, 'sent');
    });
  });
}

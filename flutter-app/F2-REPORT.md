# F2 Completion Report — Dukaan AI Flutter App

**Phase:** F (Flutter apps) · Increment F2 — back office + documents + finance + reports
**Design:** `../ERP-PHASE-F-DESIGN.md` (§F2 scope)
**Run:** 2026-10-23. Proof standard (as F1): `flutter analyze` +
`flutter test` + the TS harness — local APK builds are blocked on
this VM (Gradle↔Java IPC hang) and the GitHub push is blocked by
the App 403, so no build, CI run or device behaviour is claimed
anywhere in this report.

## Verification (all observed in this run)

| Check | Result |
|---|---|
| `flutter analyze` | **No issues found** |
| `flutter test` | **88/88 passed** — 38 F1 + 35 F2 fixture tests + 15 F2 core tests |
| TS harness | **1,389 passed, 0 failed** ("ALL SUITES GREEN") |
| Fixture byte-stability | `f1-core.json` md5 `cfad6131345760fb0fe6591866b8dae1` and `f2-core.json` md5 `f77ad00a370f603bf519c3f7f1ae935d` — identical before and after regeneration |
| i18n drift gate | `node tools/gen_l10n.mjs --check` → clean (2,580 keys EN ≡ UR; 40-module matrix) |

## Golden fixtures first (the F1 pattern)

`harness/fixtures-export-f2.js` (new, additive; the F1 exporter
and fixture untouched) exports `fixtures/f2-core.json`: **22
scenarios, 25 journal entries, whole-journal trial balance 0**,
composed by the WEB composers. The Dart suite
(`test/f2_fixtures_test.dart`) re-composes every scenario with the
Dart ports and asserts byte-for-byte equality (memo / refType /
refId / reversal links / lines), plus:

- the **P&L ≡ Sales-report identity in Dart** (plNetRevenue
  3735 == netSales + otherRevenue 3735),
- **supplierBalance ≡ payables GL** (3200 == 3200),
- cheques-in-hand cross-scenario sum (−8700),
- a documents section (fulfilment quantities, derived statuses,
  PO receipt incl. over-receipt refusal, estimate totals,
  RV/PV voucher print data with running account balances),
- a reports section (all 14 builders over a dated dataset,
  deep-compared with paise tolerance; entries stay byte-exact).

Two exporter transcription errors were caught against the web
source during the run and fixed (supplier-payment and tax-payment
memo shapes); the web is ground truth and the fixture now matches
it. `test/f2_core_test.dart` adds the cheque transition truth
table, registry ≡ GL lifecycle identities, mirror-pairing,
correction-dating, aging ≡ subledger identities, void refusals
and the tax-payment cap.

## Per-feature state

| F2 feature | State | Notes |
|---|---|---|
| Purchases + suppliers | ✅ Wired | Supplier directory + balances, per-supplier statement (running balance, shareable), purchase entry (goods/raw lines, tax slabs, PO receipts pre-filled and clamped by `composePoReceiptLines`), purchase returns (DN-, offset/cash-refund, per-line cumulative caps). Supplier delete enforces F-13 (no balance, no history). |
| Supplier payments (PV-) | ✅ Wired | PV numbering, method/account resolution, cheque payments (instrument `cheque`, value moves on clearance). |
| Payment vouchers RV/PV | ✅ Wired | Voucher register tabs in Documents; share text from `receiptVoucherData`/`paymentVoucherData` (journal-derived balances). The raster voucher print (web's PrintDesign voucher layout) is NOT ported — share text only (partial, see gaps). |
| Expenses | ✅ Wired | Register + add/edit/delete. Edits and deletes ride the F-5 mirror semantics (reversal + corrected repost, correction dating under period locks); cheque expenses capture a draft at create, amount corrections sync the registry doc while `issued`, corrections refused after the cheque moves. The cheque draft itself is immutable on edit (input-only on the web too). |
| Document chain QT/SO/DC/PO | ✅ Wired | Create/list/act for all four + notes register. Fulfilment and statuses always derived (`displayQuotationStatus` with the expired overlay; PO received quantities). Conversions hand a `BillPrefill` to the billing desk, which consumes it on entry; the store's `_conversionStatusUpdates` refreshes cached source statuses in the same commit as the bill. |
| Credit/debit notes | ✅ Wired | CN minted with a formal bill return from the billing history (role-gated G-2); DN minted with a purchase return. Notes register shows figures + settlement. |
| Cheques | ✅ Wired | Registry grouped by the web's views (drawer / at bank / issued / due / cleared / bounced / returned) with due + overdue flags; deposit (account picker), clear, bounce (charges on IN; compensating credit/supplier rows composed exactly as the web), return — all gated by `canChequeTransition`. Capture at billing (bank-row cheque toggle), repayment, supplier payment and expense. Cheque-aware void (`composeVoidFull`) hands uncleared cheques back and re-credits cleared ones from their deposit account. |
| Finance | ✅ Wired | Overview KPIs (journal-derived), P&L summary, aging tables, tax position + capped tax payment; filterable read-only journal viewer with per-entry balance badges; trial balance (fiscal range) with balanced chip; money accounts with balances + combined account book; manual cash in/out and transfers (same-bucket transfers are GL-net-zero but move account balances — core-tested). |
| Reports (14) | ✅ Wired | Sales, purchases, stock, P&L, trial balance, account statement, tax, customer statement, supplier statement, aging, expenses, cheques, day-close, notes — one screen, slim sticky toolbar (picker + range presets), share via `reportShareText`. Print of reports reuses the receipt raster pipeline only for bills; report printing is share-text (partial, see gaps). |
| Forecast | ✅ Wired | `forecastAll` table (7-day average, days of stock, suggested reorder, status), low-stock / near-expiry / dead-stock surfaces — all derived, nothing stored. |
| ESC/POS direct transport | ⚠️ Implemented, NOT device-verified | `lib/platform/direct_printing.dart`: Bluetooth SPP (`print_bluetooth_thermal`) + USB-OTG (`usb_serial`) behind the `ReceiptPrinter` seam, sharing the one raster byte builder with the share path. Selection is device-local (SharedPreferences), picked from the receipt modal's printer dialog (paired BT / attached USB lists). Any failure or absence falls back to the F1 share-.bin path. Analyze-clean against the plugins' published APIs; **no printer or Android device exists in this environment, so no delivery is claimed**. The plugins' Android permissions merge from the BT plugin's manifest; the app manifest adds the optional USB-host feature. |

## Gaps / partials (honest list)

1. **Conversion pick quantities** default to the full remaining
   quantity per line (the store clamps exactly-once); the web's
   per-line pick editor is not yet ported.
2. **Voucher + report printing**: RV/PV vouchers and the 14
   reports share as text; the web's designed print layouts for
   them are not raster-ported (bills are, from F1).
3. **Document edit flows**: draft documents can be created and
   deleted; in-place line editing of an existing draft is not
   surfaced (the store's save* methods support it via `id:`).
4. **Standalone challan creation** takes standalone lines; an
   order-cited challan is created from the order's own
   "to challan" action (which validates against the derived
   undelivered remainder), not from the challan tab.
5. **Direct printing** is unverified on hardware (above), and
   Bluetooth/USB are Android-only by design here; Windows keeps
   the F1 system-print path.

## Method notes

- Every new posting composer is a Dart port asserted against the
  web through the fixture file before any UI touched it; the
  store routes all of them through the same `_tryGuard` choke
  point and one `WriteBatch` per action as F1.
- Role gating mirrors the web RBAC via the generated matrix
  (`suppliersManage`, `supplierPayments`, `quotations`,
  `saleOrders`, `purchaseOrders`, `creditDebitNotes`, `cheques`,
  `expenses`, `finance`, `transfers`, `forecast`); shell
  destinations appear only when the role may view the module.
  Narrow layouts get Dashboard/Billing/Sales + a More grid.
- One composer gap found and closed during the run: the Dart
  purchase-return composer dropped the DN reason the web carries;
  it is now threaded composer → store → UI (fixture-neutral:
  the default stays `''`).

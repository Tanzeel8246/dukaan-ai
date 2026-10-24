# Phase H · H2 — Loyalty Flutter parity — Report

**Verdict: COMPLETE** (source-level; no device/APK build or live
deployment is claimed — the local APK build remains impossible on
this VM per the standing Gradle/TLS constraint, and nothing was
deployed, pushed, or CI-run).

H2 ports H1's loyalty programme to the Flutter app at full web
parity: the pure Dart fold/composers proven byte-for-byte against
the real web functions, the store wiring in the same write shapes,
and every surface the web shipped in H1.

## What was built

**Pure core** (`lib/core/loyalty.dart`, ~1,170 lines) — a faithful
port of `web/lib/loyalty.ts`: settings resolver (field-by-field
fallback, cap clamped 0–100), the FIFO vintage fold with
per-entry rate snapshots (returns restore LIFO; clawback debt
rides its source vintage; expiry targets the earn entry),
position/tier derivation, programme totals, the derived expiry
due-list, redemption/earn/recredit quotes, the report builder,
and the three named composers (earn, clawback, expiry). Exactly
**3 `makeEntry(` sites** live in this file; the Dart-wide grep
count moved 39 → 42, all +3 here.

**Registry deltas** (generated, drift-gated): the l10n generator
now also emits `growthModulesData`; the dictionary stands at
**2,837 keys EN ≡ UR** (the 51 H1 loyalty keys included — zero
new keys in H2), the RBAC matrix at **41 modules** with the
`loyalty` row (owner/manager full, accountant read, cashier
none), `plans.GROWTH_MODULES = ['loyalty']` at Standard, and
`refTypeMinTierData['loyalty_expire'] = 'standard'`. `plans.dart`
module sets: standard = core+documents+operations+**growth**,
advanced adds growth+advanced (web `MODULE_SETS` parity).
`types.dart`: JournalEntry carries the 7 loyalty payload fields;
`BillPayment.loyaltyPoints`; `SaleReturn.loyaltyRecreditRs/Points`
(stamped only when Rs > 0, as web). `coa.dart`: the pair
`loyalty_payable` / `expense_loyalty` (30 codes). `tally.dart`:
the two ledger rows, `loyalty_earn`/`loyalty_expire` → Journal
vouchers, and the loyalty party-ledger group (Current
Liabilities, resolved against customers).

**Store wiring** (`lib/data/store.dart`, `lib/core/composers.dart`,
`lib/core/composers_f2.dart`) — web write shapes exactly:
- `postBill`: points parts validate against the DERIVED position
  before anything composes (customer required; wanted points =
  Σ stamped counts; the fold quote must match points and rupees
  under the settings cap, else the whole bill refuses). The
  composer stamps points parts like cheque parts (no money
  account, points count rides), lands **Dr `loyalty_payable`**
  (ref = customer) inside the bill entry, and stamps
  `loyaltyPointsUsed`. The earn composes off the PRE-bill journal
  and is guarded + posted in the bill's own batch.
- `recordReturn`: the composer computes the re-credit share
  (fold-priced, LIFO), shrinks the money split by exactly that
  value, lands Cr `loyalty_payable` in web line order, stamps
  `loyaltyPointsReturned` + the SaleReturn's recredit fields, and
  composes the clawback companion citing the credit note's id
  when one wraps the return (the store now pre-mints the note id
  and passes it to both the composer and `composeCreditNote`),
  else the return's id.
- `voidBill` (`composeVoidFull`): points parts hand back as
  POINTS (Cr `loyalty_payable` in payment order among the cheque
  handbacks), the void entry carries the bill's whole
  `loyaltyPointsUsed` as `loyaltyPointsReturned`, and the
  earn-reversal companion posts in the same batch with
  `reversesId` on the earn entry.
- `postLoyaltyExpiries()` (new): `can('loyalty','write')` gate,
  one expiry entry per due vintage (directory name, id fallback),
  guarded together, one batch, returns the count posted.
- Day-close: points parts are excluded from the stored
  `salesByMethod` buckets (web `dayCloseSummary` parity);
  expected cash is journal-derived and never touched by points
  legs, so it stays correct by construction.

**Surfaces** (all labels from the existing 2,837-key dictionary):
- `lib/features/loyalty.dart` (new) — the Loyalty desk: off
  notice, posted-count notice, 4 KPIs (liability, points
  outstanding, customers with balance, expiring-soon + Rs),
  expired-unposted card with the Post button (write roles),
  per-customer rows sorted by rupees desc then name, vintage
  sub-lines, tier badges, next-expiry column, empty state. Nav
  entry after Customers, gated by `sees('loyalty')` with the
  locked-door machinery on `planModule: 'loyalty'`.
- Billing: a payment row can switch to the points tender (named
  customers only); all points rows aggregate into ONE part priced
  by the fold quote against the desk total's cap; the row hint
  shows redeemable balance + "N = Rs X" + the cap note; the paid
  sum (and therefore the udhaar/credit maths) counts the quote's
  rupees once; earn preview line (+ tier name when not standard)
  and the walk-in note render under web's exact conditions; a
  points row on a walk-in bill is refused in words
  (`bill.pointsNeedsCustomer`) before the store is called.
- Customers: directory rows carry the points · value · tier line
  when a position exists; the profile shows the points (bold) ·
  value · tier block whenever the customer has loyalty history.
- Reports: the customer statement gains the loyalty section
  (earned / redeemed / re-credited / clawed / expired + the
  closing liability line) for the selected customer, in both the
  on-screen body and the share text.
- Settings: the programme section (owner-rendered) — enable
  switch + the 8 numeric terms, seeded from the RESOLVER's
  values, unparseable numbers omitted from the write, saved
  through `updateSettings({loyalty: {...}})`.

## Per-feature status

| Feature | Status |
|---|---|
| Loyalty fold + quotes + report (core) | ✅ byte-proven vs web fixtures |
| Earn / clawback / expiry composers | ✅ byte-proven vs web fixtures |
| Bill tender leg + validation + earn at finalize | ✅ wired (composer-proven) |
| Returns re-credit + clawback (note-citing) | ✅ wired (composer-proven) |
| Void mirror + earn reversal | ✅ wired (composer-proven) |
| Expiry posting action | ✅ wired |
| Loyalty desk | ✅ |
| Billing points tender + earn preview | ✅ |
| Customers directory + profile | ✅ |
| Customers-report loyalty section | ✅ |
| Settings programme section | ✅ |
| Plan gating (Standard/Growth, snapshot) | ✅ |
| RBAC (cashier tender rides `billing`) | ✅ |
| Receipt payment label | ✅ parity — see note below |
| Day-close points exclusion | ✅ |
| Held-bill resume restoring payment rows | ⚠️ partial (pre-existing, all payment kinds) |

## Verification (all observed in this session)

- **flutter analyze: No issues found.**
- **flutter test: 400/400 passed** — 366 inherited + 23
  (`h2_fixtures_test.dart`) + 11 (`h2_core_test.dart`).
- `h2_fixtures_test.dart`: `harness/fixtures/h2-core.json` is
  exported from the REAL compiled web functions
  (`harness/fixtures-export-h2.js`, additive; `harness.js`
  untouched) over the H1 suite's exact lifecycle walk. The walk
  replays entry-by-entry in Dart: after every step the fold
  position (full vintage lists), GL, Σ-customers and TB are
  compared against the web's values — **TB == 0 and both audit
  identities at every step** — and every earn / clawback /
  FY-close / expiry entry is RE-COMPOSED in Dart at the moment
  the web composed it and compared line-for-line (the cross-
  client leg). Plus: resolver truth table (6), COA/tally/FY
  classification facts, the frozen seed's zero loyalty readings
  (21 entries), guardrail quotes (over-balance 2,275, over-cap
  Rs 50 on a Rs 100 bill, walk-in/sub-base/disabled nulls,
  redemption surviving disable), snapshot rates (Rs 2/pt points
  redeem at Rs 200), clawback flooring [1,1,1], the Jan–Feb
  report, and the Tally masters (incl. the customer party master
  under Current Liabilities).
- `h2_core_test.dart`: registry/gating pins + the lifecycle
  walked through the STORE'S composers (`composeBillEntry`,
  `composeReturnEntry`, `composeVoidFull`) with identities after
  every event, note-citing vs return-citing clawbacks, and a
  cross-client continuation (a Dart-composed earn extending the
  web-composed fixture journal).
- **TS harness still 1,615/1,615**; fixture md5s f1–f5/g5/g6
  re-verified byte-identical to their baselines; l10n drift gate
  clean (2,837 keys, 41 modules).
- House pin amendments (lineage-labelled genuine growth only):
  g5 catalogue partition 40 → 41 modules (standard set 34 → 35),
  f4 BS+P&L partition 28 → 30, f4 P&L code list + `expense_loyalty`
  (the frozen F4 fixture predates H1). Four inherited tests moved;
  no expectation was weakened.

## Not claimed / limits

- **No device/APK build, no live deployment, no push** — source
  and test-level parity only, as in F/G.
- **Held-bill resume** in the Dart desk restores cart lines and
  customer but not payment rows — a pre-existing F1
  simplification affecting ALL payment kinds (cheque drafts
  included), not loyalty-specific; the web restores points rows
  on resume. Declared, not hidden.
- **Receipt label**: verified — web `print.ts` has no points
  branch either; both clients print the points part under its
  carrier method. Parity as-is; no change made.
- **Fractional expiry months**: web settings accept any positive
  number; a web-composed earn can snapshot a fractional
  `loyaltyExpiryMonths`, which Dart's int field truncates on
  read. Both clients' settings UIs write whole months; declared
  micro-deviation at the malformed-doc edge only.
- **Day-close, pre-existing (not H2)**: the Dart day-close
  bucket loop also counts CHEQUE parts and voided bills where
  web's `dayCloseSummary` excludes both. Observed during H2,
  left untouched (outside the loyalty scope; flagged for a
  future parity pass).
- Demo-seed programme stays OFF (H6 packaging work, as
  recorded in H1).

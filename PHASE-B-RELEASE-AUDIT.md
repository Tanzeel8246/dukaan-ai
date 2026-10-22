# Phase B Release — Independent Spot-Audit

Auditor: release spot-audit agent (adversarial pass, increment reports NOT trusted — every item re-derived from source/artifacts).
Date: 2026-10-22 · Release: `dukaan-ai-ERP-B.zip` · Rules: v5
Verdict: **CLEAN — all five audit items pass. Packaged.**

Baseline for comparison: the interim B4 release (`dukaan-ai-ERP-B4.zip`, rules v4, harness 504).

---

## 1. Harness re-run (fresh compile, auditor-run) — ✅ PASS

- `npx tsc -p ../harness/tsconfig.json` (compiles `web/lib` fresh) → exit 0.
- `node ../harness/harness.js` → **576 passed, 0 failed — ALL SUITES GREEN**:
  FIN 34 · COA 10 · A2 16 · RBAC 115 · A4 56 · A5 51 · B1 40 · B2 39 · B3 37 ·
  SEARCH 72 · B4 34 · B5 38 · B6 34.
- Seed identities asserted **inside** the harness source and passing (auditor grep-verified, not taken on faith):
  - `journal Inventory == 272,805` (harness.js:91)
  - `journal Cash == opening till 50,000` (harness.js:92)
  - `seed journal has 21 entries` (harness.js:89; re-asserted after B2/B3/B6 scenarios at :1149, :1419, :2453)
  - seed-journal SHA fingerprint `e17e5bda19e87de698b0c0a37e923f9b396bc387e2092b2ffbbd7d60d4971168` asserted at :589 and :1425.
  - Trial balance == 0 is part of the FIN suite, green.

## 2. Rules diff vs v4 — ✅ PASS (exactly the B5 block, nothing else)

`diff dukaan-firestore-rules-v4.txt firebase/firestore.rules` → a single insertion,
lines 324–348 (**+25 lines, 0 changed, 0 removed**): the `match /cheques/{chequeId}`
block — read `canAccess`; create `canAccess && createInOpenPeriod`; update
owner/manager/accountant; delete owner-only — preceded by its design comment
(documenting the deliberate G-3 create posture + the R-B6 "do not tighten" warning).
No other delta anywhere in the file. This is precisely the rules delta B5 declared.

## 3. Append-only & the guarded choke point — ✅ PASS

- `makeEntry(` call sites (excluding the definition): **24 — exactly the B6 report's
  count** — and **all 24 are inside `components/StoreProvider.tsx`**; zero in
  `lib/` or any component (B-phase lib modules compose journal *lines* only).
- Every composed entry reaches the cloud through the single helper
  `postEntry(batch, entry)`; the only function that writes a journal doc is
  `batchJournal` (batch.set of a freshly composed entry). Posting actions are
  wrapped by `guardPostings` (period-lock / role guard) — 22 references.
- No `updateDoc`/`deleteDoc` anywhere targets a journal document (auditor grep:
  mutations target products, the user doc, and generic non-journal collections).
  The two `push("journal", …)` calls are the pre-existing first-sign-in seed /
  top-up uploads (initial persistence of the seed/opening entries), not posting paths.
- Append-only therefore holds in client code exactly as it does in the rules.

## 4. Three money identities, traced end-to-end in code — ✅ PASS

**(a) Cheque bounce restores the receivable in the journal AND the F-6 lot.**
`lib/cheques.ts bounceInLines()` = Dr `receivables` (ref = customerId) / Cr
`cheques_in_hand` (ref = chequeId). `StoreProvider.bounceCheque` first refuses any
transition the table forbids (`canChequeTransition` — bounce only from `deposited`),
then composes the entry via `makeEntry(..., "cheque_bounce", ...)` and commits it
**in the same batch** as `compensatingCreditRow(...)` (the F-6 credits row citing
the original bill), via `commitChequeTransition`. Bank charges, when present, are a
**separate** entry in the same batch (Dr `expense_finance` / Cr deposit account) —
never netted against the customer. B5 harness suite asserts journal ≡ lot
restoration to the paisa, incl. bounce×return orderings converging.

**(b) Purchase-return identity: journal payables ≡ subledger.**
`lib/ledger.ts`: `purchaseReturnGross(ret) = payableOffset + refundAmount`;
`supplierPurchased` nets Σ returns; `supplierRefunded` treats a cash refund as a
*negative payment* (the journal's cash-refund template never touches `payables`,
so un-paying the refund in the subledger is the only way both derivations agree —
design §9). The B4 harness suite (auditor-run, green) asserts the identity across
purchase → partial payment → offset return → return-of-rest (−10,000 advance),
paid-in-full offset, cash refund, and a mixed pay→refund→offset sequence, in the
journal, the subledger **and** aging; tax reversed to the paisa, `tax_input` back to 0.

**(c) Voucher stamping burns no numbers on a guard-refused posting.**
Vouchers are **stamps, not counters**: `voucherNo` on `SupplierPayment` (PV-) and
`CreditEntry` (RV-) rows is minted by `nextDocNumber(series, existingNumbers,
settings)` — a pure max+1 derivation over the numbers *already stamped on
subscribed rows* (lib/documents.ts:100). There is no stored sequence anywhere
(`docSeries` in settings holds prefixes only). The stamp is minted inside the
payment/credit row object, in the same batch/state update as the posting itself
(StoreProvider:3486, :3807) — a posting refused by `guardPostings` never
constructs the row, stamps nothing, and consumes nothing; the next successful
posting re-derives the identical number. B6 suite additionally proves a
voucher-only session leaves the journal at the frozen 21 seed entries.

## 5. Fresh static bundle — ✅ PASS

Fresh `npm run build:static` → exit 0 (full route table prerendered).

- **Routes present** in `out/`: `quotations/`, `sale-orders/`,
  `delivery-challans/`, `purchase-orders/`, `notes/`, **`cheques/`** (new vs the
  B4 zip, which correctly has no cheques route).
- **Config inlined:** `dukan-8246` present in the shipped JS
  (`_next/static/chunks/0u8539xme1voy.js`).
- **'Demo' tokens:** 26 in the new bundle's `_next` JS — **identical to the
  26-token baseline** counted the same way in `dukaan-ai-ERP-B4.zip` (all are the
  demo-mode-only strings that never render in the env-configured production mode).
- **Legacy broken search patterns in shipped JS: 0** — `urduName.includes`,
  `company.toLowerCase()`, `partyName.toLowerCase()` all absent (property names
  survive minification, so absence is a real check). The live search bug stays fixed.

## Release artifacts

- `~/workspace/dukaan-ai-ERP-B.zip` — 1,507,595 bytes, 193 files (B4 interim: 186;
  the delta is the cheques route), static output at zip root, same structure as
  the B4 interim zip. The 'Demo'-token and broken-pattern counts above were
  re-verified inside the extracted zip itself, not just in `out/`.
- `~/workspace/your_files/dukaan-firestore-rules-v5.txt` — `cmp`-verified
  byte-identical to the tree's `firebase/firestore.rules` (v4 + the B5 block only).

## Rollout (owner, in this order)

1. **Publish rules v5 FIRST** (Firebase Console → dukan-8246 → Firestore → Rules →
   paste v5 → Publish). The new build writes `cheques` docs; without v5 those
   writes are denied in cloud mode.
2. **Upload `dukaan-ai-ERP-B.zip`** to the dukaan-ai subdomain folder (extract,
   overwrite), then **purge the hPanel cache**.
3. Sign in and smoke-test: billing product search, one quotation → bill, and the
   Cheques page. (No migrations touch existing numbers; demo storage bumps apply
   to demo mode only.)

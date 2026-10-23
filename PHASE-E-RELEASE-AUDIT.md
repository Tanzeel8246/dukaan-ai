# Phase E — Release Audit (E1–E5)

Independent release audit, run fresh on 2026-10-22. Nothing taken on
trust from the increment reports; every gate re-run from a clean
state and every targeted seam re-read in source.

Phase E's defining invariant holds: **zero journal effect.** Nothing
in E1–E5 composes or posts an entry — `makeEntry(` occurrences in
`components/StoreProvider.tsx` are still exactly **24**, and the
frozen seed is untouched (below).

## A. Fresh full verification

| Gate | Result |
|---|---|
| Harness (out/ deleted, `web/lib` recompiled fresh, run from scratch) | **1,389 passed, 0 failed — ALL SUITES GREEN**: FIN 34 · COA 10 · A2 16 · RBAC 115 · A4 56 · A5 51 · B1 40 · B2 39 · B3 37 · B4 34 · B5 38 · B6 34 · SEARCH 72 · REPORTS 68 · C1 46 · C2 49 · C3 56 · C4 75 · C5 61 · FIX 37 · D1 38 · D2 48 · D3 50 · D4 44 · D5 40 · **E1 39 · E2 47 · E3 50 · E4 49 · E5 16** |
| Frozen seed (asserted in FIN, re-asserted across suites) | **21 entries · Inventory 272,805 · Cash 50,000 · payables 27,900 · receivables 5,500 · TB 0 · SHA e17e5bda…1168** |
| App `tsc --noEmit` | **0 errors** |
| `npm run build` | **exit 0** |
| `npm run build:static` | **exit 0**; `out/index.html` at root |
| Bundle identity | `dukan-8246` present in the static bundle |
| i18n (counted independently from the freshly compiled dictionaries, both directions) | **EN 2,580 ≡ UR 2,580** — 0 keys missing either direction, 0 empty values |
| 'Demo' tokens (bundle `_next`, the standing measure) | **27** vs the 26 baseline. The delta was decomposed against the ERP-D bundle (26 tokens / 9 `resetDemo`): the current bundle carries exactly **one extra `resetDemo`** (10) — the pre-existing store API property destructured and called by `components/PinGate.tsx` (lines 264, 514). **No user-visible "Demo" text was added by Phase E.** |

## B. Targeted re-checks

1. **E1 — print design foundation: PASS.**
   `PRINT_SLOTS` (lib/print.ts) is enforced by intersection in
   `resolveItemColumns`: the challan row carries `colSku /
   colUrduName / colTax / colDiscount` all `false` and
   `stamp: "none"` — with every design toggle on, a challan still
   resolves **zero price-bearing columns**. The E1 suite pins the
   resolver's default snapshot and the 24-field sweep against
   pre-E output (default renders equivalent to Phase D paper).

2. **E2 — brand assets: PASS.**
   Caps in source (lib/branding.ts `BRANDING_SPECS`): logo 150 KB ·
   letterhead header 300 KB · footer 300 KB · stamp 150 KB ·
   signature 150 KB · Raast QR image 200 KB — total
   `BRANDING_TOTAL_CAP_BYTES` = **1,250,000**, each doc far under
   Firestore's 1 MiB. Boundary behaviour (at-cap accepted, one
   base64 quad over refused, property sweep: no run stores over its
   cap) is proven by the E2 suite through the real
   `buildBrandingAsset` guard. The cloud settings snapshot passes
   **`printDesign` and `shopNameAlt`** through
   (StoreProvider.tsx:1905–1908 — the E1 gap fix is in). Stamp
   rule (`stampVisible`, §2.4): no asset ⇒ false; thermal ⇒ false;
   held bill ⇒ false; default `stampMode: "paid"` ⇒ the stamp
   renders **only when the bill status is paid** — a present stamp
   asset on an unpaid bill produces no stamp in the render model.

3. **E3 — Raast QR: PASS, with the standing honesty flag.**
   The framing seam in `lib/raast.ts` still reads exactly
   `status: "provisional"`, `pinnedBy: null` (lines 73–74). No code
   or copy claims the generated path verified: the settings copy
   states plainly that the bank's own uploaded QR image is the
   verified path, that the generated code follows the SBP P2P
   template, and that it "has not yet been verified against a real
   bank Raast QR" — with the chip **"Generated QR: pending
   verification against a real bank Raast QR"** in both languages.
   IBAN validation is full ISO 13616 mod-97 (every single-character
   corruption refused) per the E3 suite. Bank-image precedence is
   intact: `resolveRaastBlock` returns the `image` path before any
   generated payload is built.

4. **E4/E5 — PIN lock and sensitive-action gating: PASS.**
   `lib/pinlock.ts` touches only its own three storage keys
   (`dukaan-ai-pinlock`, `dukaan-ai-pinlock-prefs`,
   `dukaan-ai-pinlock-guard`); `components/PinGate.tsx` contains
   **zero Firestore write seams** (Auth reauthentication only) —
   the PIN never leaves the device. RFC 7914 PBKDF2 known-answer
   vectors pass through the module's real WebCrypto path (E4
   suite). Gate matrix in source: `requirePin` is awaited before
   the store call at all four sensitive sites — bill void
   (BillingDesk), day close (DayCloseView), period lock/unlock
   (PeriodsPanel ×2), FY close/reopen (FiscalClosePanel ×2) — and
   the E5 suite's composition matrix proves required ×
   fail/cancel composes **zero** writes. With gating off / no PIN
   set, `requirePin` resolves allow and the flows are identical
   to pre-E. Payroll and loans desks are deliberately ungated,
   per design §4.6.

5. **Rules v8: PASS.**
   Source rules (594 lines) vs v7 (577): the diff is **one
   insertion of +17 lines, 0 changed, 0 deleted** — the additive
   `branding` block (match /branding/{kind}: read `canAccess`,
   create/update/delete owner-only, no period backstop, by
   design). Saved byte-identical to source as
   `dukaan-firestore-rules-v8.txt` (SHA-256 `04807268…f859`).

## C. Package

- 📦 `dukaan-ai-ERP-E.zip` — **1,792,103 bytes, 248 files**,
  SHA-256 `8212435b…ff69`. `index.html` at root. Markers verified
  in the actual zip bytes: `dukan-8246` ×3 · `printDesign` ×14 ·
  `branding` ×25 · `raast` ×179 · `pinlock` ×3 · `shopNameAlt`
  ×16 · 'Demo' 27 (analysis in §A). Contains everything through
  Phase E (A + B + Reports + C + UX shell/themes + D + E) —
  **supersedes dukaan-ai-ERP-D.zip**.

## Rollout (order matters)

1. **Publish rules v8 FIRST** (Firebase Console → Firestore →
   Rules → Publish). The build's `branding` subscription depends
   on the new block; publishing rules ahead of the build is safe
   (purely additive over v7).
2. **Upload `dukaan-ai-ERP-E.zip`** to the dukaan-ai subdomain
   root (do not upload the older zips).
3. **Purge the hPanel cache.**
4. **Smoke test:** sign in → Settings → Print design + Brand
   assets render → print a paid bill (branding/stamp) and a
   challan (no prices) → Settings → Raast shows the provisional
   chip → Device lock: set a PIN, lock, unlock; void asks for the
   PIN when gating is on.

## Still open (owner action)

- **Raast fixture:** the generated P2P framing remains
  `provisional / unpinned` until the owner captures his own
  bank's Raast QR and one scan-test payment confirms the framing.
  Until then the honest label stays on the generated path, and
  the bank-issued QR image (Brand assets) is the verified route.

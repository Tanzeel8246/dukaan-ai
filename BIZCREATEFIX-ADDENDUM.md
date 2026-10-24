# BizCreateFix addendum to Fix Round 2 (2026-10-24)

**Package:** `dukaan-ai-ERP-H-fixround2-bizcreatefix.zip` — a superset of
`dukaan-ai-ERP-H-fixround2-footerfix-wording.zip`: the same FR2 + footer-fix +
wording/meta build process, plus the two business-creation fixes below and
this addendum at zip root. It supersedes all earlier FR2 packages for upload
purposes.

## What was broken

Live (footerfix build + rules v11 pasted), the signed-in shop owner could
not create a second business at all. Header switcher → "+ New business" →
"Create a new business" failed on all 4 attempts (name only twice,
name + phone + address once, name only again after a reload) with the
generic message "Could not create the business. Please try again." — no
reason shown, no partial business created (switcher stayed at 1 business,
/platform stayed at 3 records). This blocked the entire FR2 retest
(empty start, demo opt-in, clear → trash → restore, two-business view,
suspend test) and, more importantly, blocks the headline FR2 feature
itself: no shop owner can add a second business while this stands.

## Root cause (diagnosed from source, verified by grep)

`createBusiness` writes the phase-1 registry through AuthProvider's
`applyPlatformWrites`, which does a raw `batch.set` with no type
conversion. The plan snapshot carries `plan.trialEndsAt` as an ISO
string (`web/lib/tenancy.ts` `trialPlanSnapshot`, `ends.toISOString()`),
but rules v11 `businessBirthOk` requires `trialEndsAt is timestamp`
(`firebase/firestore.rules`). Every attempt therefore died at the
phase-1 registry write. The conversion already existed in exactly one
executor — StoreProvider's `registryWriteData` (used by the signup trial
birth, which is why the owner's own trial birth succeeded) — but the FR2
birth path never used it, and the FR2 harness never exercised this
executor seam, so the bug shipped. There is NO coded business-count,
trial-eligibility, or plan-cap limit standing in the way: once these two
fixes land, creation should succeed.

## The two changes (and nothing else)

1. **Client — `web/components/AuthProvider.tsx`:**
   - Added `Timestamp` to the `firebase/firestore` import (same position
     as StoreProvider's import list: after `setDoc`).
   - Added `platformRegistryWriteData(path, data)` — a mirror of
     StoreProvider's `registryWriteData`: for `set` ops whose path
     starts with `"businesses/"`, if `data.plan.trialEndsAt` is a
     string, it is replaced with `Timestamp.fromDate(new Date(...))`.
     Every other path and every non-string value (including `null`
     for founding) passes through untouched.
   - `applyPlatformWrites` now writes `platformRegistryWriteData(w.path,
     w.data)` for `set` ops. Update and add ops are unchanged.
   - StoreProvider, tenancy.ts, and the plan snapshot shape are
     UNTOUCHED.
2. **Rules — `firebase/firestore.rules`, v11 → v12:**
   - The money-accounts block (`match /accounts/{accountId}` inside
     `users/{uid}`) gained one delimited amendment leg, mirroring the
     FR2 owner-doc amendment:
     `allow create, update: if isRegistryOwner(uid);`
     alongside (not instead of) the existing `isOwner(uid)` leg. Without
     it, fixing the Timestamp alone would land the birth on
     setup-failed at the skeleton batch (the five account writes).
   - A `BizCreateFix · v12 header note` block documents the change.
   - **New rules SHA-256: `8b58c1d2357905cc91fbc9979de3ca6f6324a24aa3241c521439e9bba33336c0`,
     1,688 lines (JS split count).** Previous v11: SHA `0f19f56e…`,
     1,670 lines. Strip proof: v12 minus its two delimited spans is
     byte-for-byte v11 (SHA `0f19f56e…`, 1,670 lines) — the v12 delta is
     purely additive, nothing else in the file moved.

## Explicitly OUT of scope (separate deploy, deliberately excluded)

Moving the `businessEvents` add from phase 1 to phase 2 (the
non-admin-owner event trap: the phase-1 event-create leg requires
`isRegistryOwner`, impossible in the batch that creates the registry).
The current owner escapes it via the old leg's `isPlatformAdmin()`,
so it does not block this retest — but a future non-admin owner would
hit it, and it must be fixed separately. No event leg was widened.
No other rule, plan price, limit, or UI text was changed.

## Verification

- Web `tsc --noEmit` clean; `npm run build` and `npm run build:static`
  exit 0; static bundle refreshed at `../web-deploy`.
- Built bundle verified: new footer tagline present (UR + EN), old
  "محلے کی کریانہ" phrase absent, wording title
  ("Dukaan AI — Complete ERP for Every Business") present,
  `trialEndsAt` conversion code present in the shipped chunks.
- TS harness **1,838 / 1,838, exit 0** (previous 1,834 + 4 new
  BizCreateFix checks: v12 strip proof, v12 SHA + line pin, accounts-leg
  presence, client-wiring textual pin). FR2 suite still 51/51; every
  other suite unchanged. The harness cannot execute React-component
  code (it compiles `web/lib` only), so the conversion seam itself was
  additionally verified with a throwaway script (9/9: string → Timestamp
  with the same instant, input unmutated, non-businesses/null/missing
  values untouched, v12 strip proof) — the script is not part of the
  tree or the package.
- Flutter **506 / 506, "All tests passed!"**, `flutter analyze`
  0 issues.
- Harness note: the v12 rules spans required a same-check amendment
  in the harness (new `stripBizCreateFixBlocks` helper, composed first
  inside `stripFR2Blocks` per the WA/H6 funnel precedent, plus the
  amended FR2 v11 pin and the new BizCreateFix suite). No check was
  weakened: the v10/v9 pins still hold through the longer chain, and
  the v12 → v11 proof is newly pinned.

## Deploy — READ FIRST

1. **Rules v12 FIRST: paste the included `firestore.rules` into the
   Firebase console AND press Publish.** Pasting without publishing
   leaves the old rules live — if creation still fails after this
   deploy, confirm the published rules contain the "BizCreateFix · v12"
   header note before anything else. **Rules changed, so re-paste +
   publish is REQUIRED; the frontend alone is not enough.**
2. Then upload this zip's frontend contents as usual (it supersedes
   the footerfix-wording package).
3. Re-run the FR2 retest from step 1 (create "TEST-24OCT-FR2" or a
   fresh test business). **Success looks like:** the switcher lists
   the new business, and /platform shows 4 records. If creation still
   fails, check in this order: published-rules content, then the
   browser console's exact Firebase error code and path.

## Wording inclusion (explicit)

**YES — this package's frontend includes the previously approved
wording/meta changes.** The current tree contains them (verified:
`web/app/layout.tsx` title is "Dukaan AI — Complete ERP for Every
Business"; no "Smart Kiryana" / "neighbourhood kiryana" / "Kiryana
Store" meta remains in `layout.tsx` / `page.tsx`), and the fresh build
above was verified to carry them. The AI chat system prompt and the
demo-seed note remain untouched, per the owner's earlier scope.

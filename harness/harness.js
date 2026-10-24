/* Dukaan AI — verification harness (reconstructed for Phase B · B1).
 * Compiles lib/ FRESH (see tsconfig.json) and re-runs the documented
 * suites: FIN 34 · COA 10 · A2 16 · RBAC 116 · A4 56 · A5 51 = 283
 * prior checks, plus the B1 (40), B2 (39) and B3 (37) suites = 398,
 * plus the SEARCH suite (72) = 470 — null-safe search predicates
 * (49 through the B3-era fix + 23 for the deferred SuppliersManager
 * and NotesViews predicates, landed with the B4 release),
 * plus the B4 suite (34) = 504 — credit/debit notes + the
 * purchase-return engine and the amended payables subledger,
 * plus the B5 suite (38) = 542 — the cheque registry: capture /
 * deposit / clear / bounce / return identities (registry ≡ GL on
 * both cheque accounts at every step), issuance-settles-payable,
 * the F-6 compensating rows, PDC edges and the day-close
 * instrument exclusions,
 * plus the B6 suite — payment vouchers: RV-/PV- stamping on the
 * repayment / supplier-payment rows (§5.1), sequence + no-burn +
 * legacy-unaffected proofs, the journal byte-stillness of a
 * voucher-only session, and the print-data builders equalling
 * their source rows,
 * plus the REPORTS suite — the Reports section (lib/reports.ts):
 * every report builder proven equal to the screen derivation it
 * mirrors (P&L, tax position, stock, aging, both statements, the
 * account statement), range edges, EN/UR determinism, legacy-row
 * safety, and the read-only source invariants,
 * plus the C1 suite — Phase C · C1 warehouses & stock rows: the
 * entry-free stockV1 migration identity (rows sum to totals, the
 * journal + its SHA + the GL identities untouched), the §1.3
 * resolution rule, an every-path workload asserting Σ rows ==
 * stockQty after each movement, journal byte-stillness across
 * warehouses, the promise partition reproducing B2's globals, the
 * drift detector catching an injected drift + the recount repair,
 * the warehouses RBAC row, C1 i18n parity, and the additive-only
 * rules proof (strip-and-hash back to the pre-C1 file),
 * plus the C2 suite — Phase C · C2 stock transfers: the TR-
 * series (drafts burn no numbers), route/composition refusals
 * (same-warehouse, archived, unknown product), dispatch moving
 * rows with the journal byte-still, in-transit derived exactly,
 * partial receives summing to the unit, over-receipt refused
 * pre-composition, the close-short loss posting exactly
 * (short × costPrice, class-account seam) with §1.3's identity
 * restored, return-to-source, the §2.5 period-lock scenario
 * (receive ungated, loss gated at today), the transfer-aware
 * drift detector + recount, the demo draft seed, RBAC, i18n
 * parity and the additive-only rules proof,
 * plus the C3 suite — Phase C · C3 product class & BOM: the
 * `inventoryAccountFor` resolver + the `classLegLines` split
 * (the no-raw byte-identical regression at template level), the
 * raw/mixed purchase legs with tax untouched, raw sale + counter
 * + return mirrors, purchase-return split, the reclass builder
 * (flip with stock / at zero / negative, identities after), the
 * class identities replayed over a mixed workload, BOM draft
 * validation + immutable versioning + standard costs, the demo
 * BOM seed (fresh seed class-free), the manufacturing RBAC row,
 * C3 i18n parity, source invariants (v13 demo bump; still 24
 * makeEntry calls in the store — the reclass composes in
 * lib/transfers) and the additive-only rules proof (strip the
 * C3 block → the pre-C3 file's SHA),
 * plus the C4 suite — Phase C · C4 production orders: the
 * recipe snapshot (mid-order BOM edit never re-costs), the full
 * worked production (issue split across class accounts with
 * labour paid from the till → partial completion → scrap →
 * final completion, GL wip == Σ pools asserted at every step,
 * the roll-up to the paisa), the accrued-labour scenario
 * (salary_payable, no money line) with a nothing-produced
 * closeout, over-production spreading the whole pool, the
 * closeout residual exact, the paisa scenario (33.33 + 33.34 +
 * 33.33 == 100), the refusal set (empty pool, insufficient at
 * the ORDER warehouse, zero value, no account, closed orders),
 * PR- numbering, the demo draft seed, RBAC, i18n parity
 * (+87 keys → 1,839), source invariants (v14 demo bump; the
 * C3 boms-subscription repair; still 24 makeEntry calls) and
 * the additive-only rules proof (strip the C4 block → the
 * pre-C4 file's SHA),
 * plus the C5 suite — Phase C · C5 job tracker: the stage
 * lifecycle derivation (defaults, custom lists, sticky terminal
 * states, renamed-away stages), JB- numbering (born numbered),
 * material issue/return through the real lib/jobs compositions
 * (Dr cogs / Cr the class account at shelf cost, rows + totals +
 * GL moving together, the refusal set), the pooled advance
 * identity (the journal diff of a job advance is EXACTLY one
 * ordinary repayment entry, the pool goes negative, the citing
 * bill's F-6 lot absorbs it), the citing-bill citation
 * discipline (only POSTED citing bills count as revenue), the
 * §5.5 profit figure hand-computed over a mixed scenario (and
 * revenue 0 for an unbilled job), the demo seed job, the
 * jobTracker RBAC row AS DECLARED, C5 i18n parity (+119 keys →
 * 1,958), source invariants (v15 demo bump; still 24 makeEntry
 * calls) and the additive-only rules proof (strip the C5 block
 * → the pre-C5 file's SHA).
 * The FIX suite (37) covers the live-audit fixes (2026-10-22):
 * the P&L ≡ sales-report revenue identity over the seed and a
 * synthetic mixed workload (templates composed through the REAL
 * makeEntry guard), the labelled 8,500 reconciling line for a
 * legacy journal-only revenue entry, the Rs 375 counter-sale
 * bucketing case, outflowPreview against the seed's −45,000
 * Wallet & Bank, expense register ≡ cash-book dates, the trial
 * balance's balanced state + frozen closings, walk-in bill
 * search, and the FIX i18n keys. It also carries the amended
 * i18n count pins (tr 74 · mfg 131 · total 1,992 EN ≡ UR — the
 * UX overhaul's +11 and this increment's +23, amended in the
 * established same-check style).
 * The D1 suite covers ERP Phase D · D1 — declarations, employees
 * & attendance (NO postings): the additive `loans_receivable`
 * code (the COA literal above amended 27 → 28 in the same
 * style), the seven declared Phase D refTypes + the PAY-/LN-
 * series defaults, the §1.4 proration fixtures reproduced to
 * hand-computed figures, the §2.2 salary_payable composition
 * identity over a synthetic journal mixing employee-ref lines
 * with a C4-style ref-less accrual (GL ≡ Σ positions + the
 * unassigned bucket, to the paisa), attendance tallies + the
 * mark cycle, the staffDirectory RBAC cells AS DECLARED, the
 * zero-journal-footprint demo seed (2 employees + the current
 * month's register; the frozen seed identities re-asserted),
 * D1 i18n parity (103 hr keys; the total pin above amended
 * 1,992 → 2,098), and the additive-only rules proof (strip the
 * D1 blocks → the v6 file's SHA).
 * The D2 suite covers ERP Phase D · D2 — payroll runs, payments,
 * advances, slips (design §2): run lines composed by the REAL
 * `buildRunLines` from fixture employees + attendance (the §1.4
 * proration snapshotted), desk overrides through
 * `payrollLineTotals` (gross/net derived, never stored twice),
 * the finalise accrual composed by the REAL builder (NET per
 * employee, refs on both lines, ΣDr expense_salary == run net,
 * reducer deductions NOWHERE in the journal), the
 * one-posted-run-per-month guard + caps as store-source proofs,
 * partial payments, the advance → accrual → payment sequence
 * with the §2.7 slip figures derived by `runLineFigures`
 * (advanceBefore / recovered / stillOwed to the paisa), the
 * composition identity after MIXED traffic (payroll + a
 * C4-shaped ref-less accrual + advance + bucket payment — GL ≡
 * Σ employees + unassigned bucket at every step), payment and
 * run reversals (positions restored; a reversed run's payments
 * STAND as advance positions, §2.6), period-lock refusal for a
 * backdated accrual/payment through the real preparePosting,
 * the payroll RBAC cells, the demo DRAFT seed (zero journal
 * footprint; frozen identities re-asserted), D2 i18n parity
 * (+114 keys; the total pin above amended 2,098 → 2,212), source
 * invariants (still 24 makeEntry calls in the store — D2's
 * entries compose in lib/payroll) and the additive-only rules
 * proof (strip the D2 block → the D1-state file's SHA).
 * (The D2 i18n pin was later amended 2,212 → 2,214 by the
 * shell/theme polish landing — same-check amendment, recorded
 * in PRODUCTION.md.)
 * The D3 suite covers ERP Phase D · D3 — the loans register
 * (design §3): composition refusals (charged receivable lending
 * refused, never zeroed), the schedule derivation (100,000 over
 * 7 at flat 10% splits to the paisa, final-absorb; reducing on
 * the schedule's outstanding), drawdown shapes (gross + the
 * fee-netted variant), charge accrual ONLY as a composed event
 * (a drawn loan's journal carries no charge until the desk
 * composes one; a charge-free loan's journal is principal-only),
 * the full lifecycle with GL `loans_payable` ≡ the diary's
 * derived outstanding after EVERY step and trial balance 0,
 * partial repayments with charges-first + desk-overridden
 * splits, overdue derivation off the derived schedule, reversal
 * cleanliness (mirrors restore positions exactly), the
 * receivable mirror on `loans_receivable` with the customer
 * khata provably untouched (the §3.1 isolation), overpayment
 * refused pre-composition, period-lock refusal for backdated
 * loan entries, the loans RBAC row as pre-declared, the demo
 * sample loan (charge-free, no events, outstanding == principal,
 * frozen seed identities re-asserted), D3 i18n parity (+119
 * keys; the C2 + D2 total pins amended 2,214 → 2,333), source
 * invariants (still 24 makeEntry calls in the store — D3's
 * templates compose in lib/loans) and the additive-only rules
 * proof (strip the D3 block → the D2-state file's SHA).
 * The D4 suite covers ERP Phase D · D4 — the fiscal-year close
 * (design §4): the registry-driven P&L closing set, the derived
 * pre-close checklist (trial-balance zero and purchases-clearing
 * zero as HARD gates — an unbalanced fixture and a stranded
 * clearing balance each block; draft-run and production-pool
 * warnings derive), the closing entry's shape (one entry, dated
 * the FY's last day, every P&L account zeroed, the exact net in
 * retained earnings — profit and loss years both), the §4.6
 * three-way identity (pre-close P&L == post-close P&L with the
 * fy_close exclusion == the closing entry's own summary), the
 * trial balance showing the zeroed truth after close, the new
 * FY starting clean, double-close state detection, reopen by
 * mirror (balances restored to the paisa) with stack discipline
 * (a later closed year blocks; unwinding it unblocks), period-
 * lock interplay through the real preparePosting (a close dated
 * into a locked period refuses; a posting dated into the closed
 * year refuses after it), the zero-movement year (no entry, doc-
 * cited close state), D4 i18n parity (+55 fin.fy keys; the
 * earlier total pins amended 2,339 → 2,394), source invariants
 * (still 24 makeEntry calls in the store — D4's entries compose
 * in lib/fiscal) and the rules claim verified: §4 needs NO rules
 * change, so the rules file must be BYTE-IDENTICAL to the
 * D3-state file (its SHA is pinned).
 * The D5 suite covers ERP Phase D · D5 — the Tally export +
 * journal CSV (design §5): the fixed COA → Tally group mapping
 * (every registry code mapped; names overridable via
 * tallyLedgerNames, groups never), the full §5.3 refType →
 * voucher-type table (all 33 refTypes, the two loan refTypes in
 * both directions), per-party ledgers (customer/supplier/
 * employee refs land on party ledgers under the mapped groups;
 * unref'd lines on the control ledgers), opening balances
 * derived in-file for a mid-journal range (Σ == the pre-range
 * trial balance's closing truth), one voucher per entry with
 * per-voucher Dr == Cr and the aggregate == the period trial
 * balance, the XML's well-formedness + escaping + Tally sign
 * convention, the CSV's row count == the period's journal-line
 * count with comma/quote/Urdu memos round-tripping, the fy_close
 * voucher number (the FY label), the seed journal exporting
 * whole (21 vouchers, balanced, frozen identities untouched),
 * D5 i18n parity (+12 fin.export keys; the earlier total pins
 * amended 2,394 → 2,406), source invariants (the exporter is
 * pure — no store-write calls in lib/tally; still 24 makeEntry
 * calls in the store) and the rules file byte-identical (no D5
 * rules change, the D4 SHA pin re-asserted).
 * The E1 suite covers ERP Phase E · E1 — the print-design
 * foundation + invoice designer (design §1): the resolver's
 * default snapshot deep-pinned (an absent design IS today's
 * rendering, field for field) + the per-field toggle sweep +
 * full pass-through, the paper → @page mapping asserted
 * verbatim, the receipt class composition incl. the desk's
 * thermal override, the §1.5 slot matrix enforced structurally
 * (a challan with EVERY toggle on still gains no price-bearing
 * column; its signature slot is the customer's, never the
 * shop's), the column sources (SKU/Urdu name resolved live by
 * productId; per-line tax read from A4's snapshotted taxAmount;
 * per-line discount the display-only allocateProRata derivation,
 * summing to the document discount to the paisa), the §2.4
 * stamp rule (paid-only assertion, held never, thermal
 * suppressed, per-doc toggles), the header slots (letterhead
 * replacement + thermal suppression; the logo as thermal's one
 * kept image), the sample fixtures' closing arithmetic, E1
 * i18n parity (+53 print keys; the earlier total pins amended
 * 2,406 → 2,459), source invariants (lib/print is pure — no
 * posting or store-write call; the chrome extraction wired into
 * every sheet; the billing desk renders BillPrintSheet; still
 * 24 makeEntry calls; demo storage still v16) and the rules
 * claim verified: E1 needs NO rules change — print settings
 * ride the owner settings doc — so the file is byte-identical
 * (the D4 SHA pin re-asserted). Phase E posts NOTHING: the
 * frozen seed identities + the seed journal SHA close the suite.
 *
 * The E2 suite (Phase E · E2 — brand assets, design §2) pins
 * lib/branding, the pure half of the upload pipeline: the spec
 * table (six kinds, the HARD CAPS 150/150/150/300/300/200 KB,
 * total 1,250,000), data-URL measuring, fit-within-box
 * (never upscale), the format rule (alpha → WebP, banners →
 * JPEG), the compression ladder (quality −0.1, then the box
 * ×0.75, up to three times) and its runner — fits at rung 0,
 * fits only at rung 2, and the honest REFUSAL with the actual
 * figures when no rung fits, plus a property sweep proving no
 * run ever stores a payload over its cap. buildBrandingAsset
 * is the boundary guard (at-cap accepted, one quad over
 * refused, bad mime / zero dims / corrupt payload refused).
 * The slot-consumption matrix feeds REAL assets (through
 * brandingDataUrls, the production seam) into E1's visibility
 * rules: the stamp on a paid bill only, thermal suppression
 * of stamp + letterhead with the logo kept, signature slot
 * discipline. E2 i18n parity (+37 print.brand keys; the six
 * earlier total pins amended 2,459 → 2,496), source invariants
 * (lib/branding is pure; the store wires the collection with
 * owner-gated setters; still 24 makeEntry calls; demo storage
 * v16 → v17; the seed ships no assets), and the rules claim:
 * ONE additive `branding` block (read canAccess, write
 * owner-only) — strip-proven byte-identical against the
 * pre-E2 SHA, which is also how the D4/D5/E1 pins above were
 * amended (same-check, strip first). The frozen seed
 * identities close the suite: branding is documents, not
 * journal data.
 *
 * The E3 suite (Phase E · E3 — Raast QR, design §3) pins
 * lib/raast, the pure payload module, and lib/qr, the encoder
 * seam: full ISO 13616 IBAN validation (the published PK
 * example plus six composed bank fixtures validate; EVERY
 * single-character corruption is refused — mod-97 detects
 * them all; a Raast alias is refused with its own code,
 * because the P2P template has no alias object to hold one),
 * CRC-16/CCITT known answers (the canonical 29B1 for
 * "123456789", cross-checked against an independent
 * table-driven implementation), builder/parser round-trips
 * object-by-object under BOTH framings, the framing seam
 * itself (RAAST_FRAMING: bare, PROVISIONAL, unpinned — the
 * owner's bank QR has not yet been captured, and the suite
 * asserts the shipped state says exactly that, never
 * "verified"), the reference encoder's 37×37 matrix for a
 * fixed payload as a regression anchor, and
 * resolveRaastBlock (the bank image wins, the generated code
 * is the fallback, a dynamic bill QR carries the bill total
 * + "Bill #n", quotations/orders/the poster NEVER carry an
 * amount, thermal caps the size). Source invariants: neither
 * Raast module touches a posting path; the rules file is
 * byte-identical to the pre-E3 file (E3 adds no rules); the
 * seed ships no IBAN. The dictionary pin grows 2,496 →
 * 2,531 (+35 Raast keys), amended at the seven earlier
 * sites in the house style. The frozen seed identities
 * close the suite: Phase E posts nothing, and a QR is a
 * rendering of a settings string, never an entry.
 * The E4 suite (Phase E · E4 — PIN lock, design §4) pins
 * lib/pinlock, the device-local lock core: PBKDF2-HMAC-SHA256
 * known-answer vectors (RFC 7914 §11) through the app's own
 * derivePinBits via Node's WebCrypto — the injectable subtle
 * seam means the harness runs the production code path; the
 * §4.2 record shape (v 1, 150k iterations, 16-byte salt,
 * 32-byte hash, chosen digit length); verify accepting the
 * set PIN and rejecting wrong digit / wrong length / empty;
 * salt uniqueness; tampered hash/salt/iterations never
 * verifying; the constant-time compare; storage round-trips
 * through a fake storage proving the stored record holds NO
 * substring of the PIN and the module touches ONLY its own
 * dukaan-ai-pinlock* keys (the zero-Firestore seam — recovery
 * is Auth reauthentication, asserted in PinGate's source);
 * the friction schedule at its points (free < 5, 30s at 5,
 * 2m per further 5, 5m cap) and success clearing it; and the
 * idle/lock reducer (launch-with-record locked, activity
 * resets the epoch, the deadline-while-hidden locks on the
 * return check, activity while locked changes nothing).
 * Source invariants: AppShell mounts PinGate + the header
 * lock button; Settings mounts the Device lock card, which
 * holds no store/backend seam; 49 pin.* keys EN ≡ UR with
 * the §4.7 honesty copy present in both languages. The
 * dictionary pin grows 2,531 → 2,580, amended at the eight
 * earlier sites in the house style. (F5 amendment: the pin
 * grows once more, 2,580 → 2,581, for the sync.online key —
 * amended at every pin site in the same style.)
 * The E5 suite (Phase E · E5 — sensitive-action gating,
 * design §4.6) pins the gate seam: the precondition truth
 * table (no record ⇒ never required; pref OFF ⇒ not
 * required; record + ON ⇒ required), the composition matrix
 * (writes composed exactly in the allow cases — required ×
 * {fail, cancel} composes ZERO), the four call sites
 * (BillingDesk void, DayClose submit, PeriodsPanel
 * close/reopen, FiscalClosePanel close/reopen) each
 * awaiting requirePin BEFORE their store call, the payroll
 * and loans desks deliberately ungated, the store knowing
 * nothing of the gate, and requirePin's immediate-true path
 * for ungated flows. Both suites close on the frozen seed
 * identities + the rules SHA: the PIN is device state and
 * a screen gate, never an accounting event.
 * The G4 suite (Phase G · G4 — the renewal flow + the trial
 * lifecycle, design §3.4–§3.6/§8-G4) pins lib/renewal (the
 * quote arithmetic, the submission plan, the lifecycle
 * banner derivation, the suspension-reason read), the
 * console's config act + amount check in lib/platform, and
 * walks the full scripted lifecycle (trial → grace → submit
 * → confirm → active → grace → readonly → renew → active)
 * with the shop journal's SHA spot-asserted unchanged at
 * every step. The dictionary pin grows 2,714 → 2,761 (+47:
 * 35 renew.* + 12 platform.*), amended at every pin site in
 * the house style; the plan.* count stays 36.
 * The FR1 suite (Fix Round 1 — the owner's live test of
 * 2026-10-24) pins the five findings' regressions: F1 the cloud
 * settings parse (lib/settings `settingsFromOwnerDoc`) carrying
 * a legacy doc's loyalty/Raast/storefront/WhatsApp blocks
 * through to the resolver; F4 receivables aging + the WhatsApp
 * udhaar position rebuilt on the shared credit-lot allocation
 * (the live 300/100/150 scenario ages to 5,550, not 5,700), the
 * payables mirror regression-pinned as already-correct; F3 the
 * derived dayOffset (`dayOffsetForTs`) scoping the day close to
 * the business day — counter ≡ journal by construction, closes
 * matched by dateISO; F2 the Balance Sheet balancing on the
 * seed, a trading walk, a mid-clearing state and across an FY
 * close; F5 the opening-stock gap + entry (Dr stock / Cr
 * capital, class-split, NO rules amendment — the refType rides
 * the tier maps' Core default). The dictionary pin grows
 * 3,063 → 3,077 (+14: 1 dc.backlog + 9 rep.bs.* + 4
 * fin.fy.openStock.*), amended at every pin site in the house
 * style; the D4 fin.fy count grows 55 → 59 and its fiscalClose
 * gate count 2 → 3 (postOpeningStock joins the row).
 * Store-level templates that
 * cannot execute headless are replicated line-faithfully from source
 * and composed through the REAL makeEntry guard (which throws on
 * imbalance), exactly as the original harnesses did. */
"use strict";
const fs = require("fs");
const crypto = require("crypto");
const assert = require("assert");

/* Phase E · E3: lib/qr wraps the `qrcode-generator` package,
 * which is installed in the web app's node_modules — outside
 * this harness's own tree. Put that directory on the module
 * path before any compiled lib module is required. */
process.env.NODE_PATH = [
  "/home/hatch/workspace/ai-dukaan-ai/web/node_modules",
  process.env.NODE_PATH || "",
].join(":");
require("module").Module._initPaths();

const ledger = require("./out/ledger.js");
const seed = require("./out/seed.js");
const coa = require("./out/coa.js");
const perm = require("./out/permissions.js");
const tax = require("./out/tax.js");
const periods = require("./out/periods.js");
const docs = require("./out/documents.js");
const selectors = require("./out/selectors.js");
const search = require("./out/search.js");
const cheques = require("./out/cheques.js");
const reports = require("./out/reports.js");
const stock = require("./out/stock.js");
const transfers = require("./out/transfers.js");
const boms = require("./out/boms.js");
const production = require("./out/production.js");
const jobs = require("./out/jobs.js");
const payroll = require("./out/payroll.js");
const loans = require("./out/loans.js");
const fiscal = require("./out/fiscal.js");
const tally = require("./out/tally.js");
const print = require("./out/print.js");
const branding = require("./out/branding.js");
const raast = require("./out/raast.js");
const tenancy = require("./out/tenancy.js");
const plans = require("./out/plans.js");
const platform = require("./out/platform.js");
const renewal = require("./out/renewal.js");
const backup = require("./out/backup.js");
const loyalty = require("./out/loyalty.js");
const storefront = require("./out/storefront.js");
const whatsapp = require("./out/whatsapp.js");
const settingsLib = require("./out/settings.js");
const demoLib = require("./out/demo.js");
const trashLib = require("./out/trash.js");
const qrLib = require("./out/qr.js");
const pinlock = require("./out/pinlock.js");
const csvLib = require("./out/csv.js");
const i18n = require("./out/i18n/index.js");

/* Phase E · E2 same-check amendment helper: remove the additive
 * `branding` match block (E2's ONLY rules change) so the D4/D5/E1
 * byte-identity pins below keep asserting exactly what they
 * asserted when written — that nothing ELSE in the file moved.
 * The E2 suite asserts the strip itself reproduces the pinned
 * pre-E2 SHA, so the amendment cannot hide drift. */
function stripE2BrandingBlock(src) {
  const start = src.indexOf("      // Phase E · E2 — brand assets");
  if (start < 0) return src;
  const end = src.indexOf("      // Expenses:", start);
  // A phase segment that ENDS at the Expenses marker (the C/D
  // suites' slices) carries no end marker inside itself — there
  // the block runs to the segment's end.
  return end < 0 ? src.slice(0, start) : src.slice(0, start) + src.slice(end);
}

/* Phase G · G1 same-check amendment helper: remove the four
 * delimited G1 spans (the v9 header note, amendment #1, the G1
 * helpers, the platform collections) so whole-file and segment
 * pins keep asserting exactly what they asserted at v8. The
 * amendment span is replaced by the EXACT v8 access text below
 * (canAccess + the v3 comment + staffRole as shipped in v8), so
 * stripping v9 reproduces v8 byte-for-byte — the G1 suite asserts
 * the stripped whole-file SHA-256 equals the v8 SHA, so the spans
 * cannot hide drift. A cut consumes the END marker plus exactly
 * one trailing newline (the spans abut their neighbours with no
 * blank line of their own). */
const V8_ACCESS_SPAN = [
  "    function canAccess(uid) {",
  "      return isOwner(uid) || isStaffOf(uid);",
  "    }",
  "",
  "    // v3: the caller's role within shop {uid} — \"owner\", the role",
  "    // stored on their staffIndex doc, or null when they have no",
  "    // access to this shop at all. A staffIndex doc WITHOUT a role",
  "    // field yields \"manager\" (the legacy default; .get with default",
  "    // also covers an explicit null).",
  "    function staffRole(uid) {",
  "      return isOwner(uid)",
  "        ? \"owner\"",
  "        : (isStaffOf(uid)",
  "            ? get(staffIndexPath(request.auth.token.email)).data",
  "                .get('role', 'manager')",
  "            : null);",
  "    }",
].join("\n");
function cutSpan(s, startMarker, endMarker, replacement) {
  const a = s.indexOf(startMarker);
  if (a < 0) return s;
  const b = s.indexOf(endMarker, a);
  if (b < 0) return s;
  return s.slice(0, a) + (replacement || "") + s.slice(b + endMarker.length + 1);
}
function stripG1Blocks(src) {
  let out = stripG3Blocks(stripH3Blocks(stripWaBlocks(stripFR2Blocks(src))));
  out = cutSpan(
    out,
    "// ---- Phase G · G1: rules v9 header note (START) ----",
    "// ---- Phase G · G1: rules v9 header note (END) ----",
    ""
  );
  out = cutSpan(
    out,
    "    // ---- Phase G · G1 amendment #1 (START)",
    "    // ---- Phase G · G1 amendment #1 (END) ----",
    V8_ACCESS_SPAN + "\n"
  );
  out = cutSpan(
    out,
    "    // ---- Phase G · G1 helpers (START) ----",
    "    // ---- Phase G · G1 helpers (END) ----",
    ""
  );
  out = cutSpan(
    out,
    "    // ---- Phase G · G1: platform collections (START) ----",
    "    // ---- Phase G · G1: platform collections (END) ----",
    ""
  );
  return out;
}


/* Phase G · G2 same-check amendment helper: remove the delimited
 * G2 spans (the v9 part 2 header note, the G2 helpers, the
 * completed §4.3 birth window inside businessBirthOk, the
 * amendment-#2 posting legs, the tier-split creates, and the
 * three amended platform blocks) so the whole-file and segment
 * pins keep asserting exactly what they asserted at v9 part 1.
 * Amendment spans are replaced by the EXACT part-1 text below,
 * so stripG2Blocks(v9 final) is part 1 byte-for-byte — the G2
 * suite asserts both that SHA and, composed with stripG1Blocks,
 * the v8 SHA. Strip order matters: G2 first (its spans nest
 * inside G1's), then G1. */
const G2_BIRTH_ORIG = "    // Creation-time shape for a businesses doc (\u00a74.3, G1 part):\n    // the doc's own owner, born active with enforcement off, and\n    // a plan snapshot equal to one of the two legitimate birth\n    // shapes \u2014 trial (a new business: the trial tier's limits, a\n    // future trial end, no paid period) or founding (the \u00a77.2\n    // migration of a shop whose namespace ALREADY exists:\n    // Advanced limits, no expiry of any kind). Anything else \u2014\n    // a self-granted paid tier, a live enforce flag, somebody\n    // else's business \u2014 fails validation. The trial-window\n    // tightness (\u00b1 a day around +14d) completes with G2's\n    // amendment #2, which is also when enforcement starts\n    // reading the snapshot at all.\n    function businessBirthOk(businessId) {\n      let d = request.resource.data;\n      let p = d.get('plan', {});\n      return d.get('ownerUid', '') == businessId\n        && d.get('status', '') == 'active'\n        && d.get('enforce', true) == false\n        && p.get('assignedBy', '') in ['signup', 'migration']\n        && (\n          (p.get('planId', '') == 'trial'\n            && p.get('usersLimit', 0) == 2\n            && p.get('invoiceLimit', 0) == 200\n            && p.get('modulesTier', '') == 'standard'\n            && p.get('trialEndsAt', null) is timestamp\n            && p.get('trialEndsAt', request.time) > request.time\n            && p.get('periodTo', null) == null)\n          || (p.get('planId', '') == 'founding'\n            && p.get('usersLimit', 0) == 10\n            && p.get('invoiceLimit', 0) == 10000\n            && p.get('modulesTier', '') == 'advanced'\n            && p.get('periodTo', null) == null\n            && p.get('trialEndsAt', null) == null\n            && exists(/databases/$(database)/documents/users/$(businessId)))\n        );\n    }";
const G2_COUNTERS_ORIG = "    match /businessCounters/{businessId} {\n      allow read: if isOwner(businessId) || isPlatformAdmin();\n      allow create: if isOwner(businessId)\n        && request.resource.data.get('invoiceCount', -1) >= 0\n        && request.resource.data.get('memberCount', -1) >= 0;\n      allow update, delete: if false;\n    }";
const G2_INVITES_ORIG = "    match /businessInvites/{businessId} {\n      match /invites/{inviteId} {\n        allow read: if isOwner(businessId)\n          || (isSignedIn() && resource.data.get('email', '') == request.auth.token.email)\n          || isPlatformAdmin();\n        allow create: if isOwner(businessId)\n          && request.resource.data.get('email', '') == inviteId\n          && request.resource.data.get('status', '') == 'pending';\n        allow update: if isOwner(businessId)\n          || (isSignedIn()\n              && resource.data.get('email', '') == request.auth.token.email\n              && request.resource.data.diff(resource.data).affectedKeys()\n                   .hasOnly(['status', 'claimedBy', 'claimedAt'])\n              && request.resource.data.get('status', '') == 'claimed'\n              && request.resource.data.get('claimedBy', '') == request.auth.uid);\n        allow delete: if isOwner(businessId);\n      }\n    }";
const G2_MEMBERS_ORIG = "    match /businessMembers/{businessId} {\n      match /members/{memberUid} {\n        allow read: if isOwner(businessId)\n          || request.auth.uid == memberUid\n          || isPlatformAdmin();\n        allow create: if isOwner(businessId)\n          || (isSignedIn()\n              && request.auth.uid == memberUid\n              && request.resource.data.get('email', '') == request.auth.token.email\n              && selfClaimOk(businessId));\n        allow update: if isOwner(businessId);\n        allow delete: if isOwner(businessId) || request.auth.uid == memberUid;\n      }\n    }";
const G2_LEG_ORIG = {
  "purchases": "        allow create: if hasRole(uid, ['owner', 'manager']) && createInOpenPeriod(uid);",
  "supplierPayments": "        allow create: if hasRole(uid, ['owner', 'manager', 'accountant']) && createInOpenPeriod(uid);",
  "credits": "        allow create: if canAccess(uid) && createInOpenPeriod(uid);",
  "returns": "        allow create: if hasRole(uid, ['owner', 'manager', 'cashier']) && createInOpenPeriod(uid);",
  "notes": "        allow create: if hasRole(uid, ['owner', 'manager', 'accountant']) && createInOpenPeriod(uid);",
  "purchaseReturns": "        allow create: if hasRole(uid, ['owner', 'manager', 'accountant']) && createInOpenPeriod(uid);",
  "cheques": "        allow create: if canAccess(uid) && createInOpenPeriod(uid);",
  "cashEntries": "        allow create: if hasRole(uid, ['owner', 'manager', 'accountant']) && createInOpenPeriod(uid);",
  "expenses": "        allow create: if hasRole(uid, ['owner', 'manager', 'accountant']) && createInOpenPeriod(uid);",
  "bills": "        allow create: if hasRole(uid, ['owner', 'manager', 'cashier']) && createInOpenPeriod(uid);\n        allow update: if hasRole(uid, ['owner', 'manager', 'cashier']);",
  "sales": "        allow create: if hasRole(uid, ['owner', 'manager', 'cashier']) && createInOpenPeriod(uid);",
  "payrollRuns": "        allow create: if hasRole(uid, ['owner', 'accountant']) && createInOpenPeriod(uid);",
  "loans": "        allow create: if hasRole(uid, ['owner', 'accountant']) && createInOpenPeriod(uid);",
  "journal": "        allow create: if canAccess(uid) && journalCreateInOpenPeriod(uid);",
  "boms": "        allow create, update, delete: if hasRole(uid, ['owner', 'manager']);",
  "productionOrders": "        allow create, update, delete: if hasRole(uid, ['owner', 'manager']);",
  "jobs": "        allow create, update, delete: if hasRole(uid, ['owner', 'manager']);",
  "employees": "        allow create, update, delete: if hasRole(uid, ['owner', 'manager']);"
};
function stripG2Blocks(src) {
  let out = stripG3Blocks(stripH3Blocks(stripWaBlocks(stripFR2Blocks(src))));
  out = cutSpan(out,
    "// ---- Phase G · G2: rules v9 part 2 header note (START) ----",
    "// ---- Phase G · G2: rules v9 part 2 header note (END) ----", "");
  out = cutSpan(out,
    "    // ---- Phase G · G2 helpers (START) ----",
    "    // ---- Phase G · G2 helpers (END) ----", "");
  out = cutSpan(out,
    "    // ---- Phase G · G2 amendment #2 (birth window) (START) ----",
    "    // ---- Phase G · G2 amendment #2 (birth window) (END) ----",
    G2_BIRTH_ORIG + "\n");
  for (const name of Object.keys(G2_LEG_ORIG)) {
    out = cutSpan(out,
      "        // ---- Phase G · G2 amendment #2 (" + name + ") (START) ----",
      "        // ---- Phase G · G2 amendment #2 (" + name + ") (END) ----",
      G2_LEG_ORIG[name] + "\n");
  }
  out = cutSpan(out,
    "    // ---- Phase G · G2 amendment (counters) (START) ----",
    "    // ---- Phase G · G2 amendment (counters) (END) ----",
    G2_COUNTERS_ORIG + "\n");
  out = cutSpan(out,
    "    // ---- Phase G · G2 amendment (invites) (START) ----",
    "    // ---- Phase G · G2 amendment (invites) (END) ----",
    G2_INVITES_ORIG + "\n");
  out = cutSpan(out,
    "    // ---- Phase G · G2 amendment (members) (START) ----",
    "    // ---- Phase G · G2 amendment (members) (END) ----",
    G2_MEMBERS_ORIG + "\n");
  return out;
}

/* Phase G · G3 same-check amendment helper: remove the ONE
 * delimited G3 span (the §6.1 platform collections II —
 * businessStats, platformPayments, platformConfig) so every
 * whole-file and segment pin keeps asserting exactly what it
 * asserted at pre-G3 v9. Both G strip functions above apply it
 * FIRST (function declarations hoist, so its definition may sit
 * here): the span is a pure addition sitting after the G1
 * platform span, so cutting it is a no-op on any earlier file
 * state and cannot hide drift — the G3 suite asserts
 * stripG3Blocks(v9+G3) hashes to the pinned pre-G3 v9 SHA, and
 * the composed strips still land on the v9pt1 and v8 SHAs. */
function stripG3Blocks(src) {
  return cutSpan(
    src,
    "    // ---- Phase G · G3: platform collections II (START) ----",
    "    // ---- Phase G · G3: platform collections II (END) ----",
    ""
  );
}

/* Phase H · H3 same-check amendment helper: remove the FOUR
 * delimited H3 spans (the v10 header note, the design §5.2 named
 * amendment #1 inside planJournalTierOk — restored to the exact
 * v9 text below — the H3 helpers, and the storefront blocks) so
 * every whole-file and segment pin keeps asserting exactly what
 * it asserted at v9. Both G strip functions apply it FIRST (the
 * G3 precedent — its spans sit outside theirs): stripH3Blocks
 * (v10) is v9 byte-for-byte, which the H3 suite proves against
 * the pinned v9 SHA, and the composed strips still land on the
 * v9 part-1 and v8 SHAs in the G suites. Amendment #2 of §5.2
 * needed no text: the journal leg is refType-blind, so the H1
 * loyalty postings already passed journalCreateInOpenPeriod. */
const H3_LEG_ORIG =
  "          : (rt in ['job_material', 'job_material_return',\n" +
  "                    'transfer_loss', 'purchase_return', 'cheque_clearing',\n" +
  "                    'cheque_bounce', 'cheque_return']";
function stripH3Blocks(src) {
  let out = cutSpan(
    src,
    "// ---- Phase H · H3: rules v10 header note (START) ----",
    "// ---- Phase H · H3: rules v10 header note (END) ----",
    ""
  );
  out = cutSpan(
    out,
    "          // ---- Phase H · H3 amendment (journal tier list) (START) ----",
    "          // ---- Phase H · H3 amendment (journal tier list) (END) ----",
    H3_LEG_ORIG + "\n"
  );
  out = cutSpan(
    out,
    "    // ---- Phase H · H3 helpers (START) ----",
    "    // ---- Phase H · H3 helpers (END) ----",
    ""
  );
  out = cutSpan(
    out,
    "    // ---- Phase H · H3: storefront blocks (START) ----",
    "    // ---- Phase H · H3: storefront blocks (END) ----",
    ""
  );
  return out;
}

/* Phase H · WhatsApp same-check amendment helper: remove the
 * TWO delimited WhatsApp spans (the v10 header-note amendment
 * and the wa collections block inside users/{uid}) so every
 * whole-file and segment pin keeps asserting exactly what it
 * asserted at the H3-final v10. Both G strip functions apply it
 * FIRST (the G3/H3 precedent — its spans sit outside theirs):
 * stripWaBlocks(amended v10) is the H3-final v10 byte-for-byte,
 * which the WA suite proves against the pinned H3 SHA, and the
 * composed strips still land on the v9 FINAL SHA. */
function stripWaBlocks(src) {
  // H6 amendment: the H6 strip runs first (the newest-first
  // funnel — every composed strip in the file passes through
  // this helper, so the H6 spans leave with the WA spans).
  let out = cutSpan(
    stripH6Blocks(src),
    "// ---- Phase H · WhatsApp: rules v10 header note (START) ----",
    "// ---- Phase H · WhatsApp: rules v10 header note (END) ----",
    ""
  );
  out = cutSpan(
    out,
    "      // ---- Phase H · WhatsApp: wa collections (START) ----",
    "      // ---- Phase H · WhatsApp: wa collections (END) ----",
    ""
  );
  return out;
}

/* Phase H · H6 same-check amendment helper: remove the TWO
 * delimited H6 spans (the v10 amendment note at the top of the
 * file and the order-consent amendment inside storeOrderCreateOk,
 * restoring the function's original key-set head) so the WA
 * suite's strip proof keeps asserting the H3-final v10
 * byte-for-byte. The amendment span nests inside the H3 helpers
 * span, so every composed strip through stripH3Blocks already
 * removes it wholesale — the v9 FINAL proof is untouched. */
const H6_ORDER_ORIG = "      return keys.hasOnly(['businessId', 'slug', 'customerName',\n                           'phone', 'lines', 'note', 'fulfilment',\n                           'createdAt', 'state'])\n        && keys.hasAll(['businessId', 'slug', 'customerName',\n                        'phone', 'lines', 'fulfilment', 'createdAt',\n                        'state'])";
function stripH6Blocks(src) {
  let out = cutSpan(
    src,
    "// ---- Phase H · H6: rules v10 amendment note (START) ----",
    "// ---- Phase H · H6: rules v10 amendment note (END) ----",
    ""
  );
  out = cutSpan(
    out,
    "      // ---- Phase H · H6 amendment (order consent key) (START) ----",
    "      // ---- Phase H · H6 amendment (order consent key) (END) ----",
    H6_ORDER_ORIG + "\n"
  );
  return out;
}

/* BizCreateFix · v12 same-check amendment helper: remove the TWO
 * delimited v12 spans (the v12 header note and the accounts
 * amendment) so every whole-file and segment pin keeps asserting
 * exactly what it asserted at v11: stripBizCreateFixBlocks(v12)
 * is v11 byte-for-byte (proven in the BizCreateFix suite below),
 * and stripFR2Blocks applies it FIRST (the WA/H6 funnel
 * precedent — every composed strip in the file passes through
 * stripFR2Blocks, so the v12 spans leave with the FR2 spans). */
function stripBizCreateFixBlocks(src) {
  let out = cutSpan(
    src,
    "// ---- BizCreateFix · v12 header note (START) ----",
    "// ---- BizCreateFix · v12 header note (END) ----",
    ""
  );
  out = cutSpan(
    out,
    "        // ---- BizCreateFix · v12 amendment (accounts) (START) ----",
    "        // ---- BizCreateFix · v12 amendment (accounts) (END) ----",
    ""
  );
  return out;
}

/* Fix Round 2 · FR2 same-check amendment helper: remove every
 * delimited FR2 span (the v11 header note, the helpers, the five
 * one-line amendments restored to their exact v10 text below,
 * the additive mirror/clear-window legs, and the trash block)
 * so every whole-file and segment pin keeps asserting exactly
 * what it asserted at the v10 FINAL file. Strip order: FR2
 * FIRST — its canAccess/staffRole spans nest inside the G1
 * amendment span and its birth span nests inside the G2 birth
 * window, so the G1/G2 strips (which now call this helper
 * first, the Wa/H3/G3 precedent) restore v10 text inside those
 * spans before replacing them with v8/part-1 text. The FR2
 * suite asserts stripFR2Blocks(v11) hashes to the pinned v10
 * SHA, and the composed strips still land on the v9 FINAL, v9
 * part-1 and v8 SHAs in the G suites. */
const FR2_CANACCESS_ORIG = "      return isOwner(uid) || isMemberOf(uid) || isStaffOf(uid);\n";
const FR2_STAFFROLE_ORIG = "      return isOwner(uid)\n";
const FR2_BIRTH_ORIG = "      return d.get('ownerUid', '') == businessId\n";
const FR2_STOREFRONT_WRITE_ORIG = "      return d.get('businessId', '') == request.auth.uid\n";
const FR2_STOREFRONT_UPDATE_ORIG = "        && resource.data.get('businessId', '') == request.auth.uid\n";
function stripFR2Blocks(src) {
  // BizCreateFix same-check amendment: the v12 spans sit outside
  // the FR2 spans, so strip them FIRST — every composed strip in
  // the file passes through here (the WA/H6 funnel precedent), so
  // the v12 spans leave with the FR2 spans and all v11/v10/v9 pins
  // keep holding.
  let out = stripBizCreateFixBlocks(src);
  out = cutSpan(out,
    "// ---- Fix Round 2 · FR2: rules v11 header note (START) ----",
    "// ---- Fix Round 2 · FR2: rules v11 header note (END) ----", "");
  out = cutSpan(out,
    "    // ---- Fix Round 2 · FR2 helpers (START) ----",
    "    // ---- Fix Round 2 · FR2 helpers (END) ----", "");
  out = cutSpan(out,
    "      // ---- Fix Round 2 · FR2 amendment (canAccess) (START) ----",
    "      // ---- Fix Round 2 · FR2 amendment (canAccess) (END) ----",
    FR2_CANACCESS_ORIG);
  out = cutSpan(out,
    "      // ---- Fix Round 2 · FR2 amendment (staffRole) (START) ----",
    "      // ---- Fix Round 2 · FR2 amendment (staffRole) (END) ----",
    FR2_STAFFROLE_ORIG);
  out = cutSpan(out,
    "      // ---- Fix Round 2 · FR2 amendment (birth owner) (START) ----",
    "      // ---- Fix Round 2 · FR2 amendment (birth owner) (END) ----",
    FR2_BIRTH_ORIG);
  out = cutSpan(out,
    "      // ---- Fix Round 2 · FR2 amendment (owner-doc write) (START) ----",
    "      // ---- Fix Round 2 · FR2 amendment (owner-doc write) (END) ----", "");
  out = cutSpan(out,
    "        // ---- Fix Round 2 · FR2 clear window (sales) (START) ----",
    "        // ---- Fix Round 2 · FR2 clear window (sales) (END) ----", "");
  out = cutSpan(out,
    "        // ---- Fix Round 2 · FR2 clear window (journal) (START) ----",
    "        // ---- Fix Round 2 · FR2 clear window (journal) (END) ----", "");
  out = cutSpan(out,
    "        // ---- Fix Round 2 · FR2 clear window (bills) (START) ----",
    "        // ---- Fix Round 2 · FR2 clear window (bills) (END) ----", "");
  out = cutSpan(out,
    "        // ---- Fix Round 2 · FR2 clear window (waCampaigns) (START) ----",
    "        // ---- Fix Round 2 · FR2 clear window (waCampaigns) (END) ----", "");
  out = cutSpan(out,
    "        // ---- Fix Round 2 · FR2 clear window (waSends) (START) ----",
    "        // ---- Fix Round 2 · FR2 clear window (waSends) (END) ----", "");
  out = cutSpan(out,
    "      // ---- Fix Round 2 · FR2 amendment (businesses) (START) ----",
    "      // ---- Fix Round 2 · FR2 amendment (businesses) (END) ----", "");
  out = cutSpan(out,
    "        // ---- Fix Round 2 · FR2 amendment (members read) (START) ----",
    "        // ---- Fix Round 2 · FR2 amendment (members read) (END) ----", "");
  out = cutSpan(out,
    "        // ---- Fix Round 2 · FR2 amendment (members create) (START) ----",
    "        // ---- Fix Round 2 · FR2 amendment (members create) (END) ----", "");
  out = cutSpan(out,
    "        // ---- Fix Round 2 · FR2 amendment (members delete) (START) ----",
    "        // ---- Fix Round 2 · FR2 amendment (members delete) (END) ----", "");
  out = cutSpan(out,
    "        // ---- Fix Round 2 · FR2 amendment (invites read) (START) ----",
    "        // ---- Fix Round 2 · FR2 amendment (invites read) (END) ----", "");
  out = cutSpan(out,
    "        // ---- Fix Round 2 · FR2 amendment (invites create) (START) ----",
    "        // ---- Fix Round 2 · FR2 amendment (invites create) (END) ----", "");
  out = cutSpan(out,
    "        // ---- Fix Round 2 · FR2 amendment (invites update) (START) ----",
    "        // ---- Fix Round 2 · FR2 amendment (invites update) (END) ----", "");
  out = cutSpan(out,
    "        // ---- Fix Round 2 · FR2 amendment (invites delete) (START) ----",
    "        // ---- Fix Round 2 · FR2 amendment (invites delete) (END) ----", "");
  out = cutSpan(out,
    "      // ---- Fix Round 2 · FR2 amendment (counters) (START) ----",
    "      // ---- Fix Round 2 · FR2 amendment (counters) (END) ----", "");
  out = cutSpan(out,
    "      // ---- Fix Round 2 · FR2 amendment (stats) (START) ----",
    "      // ---- Fix Round 2 · FR2 amendment (stats) (END) ----", "");
  out = cutSpan(out,
    "      // ---- Fix Round 2 · FR2 amendment (events) (START) ----",
    "      // ---- Fix Round 2 · FR2 amendment (events) (END) ----", "");
  out = cutSpan(out,
    "      // ---- Fix Round 2 · FR2 amendment (storefront owner) (START) ----",
    "      // ---- Fix Round 2 · FR2 amendment (storefront owner) (END) ----",
    FR2_STOREFRONT_WRITE_ORIG);
  out = cutSpan(out,
    "        // ---- Fix Round 2 · FR2 amendment (storefront update) (START) ----",
    "        // ---- Fix Round 2 · FR2 amendment (storefront update) (END) ----",
    FR2_STOREFRONT_UPDATE_ORIG);
  out = cutSpan(out,
    "    // ---- Fix Round 2 · FR2: trash blocks (START) ----",
    "    // ---- Fix Round 2 · FR2: trash blocks (END) ----", "");
  /* FR2 owner-leg widenings (no span — one-line replacements, so
   * the strip restores the v10 originals by replacement. Lenient
   * by design, like cutSpan itself: old checks strip SLICED
   * inputs (the C1 check cuts the warehouses/stockLevels region;
   * D2/D3 cut their blocks), and stripG1(stripG2(...)) strips
   * FR2 twice — a counted throw would fail those legitimate
   * calls. The STRICT proof is the FR2 suite's own check:
   * stripFR2Blocks (which first strips the v12 spans, per the
   * BizCreateFix amendment above) hashes to the v10 SHA byte-for-byte. */
  const restoreAll = (text, oldLine, newLine) => text.split(oldLine).join(newLine);
  out = restoreAll(out,
    "        allow update, delete: if isBusinessOwner(uid);",
    "        allow update, delete: if isOwner(uid);");
  out = restoreAll(out,
    "        allow delete: if isBusinessOwner(uid);",
    "        allow delete: if isOwner(uid);");
  out = restoreAll(out,
    "        allow create, update, delete: if isBusinessOwner(uid);",
    "        allow create, update, delete: if isOwner(uid);");
  out = restoreAll(out,
    "      match /taxSlabs/{slabId} {\n        allow read: if canAccess(uid);\n        allow write: if isBusinessOwner(uid);",
    "      match /taxSlabs/{slabId} {\n        allow read: if canAccess(uid);\n        allow write: if isOwner(uid);");
  out = restoreAll(out,
    "      match /periods/{periodId} {\n        allow read: if canAccess(uid);\n        allow write: if isBusinessOwner(uid);",
    "      match /periods/{periodId} {\n        allow read: if canAccess(uid);\n        allow write: if isOwner(uid);");
  return out;
}

/* ------------------------------- framework ------------------------------- */
let cur = null;
const suites = [];
function suite(name, expected) {
  cur = { name, expected, pass: 0, fail: 0, failures: [] };
  suites.push(cur);
}
function check(cond, label) {
  if (cond) cur.pass++;
  else {
    cur.fail++;
    cur.failures.push(label);
    console.log(`  FAIL [${cur.name}] ${label}`);
  }
}
const eq = (a, b) => Math.abs(a - b) < 0.005;
const sum = (arr) => arr.reduce((x, y) => x + y, 0);

/* ------------------------------- seed data ------------------------------- */
const products = seed.getSeedProducts();
const sales = seed.getSeedSales();
const purchases = seed.getSeedPurchases();
const payments = seed.getSeedSupplierPayments();
const expenses = seed.getSeedExpenses();
const credits = seed.getSeedCredits();
const customers = seed.getSeedCustomers();
const journal = seed.getSeedJournal(products, sales, purchases, payments, expenses, credits);
const accounts = seed.getSeedAccounts();
const byId = (arr, id) => arr.find((x) => x.id === id);

/* =============================== FIN (34) =============================== */
suite("FIN", 34);
{
  // F-1: the balance guard is enforced in makeEntry.
  let threw = false;
  try {
    ledger.makeEntry("bad", "sale", null, [
      { account: "cash", debit: 100, credit: 0 },
      { account: "sales_revenue", debit: 0, credit: 99 },
    ]);
  } catch { threw = true; }
  check(threw, "F-1 unbalanced entry throws");

  const zero = ledger.makeEntry("zero", "sale", null, [
    { account: "cash", debit: 0, credit: 0 },
  ]);
  check(zero.lines.length === 0 && ledger.entryBalances(zero), "F-1 zero-only entry legal");

  // Seed integrity (F-12 identities).
  check(journal.length === 21, "seed journal has 21 entries");
  check(journal.every((e) => ledger.entryBalances(e)), "every seed entry balances");
  check(eq(ledger.accountBalance(journal, "inventory"), 272805), "journal Inventory == 272,805");
  check(eq(ledger.cashBalance(journal), 50000) && seed.SEED_OPENING_TILL === 50000, "journal Cash == opening till 50,000");
  check(eq(ledger.payablesTotal(journal), 27900), "payables == 27,900");
  check(eq(ledger.receivablesTotal(journal), 5500), "receivables == 5,500");
  check(
    eq(sum(coa.ACCOUNT_CODES.map((c) => ledger.accountBalance(journal, c))), 0),
    "trial balance == 0"
  );

  // F-2: tolerance difference booked as an explicit discount line.
  const over = ledger.makeEntry("bill 166.5 paid 167", "sale", null, [
    { account: "cash", debit: 167, credit: 0 },
    { account: "cogs", debit: 100, credit: 0 },
    { account: "sales_revenue", debit: 0, credit: 166.5 },
    { account: "inventory", debit: 0, credit: 100 },
    { account: "sales_discount", debit: 0, credit: 0.5 },
  ]);
  check(ledger.entryBalances(over), "F-2 overpayment entry balances exactly");
  const under = ledger.makeEntry("bill 1000 paid 999", "sale", null, [
    { account: "cash", debit: 999, credit: 0 },
    { account: "sales_discount", debit: 1, credit: 0 },
    { account: "cogs", debit: 600, credit: 0 },
    { account: "sales_revenue", debit: 0, credit: 1000 },
    { account: "inventory", debit: 0, credit: 600 },
  ]);
  const discLine = under.lines.find((l) => l.account === "sales_discount");
  check(ledger.entryBalances(under) && discLine && eq(discLine.debit, 1), "F-2 underpayment books Dr discount 1");

  // F-3: cumulative discount allocation across item-by-item returns.
  const subtotal = 300, discount = 100;
  let reversedSoFar = 0, refunds = 0; const shares = [];
  for (let i = 0; i < 3; i++) {
    const cumGross = (i + 1) * 100;
    const share = Math.round((discount * cumGross) / subtotal) - reversedSoFar;
    shares.push(share); reversedSoFar += share; refunds += 100 - share;
  }
  check(eq(refunds, 200), "F-3 item-by-item refunds total exactly 200");
  check(eq(sum(shares), 100), "F-3 discount reversed exactly 100");
  const oldShares = [0, 0, 0].map(() => Math.round((discount * 100) / subtotal));
  check(eq(sum(oldShares.map((s) => 100 - s)), 201), "F-3 control: old per-event formula over-refunds 201");

  // F-4 (audit S6): buy 10@100 -> reprice 120 (revaluation) -> sell out.
  const s6 = [
    ledger.makeEntry("buy", "purchase", null, [
      { account: "purchases", debit: 1000, credit: 0 },
      { account: "inventory", debit: 1000, credit: 0 },
      { account: "purchases", debit: 0, credit: 1000 },
      { account: "payables", debit: 0, credit: 1000 },
    ]),
    ledger.makeEntry("revalue", "adjustment", null, [
      { account: "inventory", debit: 200, credit: 0 },
      { account: "capital", debit: 0, credit: 200 },
    ]),
    ledger.makeEntry("sell out", "sale", null, [
      { account: "cash", debit: 1500, credit: 0 },
      { account: "cogs", debit: 1200, credit: 0 },
      { account: "sales_revenue", debit: 0, credit: 1500 },
      { account: "inventory", debit: 0, credit: 1200 },
    ]),
  ];
  check(eq(ledger.accountBalance(s6, "inventory"), 0), "F-4 reprice-then-sell-out leaves Inventory 0");

  // F-5: seeded expenses are reversible by refId across refTypes.
  const elec = expenses.find((e) => e.amount === 8450);
  const rent = expenses.find((e) => e.amount === 25000);
  const elecEntry = ledger.findUnreversedPosting(journal, elec.id);
  check(!!elecEntry && elecEntry.refType === "seed", "F-5 finder locates the seeded electricity posting");
  const acctOf = (entry) => entry.lines.find((l) => l.debit > 0).account;
  const netForRef = (entries, refId, acct) =>
    sum(entries.filter((e) => e.refId === refId).flatMap((e) => e.lines.filter((l) => l.account === acct).map((l) => l.debit - l.credit)));
  const swap = (entry, refType) =>
    ledger.makeEntry("reversal", refType, entry.refId,
      entry.lines.map((l) => ({ account: l.account, debit: l.credit, credit: l.debit })),
      { reversesId: entry.id });
  const elecAcct = acctOf(elecEntry);
  const edited = [...journal, swap(elecEntry, "expense"),
    ledger.makeEntry("repost", "expense", elec.id, [
      { account: elecAcct, debit: 9000, credit: 0 },
      { account: "cash", debit: 0, credit: 9000 },
    ])];
  check(eq(netForRef(edited, elec.id, elecAcct), 9000), "F-5 seeded expense edit nets exactly 9,000");
  const deleted = [...journal, swap(elecEntry, "expense")];
  check(eq(netForRef(deleted, elec.id, elecAcct), 0), "F-5 seeded expense delete nets 0");
  const rentEntry = ledger.findUnreversedPosting(journal, rent.id);
  const rentDeleted = [...journal, swap(rentEntry, "expense")];
  check(eq(netForRef(rentDeleted, rent.id, acctOf(rentEntry)), 0), "F-5 seeded rent delete nets 0");

  // F-6: bill-linked udhaar outstanding under FIFO repayment allocation.
  const mkCredit = (patch) => ({
    id: patch.id, customerId: "c1", customerName: "A", customerPhone: "1",
    kind: "credit", amount: 0, note: "", billId: null, dayOffset: 0,
    ts: "2026-10-01T00:00:00.000Z", ...patch,
  });
  const bill1 = { id: "b1", customerId: "c1", customerName: "A", customerPhone: "1" };
  const repaid = [
    mkCredit({ id: "cr1", amount: 1000, billId: "b1" }),
    mkCredit({ id: "rp1", kind: "repayment", amount: 1000 }),
  ];
  const pos = ledger.billCreditOutstanding(repaid, bill1);
  check(eq(pos.outstanding, 0), "F-6 fully repaid bill: outstanding 0");
  check(eq(pos.repaidAllocated, 1000), "F-6 repaid allocated 1,000");
  const partial = [
    mkCredit({ id: "cr1", amount: 1000, billId: "b1" }),
    mkCredit({ id: "rp1", kind: "repayment", amount: 400 }),
  ];
  check(eq(ledger.billCreditOutstanding(partial, bill1).outstanding, 600), "F-6 partial repayment: outstanding 600");
  const withReversal = [
    mkCredit({ id: "cr1", amount: 1000, billId: "b1" }),
    mkCredit({ id: "cr2", amount: -300, billId: "b1" }),
  ];
  check(eq(ledger.billCreditOutstanding(withReversal, bill1).outstanding, 700), "F-6 return reversal nets: outstanding 700");

  // F-7: the seed's standalone udhaar is a cash loan, not revenue.
  const cr1 = credits.find((c) => c.amount === 8500) ?? credits[0];
  const cr1Entry = journal.find((e) => e.refId === cr1.id);
  check(
    !!cr1Entry &&
      cr1Entry.lines.some((l) => l.account === "cash" && eq(l.credit, 8500)) &&
      !cr1Entry.lines.some((l) => l.account === "sales_revenue"),
    "F-7 standalone udhaar credits cash, never revenue"
  );

  // F-9: dashboard profit uses the sale's cost snapshot.
  const p1 = { id: "p1", costPrice: 130 };
  const saleSnap = [{ productId: "p1", qty: 2, unitPrice: 500, unitCost: 100, total: 1000, dayOffset: 0 }];
  check(eq(selectors.profitOnDay(saleSnap, 0, [p1]), 800), "F-9 profit uses unitCost snapshot (800)");
  const saleNoSnap = [{ productId: "p1", qty: 2, unitPrice: 500, total: 1000, dayOffset: 0 }];
  check(eq(selectors.profitOnDay(saleNoSnap, 0, [p1]), 740), "F-9 seed-shaped rows fall back to product cost (740)");

  // F-11: adjustments clamp to the shelf before posting.
  check(ledger.appliedAdjustmentDelta(4, -10) === -4, "F-11 (4,-10) -> -4");
  check(ledger.appliedAdjustmentDelta(4, -3) === -3, "F-11 (4,-3) -> -3");
  check(ledger.appliedAdjustmentDelta(4, 7) === 7, "F-11 (4,+7) -> +7");

  // F-14: top-up opening entry from the subledgers.
  const topUp = seed.getTopUpOpeningEntry(products, credits, purchases, payments);
  check(!!topUp && ledger.entryBalances(topUp), "F-14 top-up entry balances");
  check(eq(ledger.accountBalance([topUp], "inventory"), 272805), "F-14 inventory 272,805");
  check(eq(ledger.accountBalance([topUp], "receivables"), 5500), "F-14 receivables 5,500");
  check(eq(-ledger.accountBalance([topUp], "payables"), 27900), "F-14 payables 27,900");
  check(eq(-ledger.accountBalance([topUp], "capital"), 250405), "F-14 capital credit 250,405");
}

/* =============================== COA (10) =============================== */
suite("COA", 10);
{
  /* Phase D · D1 amended this literal (same check): the registry
   * gained its ONE Phase D code additively — `loans_receivable`
   * (design §3.1) — 27 → 28. The v1/A counts below are untouched. */
  check(coa.ACCOUNT_CODES.length === 30, "registry holds 30 codes (H1 pin amendment: +loyalty_payable +expense_loyalty, additive since \"H\")");
  const v1 = Object.entries(coa.CHART_OF_ACCOUNTS).filter(([, m]) => m.since === "v1").map(([c]) => c);
  check(v1.length === 17, "17 v1 codes frozen");
  const phaseA = Object.entries(coa.CHART_OF_ACCOUNTS).filter(([, m]) => m.since === "A").map(([c]) => c);
  check(phaseA.length === 10, "10 Phase A codes added");
  check(coa.normalBalanceSign("tax_payable") === -1, "tax_payable is credit-normal");
  check(coa.normalBalanceSign("tax_input") === 1, "tax_input is debit-normal");
  check(
    coa.normalBalanceSign("inventory") === 1 && coa.normalBalanceSign("sales_revenue") === -1,
    "inventory debit-normal, revenue credit-normal"
  );
  check(coa.isAccountCode("cogs") === true, "isAccountCode accepts a real code");
  check(coa.isAccountCode("bogus") === false, "isAccountCode rejects an unknown code");
  check(coa.accountMeta("capital").type === "equity", "capital typed equity");
  check(
    coa.ACCOUNT_CODES.every((c) => {
      const m = coa.accountMeta(c);
      return !!m && typeof m.type === "string" &&
        (m.normalBalance === null ? coa.normalBalanceSign(c) === 1 : (m.normalBalance === "credit") === (coa.normalBalanceSign(c) === -1));
    }),
    "every code's meta agrees with its normal-balance sign"
  );
}

/* ================================ A2 (16) =============================== */
suite("A2", 16);
{
  const till = byId(accounts, seed.SEED_ACCOUNT_IDS.till);
  const walletLegacy = byId(accounts, seed.SEED_ACCOUNT_IDS.walletLegacy);
  const jazz = byId(accounts, seed.SEED_ACCOUNT_IDS.jazzcash);
  const easy = byId(accounts, seed.SEED_ACCOUNT_IDS.easypaisa);
  const bank = byId(accounts, seed.SEED_ACCOUNT_IDS.bank);
  check(accounts.length === 5, "five seeded money accounts");
  check(
    [till, walletLegacy, jazz, easy, bank].every(Boolean) &&
      new Set(accounts.map((a) => a.id)).size === 5,
    "fixed account ids, unique"
  );
  check(till.legacyFor === "cash" && till.kind === "cash" && till.method === "cash", "Main Till is the cash legacy account");
  check(walletLegacy.legacyFor === "wallet", "Wallet & Bank is the wallet legacy account");
  check(eq(ledger.moneyAccountBalance(journal, till), 50000), "Main Till == GL cash 50,000");
  check(
    eq(ledger.moneyAccountBalance(journal, walletLegacy), ledger.walletBalance(journal)),
    "Wallet & Bank == GL wallet"
  );
  check(eq(ledger.walletBalance(journal), -45000), "GL wallet == -45,000 on seed data");
  check(
    eq(ledger.accountsBucketBalance(journal, accounts, "cash"), ledger.cashBalance(journal)),
    "invariant: cash bucket per-account sum == GL"
  );
  check(
    eq(ledger.accountsBucketBalance(journal, accounts, "wallet"), ledger.walletBalance(journal)),
    "invariant: wallet bucket per-account sum == GL"
  );
  // Transfer inside one bucket (wallet->wallet): GL-neutral, accounts move.
  const tIn = ledger.makeEntry("transfer", "transfer", null, [
    { account: "wallet", debit: 5000, credit: 0, ref: easy.id },
    { account: "wallet", debit: 0, credit: 5000, ref: jazz.id },
  ]);
  const j2 = [...journal, tIn];
  check(
    eq(ledger.walletBalance(j2), ledger.walletBalance(journal)) &&
      eq(ledger.moneyAccountBalance(j2, easy) - ledger.moneyAccountBalance(journal, easy), 5000) &&
      eq(ledger.moneyAccountBalance(j2, jazz) - ledger.moneyAccountBalance(journal, jazz), -5000),
    "wallet->wallet transfer moves exactly the amount, GL-neutral"
  );
  // Transfer across buckets (till -> bank).
  const tX = ledger.makeEntry("transfer", "transfer", null, [
    { account: "wallet", debit: 7000, credit: 0, ref: bank.id },
    { account: "cash", debit: 0, credit: 7000, ref: till.id },
  ]);
  const j3 = [...journal, tX];
  check(
    eq(ledger.cashBalance(j3) - ledger.cashBalance(journal), -7000) &&
      eq(ledger.walletBalance(j3) - ledger.walletBalance(journal), 7000),
    "cross-bucket transfer moves both GL buckets by the amount"
  );
  check(
    eq(ledger.moneyAccountBalance(j3, till) - ledger.moneyAccountBalance(journal, till), -7000) &&
      eq(ledger.moneyAccountBalance(j3, bank) - ledger.moneyAccountBalance(journal, bank), 7000),
    "cross-bucket transfer moves the two accounts by the amount"
  );
  check(ledger.defaultAccountForMethod(accounts, "jazzcash")?.id === jazz.id, "default for JazzCash is its account");
  check(ledger.defaultAccountForMethod(accounts, "cash")?.id === till.id, "default for cash is the till");
  const book = ledger.accountBook(journal, till);
  check(
    book.length > 0 && eq(book[book.length - 1].balance, 50000),
    "till cash book runs to the journal balance"
  );
  const preToday = journal.filter((e) => e.dayOffset !== 0);
  const opening = ledger.moneyAccountBalance(preToday, till);
  check(
    eq(ledger.expectedCloseForAccount(journal, till, opening), ledger.moneyAccountBalance(journal, till)),
    "day-close expectation == journal balance"
  );
}

/* ============================== RBAC (118) ============================== */
/* Pin lineage: 116 was the pre-H pin; H1's loyalty row and H3's
 * storefront row each added one generated "owner full" check
 * (117 actual at the H3 close — the expected pin was left stale
 * and the runner exited 1 despite an all-pass board), and the
 * WhatsApp row adds one more: 118, amended here with the WA
 * suite that finally owns the count. */
suite("RBAC", 118);
{
  // R-2: manager IS legacy staff, module for module (26).
  for (const m of perm.CURRENT_MODULES) {
    check(perm.accessOf("manager", m) === perm.LEGACY_STAFF_ACCESS[m], `manager == legacy: ${m}`);
  }
  // Owner is unrestricted across all 43 rows.
  for (const m of Object.keys(perm.PERMISSION_MATRIX)) {
    check(perm.accessOf("owner", m) === "full", `owner full: ${m}`);
  }
  // Role resolution defaults to the legacy profile (manager).
  check(perm.resolveStaffRole(undefined) === "manager", "resolve undefined -> manager");
  check(perm.resolveStaffRole(null) === "manager", "resolve null -> manager");
  check(perm.resolveStaffRole("cashier") === "cashier", "resolve cashier");
  check(perm.resolveStaffRole("bogus") === "manager", "resolve bogus -> manager");
  check(perm.resolveStaffRole("accountant") === "accountant", "resolve accountant");
  // can() semantics — spot rows incl. the Phase B rows B1 relies on.
  const spots = [
    ["accountant", "quotations", "view", true],
    ["accountant", "quotations", "write", false],
    ["cashier", "quotations", "write", true],
    ["cashier", "purchaseOrders", "write", false],
    ["accountant", "purchaseOrders", "view", true],
    ["cashier", "finance", "view", false],
    ["accountant", "finance", "write", true],
    ["manager", "billingVoid", "write", true],
    ["cashier", "billingVoid", "write", false],
    ["accountant", "salesCounter", "view", false],
    ["none", "dashboard", "view", false],
    ["owner", "periods", "write", true],
    ["manager", "periods", "view", false],
    ["accountant", "taxSlabs", "view", true],
    ["accountant", "taxSlabs", "write", false],
    ["cashier", "creditRepayment", "write", true],
    ["manager", "accountsManage", "view", false],
    ["accountant", "cheques", "write", true],
    ["cashier", "cheques", "view", false],
  ];
  for (const [r, m, a, want] of spots) {
    check(perm.can(r, m, a) === want, `can(${r}, ${m}, ${a}) === ${want}`);
  }
  check(perm.canBrowseJournal("owner") === true, "journal browse: owner");
  check(perm.canBrowseJournal("manager") === true, "journal browse: manager");
  check(perm.canBrowseJournal("accountant") === true, "journal browse: accountant");
  check(perm.canBrowseJournal("cashier") === false, "journal browse: cashier denied");
  // Migration backfill (design SS6.1).
  const NOW = "2026-10-22T00:00:00.000Z";
  const bf1 = perm.backfillStaff({ staffEmails: ["a@x"], staff: [], indexRoles: {}, now: NOW });
  check(bf1.staff.length === 1 && bf1.staff[0].role === "manager" && bf1.indexRoleWrites.length === 0,
    "backfill: bare email becomes manager, no index write");
  const bf2 = perm.backfillStaff({
    staffEmails: ["a@x"], staff: [{ email: "a@x", role: "cashier", addedAt: NOW }],
    indexRoles: { "a@x": "manager" }, now: NOW,
  });
  check(bf2.staff[0].role === "cashier", "backfill: existing staff[] role wins");
  const bf3 = perm.backfillStaff({ staffEmails: ["a@x"], staff: [], indexRoles: { "a@x": "accountant" }, now: NOW });
  check(bf3.staff[0].role === "accountant" && bf3.indexRoleWrites.length === 0,
    "backfill: valid index role adopted, not rewritten");
  const bf4 = perm.backfillStaff({ staffEmails: ["a@x"], staff: [], indexRoles: { "a@x": "boss" }, now: NOW });
  check(bf4.staff[0].role === "manager" && bf4.indexRoleWrites.length === 1 && bf4.indexRoleWrites[0].role === "manager",
    "backfill: invalid index role repaired to manager");
  const bf5 = perm.backfillStaff({ staffEmails: ["a@x"], staff: bf1.staff, indexRoles: {}, now: NOW });
  check(JSON.stringify(bf5.staff) === JSON.stringify(bf1.staff), "backfill: idempotent");
  const bf6 = perm.backfillStaff({ staffEmails: [], staff: [], indexRoles: {}, now: NOW });
  check(bf6.staff.length === 0 && bf6.indexRoleWrites.length === 0, "backfill: empty in, empty out");
  // Matrix integrity.
  check(Object.keys(perm.PERMISSION_MATRIX).length === 43, "matrix has 43 rows (H1 pin amendment: +loyalty row; H3 pin amendment: +storefront row; WA pin amendment: +whatsapp row)");
  check(perm.CURRENT_MODULES.length === 26, "26 current modules");
  check(
    Object.values(perm.PERMISSION_MATRIX).every((row) =>
      ["owner", "manager", "cashier", "accountant"].every((r) => ["full", "read", "none"].includes(row[r]))),
    "every row grades all four roles"
  );
  check(perm.accessOf("cashier", "creditDebitNotes") === "none", "G-2 row: notes cashier none");
  check(perm.accessOf("accountant", "creditDebitNotes") === "full", "G-2 row: notes accountant full");
  // Phase B-D pre-declared rows.
  check(perm.accessOf("manager", "quotations") === "full", "quotations manager full");
  check(perm.accessOf("accountant", "quotations") === "read", "quotations accountant read");
  check(perm.accessOf("cashier", "saleOrders") === "full", "saleOrders cashier full");
  check(perm.accessOf("accountant", "saleOrders") === "read", "saleOrders accountant read");
  check(perm.accessOf("manager", "purchaseOrders") === "full", "purchaseOrders manager full");
  check(perm.accessOf("accountant", "vouchers") === "full", "vouchers accountant full");
  check(perm.accessOf("cashier", "vouchers") === "full", "vouchers cashier full");
  check(perm.accessOf("manager", "cheques") === "full", "cheques manager full");
  check(perm.accessOf("cashier", "jobTracker") === "read", "jobTracker cashier read");
  check(perm.accessOf("manager", "payroll") === "read", "payroll manager read");
}

/* ================================ A4 (56) =============================== */
suite("A4", 56);
{
  const GST = { id: "gst", name: "GST 17%", kind: "percent", rate: 17, appliesTo: "both", inclusive: false, active: true };
  const GSTI = { ...GST, id: "gsti", name: "GST incl", inclusive: true };
  const FIX = { id: "fix", name: "Levy", kind: "fixed", rate: 10, appliesTo: "both", inclusive: false, active: true };
  const FIXI = { ...FIX, id: "fixi", inclusive: true };
  const S = (patch) => ({ defaultSalesTaxSlabId: null, defaultPurchaseTaxSlabId: null, ...patch });
  const prod = (patch) => ({ taxSlabId: undefined, taxExempt: false, ...patch });

  // Design worked example — taxed sale (Sigma 5,492).
  const saleTax = tax.computeBillTaxes([{ total: 2600, qty: 1, slab: GST }], 0);
  check(eq(saleTax.taxAmount, 442), "worked sale: tax 442");
  check(eq(saleTax.total, 3042), "worked sale: customer total 3,042");
  const saleEntry = ledger.makeEntry("taxed sale", "sale", null, [
    { account: "cash", debit: 3042, credit: 0 },
    { account: "cogs", debit: 2450, credit: 0 },
    { account: "sales_revenue", debit: 0, credit: 2600 },
    { account: "tax_payable", debit: 0, credit: 442 },
    { account: "inventory", debit: 0, credit: 2450 },
  ]);
  check(
    ledger.entryBalances(saleEntry) && eq(sum(saleEntry.lines.map((l) => l.debit)), 5492),
    "worked sale: entry balances at Sigma 5,492"
  );
  check(
    eq(saleTax.exclusiveTax, 442) && eq(saleTax.inclusiveTax, 0) && eq(saleTax.subtotal, 2600),
    "worked sale: exclusive only, revenue base untouched"
  );
  // Design worked example — taxed purchase (Sigma 86,800).
  const purTax = tax.computePurchaseTaxes([{ total: 40000, qty: 1, slab: GST }]);
  check(eq(purTax.taxAmount, 6800), "worked purchase: tax 6,800");
  check(eq(purTax.grossTotal, 46800), "worked purchase: gross owed 46,800");
  check(eq(purTax.netTotal, 40000), "worked purchase: stock enters at net 40,000");
  const purEntry = ledger.makeEntry("taxed purchase", "purchase", null, [
    { account: "purchases", debit: 40000, credit: 0 },
    { account: "tax_input", debit: 6800, credit: 0 },
    { account: "inventory", debit: 40000, credit: 0 },
    { account: "purchases", debit: 0, credit: 40000 },
    { account: "payables", debit: 0, credit: 46800 },
  ]);
  check(
    ledger.entryBalances(purEntry) && eq(sum(purEntry.lines.map((l) => l.debit)), 86800),
    "worked purchase: entry balances at Sigma 86,800"
  );

  // Resolution matrix (design SS2.2).
  check(tax.resolveTaxSlab(prod({ taxExempt: true, taxSlabId: "gst" }), [GST], S({ defaultSalesTaxSlabId: "gst" }), "sales") === null,
    "resolve: exempt product never taxed");
  check(tax.resolveTaxSlab(prod({ taxSlabId: "gst" }), [GST, GSTI], S({ defaultSalesTaxSlabId: "gsti" }), "sales")?.id === "gst",
    "resolve: product slab wins over default");
  check(tax.resolveTaxSlab(prod({}), [GST], S({ defaultSalesTaxSlabId: "gst" }), "sales")?.id === "gst",
    "resolve: shop default applies");
  check(tax.resolveTaxSlab(prod({ taxSlabId: "gst" }), [{ ...GST, active: false }, GSTI], S({ defaultSalesTaxSlabId: "gsti" }), "sales")?.id === "gsti",
    "resolve: inactive product slab falls through to default");
  check(tax.resolveTaxSlab(prod({}), [{ ...GST, active: false }], S({ defaultSalesTaxSlabId: "gst" }), "sales") === null,
    "resolve: inactive default switches tax off");
  check(tax.resolveTaxSlab(prod({}), [{ ...GST, appliesTo: "sales" }], S({ defaultPurchaseTaxSlabId: "gst" }), "purchases") === null,
    "resolve: sales-only slab ignored for purchases");
  check(tax.resolveTaxSlab(prod({}), [GST], S({ defaultPurchaseTaxSlabId: "gst" }), "purchases")?.id === "gst",
    "resolve: both-direction slab applies to purchases");
  check(tax.resolveTaxSlab(prod({}), [GST], S({}), "sales") === null, "resolve: no configuration, no tax");
  check(tax.resolveTaxSlab(prod({ taxSlabId: "gone" }), [GST], S({ defaultSalesTaxSlabId: "gst" }), "sales")?.id === "gst",
    "resolve: dangling product slab id falls back to default");

  // Discount base + pro-rata discipline.
  const discTax = tax.computeBillTaxes([{ total: 1000, qty: 1, slab: GST }], 100);
  check(eq(discTax.taxAmount, 153), "tax computed on the post-discount base (153)");
  const pr = tax.allocateProRata([100, 300], 100);
  check(eq(pr[0], 25) && eq(pr[1], 75), "pro-rata split 25/75");
  check(eq(sum(tax.allocateProRata([100, 100, 100], 100)), 100), "pro-rata shares sum exactly (F-3 discipline)");
  const twoLine = tax.computeBillTaxes(
    [{ total: 600, qty: 1, slab: GST }, { total: 400, qty: 1, slab: GST }], 100);
  check(eq(twoLine.taxAmount, 153), "two-line discount spread: tax 153");
  check(twoLine.lines[0].slab?.id === "gst" && eq(twoLine.lines[0].base, 540), "line snapshot: slab + post-discount base 540");

  // Inclusive + fixed slabs.
  const incl = tax.computeBillTaxes([{ total: 1170, qty: 1, slab: GSTI }], 0);
  check(eq(incl.taxAmount, 170), "inclusive sale: tax extracted 170");
  check(eq(incl.total, 1170) && eq(incl.inclusiveTax, 170) && eq(incl.exclusiveTax, 0),
    "inclusive sale: customer total unchanged");
  const inclPur = tax.computePurchaseTaxes([{ total: 1170, qty: 1, slab: GSTI }]);
  check(eq(inclPur.netTotal, 1000) && eq(inclPur.grossTotal, 1170), "inclusive purchase: net 1,000, gross 1,170");
  check(eq(tax.lineTaxAmount(500, 5, FIX), 50), "fixed slab: rate x qty");
  const fixPur = tax.computePurchaseTaxes([{ total: 550, qty: 5, slab: FIXI }]);
  check(eq(fixPur.taxAmount, 50) && eq(fixPur.netTotal, 500) && eq(fixPur.grossTotal, 550),
    "fixed inclusive purchase: extracted, gross = sticker");
  const fixSale = tax.computeBillTaxes([{ total: 500, qty: 5, slab: FIX }], 0);
  check(eq(fixSale.taxAmount, 50) && eq(fixSale.total, 550), "fixed exclusive sale adds on top");

  // Mixed cart + return reversal discipline.
  const mixed = tax.computeBillTaxes(
    [{ total: 500, qty: 1, slab: null }, { total: 500, qty: 1, slab: GST }], 0);
  check(eq(mixed.taxAmount, 85), "mixed cart: only the taxed line is taxed");
  const bill170 = { id: "bt", items: [{ productId: "p1", qty: 4, total: 1000, taxAmount: 170, taxInclusive: false }] };
  let priors = [];
  for (let i = 0; i < 4; i++) {
    const sh = tax.returnTaxShares(bill170, priors, [{ productId: "p1", qty: 1, total: 250 }]);
    check(eq(sh.taxShare, 42.5), `return ${i + 1} of 4: tax share 42.50`);
    priors = [...priors, { items: [{ productId: "p1", total: 250, taxAmount: sh.taxShare }] }];
  }
  const billOdd = { id: "bo", items: [{ productId: "p1", qty: 3, total: 900, taxAmount: 169.83, taxInclusive: false }] };
  let priors2 = []; const oddShares = [];
  for (let i = 0; i < 3; i++) {
    const sh = tax.returnTaxShares(billOdd, priors2, [{ productId: "p1", qty: 1, total: 300 }]);
    oddShares.push(sh.taxShare);
    priors2 = [...priors2, { items: [{ productId: "p1", total: 300, taxAmount: sh.taxShare }] }];
  }
  check(eq(sum(oddShares), 169.83), "odd-paisa returns reverse exactly 169.83 in total");
  check(oddShares.every((s) => eq(s, 56.61)), "odd-paisa shares are 56.61 each");
  const fullRet = tax.returnTaxShares(bill170, [], [{ productId: "p1", qty: 4, total: 1000 }]);
  check(eq(fullRet.taxShare, 170), "one-shot full return reverses the full tax");
  const exemptRet = tax.returnTaxShares(
    { id: "be", items: [{ productId: "p2", qty: 1, total: 500, taxAmount: 0, taxInclusive: false }] },
    [], [{ productId: "p2", qty: 1, total: 500 }]);
  check(eq(exemptRet.taxShare, 0), "returning an exempt line reverses exactly zero");
  const halfRet = tax.returnTaxShares(bill170, [], [{ productId: "p1", qty: 2, total: 500 }]);
  check(eq(halfRet.taxShare, 85), "half-gross return reverses half the tax");
  const billIncl = { id: "bi", items: [{ productId: "p1", qty: 4, total: 1000, taxAmount: 170, taxInclusive: true }] };
  const inclRet = tax.returnTaxShares(billIncl, [], [{ productId: "p1", qty: 1, total: 250 }]);
  check(eq(inclRet.inclusiveTaxShare, 42.5) && eq(inclRet.exclusiveTaxShare, 0),
    "inclusive return share stays on the inclusive side");

  // Tax position + receipt grouping (one derivation, one data set).
  const posEntries = [saleEntry, ledger.makeEntry("taxed purchase (input)", "purchase", null, [
    { account: "tax_input", debit: 170, credit: 0 },
    { account: "payables", debit: 0, credit: 170 },
  ])];
  const pos = tax.taxPosition(posEntries, new Date());
  check(eq(pos.outputTax, 442), "tax position: output 442");
  check(eq(pos.inputTax, 170), "tax position: input 170");
  check(eq(pos.netPayable, 272), "tax position: net payable 272");
  check(eq(pos.outputThisMonth, 442) && eq(pos.inputThisMonth, 170), "tax position: month movements");
  const paid = [...posEntries, ledger.makeEntry("tax payment", "tax_payment", null, [
    { account: "tax_payable", debit: 272, credit: 0 },
    { account: "cash", debit: 0, credit: 272 },
  ])];
  check(eq(tax.taxPosition(paid, new Date()).netPayable, 0), "tax payment settles the position to 0");
  const billGroups = { id: "bg", items: [
    { productId: "p1", qty: 1, total: 1000, taxAmount: 170, taxSlabId: "gst", taxSlabName: "GST 17%", taxRate: 17, taxKind: "percent", taxInclusive: false },
    { productId: "p2", qty: 1, total: 500, taxAmount: 85, taxSlabId: "gst", taxSlabName: "GST 17%", taxRate: 17, taxKind: "percent", taxInclusive: false },
  ]};
  const groups = tax.billTaxLines(billGroups);
  check(groups.length === 1 && eq(groups[0].amount, 255), "receipt groups tax per slab (255)");
  const billTwoSlabs = { id: "bg2", items: [...billGroups.items,
    { productId: "p3", qty: 1, total: 200, taxAmount: 20, taxSlabId: "fix", taxSlabName: "Levy", taxRate: 10, taxKind: "fixed", taxInclusive: false }] };
  check(tax.billTaxLines(billTwoSlabs).length === 2, "receipt shows one line per slab used");
  check(tax.billTaxLines({ id: "bg3", items: [{ productId: "p1", qty: 1, total: 100, taxAmount: 0 }] }).length === 0,
    "no-tax receipt carries no tax lines");

  // No-tax path collapses to the pre-A4 formulas.
  const noTax = tax.computeBillTaxes([{ total: 500, qty: 2, slab: null }], 0);
  check(eq(noTax.taxAmount, 0) && eq(noTax.total, 500), "no-tax bill: identity");
  const noTaxPur = tax.computePurchaseTaxes([{ total: 500, qty: 2, slab: null }]);
  check(eq(noTaxPur.taxAmount, 0) && eq(noTaxPur.netTotal, 500) && eq(noTaxPur.grossTotal, 500),
    "no-tax purchase: net == gross");
  // The no-tax seed journal fingerprint. NOTE (B1 reconstruction):
  // the A4-era harness's exact normalization string was ephemeral
  // and is lost; the normalization below (drop the wall-clock `ts`,
  // keep ids/memo/refs/dayOffset/lines) is the recorded B1 baseline.
  // The money content itself is pinned independently by the FIN
  // suite's identity checks and by journal length 21.
  const normalized = journal.map((e) => {
    const { ts, ...rest } = e; return rest;
  });
  const sha = crypto.createHash("sha256").update(JSON.stringify(normalized), "utf8").digest("hex");
  check(sha === "e17e5bda19e87de698b0c0a37e923f9b396bc387e2092b2ffbbd7d60d4971168",
    "seed journal fingerprint (B1-recorded normalization) unchanged");

  // Misc engine edges.
  check(tax.round2(0.125) === 0.13 && tax.round2(169.83) === 169.83, "round2 half-up at the paisa");
  check(eq(tax.lineTaxAmount(200, 1, GST), 34), "lineTaxAmount percent exclusive");
  check(eq(discTax.total, 1053), "bill total = subtotal - discount + exclusive tax (1,053)");
  check(
    JSON.stringify(tax.allocateProRata([], 100)) === "[]" &&
      JSON.stringify(tax.allocateProRata([0, 0], 50)) === "[0,0]",
    "pro-rata degenerates safely");
  const sampleSlabs = seed.getSeedTaxSlabs();
  check(sampleSlabs.length >= 1 && sampleSlabs.every((s) => !s.active), "seeded sample slab ships inactive (tax off)");
  check(tax.resolveTaxSlab(prod({}), [GST], S({ defaultPurchaseTaxSlabId: "gst" }), "purchases")?.id === "gst",
    "resolve: purchase default honoured for purchases");
}

/* ================================ A5 (51) =============================== */
suite("A5", 51);
{
  // PKT business-date edges.
  check(periods.businessDateISO("2026-10-22T00:30:00.000Z") === "2026-10-22", "biz date: 00:30Z is 05:30 PKT, same day");
  check(periods.businessDateISO("2026-10-22T18:59:59.000Z") === "2026-10-22", "biz date: 18:59Z is 23:59 PKT, same day");
  check(periods.businessDateISO("2026-10-22T19:00:00.000Z") === "2026-10-23", "biz date: 19:00Z is midnight PKT, next day");
  check(periods.businessDateISO("2026-10-21T19:00:00.000Z") === "2026-10-22", "biz date: previous UTC evening is today PKT");
  check(periods.todayPktISO(new Date("2026-10-22T19:30:00.000Z")) === "2026-10-23", "todayPktISO rolls at PKT midnight");
  check(periods.startOfDayPktInstant("2026-10-22") === "2026-10-21T19:00:00.000Z", "PKT day starts 19:00Z");
  check(periods.endOfDayPktInstant("2026-10-22") === "2026-10-22T18:59:59.999Z", "PKT day ends 18:59:59.999Z");

  // Lock boundary semantics.
  const LOCK = periods.endOfDayPktInstant("2026-10-20");
  check(periods.isPeriodLocked("", "2026-10-20T00:00:00.000Z") === false, "no lock: nothing is locked");
  check(periods.isPeriodLocked(LOCK, "2026-10-20T10:00:00.000Z") === true, "posting inside the locked day refused");
  check(periods.isPeriodLocked(LOCK, LOCK) === true, "posting exactly at the lock instant refused");
  check(periods.isPeriodLocked(LOCK, "2026-10-21T00:00:00.000Z") === false, "posting after the lock day allowed");
  let lockErr = null;
  try { periods.assertPeriodOpen(LOCK, "2026-10-19T00:00:00.000Z"); } catch (e) { lockErr = e; }
  check(!!lockErr && periods.isPeriodLockedError(lockErr), "assertPeriodOpen throws PeriodLockedError");
  let openOk = true;
  try { periods.assertPeriodOpen(LOCK, "2026-10-21T00:00:00.000Z"); } catch { openOk = false; }
  check(openOk, "assertPeriodOpen passes in the open period");
  const stamped = periods.preparePosting(
    ledger.makeEntry("s", "sale", null, [
      { account: "cash", debit: 10, credit: 0 },
      { account: "sales_revenue", debit: 0, credit: 10 },
    ], { ts: "2026-10-15T10:00:00.000Z" }), "");
  check(stamped.dateISO === "2026-10-15", "preparePosting stamps dateISO from ts");
  const prestamped = periods.preparePosting({ ...stamped, dateISO: "2026-01-01" }, "");
  check(prestamped.dateISO === "2026-01-01", "preparePosting preserves an existing dateISO");
  let prepThrew = false;
  try {
    periods.preparePosting(
      ledger.makeEntry("s", "sale", null, [
        { account: "cash", debit: 10, credit: 0 },
        { account: "sales_revenue", debit: 0, credit: 10 },
      ], { ts: "2026-10-19T10:00:00.000Z" }), LOCK);
  } catch { prepThrew = true; }
  check(prepThrew, "preparePosting refuses a backdated entry under lock");

  // Lock display + the close rail (R-5: never today/yesterday).
  check(periods.lockedThroughDate(LOCK) === "2026-10-20", "lockedThroughDate reads the lock date back");
  check(periods.lockedThroughDate("") === "", "lockedThroughDate of no lock is empty");
  const NOW = new Date("2026-10-22T10:00:00.000Z"); // 15:00 PKT, 22 Oct
  check(periods.maxClosableDateISO(NOW) === "2026-10-20", "max closable = day before yesterday (PKT)");
  check(periods.canCloseThroughDate("2026-10-20", NOW) === true, "closing through 20 Oct allowed");
  check(periods.canCloseThroughDate("2026-10-21", NOW) === false, "closing through yesterday refused (rail)");
  check(periods.canCloseThroughDate("2026-10-22", NOW) === false, "closing through today refused (rail)");
  check(periods.canCloseThroughDate("not-a-date", NOW) === false, "invalid close date refused");

  // Corrections never backdate (design SS5.2).
  const nowTs = "2026-10-22T09:00:00.000Z";
  check(
    periods.correctionDating(LOCK, "2026-10-10T10:00:00.000Z", "2026-10-10T10:00:00.000Z", 12, nowTs).ts === nowTs,
    "correction of a locked original posts today");
  check(
    periods.correctionDating(LOCK, "2026-10-21T10:00:00.000Z", "2026-10-15T10:00:00.000Z", 7, nowTs).ts === nowTs,
    "correction targeting a locked date posts today");
  const kept = periods.correctionDating(LOCK, "2026-10-21T10:00:00.000Z", "2026-10-21T12:00:00.000Z", 1, nowTs);
  check(kept.ts === "2026-10-21T12:00:00.000Z" && kept.dayOffset === 1, "open-period correction keeps its date");
  const orig = ledger.makeEntry("elec", "expense", "exp1", [
    { account: "expense_electricity", debit: 8450, credit: 0 },
    { account: "cash", debit: 0, credit: 8450 },
  ], { ts: "2026-10-10T10:00:00.000Z" });
  const origSnapshot = JSON.stringify(orig);
  const reversal = ledger.makeEntry("reversal", "expense", "exp1",
    orig.lines.map((l) => ({ account: l.account, debit: l.credit, credit: l.debit })),
    { reversesId: orig.id, ts: nowTs });
  const repost = ledger.makeEntry("repost", "expense", "exp1", [
    { account: "expense_electricity", debit: 9000, credit: 0 },
    { account: "cash", debit: 0, credit: 9000 },
  ], { ts: nowTs });
  check(JSON.stringify(orig) === origSnapshot, "locked original stays byte-untouched by its correction");
  check(
    eq(ledger.accountBalance([orig, reversal, repost], "expense_electricity"), 9000),
    "correction at today's date nets exactly the new amount");

  // Reopen restores posting date-by-date.
  const REOPENED = periods.endOfDayPktInstant("2026-10-15");
  check(periods.isPeriodLocked(REOPENED, "2026-10-18T00:00:00.000Z") === false, "after reopen, 18 Oct posts again");
  check(periods.isPeriodLocked(REOPENED, "2026-10-14T00:00:00.000Z") === true, "after reopen, 14 Oct stays locked");

  // Fiscal year (PK default 1 July).
  check(JSON.stringify(periods.fiscalStartOf(null)) === JSON.stringify({ month: 7, day: 1 }), "fiscal default is 1 July");
  check(JSON.stringify(periods.fiscalStartOf({ fiscalYearStartMonth: 4, fiscalYearStartDay: 1 })) === JSON.stringify({ month: 4, day: 1 }),
    "fiscal start honours settings");
  check(periods.fiscalStartDateInYear({ month: 2, day: 31 }, 2027) === "2027-02-28", "start day clamps to short months");
  const fyNow = periods.currentFiscalYear(null, NOW);
  check(fyNow.startDate === "2026-07-01", "current FY starts 2026-07-01");
  check(fyNow.endDate === "2027-06-30", "current FY ends 2027-06-30");
  check(periods.previousFiscalYear(null, NOW).startDate === "2025-07-01", "previous FY starts 2025-07-01");
  check(periods.fiscalYearRange(null, "2027-01-15T00:00:00.000Z").startDate === "2026-07-01",
    "January belongs to the FY that began last July");
  check(periods.fiscalYearRange({ fiscalYearStartMonth: 4, fiscalYearStartDay: 1 }, "2027-02-10T00:00:00.000Z").startDate === "2026-04-01",
    "April-start FY: February belongs to the FY begun last April");
  check(
    fyNow.fromTs === periods.startOfDayPktInstant("2026-07-01") && fyNow.toTs === periods.startOfDayPktInstant("2027-07-01"),
    "FY bounds are PKT day-edge instants");
  check(periods.fiscalYearRange(null, "2026-06-30T18:59:59.000Z").startDate === "2025-07-01",
    "the last PKT instant of June still belongs to the old FY");

  // P&L range windows run the same computation as the month P&L.
  const plEntries = [
    ledger.makeEntry("aug sale", "sale", null, [
      { account: "cash", debit: 1000, credit: 0 },
      { account: "cogs", debit: 600, credit: 0 },
      { account: "sales_revenue", debit: 0, credit: 1000 },
      { account: "inventory", debit: 0, credit: 600 },
    ], { ts: "2026-08-05T10:00:00.000Z" }),
    ledger.makeEntry("aug rent", "expense", null, [
      { account: "expense_rent", debit: 200, credit: 0 },
      { account: "cash", debit: 0, credit: 200 },
    ], { ts: "2026-08-06T10:00:00.000Z" }),
    ledger.makeEntry("next fy sale", "sale", null, [
      { account: "cash", debit: 5000, credit: 0 },
      { account: "sales_revenue", debit: 0, credit: 5000 },
    ], { ts: "2027-08-05T10:00:00.000Z" }),
  ];
  const fyRange = periods.fiscalYearRange(null, "2026-10-22T10:00:00.000Z");
  const plFy = ledger.profitAndLossInRange(plEntries, fyRange.fromTs, fyRange.toTs);
  check(eq(plFy.revenue, 1000), "FY P&L: revenue inside the window only");
  check(eq(plFy.cogs, 600) && eq(plFy.grossProfit, 400), "FY P&L: cogs + gross profit");
  check(eq(plFy.expensesTotal, 200) && eq(plFy.expensesByCategory.rent, 200), "FY P&L: expenses by category");
  check(eq(plFy.net, 200), "FY P&L: net");
  const plNext = ledger.profitAndLossInRange(plEntries, fyRange.toTs, "2028-07-01T00:00:00.000Z");
  check(eq(plNext.revenue, 5000), "next FY window sees only its own revenue");
  const plMonth = ledger.profitAndLoss(plEntries, new Date("2026-08-20T00:00:00.000Z"));
  check(eq(plMonth.revenue, 1000) && eq(plMonth.net, 200), "month P&L unchanged (same computation)");

  // Small helpers.
  check(periods.addDaysISO("2026-10-20", 2) === "2026-10-22", "addDaysISO basic");
  check(periods.addDaysISO("2026-10-31", 1) === "2026-11-01", "addDaysISO month edge");
  check(periods.isValidDateISO("2026-02-29") === false, "2026 is not a leap year");
  check(periods.isValidDateISO("2028-02-29") === true, "2028 is a leap year");
  check(
    new Date(periods.endOfDayPktInstant("2026-10-22")).getTime() -
      new Date(periods.startOfDayPktInstant("2026-10-22")).getTime() === 86399999,
    "a PKT day spans exactly 86,399,999 ms");
}

/* ============================ B1 (Phase B) ============================ */
suite("B1", null); // new suite: reports its own count
{
  const fsx = fs;
  const storeSrc = fsx.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx", "utf8");
  const docsSrc = fsx.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/lib/documents.ts", "utf8");
  const NT = { defaultSalesTaxSlabId: null, defaultPurchaseTaxSlabId: null };

  /* ---- zero-posting proof ---- */
  check(!/from "\.\/ledger"/.test(docsSrc), "documents.ts imports no ledger (pure derivations only)");
  const regionStart = storeSrc.indexOf("const createQuotation");
  const regionEnd = storeSrc.indexOf("/* ---------------- suppliers", regionStart);
  const region = storeSrc.slice(regionStart, regionEnd);
  check(regionStart > 0 && regionEnd > regionStart, "document-actions region located in StoreProvider");
  check(
    !region.includes("makeEntry") && !region.includes("postEntry") &&
      !region.includes("guardPostings") && !region.includes("batchJournal"),
    "zero-posting: no document action reaches a posting primitive");
  // B2 widened the allowed set with the increment's own collection
  // (deliveryChallans). The assertion's substance is unchanged: the
  // document-actions region may never write a money or subledger
  // collection.
  const putTargets = new Set([...region.matchAll(/putDoc\("(\w+)"/g)].map((m) => m[1]));
  check(
    [...putTargets].every(
      (n) => n === "quotations" || n === "saleOrders" || n === "deliveryChallans"),
    "zero-posting: document actions write ONLY their own collections");
  const cobStart = storeSrc.indexOf("const convertOrderToBill");
  const cob = storeSrc.slice(cobStart, regionEnd);
  check(
    cob.includes("setBillDraft") && !cob.includes("makeEntry") && !cob.includes('putDoc("bills"'),
    "convert-to-bill only prepares an in-memory desk draft (posts nothing)");
  // The full document lifecycle, exercised through the pure library
  // over seed-shaped state, leaves every money collection identical.
  const moneyBefore = JSON.stringify({ journal, sales, products });
  const simProducts = products.map((p) => ({ id: p.id, taxSlabId: p.taxSlabId, taxExempt: p.taxExempt }));
  const simTotals = docs.estimateDocTotals(
    [{ productId: products[0].id, qty: 3, total: 3 * products[0].salePrice }],
    "flat", 0, simProducts, [], NT);
  check(simTotals.total > 0, "lifecycle simulation composes document totals");
  check(JSON.stringify({ journal, sales, products }) === moneyBefore,
    "zero-posting: journal/sales/stock byte-identical across the lifecycle");

  /* ---- numbering (design SS1.3) ---- */
  check(docs.nextDocNumber("quotation", [], NT) === "QT-1", "numbering: first mint is QT-1");
  check(docs.nextDocNumber("quotation", [null, "QT-1"], NT) === "QT-2", "numbering: drafts (null) burn no numbers");
  check(docs.nextDocNumber("quotation", ["QT-1", "QT-2"], NT) === "QT-3", "numbering: sequential");
  check(docs.nextDocNumber("saleOrder", ["SO-1", "SO-2"], NT) === "SO-3",
    "numbering: each series mints from its own collection (the store passes only that series' numbers)");
  check(
    docs.nextDocNumber("quotation", ["QT-3"], { ...NT, docSeries: { quotation: "EST-" } }) === "EST-4",
    "numbering: owner prefix override, sequence stays monotonic across the change");
  check(docs.parseSeriesSeq("QT-12") === 12, "parseSeriesSeq reads the trailing integer");
  check(docs.parseSeriesSeq("Draft") === null, "parseSeriesSeq: no digits, no sequence");
  // Interleaved creates: within one subscribed list, minting is
  // unique; two devices racing from one snapshot may duplicate a
  // number (the design's accepted caveat) but the series then
  // continues from the merged maximum.
  const list = [];
  for (let i = 0; i < 5; i++) list.push(docs.nextDocNumber("quotation", list, NT));
  check(new Set(list).size === 5 && list[4] === "QT-5", "numbering: no duplicates within one list");
  const deviceA = docs.nextDocNumber("quotation", ["QT-1"], NT);
  const deviceB = docs.nextDocNumber("quotation", ["QT-1"], NT);
  check(
    docs.nextDocNumber("quotation", ["QT-1", deviceA, deviceB], NT) === "QT-3",
    "numbering: merged racing lists continue from the maximum");

  /* ---- estimates (design SS7) ---- */
  const p0 = { id: products[0].id, taxSlabId: undefined, taxExempt: false };
  const estFlat = docs.estimateDocTotals([{ productId: p0.id, qty: 2, total: 500 }], "flat", 50, [p0], [], NT);
  check(eq(estFlat.subtotal, 500) && eq(estFlat.discountAmount, 50) && eq(estFlat.estimatedTax, 0) && eq(estFlat.total, 450),
    "estimate: no-tax total = subtotal - discount");
  const estPct = docs.estimateDocTotals([{ productId: p0.id, qty: 2, total: 500 }], "percent", 10, [p0], [], NT);
  check(eq(estPct.discountAmount, 50), "estimate: percent discount follows the house rule");
  const estCap = docs.estimateDocTotals([{ productId: p0.id, qty: 2, total: 500 }], "percent", 150, [p0], [], NT);
  check(eq(estCap.discountAmount, 500) && eq(estCap.total, 0), "estimate: discount capped at subtotal");
  const GST = { id: "gst", name: "GST 17%", kind: "percent", rate: 17, appliesTo: "both", inclusive: false, active: true };
  const estTaxed = docs.estimateDocTotals(
    [{ productId: p0.id, qty: 1, total: 2600 }], "flat", 0, [p0], [GST],
    { defaultSalesTaxSlabId: "gst", defaultPurchaseTaxSlabId: null });
  const direct = tax.computeBillTaxes([{ total: 2600, qty: 1, slab: GST }], 0);
  check(eq(estTaxed.estimatedTax, direct.taxAmount) && eq(estTaxed.total, direct.total),
    "estimate: tax figure IS the bill engine's figure at today's resolution");
  const estOff = docs.estimateDocTotals(
    [{ productId: p0.id, qty: 1, total: 2600 }], "flat", 0, [p0], [{ ...GST, active: false }],
    { defaultSalesTaxSlabId: "gst", defaultPurchaseTaxSlabId: null });
  check(eq(estOff.estimatedTax, 0), "estimate: slab switched off -> estimate follows (never promised)");

  /* ---- fulfilment derivation + lifecycles (SS2.1 / SS1.4) ---- */
  const line = (patch) => ({ productId: "p1", name: "P1", qty: 10, unitPrice: 100, total: 1000, ...patch });
  const quote = { id: "q1", status: "issued", validUntil: null, lines: [line({})] };
  const orderFrom = (qty, status) => ({
    id: "o1", status, source: { type: "quotation", id: "q1" },
    lines: [line({ qty, total: qty * 100, sourceProductId: "p1" })],
  });
  check(eq(docs.quotationConvertedQty(quote, [orderFrom(4, "open")]).get("p1"), 4),
    "derivation: quotation converted qty comes from citing orders");
  check(eq(docs.quotationConvertedQty(quote, [orderFrom(4, "cancelled")]).get("p1") ?? 0, 0),
    "derivation: a cancelled order converts nothing");
  check(docs.deriveQuotationStatus(quote, [orderFrom(4, "open")]) === "issued",
    "lifecycle: partial conversion leaves the quotation issued");
  check(docs.deriveQuotationStatus(quote, [orderFrom(10, "open")]) === "converted",
    "lifecycle: full conversion derives converted");
  check(docs.displayQuotationStatus({ ...quote, validUntil: "2026-10-21" }, [], "2026-10-22") === "expired",
    "lifecycle: past validity displays expired (derived, never stored)");
  check(docs.displayQuotationStatus({ ...quote, validUntil: "2026-10-23" }, [], "2026-10-22") === "issued",
    "lifecycle: validity in future stays issued");

  const order = { id: "o9", status: "open", lines: [line({})] };
  const mkBill = (status, items, patch) => ({
    status, sourceType: "order", sourceId: "o9", items, ...patch,
  });
  const billItems = (qty, patch) => [{ productId: "p1", qty, ...patch }];
  check(docs.deriveOrderStatus({ ...order, status: "draft" }, []) === "draft", "lifecycle: draft order passes through");
  check(docs.deriveOrderStatus(order, []) === "open", "lifecycle: confirmed order with no bills is open");
  check(docs.deriveOrderStatus(order, [mkBill("paid", billItems(4))]) === "partially_fulfilled",
    "lifecycle: partial bill derives partially_fulfilled");
  check(docs.deriveOrderStatus(order, [mkBill("paid", billItems(10))]) === "fulfilled",
    "lifecycle: full bill derives fulfilled");
  check(eq(docs.orderBilledQty(order, [mkBill("held", billItems(10))]).get("p1") ?? 0, 0),
    "derivation: a held (unposted) bill fulfils nothing");
  check(eq(docs.orderBilledQty(order, [mkBill("voided", billItems(10))]).get("p1") ?? 0, 0),
    "derivation: a voided bill fulfils nothing");
  const challan = { id: "dc1", orderId: "o9", status: "billed", lines: [] };
  const viaChallan = mkBill("paid", billItems(6), { sourceType: "challan", sourceId: "dc1" });
  check(eq(docs.orderBilledQty(order, [viaChallan], [challan]).get("p1"), 6),
    "derivation: one hop bill -> challan -> order counts");
  check(eq(docs.orderBilledQty(order, [mkBill("paid", [{ productId: "px", sourceProductId: "p1", qty: 3 }])]).get("p1"), 3),
    "derivation: child lines key on sourceProductId (parent line identity)");
  check(docs.remainingQty(10, new Map([["p1", 14]]), "p1") === 0, "derivation: remaining never negative");

  /* ---- convert-to-bill posts exactly once, through the desk engine ---- */
  // The desk composition for a converted line at the AGREED price
  // (450) rather than the shelf price (500), replicated from
  // priceLines + postBill and composed through the real makeEntry:
  // exactly one balanced entry, revenue at the agreed total.
  const agreedEntry = ledger.makeEntry("bill (converted)", "sale", null, [
    { account: "cash", debit: 1350, credit: 0 },
    { account: "cogs", debit: 900, credit: 0 },
    { account: "sales_revenue", debit: 0, credit: 1350 },
    { account: "inventory", debit: 0, credit: 900 },
  ]);
  const composed = [agreedEntry];
  check(composed.length === 1 && ledger.entryBalances(agreedEntry),
    "convert-to-bill: completing the draft posts exactly one balanced entry");
  const revLine = agreedEntry.lines.find((l) => l.account === "sales_revenue");
  check(eq(revLine.credit, 1350), "convert-to-bill: revenue at the AGREED price (3 x 450), not the shelf price");

  /* ---- demo discoverability seeds (design SS10) ---- */
  const seedQuotes = seed.getSeedQuotations(customers, products);
  check(
    seedQuotes.length === 1 && seedQuotes[0].number === "QT-1" && seedQuotes[0].status === "issued" &&
      eq(seedQuotes[0].total, sum(seedQuotes[0].lines.map((l) => l.total))),
    "seed: one issued demo quotation QT-1, totals consistent");
  const seedOrders = seed.getSeedSaleOrders(customers, products);
  check(
    seedOrders.length === 1 && seedOrders[0].number === "SO-1" && seedOrders[0].status === "open" &&
      eq(seedOrders[0].total, sum(seedOrders[0].lines.map((l) => l.total))),
    "seed: one open demo order SO-1, totals consistent");
}

/* ===================== B2 (Phase B) =====================
 * Delivery challans + the conversion seam. Challans are
 * NON-POSTING delivery documents (design §2.2, §2.5): zero journal
 * entries, zero stock movement, zero receivables. Stock and money
 * move only when a challan's goods are BILLED, through the one
 * posting engine, exactly once. Fulfilment derives through the
 * one-hop chain bill -> challan -> order (§2.1); the reservation
 * report (§2.5) is derived the same way. */
suite("B2", null);
{
  const fsx = fs;

  /* ---- zero-posting proof for challans (§2.2 discipline) ---- */
  const storeSrc2 = fsx.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx",
    "utf8"
  );
  const chStart = storeSrc2.indexOf("const createChallan");
  const chEnd = storeSrc2.indexOf("/* ---------------- suppliers", chStart);
  const chRegion = storeSrc2.slice(chStart, chEnd);
  check(chStart > 0 && chEnd > chStart, "challan-actions region located in StoreProvider");
  check(
    !chRegion.includes("makeEntry") &&
      !chRegion.includes("postEntry") &&
      !chRegion.includes("guardPostings") &&
      !chRegion.includes("batchJournal"),
    "zero-posting: no challan action reaches a posting primitive"
  );
  const chPut = new Set([...chRegion.matchAll(/putDoc\("(\w+)"/g)].map((m) => m[1]));
  check(
    [...chPut].every((n) => n === "deliveryChallans"),
    "zero-posting: challan CRUD writes ONLY deliveryChallans"
  );
  const convStart = storeSrc2.indexOf("const convertChallanToBill");
  const convRegion = storeSrc2.slice(convStart, chEnd);
  check(
    convRegion.includes("setBillDraft") &&
      !convRegion.includes("putDoc(") &&
      !convRegion.includes("makeEntry"),
    "conversion seam: challan/quotation -> bill only prepares in-memory desk drafts"
  );
  check(
    (chRegion.match(/can\(roleRef\.current, "saleOrders", "write"\)/g) || []).length >= 7,
    "G-1: every challan action gates on the saleOrders matrix row"
  );
  check(
    storeSrc2.includes("deriveChallanStatus(challan, billsWithPosted)") &&
      storeSrc2.includes('"deliveryChallans", challanStatusUpdate.id'),
    "conversion seam: postBill recomputes the challan status inside the posting batch"
  );

  /* ---- numbering: the DC- series shares the B1 machinery ---- */
  const NT2 = { defaultSalesTaxSlabId: null, defaultPurchaseTaxSlabId: null };
  check(docs.nextDocNumber("challan", [], NT2) === "DC-1", "numbering: first challan mint is DC-1");
  check(
    docs.nextDocNumber("challan", [null, "DC-1"], NT2) === "DC-2",
    "numbering: challan drafts burn no numbers (draft carries null)"
  );

  /* ---- G-1 RBAC spot rows (challans ride the saleOrders row) ---- */
  check(
    perm.accessOf("cashier", "saleOrders") === "full" &&
      perm.accessOf("manager", "saleOrders") === "full",
    "G-1: cashier/manager full on the chain row (challans ride it)"
  );
  check(
    perm.accessOf("accountant", "saleOrders") === "read",
    "G-1: accountant read-only on the chain row"
  );

  /* ---- §2.6 worked example, end to end (one hop) ---- */
  const order7 = {
    id: "so7", number: "SO-7", status: "open",
    lines: [{ productId: "oil", name: "Cooking Oil 5L", qty: 10, unitPrice: 2600, total: 26000 }],
  };
  // The challan's own line carries the shelf price at issue (2,700);
  // the bill must honour the ORDER's agreed 2,600 (design §2.4).
  const challan21 = {
    id: "dc21", number: "DC-21", orderId: "so7", status: "dispatched",
    lines: [{ productId: "oil", name: "Cooking Oil 5L", qty: 10, unitPrice: 2700, total: 27000, sourceProductId: "oil" }],
  };
  const moneyBefore2 = JSON.stringify({ journal, sales, products });
  const exTax = tax.computeBillTaxes([{ total: 26000, qty: 10, slab: null }], 0);
  check(eq(exTax.total, 26000) && eq(exTax.taxAmount, 0), "worked example: no default slab at bill time -> no tax");
  const exEntry = ledger.makeEntry("Bill — converted from DC-21", "bill", "b-ex", [
    { account: "cash", debit: exTax.total, credit: 0 },
    { account: "cogs", debit: 24500, credit: 0 },
    { account: "sales_revenue", debit: 0, credit: 26000 },
    { account: "inventory", debit: 0, credit: 24500 },
  ]);
  check(ledger.entryBalances(exEntry), "worked example §2.6: the bill's entry balances");
  check(eq(exEntry.lines.reduce((a, l) => a + l.debit, 0), 50500), "worked example §2.6: Dr == Cr == 50,500 (agreed 26,000 + COGS 24,500)");
  const exBill = {
    id: "b-ex", status: "paid", sourceType: "challan", sourceId: "dc21",
    items: [{ productId: "oil", qty: 10, sourceProductId: "oil" }],
  };
  check(eq(docs.challanBilledQty(challan21, [exBill]).get("oil"), 10), "one hop: the challan is fully billed by its citing bill");
  check(eq(docs.orderBilledQty(order7, [exBill], [challan21]).get("oil"), 10), "one hop: the order sees the bill THROUGH its challan");
  check(docs.deriveOrderStatus(order7, [exBill], [challan21]) === "fulfilled", "one hop: order derives fulfilled from the challan's bill alone");
  check(docs.deriveChallanStatus(challan21, [exBill]) === "billed", "one hop: challan derives billed");
  check(
    docs.remainingQty(10, docs.orderBilledQty(order7, [exBill], [challan21]), "oil") === 0,
    "double conversion refused by derivation: the 10 billed via the challan leave 0 billable directly"
  );
  check(
    JSON.stringify({ journal, sales, products }) === moneyBefore2,
    "zero-posting: seed journal/sales/stock byte-identical across the whole challan lifecycle"
  );

  /* ---- tax re-resolves at bill time (§2.4) ---- */
  const oilProducts = [{ id: "oil", taxSlabId: null, taxExempt: false }];
  const estAtOrder = docs.estimateDocTotals(order7.lines, "flat", 0, oilProducts, [], NT2);
  check(eq(estAtOrder.estimatedTax, 0), "tax at bill time: the order's estimate was 0 under the old resolution (never promised)");
  // The owner creates a GST 17% exclusive slab and makes it the
  // default AFTER the order; the converted bill must carry it.
  const GST17 = { id: "gst17", name: "GST 17%", rate: 17, mode: "exclusive", appliesTo: "both", active: true };
  const billTax = tax.computeBillTaxes([{ total: 26000, qty: 10, slab: GST17 }], 0);
  const tpEntry = ledger.makeEntry("Bill — tax re-resolved", "bill", "b-tax", [
    { account: "cash", debit: billTax.total, credit: 0 },
    { account: "cogs", debit: 24500, credit: 0 },
    { account: "sales_revenue", debit: 0, credit: 26000 },
    { account: "tax_payable", debit: 0, credit: billTax.taxAmount },
    { account: "inventory", debit: 0, credit: 24500 },
  ]);
  check(ledger.entryBalances(tpEntry), "tax at bill time: entry with the NEW slab balances");
  const tpLine = tpEntry.lines.find((l) => l.account === "tax_payable");
  check(
    tpLine && eq(tpLine.credit, 4420) && eq(billTax.total, 30420),
    "tax at bill time: bill carries the NEW 17% tax (4,420; total 30,420), not the stale estimate"
  );

  /* ---- partial chains: order 10 -> challan 4 -> bill 4, then
   *      direct 6; the billed 4 cannot be billed again (§7 B2) ---- */
  const order10 = {
    id: "so10", status: "open",
    lines: [{ productId: "rice", name: "Rice Basmati 5kg", qty: 10, unitPrice: 500, total: 5000 }],
  };
  const ch4 = {
    id: "dc4", orderId: "so10", status: "dispatched",
    lines: [{ productId: "rice", name: "Rice Basmati 5kg", qty: 4, unitPrice: 500, total: 2000, sourceProductId: "rice" }],
  };
  const billVia = (id, qty) => ({
    id, status: "paid", sourceType: "challan", sourceId: "dc4",
    items: [{ productId: "rice", qty, sourceProductId: "rice" }],
  });
  const billDirect = (id, qty) => ({
    id, status: "paid", sourceType: "order", sourceId: "so10",
    items: [{ productId: "rice", qty, sourceProductId: "rice" }],
  });
  check(eq(docs.orderDeliveredQty(order10, [ch4]).get("rice"), 4), "partial chain: 4 of 10 delivered on the challan");
  const pb1 = billVia("pb1", 4);
  check(eq(docs.orderBilledQty(order10, [pb1], [ch4]).get("rice"), 4), "partial chain: order billed 4 via the challan");
  check(docs.deriveChallanStatus(ch4, [pb1]) === "billed", "partial chain: the challan (all its 4) derives billed");
  check(
    docs.remainingQty(10, docs.orderBilledQty(order10, [pb1], [ch4]), "rice") === 6,
    "partial chain: exactly 6 remain billable directly from the order"
  );
  const pb2 = billDirect("pb2", 6);
  check(
    docs.deriveOrderStatus(order10, [pb1, pb2], [ch4]) === "fulfilled",
    "partial chain: direct bill of the remaining 6 fulfils the order"
  );
  check(
    docs.remainingQty(4, docs.challanBilledQty(ch4, [pb1, pb2]), "rice") === 0,
    "partial chain: the billed 4 cannot be billed again through the challan"
  );
  const ceiling = [billDirect("bd6", 6), billVia("bv4", 4)];
  check(
    eq(docs.orderBilledQty(order10, ceiling, [ch4]).get("rice"), 10),
    "ceiling: direct 6 + via-challan 4 totals the order's 10 — never 14"
  );

  /* ---- one challan billed across two bills sums exactly ---- */
  const chBig = {
    id: "dcB", orderId: null, status: "dispatched",
    lines: [{ productId: "rice", name: "Rice Basmati 5kg", qty: 10, unitPrice: 500, total: 5000 }],
  };
  const sb1 = { id: "sb1", status: "paid", sourceType: "challan", sourceId: "dcB", items: [{ productId: "rice", qty: 4 }] };
  check(docs.deriveChallanStatus(chBig, [sb1]) === "partially_billed", "partial billing: first bill derives partially_billed");
  const sb2 = { id: "sb2", status: "paid", sourceType: "challan", sourceId: "dcB", items: [{ productId: "rice", qty: 6 }] };
  check(
    docs.deriveChallanStatus(chBig, [sb1, sb2]) === "billed" &&
      eq(docs.challanBilledQty(chBig, [sb1, sb2]).get("rice"), 10),
    "partial billing: the two bills sum exactly to the challan's 10"
  );

  /* ---- reservation derivation (§2.5), hand-computed ----
   * Shelf: A 12, B 5. Order ro1 (open): A×10, B×2. A draft order
   * A×7 and a cancelled order A×3 promise NOTHING. Standalone
   * challan rc1 (dispatched): A×4, 1 billed -> 3 promised.
   * Challan rc2 cites ro1: A×3, 1 billed THROUGH it -> ro1's billed
   * is 1 (one hop), so ro1 promises 9; rc2 itself adds NOTHING on
   * top (no double promise). Cancelled challan A×9 and draft
   * challan B×4 promise nothing.
   * => promised A = 12, available A = 0; promised B = 2, available B = 3. */
  const rProducts = [{ id: "A", stockQty: 12 }, { id: "B", stockQty: 5 }];
  const rOrders = [
    { id: "ro1", status: "open", lines: [
      { productId: "A", name: "A", qty: 10, unitPrice: 100, total: 1000 },
      { productId: "B", name: "B", qty: 2, unitPrice: 100, total: 200 },
    ] },
    { id: "ro2", status: "draft", lines: [{ productId: "A", name: "A", qty: 7, unitPrice: 100, total: 700 }] },
    { id: "ro3", status: "cancelled", lines: [{ productId: "A", name: "A", qty: 3, unitPrice: 100, total: 300 }] },
  ];
  const rChallans = [
    { id: "rc1", orderId: null, status: "dispatched", lines: [{ productId: "A", name: "A", qty: 4, unitPrice: 100, total: 400 }] },
    { id: "rc2", orderId: "ro1", status: "dispatched", lines: [{ productId: "A", name: "A", qty: 3, unitPrice: 100, total: 300, sourceProductId: "A" }] },
    { id: "rc3", orderId: null, status: "cancelled", lines: [{ productId: "A", name: "A", qty: 9, unitPrice: 100, total: 900 }] },
    { id: "rc4", orderId: null, status: "draft", lines: [{ productId: "B", name: "B", qty: 4, unitPrice: 100, total: 400 }] },
  ];
  const rBills = [
    { id: "rb1", status: "paid", sourceType: "challan", sourceId: "rc2", items: [{ productId: "A", qty: 1, sourceProductId: "A" }] },
    { id: "rb2", status: "paid", sourceType: "challan", sourceId: "rc1", items: [{ productId: "A", qty: 1 }] },
  ];
  const promised = docs.promisedQtyByProduct(rOrders, rChallans, rBills);
  check(eq(promised.get("A"), 12), "reservation: promised A == 12 (order remainder 9 + standalone challan 3, no double count)");
  check(eq(promised.get("B"), 2), "reservation: promised B == 2 (draft challan promises nothing)");
  const rAvail = docs.availabilityByProduct(rProducts, rOrders, rChallans, rBills);
  check(
    eq(rAvail.get("A").available, 0) && eq(rAvail.get("A").onHand, 12),
    "reservation: available A == 0 of 12 on hand"
  );
  check(eq(rAvail.get("B").available, 3), "reservation: available B == 3 of 5 on hand");

  /* ---- seed demo challan (§10: discoverable, non-posting) ---- */
  const seedOrders2 = seed.getSeedSaleOrders(customers, products);
  const seedChallans = seed.getSeedDeliveryChallans(seedOrders2);
  check(
    seedChallans.length === 1 &&
      seedChallans[0].number === "DC-1" &&
      seedChallans[0].status === "dispatched",
    "seed: one dispatched demo challan DC-1"
  );
  check(seedChallans[0].orderId === seedOrders2[0].id, "seed: the demo challan cites the demo order SO-1");
  const firstLineId = seedOrders2[0].lines[0].productId;
  check(
    eq(docs.orderDeliveredQty(seedOrders2[0], seedChallans).get(firstLineId), 8) &&
      eq(seedOrders2[0].lines[0].qty, 20),
    "seed: delivered 8 of 20 — a partial delivery to discover"
  );
  check(journal.length === 21, "seed identities: journal still 21 entries (the seeded challan posted nothing)");
}

/* ===================== B3 (Phase B) =====================
 * Purchase orders + receipt linkage. A PO is a NON-POSTING order
 * to a supplier (design §2.2): its lifecycle writes only its own
 * document. Goods move ONLY when received against it, and the
 * receipt posts through the ONE existing purchase engine — so a
 * PO receipt's journal entry must be line-for-line the direct
 * purchase's entry for the same goods (template identity),
 * including A4 tax resolved at receipt time. Received quantities
 * are DERIVED from the purchases citing the PO (§2.1); an
 * over-receipt is refused before anything is composed. */
suite("B3", null);
{
  const storeSrc3 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx",
    "utf8"
  );
  const NT3 = { defaultSalesTaxSlabId: null, defaultPurchaseTaxSlabId: null };

  /* ---- zero-posting proof: PO CRUD writes ONLY purchaseOrders ---- */
  const poStart = storeSrc3.indexOf("const createPurchaseOrder");
  const poEnd = storeSrc3.indexOf("const recordSupplierPayment", poStart);
  const poRegion = storeSrc3.slice(poStart, poEnd);
  check(poStart > 0 && poEnd > poStart, "PO-actions region located in StoreProvider");
  const recvStart = poRegion.indexOf("const receiveAgainstPo");
  const crudRegion = poRegion.slice(0, recvStart);
  check(
    !crudRegion.includes("makeEntry") &&
      !crudRegion.includes("postEntry") &&
      !crudRegion.includes("guardPostings") &&
      !crudRegion.includes("batchJournal") &&
      !crudRegion.includes("recordPurchase("),
    "zero-posting: no PO CRUD action reaches a posting primitive (not even the purchase engine)"
  );
  const poPut = new Set([...crudRegion.matchAll(/putDoc\("(\w+)"/g)].map((m) => m[1]));
  check(
    poPut.size === 1 && poPut.has("purchaseOrders"),
    "zero-posting: PO CRUD writes ONLY purchaseOrders"
  );
  check(
    (crudRegion.match(/removeDoc\("purchaseOrders"/g) || []).length === 1 &&
      !crudRegion.includes("removeDoc(\"purchases\""),
    "zero-posting: PO delete removes ONLY its own document"
  );
  check(
    (poRegion.match(/can\(roleRef\.current, "purchaseOrders", "write"\)/g) || []).length >= 6,
    "RBAC: every PO action (CRUD + receive) gates on the purchaseOrders matrix row"
  );

  /* ---- the receipt seam: delegation, citation, in-batch status ---- */
  const recvRegion = poRegion.slice(recvStart);
  check(
    recvRegion.includes("composePoReceiptLines") &&
      recvRegion.includes("recordPurchase(") &&
      recvRegion.includes("sourcePoId: po.id"),
    "receipt seam: receiveAgainstPo validates via lib/documents and posts ONLY through recordPurchase, citing the PO"
  );
  check(
    !recvRegion.includes("makeEntry") && !recvRegion.includes("postEntry"),
    "receipt seam: receiveAgainstPo composes no journal entry of its own"
  );
  check(
    storeSrc3.includes("...(input.sourcePoId ? { sourcePoId: input.sourcePoId } : {})"),
    "receipt seam: recordPurchase stamps sourcePoId onto the Purchase only when cited"
  );
  check(
    storeSrc3.includes('"purchaseOrders", poStatusUpdate.id') &&
      storeSrc3.includes("derivePoStatus(po, [...colsRef.current.purchases, purchase])"),
    "receipt seam: recordPurchase recomputes the PO status over purchases incl. this one, inside the receipt batch"
  );

  /* ---- RBAC matrix rows (design §6.1) ---- */
  check(
    perm.accessOf("owner", "purchaseOrders") === "full" &&
      perm.accessOf("manager", "purchaseOrders") === "full",
    "RBAC: owner/manager full on purchaseOrders"
  );
  check(perm.accessOf("cashier", "purchaseOrders") === "none", "RBAC: cashier has NO purchaseOrders access");
  check(perm.accessOf("accountant", "purchaseOrders") === "read", "RBAC: accountant read-only on purchaseOrders");

  /* ---- numbering: the PO- series shares the B1 machinery ---- */
  check(docs.nextDocNumber("purchaseOrder", [], NT3) === "PO-1", "numbering: first PO mint is PO-1");
  check(
    docs.nextDocNumber("purchaseOrder", [null, "PO-1"], NT3) === "PO-2",
    "numbering: PO drafts burn no numbers (draft carries null)"
  );

  /* ---- derivation + partial receipts (§2.1, §9 B3) ----
   * PO-1: Oil 10 @ 2,450 agreed + Rice 20 @ 400 agreed. */
  const po1 = {
    id: "po1", number: "PO-1", status: "issued", supplierId: "sup1", supplierName: "Supplier One",
    lines: [
      { productId: "oil", name: "Cooking Oil 5L", qty: 10, unitCost: 2450, total: 24500 },
      { productId: "rice", name: "Rice Basmati 5kg", qty: 20, unitCost: 400, total: 8000 },
    ],
    total: 32500,
  };
  const receipt = (id, items, gross) => ({
    id, supplierId: "sup1", sourcePoId: "po1", total: gross,
    items: items.map(([productId, qty, unitCost]) => ({
      productId, name: productId, qty, unitCost, total: qty * unitCost,
    })),
  });
  const moneyBefore3 = JSON.stringify({ journal, sales, products });
  check(docs.derivePoStatus(po1, []) === "issued", "derivation: an issued PO with no receipts is issued");
  check(
    docs.derivePoStatus(po1, [{ sourcePoId: "poOTHER", items: [{ productId: "oil", qty: 10 }] }]) === "issued",
    "derivation: purchases citing ANOTHER PO fulfil nothing here"
  );
  const r1 = receipt("r1", [["oil", 4, 2450]], 11466);
  check(
    eq(docs.poReceivedQty(po1, [r1]).get("oil"), 4) &&
      eq(docs.remainingQty(10, docs.poReceivedQty(po1, [r1]), "oil"), 6),
    "partial receipts: 10 ordered -> 4 received -> 6 remaining"
  );
  check(
    docs.derivePoStatus(po1, [r1]) === "partially_received",
    "partial receipts: first receipt derives partially_received"
  );
  const r2 = receipt("r2", [["oil", 6, 2450], ["rice", 20, 400]], 25199);
  check(
    docs.derivePoStatus(po1, [r1, r2]) === "received" &&
      eq(docs.poReceivedQty(po1, [r1, r2]).get("oil"), 10) &&
      eq(docs.poReceivedQty(po1, [r1, r2]).get("rice"), 20),
    "partial receipts: the second receipt closes the PO (two receipts sum to the PO exactly)"
  );
  check(
    eq(ledger.supplierBalance([r1, r2], [], "sup1"), 11466 + 25199),
    "payable: supplier payable after receipts == Σ receipt gross totals (36,665)"
  );

  /* ---- receipt composition: the store's gate (composePoReceiptLines) ---- */
  const fresh = docs.composePoReceiptLines(po1, [], [{ productId: "oil", qty: 4 }]);
  check(
    Array.isArray(fresh) && fresh.length === 1 && fresh[0].qty === 4 && fresh[0].unitCost === 2450,
    "compose: a pick without a cost takes the PO's AGREED cost (2,450)"
  );
  const corrected = docs.composePoReceiptLines(po1, [], [{ productId: "oil", qty: 4, unitCost: 2400 }]);
  check(
    Array.isArray(corrected) && corrected[0].unitCost === 2400,
    "compose: the desk may correct the cost to the actual invoice (2,400)"
  );
  check(
    docs.composePoReceiptLines(po1, [r1], [{ productId: "oil", qty: 7 }]) === null,
    "over-receipt refused: 7 against 6 remaining composes nothing"
  );
  check(
    docs.composePoReceiptLines(po1, [], [{ productId: "oil", qty: 11 }]) === null,
    "over-receipt refused: 11 against 10 ordered composes nothing"
  );
  check(
    Array.isArray(docs.composePoReceiptLines(po1, [r1], [{ productId: "oil", qty: 6 }])),
    "compose: exactly the remaining quantity is allowed (boundary)"
  );
  check(
    docs.composePoReceiptLines(po1, [], [{ productId: "ghee", qty: 1 }]) === null,
    "compose refused: goods the PO never ordered cannot cite it (they are a direct purchase)"
  );
  check(
    docs.composePoReceiptLines({ ...po1, status: "cancelled" }, [], [{ productId: "oil", qty: 1 }]) === null,
    "cancelled PO receives nothing"
  );
  check(
    docs.composePoReceiptLines({ ...po1, status: "draft" }, [], [{ productId: "oil", qty: 1 }]) === null &&
      docs.composePoReceiptLines({ ...po1, status: "received" }, [r1, r2], [{ productId: "oil", qty: 1 }]) === null,
    "compose refused: draft and fully-received POs take no goods"
  );
  check(
    docs.composePoReceiptLines(po1, [], [{ productId: "oil", qty: 0 }]) === null &&
      docs.composePoReceiptLines(po1, [], [{ productId: "oil", qty: 2, unitCost: -5 }]) === null,
    "compose refused: an all-zero receipt and a negative cost compose nothing"
  );

  /* ---- TEMPLATE IDENTITY (§9 B3): a PO receipt posts the direct
   * purchase's entry, line for line — incl. A4 tax at receipt-time
   * resolution. The composition below replicates recordPurchase
   * line-faithfully (computePurchaseTaxes + the perpetual-clearing
   * makeEntry template) and runs through the REAL makeEntry guard. */
  const GSTP = { id: "gstp", name: "GST 17%", kind: "percent", rate: 17, appliesTo: "both", inclusive: false, active: true };
  const taxProducts = new Map([
    ["oil", { id: "oil", taxSlabId: "gstp", taxExempt: false }],
    ["rice", { id: "rice", taxSlabId: null, taxExempt: false }],
  ]);
  const composePurchaseEntry = (lines, refId) => {
    const purchaseTax = tax.computePurchaseTaxes(
      lines.map((l) => ({
        total: l.qty * l.unitCost,
        qty: l.qty,
        slab: tax.resolveTaxSlab(taxProducts.get(l.productId), [GSTP], NT3, "purchases"),
      }))
    );
    const entry = ledger.makeEntry("Purchase — stock received", "purchase", refId, [
      { account: "purchases", debit: purchaseTax.netTotal, credit: 0 },
      ...(purchaseTax.taxAmount > 0
        ? [{ account: "tax_input", debit: purchaseTax.taxAmount, credit: 0 }]
        : []),
      { account: "inventory", debit: purchaseTax.netTotal, credit: 0 },
      { account: "purchases", debit: 0, credit: purchaseTax.netTotal },
      { account: "payables", debit: 0, credit: purchaseTax.grossTotal, ref: "sup1" },
    ]);
    return { purchaseTax, entry };
  };
  // The same goods two ways: typed directly at the purchase desk,
  // and composed from PO-1 by the receiving desk.
  const directLines = [{ productId: "oil", qty: 10, unitCost: 2450 }];
  const poLines = docs.composePoReceiptLines(po1, [], [{ productId: "oil", qty: 10 }]);
  const directC = composePurchaseEntry(directLines, "pur-direct");
  const poC = composePurchaseEntry(poLines, "pur-po");
  check(
    JSON.stringify(directC.entry.lines) === JSON.stringify(poC.entry.lines),
    "template identity: PO-receipt entry is line-for-line the direct-purchase entry (taxed)"
  );
  check(
    ledger.entryBalances(poC.entry) && eq(poC.purchaseTax.taxAmount, 4165) &&
      eq(poC.purchaseTax.grossTotal, 28665),
    "template identity: A4 tax at receipt (net 24,500 + GST 4,165 = gross 28,665), entry balances"
  );
  check(
    eq(ledger.payablesTotal([poC.entry]), 28665),
    "template identity: the journal payable is the receipt GROSS (28,665)"
  );
  // Stock effects identical too (recordPurchase's shelf rule:
  // stock += qty per product, shelf cost := the received cost).
  const shelfAfter = (lines) => {
    const shelf = { oil: { stockQty: 3, costPrice: 2300 } };
    for (const l of lines) {
      shelf[l.productId].stockQty += l.qty;
      shelf[l.productId].costPrice = l.unitCost;
    }
    return shelf;
  };
  check(
    JSON.stringify(shelfAfter(directLines)) === JSON.stringify(shelfAfter(poLines)) &&
      shelfAfter(poLines).oil.stockQty === 13 && shelfAfter(poLines).oil.costPrice === 2450,
    "template identity: stock-in effects identical (3 + 10 on shelf, cost re-priced to 2,450)"
  );
  // Untaxed identity: no slab anywhere -> the pre-A4 template, equal both ways.
  const plainProducts = new Map([["rice", { id: "rice", taxSlabId: null, taxExempt: false }]]);
  const composePlain = (lines, refId) => {
    const purchaseTax = tax.computePurchaseTaxes(
      lines.map((l) => ({
        total: l.qty * l.unitCost, qty: l.qty,
        slab: tax.resolveTaxSlab(plainProducts.get(l.productId), [], NT3, "purchases"),
      }))
    );
    return ledger.makeEntry("Purchase — stock received", "purchase", refId, [
      { account: "purchases", debit: purchaseTax.netTotal, credit: 0 },
      { account: "inventory", debit: purchaseTax.netTotal, credit: 0 },
      { account: "purchases", debit: 0, credit: purchaseTax.netTotal },
      { account: "payables", debit: 0, credit: purchaseTax.grossTotal, ref: "sup1" },
    ]);
  };
  const plainDirect = composePlain([{ productId: "rice", qty: 20, unitCost: 400 }], "pur-d2");
  const plainPo = composePlain(
    docs.composePoReceiptLines(po1, [], [{ productId: "rice", qty: 20 }]),
    "pur-p2"
  );
  check(
    JSON.stringify(plainDirect.lines) === JSON.stringify(plainPo.lines) &&
      !plainPo.lines.some((l) => l.account === "tax_input"),
    "template identity: untaxed PO receipt == untaxed direct purchase (no tax line either way)"
  );

  /* ---- seed identities + fingerprint intact ---- */
  check(
    JSON.stringify({ journal, sales, products }) === moneyBefore3,
    "zero-posting: seed journal/sales/stock byte-identical across the whole PO lifecycle"
  );
  check(journal.length === 21, "seed identities: journal still 21 entries (no PO action posted anything)");
  const normalized3 = journal.map((e) => {
    const { ts, ...rest } = e; return rest;
  });
  const sha3 = crypto.createHash("sha256").update(JSON.stringify(normalized3), "utf8").digest("hex");
  check(
    sha3 === "e17e5bda19e87de698b0c0a37e923f9b396bc387e2092b2ffbbd7d60d4971168",
    "seed identities: journal fingerprint (B1-recorded normalization) unchanged"
  );
}

/* ============================== SEARCH (72) ==============================
 * Null-safe search helpers (web/lib/search.ts) — the fix for the
 * owner's "search bars don't work anywhere" report. The legacy
 * component predicates called .toLowerCase()/.includes() directly on
 * raw Firestore fields; a document written by an older build may not
 * HAVE the field at all (product without urduName/sku/category,
 * customer without address, bill without customerPhone), and the
 * first typed keystroke then threw a TypeError that unmounted the
 * whole page (the app has no error boundary). These checks prove:
 * (a) on well-formed data the new helpers return EXACTLY what the
 * verbatim legacy predicates returned; (b) on field-missing legacy
 * shapes nothing throws and the surviving fields still match. */
suite("B4", null);
{
  /* Phase B · B4 — Credit/Debit Notes + Purchase-Return Engine
   * (design §3). The store templates that cannot execute headless
   * are replicated line-faithfully and composed through the REAL
   * makeEntry / computePurchaseTaxes / purchaseReturnTaxShares /
   * composePurchaseReturnLines / ledger selectors, so every figure
   * asserted here is the figure the app posts. */
  const GST17 = { id: "gst17", name: "GST 17%", kind: "percent", rate: 17, appliesTo: "both", inclusive: false, active: true };
  const STD18I = { id: "std18i", name: "Std 18% incl", kind: "percent", rate: 18, appliesTo: "both", inclusive: true, active: true };
  const R2 = tax.round2;

  const mkPurchase = (id, supplierId, lines, dayOffset = 0) => {
    const taxRes = tax.computePurchaseTaxes(
      lines.map((l) => ({ total: l.qty * l.unitCost, qty: l.qty, slab: l.slab ?? null }))
    );
    const items = lines.map((l, i) => {
      const info = taxRes.lines[i];
      const slab = info.slab;
      return {
        productId: l.productId, name: l.name, qty: l.qty, unitCost: l.unitCost,
        total: l.qty * l.unitCost, taxAmount: info.taxAmount,
        taxSlabId: slab?.id ?? null, taxSlabName: slab?.name ?? null,
        taxRate: slab?.rate ?? 0, taxKind: slab?.kind ?? "percent",
        taxInclusive: slab?.inclusive ?? false,
      };
    });
    return {
      id, supplierId, items, total: taxRes.grossTotal, netTotal: taxRes.netTotal,
      taxAmount: taxRes.taxAmount, note: "", dayOffset,
      ts: "2026-03-01T09:00:00.000Z",
    };
  };
  // Line-faithful to StoreProvider.recordPurchase.
  const purchaseEntry = (p) =>
    ledger.makeEntry("Purchase — stock received", "purchase", p.id, [
      { account: "purchases", debit: p.netTotal, credit: 0 },
      ...(p.taxAmount > 0 ? [{ account: "tax_input", debit: p.taxAmount, credit: 0 }] : []),
      { account: "inventory", debit: p.netTotal, credit: 0 },
      { account: "purchases", debit: 0, credit: p.netTotal },
      { account: "payables", debit: 0, credit: p.total, ref: p.supplierId },
    ]);
  const paymentEntry = (pay) =>
    ledger.makeEntry("Supplier payment", "supplier_payment", pay.id, [
      { account: "payables", debit: pay.amount, credit: 0, ref: pay.supplierId },
      { account: "cash", debit: 0, credit: pay.amount, ref: "acct-cash" },
    ]);
  // Line-faithful to StoreProvider.recordPurchaseReturn.
  const applyPurchaseReturn = (state, purchase, picks, settlement, method) => {
    const lines = docs.composePurchaseReturnLines(purchase, state.purchaseReturns, picks);
    if (!lines) return null;
    const priors = state.purchaseReturns.filter((r) => r.purchaseId === purchase.id);
    const items = docs.purchaseReturnItems(purchase, lines);
    const shares = tax.purchaseReturnTaxShares(purchase, priors, items);
    for (const it of items) it.taxAmount = shares.perLine.get(it.productId) ?? 0;
    const srcById = new Map(purchase.items.map((i) => [i.productId, i]));
    const net = R2(
      items.reduce(
        (a, it) => a + (srcById.get(it.productId).taxInclusive ? it.total - it.taxAmount : it.total),
        0
      )
    );
    const t = shares.taxShare;
    const gross = R2(net + t);
    const ret = {
      id: `pret${state.purchaseReturns.length + 1}`,
      purchaseId: purchase.id, supplierId: purchase.supplierId, items,
      payableOffset: settlement === "payable_offset" ? gross : 0,
      refundAmount: settlement === "cash_refund" ? gross : 0,
      method: settlement === "cash_refund" ? (method ?? "cash") : null,
      accountId: settlement === "cash_refund" ? "acct-cash" : null,
      dayOffset: 0, ts: "2026-03-20T10:00:00.000Z",
    };
    const entry = ledger.makeEntry("Purchase return — goods sent back", "purchase_return", ret.id, [
      ...(ret.payableOffset > 0
        ? [{ account: "payables", debit: ret.payableOffset, credit: 0, ref: purchase.supplierId }]
        : []),
      ...(ret.refundAmount > 0
        ? [{ account: "cash", debit: ret.refundAmount, credit: 0, ref: "acct-cash" }]
        : []),
      { account: "inventory", debit: 0, credit: net },
      ...(t > 0 ? [{ account: "tax_input", debit: 0, credit: t }] : []),
    ]);
    state.purchaseReturns.push(ret);
    state.journal.push(entry);
    return { ret, entry };
  };
  const journalPayables = (journal, sid) =>
    journal.reduce(
      (a, e) =>
        a + e.lines
          .filter((l) => l.account === "payables" && l.ref === sid)
          .reduce((x, l) => x + l.credit - l.debit, 0),
      0
    );

  /* --- numbering: kind-filtered independent sequences (§3.1) --- */
  check(
    docs.nextDocNumber("creditNote", [], null) === "CN-1" &&
      docs.nextDocNumber("creditNote", ["CN-1"], null) === "CN-2" &&
      docs.nextDocNumber("debitNote", [], null) === "DN-1" &&
      docs.nextDocNumber("debitNote", ["DN-3"], null) === "DN-4",
    "numbering: CN and DN sequences run independently over the caller's kind-filtered numbers"
  );

  /* --- the taxed fixture purchase (exclusive GST 17%) --- */
  const taxPurchase = mkPurchase("pB4a", "sup1", [
    { productId: "pa", name: "Alpha", qty: 1, unitCost: 10000, slab: GST17 },
    { productId: "pb", name: "Beta", qty: 2, unitCost: 5000, slab: GST17 },
    { productId: "pc", name: "Gamma", qty: 3, unitCost: 1500, slab: GST17 },
  ]);
  check(
    eq(taxPurchase.netTotal, 24500) && eq(taxPurchase.taxAmount, 4165) && eq(taxPurchase.total, 28665),
    "fixture: taxed purchase is net 24,500 + tax 4,165 = gross 28,665"
  );

  /* --- cumulative tax reversal, to the paisa: return the taxed
   * purchase in three slices; tax_input must end at exactly 0 --- */
  {
    const st = { purchaseReturns: [], journal: [purchaseEntry(taxPurchase)] };
    applyPurchaseReturn(st, taxPurchase, [{ productId: "pa", qty: 1 }], "payable_offset");
    applyPurchaseReturn(st, taxPurchase, [{ productId: "pb", qty: 1 }], "payable_offset");
    applyPurchaseReturn(st, taxPurchase, [
      { productId: "pb", qty: 1 },
      { productId: "pc", qty: 3 },
    ], "payable_offset");
    const reversed = st.purchaseReturns.reduce(
      (a, r) => a + r.items.reduce((x, i) => x + i.taxAmount, 0), 0
    );
    check(eq(reversed, 4165), "tax reversal: three partial returns reverse input tax to the paisa (4,165)");
    check(
      eq(ledger.accountBalance(st.journal, "tax_input"), 0),
      "tax reversal: the journal's tax_input balance returns to exactly 0"
    );
  }
  /* Inclusive slab + untaxed mix reverses exactly the purchase tax. */
  {
    const p = mkPurchase("pB4b", "sup1", [
      { productId: "pd", name: "Delta", qty: 4, unitCost: 1170, slab: STD18I },
      { productId: "pe", name: "Plain", qty: 2, unitCost: 1000, slab: null },
    ]);
    const st = { purchaseReturns: [], journal: [purchaseEntry(p)] };
    const full = applyPurchaseReturn(st, p, [
      { productId: "pd", qty: 4 },
      { productId: "pe", qty: 2 },
    ], "payable_offset");
    check(
      full !== null &&
        eq(full.ret.items.reduce((a, i) => a + i.taxAmount, 0), p.taxAmount) &&
        eq(full.ret.items.find((i) => i.productId === "pe").taxAmount, 0) &&
        eq(ledger.accountBalance(st.journal, "tax_input"), 0),
      "tax reversal: inclusive + untaxed purchase reverses exactly its tax, untaxed line zero"
    );
  }

  /* --- compose guards: over-return refused BEFORE composition --- */
  {
    const p = mkPurchase("pB4c", "sup1", [
      { productId: "pa", name: "Alpha", qty: 2, unitCost: 1000, slab: null },
    ]);
    const priors = [{ purchaseId: "pB4c", supplierId: "sup1", items: [{ productId: "pa", qty: 1, total: 1000, taxAmount: 0 }] }];
    check(
      docs.composePurchaseReturnLines(p, priors, [{ productId: "pa", qty: 2 }]) === null,
      "over-return: more than purchased − already-returned is refused"
    );
    check(
      docs.composePurchaseReturnLines(p, priors, [{ productId: "pa", qty: 1 }]) !== null &&
        docs.composePurchaseReturnLines(p, priors, [{ productId: "zz", qty: 1 }]) === null &&
        docs.composePurchaseReturnLines(p, priors, []) === null,
      "over-return: exact remainder allowed; unknown product and empty picks refused"
    );
    const merged = docs.composePurchaseReturnLines(p, [], [
      { productId: "pa", qty: 1 },
      { productId: "pa", qty: 1 },
    ]);
    check(
      merged !== null && merged.length === 1 && eq(merged[0].qty, 2),
      "compose: duplicate picks merge before the cap is judged"
    );
  }

  /* --- journal ≡ subledger identity across a mixed sequence ---
   * purchase 28,665 → pay 10,000 → return 1× Beta (offset 5,850)
   * → return the rest. Both derivations agree at EVERY step. */
  {
    const st = { purchaseReturns: [], journal: [purchaseEntry(taxPurchase)] };
    const payments = [];
    const identity = (label, expected) => {
      const sub = ledger.supplierBalance([taxPurchase], payments, "sup1", st.purchaseReturns);
      const gl = journalPayables(st.journal, "sup1");
      check(
        eq(sub, gl) && eq(sub, expected) && eq(ledger.payablesTotal(st.journal), gl),
        `identity: journal ≡ subledger after ${label} (${expected})`
      );
    };
    identity("purchase", 28665);
    const pay = { id: "pay1", supplierId: "sup1", amount: 10000, method: "cash", ts: "2026-03-05T09:00:00.000Z" };
    payments.push(pay);
    st.journal.push(paymentEntry(pay));
    identity("partial payment", 18665);
    const first = applyPurchaseReturn(st, taxPurchase, [{ productId: "pb", qty: 1 }], "payable_offset");
    check(
      first !== null && ledger.entryBalances(first.entry) && eq(first.ret.payableOffset, 5850),
      "template: partial return entry balances; payable offset is the full gross 5,850"
    );
    identity("partial return", 12815);
    applyPurchaseReturn(st, taxPurchase, [
      { productId: "pa", qty: 1 },
      { productId: "pb", qty: 1 },
      { productId: "pc", qty: 3 },
    ], "payable_offset");
    identity("return of the rest — all goods back, the 10,000 paid is now an advance", -10000);
    const aging = ledger.payablesAging([taxPurchase], payments, st.purchaseReturns);
    check(
      eq(aging.total, 0),
      "aging: a fully-returned purchase contributes nothing to payables aging"
    );
    check(
      eq(
        st.journal
          .filter((e) => e.refType === "purchase_return")
          .reduce((a, e) => a + e.lines.filter((l) => l.account === "inventory").reduce((x, l) => x + l.credit, 0), 0),
        24500
      ),
      "template: inventory is credited back exactly the purchase net (24,500)"
    );
  }

  /* --- paid-in-full, THEN returned: payable goes negative = a
   * supplier advance, identically in both derivations (§3.2) --- */
  {
    const p = mkPurchase("pB4e", "sup1", [
      { productId: "pa", name: "Alpha", qty: 2, unitCost: 3000, slab: null },
    ]);
    const st = { purchaseReturns: [], journal: [purchaseEntry(p)] };
    const pay = { id: "payF", supplierId: "sup1", amount: 6000, method: "cash", ts: "2026-03-03T09:00:00.000Z" };
    st.journal.push(paymentEntry(pay));
    applyPurchaseReturn(st, p, [{ productId: "pa", qty: 2 }], "payable_offset");
    check(
      eq(ledger.supplierBalance([p], [pay], "sup1", st.purchaseReturns), -6000) &&
        eq(journalPayables(st.journal, "sup1"), -6000),
      "advance: return against a PAID purchase ⇒ balance −6,000 in subledger AND journal"
    );
    check(
      eq(ledger.payablesAging([p], [pay], st.purchaseReturns).total, 0),
      "advance: an advance position contributes nothing to payables aging"
    );
  }

  /* --- cash_refund settlement: money returns, payable untouched --- */
  {
    const p = mkPurchase("pB4f", "sup1", [
      { productId: "pa", name: "Alpha", qty: 1, unitCost: 4000, slab: null },
    ]);
    const st = { purchaseReturns: [], journal: [purchaseEntry(p)] };
    const pay = { id: "payG", supplierId: "sup1", amount: 4000, method: "cash", ts: "2026-03-02T09:00:00.000Z" };
    st.journal.push(paymentEntry(pay));
    const back = applyPurchaseReturn(st, p, [{ productId: "pa", qty: 1 }], "cash_refund", "cash");
    check(
      back !== null &&
        eq(back.ret.refundAmount, 4000) && eq(back.ret.payableOffset, 0) &&
        back.entry.lines.some((l) => l.account === "cash" && eq(l.debit, 4000)) &&
        eq(ledger.supplierBalance([p], [pay], "sup1", st.purchaseReturns), 0) &&
        eq(journalPayables(st.journal, "sup1"), 0),
      "cash_refund: money account debited; the refund un-pays, so BOTH derivations read the settled 0 (no phantom advance)"
    );
    /* Mixed sequence on ONE purchase: pay part, refund part,
     * offset the rest — identity after every leg (§9). */
    const p2 = mkPurchase("pB4g", "sup1", [
      { productId: "pa", name: "Alpha", qty: 10, unitCost: 1000, slab: null },
    ]);
    const st2 = { purchaseReturns: [], journal: [purchaseEntry(p2)] };
    const pay2 = { id: "payH", supplierId: "sup1", amount: 4000, method: "cash", ts: "2026-03-04T09:00:00.000Z" };
    st2.journal.push(paymentEntry(pay2));
    applyPurchaseReturn(st2, p2, [{ productId: "pa", qty: 3 }], "cash_refund", "cash");
    applyPurchaseReturn(st2, p2, [{ productId: "pa", qty: 2 }], "payable_offset");
    check(
      eq(ledger.supplierBalance([p2], [pay2], "sup1", st2.purchaseReturns), 4000) &&
        eq(journalPayables(st2.journal, "sup1"), 4000) &&
        eq(ledger.payablesAging([p2], [pay2], st2.purchaseReturns).total, 4000),
      "identity: pay 4,000 → refund-return 3,000 → offset-return 2,000 ⇒ 4,000 owed in journal, subledger AND aging"
    );
  }

  /* --- debit-note figures ≡ the purchase return they wrap --- */
  {
    const st = { purchaseReturns: [], journal: [purchaseEntry(taxPurchase)] };
    const { ret } = applyPurchaseReturn(st, taxPurchase, [{ productId: "pb", qty: 1 }], "payable_offset");
    const fig = docs.debitNoteFigures(ret);
    check(
      eq(fig.total, ret.payableOffset + ret.refundAmount) && eq(fig.taxAmount, 850) &&
        eq(fig.goodsAmount, 5000) && eq(fig.total, 5850),
      "debit note: total ≡ return gross (5,850); tax ≡ reversed input tax (850); goods ≡ net (5,000)"
    );
    const noteItems = docs.noteItemsFromPurchaseReturn(ret);
    check(
      noteItems.length === 1 && eq(noteItems[0].unitPrice, 5000) && eq(noteItems[0].total, 5000),
      "debit note: items carry the purchase line's in-cost as their price"
    );
  }

  /* --- credit-note figures ≡ the returns engine, partial sequence ---
   * A taxed bill returned item-by-item: the notes' totals sum to
   * the bill total (the engine's refund totals), their tax legs to
   * the bill's tax — to the paisa. */
  {
    const billLines = [
      { productId: "p1", name: "P1", qty: 2, unitPrice: 585, unitCost: 300, total: 1170, slab: STD18I },
      { productId: "p2", name: "P2", qty: 2, unitPrice: 499, unitCost: 250, total: 998, slab: GST17 },
    ];
    const bt = tax.computeBillTaxes(billLines.map((l) => ({ total: l.total, qty: l.qty, slab: l.slab })), 0);
    const bill = {
      id: "bB4", billNo: 77, discountAmount: 0, taxAmount: bt.taxAmount, total: bt.total,
      ts: "2026-03-01T09:00:00.000Z",
      items: billLines.map((l, i) => ({
        productId: l.productId, name: l.name, qty: l.qty, unitPrice: l.unitPrice,
        unitCost: l.unitCost, total: l.total, taxAmount: bt.lines[i].taxAmount,
        taxSlabId: l.slab.id, taxSlabName: l.slab.name, taxRate: l.slab.rate,
        taxKind: "percent", taxInclusive: l.slab.inclusive,
      })),
    };
    const mkSaleReturn = (id, picks, shares) => {
      const items = picks.map((p) => {
        const src = bill.items.find((x) => x.productId === p.productId);
        return { ...src, qty: p.qty, total: p.total, taxAmount: shares.perLine.get(p.productId) ?? 0 };
      });
      const gross = items.reduce((a, i) => a + i.total, 0);
      return {
        id, billId: bill.id, billNo: bill.billNo, items,
        refundAmount: R2(gross + shares.exclusiveTaxShare), creditReduction: 0,
        method: "cash", accountId: "acct-cash", dayOffset: 0, ts: bill.ts,
      };
    };
    const shares1 = tax.returnTaxShares(bill, [], [{ productId: "p1", qty: 1, total: 585 }]);
    const r1 = mkSaleReturn("r1", [{ productId: "p1", qty: 1, total: 585 }], shares1);
    const cn1 = docs.creditNoteFigures(r1);
    const shares2 = tax.returnTaxShares(bill, [r1], [
      { productId: "p1", qty: 1, total: 585 },
      { productId: "p2", qty: 2, total: 998 },
    ]);
    const r2 = mkSaleReturn("r2", [
      { productId: "p1", qty: 1, total: 585 },
      { productId: "p2", qty: 2, total: 998 },
    ], shares2);
    const cn2 = docs.creditNoteFigures(r2);
    check(
      eq(cn1.total + cn2.total, bill.total) && eq(cn1.taxAmount + cn2.taxAmount, bill.taxAmount),
      "credit notes: item-by-item returns sum to the bill total and reverse its tax to the paisa"
    );
    check(
      eq(cn1.goodsAmount + cn1.taxAmount, cn1.total) && eq(cn2.goodsAmount + cn2.taxAmount, cn2.total),
      "credit notes: goods + tax == total on every note, by construction"
    );
    const udhaarFig = docs.creditNoteFigures({
      id: "r3", billId: bill.id, billNo: bill.billNo, items: [],
      refundAmount: 0, creditReduction: 2750, method: null, ts: bill.ts, dayOffset: 0,
    });
    check(
      eq(udhaarFig.total, 2750) && eq(udhaarFig.goodsAmount, 2750) && eq(udhaarFig.taxAmount, 0),
      "credit notes: a pure-udhaar return's total is the credit reduction alone"
    );
  }

  /* --- RBAC: the note row vs the returns row (G-2) --- */
  check(
    perm.accessOf("cashier", "creditDebitNotes") === "none" &&
      perm.accessOf("accountant", "creditDebitNotes") === "full" &&
      perm.accessOf("manager", "creditDebitNotes") === "full",
    "RBAC: note issuance is creditDebitNotes alone (cashier none, accountant full)"
  );
  check(
    perm.accessOf("cashier", "returns") === "full" && perm.accessOf("accountant", "returns") === "none",
    "RBAC: the plain returns row is untouched (cashier full / accountant none)"
  );

  /* --- source invariants: gating + same-batch minting + guard --- */
  const storeSrcB4 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx", "utf8"
  );
  const regionB4 = (a, b) => {
    const i = storeSrcB4.indexOf(a);
    const j = storeSrcB4.indexOf(b, i);
    return i >= 0 && j > i ? storeSrcB4.slice(i, j) : "";
  };
  check(
    regionB4("const returnItems = useCallback(", "const returnItemsWithNote").includes(
      'can(roleRef.current, "returns", "write")'
    ),
    "source: the plain returnItems action still gates on the returns row (unchanged)"
  );
  check(
    regionB4("const returnItemsWithNote = useCallback(", "const voidBill").includes(
      '"creditDebitNotes", "write"'
    ),
    "source: the formal return flow gates on creditDebitNotes (G-2), never re-checking returns"
  );
  const engB4 = regionB4("const reverseBillItems = useCallback(", "const returnItems = useCallback(");
  check(
    engB4.includes('"creditNote"') && engB4.includes("creditNoteFigures(ret)") &&
      engB4.includes('"notes", note.id'),
    "source: the engine mints the credit note inside the return's own batch"
  );
  check(
    engB4.includes('opts.kind === "return" && opts.note'),
    "source: note composition is gated to returns — voids never mint notes"
  );
  const prB4 = regionB4("const recordPurchaseReturn = useCallback(", "/* ---------------- customers & credit");
  check(
    prB4.includes('"creditDebitNotes", "write"') && prB4.includes("guardPostings(entry)") &&
      prB4.includes('"purchase_return"') && prB4.includes('"debitNote"') &&
      prB4.includes("purchaseReturnTaxShares(purchase, priorReturns, items)") &&
      prB4.includes("composePurchaseReturnLines("),
    "source: recordPurchaseReturn gates, guards, composes via the derivation and mints the DN in-batch"
  );
  check(
    storeSrcB4.includes("supplierBalance(c.purchases, c.supplierPayments, id, c.purchaseReturns)"),
    "source: the delete-supplier guard reads the returns-aware balance"
  );

  /* --- rules: additive notes + purchaseReturns blocks (§6.2) --- */
  const rulesB4 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8"
  );
  const CREATE_LINE =
    "allow create: if hasRole(uid, ['owner', 'manager', 'accountant']) && createInOpenPeriod(uid) && planPostable(uid);";
  const blockB4 = (marker, next) => {
    const i = rulesB4.indexOf(marker);
    const j = rulesB4.indexOf(next, i);
    return i >= 0 && j > i ? rulesB4.slice(i, j) : "";
  };
  check(
    blockB4("match /notes/{noteId}", "match /purchaseReturns/").includes(CREATE_LINE) &&
      blockB4("match /notes/{noteId}", "match /purchaseReturns/").includes("allow read: if canAccess(uid);"),
    "rules: notes block carries the §6.2 posture (read any role; create owner/manager/accountant in an open period)"
  );
  check(
    blockB4("match /purchaseReturns/{purchaseReturnId}", "// Expenses:").includes(CREATE_LINE),
    "rules: purchaseReturns block carries the same create posture"
  );
}

/* =============================== B5 =============================== */
suite("B5", null);
{
  /* Phase B · B5 — Cheque Registry (design §4). Store templates
   * that cannot execute headless are replicated line-faithfully
   * (the money legs of postBill / addRepayment /
   * recordSupplierPayment, and the lifecycle entries composed
   * through the REAL lib/cheques line composers) through the REAL
   * makeEntry guard, so every figure asserted is the figure the
   * app posts. The invariant under test throughout:
   *   Σ registry uncleared (in)  == GL cheques_in_hand
   *   Σ registry pending (out)   == GL cheques_issued
   * at EVERY step of both lifecycles. */
  const till = byId(accounts, "acc-till");
  const bankAcct = byId(accounts, "acc-bank");
  const TODAY = "2026-10-22";
  const glInHand = (j) => ledger.accountNormalBalance(j, "cheques_in_hand");
  const glIssued = (j) => ledger.accountNormalBalance(j, "cheques_issued");
  const recvFor = (j, cid) =>
    j.reduce(
      (a, e) =>
        a +
        e.lines
          .filter((l) => l.account === "receivables" && l.ref === cid)
          .reduce((x, l) => x + l.debit - l.credit, 0),
      0
    );
  const payFor = (j, sid) =>
    j.reduce(
      (a, e) =>
        a +
        e.lines
          .filter((l) => l.account === "payables" && l.ref === sid)
          .reduce((x, l) => x + l.credit - l.debit, 0),
      0
    );
  const mkCheque = (patch) => ({
    id: "chq-x", direction: "in", status: "received", chequeNo: "0001", bankName: "Meezan Bank",
    amount: 0, issueDateISO: TODAY, dueDateISO: TODAY,
    partyId: null, partyName: "", partyKind: "customer",
    sourceType: "bill", sourceId: "", accountId: null, chargesOnBounce: 0,
    entryIds: { captured: null, deposited: null, cleared: null, bounced: null, returned: null },
    note: "", dayOffset: 0, ts: "2026-10-22T09:00:00.000Z", ...patch,
  });
  /* Line-faithful to StoreProvider.postBill's payment legs for a
   * tax-free bill (the cogs/inventory pair included so the entry
   * is complete): credit part → receivables; cheque part →
   * cheques_in_hand ref chequeId; money part → its account's GL. */
  const billEntryFor = (bill, parts) => {
    const lines = [];
    for (const p of parts) {
      if (p.method === "credit")
        lines.push({ account: "receivables", debit: p.amount, credit: 0, ref: bill.customerId });
      else if (p.instrument === "cheque")
        lines.push({ account: "cheques_in_hand", debit: p.amount, credit: 0, ref: p.chequeId });
      else {
        const acct = byId(accounts, p.accountId);
        lines.push({ account: ledger.glForAccount(acct), debit: p.amount, credit: 0, ref: p.accountId });
      }
    }
    lines.push({ account: "sales_revenue", debit: 0, credit: bill.total });
    lines.push({ account: "cogs", debit: bill.cost, credit: 0 });
    lines.push({ account: "inventory", debit: 0, credit: bill.cost });
    return ledger.makeEntry(`Bill #${bill.billNo}`, "bill", bill.id, lines);
  };
  const purchaseEntryFor = (p) =>
    ledger.makeEntry("Purchase — stock received", "purchase", p.id, [
      { account: "purchases", debit: p.total, credit: 0 },
      { account: "inventory", debit: p.total, credit: 0 },
      { account: "purchases", debit: 0, credit: p.total },
      { account: "payables", debit: 0, credit: p.total, ref: p.supplierId },
    ]);
  const cashPaymentEntryFor = (pay) =>
    ledger.makeEntry("Supplier payment", "supplier_payment", pay.id, [
      { account: "payables", debit: pay.amount, credit: 0, ref: pay.supplierId },
      { account: "cash", debit: 0, credit: pay.amount, ref: pay.accountId },
    ]);
  const chequePaymentEntryFor = (pay) =>
    ledger.makeEntry("Supplier payment", "supplier_payment", pay.id, [
      { account: "payables", debit: pay.amount, credit: 0, ref: pay.supplierId },
      { account: "cheques_issued", debit: 0, credit: pay.amount, ref: pay.chequeId },
    ]);
  const mkCreditRow = (patch) => ({
    id: patch.id, customerId: "cust1", customerName: "Ahmad", customerPhone: "0300",
    kind: "credit", amount: 0, method: null, accountId: null, instrument: null,
    chequeId: null, note: "", billId: null, dayOffset: 0,
    ts: "2026-10-22T09:00:00.000Z", ...patch,
  });

  /* ---- seed identities: the cheque accounts start at zero ---- */
  check(
    eq(glInHand(journal), 0) && eq(glIssued(journal), 0) &&
      eq(cheques.unclearedInTotal([]), 0) && eq(cheques.pendingOutTotal([]), 0),
    "seed: GL cheques_in_hand == GL cheques_issued == 0 over the frozen seed journal"
  );

  /* ---- capture validation: a PDC's future due date is legal ---- */
  check(
    cheques.isValidChequeDraft({ chequeNo: "123", bankName: "Meezan", issueDateISO: TODAY, dueDateISO: "2027-03-01" }) === true &&
      cheques.isValidChequeDraft({ chequeNo: " ", bankName: "Meezan", issueDateISO: TODAY, dueDateISO: TODAY }) === false &&
      cheques.isValidChequeDraft({ chequeNo: "123", bankName: "Meezan", issueDateISO: TODAY, dueDateISO: "2026-13-40" }) === false &&
      cheques.isValidChequeDraft(null) === false,
    "capture: post-dated due dates validate; blank numbers and impossible dates refuse"
  );

  /* ================= IN lifecycle: bill → deposit → clear ================= */
  {
    const j = [...journal];
    const registry = [];
    const bill = { id: "bB5a", billNo: 501, customerId: "cust1", total: 15000, cost: 9000 };
    const chq1 = mkCheque({
      id: "chq1", chequeNo: "771201", amount: 10000, dueDateISO: "2026-11-21",
      partyId: "cust1", partyName: "Ahmad", sourceType: "bill", sourceId: "bB5a",
    });
    const tillBefore = ledger.moneyAccountBalance(j, till);
    const entry = billEntryFor(bill, [
      { method: "cash", amount: 5000, accountId: "acc-till" },
      { method: "bank", amount: 10000, instrument: "cheque", chequeId: "chq1" },
    ]);
    chq1.entryIds.captured = entry.id;
    j.push(entry);
    registry.push(chq1);
    check(ledger.entryBalances(entry), "IN capture: the host bill entry balances with the cheque leg inside it");
    check(
      eq(glInHand(j), 10000) && eq(glInHand(j), cheques.unclearedInTotal(registry)),
      "IN capture: GL cheques_in_hand 10,000 == Σ registry uncleared"
    );
    check(
      eq(ledger.moneyAccountBalance(j, till), tillBefore + 5000),
      "IN capture: only the cash part touched the till (+5,000); the cheque part touched no money account"
    );
    check(
      chq1.dueDateISO > TODAY && !cheques.chequeIsDue(chq1, TODAY) && !cheques.chequeIsOverdue(chq1, TODAY),
      "PDC: a cheque due 2026-11-21 captured today is neither due nor overdue"
    );

    /* deposit: custody only — the journal must not grow */
    const lenBefore = j.length;
    const deposited = { ...chq1, status: "deposited", accountId: "acc-bank" };
    registry[0] = deposited;
    check(
      j.length === lenBefore && eq(glInHand(j), cheques.unclearedInTotal(registry)),
      "deposit posts NOTHING: journal length unchanged, identity intact"
    );

    /* clear: exactly C lands in the deposit account */
    const bankBefore = ledger.moneyAccountBalance(j, bankAcct);
    const clearEntry = ledger.makeEntry(
      "Cheque cleared", "cheque_clearing", deposited.id,
      cheques.clearingLines(deposited, ledger.glForAccount(bankAcct))
    );
    j.push(clearEntry);
    registry[0] = { ...deposited, status: "cleared", entryIds: { ...deposited.entryIds, cleared: clearEntry.id } };
    check(
      ledger.entryBalances(clearEntry) && eq(ledger.moneyAccountBalance(j, bankAcct), bankBefore + 10000),
      "clear: Dr deposit account exactly 10,000, entry balanced"
    );
    check(
      eq(glInHand(j), 0) && eq(glInHand(j), cheques.unclearedInTotal(registry)),
      "clear: GL cheques_in_hand back to 0 == registry"
    );
    check(
      !cheques.canChequeTransition(registry[0], "clear") &&
        !cheques.canChequeTransition(registry[0], "bounce") &&
        !cheques.canChequeTransition(registry[0], "deposit"),
      "refusals: double-clear, bounce-after-clear and re-deposit of a cleared cheque all refuse"
    );
  }

  /* ============ IN bounce: receivable restored in BOTH books ============ */
  {
    const j = [...journal];
    const registry = [];
    const rows = [];
    const bill = { id: "bB5b", billNo: 502, customerId: "cust1", customerName: "Ahmad", customerPhone: "0300", total: 20000, cost: 12000 };
    const chq2 = mkCheque({
      id: "chq2", chequeNo: "771202", amount: 12000,
      partyId: "cust1", partyName: "Ahmad", sourceType: "bill", sourceId: "bB5b",
    });
    const recv0 = recvFor(j, "cust1");
    j.push(billEntryFor(bill, [
      { method: "credit", amount: 8000 },
      { method: "bank", amount: 12000, instrument: "cheque", chequeId: "chq2" },
    ]));
    rows.push(mkCreditRow({ id: "cr-b5b", kind: "credit", amount: 8000, billId: "bB5b" }));
    registry.push(chq2);
    check(
      eq(ledger.billCreditOutstanding(rows, bill).outstanding, 8000) &&
        eq(recvFor(j, "cust1"), recv0 + 8000),
      "bounce fixture: bill outstanding is the 8,000 credit part; journal receivables carry it too"
    );
    const deposited = { ...chq2, status: "deposited", accountId: "acc-bank" };
    registry[0] = deposited;
    const bankBefore = ledger.moneyAccountBalance(j, bankAcct);
    const bounceEntry = ledger.makeEntry(
      "Cheque bounced", "cheque_bounce", deposited.id, cheques.bounceInLines(deposited)
    );
    const chargesEntry = ledger.makeEntry(
      "Cheque bounced — bank charges", "cheque_bounce", deposited.id,
      cheques.bounceChargesLines(deposited, ledger.glForAccount(bankAcct), 500)
    );
    j.push(bounceEntry, chargesEntry);
    rows.push(mkCreditRow({ id: "cr-b5b-x", kind: "credit", amount: 12000, billId: "bB5b", note: "cheque bounced" }));
    registry[0] = { ...deposited, status: "bounced", chargesOnBounce: 500 };
    check(
      ledger.entryBalances(bounceEntry) && ledger.entryBalances(chargesEntry) &&
        chargesEntry.lines.some((l) => l.account === "expense_finance" && eq(l.debit, 500)) &&
        eq(ledger.moneyAccountBalance(j, bankAcct), bankBefore - 500),
      "bounce charges: their OWN balanced entry (Dr expense_finance 500), paid from the deposit account"
    );
    check(
      eq(glInHand(j), 0) && eq(glInHand(j), cheques.unclearedInTotal(registry)),
      "bounce: GL cheques_in_hand 0 == registry (bounced cheques are no longer in hand)"
    );
    check(
      eq(recvFor(j, "cust1"), recv0 + 20000) &&
        eq(ledger.billCreditOutstanding(rows, bill).outstanding, 20000),
      "bounce: receivable restored to the paisa in BOTH derivations (journal +20,000 over its prior level; F-6 lot 20,000)"
    );
    check(
      !cheques.canChequeTransition(registry[0], "clear") && !cheques.canChequeTransition(registry[0], "bounce"),
      "refusals: clearing or re-bouncing a bounced cheque refuses"
    );

    /* R-B3 orderings: bounce×return converge in the F-6 lot */
    const retRow = mkCreditRow({ id: "cr-b5b-r", kind: "credit", amount: -5000, billId: "bB5b" });
    const orderA = [...rows, retRow]; // bounce (already in rows) then return
    const orderB = [
      mkCreditRow({ id: "cr-b5b", kind: "credit", amount: 8000, billId: "bB5b" }),
      retRow,
      mkCreditRow({ id: "cr-b5b-x", kind: "credit", amount: 12000, billId: "bB5b", note: "cheque bounced" }),
    ]; // return then bounce
    check(
      eq(ledger.billCreditOutstanding(orderA, bill).outstanding, 15000) &&
        eq(ledger.billCreditOutstanding(orderB, bill).outstanding, 15000),
      "R-B3: bounce-then-return and return-then-bounce converge (outstanding 15,000 both ways)"
    );
  }

  /* ============ IN return undeposited (repayment capture) ============ */
  {
    const j = [...journal];
    const registry = [];
    const rows = [mkCreditRow({ id: "cr-b5c", kind: "credit", amount: 9000 })];
    const chq3 = mkCheque({
      id: "chq3", chequeNo: "771203", amount: 6000,
      partyId: "cust1", partyName: "Ahmad", sourceType: "repayment", sourceId: "rp-b5c",
    });
    j.push(ledger.makeEntry("Udhaar repayment received", "repayment", "rp-b5c", [
      { account: "cheques_in_hand", debit: 6000, credit: 0, ref: "chq3" },
      { account: "receivables", debit: 0, credit: 6000, ref: "cust1" },
    ]));
    rows.push(mkCreditRow({ id: "rp-b5c", kind: "repayment", amount: 6000, method: "bank", instrument: "cheque", chequeId: "chq3" }));
    registry.push(chq3);
    const key = ledger.creditKey(rows[0]);
    check(
      eq(ledger.customerOutstanding(rows, key), 3000) && eq(glInHand(j), cheques.unclearedInTotal(registry)),
      "repayment capture: udhaar falls by the cheque (9,000 → 3,000) while identity holds"
    );
    const retEntry = ledger.makeEntry(
      "Cheque returned to customer", "cheque_return", chq3.id, cheques.returnInLines(chq3)
    );
    j.push(retEntry);
    rows.push(mkCreditRow({ id: "cr-b5c-x", kind: "credit", amount: 6000, note: "cheque returned" }));
    registry[0] = { ...chq3, status: "returned" };
    check(
      ledger.entryBalances(retEntry) && eq(ledger.customerOutstanding(rows, key), 9000) &&
        eq(glInHand(j), 0) && eq(glInHand(j), cheques.unclearedInTotal(registry)),
      "return undeposited: receivable restored in both books; identity back to 0"
    );
  }

  /* ================= OUT lifecycle: issuance settles ================= */
  {
    const j = [...journal];
    const registry = [];
    const purchase = { id: "pB5a", supplierId: "sup1", total: 30000, dayOffset: 0, ts: "2026-10-22T09:00:00.000Z" };
    const payments = [];
    j.push(purchaseEntryFor(purchase));
    const chqOut = mkCheque({
      id: "chqOut1", direction: "out", status: "issued", chequeNo: "990011", amount: 30000,
      partyId: "sup1", partyName: "Supplier One", partyKind: "supplier",
      sourceType: "supplier_payment", sourceId: "pay-b5a", accountId: "acc-bank",
    });
    const payRow = { id: "pay-b5a", supplierId: "sup1", amount: 30000, method: "bank", accountId: "acc-bank", instrument: "cheque", chequeId: "chqOut1", note: "", dayOffset: 0, ts: "2026-10-22T09:00:00.000Z" };
    j.push(chequePaymentEntryFor(payRow));
    payments.push(payRow);
    registry.push(chqOut);
    check(
      eq(payFor(j, "sup1"), 0) && eq(ledger.supplierBalance([purchase], payments, "sup1"), 0) &&
        eq(ledger.payablesAging([purchase], payments).total, 0),
      "issuance settles the payable AT ISSUANCE: journal ≡ subledger ≡ aging, all 0"
    );
    check(
      eq(glIssued(j), 30000) && eq(glIssued(j), cheques.pendingOutTotal(registry)),
      "issuance: GL cheques_issued 30,000 == Σ registry pending out"
    );
    const bankBefore = ledger.moneyAccountBalance(j, bankAcct);
    const clearEntry = ledger.makeEntry(
      "Cheque cleared", "cheque_clearing", chqOut.id,
      cheques.clearingLines(chqOut, ledger.glForAccount(bankAcct))
    );
    j.push(clearEntry);
    registry[0] = { ...chqOut, status: "cleared" };
    check(
      ledger.entryBalances(clearEntry) &&
        eq(ledger.moneyAccountBalance(j, bankAcct), bankBefore - 30000) &&
        eq(glIssued(j), 0) && eq(glIssued(j), cheques.pendingOutTotal(registry)),
      "OUT clear: drawn-on account falls by exactly 30,000; bridge back to 0 == registry"
    );
  }

  /* ============ OUT bounce pre-clearing: payable re-opens ============ */
  {
    const j = [...journal];
    const registry = [];
    const purchase = { id: "pB5b", supplierId: "sup1", total: 30000, dayOffset: 0, ts: "2026-10-22T09:00:00.000Z" };
    const payments = [];
    j.push(purchaseEntryFor(purchase));
    const chqOut = mkCheque({
      id: "chqOut2", direction: "out", status: "issued", chequeNo: "990012", amount: 30000,
      partyId: "sup1", partyName: "Supplier One", partyKind: "supplier",
      sourceType: "supplier_payment", sourceId: "pay-b5b", accountId: "acc-bank",
    });
    const payRow = { id: "pay-b5b", supplierId: "sup1", amount: 30000, method: "bank", accountId: "acc-bank", instrument: "cheque", chequeId: "chqOut2", note: "", dayOffset: 0, ts: "2026-10-22T09:00:00.000Z" };
    j.push(chequePaymentEntryFor(payRow));
    payments.push(payRow);
    registry.push(chqOut);
    const bounceEntry = ledger.makeEntry(
      "Cheque bounced", "cheque_bounce", chqOut.id, cheques.bounceOutLines(chqOut)
    );
    j.push(bounceEntry);
    payments.push({ ...payRow, id: "pay-b5b-x", kind: "reversal", instrument: null, chequeId: null, note: "cheque bounced" });
    registry[0] = { ...chqOut, status: "bounced" };
    check(
      ledger.entryBalances(bounceEntry) && eq(ledger.supplierPaid(payments, "sup1"), 0),
      "OUT bounce: the reversal row nets supplierPaid back to 0 (the kind carries the sign)"
    );
    check(
      eq(payFor(j, "sup1"), 30000) &&
        eq(ledger.supplierBalance([purchase], payments, "sup1"), 30000) &&
        eq(ledger.payablesAging([purchase], payments).total, 30000),
      "OUT bounce: payable re-opens to the paisa in journal ≡ subledger ≡ aging (30,000)"
    );
    check(
      eq(glIssued(j), 0) && eq(glIssued(j), cheques.pendingOutTotal(registry)),
      "OUT bounce: bridge back to 0 == registry"
    );
  }

  /* ============ partial: cash + cheque; bounce reopens only the cheque ============ */
  {
    const j = [...journal];
    const purchase = { id: "pB5c", supplierId: "sup1", total: 30000, dayOffset: 0, ts: "2026-10-22T09:00:00.000Z" };
    const payments = [];
    j.push(purchaseEntryFor(purchase));
    const cashRow = { id: "pay-b5c1", supplierId: "sup1", amount: 10000, method: "cash", accountId: "acc-till", note: "", dayOffset: 0, ts: "2026-10-22T09:00:00.000Z" };
    j.push(cashPaymentEntryFor(cashRow));
    payments.push(cashRow);
    const chqRow = { id: "pay-b5c2", supplierId: "sup1", amount: 20000, method: "bank", accountId: "acc-bank", instrument: "cheque", chequeId: "chqOut3", note: "", dayOffset: 0, ts: "2026-10-22T09:00:00.000Z" };
    j.push(chequePaymentEntryFor(chqRow));
    payments.push(chqRow);
    const chqOut3 = mkCheque({
      id: "chqOut3", direction: "out", status: "issued", amount: 20000,
      partyId: "sup1", partyName: "Supplier One", partyKind: "supplier",
      sourceType: "supplier_payment", sourceId: "pay-b5c2", accountId: "acc-bank",
    });
    j.push(ledger.makeEntry("Cheque bounced", "cheque_bounce", chqOut3.id, cheques.bounceOutLines(chqOut3)));
    payments.push({ ...chqRow, id: "pay-b5c2-x", kind: "reversal", instrument: null, chequeId: null });
    check(
      eq(payFor(j, "sup1"), 20000) && eq(ledger.supplierBalance([purchase], payments, "sup1"), 20000),
      "partial: bouncing the 20,000 cheque re-opens exactly 20,000 — the 10,000 cash part stays settled"
    );
  }

  /* ============ two cheques on one bill: Σ identity under mix ============ */
  {
    const j = [...journal];
    const registry = [];
    const bill = { id: "bB5d", billNo: 504, customerId: "cust1", total: 25000, cost: 15000 };
    const cA = mkCheque({ id: "chqA", amount: 10000, partyId: "cust1", sourceType: "bill", sourceId: "bB5d" });
    const cB = mkCheque({ id: "chqB", amount: 15000, partyId: "cust1", sourceType: "bill", sourceId: "bB5d" });
    const recv0 = recvFor(j, "cust1");
    j.push(billEntryFor(bill, [
      { method: "bank", amount: 10000, instrument: "cheque", chequeId: "chqA" },
      { method: "bank", amount: 15000, instrument: "cheque", chequeId: "chqB" },
    ]));
    registry.push(cA, cB);
    const depA = { ...cA, status: "deposited", accountId: "acc-bank" };
    const depB = { ...cB, status: "deposited", accountId: "acc-bank" };
    registry[0] = depA;
    registry[1] = depB;
    j.push(ledger.makeEntry("Cheque cleared", "cheque_clearing", depA.id, cheques.clearingLines(depA, ledger.glForAccount(bankAcct))));
    registry[0] = { ...depA, status: "cleared" };
    j.push(ledger.makeEntry("Cheque bounced", "cheque_bounce", depB.id, cheques.bounceInLines(depB)));
    registry[1] = { ...depB, status: "bounced" };
    check(
      eq(glInHand(j), 0) && eq(glInHand(j), cheques.unclearedInTotal(registry)) &&
        eq(recvFor(j, "cust1"), recv0 + 15000),
      "mixed: one clears (+10,000 to the bank), one bounces (+15,000 receivable) — GL ≡ registry at 0"
    );
  }

  /* ================= transition refusal matrix ================= */
  {
    const inReceived = mkCheque({ id: "m1", status: "received" });
    const inDeposited = mkCheque({ id: "m2", status: "deposited", accountId: "acc-bank" });
    const outIssued = mkCheque({ id: "m3", direction: "out", status: "issued", sourceType: "supplier_payment" });
    const outExpense = mkCheque({ id: "m4", direction: "out", status: "issued", sourceType: "expense", partyKind: "expense" });
    check(
      !cheques.canChequeTransition(inReceived, "clear") && !cheques.canChequeTransition(inReceived, "bounce"),
      "refusals: clear-before-deposit and bounce-before-deposit refuse (the bank has not seen it)"
    );
    check(
      !cheques.canChequeTransition(outIssued, "deposit") && !cheques.canChequeTransition(inDeposited, "return"),
      "refusals: depositing an OUT cheque and returning a DEPOSITED cheque refuse"
    );
    check(
      cheques.canChequeTransition(outExpense, "clear") && !cheques.canChequeTransition(outExpense, "bounce"),
      "expense cheques: clearing is a registry action; bouncing is NOT (the F-5 expense path owns it)"
    );
  }

  /* ================= PDC due / overdue edges ================= */
  {
    const dueToday = mkCheque({ id: "d1", status: "received", dueDateISO: TODAY });
    const dueYesterday = mkCheque({ id: "d2", status: "deposited", dueDateISO: "2026-10-21" });
    const clearedOld = mkCheque({ id: "d3", status: "cleared", dueDateISO: "2026-10-01" });
    check(
      cheques.chequeIsDue(dueToday, TODAY) && !cheques.chequeIsOverdue(dueToday, TODAY),
      "PDC edge: due today is DUE, not overdue"
    );
    check(
      cheques.chequeIsOverdue(dueYesterday, TODAY) && !cheques.chequeIsOverdue(clearedOld, TODAY),
      "PDC edge: pending past due is overdue; a cleared cheque never is"
    );
  }

  /* ============ day close: instrument parts leave the cash buckets ============ */
  {
    const dc = ledger.dayCloseSummary({
      sales: [],
      bills: [{
        id: "bB5e", billNo: 505, dayOffset: 0, status: "paid",
        payments: [
          { method: "cash", amount: 5000 },
          { method: "bank", amount: 10000, instrument: "cheque", chequeId: "chqZ" },
        ],
      }],
      expenses: [
        { id: "e1", category: "rent", amount: 2000, method: "cash", dayOffset: 0, ts: "2026-10-22T09:00:00.000Z" },
        { id: "e2", category: "other", amount: 3000, method: "bank", instrument: "cheque", chequeId: "chqY", dayOffset: 0, ts: "2026-10-22T09:00:00.000Z" },
      ],
      credits: [
        mkCreditRow({ id: "rp1", kind: "repayment", amount: 4000, method: "cash" }),
        mkCreditRow({ id: "rp2", kind: "repayment", amount: 6000, method: "bank", instrument: "cheque", chequeId: "chqW" }),
      ],
      supplierPayments: [
        { id: "sp1", supplierId: "sup1", amount: 7000, method: "bank", instrument: "cheque", chequeId: "chqV", dayOffset: 0, ts: "2026-10-22T09:00:00.000Z" },
      ],
      returnsRefundCash: 0, cashIn: 0, cashOut: 0, openingCash: 0,
    });
    check(
      eq(dc.salesByMethod.cash, 5000) && eq(dc.salesByMethod.bank, 0),
      "day close: the cheque bill part is in NO method bucket (cash 5,000 only)"
    );
    check(
      eq(dc.creditReceived, 10000) && eq(dc.expectedCash, 5000 + 4000 - 2000),
      "day close: cheque repayment counts as received value but not as drawer cash (expected cash excludes it)"
    );
    check(
      eq(dc.expensesTotal, 5000) && eq(dc.expensesCash, 2000) && eq(dc.supplierPaidCash, 0),
      "day close: cheque expense counts in expensesTotal, leaves expensesCash; cheque supplier payment is not cash out"
    );
  }

  /* ================= RBAC: the cheques matrix row ================= */
  check(
    perm.can("owner", "cheques", "write") && perm.can("manager", "cheques", "write") &&
      perm.can("accountant", "cheques", "write") && perm.can("accountant", "cheques", "view"),
    "RBAC: owner / manager / accountant hold the cheques row in full"
  );
  check(
    !perm.can("cashier", "cheques", "view") && !perm.can("cashier", "cheques", "write"),
    "RBAC: the cashier has NO registry access (capture at the desk is the billing row's business)"
  );

  /* ================= source invariants ================= */
  const storeSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx", "utf8"
  );
  check(
    storeSrc.includes("depositCheque") && storeSrc.includes("cheques_issued") &&
      storeSrc.includes("compensatingCreditRow") && storeSrc.includes("commitChequeTransition"),
    "source: StoreProvider carries the cheque capture + lifecycle actions"
  );
  const rulesSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8"
  );
  const chqBlock = rulesSrc.slice(
    rulesSrc.indexOf("match /cheques/{chequeId}"),
    rulesSrc.indexOf("match /cheques/{chequeId}") + 400
  );
  check(
    chqBlock.includes("allow create: if canAccess(uid) && createInOpenPeriod(uid) && planPostable(uid);") &&
      chqBlock.includes("allow update: if hasRole(uid, ['owner', 'manager', 'accountant']);") &&
      rulesSrc.includes("R-B6"),
    "rules: cheques block = canAccess create (G-3, R-B6 noted) + matrix-row update + owner delete"
  );
}

suite("B6", null); // payment vouchers + prints (design §5, §9 B6)
{
  /* ---- numbering: the §1.3 max+1 pattern, RV-/PV- series ---- */
  check(docs.nextDocNumber("receiptVoucher", [], null) === "RV-1",
    "RV: empty series mints RV-1");
  check(docs.nextDocNumber("receiptVoucher", ["RV-1", "RV-2"], null) === "RV-3",
    "RV: sequence continues at max+1");
  check(docs.nextDocNumber("receiptVoucher", [null, undefined, "RV-3"], null) === "RV-4",
    "RV: unstamped (pre-B6) rows contribute no sequence");
  check(docs.nextDocNumber("paymentVoucher", ["PV-2"], null) === "PV-3",
    "PV: independent series, max+1");
  const overrideSettings = { docSeries: { receiptVoucher: "RCPT-" } };
  check(docs.nextDocNumber("receiptVoucher", [], overrideSettings) === "RCPT-1",
    "RV: owner prefix override applies to future mints");
  check(docs.nextDocNumber("receiptVoucher", ["RV-7"], overrideSettings) === "RCPT-8",
    "RV: sequence stays monotonic across a prefix change (stored numbers never rewritten)");

  /* ---- mixed workload: stamping replicates the store's two
   * expressions exactly (nextDocNumber over the subscribed rows,
   * stamped INSIDE the row the action writes). ---- */
  const wCredits = credits.map((c) => ({ ...c }));
  const wPayments = payments.map((p) => ({ ...p }));
  check(wCredits.filter((e) => e.kind === "repayment").every((e) => e.voucherNo == null),
    "legacy: seed repayment rows carry no voucherNo");
  check(wPayments.every((p) => p.voucherNo == null),
    "legacy: seed supplier payments carry no voucherNo");
  const stampRv = () => docs.nextDocNumber("receiptVoucher",
    wCredits.filter((e) => e.kind === "repayment").map((e) => e.voucherNo), null);
  const stampPv = () => docs.nextDocNumber("paymentVoucher",
    wPayments.map((p) => p.voucherNo), null);
  const minted = [];
  const repay = (amount) => {
    const row = { id: `cr-w${minted.length}`, customerId: "cu1", customerName: "W", customerPhone: "",
      kind: "repayment", amount, method: "cash", voucherNo: stampRv(), note: "", billId: null, dayOffset: 0, ts: "" };
    wCredits.push(row); minted.push(row.voucherNo); return row;
  };
  const pay = (amount) => {
    const row = { id: `sp-w${minted.length}`, supplierId: "su1", amount, method: "cash",
      voucherNo: stampPv(), note: "", dayOffset: 0, ts: "" };
    wPayments.push(row); minted.push(row.voucherNo); return row;
  };
  check(repay(5000).voucherNo === "RV-1", "workload: first repayment mints RV-1");
  check(pay(8000).voucherNo === "PV-1", "workload: first supplier payment mints PV-1");
  check(repay(2500).voucherNo === "RV-2", "workload: RV sequence independent of PV writes");
  // a cheque-bounce reversal row (B5) is written WITHOUT a stamp:
  wPayments.push({ id: "sp-rev", supplierId: "su1", amount: 8000, method: "bank", kind: "reversal", note: "", dayOffset: 0, ts: "" });
  check(pay(1000).voucherNo === "PV-2", "workload: unstamped reversal row does not disturb the PV sequence");
  check(repay(700).voucherNo === "RV-3", "workload: RV-3 next");
  check(new Set(minted).size === minted.length, "workload: every minted number unique across the mixed session");
  const wouldBe = stampRv();
  // (a posting refused by the guard writes nothing — the number is
  // computed again from stored rows, so the refusal burns nothing)
  check(stampRv() === wouldBe && repay(300).voucherNo === wouldBe,
    "no-burn: a refused posting's number is re-minted by the next successful repayment");
  check(wCredits.slice(0, credits.length).every((e) => e.voucherNo == null) &&
        wPayments.slice(0, payments.length).every((p) => p.voucherNo == null),
    "legacy: pre-B6 rows were never rewritten by the workload");

  /* ---- no journal writes anywhere in this increment ---- */
  check(journal.length === 21, "journal: still the frozen 21 seed entries after a voucher-only session");
  const tbNet = journal.reduce((a, e) => a + e.lines.reduce((x, l) => x + l.debit - l.credit, 0), 0);
  check(Math.abs(tbNet) < 0.005 && journal.every((e) => ledger.entryBalances(e)),
    "journal: trial balance still 0, every entry balanced");
  const storeSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx", "utf8");
  check((storeSrc.match(/makeEntry\(/g) || []).length === 24,
    "source: B6 added no makeEntry call (24 == pre-B6 count) — stamping posts nothing");
  check((storeSrc.match(/voucherNo: nextDocNumber\(/g) || []).length === 2 &&
        storeSrc.includes('"receiptVoucher"') && storeSrc.includes('"paymentVoucher"'),
    "source: exactly two stamp sites (addRepayment RV-, recordSupplierPayment PV-), inside the row writes");
  const rulesSrc6 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8");
  /* Phase C · C1 amended this check (same check, same count): the
   * rules file gained ADDITIVE C1 blocks (warehouses + stockLevels)
   * after B6. Stripping exactly those blocks must reproduce the
   * pre-B6 file byte-for-byte — the original SHA below — which
   * proves C1 changed NO existing rule line. */
  const c1Start6 = rulesSrc6.indexOf("      // Phase C · C1");
  const c1End6 = rulesSrc6.indexOf("      // Expenses:", c1Start6);
  const rulesStripped6 = c1Start6 >= 0 && c1End6 > c1Start6
    ? stripG1Blocks(stripG2Blocks(rulesSrc6.slice(0, c1Start6) + rulesSrc6.slice(c1End6)))
    : rulesSrc6;
  check(crypto.createHash("sha256").update(rulesStripped6, "utf8").digest("hex") ===
        "73177ac06f42d4a65ab68c6a7eb6f74e776c38da525742d90a77de0502436e87" &&
        !rulesSrc6.includes("match /vouchers"),
    "rules: byte-identical to pre-B6 outside the additive C1 blocks (no voucher collection, fields ride existing documents; G1 same-check amendment: the four G1 spans are stripped first — v9's only other deltas, strip-proven in the G1 suite)");

  /* ---- print data builders: figures EQUAL the source rows ---- */
  const rvRow = { id: "cr-x", customerId: "cu1", customerName: "Ahmed Raza", customerPhone: "0300-1",
    kind: "repayment", amount: 5000, method: "jazzcash", accountId: "acc-w",
    voucherNo: "RV-1", note: "part payment", billId: null, dayOffset: 0, ts: "2026-10-22T05:00:00.000Z" };
  const rv = docs.receiptVoucherData(rvRow, { accountName: "JazzCash Wallet", balanceAfter: 2500 });
  check(rv.kind === "receipt" && rv.number === "RV-1", "RV print: kind + stamped number");
  check(rv.amount === rvRow.amount && rv.method === "jazzcash" && rv.note === rvRow.note,
    "RV print: amount/method/note equal the source row exactly");
  check(rv.partyName === "Ahmed Raza" && rv.partyPhone === "0300-1" && rv.ts === rvRow.ts,
    "RV print: party snapshot + date from the row");
  check(rv.accountName === "JazzCash Wallet" && rv.balanceAfter === 2500,
    "RV print: account name resolved for display; balance-after is the caller-derived current balance");
  check(rv.instrument === null && rv.chequeNo === null && rv.chequeBank === null && rv.chequeDueDateISO === null,
    "RV print: a money repayment carries no cheque fields");
  const rvChq = docs.receiptVoucherData(
    { ...rvRow, method: "bank", accountId: null, instrument: "cheque", chequeId: "chq1", voucherNo: "RV-2" },
    { cheque: { chequeNo: "004512", bankName: "HBL", dueDateISO: "2026-11-01" }, balanceAfter: 0 });
  check(rvChq.instrument === "cheque" && rvChq.chequeNo === "004512" && rvChq.chequeBank === "HBL" &&
        rvChq.chequeDueDateISO === "2026-11-01" && rvChq.accountName === null,
    "RV print: a cheque repayment shows the instrument (number/bank/due date), no money account");
  const rvLegacy = docs.receiptVoucherData(
    { id: "cr-old", customerId: null, customerName: "Old", customerPhone: "", kind: "repayment",
      amount: 900, method: "cash", note: "", billId: null, dayOffset: 3, ts: "2026-10-01T00:00:00.000Z" },
    { balanceAfter: 100 });
  check(rvLegacy.number === null && rvLegacy.amount === 900,
    "RV print: a pre-B6 row prints UNNUMBERED without error (no fabricated history)");
  const pvRow = { id: "sp-x", supplierId: "su1", amount: 8000, method: "bank", accountId: "acc-b",
    voucherNo: "PV-2", note: "against Oct invoice", dayOffset: 0, ts: "2026-10-22T06:00:00.000Z" };
  const pv = docs.paymentVoucherData(pvRow, "Malik Traders", { accountName: "Main Bank", balanceAfter: 12000 });
  check(pv.kind === "payment" && pv.number === "PV-2" && pv.amount === pvRow.amount && pv.method === "bank",
    "PV print: kind/number/amount/method equal the source row exactly");
  check(pv.partyName === "Malik Traders" && pv.accountName === "Main Bank" && pv.balanceAfter === 12000 && pv.note === pvRow.note,
    "PV print: supplier name supplied by caller; account + current payable resolved for display");
  const pvChq = docs.paymentVoucherData(
    { ...pvRow, instrument: "cheque", chequeId: "chq9", voucherNo: "PV-3" },
    "Malik Traders",
    { cheque: { chequeNo: "778899", bankName: "MCB", dueDateISO: "2026-10-30" }, balanceAfter: 4000 });
  check(pvChq.instrument === "cheque" && pvChq.chequeNo === "778899" && pvChq.chequeDueDateISO === "2026-10-30",
    "PV print: an issued-cheque payment shows the instrument it settled with");
  const rvAgain = docs.receiptVoucherData(rvRow, { accountName: "JazzCash Wallet", balanceAfter: 2500 });
  check(JSON.stringify(rvAgain) === JSON.stringify(rv),
    "print builders are language-neutral: identical figures in EN and UR modes (labels are dictionary-side)");

  /* ---- i18n: every B6 key exists in BOTH dictionaries ---- */
  const docsI18n = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/lib/i18n/parts/docs.ts", "utf8");
  const twice = (k) => (docsI18n.match(new RegExp(`"${k.replace(/\./g, "\\.")}"`, "g")) || []).length === 2;
  check(["voucher.receiptTitle", "voucher.paymentTitle", "voucher.balanceAfterCustomer",
         "voucher.balanceAfterSupplier", "voucher.signature"].every(twice),
    "i18n: all voucher.* keys present in EN and UR");
  check(["quote.wa.title", "quote.wa.estTax", "quote.wa.validUntil"].every(twice),
    "i18n: all quote.wa.* keys present in EN and UR");
}

suite("SEARCH", 72);
{
  const refProductPred = (s) => (p) => {
    const q = s.trim().toLowerCase();
    return p.name.toLowerCase().includes(q) || p.urduName.includes(s.trim()) || p.sku.toLowerCase().includes(q);
  };
  const refInvPred = (s) => (p) => {
    const q = s.trim().toLowerCase();
    return p.name.toLowerCase().includes(q) || p.urduName.includes(s.trim()) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  };
  const refCustPred = (s) => (c) => {
    const q = s.trim().toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(s.trim()) || c.address.toLowerCase().includes(q);
  };
  const ids = (arr) => arr.map((x) => x.id).join(",");

  /* (a) equivalence on well-formed seed data */
  for (const q of ["tapal", "TEA", "چائے", "oil", "rice", "salt", "zzz", "", "  "]) {
    check(
      ids(products.filter(refProductPred(q))) === ids(search.filterProducts(products, q)),
      `product equivalence for query ${JSON.stringify(q)}`
    );
  }
  for (const q of ["beverages", "oil", "zzz"]) {
    check(
      ids(products.filter(refInvPred(q))) === ids(search.filterProducts(products, q, true)),
      `inventory (with category) equivalence for query ${JSON.stringify(q)}`
    );
  }
  for (const q of ["a", "0300", "zzz", ""]) {
    check(
      ids(customers.filter(refCustPred(q))) ===
        ids(customers.filter((c) => search.customerMatches(c, q))),
      `customer equivalence for query ${JSON.stringify(q)}`
    );
  }

  /* findProductBySku (billing desk SKU entry) */
  const tapal = products.find((p) => p.name.includes("Tapal"));
  check(search.findProductBySku(products, tapal.sku.toLowerCase()) === tapal, "SKU lookup: exact hit, case-insensitive");
  check(search.findProductBySku(products, "NO-SUCH-SKU") === undefined, "SKU lookup: miss is undefined");
  check(search.findProductBySku(products, "   ") === undefined, "SKU lookup: blank code is undefined");

  /* (b) legacy field-missing products */
  const noUrdu = { id: "L1", name: "Old Tea", sku: "OLD-1", category: "General" };
  const noSku = { id: "L2", name: "Old Rice", urduName: "پرانا چاول", category: "General" };
  const noCat = { id: "L3", name: "Old Oil", urduName: "پرانا تیل", sku: "OLD-3" };
  const noName = { id: "L4", urduName: "بے نام", sku: "OLD-4", category: "General" };
  const nullFields = { id: "L5", name: "Null Fields", urduName: null, sku: null, category: null };
  const numericSku = { id: "L6", name: "Numeric SKU", urduName: "", sku: 12345, category: "General" };
  const legacy = [noUrdu, noSku, noCat, noName, nullFields, numericSku];

  check(ids(search.filterProducts(legacy, "old tea")) === "L1", "missing urduName: still found by name");
  check(ids(search.filterProducts(legacy, "old-1")) === "L1", "missing urduName: still found by sku");
  check(search.filterProducts(legacy, "zzz").length === 0, "mixed legacy list: non-matching query returns [] without throwing");
  check(ids(search.filterProducts(legacy, "پرانا چاول")) === "L2", "missing sku: still found by urduName");
  check(ids(search.filterProducts(legacy, "old oil")) === "L3", "missing category: found by name (category search on)");
  check(search.filterProducts(legacy, "zzz", true).length === 0, "missing category: category search never throws");
  check(ids(search.filterProducts(legacy, "بے نام")) === "L4", "missing name: still found by urduName");
  check(ids(search.filterProducts(legacy, "old-4")) === "L4", "missing name: still found by sku");
  check(ids(search.filterProducts(legacy, "null fields")) === "L5", "null fields: found by name");
  check(search.filterProducts([nullFields], "zzz").length === 0, "null fields: non-matching query never throws");
  check(ids(search.filterProducts(legacy, "12345")) === "L6", "numeric sku coerced: found by its digits");
  check(
    ids(search.filterProducts([tapal, noUrdu], "zzz")) === "" &&
      ids(search.filterProducts([tapal, noUrdu], "tapal")) === tapal.id,
    "one field-missing doc no longer poisons the whole list"
  );
  check(search.findProductBySku(legacy, "OLD-3") === noCat, "SKU lookup across sku-less docs still hits");
  check(search.findProductBySku(legacy, "OLD-9") === undefined, "SKU lookup across sku-less docs: miss is undefined");

  /* legacy customers */
  const custNoAddr = { id: "c9", name: "Bilal Ahmad", phone: "03219998877" };
  const custNoPhone = { id: "c10", name: "Sana", address: "Farooka Bazaar" };
  check(search.customerMatches(custNoAddr, "bilal") === true, "customer missing address: found by name");
  check(search.customerMatches(custNoAddr, "0321") === true, "customer missing address: found by phone");
  check(search.customerMatches(custNoAddr, "zzz") === false, "customer missing address: miss never throws");
  check(search.customerMatches(custNoPhone, "bazaar") === true, "customer missing phone: found by address");

  /* legacy bills (history search) */
  const billNoPhone = { billNo: 102, customerName: "Walk-in Customer" };
  const billNoName = { billNo: 103, customerPhone: "03112223334" };
  check(search.billMatches(billNoPhone, "walk-in") === true, "bill missing phone: found by customer name");
  check(search.billMatches(billNoPhone, "102") === true, "bill missing phone: found by bill number");
  check(search.billMatches(billNoPhone, "zzz") === false, "bill missing phone: miss never throws");
  check(search.billMatches(billNoName, "0311") === true, "bill missing name: found by phone");

  /* credit groups + generic document matching */
  check(search.creditGroupMatches({ name: "Haji Sahib" }, "haji") === true, "credit group missing phone: found by name");
  check(search.creditGroupMatches({ name: "Haji Sahib" }, "zzz") === false, "credit group missing phone: miss never throws");
  check(search.matchesAny("ahmed", [null, "Ahmed Raza", undefined]) === true, "document match: null number skipped, name hits");
  check(search.matchesAny("zzz", [undefined, null]) === false, "document match: all fields absent is a miss, not a throw");
  check(search.matchesAny("", [undefined]) === true, "document match: blank query matches (early-return parity)");

  /* adjustments */
  const adjNoNote = { productName: "Tapal Tea", reason: "damage" };
  check(search.adjustmentMatches(adjNoNote, "tapal") === true, "adjustment missing note: found by product");
  check(search.adjustmentMatches(adjNoNote, "damage") === true, "adjustment missing note: found by reason");
  check(search.adjustmentMatches(adjNoNote, "zzz") === false, "adjustment missing note: miss never throws");

  /* suppliers — the deferred SuppliersManager fix (B4 release) */
  const refSuppPred = (s) => (x) => {
    const q = s.trim().toLowerCase();
    return x.name.toLowerCase().includes(q) || x.company.toLowerCase().includes(q) || x.phone.includes(s.trim());
  };
  const seedSuppliers = seed.getSeedSuppliers();
  for (const q of ["malik", "0300", "tea", "zzz", ""]) {
    check(
      ids(seedSuppliers.filter(refSuppPred(q))) ===
        ids(seedSuppliers.filter((x) => search.supplierMatches(x, q))),
      `supplier equivalence for query ${JSON.stringify(q)}`
    );
  }
  const supNoCompany = { id: "sL1", name: "Bilal Sons", phone: "0311-5556667" };
  const supNoPhone = { id: "sL2", name: "Chenab Foods", company: "Chenab Foods (Pvt) Ltd" };
  const supNull = { id: "sL3", name: null, company: null, phone: null };
  check(search.supplierMatches(supNoCompany, "bilal") === true, "supplier missing company: found by name");
  check(search.supplierMatches(supNoCompany, "0311") === true, "supplier missing company: found by phone");
  check(search.supplierMatches(supNoCompany, "zzz") === false, "supplier missing company: miss never throws");
  check(search.supplierMatches(supNoPhone, "chenab foods (pvt)") === true, "supplier missing phone: found by company");
  check(search.supplierMatches(supNull, "zzz") === false, "supplier null fields: miss never throws");
  check(
    ids([seedSuppliers[0], supNoCompany].filter((x) => search.supplierMatches(x, "malik"))) === "sup-1" &&
      [seedSuppliers[0], supNoCompany].filter((x) => search.supplierMatches(x, "zzz")).length === 0,
    "one field-missing supplier no longer poisons the whole list"
  );

  /* notes — the deferred NotesViews fix (B4 release). The component
   * predicate IS matchesAny(query, [n.number, n.partyName, n.billNo]),
   * so these checks exercise that exact call shape. */
  const refNotePred = (s) => (n) => {
    const q = s.trim().toLowerCase();
    if (!q) return true;
    return (
      n.number.toLowerCase().includes(q) ||
      n.partyName.toLowerCase().includes(q) ||
      (n.billNo != null && String(n.billNo).includes(q))
    );
  };
  const notePred = (n, q) => search.matchesAny(q, [n.number, n.partyName, n.billNo]);
  const wellNotes = [
    { id: "n1", number: "CN-1", partyName: "Ahmed Raza", billNo: 105 },
    { id: "n2", number: "DN-2", partyName: "Malik Traders", billNo: null },
  ];
  for (const q of ["cn-", "malik", "105", "zzz"]) {
    check(
      ids(wellNotes.filter(refNotePred(q))) === ids(wellNotes.filter((n) => notePred(n, q))),
      `note equivalence for query ${JSON.stringify(q)}`
    );
  }
  const noteNoBill = { number: "CN-1", partyName: "Ahmed Raza" };
  const noteNumericBill = { number: "DN-2", partyName: "Malik Traders", billNo: 105 };
  const noteNullBill = { number: "CN-9", partyName: "Walk-in Customer", billNo: null };
  check(notePred(noteNoBill, "cn-1") === true, "note missing billNo: found by number");
  check(notePred(noteNoBill, "ahmed") === true, "note missing billNo: found by party name");
  check(notePred(noteNoBill, "zzz") === false, "note missing billNo: miss never throws");
  check(notePred(noteNumericBill, "105") === true, "note numeric billNo: coerced and found by bill number");
  check(notePred(noteNullBill, "105") === false, "note null billNo: bill-number query is a miss, not a throw");
  check(notePred(noteNullBill, "walk-in") === true, "note null billNo: found by party name");

  /* source invariants: the two components delegate to lib/search */
  const suppSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/SuppliersManager.tsx", "utf8"
  );
  check(
    suppSrc.includes("supplierMatches(s, search)") && !suppSrc.includes("s.company.toLowerCase()"),
    "source: SuppliersManager delegates its search to supplierMatches (no raw predicate left)"
  );
  const notesSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/NotesViews.tsx", "utf8"
  );
  check(
    notesSrc.includes("matchesAny(query, [n.number, n.partyName, n.billNo])") &&
      !notesSrc.includes("n.partyName.toLowerCase()"),
    "source: NotesViews delegates its search to matchesAny (no raw predicate left)"
  );
}

suite("REPORTS", null); // Reports section — report == screen identities
{
  const R = reports;
  const FULL = {
    fromDate: "2000-01-01",
    toDate: "2999-12-31",
    fromTs: "2000-01-01T00:00:00.000Z",
    toTs: "2999-01-01T00:00:00.000Z",
  };
  const settings = seed.getSeedSettings();
  const rProducts = seed.getSeedProducts();
  const rSales = seed.getSeedSales();
  const rPurchases = seed.getSeedPurchases();
  const rPayments = seed.getSeedSupplierPayments();
  const rExpenses = seed.getSeedExpenses();
  const rCredits = seed.getSeedCredits();
  const rSuppliers = seed.getSeedSuppliers();
  const rAccounts = seed.getSeedAccounts();
  const rJournal = seed.getSeedJournal(
    rProducts, rSales, rPurchases, rPayments, rExpenses, rCredits
  );

  /* ---- ranges: presets, FY boundary, inclusivity edges ---- */
  const oct = R.resolveReportRange("custom", settings, { from: "2026-10-01", to: "2026-10-31" });
  check(oct.fromTs === periods.startOfDayPktInstant("2026-10-01"), "range: custom fromTs is the PKT start of the from-date");
  check(oct.toTs === periods.startOfDayPktInstant("2026-11-01"), "range: custom toTs is the PKT start of the day AFTER the to-date");
  check(R.inRange(oct.fromTs, oct) === true, "range: fromTs instant itself is included");
  check(R.inRange(oct.toTs, oct) === false, "range: toTs instant itself is excluded (half-open)");
  check(R.inRange(periods.endOfDayPktInstant("2026-10-31"), oct) === true, "range: the to-date's last PKT instant is included");
  const fy = periods.currentFiscalYear(settings);
  const fyRange = R.resolveReportRange("fiscal", settings);
  check(fyRange.fromDate === fy.startDate && fyRange.toDate === fy.endDate,
    "range: fiscal preset == currentFiscalYear (A5)");
  check(R.inRange(fy.fromTs, fyRange) === true && R.inRange(fy.toTs, fyRange) === false,
    "range: FY boundary — first instant in, first instant of next FY out");
  const todayR = R.resolveReportRange("today", settings);
  check(todayR.fromDate === periods.todayPktISO() && todayR.toDate === todayR.fromDate,
    "range: today preset is the single PKT business date");
  const weekR = R.resolveReportRange("week", settings);
  const [wy, wm, wd] = weekR.fromDate.split("-").map(Number);
  check(new Date(Date.UTC(wy, wm - 1, wd)).getUTCDay() === 1, "range: week starts on a Monday");
  check(periods.addDaysISO(weekR.fromDate, 6) === weekR.toDate, "range: week spans 7 days");
  const monthR = R.resolveReportRange("month", settings);
  check(monthR.fromDate.endsWith("-01") && periods.addDaysISO(monthR.toDate, 1).endsWith("-01"),
    "range: month runs 1st to the month's last day");

  /* ---- P&L identity: report == FinanceView's computation ---- */
  const plFull = R.plReport(rJournal, FULL);
  const plRef = ledger.profitAndLossInRange(rJournal, FULL.fromTs, FULL.toTs);
  check(
    eq(plFull.revenue, plRef.revenue) && eq(plFull.cogs, plRef.cogs) &&
    eq(plFull.grossProfit, plRef.grossProfit) && eq(plFull.net, plRef.net) &&
    eq(plFull.expensesTotal, plRef.expensesTotal),
    "P&L: report == profitAndLossInRange over the same window (the Finance FY path)"
  );
  const plFy = R.plReport(rJournal, fyRange);
  const plFyRef = ledger.profitAndLossInRange(rJournal, fy.fromTs, fy.toTs);
  check(eq(plFy.net, plFyRef.net) && eq(plFy.revenue, plFyRef.revenue),
    "P&L: report over the fiscal range == FinanceView's fiscal-year P&L");
  const miniJournal = [
    ledger.makeEntry("sale", "sale", null, [
      { account: "cash", debit: 1000, credit: 0 },
      { account: "cogs", debit: 600, credit: 0 },
      { account: "sales_revenue", debit: 0, credit: 1000 },
      { account: "inventory", debit: 0, credit: 600 },
    ], { ts: "2026-10-05T10:00:00.000Z" }),
    ledger.makeEntry("rent", "expense", null, [
      { account: "expense_rent", debit: 200, credit: 0 },
      { account: "cash", debit: 0, credit: 200 },
    ], { ts: "2026-10-06T10:00:00.000Z" }),
    ledger.makeEntry("later sale", "sale", null, [
      { account: "cash", debit: 5000, credit: 0 },
      { account: "sales_revenue", debit: 0, credit: 5000 },
    ], { ts: "2026-11-02T10:00:00.000Z" }),
  ];
  const plMini = R.plReport(miniJournal, oct);
  check(
    eq(plMini.revenue, 1000) && eq(plMini.cogs, 600) && eq(plMini.grossProfit, 400) &&
    eq(plMini.expensesTotal, 200) && eq(plMini.net, 200),
    "P&L: hand-computed mini journal (out-of-range entry excluded)"
  );

  /* ---- tax identity: per-slab totals == taxPosition movement ---- */
  const slabFields = {
    taxSlabId: "gst", taxSlabName: "GST", taxRate: 17,
    taxKind: "percent", taxInclusive: false,
  };
  const taxBills = [
    { id: "tb1", billNo: 1, customerId: "c1", customerName: "A", customerPhone: "",
      items: [{ productId: "p1", name: "Tea", qty: 10, unitPrice: 100, unitCost: 60, total: 1000, taxAmount: 170, ...slabFields }],
      subtotal: 1000, discountType: "flat", discountValue: 0, discountAmount: 0,
      taxAmount: 170, total: 1170, payments: [], status: "paid", dayOffset: 0, ts: "2026-10-03T09:00:00.000Z" },
    { id: "tb2", billNo: 2, customerId: "c1", customerName: "A", customerPhone: "",
      items: [{ productId: "p1", name: "Tea", qty: 5, unitPrice: 100, unitCost: 60, total: 500, taxAmount: 500, ...slabFields }],
      subtotal: 500, discountType: "flat", discountValue: 0, discountAmount: 0,
      taxAmount: 500, total: 1000, payments: [], status: "voided", dayOffset: 0, ts: "2026-10-04T09:00:00.000Z" },
    { id: "tb3", billNo: 3, customerId: "c1", customerName: "A", customerPhone: "",
      items: [{ productId: "p1", name: "Tea", qty: 3, unitPrice: 100, unitCost: 60, total: 300, taxAmount: 300, ...slabFields }],
      subtotal: 300, discountType: "flat", discountValue: 0, discountAmount: 0,
      taxAmount: 300, total: 600, payments: [], status: "held", dayOffset: 0, ts: "2026-10-04T10:00:00.000Z" },
  ];
  const taxReturns = [
    { id: "tr1", billId: "tb1", billNo: 1,
      items: [{ productId: "p1", name: "Tea", qty: 2, unitPrice: 100, unitCost: 60, total: 200, taxAmount: 34, ...slabFields }],
      refundAmount: 234, method: "cash", dayOffset: 0, ts: "2026-10-05T09:00:00.000Z" },
  ];
  const taxPurchases = [
    { id: "tp1", supplierId: "s1",
      items: [{ productId: "p1", name: "Tea", qty: 5, unitCost: 200, total: 1000, taxAmount: 170, ...slabFields }],
      total: 1170, netTotal: 1000, taxAmount: 170, note: "", dayOffset: 0, ts: "2026-10-03T08:00:00.000Z" },
  ];
  const taxPReturns = [
    { id: "tpr1", purchaseId: "tp1", supplierId: "s1",
      items: [{ productId: "p1", name: "Tea", qty: 1, unitCost: 200, total: 200, taxAmount: 34, ...slabFields }],
      payableOffset: 234, refundAmount: 0, method: null, accountId: null, dayOffset: 0, ts: "2026-10-06T08:00:00.000Z" },
  ];
  const taxJournal = [
    ledger.makeEntry("bill", "sale", "tb1", [
      { account: "cash", debit: 1170, credit: 0 },
      { account: "sales_revenue", debit: 0, credit: 1000 },
      { account: "tax_payable", debit: 0, credit: 170 },
    ], { ts: "2026-10-03T09:00:00.000Z" }),
    ledger.makeEntry("return", "return", "tb1", [
      { account: "sales_revenue", debit: 200, credit: 0 },
      { account: "tax_payable", debit: 34, credit: 0 },
      { account: "cash", debit: 0, credit: 234 },
    ], { ts: "2026-10-05T09:00:00.000Z" }),
    ledger.makeEntry("purchase", "purchase", "tp1", [
      { account: "inventory", debit: 1000, credit: 0 },
      { account: "tax_input", debit: 170, credit: 0 },
      { account: "payables", debit: 0, credit: 1170 },
    ], { ts: "2026-10-03T08:00:00.000Z" }),
    ledger.makeEntry("purchase return", "purchase_return", "tpr1", [
      { account: "payables", debit: 234, credit: 0 },
      { account: "inventory", debit: 0, credit: 200 },
      { account: "tax_input", debit: 0, credit: 34 },
    ], { ts: "2026-10-06T08:00:00.000Z" }),
    ledger.makeEntry("old sale", "sale", null, [
      { account: "cash", debit: 1999, credit: 0 },
      { account: "sales_revenue", debit: 0, credit: 1000 },
      { account: "tax_payable", debit: 0, credit: 999 },
    ], { ts: "2026-09-15T09:00:00.000Z" }),
  ];
  const taxRep = R.taxReport(taxBills, taxReturns, taxPurchases, taxPReturns, oct);
  check(eq(taxRep.outputTotal, 136), "tax: output = bill tax 170 − return share 34 (voided/held bills excluded)");
  check(eq(taxRep.inputTotal, 136), "tax: input = purchase tax 170 − purchase-return share 34");
  check(eq(taxRep.net, 0), "tax: net position over the period");
  check(taxRep.rows.length === 1 && taxRep.rows[0].name === "GST" &&
    eq(taxRep.rows[0].output, 136) && eq(taxRep.rows[0].input, 136),
    "tax: per-slab row carries both sides for GST 17%");
  const taxPosInRange = tax.taxPosition(taxJournal.filter((e) => R.inRange(e.ts, oct)));
  check(eq(taxRep.outputTotal, taxPosInRange.outputTax),
    "tax identity: report output == taxPosition(journal in range).outputTax");
  check(eq(taxRep.inputTotal, taxPosInRange.inputTax),
    "tax identity: report input == taxPosition(journal in range).inputTax");
  check(eq(taxRep.net, taxPosInRange.netPayable),
    "tax identity: report net == taxPosition(journal in range).netPayable");

  /* ---- stock identity ---- */
  const stockRep = R.stockReport(rProducts);
  check(eq(stockRep.totalValue, selectors.stockValue(rProducts)),
    "stock identity: report valuation == stockValue(products)");
  check(eq(stockRep.totalValue, sum(rProducts.map((p) => p.stockQty * p.costPrice))),
    "stock: valuation == hand-summed qty × cost");
  check(
    JSON.stringify(stockRep.low.map((p) => p.id)) ===
    JSON.stringify(selectors.lowStockProducts(rProducts).map((p) => p.id)),
    "stock identity: low-stock list == lowStockProducts (the Inventory screen's derivation)"
  );
  check(
    JSON.stringify(stockRep.expiring.map((p) => p.id)) ===
    JSON.stringify(selectors.expiringProducts(rProducts, 30).map((p) => p.id)),
    "stock identity: near-expiry list == expiringProducts(products, 30)"
  );

  /* ---- aging identity ---- */
  const agingRep = R.agingReport(rCredits, rPurchases, rPayments, []);
  const recRef = ledger.receivablesAging(rCredits);
  const payRef = ledger.payablesAging(rPurchases, rPayments, []);
  check(
    eq(agingRep.receivables.current, recRef.current) && eq(agingRep.receivables.mid, recRef.mid) &&
    eq(agingRep.receivables.old, recRef.old) && eq(agingRep.receivables.total, recRef.total),
    "aging identity: receivables == receivablesAging (FinanceView)"
  );
  check(
    eq(agingRep.payables.current, payRef.current) && eq(agingRep.payables.mid, payRef.mid) &&
    eq(agingRep.payables.old, payRef.old) && eq(agingRep.payables.total, payRef.total),
    "aging identity: payables == payablesAging (FinanceView, B4-amended)"
  );

  /* ---- customer statement identity ---- */
  const custKeys = [...new Set(rCredits.map((c) => ledger.creditKey(c)))];
  check(custKeys.length > 0, "customer statement: seed carries credit keys");
  for (const key of custKeys) {
    const st = R.customerStatement(rCredits, key, FULL);
    check(eq(st.closing, ledger.customerOutstanding(rCredits, key)),
      `customer identity: full-range closing == customerOutstanding (${key})`);
    check(eq(st.opening, 0), `customer statement: full-range opening is 0 (${key})`);
  }
  {
    // Sub-range: opening must equal the outstanding of the pre-range rows.
    const key = custKeys[0];
    const rows = rCredits.filter((c) => ledger.creditKey(c) === key)
      .sort((a, b) => a.ts.localeCompare(b.ts));
    if (rows.length >= 2) {
      const midTs = rows[1].ts;
      const sub = { ...FULL, fromTs: midTs };
      const st = R.customerStatement(rCredits, key, sub);
      const preRows = rCredits.filter((c) => c.ts < midTs);
      check(eq(st.opening, ledger.customerOutstanding(preRows, key)),
        "customer statement: sub-range opening == outstanding of pre-range rows");
      check(eq(st.closing, ledger.customerOutstanding(rCredits, key)),
        "customer statement: sub-range closing still lands on the full outstanding");
    } else {
      check(true, "customer statement: sub-range fixture skipped (single-row key)");
    }
  }

  /* ---- supplier statement identity ---- */
  for (const s of rSuppliers) {
    const st = R.supplierStatement(rPurchases, rPayments, [], s.id, FULL);
    check(eq(st.closing, ledger.supplierBalance(rPurchases, rPayments, s.id, [])),
      `supplier identity: full-range closing == supplierBalance (${s.id})`);
  }
  {
    const ps = [{ id: "fp1", supplierId: "fs1",
      items: [{ productId: "p1", name: "Tea", qty: 10, unitCost: 1000, total: 10000 }],
      total: 10000, note: "", dayOffset: 0, ts: "2026-10-02T08:00:00.000Z" }];
    const pays = [{ id: "fpay1", supplierId: "fs1", amount: 4000, method: "cash",
      note: "", dayOffset: 0, ts: "2026-10-03T08:00:00.000Z" }];
    const rets = [{ id: "fr1", purchaseId: "fp1", supplierId: "fs1", items: [],
      payableOffset: 3000, refundAmount: 1000, method: "cash", accountId: null,
      dayOffset: 0, ts: "2026-10-04T08:00:00.000Z" }];
    const st = R.supplierStatement(ps, pays, rets, "fs1", oct);
    check(eq(ledger.supplierBalance(ps, pays, "fs1", rets), 3000),
      "supplier fixture: supplierBalance with an offset+refund return is 3,000");
    check(eq(st.closing, 3000), "supplier identity: statement closing == supplierBalance (with purchase return)");
    check(
      JSON.stringify(st.events.map((e) => e.balance)) === JSON.stringify([10000, 6000, 3000]),
      "supplier statement: running balances step +purchase −payment −offset (refund un-pays, never double-settles)"
    );
    check(eq(st.returnedInPeriod, 4000), "supplier statement: returned gross = offset + refund");
  }

  /* ---- cash book / account statement identity ---- */
  const till = rAccounts.find((a) => a.legacyFor === "cash");
  check(!!till, "cashbook fixture: seed has a legacy cash account");
  if (till) {
    const st = R.accountStatement(rJournal, rAccounts, till.id, FULL);
    check(eq(st.closing ?? NaN, ledger.moneyAccountBalance(rJournal, till)),
      "cashbook identity: statement closing == moneyAccountBalance (FinanceView)");
    check(eq(st.opening ?? NaN, 0) && eq((st.totalIn - st.totalOut), st.closing ?? NaN),
      "cashbook: full-range opening 0 and in − out == closing");
    const all = R.accountStatement(rJournal, rAccounts, null, FULL);
    check(all.rows.length === ledger.cashBook(rJournal).length && all.opening === null,
      "cashbook identity: combined book rows == cashBook(journal) rows");
  }

  /* ---- sales report: netting + legacy safety ---- */
  {
    const prods = [{ id: "p1", name: "Tea", urduName: "", sku: "T1", category: "grocery",
      unit: "packet", costPrice: 60, salePrice: 100, stockQty: 50, reorderLevel: 5 }];
    const billsF = [{ id: "b1", billNo: 7, customerId: "c1", customerName: "Ahmed",
      customerPhone: "0300", items: [], subtotal: 0, discountType: "flat",
      discountValue: 0, discountAmount: 0, total: 0, payments: [], status: "paid",
      dayOffset: 0, ts: "2026-10-03T09:00:00.000Z" }];
    const salesF = [
      { id: "s1", productId: "p1", qty: 3, unitPrice: 100, unitCost: 60, total: 300, billId: "b1", kind: "sale", dayOffset: 0, ts: "2026-10-03T09:00:00.000Z" },
      { id: "s2", productId: "p1", qty: -1, unitPrice: 100, unitCost: 60, total: -100, billId: "b1", kind: "return", dayOffset: 0, ts: "2026-10-04T09:00:00.000Z" },
      { id: "s3", productId: "p1", qty: 2, unitPrice: 100, total: 200, dayOffset: 0, ts: "2026-10-05T09:00:00.000Z" }, // legacy: no unitCost, no billId, no kind
      { id: "s4", productId: "gone", qty: 1, unitPrice: 50, total: 50, dayOffset: 0, ts: "2026-10-05T10:00:00.000Z" }, // product deleted since
      { id: "s5", productId: "p1", qty: 9, unitPrice: 100, unitCost: 60, total: 900, dayOffset: 0, ts: "2026-11-05T09:00:00.000Z" }, // out of range
    ];
    const rep = R.salesReport(salesF, prods, billsF, oct);
    check(eq(rep.grossSales, 550) && eq(rep.returnsTotal, -100) && eq(rep.netSales, 450),
      "sales: gross / returns / net — returns netted as negative rows, exactly as the Sales screen sums them");
    check(eq(rep.netUnits, 5), "sales: net units count returns against sales");
    check(eq(rep.grossProfit, 160), "sales: profit = snapshot margins, legacy row falls back to product cost, missing product contributes 0 — never throws");
    const cust = Object.fromEntries(rep.byCustomer.map((r) => [r.key, r.amount]));
    check(eq(cust["c1"], 200) && eq(cust["walk-in"], 250),
      "sales: by-customer attributes bill rows to the bill's customer, counter rows to walk-in");
    const again = R.salesReport(salesF, prods, billsF, oct);
    check(JSON.stringify(again) === JSON.stringify(rep),
      "sales: builder is deterministic (language-free figures — EN and UR outputs cannot drift)");
  }

  /* ---- purchases / expenses / notes / cheques / day-close ---- */
  {
    const rep = R.purchaseReport(rPurchases, [], rSuppliers, FULL);
    check(eq(rep.gross, sum(rPurchases.map((p) => p.total))) && eq(rep.net, rep.gross),
      "purchases: gross == Σ purchase.total over the seed, no returns seeded");
    const legacy = R.purchaseReport(
      [{ id: "lp", supplierId: "s1", items: [], total: 700, note: "", dayOffset: 0, ts: "2026-10-02T00:00:00.000Z" }],
      [], [], oct);
    check(eq(legacy.goodsNet, 700) && eq(legacy.taxTotal, 0),
      "purchases: legacy row without netTotal/taxAmount reads net == total, tax 0 — never throws");
  }
  {
    const rep = R.expensesReport(rExpenses, FULL);
    check(eq(rep.total, ledger.expenseTotal(rExpenses)),
      "expenses identity: report total == expenseTotal (Expenses screen)");
    check(eq(sum(rep.byCategory.map((g) => g.amount)), rep.total),
      "expenses: category groups sum back to the total");
  }
  {
    const closes = [
      { id: "dc1", dateISO: "2026-10-03", openingCash: 0, salesByMethod: { cash: 1000, jazzcash: 500 },
        expensesTotal: 100, creditGiven: 200, creditReceived: 50, supplierPaid: 300,
        expectedCash: 900, countedCash: 890, difference: -10, note: "", dayOffset: 0, ts: "2026-10-03T20:00:00.000Z" },
      { id: "dc2", dateISO: "2026-11-03", openingCash: 0, salesByMethod: { cash: 7000 },
        expensesTotal: 0, creditGiven: 0, creditReceived: 0, supplierPaid: 0,
        expectedCash: 7000, countedCash: 7000, difference: 0, note: "", dayOffset: 0, ts: "2026-11-03T20:00:00.000Z" },
      { id: "dc3", dateISO: "2026-10-04", openingCash: 0, // legacy: no salesByMethod
        expensesTotal: 0, creditGiven: 0, creditReceived: 0, supplierPaid: 0,
        expectedCash: 0, countedCash: 0, difference: 0, note: "", dayOffset: 0, ts: "2026-10-04T20:00:00.000Z" },
    ];
    const rep = R.dayCloseReport(closes, oct);
    check(rep.rows.length === 2 && eq(rep.totals.sales, 1500) && eq(rep.totals.difference, -10),
      "day-close: only the period's closes, sales summed across methods, missing salesByMethod reads 0");
  }
  {
    const notesF = [
      { id: "n1", number: "CN-1", kind: "credit", returnId: "r1", billId: "b1", billNo: 7,
        purchaseId: null, partyId: "c1", partyName: "Ahmed", items: [], goodsAmount: 800,
        taxAmount: 136, total: 936, settlement: "cash_refund", journalEntryId: "j1",
        reason: "", status: "posted", dayOffset: 0, ts: "2026-10-05T09:00:00.000Z" },
      { id: "n2", number: "DN-1", kind: "debit", returnId: "r2", billId: null, billNo: null,
        purchaseId: "p1", partyId: "s1", partyName: "Supplier Co", items: [], goodsAmount: 500,
        taxAmount: 85, total: 585, settlement: "payable_offset", journalEntryId: "j2",
        reason: "", status: "posted", dayOffset: 0, ts: "2026-10-06T09:00:00.000Z" },
    ];
    const rep = R.notesReport(notesF, oct);
    check(rep.credit.count === 1 && eq(rep.credit.total, 936) && rep.debit.count === 1 && eq(rep.debit.goods, 500),
      "notes: credit/debit sides totalled from the notes' own stamped figures");
  }
  {
    const chqs = [
      { id: "q1", direction: "in", chequeNo: "111", bankName: "HBL", amount: 5000,
        issueDateISO: "2026-10-02", dueDateISO: "2026-10-20", partyId: "c1", partyName: "Ahmed",
        partyKind: "customer", status: "received", sourceType: "bill", sourceId: "b1",
        accountId: null, chargesOnBounce: 0, entryIds: {}, note: "", dayOffset: 0, ts: "2026-10-02T09:00:00.000Z" },
      { id: "q2", direction: "in", chequeNo: "112", bankName: "HBL", amount: 3000,
        issueDateISO: "2026-10-02", dueDateISO: "2026-10-10", partyId: "c1", partyName: "Ahmed",
        partyKind: "customer", status: "deposited", sourceType: "bill", sourceId: "b1",
        accountId: null, chargesOnBounce: 0, entryIds: {}, note: "", dayOffset: 0, ts: "2026-10-02T10:00:00.000Z" },
      { id: "q3", direction: "out", chequeNo: "900", bankName: "MCB", amount: 8000,
        issueDateISO: "2026-10-03", dueDateISO: "2026-10-15", partyId: "s1", partyName: "Supplier Co",
        partyKind: "supplier", status: "issued", sourceType: "supplier_payment", sourceId: "sp1",
        accountId: null, chargesOnBounce: 0, entryIds: {}, note: "", dayOffset: 0, ts: "2026-10-03T09:00:00.000Z" },
      { id: "q4", direction: "in", chequeNo: "113", bankName: "HBL", amount: 9999,
        issueDateISO: "2026-09-01", dueDateISO: "2026-09-05", partyId: "c1", partyName: "Ahmed",
        partyKind: "customer", status: "cleared", sourceType: "bill", sourceId: "b0",
        accountId: null, chargesOnBounce: 0, entryIds: {}, note: "", dayOffset: 0, ts: "2026-09-01T09:00:00.000Z" },
    ];
    const rep = R.chequesReport(chqs, oct);
    const g = Object.fromEntries(rep.groups.map((x) => [x.id, x]));
    check(eq(g.drawer.total, 5000) && eq(g.atBank.total, 3000) && eq(g.issued.total, 8000) && eq(g.cleared.rows.length, 0),
      "cheques: captured-in-period grouped by the registry's own views; last month's cleared cheque excluded");
    check(eq(rep.totalCaptured, 16000), "cheques: total captured in period");
    check(eq(g.drawer.total + g.atBank.total, cheques.unclearedInTotal(chqs.filter((c) => R.inRange(c.ts, oct)))),
      "cheques identity: drawer + at-bank == unclearedInTotal over the same set (lib/cheques)");
  }

  /* ---- output-language formatting & share text ---- */
  check(R.moneyIn("en", 2600) === "Rs 2,600", "moneyIn EN: 'Rs 2,600' (== fmtPKR in EN)");
  check(R.moneyIn("ur", 2600) === "روپے 2,600", "moneyIn UR: 'روپے 2,600' (== fmtPKR in UR)");
  check(R.dateISOIn("en", "2026-10-12") === "12 October 2026", "dateISOIn EN renders the business date");
  check(R.dateISOIn("ur", "2026-10-12") === "12 اکتوبر 2026", "dateISOIn UR renders the business date in Urdu");
  const shareArgs = (lang) => ({
    shopName: "Madina Store",
    title: i18n.translate(lang, "rep.sales.title"),
    period: R.rangeLabelIn(lang, oct),
    lines: [[i18n.translate(lang, "rep.tot.netSales"), R.moneyIn(lang, 2600)]],
  });
  const shareEn = R.reportShareText("en", shareArgs("en"));
  const shareUr = R.reportShareText("ur", shareArgs("ur"));
  check(shareEn.includes("Sales Report") && shareEn.includes("2,600") && shareEn.includes("Madina Store"),
    "share text EN: title, shop and the formatted figure");
  check(shareUr.includes("فروخت کی رپورٹ") && shareUr.includes("2,600"),
    "share text UR: Urdu title carries the IDENTICAL figure (language determinism)");
  check(shareEn.split("\n").length === shareUr.split("\n").length,
    "share text: same structure in both languages");

  /* ---- source invariants: the section is read-only ---- */
  const repSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/lib/reports.ts", "utf8"
  );
  check(!/makeEntry|postEntry|writeBatch|setDoc|addDoc/.test(repSrc),
    "source: lib/reports.ts contains no posting/write machinery (read-only by construction)");
  const viewSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/ReportsView.tsx", "utf8"
  );
  check(viewSrc.includes('can(role, "finance", "view")'),
    "source: ReportsView gates on the finance matrix row (no dedicated reports row exists)");
  check(!/jsPDF|jspdf|html2canvas/.test(viewSrc + repSrc),
    "source: no client PDF library — print/save go through the browser pipeline");

  /* ---- i18n: every rep.* key exists in BOTH dictionaries ---- */
  const repKeys = Object.keys(i18n.en).filter((k) => k.startsWith("rep.") || k === "nav.reports");
  check(repKeys.length >= 100, `i18n: reports part carries ${repKeys.length} keys`);
  check(repKeys.every((k) => typeof i18n.ur[k] === "string" && i18n.ur[k].length > 0),
    "i18n: every reports key present and non-empty in Urdu (parity)");
}

/* ============================ C1 (warehouses) ============================ */
suite("C1", null); // Phase C · C1 — warehouses & stock rows (design §1)
{
  const MAIN = "wh-main";
  const GODOWN = "wh-godown";
  const whs = seed.getSeedWarehouses();

  /* ---- the stockV1 migration: annotation, not conversion (§10.1) ---- */
  const migRows = stock.stockV1Rows(products, []);
  check(migRows.length === products.length && migRows.every((l) => l.warehouseId === MAIN),
    "migration: one row per product, all at the default warehouse");
  check(products.every((p) => stock.rowsTotal(migRows, p.id) === p.stockQty) &&
        eq(sum(migRows.map((l) => l.qty)), sum(products.map((p) => p.stockQty))),
    "migration: every product's rows sum to its stockQty (identity Σ rows == stockQty)");
  check(stock.stockV1Rows(products, migRows).length === 0,
    "migration: idempotent — a second run creates nothing");
  const partial = [stock.makeLevel(GODOWN, products[0].id, 1)];
  const skipRows = stock.stockV1Rows(products, partial);
  check(skipRows.length === products.length - 1 && skipRows.every((l) => l.productId !== products[0].id),
    "migration: per-product skip-whole — a product with ANY row is left exactly as it is");
  check(stock.stockV1Rows([], []).length === 0, "migration: an empty shop migrates to nothing");

  /* ---- frozen seed identities survive the migration untouched ---- */
  check(journal.length === 21, "migration: the seed journal still has its frozen 21 entries");
  const normalizedC1 = journal.map((e) => { const { ts, ...rest } = e; return rest; });
  const shaC1 = crypto.createHash("sha256").update(JSON.stringify(normalizedC1), "utf8").digest("hex");
  check(shaC1 === "e17e5bda19e87de698b0c0a37e923f9b396bc387e2092b2ffbbd7d60d4971168",
    "migration: seed journal SHA unchanged (zero entries written, zero totals moved)");
  check(eq(ledger.accountBalance(journal, "inventory"), 272805) &&
        eq(ledger.accountBalance(journal, "cash"), 50000),
    "migration: GL identities hold — Inventory 272,805 · Cash 50,000");

  /* ---- seed warehouses + rows (the born-migrated end-state) ---- */
  check(whs.length === 2 && whs[0].id === MAIN && whs[0].isDefault === true && whs[0].sortOrder === 0 &&
        whs[1].id === seed.SEED_GODOWN_ID && whs[1].isDefault === false,
    "seed: Main (default, sortOrder 0) + one Godown — the migrated end-state directly");
  const seedLevels = seed.getSeedStockLevels(products);
  check(seedLevels.length === products.length &&
        seedLevels.every((l) => l.warehouseId === MAIN && l.id === stock.levelIdFor(MAIN, l.productId)) &&
        products.every((p) => stock.rowsTotal(seedLevels, p.id) === p.stockQty),
    "seed: complete rows at the default warehouse, deterministic ids, sums == totals");

  /* ---- the §1.3 resolution rule + stamp resolution ---- */
  const P9 = { id: "P", stockQty: 9 };
  check(stock.qtyAtWarehouse(P9, [], whs, MAIN) === 9 && stock.qtyAtWarehouse(P9, [], whs, GODOWN) === 0,
    "resolution: a row-less product reads its whole total at the default, 0 elsewhere");
  const pRows = [stock.makeLevel(MAIN, "P", 4), stock.makeLevel(GODOWN, "P", 5)];
  check(stock.qtyAtWarehouse(P9, pRows, whs, MAIN) === 4 &&
        stock.qtyAtWarehouse(P9, pRows, whs, GODOWN) === 5 &&
        stock.qtyAtWarehouse(P9, pRows, whs, "wh-gone") === 0,
    "resolution: with rows, the rows are the truth (missing pair = 0)");
  check(stock.resolveWarehouseId(whs, GODOWN) === GODOWN &&
        stock.resolveWarehouseId(whs, "wh-gone") === MAIN &&
        stock.resolveWarehouseId(whs, null) === MAIN &&
        stock.defaultWarehouseId([]) === MAIN,
    "resolution: a real stamp wins; absent/unknown stamps and empty lists fall to the default");

  /* ---- every stock path keeps Σ rows == stockQty (§1.5 workload) ----
   * Replicates the store's demo discipline path by path: the total
   * moves exactly as the path moves it, and the row at the touched
   * warehouse receives the SAME applied delta. After every step the
   * drift detector must be silent for the touched product. */
  const wProducts = [
    { id: "X", stockQty: 20, costPrice: 100 },
    { id: "Y", stockQty: 5, costPrice: 40 },
  ];
  let wLevels = stock.stockV1Rows(wProducts, []);
  const wMove = (pid, whId, appliedDelta) => {
    const p = wProducts.find((x) => x.id === pid);
    p.stockQty += appliedDelta;
    wLevels = stock.applyLevelDelta(wLevels, whId, pid, appliedDelta);
  };
  const wOk = (pid) =>
    stock.stockDrift(wProducts, wLevels).every((d) => d.productId !== pid) &&
    stock.rowsTotal(wLevels, pid) === wProducts.find((x) => x.id === pid).stockQty;
  check(wOk("X") && wOk("Y"), "workload: migrated start — no drift");
  wMove("X", GODOWN, +10); // purchase received into the godown
  check(wOk("X") && stock.rowQtyOf(wLevels, GODOWN, "X") === 10, "workload: purchase into godown — rows follow");
  wMove("X", GODOWN, -6); // bill posted at the godown
  check(wOk("X") && stock.rowQtyOf(wLevels, GODOWN, "X") === 4, "workload: godown bill — its row drops, total follows");
  wMove("X", MAIN, -5); // counter sale (always the default warehouse)
  check(wOk("X") && stock.rowQtyOf(wLevels, MAIN, "X") === 15, "workload: counter sale — the default row drops");
  wMove("X", GODOWN, +2); // return against that godown bill
  check(wOk("X"), "workload: bill return — goods back at the bill's warehouse");
  wMove("X", GODOWN, -3); // purchase return out of the receiving warehouse
  check(wOk("X") && stock.rowQtyOf(wLevels, GODOWN, "X") === 3, "workload: purchase return — out of the receipt warehouse");
  wMove("X", GODOWN, -4); // adjustment at the godown, clamped on the TOTAL
  check(wOk("X") && stock.rowQtyOf(wLevels, GODOWN, "X") === -1,
    "workload: adjustment — the row takes the total-clamped delta (a negative row is the sanctioned split, §1.5)");
  wMove("X", MAIN, +6); // product-form stock edit (warehouse-naive ⇒ default)
  check(wOk("X") && stock.rowQtyOf(wLevels, MAIN, "X") === 21, "workload: product edit — the delta lands at the default");
  const zRow = stock.makeLevel(MAIN, "Z", 7); // CSV import lands at the default
  wProducts.push({ id: "Z", stockQty: 7, costPrice: 10 });
  wLevels = [...wLevels, zRow];
  check(wOk("Z"), "workload: CSV import — opening row at the default warehouse");
  const y = wProducts.find((x) => x.id === "Y"); // delete: rows zeroed with the product
  y.stockQty = 0;
  wLevels = wLevels.map((l) => (l.productId === "Y" ? { ...l, qty: 0 } : l));
  check(wOk("Y") && stock.rowsTotal(wLevels, "Y") === 0, "workload: product delete — its rows are zeroed, never orphaned");

  /* ---- a warehouse never enters the journal (§1.4) ---- */
  const saleLines = [
    { account: "cash", debit: 500, credit: 0 },
    { account: "sales", debit: 0, credit: 500 },
    { account: "cogs", debit: 240, credit: 0 },
    { account: "inventory", debit: 0, credit: 240 },
  ];
  const eMain = ledger.makeEntry("Sale — X", "sale", null, saleLines);
  const eGodown = ledger.makeEntry("Sale — X", "sale", null, saleLines);
  const strip = (e) => { const { ts, id, ...rest } = e; return JSON.stringify(rest); };
  check(strip(eMain) === strip(eGodown) && ledger.entryBalances(eGodown),
    "journal: the same sale composed at any warehouse is byte-identical (location is subledger-only)");
  const stockSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/lib/stock.ts", "utf8");
  check(!/makeEntry|postEntry/.test(stockSrc),
    "source: lib/stock.ts carries no posting machinery — rows are operational detail");

  /* ---- the promise partition (§1.6): B2's figures, split ---- */
  const rProducts = [{ id: "A", stockQty: 12 }, { id: "B", stockQty: 5 }];
  const rOrders = [
    { id: "ro1", status: "open", lines: [
      { productId: "A", name: "A", qty: 10, unitPrice: 100, total: 1000 },
      { productId: "B", name: "B", qty: 2, unitPrice: 100, total: 200 },
    ] },
    { id: "ro2", status: "draft", lines: [{ productId: "A", name: "A", qty: 7, unitPrice: 100, total: 700 }] },
    { id: "ro3", status: "cancelled", lines: [{ productId: "A", name: "A", qty: 3, unitPrice: 100, total: 300 }] },
  ];
  const rChallans = [
    { id: "rc1", orderId: null, status: "dispatched", lines: [{ productId: "A", name: "A", qty: 4, unitPrice: 100, total: 400 }] },
    { id: "rc2", orderId: "ro1", status: "dispatched", lines: [{ productId: "A", name: "A", qty: 3, unitPrice: 100, total: 300, sourceProductId: "A" }] },
    { id: "rc3", orderId: null, status: "cancelled", lines: [{ productId: "A", name: "A", qty: 9, unitPrice: 100, total: 900 }] },
    { id: "rc4", orderId: null, status: "draft", lines: [{ productId: "B", name: "B", qty: 4, unitPrice: 100, total: 400 }] },
  ];
  const rBills = [
    { id: "rb1", status: "paid", sourceType: "challan", sourceId: "rc2", items: [{ productId: "A", qty: 1, sourceProductId: "A" }] },
    { id: "rb2", status: "paid", sourceType: "challan", sourceId: "rc1", items: [{ productId: "A", qty: 1 }] },
  ];
  const rLevels = [stock.makeLevel(MAIN, "A", 12), stock.makeLevel(MAIN, "B", 5)];
  const globalPromised = docs.promisedQtyByProduct(rOrders, rChallans, rBills);
  const partAll = stock.promisedByWarehouse(rOrders, rChallans, rBills, MAIN);
  check(eq(partAll.get(MAIN)?.get("A") ?? 0, globalPromised.get("A")) &&
        eq(partAll.get(MAIN)?.get("B") ?? 0, globalPromised.get("B")) && partAll.size === 1,
    "partition: unstamped documents promise everything at the default (== the B2 globals)");
  const rOrdersStamped = rOrders.map((o) => (o.id === "ro1" ? { ...o, warehouseId: GODOWN } : o));
  const part = stock.promisedByWarehouse(rOrdersStamped, rChallans, rBills, MAIN);
  check(eq(part.get(GODOWN)?.get("A") ?? 0, 9) && eq(part.get(GODOWN)?.get("B") ?? 0, 2) &&
        eq(part.get(MAIN)?.get("A") ?? 0, 3),
    "partition: the stamped order promises at its warehouse; the standalone challan at the default");
  check(eq((part.get(GODOWN)?.get("A") ?? 0) + (part.get(MAIN)?.get("A") ?? 0), globalPromised.get("A")) &&
        eq((part.get(GODOWN)?.get("B") ?? 0) + (part.get(MAIN)?.get("B") ?? 0), globalPromised.get("B")),
    "partition: Σ over warehouses reproduces promisedQtyByProduct per product exactly");
  const avMain = stock.availabilityByProductAtWarehouse(rProducts, rLevels, whs, rOrdersStamped, rChallans, rBills, MAIN);
  const avGodown = stock.availabilityByProductAtWarehouse(rProducts, rLevels, whs, rOrdersStamped, rChallans, rBills, GODOWN);
  const avGlobal = docs.availabilityByProduct(rProducts, rOrders, rChallans, rBills);
  check(eq(avMain.get("A").onHand, 12) && eq(avMain.get("A").promised, 3) && eq(avMain.get("A").available, 9),
    "availability at Main: on-hand from the row, promised from Main's partition");
  check(eq(avGodown.get("A").onHand, 0) && eq(avGodown.get("A").promised, 9) && eq(avGodown.get("A").available, -9),
    "availability at Godown: nothing shelved, the order's 9 promised against it");
  check(eq(avMain.get("A").available + avGodown.get("A").available, avGlobal.get("A").available) &&
        eq(avMain.get("B").available + avGodown.get("B").available, avGlobal.get("B").available),
    "availability: Σ over warehouses reproduces the B2 global availability per product");

  /* ---- drift injection + recount repair (§1.7) ---- */
  const dProducts = products.slice(0, 4).map((p) => ({ id: p.id, stockQty: p.stockQty }));
  let dLevels = stock.stockV1Rows(dProducts, []);
  const victim = dProducts[1];
  const otherRowBefore = stock.rowQtyOf(dLevels, MAIN, dProducts[2].id);
  dLevels = stock.applyLevelDelta(dLevels, MAIN, victim.id, +5);
  const drift = stock.stockDrift(dProducts, dLevels);
  check(drift.length === 1 && drift[0].productId === victim.id && eq(drift[0].drift, 5) &&
        eq(drift[0].rowsTotal, victim.stockQty + 5) && eq(drift[0].stockQty, victim.stockQty),
    "drift: the detector catches an injected +5 and names the product, the split and the total");
  const rec = stock.recountLevels(dProducts, dLevels, whs);
  check(rec.repaired === 1 && stock.stockDrift(dProducts, rec.levels).length === 0 &&
        stock.rowQtyOf(rec.levels, MAIN, victim.id) === victim.stockQty &&
        stock.rowQtyOf(rec.levels, MAIN, dProducts[2].id) === otherRowBefore,
    "recount: the default row absorbs the drift; every other row is untouched");
  const clean = stock.recountLevels(dProducts, stock.stockV1Rows(dProducts, []), whs);
  check(clean.repaired === 0, "recount: clean data is a no-op");
  const splitProducts = [{ id: "S", stockQty: 10 }];
  const splitLevels = [stock.makeLevel(GODOWN, "S", 2)]; // default row missing entirely
  const recSplit = stock.recountLevels(splitProducts, splitLevels, whs);
  check(recSplit.repaired === 1 && stock.rowQtyOf(recSplit.levels, MAIN, "S") === 8 &&
        stock.rowQtyOf(recSplit.levels, GODOWN, "S") === 2,
    "recount: a missing default row is created holding the difference; other rows untouched");

  /* ---- RBAC: the warehouses matrix row (§1.9) ---- */
  check(perm.accessOf("owner", "warehouses") === "full" && perm.accessOf("manager", "warehouses") === "full",
    "RBAC: warehouses row — owner/manager full");
  check(perm.accessOf("accountant", "warehouses") === "read" && perm.accessOf("cashier", "warehouses") === "none",
    "RBAC: warehouses row — accountant read-only, cashier none");
  check(perm.can("accountant", "warehouses", "view") && !perm.can("accountant", "warehouses", "write") &&
        !perm.can("cashier", "warehouses", "view"),
    "RBAC: can() honours the row (the surface gates view/write on it)");

  /* ---- i18n parity for the C1 strings ---- */
  const whKeys = Object.keys(i18n.en).filter((k) => k.startsWith("wh.") || k === "nav.warehouses");
  check(whKeys.length === 45, `i18n: the C1 part carries ${whKeys.length} keys (45 expected)`);
  check(whKeys.every((k) => typeof i18n.ur[k] === "string" && i18n.ur[k].length > 0),
    "i18n: every C1 key present and non-empty in Urdu (parity)");

  /* ---- source invariants: the store wiring ---- */
  const storeSrcC1 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx", "utf8");
  check(storeSrcC1.includes('"warehouses"') && storeSrcC1.includes('"stockLevels"') &&
        storeSrcC1.includes("ensureStock") && storeSrcC1.includes("phaseC.stockV1"),
    "source: collections + the stockV1 migration are wired into the store");
  check(storeSrcC1.includes('"dukaan-ai-store-v11"'),
    "source: demo storage key bumped to v11 for the new collections");
  check((storeSrcC1.match(/makeEntry\(/g) || []).length === 24,
    "source: C1 added no makeEntry call (24 == pre-C1 count) — rows and warehouses post nothing");

  /* ---- rules: additive C1 blocks only ---- */
  const rulesC1 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8");
  const c1Seg = rulesC1.slice(
    rulesC1.indexOf("      // Phase C · C1"),
    rulesC1.indexOf("      // Expenses:"));
  check(c1Seg.includes("match /warehouses/{warehouseId}") &&
        c1Seg.includes("hasRole(uid, ['owner', 'manager'])"),
    "rules: warehouses block — read any role (picker names, G-C1), write owner/manager, per the matrix row");
  check(c1Seg.includes("match /stockLevels/{levelId}") && c1Seg.includes("R-B6"),
    "rules: stockLevels block carries the G-C2 widening + the R-B6 do-not-tighten warning");
  const strippedC1 = stripG1Blocks(stripG2Blocks(rulesC1.slice(0, rulesC1.indexOf("      // Phase C · C1")) +
    rulesC1.slice(rulesC1.indexOf("      // Expenses:"))));
  check(crypto.createHash("sha256").update(strippedC1, "utf8").digest("hex") ===
        "73177ac06f42d4a65ab68c6a7eb6f74e776c38da525742d90a77de0502436e87",
    "rules: stripping the C1 blocks reproduces the pre-C1 file byte-for-byte (additive only; G1 same-check amendment: the four G1 spans are stripped first — v9's only other deltas, strip-proven in the G1 suite)");
}

/* ============================ C2 (stock transfers) ============================ */
suite("C2", null); // Phase C · C2 — stock transfers (design §2)
{
  const MAIN = "wh-main";
  const GODOWN = "wh-godown";
  const whs = seed.getSeedWarehouses();
  const c2Products = [
    { id: "A", name: "Atta 10kg", stockQty: 50, costPrice: 200 },
    { id: "B", name: "Basmati Rice 5kg", stockQty: 30, costPrice: 150 },
    { id: "R", name: "Raw Jute Roll", stockQty: 10, costPrice: 100, stockClass: "raw" },
  ];
  const byId = new Map(c2Products.map((p) => [p.id, p]));
  const totalsMap = new Map(c2Products.map((p) => [p.id, p.stockQty]));
  let lv = stock.stockV1Rows(c2Products, []);
  let flowJournal = []; // every posting the simulated flow produces
  const applyDeltas = (deltas) => {
    for (const d of deltas) lv = stock.applyLevelDelta(lv, d.wh, d.pid, d.delta);
  };
  const identity = (list) =>
    c2Products.every((p) => {
      const rows = stock.rowsTotal(lv, p.id);
      const transit = transfers.inTransitByProduct(list).get(p.id) ?? 0;
      return eq(rows + transit, totalsMap.get(p.id));
    });
  const mkTransfer = (id, lines, status) => ({
    id, number: null, fromWarehouseId: MAIN, toWarehouseId: GODOWN,
    lines, note: "", status, dayOffset: 0, ts: "2026-10-20T09:00:00.000Z",
  });

  /* ---- the TR- series (§6.3): prefix, mint-at-dispatch, no burn ---- */
  check(docs.seriesPrefix("stockTransfer", null) === "TR-" &&
        docs.seriesPrefix("stockTransfer", { docSeries: { stockTransfer: "MV-" } }) === "MV-",
    "series: TR- is the default prefix and the owner-doc override applies");
  check(docs.nextDocNumber("stockTransfer", [null, null], null) === "TR-1",
    "series: drafts (null numbers) burn no numbers — the first dispatch mints TR-1");
  check(docs.nextDocNumber("stockTransfer", ["TR-1", null, "TR-7"], null) === "TR-8",
    "series: minting is max+1 over the numbered documents only");

  /* ---- composition + route validation (pre-composition refusals) ---- */
  const composed = transfers.composeTransferLines(c2Products, [
    { productId: "A", qty: 20 }, { productId: "B", qty: 10 }, { productId: "A", qty: 5 },
  ]);
  check(composed !== null && composed.length === 2 &&
        composed.find((l) => l.productId === "A").qtySent === 25 &&
        composed.find((l) => l.productId === "B").qtySent === 10 &&
        composed.every((l) => l.qtyReceived === 0 && typeof l.name === "string" && l.name.length > 0),
    "compose: duplicate picks merge, names snapshot, qtyReceived starts at 0");
  check(transfers.composeTransferLines(c2Products, [{ productId: "nope", qty: 1 }]) === null,
    "compose: an unknown product refuses the whole composition");
  check(transfers.composeTransferLines(c2Products, [{ productId: "A", qty: 0 }]) === null &&
        transfers.composeTransferLines(c2Products, [{ productId: "A", qty: -2 }]) === null &&
        transfers.composeTransferLines(c2Products, []) === null,
    "compose: non-positive quantities and an empty pick list refuse");
  check(transfers.transferRouteProblem(MAIN, MAIN, whs) === "same",
    "route: a transfer from a warehouse to itself is refused (same-warehouse)");
  check(transfers.transferRouteProblem(MAIN, GODOWN, whs) === null &&
        transfers.transferRouteProblem(MAIN, "wh-nope", whs) === "missing" &&
        transfers.transferRouteProblem(MAIN, GODOWN, whs.map((w) => (w.id === GODOWN ? { ...w, archived: true } : w))) === "archived",
    "route: a real pair composes; a missing endpoint and an archived endpoint refuse");

  /* ---- draft + dispatch: rows move, the journal does not (§2.3) ---- */
  let t1 = mkTransfer("st-t1", composed, "draft");
  check(transfers.inTransitByProduct([t1]).size === 0 && identity([t1]),
    "draft: nothing sent yet — no in-transit, the identity already holds");
  check(transfers.canTransferTransition(t1, "dispatch") &&
        !transfers.canTransferTransition(t1, "receive") &&
        !transfers.canTransferTransition(t1, "closeShort"),
    "transitions: a draft may dispatch but never receive or close");
  t1 = { ...t1, number: docs.nextDocNumber("stockTransfer", [t1.number], null), status: "dispatched" };
  applyDeltas(t1.lines.map((l) => ({ wh: MAIN, pid: l.productId, delta: -l.qtySent })));
  check(flowJournal.length === 0,
    "dispatch: the journal is byte-still — dispatch composes no entry at all");
  const shaC2 = crypto.createHash("sha256")
    .update(JSON.stringify(journal.map((e) => { const { ts, ...rest } = e; return rest; })), "utf8")
    .digest("hex");
  check(shaC2 === "e17e5bda19e87de698b0c0a37e923f9b396bc387e2092b2ffbbd7d60d4971168",
    "dispatch: the frozen seed journal + SHA are untouched");
  check(t1.number === "TR-1" && stock.rowQtyOf(lv, MAIN, "A") === 25 &&
        stock.rowQtyOf(lv, MAIN, "B") === 20 && totalsMap.get("A") === 50 && totalsMap.get("B") === 30,
    "dispatch: source rows drop by qtySent; product totals do NOT change");
  check((transfers.inTransitByProduct([t1]).get("A") ?? 0) === 25 &&
        (transfers.inTransitByProduct([t1]).get("B") ?? 0) === 10 && identity([t1]),
    "dispatch: in-transit derives exactly (A 25 · B 10) and §1.3's identity holds");
  check(transfers.statusAfterReceive(t1.lines) === "dispatched" &&
        transfers.canTransferTransition(t1, "receive") &&
        transfers.canTransferTransition(t1, "closeShort") &&
        transfers.canTransferTransition(t1, "returnToSource") &&
        !transfers.canTransferTransition(t1, "edit") &&
        !transfers.canTransferTransition(t1, "dispatch"),
    "transitions: a dispatched transfer's exits are receive / close-short / return only");
  check(transfers.validateReceivePicks(t1, [{ productId: "A", qty: 26 }]) === null &&
        transfers.validateReceivePicks(t1, [{ productId: "Z", qty: 1 }]) === null &&
        transfers.validateReceivePicks(t1, [{ productId: "A", qty: 0 }]) === null &&
        transfers.validateReceivePicks(t1, []) === null,
    "receive validation: over-receipt, unknown lines, zero and empty picks all refuse pre-composition");
  const mergedPicks = transfers.validateReceivePicks(t1, [
    { productId: "A", qty: 10 }, { productId: "A", qty: 5 },
  ]);
  check(mergedPicks !== null && mergedPicks.length === 1 && mergedPicks[0].qty === 15,
    "receive validation: duplicate picks merge before the cumulative check");

  /* ---- partial receives sum exactly; the road empties line by line ---- */
  const recv = (tr, picks) => {
    const merged = transfers.validateReceivePicks(tr, picks);
    const lines = transfers.applyReceivePicks(tr.lines, merged);
    applyDeltas(merged.map((p) => ({ wh: tr.toWarehouseId, pid: p.productId, delta: p.qty })));
    return { ...tr, lines, status: transfers.statusAfterReceive(lines) };
  };
  t1 = recv(t1, [{ productId: "A", qty: 10 }]);
  check(t1.status === "partially_received" && stock.rowQtyOf(lv, GODOWN, "A") === 10 &&
        identity([t1]) && flowJournal.length === 0,
    "receive #1: 10 of A lands at the destination; still partial; identity holds; no entry");
  t1 = recv(t1, [{ productId: "A", qty: 15 }, { productId: "B", qty: 4 }]);
  check(transfers.transferReceivedQty(t1) === 29 && t1.status === "partially_received" &&
        t1.lines.find((l) => l.productId === "A").qtyReceived === 25 &&
        identity([t1]) && flowJournal.length === 0,
    "receive #2: partial receives sum exactly (A complete at 25, B at 4 of 10); zero journal writes across the whole transfer");
  const incoming = transfers.incomingByProductAtWarehouse([t1], GODOWN);
  check((incoming.get("B") ?? 0) === 6 && !incoming.has("A") &&
        transfers.incomingByProductAtWarehouse([t1], MAIN).size === 0 &&
        transfers.inTransitBetween([t1], MAIN, GODOWN) === 6,
    "incoming: the destination desk sees B's 6 on the road, A's none; the pair figure agrees");

  /* ---- close-short: the ONE posting, restoring the identity (§2.3) ---- */
  const shortages = transfers.transferShortages(t1);
  check(shortages.length === 1 && shortages[0].productId === "B" && shortages[0].qty === 6,
    "close-short: the shortage is exactly what was sent and never arrived (B × 6)");
  check(eq(transfers.transferLossValue(shortages, byId), 900),
    "close-short: the loss values at the current shelf cost (6 × 150 = 900)");
  const lossEntry = transfers.buildTransferLossEntry(t1, shortages, byId);
  check(lossEntry !== null && lossEntry.refType === "transfer_loss" && lossEntry.refId === "st-t1" &&
        lossEntry.lines.length === 2 &&
        lossEntry.lines[0].account === "inventory_loss" && eq(lossEntry.lines[0].debit, 900) &&
        lossEntry.lines[1].account === "inventory" && eq(lossEntry.lines[1].credit, 900) &&
        ledger.entryBalances(lossEntry),
    "close-short: Dr inventory_loss / Cr inventory at the shortage value, through the balance guard");
  check(transfers.buildTransferLossEntry(t1, [], byId) === null,
    "close-short: nothing short composes no entry at all");
  /* §2.5 — the loss is dated TODAY and gated by the lock like every
   * entry; a dispatched transfer's RECEIVE is not gated at all. */
  const datedLoss = { ...lossEntry, ts: "2026-10-20T10:00:00.000Z" };
  let lockThrew = false;
  try { periods.preparePosting(datedLoss, periods.endOfDayPktInstant("2026-10-20")); }
  catch (e) { lockThrew = periods.isPeriodLockedError(e); }
  check(lockThrew && periods.preparePosting(datedLoss, periods.endOfDayPktInstant("2026-10-19")).dateISO === "2026-10-20",
    "§2.5: the loss posts at today's date — refused when today is locked, stamped + open the day before");
  totalsMap.set("B", totalsMap.get("B") - 6); // the store drops the shorted total in the close batch
  t1 = { ...t1, status: "received" };
  flowJournal = [...flowJournal, lossEntry];
  check(identity([t1]) && eq(stock.rowsTotal(lv, "B"), 24) &&
        eq(ledger.accountBalance(flowJournal, "inventory_loss"), 900) &&
        eq(ledger.accountBalance(flowJournal, "inventory"), -900),
    "close-short applied: totals drop by the shortage, §1.3's identity is restored, the GL carries the loss");

  /* ---- a full receipt writes zero journal entries, end to end ---- */
  let t2 = mkTransfer("st-t2", transfers.composeTransferLines(c2Products, [{ productId: "A", qty: 5 }]), "draft");
  t2 = { ...t2, number: "TR-2", status: "dispatched" };
  applyDeltas(t2.lines.map((l) => ({ wh: MAIN, pid: l.productId, delta: -l.qtySent })));
  t2 = recv(t2, [{ productId: "A", qty: 5 }]);
  check(t2.status === "received" && flowJournal.length === 1 && identity([t1, t2]) &&
        stock.rowQtyOf(lv, GODOWN, "A") === 30 && stock.rowQtyOf(lv, MAIN, "A") === 20,
    "full receipt: received in one landing, rows exact, and the journal gained NOTHING across the whole transfer");

  /* ---- return-to-source: what is still on the road goes home ---- */
  let t3 = mkTransfer("st-t3", transfers.composeTransferLines(c2Products, [{ productId: "A", qty: 8 }]), "draft");
  t3 = { ...t3, number: "TR-3", status: "dispatched" };
  applyDeltas(t3.lines.map((l) => ({ wh: MAIN, pid: l.productId, delta: -l.qtySent })));
  t3 = recv(t3, [{ productId: "A", qty: 3 }]);
  const t3Short = transfers.transferShortages(t3);
  applyDeltas(t3Short.map((s) => ({ wh: MAIN, pid: s.productId, delta: s.qty })));
  t3 = { ...t3, status: "returned" };
  check(stock.rowQtyOf(lv, MAIN, "A") === 17 && transfers.inTransitByProduct([t3]).size === 0 &&
        identity([t1, t2, t3]) && flowJournal.length === 1,
    "return-to-source: the 5 still on the road land back at the source; the 3 received stay; nothing posts");
  check(!transfers.canTransferTransition(t3, "receive") &&
        !transfers.canTransferTransition(t3, "returnToSource") &&
        !transfers.canTransferTransition(t1, "receive"),
    "transitions: terminal transfers (returned / received) accept no further movement");

  /* ---- §2.5 scenario: dispatched BEFORE a lock, received after it ---- */
  let t4 = mkTransfer("st-t4", transfers.composeTransferLines(c2Products, [{ productId: "B", qty: 5 }]), "draft");
  t4 = { ...t4, number: "TR-4", status: "dispatched" };
  applyDeltas(t4.lines.map((l) => ({ wh: MAIN, pid: l.productId, delta: -l.qtySent })));
  t4 = recv(t4, [{ productId: "B", qty: 5 }]); // received "after the lock" — a receive composes no entry to gate
  check(t4.status === "received" && flowJournal.length === 1 && identity([t1, t2, t3, t4]),
    "§2.5: a transfer dispatched before a period lock is received after it — only its shortage could ever post");
  let t5 = mkTransfer("st-t5", transfers.composeTransferLines(c2Products, [{ productId: "B", qty: 4 }]), "draft");
  t5 = { ...t5, number: "TR-5", status: "dispatched" };
  applyDeltas(t5.lines.map((l) => ({ wh: MAIN, pid: l.productId, delta: -l.qtySent })));
  const t5Entry = transfers.buildTransferLossEntry(t5, transfers.transferShortages(t5), byId);
  let closeThrew = false;
  try { periods.preparePosting({ ...t5Entry, ts: "2026-10-20T10:00:00.000Z" }, periods.endOfDayPktInstant("2026-10-20")); }
  catch (e) { closeThrew = periods.isPeriodLockedError(e); }
  check(closeThrew && t5.status === "dispatched" && totalsMap.get("B") === 24 && flowJournal.length === 1,
    "§2.5: with today locked the close-short refuses with its loss — the transfer simply stays open, totals untouched");

  /* ---- the class-account seam (§4.1, adopted early by §2.3) ---- */
  check(transfers.inventoryAccountFor({}) === "inventory" &&
        transfers.inventoryAccountFor({ stockClass: "raw" }) === "inventory_raw",
    "class: goods resolve to inventory, raw-class to inventory_raw");
  const rawEntry = transfers.buildTransferLossEntry(
    { id: "st-raw", number: "TR-9" },
    [{ productId: "R", name: "Raw Jute Roll", qty: 2 }],
    byId
  );
  check(rawEntry !== null &&
        rawEntry.lines.some((l) => l.account === "inventory_raw" && eq(l.credit, 200)) &&
        !rawEntry.lines.some((l) => l.account === "inventory") &&
        eq(rawEntry.lines[0].debit, 200),
    "class: a raw product's shortage credits inventory_raw (2 × 100), never inventory");

  /* ---- the drift detector is in-transit aware (C2 extends §1.7) ---- */
  /* The detector reads each product's CURRENT total — after the
   * close-short above, B's live total is 24, not its opening 30. */
  const liveProducts = c2Products.map((p) => ({ ...p, stockQty: totalsMap.get(p.id) }));
  const allOpen = [t5];
  check(stock.stockDrift(liveProducts, lv, allOpen).length === 0,
    "drift: with transfers passed, an open transfer's road stock is NOT drift — the identity already accounts for it");
  const legacyDrift = stock.stockDrift(liveProducts, lv);
  check(legacyDrift.length === 1 && legacyDrift[0].productId === "B" && eq(legacyDrift[0].drift, -4),
    "drift: the pre-C2 two-argument reading would misread B's 4 on the road as drift — why the signature grew");
  const lvDrifted = stock.applyLevelDelta(lv, MAIN, "A", +5);
  const caught = stock.stockDrift(liveProducts, lvDrifted, allOpen);
  check(caught.length === 1 && caught[0].productId === "A" && eq(caught[0].drift, 5) &&
        eq(caught[0].inTransit, 0),
    "drift: an injected +5 is still caught exactly, with a transfer open");
  const repaired = stock.recountLevels(liveProducts, lvDrifted, whs, allOpen);
  check(repaired.repaired === 1 && stock.stockDrift(liveProducts, repaired.levels, allOpen).length === 0 &&
        (transfers.inTransitByProduct(allOpen).get("B") ?? 0) === 4 &&
        stock.rowQtyOf(repaired.levels, MAIN, "B") === stock.rowQtyOf(lv, MAIN, "B"),
    "recount: the default row absorbs the drift; the transfer's road stock is never touched");

  /* ---- the demo seed draft (§10.3): flavour that moves nothing ---- */
  const seedTransfers = seed.getSeedStockTransfers(products);
  check(seedTransfers.length === 1 && seedTransfers[0].status === "draft" &&
        seedTransfers[0].number === null &&
        seedTransfers[0].fromWarehouseId === MAIN && seedTransfers[0].toWarehouseId === GODOWN &&
        seedTransfers[0].lines.every((l) => l.qtyReceived === 0 && l.qtySent > 0),
    "seed: exactly one DRAFT transfer (Main → Godown), unnumbered, nothing received");
  check(transfers.inTransitByProduct(seedTransfers).size === 0 &&
        journal.length === 21 &&
        eq(ledger.accountBalance(journal, "inventory"), 272805) &&
        eq(ledger.accountBalance(journal, "cash"), 50000),
    "seed: the draft moves nothing — no in-transit, frozen journal identities intact (21 entries · Inventory 272,805 · Cash 50,000)");

  /* ---- RBAC: the transfers surface rides the warehouses row (§6.1) ---- */
  check(perm.can("owner", "warehouses", "write") && perm.can("manager", "warehouses", "write") &&
        !perm.can("accountant", "warehouses", "write") && perm.can("accountant", "warehouses", "view") &&
        !perm.can("cashier", "warehouses", "view"),
    "RBAC: transfers gate on the warehouses row — owner/manager run them, accountant reads, cashier never reaches the surface");

  /* ---- i18n parity for the C2 strings ---- */
  const trKeys = Object.keys(i18n.en).filter((k) => k.startsWith("tr.") || k === "nav.stockTransfers");
  check(trKeys.length === 74, `i18n: the C2 part carries ${trKeys.length} keys (74 expected)`);
  check(trKeys.every((k) => typeof i18n.ur[k] === "string" && i18n.ur[k].length > 0) &&
        typeof i18n.en["settings.series.stockTransfer"] === "string" &&
        typeof i18n.ur["settings.series.stockTransfer"] === "string" &&
        i18n.ur["settings.series.stockTransfer"].length > 0,
    "i18n: every C2 key present and non-empty in Urdu (parity), incl. the numbering-settings label");
  /* Phase C · C3 amended this total (same parity check): the
   * dictionary grew by the C3 keys (44 mfg + 6 inv additions).
   * Phase C · C4 amended it again (same check): +87 — the 86
   * production keys in the mfg part + the productionOrder
   * series label.
   * Phase C · C5 amended it again (same check): +119 — the 118
   * job keys in the jobs part (incl. nav.jobs) + the job series
   * label.
   * The UX overhaul amended it again (same check): +11 keys.
   * The live-audit fixes amend it again (same check): +23 — the
   * 12 fin keys (negative-balance warning + journal viewer) and
   * the 11 reports keys (trial balance + sales reconciliation).
   * Phase D · D1 amends it again (same check): +106 — the 103
   * hr-part keys (staff directory + attendance register, incl.
   * nav.staff), the `fin.acct.loans_receivable` label, and the
   * two settings.series labels (payrollRun / loan).
   * Phase D · D2 amends it again (same check): +114 — the 84
   * pay.* keys + 20 slip.* keys + the staff.tab.payroll chip in
   * the hr part, and 9 fin keys (the salary_payable composition
   * card + the three payroll journal labels).
   * The shell/theme/polish increment amends it again (same
   * check): +2 — the fin bucket-breakdown label and the
   * single-string negative-balance line (fixes A + E). */
  check(Object.keys(i18n.en).length === 3136 && Object.keys(i18n.ur).length === 3136,
    "i18n: the dictionary now carries 3,057 keys, EN ≡ UR (pin amended at the five-theme increment: +6 theme-picker keys; D3: +119 loan keys; D4: +55 fin.fy keys; D5: +12 fin.export keys; E1: +53 print keys; E2 pin amendment: +37 print.brand keys; E3 pin amendment: +35 Raast keys (34 print.raast + billing.wa.raastLine); E4 pin amendment: +49 pin keys; F5 pin amendment: +1 sync.online key; G1 pin amendment: +8 biz keys; G2 pin amendment: +36 plan keys; G3 pin amendment: +89 platform keys; G4 pin amendment: +47 keys (35 renew.* + 12 platform.*); G6 pin amendment: +25 backup.* keys; H1 pin amendment: +51 loyalty keys; H3 pin amendment: +108 storefront keys; WA pin amendment: +109 WhatsApp keys; PS/FA pin amendment: +3 settings.lang keys (langPashto/langFarsi/langDraftPreview) — EN/UR values otherwise untouched, PS/FA pinned at the same 3,057 by the PSFA suite)");

  /* ---- source invariants: the store wiring ---- */
  const storeSrcC2 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx", "utf8");
  check(storeSrcC2.includes('"stockTransfers"') && storeSrcC2.includes('"dukaan-ai-store-v12"') &&
        storeSrcC2.includes("buildTransferLossEntry") && storeSrcC2.includes("commitTransferMovement"),
    "source: the collection, the v12 demo bump and the movement writer are wired into the store");
  check((storeSrcC2.match(/makeEntry\(/g) || []).length === 24,
    "source: still 24 makeEntry calls in the store — the transfer loss is composed in lib/transfers, no new inline posting path");
  const viewSrcC2 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/TransfersView.tsx", "utf8");
  const sheetSrcC2 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/DocPrintSheet.tsx", "utf8");
  check(viewSrcC2.includes("TransferPrintSheet") && sheetSrcC2.includes("export function TransferPrintSheet") &&
        viewSrcC2.includes('can(role, "warehouses", "view")'),
    "source: the transfers workspace + its print sheet ship, gated on the warehouses row");

  /* ---- rules: additive C2 block only ---- */
  const rulesC2 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8");
  /* Segment end amended at Phase D · D2 (same-check style): the
   * C2–C5 segment-content checks originally sliced to the
   * Expenses block, a span that now legitimately contains the
   * Phase D blocks — and D2's payrollRuns block carries
   * createInOpenPeriod BY DESIGN (§6.2). Each segment now ends
   * at the NEXT block's marker, so the checks assert exactly
   * what they always asserted: their OWN block's content. The
   * strip proofs below keep the Expenses end (they remove the
   * whole span, Phase D included, reproducing the era file). */
  const c2Seg = rulesC2.slice(
    rulesC2.indexOf("      // Phase C · C2"),
    rulesC2.indexOf("      // Phase C · C3"));
  check(c2Seg.includes("match /stockTransfers/{transferId}") &&
        c2Seg.includes("hasRole(uid, ['owner', 'manager'])") &&
        c2Seg.includes("allow read: if canAccess(uid);"),
    "rules: stockTransfers block — read canAccess, write owner/manager (design §6.2)");
  check(!c2Seg.includes("createInOpenPeriod"),
    "rules: NO period backstop on the transfer doc — dispatch/receive post nothing; the loss is guarded at the journal (§2.5)");
  const strippedC2 = stripG1Blocks(stripG2Blocks(rulesC2.slice(0, rulesC2.indexOf("      // Phase C · C2")) +
    rulesC2.slice(rulesC2.indexOf("      // Expenses:"))));
  check(crypto.createHash("sha256").update(strippedC2, "utf8").digest("hex") ===
        "21582bd131ecc692f995381cdbccc1e7f55489b9dd93f793c4fd28d549bc5152",
    "rules: stripping the C2 block reproduces the pre-C2 file byte-for-byte (additive only; G1 same-check amendment: the four G1 spans are stripped first — v9's only other deltas, strip-proven in the G1 suite)");
}

/* ============================ C3 (product class & BOM) ============================ */
suite("C3", null); // Phase C · C3 — product class & BOM (design §3 + §4.1)
{
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const lineOf = (e, account) => e.lines.find((l) => l.account === account);

  /* ---- the class resolver (real, lib/transfers) ---- */
  check(transfers.inventoryAccountFor({}) === "inventory",
    "class: a product with no class flag resolves to `inventory` (goods)");
  check(transfers.inventoryAccountFor({ stockClass: null }) === "inventory",
    "class: stockClass null resolves to `inventory` (goods)");
  check(transfers.inventoryAccountFor({ stockClass: "raw" }) === "inventory_raw",
    "class: stockClass raw resolves to `inventory_raw`");

  /* ---- the split helper (real, lib/ledger classLegLines) ---- */
  check(eq(ledger.classLegLines(34500, 0, "debit"),
        [{ account: "inventory", debit: 34500, credit: 0 }]),
    "split: no raw share ⇒ the single legacy `inventory` line, byte-identical");
  check(eq(ledger.classLegLines(34500, 0, "credit"),
        [{ account: "inventory", debit: 0, credit: 34500 }]),
    "split: no raw share on the credit side ⇒ the single legacy line");
  check(eq(ledger.classLegLines(0, 0, "debit"),
        [{ account: "inventory", debit: 0, credit: 0 }]),
    "split: a zero movement keeps the legacy zero line (makeEntry filters it, as before)");
  check(eq(ledger.classLegLines(34500, 10000, "debit"),
        [{ account: "inventory", debit: 24500, credit: 0 },
         { account: "inventory_raw", debit: 10000, credit: 0 }]),
    "split: a mixed movement splits per class, goods line first, parts sum to the total");
  check(eq(ledger.classLegLines(5000, 5000, "credit"),
        [{ account: "inventory_raw", debit: 0, credit: 5000 }]),
    "split: an all-raw movement is a single `inventory_raw` line");
  {
    // Float-dust discipline: the parts must sum to the total to
    // the paisa and the composed entry must balance.
    const legs = ledger.classLegLines(100.005, 33.335, "debit");
    const sum = legs.reduce((a, l) => a + l.debit, 0);
    const e = ledger.makeEntry("dust", "adjustment", null, [
      ...legs,
      { account: "capital", debit: 0, credit: 100.005 },
    ]);
    check(Math.abs(sum - 100.005) < 0.01 && ledger.entryBalances(e),
      "split: fractional-paisa shares still sum to the total (final-absorb) and balance");
  }

  /* ---- the no-raw regression gate at template level ---- */
  {
    // postBill's tail, pre-C3 vs generalised with zero raw share.
    const legacyTail = [{ account: "inventory", debit: 0, credit: 1380 }];
    check(eq(legacyTail, ledger.classLegLines(1380, 0, "credit")),
      "regression: the bill COGS tail with no raw lines is byte-identical to pre-C3");
    // recordPurchase's full entry, legacy vs generalised.
    const strip = (e) => { const { ts, id, ...rest } = e; return JSON.stringify(rest); };
    const legacy = ledger.makeEntry("Purchase — stock received", "purchase", "pur-x", [
      { account: "purchases", debit: 34500, credit: 0 },
      { account: "inventory", debit: 34500, credit: 0 },
      { account: "purchases", debit: 0, credit: 34500 },
      { account: "payables", debit: 0, credit: 34500, ref: "sup-1" },
    ]);
    const generalised = ledger.makeEntry("Purchase — stock received", "purchase", "pur-x", [
      { account: "purchases", debit: 34500, credit: 0 },
      ...ledger.classLegLines(34500, 0, "debit"),
      { account: "purchases", debit: 0, credit: 34500 },
      { account: "payables", debit: 0, credit: 34500, ref: "sup-1" },
    ]);
    check(strip(legacy) === strip(generalised),
      "regression: the whole purchase entry with no raw lines is byte-identical to pre-C3");
  }

  /* ---- purchase legs: raw + mixed, tax untouched (real tax engine) ---- */
  {
    const gst = { id: "gst17", name: "GST 17%", kind: "percent", rate: 17, inclusive: false, active: true };
    const pt = tax.computePurchaseTaxes([
      { total: 24500, qty: 100, slab: gst },   // goods line, exclusive GST
      { total: 10000, qty: 50, slab: null },   // raw line, untaxed
    ]);
    check(pt.netTotal === 34500 && pt.taxAmount === 4165 && pt.grossTotal === 38665,
      "purchase: the tax composition is untouched by class (net 34,500 + GST 4,165 = gross 38,665)");
    // The store's raw-share derivation: Σ per-line NET bases of raw lines.
    const rawShare = [24500, 10000].reduce(
      (a, _t, i) => a + (i === 1 ? pt.lines[i].base : 0), 0);
    check(rawShare === 10000 && pt.lines[0].base === 24500,
      "purchase: per-line bases split cleanly by class (goods 24,500 / raw 10,000)");
    const entry = ledger.makeEntry("Purchase — stock received", "purchase", "pur-y", [
      { account: "purchases", debit: pt.netTotal, credit: 0 },
      { account: "tax_input", debit: pt.taxAmount, credit: 0 },
      ...ledger.classLegLines(pt.netTotal, rawShare, "debit"),
      { account: "purchases", debit: 0, credit: pt.netTotal },
      { account: "payables", debit: 0, credit: pt.grossTotal, ref: "sup-1" },
    ]);
    check(lineOf(entry, "inventory").debit === 24500 &&
          lineOf(entry, "inventory_raw").debit === 10000 &&
          lineOf(entry, "tax_input").debit === 4165 &&
          lineOf(entry, "payables").credit === 38665 &&
          ledger.entryBalances(entry),
      "purchase: a mixed purchase splits its inventory leg per class; tax + payables legs unchanged");
    const allRaw = ledger.makeEntry("Purchase — stock received", "purchase", "pur-z", [
      { account: "purchases", debit: 10000, credit: 0 },
      ...ledger.classLegLines(10000, 10000, "debit"),
      { account: "purchases", debit: 0, credit: 10000 },
      { account: "payables", debit: 0, credit: 10000, ref: "sup-1" },
    ]);
    check(allRaw.lines.filter((l) => l.account === "inventory").length === 0 &&
          lineOf(allRaw, "inventory_raw").debit === 10000,
      "purchase: an all-raw purchase debits only `inventory_raw`");
  }

  /* ---- sale / counter / return mirrors ---- */
  {
    // Bill COGS: goods 2 × 390 + raw 3 × 200 = 1,380.
    const legs = ledger.classLegLines(1380, 600, "credit");
    check(eq(legs, [{ account: "inventory", debit: 0, credit: 780 },
                    { account: "inventory_raw", debit: 0, credit: 600 }]),
      "sale: a mixed bill's COGS credit splits per class (780 goods / 600 raw)");
    // Counter sale of a raw product: the tail line is its class account.
    const counterTail = {
      account: transfers.inventoryAccountFor({ stockClass: "raw" }),
      debit: 0, credit: 3 * 200,
    };
    check(counterTail.account === "inventory_raw" && counterTail.credit === 600,
      "sale: a raw product sold at the counter credits `inventory_raw`");
    check(eq(ledger.classLegLines(500, 200, "debit"),
          [{ account: "inventory", debit: 300, credit: 0 },
           { account: "inventory_raw", debit: 200, credit: 0 }]),
      "return: a mixed sale return debits each class account its own share back");
    check(eq(ledger.classLegLines(5000, 2000, "credit"),
          [{ account: "inventory", debit: 0, credit: 3000 },
           { account: "inventory_raw", debit: 0, credit: 2000 }]),
      "purchase return: the inventory credit splits per class over the per-item nets");
  }

  /* ---- the reclass builder (real, lib/transfers) ---- */
  {
    const goods = { id: "p-g", name: "Atta 20kg", stockClass: null };
    const raw = { id: "p-r", name: "Bulk Rice 5kg", stockClass: "raw" };
    const flip = transfers.buildReclassEntry(goods, "raw", 10, 250);
    check(flip !== null && flip.refType === "reclass" && flip.refId === "p-g" &&
          eq(flip.lines, [{ account: "inventory_raw", debit: 2500, credit: 0 },
                          { account: "inventory", debit: 0, credit: 2500 }]),
      "reclass: goods → raw with stock posts exactly ONE entry of stockQty × costPrice");
    const back = transfers.buildReclassEntry(raw, null, 10, 250);
    check(back !== null &&
          eq(back.lines, [{ account: "inventory", debit: 2500, credit: 0 },
                          { account: "inventory_raw", debit: 0, credit: 2500 }]),
      "reclass: raw → goods mirrors the entry");
    check(transfers.buildReclassEntry(goods, "raw", 0, 250) === null,
      "reclass: at zero stock the flip posts NOTHING (bare flag change)");
    check(transfers.buildReclassEntry(goods, "raw", 10, 0) === null,
      "reclass: at zero value the flip posts NOTHING");
    check(transfers.buildReclassEntry(goods, null, 10, 250) === null,
      "reclass: no class change ⇒ no entry");
    const neg = transfers.buildReclassEntry(goods, "raw", -4, 250);
    check(neg !== null &&
          eq(neg.lines, [{ account: "inventory", debit: 1000, credit: 0 },
                          { account: "inventory_raw", debit: 0, credit: 1000 }]),
      "reclass: a negative on-hand quantity reclasses as the mirror image");
    const journal = [
      ledger.makeEntry("Opening stock on product create", "adjustment", "p-g", [
        { account: "inventory", debit: 2500, credit: 0 },
        { account: "capital", debit: 0, credit: 2500 },
      ]),
      flip,
    ];
    check(ledger.accountBalance(journal, "inventory") === 0 &&
          ledger.accountBalance(journal, "inventory_raw") === 2500,
      "reclass: after the flip the whole shelf value sits in the new class account");
  }

  /* ---- the class identities over a mixed workload (replayed) ---- */
  {
    const j = [];
    j.push(ledger.makeEntry("Purchase — stock received", "purchase", "w1", [
      { account: "inventory", debit: 24500, credit: 0 },
      { account: "payables", debit: 0, credit: 24500, ref: "sup-1" },
    ]));
    j.push(ledger.makeEntry("Purchase — stock received", "purchase", "w2", [
      { account: "inventory_raw", debit: 10000, credit: 0 },
      { account: "payables", debit: 0, credit: 10000, ref: "sup-1" },
    ]));
    j.push(ledger.makeEntry("Bill #1", "bill", "w3", [
      { account: "cogs", debit: 1380, credit: 0 },
      { account: "receivables", debit: 2000, credit: 0, ref: "cu-1" },
      { account: "sales_revenue", debit: 0, credit: 2000 },
      ...ledger.classLegLines(1380, 600, "credit"),
    ]));
    j.push(ledger.makeEntry("Return against Bill #1", "return", "w3", [
      ...ledger.classLegLines(200, 200, "debit"),
      { account: "cogs", debit: 0, credit: 200 },
    ]));
    j.push(ledger.makeEntry("Stock damage — Atta", "adjustment", "w5", [
      { account: "inventory_loss", debit: 100, credit: 0 },
      { account: transfers.inventoryAccountFor({ stockClass: null }), debit: 0, credit: 100 },
    ]));
    j.push(ledger.makeEntry("Purchase return — goods sent back", "purchase_return", "w6", [
      { account: "payables", debit: 2000, credit: 0, ref: "sup-1" },
      ...ledger.classLegLines(2000, 2000, "credit"),
    ]));
    check(ledger.accountBalance(j, "inventory") === 24500 - 780 - 100,
      "identity: GL `inventory` == goods-class valued movements (24,500 − 780 − 100 = 23,620)");
    check(ledger.accountBalance(j, "inventory_raw") === 10000 - 600 + 200 - 2000,
      "identity: GL `inventory_raw` == raw-class valued movements (10,000 − 600 + 200 − 2,000 = 7,600)");
    const td = j.reduce((a, e) => a + e.lines.reduce((x, l) => x + l.debit, 0), 0);
    const tc = j.reduce((a, e) => a + e.lines.reduce((x, l) => x + l.credit, 0), 0);
    check(j.every((e) => ledger.entryBalances(e)) && Math.abs(td - tc) < 0.01,
      "identity: the whole mixed workload balances (trial balance 0)");
  }

  /* ---- BOM: validation, immutable versioning, standard costs ---- */
  {
    const products = [
      { id: "out", stockClass: null, costPrice: 500 },
      { id: "bulk", stockClass: "raw", costPrice: 1950 },
      { id: "salt", stockClass: null, costPrice: 78 },
    ];
    const draft = {
      outputProductId: "out", outputQty: 5, labourCost: 100, overheadCost: 50,
      lines: [{ productId: "bulk", qty: 1 }],
    };
    check(boms.validateBomDraft(products, draft) === null,
      "bom: a well-formed draft validates (goods-class components are legal too)");
    check(boms.validateBomDraft(products, { ...draft, lines: [{ productId: "out", qty: 1 }] }) === "self_component",
      "bom: a product listing ITSELF as a component is refused (self_component)");
    check(boms.validateBomDraft(products, { ...draft, outputProductId: "bulk" }) === "output_raw",
      "bom: a raw material cannot be a recipe's output (output_raw)");
    check(boms.validateBomDraft(products, { ...draft, lines: [] }) === "empty_lines",
      "bom: a recipe with no components is refused (empty_lines)");
    check(boms.validateBomDraft(products, { ...draft, lines: [{ productId: "ghost", qty: 1 }] }) === "unknown_component",
      "bom: an unknown component is refused (unknown_component)");
    check(boms.validateBomDraft(products, { ...draft, lines: [{ productId: "bulk", qty: 0 }] }) === "bad_qty",
      "bom: a zero component quantity is refused (bad_qty)");
    check(boms.validateBomDraft(products, { ...draft, outputQty: 0 }) === "bad_batch",
      "bom: a zero batch size is refused (bad_batch)");
    check(boms.validateBomDraft(products, { ...draft, outputProductId: "ghost" }) === "output_unknown",
      "bom: an unknown output product is refused (output_unknown)");

    // The store's versioning composition, over the real helpers:
    // save v1, then save again — n+1 mints, n deactivates, both stay.
    let list = [];
    const save = (d) => {
      const prev = list.find((b) => b.outputProductId === d.outputProductId && b.active);
      const bom = {
        id: `bom-${list.length + 1}`, outputProductId: d.outputProductId,
        outputName: "Out", outputQty: d.outputQty,
        version: boms.nextBomVersion(list, d.outputProductId),
        lines: d.lines.map((l) => ({ ...l, name: l.productId })),
        labourCost: d.labourCost, overheadCost: d.overheadCost,
        active: true, note: "", ts: "2026-01-01T00:00:00.000Z",
      };
      list = [...list.map((b) => (prev && b.id === prev.id ? { ...b, active: false } : b)), bom];
      return bom;
    };
    const v1 = save(draft);
    check(v1.version === 1 && boms.activeBomFor(list, "out") === v1,
      "bom: the first save mints version 1, active");
    const v2 = save({ ...draft, outputQty: 6 });
    const history = boms.bomsForOutput(list, "out");
    check(v2.version === 2 && history.length === 2 &&
          history[0].version === 1 && history[0].active === false &&
          history[0].outputQty === 5 && boms.activeBomFor(list, "out").version === 2,
      "bom: an edit is version n+1 — version n stays readable, deactivated, unrewritten");
    check(boms.bomOutputIds(list).length === 1 &&
          boms.nextBomVersion(list, "other") === 1,
      "bom: versions are per output product (a new product starts at 1)");
    check(boms.bomBatchMaterialCost(v1, products) === 1950 &&
          boms.bomUnitCost(v1, products) === 420,
      "bom: standard costs — batch materials 1,950; unit (1,950 + 100 + 50) / 5 = 420");
  }

  /* ---- seed / demo: the demo BOM posts nothing; fresh seeds stay class-free ---- */
  {
    const seedProducts = seed.getSeedProducts();
    const demoBoms = seed.getSeedBoms(seedProducts);
    check(demoBoms.length === 1 && demoBoms[0].outputProductId === "p02" &&
          demoBoms[0].version === 1 && demoBoms[0].active === true &&
          demoBoms[0].lines.length === 1 &&
          demoBoms[0].lines[0].productId === seed.SEED_DEMO_RAW_PRODUCT_ID &&
          demoBoms[0].outputQty === 5,
      "seed: ONE demo BOM — bulk rice (p25) repacked into 1 kg packs (p02), batch of 5");
    check(seedProducts.every((p) => p.stockClass == null),
      "seed: the seed product list carries NO raw products — a fresh shop's journal is the frozen one");
  }

  /* ---- RBAC: the manufacturing row (design §6.1) ---- */
  check(perm.can("owner", "manufacturing", "write") && perm.can("manager", "manufacturing", "write"),
    "RBAC: owner/manager write recipes (manufacturing row F/F)");
  check(!perm.can("cashier", "manufacturing", "view"),
    "RBAC: the cashier never reaches the manufacturing surface (row N)");
  check(perm.can("accountant", "manufacturing", "view") && !perm.can("accountant", "manufacturing", "write"),
    "RBAC: the accountant reads recipes but cannot write them (row R)");

  /* ---- i18n parity for the C3 strings ---- */
  const mfgKeys = Object.keys(i18n.en).filter((k) => k.startsWith("mfg.") || k === "nav.manufacturing");
  /* Phase C · C4 amended this count (same parity check): the
   * mfg part grew by the 86 production keys (orders, issue,
   * completion, scrap, close, events, print).
   * The UX overhaul amended it again (same check): +1 mfg key. */
  check(mfgKeys.length === 131, `i18n: the mfg part carries ${mfgKeys.length} keys (131 expected — 44 C3 + 86 C4 + 1 UX)`);
  check(mfgKeys.every((k) => typeof i18n.ur[k] === "string" && i18n.ur[k].length > 0),
    "i18n: every C3 key present and non-empty in Urdu (parity)");
  const invKeys = ["inv.form.class", "inv.class.goods", "inv.class.raw",
    "inv.form.classHint", "inv.form.classReclassNote", "inv.rawBadge"];
  check(invKeys.every((k) => typeof i18n.en[k] === "string" && i18n.en[k].length > 0 &&
        typeof i18n.ur[k] === "string" && i18n.ur[k].length > 0),
    "i18n: the product-class strings (form, hint, reclass note, raw badge) exist in both languages");
  check(typeof i18n.en["fin.acct.inventory_raw"] === "string" &&
        typeof i18n.en["fin.acct.wip"] === "string" &&
        i18n.ur["fin.acct.inventory_raw"].length > 0 && i18n.ur["fin.acct.wip"].length > 0,
    "i18n: the Phase A account labels for `inventory_raw` + `wip` exist in both languages (§8 verification)");

  /* ---- source invariants: the store wiring ---- */
  const storeSrcC3 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx", "utf8");
  check(storeSrcC3.includes('"boms"') && storeSrcC3.includes('"dukaan-ai-store-v13"') &&
        storeSrcC3.includes("saveBomVersion") && storeSrcC3.includes("buildReclassEntry("),
    "source: boms collection wired + v13 demo bump + the save/reclass actions exist");
  check((storeSrcC3.match(/makeEntry\(/g) || []).length === 24,
    "source: still 24 makeEntry calls in the store — the reclass composes in lib/transfers (C2 pattern)");
  check(!storeSrcC3.includes('account: "inventory"') &&
        (storeSrcC3.match(/classLegLines\(/g) || []).length >= 5 &&
        (storeSrcC3.match(/inventoryAccountFor\(/g) || []).length >= 3,
    "source: NO stock-value template in the store hardcodes the `inventory` account — the split paths (bill/returns/purchase/purchase-return/import) go through classLegLines, the single-product paths (adjustments/opening, revaluation, counter sale) through inventoryAccountFor, the reclass through lib's builder");

  /* ---- rules: additive boms block only ---- */
  const rulesC3 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8");
  const c3Seg = rulesC3.slice(
    rulesC3.indexOf("      // Phase C · C3"),
    rulesC3.indexOf("      // Phase C · C4"));
  check(c3Seg.includes("match /boms/{bomId}") &&
        c3Seg.includes("allow read: if canAccess(uid);") &&
        c3Seg.includes("hasRole(uid, ['owner', 'manager'])"),
    "rules: boms block — read canAccess, write owner/manager (design §6.2)");
  check(!c3Seg.includes("createInOpenPeriod"),
    "rules: NO period backstop on boms — a recipe posts nothing (§7)");
  const strippedC3 = stripG1Blocks(stripG2Blocks(rulesC3.slice(0, rulesC3.indexOf("      // Phase C · C3")) +
    rulesC3.slice(rulesC3.indexOf("      // Expenses:"))));
  check(crypto.createHash("sha256").update(strippedC3, "utf8").digest("hex") ===
        "fbacf2980246845b7293b5b9e66913aaa191212ce766c4d1f50fd1d9fe023603",
    "rules: stripping the C3 block reproduces the pre-C3 file byte-for-byte (additive only; G1 same-check amendment: the four G1 spans are stripped first — v9's only other deltas, strip-proven in the G1 suite)");
}

/* ============================ C4 (production orders) ============================ */
suite("C4", null); // Phase C · C4 — production orders (design §4)
{
  const MAIN = "wh-main";
  const GODOWN = seed.SEED_GODOWN_ID;
  const whs = seed.getSeedWarehouses();
  const dLine = (e, account, ref) =>
    e.lines.find((l) => l.account === account && l.debit > 0 && (ref === undefined || l.ref === ref));
  const cLine = (e, account, ref) =>
    e.lines.find((l) => l.account === account && l.credit > 0 && (ref === undefined || l.ref === ref));

  /* Fixture shop: two raw materials, one goods component, one
   * finished product; all stock at the default warehouse. The
   * scenario journal starts EMPTY — identities are asserted
   * within the scenario, and the frozen seed is re-verified at
   * the end. */
  const products = [
    { id: "flour", name: "Flour (bulk)", stockClass: "raw", costPrice: 100, stockQty: 100 },
    { id: "sugar", name: "Sugar (bulk)", stockClass: "raw", costPrice: 50, stockQty: 100 },
    { id: "bottle", name: "Glass bottle", stockClass: null, costPrice: 20, stockQty: 200 },
    { id: "jam", name: "Mixed fruit jam 500g", stockClass: null, costPrice: 300, stockQty: 5 },
  ];
  let levels = stock.stockV1Rows(products, []);
  const j = [];
  const till = accounts.find((a) => a.legacyFor === "cash");
  const prod = (id) => products.find((p) => p.id === id);
  const glWip = () => ledger.accountBalance(j, "wip");
  const pools = (...os) => os.reduce((a, o) => a + production.poolOf(o), 0);
  const driftSilent = () => stock.stockDrift(products, levels, []).length === 0;
  const qtyEvent = (kind, qty, value, entry) =>
    ({ kind, qty, value, entryId: entry.id, dayOffset: 0, ts: "2026-01-01T00:00:00.000Z" });
  /* Land an event exactly as the store's demo path does
   * (commitProductionEvent): entry appended, product totals +
   * rows moved by the event, status label recomputed from the
   * derivation. */
  const land = (order, event, entry, fx = {}) => {
    if (entry) j.push(entry);
    if (event.kind === "issue") {
      for (const l of event.lines) {
        prod(l.productId).stockQty -= l.qty;
        levels = stock.applyLevelDelta(levels, order.warehouseId, l.productId, -l.qty);
      }
    }
    if (event.kind === "completion") {
      prod(order.outputProductId).stockQty += event.qty;
      if (fx.unitCost !== undefined) prod(order.outputProductId).costPrice = fx.unitCost;
      levels = stock.applyLevelDelta(levels, order.warehouseId, order.outputProductId, event.qty);
    }
    const next = { ...order, events: [...order.events, event] };
    next.status = production.deriveProductionStatus(next);
    return next;
  };

  const bomV1 = {
    id: "bom-jam-1", outputProductId: "jam", outputName: "Mixed fruit jam 500g",
    outputQty: 10, version: 1, active: true, labourCost: 500, overheadCost: 300,
    note: "", ts: "2026-01-01T00:00:00.000Z",
    lines: [
      { productId: "flour", name: "Flour (bulk)", qty: 20 },
      { productId: "sugar", name: "Sugar (bulk)", qty: 10 },
      { productId: "bottle", name: "Glass bottle", qty: 10 },
    ],
  };
  const mkOrder = (id, number, plannedQty, status = "open") => ({
    id, number, bomId: bomV1.id, bomVersion: 1,
    bomSnapshot: production.snapshotOfBom(bomV1),
    outputProductId: "jam", outputName: "Mixed fruit jam 500g",
    warehouseId: MAIN, plannedQty, events: [], note: "", status,
    dayOffset: 0, ts: "2026-01-01T00:00:00.000Z",
  });

  /* ---- the snapshot: mid-order BOM edits never re-cost (§3.2/R-C4) ---- */
  {
    const bomMutable = JSON.parse(JSON.stringify(bomV1));
    const snapOrder = { ...mkOrder("ord-snap", null, 10, "draft"), bomSnapshot: production.snapshotOfBom(bomMutable) };
    bomMutable.lines[0].qty = 999;
    bomMutable.labourCost = 9999;
    check(snapOrder.bomSnapshot.lines[0].qty === 20 && snapOrder.bomSnapshot.labourCost === 500,
      "snapshot: the order's recipe is a deep copy — editing the BOM afterwards changes nothing on the order");
    const defs = production.defaultIssueLines(snapOrder, 10);
    check(defs.find((l) => l.productId === "flour")?.qty === 20 && defs.find((l) => l.productId === "sugar")?.qty === 10,
      "snapshot: issue defaults scale the SNAPSHOT (flour 20 per batch), never the edited recipe");
    const conv = production.defaultIssueConversion(snapOrder, 20);
    check(eq(conv.labourCost, 1000) && eq(conv.overheadCost, 600),
      "snapshot: default conversion scales per-batch labour/overhead by run size");
  }

  /* ---- Scenario A: the full worked production (paid labour) ---- */
  let orderA = mkOrder("ord-a", "PR-1", 20);
  const inA = {
    runQty: 10, lines: production.defaultIssueLines(orderA, 10),
    labourCost: 500, overheadCost: 300, settlement: "paid", paidFromAccountId: till.id,
  };
  const prepA1 = production.prepareIssue(orderA, products, levels, whs, accounts, inA);
  check("prepared" in prepA1, "A: the first issue prepares (components in stock at the order warehouse)");
  const P1 = prepA1.prepared;
  check(eq(P1.materialsValue, 2700) && eq(P1.event.value, 3500),
    "A: materials valued at snapshot shelf costs (flour 2,000 + sugar 500 + bottle 200 = 2,700); event value adds the run's labour + overhead (3,500)");
  const e1 = P1.entry;
  check(e1.refType === "production_issue" && e1.refId === "ord-a" && ledger.entryBalances(e1),
    "A: the issue is ONE balanced entry, refType production_issue, refId the order");
  check(eq(dLine(e1, "wip", "ord-a")?.debit, 3500),
    "A: Dr wip (ref: order) carries materials + labour + overhead");
  check(eq(cLine(e1, "inventory_raw", "flour")?.credit, 2000) && eq(cLine(e1, "inventory_raw", "sugar")?.credit, 500),
    "A: raw components credit `inventory_raw`, one line per component, ref'd to the product (§4.1)");
  check(eq(cLine(e1, "inventory", "bottle")?.credit, 200),
    "A: a GOODS-class component credits `inventory` — the class split follows the component (§3.3)");
  check(eq(cLine(e1, "cash", till.id)?.credit, 800),
    "A: paid settlement credits the money account's bucket with the account as ref (labour 500 + overhead 300)");
  check(P1.event.paidFromAccountId === till.id && P1.event.lines.length === 3,
    "A: the event stamps the paying account and carries the valued component lines");
  orderA = land(orderA, P1.event, P1.entry);
  check(eq(production.poolOf(orderA), 3500) && eq(glWip(), 3500) && eq(glWip(), pools(orderA)),
    "A §4.3: after issue 1, GL wip == Σ pools == 3,500");
  check(prod("flour").stockQty === 80 && stock.rowQtyOf(levels, MAIN, "flour") === 80 && driftSilent(),
    "A: component totals and the order warehouse's rows drop together (§1.3 identity holds)");

  const prepA2 = production.prepareIssue(orderA, products, levels, whs, accounts, inA);
  check("prepared" in prepA2, "A: the second run's issue prepares");
  orderA = land(orderA, prepA2.prepared.event, prepA2.prepared.entry);
  check(eq(production.poolOf(orderA), 7000) && eq(glWip(), pools(orderA)) && prod("flour").stockQty === 60,
    "A §4.3: after issue 2, pool == GL wip == 7,000");

  const cA1 = production.completionAbsorb(orderA, 8, false);
  check("value" in cA1 && eq(cA1.value, 2800) && eq(cA1.unitCost, 350),
    "A: a partial completion absorbs pool × F / remaining plan (7,000 × 8/20 = 2,800; unit cost 350)");
  const ceA1 = production.buildCompletionEntry(orderA, 8, cA1.value);
  check(ceA1.refType === "production_complete" && eq(dLine(ceA1, "inventory", "ord-a")?.debit, 2800) &&
        eq(cLine(ceA1, "wip", "ord-a")?.credit, 2800),
    "A: completion entry — Dr inventory / Cr wip at the absorbed value, both legs ref'd to the order");
  orderA = land(orderA, qtyEvent("completion", 8, cA1.value, ceA1), ceA1, { unitCost: cA1.unitCost });
  check(prod("jam").stockQty === 13 && eq(prod("jam").costPrice, 350) &&
        stock.rowQtyOf(levels, MAIN, "jam") === 13 && eq(production.poolOf(orderA), 4200) && eq(glWip(), pools(orderA)),
    "A: finished units land in the order warehouse's row; the shelf costPrice becomes the absorbed unit cost (350)");

  const sA = production.scrapAbsorb(orderA, 2);
  check("value" in sA && eq(sA.value, 700),
    "A: scrap absorbs the same share a completion would (4,200 × 2/12 = 700)");
  const seA = production.buildScrapEntry(orderA, 2, sA.value, "scrap");
  check(seA.refType === "production_scrap" && eq(dLine(seA, "inventory_loss")?.debit, 700) &&
        eq(cLine(seA, "wip", "ord-a")?.credit, 700),
    "A: scrap entry — Dr inventory_loss / Cr wip");
  orderA = land(orderA, qtyEvent("scrap", 2, sA.value, seA), seA);
  check(eq(production.poolOf(orderA), 3500) && eq(glWip(), pools(orderA)) && prod("jam").stockQty === 13 && driftSilent(),
    "A: scrap moves NO stock rows — spoiled units were never finished stock");

  const cA2 = production.completionAbsorb(orderA, 12, false);
  check("value" in cA2 && eq(cA2.value, 3500) && eq(cA2.unitCost, 291.67),
    "A: reaching the plan makes the completion FINAL — it absorbs the entire remaining pool (3,500; unit 291.67)");
  const ceA2 = production.buildCompletionEntry(orderA, 12, cA2.value);
  orderA = land(orderA, qtyEvent("completion", 12, cA2.value, ceA2), ceA2, { unitCost: cA2.unitCost });
  check(production.poolOf(orderA) === 0 && production.producedQty(orderA) === 20 && orderA.status === "completed",
    "A: the final completion zeroes the pool exactly and the order completes");
  check(eq(production.completedValue(orderA) + production.writtenOffValue(orderA), production.issuedValue(orderA)) &&
        eq(production.issuedValue(orderA), 7000),
    "A §4.3 roll-up: completions (6,300) + scraps (700) == issues (7,000) to the paisa — nothing strands in WIP");
  check(prod("jam").stockQty === 25 && eq(prod("jam").costPrice, 291.67) && eq(glWip(), 0) && driftSilent(),
    "A: finished stock 25 on the shelf and in the row; GL wip back to 0");

  /* ---- Scenario B: accrued labour, closed with nothing produced ---- */
  let orderB = mkOrder("ord-b", "PR-2", 10);
  const prepB = production.prepareIssue(orderB, products, levels, whs, accounts, {
    runQty: 10, lines: production.defaultIssueLines(orderB, 10),
    labourCost: 500, overheadCost: 300, settlement: "accrue", paidFromAccountId: null,
  });
  check("prepared" in prepB, "B: the accrued issue prepares");
  const eB = prepB.prepared.entry;
  check(eq(cLine(eB, "salary_payable")?.credit, 800) &&
        !eB.lines.some((l) => l.account === "cash" || l.account === "wallet"),
    "B: accrued settlement credits `salary_payable` and touches NO money account (§4.4)");
  check(prepB.prepared.event.paidFromAccountId === "accrue",
    "B: the event stamps the accrual settlement");
  orderB = land(orderB, prepB.prepared.event, prepB.prepared.entry);
  check(eq(ledger.accountNormalBalance(j, "salary_payable"), 800) && eq(glWip(), 3500) && eq(glWip(), pools(orderA, orderB)),
    "B §4.3: GL wip == Σ pools across live orders (0 + 3,500); the accrual sits in salary_payable");
  const poolB = production.poolOf(orderB);
  const ceB = production.buildScrapEntry(orderB, 0, poolB, "closeout");
  check(ceB.refType === "production_scrap" && eq(dLine(ceB, "inventory_loss")?.debit, 3500),
    "B: the closeout entry posts the residual as production_scrap (§6.4)");
  orderB = land(orderB, qtyEvent("closeout", 0, poolB, ceB), ceB);
  orderB = { ...orderB, status: production.producedQty(orderB) > 0 ? "completed" : "cancelled" };
  check(production.poolOf(orderB) === 0 && orderB.status === "cancelled" && eq(glWip(), 0),
    "B: closing a never-produced order lands it cancelled with its pool fully written off");
  check(eq(ledger.accountBalance(j, "inventory_loss"), 4200),
    "B: inventory_loss now carries scrap (700) + closeout (3,500)");

  /* ---- Scenario C: over-production spreads the whole pool ---- */
  let orderC = mkOrder("ord-c", "PR-3", 10);
  const prepC = production.prepareIssue(orderC, products, levels, whs, accounts, {
    runQty: 10, lines: [{ productId: "flour", qty: 10 }],
    labourCost: 0, overheadCost: 0, settlement: "paid", paidFromAccountId: till.id,
  });
  check("prepared" in prepC && eq(prepC.prepared.event.value, 1000) &&
        prepC.prepared.event.paidFromAccountId === null && prepC.prepared.entry.lines.length === 2,
    "C: zero conversion cost ⇒ no settlement line at all and a null event stamp");
  orderC = land(orderC, prepC.prepared.event, prepC.prepared.entry);
  const cC = production.completionAbsorb(orderC, 15, false);
  check("value" in cC && eq(cC.value, 1000) && eq(cC.unitCost, 66.67),
    "C: completing beyond plan is a final completion — the whole pool (1,000) spreads over all 15 units (66.67)");
  const ceC = production.buildCompletionEntry(orderC, 15, cC.value);
  orderC = land(orderC, qtyEvent("completion", 15, cC.value, ceC), ceC, { unitCost: cC.unitCost });
  check(production.producedQty(orderC) === 15 && production.poolOf(orderC) === 0 && orderC.status === "completed" && eq(glWip(), 0),
    "C: over-production completes with pool exactly 0");

  /* ---- Scenario D: closeout residual after partial production ---- */
  let orderD = mkOrder("ord-d", "PR-4", 10);
  const prepD = production.prepareIssue(orderD, products, levels, whs, accounts, {
    runQty: 10,
    lines: [{ productId: "sugar", qty: 20 }, { productId: "bottle", qty: 10 }],
    labourCost: 0, overheadCost: 0, settlement: "paid", paidFromAccountId: null,
  });
  check("prepared" in prepD && eq(prepD.prepared.event.value, 1200), "D: the issue prepares at 1,200");
  orderD = land(orderD, prepD.prepared.event, prepD.prepared.entry);
  const cD = production.completionAbsorb(orderD, 4, false);
  check("value" in cD && eq(cD.value, 480), "D: partial completion absorbs 1,200 × 4/10 = 480");
  const ceD = production.buildCompletionEntry(orderD, 4, cD.value);
  orderD = land(orderD, qtyEvent("completion", 4, cD.value, ceD), ceD, { unitCost: cD.unitCost });
  const poolD = production.poolOf(orderD);
  check(eq(poolD, 720), "D: the residual pool before close is exactly 720");
  const ceoD = production.buildScrapEntry(orderD, 0, poolD, "closeout");
  orderD = land(orderD, qtyEvent("closeout", 0, poolD, ceoD), ceoD);
  orderD = { ...orderD, status: production.producedQty(orderD) > 0 ? "completed" : "cancelled" };
  check(production.poolOf(orderD) === 0 && orderD.status === "completed" &&
        eq(ledger.accountBalance(j, "inventory_loss"), 4920) && eq(glWip(), 0),
    "D: close-out posts the residual to inventory_loss EXACTLY (720) and the half-produced order lands completed");
  check(driftSilent(), "D: the §1.3 quantity identity held through every scenario (Σ rows == stockQty per product)");

  /* ---- Scenario E: the paisa discipline (F-3's third appearance) ---- */
  {
    const eProducts = [{ id: "sugar-e", name: "Sugar", stockClass: "raw", costPrice: 50, stockQty: 10 }];
    const eLevels = stock.stockV1Rows(eProducts, []);
    let orderE = {
      ...mkOrder("ord-e", "PR-5", 3),
      bomSnapshot: { outputQty: 3, lines: [{ productId: "sugar-e", name: "Sugar", qty: 2 }], labourCost: 0, overheadCost: 0 },
    };
    const prepE = production.prepareIssue(orderE, eProducts, eLevels, whs, [], {
      runQty: 3, lines: [{ productId: "sugar-e", qty: 2 }],
      labourCost: 0, overheadCost: 0, settlement: "paid", paidFromAccountId: null,
    });
    check("prepared" in prepE && eq(prepE.prepared.event.value, 100),
      "E: the paisa fixture issues a pool of exactly 100 against a plan of 3");
    orderE = { ...orderE, events: [...orderE.events, prepE.prepared.event] };
    const v1 = production.completionAbsorb(orderE, 1, false);
    check("value" in v1 && eq(v1.value, 33.33), "E: completion 1 of 3 absorbs round2(100/3) = 33.33");
    orderE = { ...orderE, events: [...orderE.events, { kind: "completion", qty: 1, value: v1.value, entryId: "j-e1", dayOffset: 0, ts: "" }] };
    const v2 = production.completionAbsorb(orderE, 1, false);
    check("value" in v2 && eq(v2.value, 33.34), "E: completion 2 absorbs round2(66.67/2) = 33.34 (cumulative average, not a fresh third)");
    orderE = { ...orderE, events: [...orderE.events, { kind: "completion", qty: 1, value: v2.value, entryId: "j-e2", dayOffset: 0, ts: "" }] };
    const v3 = production.completionAbsorb(orderE, 1, false);
    check("value" in v3 && eq(v3.value, 33.33) && production.poolOf(orderE) > 0,
      "E: the last unit is a final completion — it takes the whole remainder (33.33)");
    orderE = { ...orderE, events: [...orderE.events, { kind: "completion", qty: 1, value: v3.value, entryId: "j-e3", dayOffset: 0, ts: "" }] };
    check(production.poolOf(orderE) === 0 && eq(production.completedValue(orderE), 100),
      "E: Σ completions == the issue to the paisa (33.33 + 33.34 + 33.33 == 100) — no residue strands in WIP");
  }

  /* ---- refusals: everything fails BEFORE composition ---- */
  const draftOrder = mkOrder("ord-f", null, 10, "draft");
  check(production.completionAbsorb(draftOrder, 1, false).problem === "not_open",
    "refusal: a draft order completes nothing (it has issued nothing)");
  const freshOpen = mkOrder("ord-g", "PR-9", 10);
  check(production.completionAbsorb(freshOpen, 1, false).problem === "empty_pool",
    "refusal: completion with an empty pool — the units' materials were never issued (§4.2)");
  check(production.scrapAbsorb(freshOpen, 1).problem === "empty_pool",
    "refusal: scrap with an empty pool");
  check(production.completionAbsorb(orderA, 1, false).problem === "not_open",
    "refusal: a completed order takes no further events");
  const rClosed = production.prepareIssue(orderA, products, levels, whs, accounts, inA);
  check("problem" in rClosed && rClosed.problem === "not_open",
    "refusal: no issue against a completed order");
  check(production.scrapAbsorb(orderD, 1).problem === "not_open",
    "refusal: a closed-out (completed) order takes no further events — its pool already left WIP exactly");
  {
    // Per-warehouse discipline (§4.5): the stock exists, but at
    // the OTHER warehouse.
    const cocoaProducts = [{ id: "cocoa", name: "Cocoa powder", stockClass: "raw", costPrice: 80, stockQty: 12 }];
    const cocoaLevels = [stock.makeLevel(GODOWN, "cocoa", 12)];
    const cocoaOrder = {
      ...mkOrder("ord-h", "PR-10", 5),
      bomSnapshot: { outputQty: 5, lines: [{ productId: "cocoa", name: "Cocoa powder", qty: 6 }], labourCost: 0, overheadCost: 0 },
    };
    const cocoaInput = {
      runQty: 5, lines: [{ productId: "cocoa", qty: 6 }],
      labourCost: 0, overheadCost: 0, settlement: "paid", paidFromAccountId: null,
    };
    const rIns = production.prepareIssue(cocoaOrder, cocoaProducts, cocoaLevels, whs, accounts, cocoaInput);
    check("problem" in rIns && rIns.problem === "insufficient" && rIns.productId === "cocoa",
      "refusal: insufficient stock AT THE ORDER'S WAREHOUSE refuses the issue — another warehouse's rows are never silently reached for");
    const rOk = production.prepareIssue({ ...cocoaOrder, warehouseId: GODOWN }, cocoaProducts, cocoaLevels, whs, accounts, cocoaInput);
    check("prepared" in rOk, "the same issue prepares at the warehouse that actually holds the stock");
    const rOver = production.prepareIssue({ ...cocoaOrder, warehouseId: GODOWN }, cocoaProducts, cocoaLevels, whs, accounts,
      { ...cocoaInput, lines: [{ productId: "cocoa", qty: 13 }] });
    check("problem" in rOver && rOver.problem === "insufficient",
      "refusal: issuing more than the row holds refuses whole");
  }
  {
    const freeProducts = [{ id: "freebie", name: "Free sample sachet", stockClass: null, costPrice: 0, stockQty: 10 }];
    const freeLevels = stock.stockV1Rows(freeProducts, []);
    const freeOrder = {
      ...mkOrder("ord-i", "PR-11", 5),
      bomSnapshot: { outputQty: 5, lines: [{ productId: "freebie", name: "Free sample sachet", qty: 2 }], labourCost: 0, overheadCost: 0 },
    };
    const rZero = production.prepareIssue(freeOrder, freeProducts, freeLevels, whs, accounts, {
      runQty: 5, lines: [{ productId: "freebie", qty: 2 }],
      labourCost: 0, overheadCost: 0, settlement: "paid", paidFromAccountId: null,
    });
    check("problem" in rZero && rZero.problem === "zero_value",
      "refusal: an issue that would move no value at all posts nothing (zero-cost components, no conversion)");
    const rNoAcct = production.prepareIssue(freeOrder, freeProducts, freeLevels, whs, [], {
      runQty: 5, lines: [{ productId: "freebie", qty: 2 }],
      labourCost: 100, overheadCost: 0, settlement: "paid", paidFromAccountId: null,
    });
    check("problem" in rNoAcct && rNoAcct.problem === "no_account",
      "refusal: a paid settlement with no money account in the shop refuses");
    const rMerged = production.prepareIssue(freeOrder, freeProducts, freeLevels, whs, accounts, {
      runQty: 5, lines: [{ productId: "freebie", qty: 1 }, { productId: "freebie", qty: 1 }],
      labourCost: 10, overheadCost: 0, settlement: "accrue", paidFromAccountId: null,
    });
    check("prepared" in rMerged && rMerged.prepared.lines.length === 1 && rMerged.prepared.lines[0].qty === 2,
      "composition: duplicate picks of one component merge into a single valued line");
  }

  /* ---- numbering: the PR- series (§6.3) ---- */
  check(docs.nextDocNumber("productionOrder", [null, "PR-1", "PR-2"], null) === "PR-3",
    "numbering: PR- mints max+1 over the collection; drafts (null numbers) burn nothing");
  check(docs.nextDocNumber("productionOrder", ["PR-7"], { docSeries: { productionOrder: "MO-" } }) === "MO-8",
    "numbering: the owner's prefix override applies to future mints, sequence read prefix-agnostically");
  check(docs.SERIES_DEFAULT_PREFIX.productionOrder === "PR-",
    "numbering: the design default prefix is PR-");

  /* ---- the demo seed draft (§10.3) + the frozen ground ---- */
  const seedProductsC4 = seed.getSeedProducts();
  const seedOrders = seed.getSeedProductionOrders(
    seedProductsC4, seed.getSeedBoms(seedProductsC4));
  check(seedOrders.length === 1 && seedOrders[0].status === "draft" && seedOrders[0].number === null &&
        seedOrders[0].events.length === 0 && seedOrders[0].plannedQty === 10 &&
        seedOrders[0].warehouseId === MAIN && seedOrders[0].bomSnapshot.outputQty === 5,
    "seed: exactly ONE draft production order against the demo BOM (two batches planned), unnumbered, no events");
  check(production.poolOf(seedOrders[0]) === 0 && production.producedQty(seedOrders[0]) === 0,
    "seed: the draft carries no pool and no production — zero journal footprint");
  check(journal.length === 21, "frozen: the seed journal still has its 21 entries");
  const normalizedC4 = journal.map((e) => { const { ts, ...rest } = e; return rest; });
  const shaC4 = crypto.createHash("sha256").update(JSON.stringify(normalizedC4), "utf8").digest("hex");
  check(shaC4 === "e17e5bda19e87de698b0c0a37e923f9b396bc387e2092b2ffbbd7d60d4971168",
    "frozen: seed journal SHA unchanged (e17e5bda…1168)");
  check(eq(ledger.accountBalance(journal, "inventory"), 272805) && eq(ledger.accountBalance(journal, "cash"), 50000) &&
        eq(ledger.accountBalance(journal, "wip"), 0) && eq(ledger.accountBalance(journal, "salary_payable"), 0),
    "frozen: seed identities hold — Inventory 272,805 · Cash 50,000 · wip and salary_payable still zero on the seed");

  /* ---- RBAC: the manufacturing row (§6.1) ---- */
  check(perm.can("owner", "manufacturing", "write") && perm.can("manager", "manufacturing", "write") &&
        !perm.can("cashier", "manufacturing", "view") &&
        perm.can("accountant", "manufacturing", "view") && !perm.can("accountant", "manufacturing", "write"),
    "RBAC: production rides the manufacturing row — owner/manager run it, accountant reads, cashier never reaches the surface");

  /* ---- i18n parity for the C4 strings ---- */
  const c4Keys = Object.keys(i18n.en).filter((k) => /^mfg\.(po|issue|complete|scrap|close|ev|print)\./.test(k));
  check(c4Keys.length === 86, `i18n: the C4 production keys number ${c4Keys.length} (86 expected)`);
  check(c4Keys.every((k) => typeof i18n.ur[k] === "string" && i18n.ur[k].length > 0) &&
        typeof i18n.en["settings.series.productionOrder"] === "string" &&
        typeof i18n.ur["settings.series.productionOrder"] === "string" &&
        i18n.ur["settings.series.productionOrder"].length > 0,
    "i18n: every C4 key present and non-empty in Urdu (parity), incl. the numbering-settings label");

  /* ---- source invariants: the store + surface wiring ---- */
  const storeSrcC4 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx", "utf8");
  check(storeSrcC4.includes('"productionOrders"') && storeSrcC4.includes('"dukaan-ai-store-v14"') &&
        storeSrcC4.includes("prepareIssue") && storeSrcC4.includes("commitProductionEvent") &&
        storeSrcC4.includes("sub<ProductionOrder>") && storeSrcC4.includes("sub<Bom>"),
    "source: the collection, the v14 demo bump, the event writer and BOTH live subscriptions (incl. the C3 boms-subscription repair) are wired into the store");
  check((storeSrcC4.match(/makeEntry\(/g) || []).length === 24,
    "source: still 24 makeEntry calls in the store — production entries compose in lib/production, no new inline posting path");
  check(!storeSrcC4.includes('account: "wip"'),
    "source: no production journal template is inlined in the store");
  const mfgViewSrcC4 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/ManufacturingView.tsx", "utf8");
  const sectionSrcC4 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/ProductionSection.tsx", "utf8");
  const sheetSrcC4 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/DocPrintSheet.tsx", "utf8");
  check(mfgViewSrcC4.includes("ProductionSection") &&
        sectionSrcC4.includes('can(role, "manufacturing", "write")') &&
        sectionSrcC4.includes("completionAbsorb") && sectionSrcC4.includes("prepareIssue") &&
        sheetSrcC4.includes("export function ProductionPrintSheet"),
    "source: the production section + its print sheet ship on the manufacturing surface; desk previews compose through lib/production");

  /* ---- rules: additive productionOrders block only ---- */
  const rulesC4 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8");
  const c4Seg = rulesC4.slice(
    rulesC4.indexOf("      // Phase C · C4"),
    rulesC4.indexOf("      // Phase C · C5"));
  check(c4Seg.includes("match /productionOrders/{orderId}") &&
        c4Seg.includes("allow read: if canAccess(uid);") &&
        c4Seg.includes("hasRole(uid, ['owner', 'manager'])"),
    "rules: productionOrders block — read canAccess, write owner/manager (design §6.2)");
  check(!c4Seg.includes("createInOpenPeriod"),
    "rules: NO period backstop on the order doc — its events' entries are guarded creates at the journal (§6.2)");
  const strippedC4 = stripG1Blocks(stripG2Blocks(rulesC4.slice(0, rulesC4.indexOf("      // Phase C · C4")) +
    rulesC4.slice(rulesC4.indexOf("      // Expenses:"))));
  check(crypto.createHash("sha256").update(strippedC4, "utf8").digest("hex") ===
        "a8decf0291e8ca9a2939a8542f995848c8957891ae5c366063ec258ca6cf9f86",
    "rules: stripping the C4 block reproduces the pre-C4 file byte-for-byte (additive only; G1 same-check amendment: the four G1 spans are stripped first — v9's only other deltas, strip-proven in the G1 suite)");
}

/* =============================== C5 =============================== */
suite("C5", null); // Phase C · C5 — job tracker (design §5)
{
  const MAIN = "wh-main";
  const whs = seed.getSeedWarehouses();
  const dLine = (e, account, ref) =>
    e.lines.find((l) => l.account === account && l.debit > 0 && (ref === undefined || l.ref === ref));
  const cLine = (e, account, ref) =>
    e.lines.find((l) => l.account === account && l.credit > 0 && (ref === undefined || l.ref === ref));
  const mkJob = (patch = {}) => ({
    id: "job-1", number: "JB-1",
    customerId: "cu-x", customerName: "Ahmed Raza", customerPhone: "0300-111",
    title: "Wedding cards × 500", description: "",
    stage: "In Progress", status: "in_progress",
    dueDateISO: null, warehouseId: MAIN,
    materialEvents: [], labourCost: 0, note: "",
    dayOffset: 0, ts: "2026-01-01T00:00:00.000Z",
    ...patch,
  });

  /* ---- (a) stages: defaults, custom lists, the lifecycle ---- */
  check(JSON.stringify(jobs.effectiveJobStages(null)) ===
        JSON.stringify(["Received", "In Progress", "Ready", "Delivered"]),
    "stages: an absent settings list falls back to the four default stages");
  check(JSON.stringify(jobs.effectiveJobStages({ jobStages: [] })) ===
        JSON.stringify([...jobs.DEFAULT_JOB_STAGES]),
    "stages: an empty settings list also falls back to the defaults");
  check(JSON.stringify(jobs.effectiveJobStages({ jobStages: [" Intake ", "", "Intake", "Paint", " Paint "] })) ===
        JSON.stringify(["Intake", "Paint"]),
    "stages: the owner's list is trimmed, blanks dropped, duplicates collapsed (first wins)");
  const stages = jobs.effectiveJobStages(null);
  check(jobs.deriveJobStatus(mkJob({ stage: "Received", status: "open" }), stages) === "open",
    "lifecycle: the FIRST stage reads open");
  check(jobs.deriveJobStatus(mkJob({ stage: "In Progress", status: "open" }), stages) === "in_progress",
    "lifecycle: a middle stage reads in_progress");
  check(jobs.deriveJobStatus(mkJob({ stage: "Delivered", status: "in_progress" }), stages) === "ready",
    "lifecycle: the LAST stage reads ready (the delivered STATUS is set only by Deliver or a citing bill, §5.2/§5.4)");
  check(jobs.deriveJobStatus(mkJob({ stage: "Received", status: "delivered" }), stages) === "delivered" &&
        jobs.deriveJobStatus(mkJob({ stage: "In Progress", status: "cancelled" }), stages) === "cancelled",
    "lifecycle: delivered and cancelled are sticky — stage movement never resurrects them");
  check(jobs.jobStageIndex(mkJob({ stage: "Painting" }), stages) === -1 &&
        jobs.deriveJobStatus(mkJob({ stage: "Painting", status: "open" }), stages) === "open",
    "lifecycle: a renamed-away stage keeps the job open while nothing has happened on it");
  check(jobs.deriveJobStatus(
          mkJob({ stage: "Painting", status: "open",
                  materialEvents: [{ kind: "issue", productId: "p", name: "P", qty: 1, unitCost: 1, value: 1, entryId: "e", dayOffset: 0, ts: "2026-01-01T00:00:00.000Z" }] }),
          stages) === "in_progress",
    "lifecycle: a renamed-away stage WITH material events reads in_progress — the job has visibly started");

  /* ---- numbering: JB- born numbered (§5.1/§6.3) ---- */
  check(docs.SERIES_DEFAULT_PREFIX.job === "JB-",
    "numbering: the design default prefix is JB-");
  check(docs.nextDocNumber("job", [], null) === "JB-1",
    "numbering: the FIRST job mints JB-1 at creation — there is no draft state to defer it");
  check(docs.nextDocNumber("job", ["JB-1", "JB-2"], null) === "JB-3" &&
        docs.nextDocNumber("job", ["WO-4"], { docSeries: { job: "WO-" } }) === "WO-5",
    "numbering: max+1 over the collection; the owner's prefix override applies, sequence read prefix-agnostically");

  /* ---- (c) materials: issue/return through the real compositions ---- */
  const products = [
    { id: "paper", name: "Paper (ream)", stockClass: "raw", costPrice: 40, stockQty: 100 },
    { id: "ink", name: "Gold ink pot", stockClass: null, costPrice: 250, stockQty: 20 },
    { id: "sticker", name: "Seal sticker", stockClass: null, costPrice: 0, stockQty: 50 },
  ];
  let levels = stock.stockV1Rows(products, []);
  const j = [];
  const prod = (id) => products.find((p) => p.id === id);
  const driftSilent = () => stock.stockDrift(products, levels, []).length === 0;
  let job = mkJob();
  /* Land an event exactly as the store's demo path does
   * (commitJobMaterialEvent): entry appended, events appended,
   * the job warehouse's rows and the product totals moved by
   * the signed quantities. */
  const land = (jobIn, prepared, kind) => {
    j.push(prepared.entry);
    for (const l of prepared.lines) {
      const sign = kind === "issue" ? -1 : 1;
      prod(l.productId).stockQty += sign * l.qty;
      levels = stock.applyLevelDelta(levels, jobIn.warehouseId, l.productId, sign * l.qty);
    }
    return { ...jobIn, materialEvents: [...jobIn.materialEvents, ...prepared.events] };
  };

  const merged = jobs.prepareMaterialEvent(job, products, levels, whs, "issue",
    [{ productId: "paper", qty: 2 }, { productId: "paper", qty: 3 }]);
  check("prepared" in merged && merged.prepared.lines.length === 1 &&
        merged.prepared.lines[0].qty === 5 && eq(merged.prepared.value, 200),
    "materials: duplicate picks of one product merge into a single valued line (5 × 40 = 200)");

  const issue = jobs.prepareMaterialEvent(job, products, levels, whs, "issue",
    [{ productId: "paper", qty: 10 }, { productId: "ink", qty: 2 }]);
  check("prepared" in issue, "materials: the mixed-class issue prepares (raw paper + goods ink)");
  const PI = issue.prepared;
  check(eq(PI.value, 900), "materials: valued at shelf cost — paper 10 × 40 + ink 2 × 250 = 900");
  check(PI.entry.refType === "job_material" && PI.entry.refId === "job-1" && ledger.entryBalances(PI.entry),
    "materials: the issue is ONE balanced entry, refType job_material, refId the job");
  check(eq(dLine(PI.entry, "cogs", "job-1")?.debit, 900),
    "materials §5.3: Dr cogs (ref: job) carries the whole event — NO job WIP account is touched (§12.3)");
  check(eq(cLine(PI.entry, "inventory_raw", "paper")?.credit, 400) &&
        eq(cLine(PI.entry, "inventory", "ink")?.credit, 500),
    "materials §5.3: each component credits ITS class account (raw → inventory_raw, goods → inventory), ref'd to the product");
  check(PI.events.length === 2 && PI.events.every((e) => e.entryId === PI.entry.id),
    "materials: one event record per product, every one citing the ONE entry that posted it");
  job = land(job, PI, "issue");
  check(prod("paper").stockQty === 90 && stock.rowQtyOf(levels, MAIN, "paper") === 90 &&
        prod("ink").stockQty === 18 && stock.rowQtyOf(levels, MAIN, "ink") === 18 && driftSilent(),
    "materials: totals and the job warehouse's rows drop together (§1.3 identity holds)");
  check(eq(ledger.accountBalance(j, "cogs"), 900) && eq(ledger.accountBalance(j, "inventory_raw"), -400) &&
        eq(ledger.accountBalance(j, "inventory"), -500),
    "materials: GL — cogs 900, inventory_raw −400, inventory −500 after the issue");
  check(eq(jobs.jobMaterialsIssuedValue(job), 900) && jobs.jobMaterialNetQty(job, "ink") === 2,
    "materials: the selectors read the event log (issued 900; the job holds 2 ink)");

  const rIns = jobs.prepareMaterialEvent(job, products, levels, whs, "issue", [{ productId: "paper", qty: 1000 }]);
  check("problem" in rIns && rIns.problem === "insufficient" && rIns.productId === "paper",
    "refusal: an issue beyond the JOB warehouse's row refuses pre-composition (another warehouse is never reached for)");
  const rZero = jobs.prepareMaterialEvent(job, products, levels, whs, "issue", [{ productId: "sticker", qty: 5 }]);
  check("problem" in rZero && rZero.problem === "zero_value",
    "refusal: a zero-cost issue would move no value — nothing to post");
  const rEmpty = jobs.prepareMaterialEvent(job, products, levels, whs, "issue", []);
  const rUnknown = jobs.prepareMaterialEvent(job, products, levels, whs, "issue", [{ productId: "nope", qty: 1 }]);
  const rBadQty = jobs.prepareMaterialEvent(job, products, levels, whs, "issue", [{ productId: "paper", qty: 0 }]);
  check("problem" in rEmpty && rEmpty.problem === "empty_lines" &&
        "problem" in rUnknown && rUnknown.problem === "unknown_product" &&
        "problem" in rBadQty && rBadQty.problem === "bad_qty",
    "refusal: empty picks / unknown product / non-positive qty all refuse pre-composition");

  const ret = jobs.prepareMaterialEvent(job, products, levels, whs, "return", [{ productId: "ink", qty: 1 }]);
  check("prepared" in ret, "materials: the partial return prepares");
  const PR = ret.prepared;
  check(PR.entry.refType === "job_material_return" && eq(dLine(PR.entry, "inventory", "ink")?.debit, 250) &&
        eq(cLine(PR.entry, "cogs", "job-1")?.credit, 250) && ledger.entryBalances(PR.entry),
    "materials §5.3: the return is the exact mirror — Dr the class account / Cr cogs, refType job_material_return");
  job = land(job, PR, "return");
  check(eq(ledger.accountBalance(j, "cogs"), 650) && eq(jobs.jobMaterialsCost(job), 650) &&
        jobs.jobMaterialNetQty(job, "ink") === 1 && stock.rowQtyOf(levels, MAIN, "ink") === 19 && driftSilent(),
    "materials: after the return, GL cogs == the job's materials cost == 650 to the paisa; the row restores");
  const rOver = jobs.prepareMaterialEvent(job, products, levels, whs, "return", [{ productId: "ink", qty: 2 }]);
  check("problem" in rOver && rOver.problem === "over_return",
    "refusal: returning more than the job still holds refuses (it holds 1 ink)");
  const rDead = jobs.prepareMaterialEvent({ ...job, status: "delivered" }, products, levels, whs, "issue",
    [{ productId: "paper", qty: 1 }]);
  check("problem" in rDead && rDead.problem === "not_active",
    "refusal: a delivered job takes no material events");

  /* ---- (b) advances: the pooled repayment identity (§5.3, Q2) ---- */
  const till = accounts.find((a) => a.legacyFor === "cash");
  const cust = { customerId: "cu-x", customerName: "Ahmed Raza", customerPhone: "0300-111" };
  check(jobs.advanceNoteFor({ number: "JB-1" }) === "Advance — Job JB-1",
    "advance: the citation is the note on an ordinary repayment row — the ONLY job trace (no job field stores money)");
  const ADV = 2000;
  const advRow = {
    id: "cr-adv-1", ...cust, kind: "repayment", amount: ADV, method: "cash",
    accountId: till.id, note: jobs.advanceNoteFor({ number: "JB-1" }),
    billId: null, dayOffset: 0, ts: "2026-01-01T00:00:00.000Z",
  };
  // Composed EXACTLY as the store's addRepayment composes it
  // (StoreProvider): memo, refType "repayment", refId the row,
  // Dr accountForMethod ref'd to the resolved account /
  // Cr receivables ref'd to the customer.
  const advEntry = ledger.makeEntry(`Udhaar repayment — ${cust.customerName}`, "repayment", advRow.id, [
    { account: ledger.accountForMethod("cash"), debit: ADV, credit: 0, ref: advRow.accountId },
    { account: "receivables", debit: 0, credit: ADV, ref: cust.customerId },
  ]);
  const plainEntry = ledger.makeEntry(`Udhaar repayment — ${cust.customerName}`, "repayment", "cr-plain-1", [
    { account: ledger.accountForMethod("cash"), debit: ADV, credit: 0, ref: till.id },
    { account: "receivables", debit: 0, credit: ADV, ref: cust.customerId },
  ]);
  check(advEntry.memo === plainEntry.memo && advEntry.refType === plainEntry.refType &&
        JSON.stringify(advEntry.lines) === JSON.stringify(plainEntry.lines),
    "advance: the entry is a plain repayment's entry — identical memo, refType and lines (modulo the row id it cites)");
  check(!JSON.stringify(advEntry).includes("JB-1") && !JSON.stringify(advEntry).includes("job"),
    "advance: the journal entry carries NO job reference at all — the job lives only in the row's note");
  const jB = [advEntry];
  const creditsB = [advRow];
  check(jB.length === 1 && ledger.entryBalances(jB[0]),
    "advance: the journal diff of recording a job advance is EXACTLY ONE balanced repayment entry");
  check(eq(ledger.customerOutstanding(creditsB, "cu-x"), -ADV) &&
        eq(ledger.accountBalance(jB, "receivables"), -ADV),
    "advance: the customer's pool goes negative by the advance (−2,000) — subledger and GL agree");
  check(eq(jobs.jobAdvanceTotal(mkJob(), creditsB), ADV) && jobs.jobAdvanceRows(mkJob(), creditsB).length === 1,
    "advance: the job surface reads its advances back by the citing note (total 2,000)");
  // The job's bill posts on credit: the F-6 lot absorbs the pool.
  const jobBill = {
    id: "bill-job-1", billNo: 101, ...cust,
    sourceType: "job", sourceId: "job-1", status: "paid", total: 5000,
    items: [{ productId: "card", name: "Wedding cards", qty: 1, unitPrice: 5000, unitCost: 0, total: 5000 }],
    ts: "2026-01-03T00:00:00.000Z",
  };
  creditsB.push({
    id: "cr-bill-1", ...cust, kind: "credit", amount: 5000,
    note: "", billId: "bill-job-1", dayOffset: 0, ts: "2026-01-03T00:00:00.000Z",
  });
  const pos = ledger.billCreditOutstanding(creditsB, jobBill);
  check(eq(pos.repaidAllocated, ADV) && eq(pos.outstanding, 3000),
    "advance §5.3: the citing bill's F-6 lot absorbs the pooled advance (allocated 2,000 of 5,000; 3,000 genuinely owed)");
  check(eq(ledger.customerOutstanding(creditsB, "cu-x"), 3000),
    "advance: after the bill, the customer owes total − advance (5,000 − 2,000 = 3,000) — the pool did the settling");

  /* ---- (d)+(e) revenue citation discipline + the §5.5 profit ---- */
  const evP = (kind, qty, value) => ({
    kind, productId: "paper", name: "Paper (ream)", qty, unitCost: 40, value,
    entryId: "e-p", dayOffset: 0, ts: "2026-01-01T00:00:00.000Z",
  });
  const jobP = mkJob({
    id: "job-p", number: "JB-7", labourCost: 500,
    materialEvents: [evP("issue", 10, 400), evP("return", 2, 80)],
  });
  const billP = (patch) => ({
    id: "b-p1", billNo: 201, customerId: "cu-x", customerName: "Ahmed Raza", customerPhone: "0300-111",
    sourceType: "job", sourceId: "job-p", status: "paid", total: 3000,
    items: [{ productId: "card", name: "Wedding cards", qty: 1, unitPrice: 3000, unitCost: 700, total: 3000 }],
    ts: "2026-01-04T00:00:00.000Z", ...patch,
  });
  const billsP = [
    billP({}),
    billP({ id: "b-p2", billNo: 202, status: "held", total: 9999 }),
    billP({ id: "b-p3", billNo: 203, status: "voided", total: 7777 }),
    billP({ id: "b-p4", billNo: 204, sourceType: null, sourceId: null, total: 8888 }),
    billP({ id: "b-p5", billNo: 205, sourceId: "job-other", total: 6666 }),
  ];
  check(jobs.jobBills(jobP, billsP).length === 1 && jobs.jobBills(jobP, billsP)[0].id === "b-p1",
    "revenue: only the POSTED bill CITING this job counts — held and voided citing bills, a direct bill and another job's bill all contribute nothing");
  check(eq(jobs.jobRevenue(jobP, billsP), 3000) && eq(jobs.jobBillCogs(jobP, billsP), 700),
    "profit §5.5: revenue 3,000 from the citing bill; its OWN lines' COGS 700 from their unitCost snapshots");
  const figsP = jobs.jobProfitFigures(jobP, billsP);
  check(eq(figsP.materials, 320) && eq(figsP.labour, 500) &&
        eq(figsP.profit, 1480),
    "profit §5.5 hand-computed: 3,000 revenue − 320 materials (400 issued − 80 returned) − 700 bill COGS − 500 labour = 1,480");
  const jobNB = mkJob({ id: "job-nb", number: "JB-8", labourCost: 500,
                        materialEvents: [evP("issue", 10, 400), evP("return", 2, 80)] });
  const figsNB = jobs.jobProfitFigures(jobNB, billsP);
  check(eq(figsNB.revenue, 0) && eq(figsNB.profit, -820),
    "profit §5.5: an unbilled job reports revenue 0 and profit == −(materials + labour) = −820 — costs are real before any bill exists");

  /* ---- (f) the demo seed job (§10.3) + the frozen ground ---- */
  const seedJobs = seed.getSeedJobs(customers);
  check(seedJobs.length === 1 && seedJobs[0].number === "JB-1" && seedJobs[0].status === "open" &&
        seedJobs[0].stage === "Received" && seedJobs[0].materialEvents.length === 0 &&
        seedJobs[0].labourCost === 0 && seedJobs[0].warehouseId === MAIN &&
        seedJobs[0].customerId === customers[0].id,
    "seed: exactly ONE open job at the first stage (JB-1, the seed's first customer, no events, no labour)");
  check(eq(jobs.jobAdvanceTotal(seedJobs[0], credits), 0) &&
        eq(jobs.jobProfitFigures(seedJobs[0], []).profit, 0),
    "seed: the demo job has no advance and no figures — zero journal footprint");
  check(journal.length === 21, "frozen: the seed journal still has its 21 entries");
  const normalizedC5 = journal.map((e) => { const { ts, ...rest } = e; return rest; });
  const shaC5 = crypto.createHash("sha256").update(JSON.stringify(normalizedC5), "utf8").digest("hex");
  check(shaC5 === "e17e5bda19e87de698b0c0a37e923f9b396bc387e2092b2ffbbd7d60d4971168",
    "frozen: seed journal SHA unchanged (e17e5bda…1168)");
  check(eq(ledger.accountBalance(journal, "inventory"), 272805) &&
        eq(ledger.accountBalance(journal, "cash"), 50000) &&
        eq(sum(coa.ACCOUNT_CODES.map((c) => ledger.accountBalance(journal, c))), 0),
    "frozen: seed identities hold — Inventory 272,805 · Cash 50,000 · trial balance 0");

  /* ---- (g) RBAC: the jobTracker row AS DECLARED (§5.6/G-C4) ---- */
  check(perm.can("owner", "jobTracker", "write") && perm.can("manager", "jobTracker", "write"),
    "RBAC: owner/manager run the job tracker (the row as pre-declared, unchanged)");
  check(perm.can("cashier", "jobTracker", "view") && !perm.can("cashier", "jobTracker", "write"),
    "RBAC: the cashier READS jobs but never writes — the matrix row stands exactly as declared (G-C4)");
  check(perm.can("accountant", "jobTracker", "view") && !perm.can("accountant", "jobTracker", "write"),
    "RBAC: the accountant reads jobs, writes nothing (F/F/R/R)");

  /* ---- (h) i18n parity for the C5 strings ---- */
  const jobKeys = Object.keys(i18n.en).filter((k) => k.startsWith("job.") || k === "nav.jobs");
  check(jobKeys.length === 118, `i18n: the C5 job keys number ${jobKeys.length} (118 expected, incl. nav.jobs)`);
  check(jobKeys.every((k) => typeof i18n.ur[k] === "string" && i18n.ur[k].length > 0) &&
        typeof i18n.en["settings.series.job"] === "string" &&
        typeof i18n.ur["settings.series.job"] === "string" &&
        i18n.ur["settings.series.job"].length > 0,
    "i18n: every C5 key present and non-empty in Urdu (parity), incl. the numbering-settings label");

  /* ---- (i) source invariants: the store + surface wiring ---- */
  const storeSrcC5 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx", "utf8");
  check(storeSrcC5.includes('"jobs"') && storeSrcC5.includes('"dukaan-ai-store-v15"') &&
        storeSrcC5.includes("prepareMaterialEvent") && storeSrcC5.includes("commitJobMaterialEvent") &&
        storeSrcC5.includes("sub<Job>"),
    "source: the jobs collection, the v15 demo bump, the pre-composition + event writer and the live subscription are wired into the store");
  check(storeSrcC5.includes("convertJobToBill") && storeSrcC5.includes('sourceType: "job"') &&
        storeSrcC5.includes("statusUpdates.job"),
    "source: the job→bill conversion prefills the desk citing the job, and postBill flips a citing job to delivered in its own batch (§5.4)");
  check((storeSrcC5.match(/makeEntry\(/g) || []).length === 24,
    "source: still 24 makeEntry calls in the store — job entries compose in lib/jobs, no new inline posting path");
  check(!storeSrcC5.includes('"job_material"'),
    "source: the store never names the job refTypes — job entries compose only in lib/jobs (the store's own inline cogs lines belong to postBill's sale template, untouched)");
  const jobsViewSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/JobsView.tsx", "utf8");
  const sheetSrcC5 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/DocPrintSheet.tsx", "utf8");
  const navSrcC5 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/lib/nav.ts", "utf8");
  check(jobsViewSrc.includes("addRepayment") && jobsViewSrc.includes("advanceNoteFor") &&
        jobsViewSrc.includes("prepareMaterialEvent"),
    "source: the job surface records advances through the EXISTING addRepayment machinery with the citing note, and previews materials through lib/jobs");
  check(sheetSrcC5.includes("export function JobPrintSheet") &&
        navSrcC5.includes('href: "/jobs"') &&
        fs.existsSync("/home/hatch/workspace/ai-dukaan-ai/web/app/jobs/page.tsx"),
    "source: the work slip ships on the shared print sheet, the nav carries /jobs, and the route exists");

  /* ---- (j) rules: additive jobs block only ---- */
  const rulesC5 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8");
  const c5Seg = rulesC5.slice(
    rulesC5.indexOf("      // Phase C · C5"),
    rulesC5.indexOf("      // Phase D · D1"));
  check(c5Seg.includes("match /jobs/{jobId}") &&
        c5Seg.includes("allow read: if canAccess(uid);") &&
        c5Seg.includes("hasRole(uid, ['owner', 'manager'])"),
    "rules: jobs block — read canAccess, write owner/manager (design §6.2)");
  check(!c5Seg.includes("createInOpenPeriod"),
    "rules: NO period backstop on the job doc — its material entries are guarded creates at the journal (§6.2)");
  const strippedC5 = stripG1Blocks(stripG2Blocks(rulesC5.slice(0, rulesC5.indexOf("      // Phase C · C5")) +
    rulesC5.slice(rulesC5.indexOf("      // Expenses:"))));
  check(crypto.createHash("sha256").update(strippedC5, "utf8").digest("hex") ===
        "94077e04a2479bca232a1d7529454a724abff2024044c69c60982a8c9f81b404",
    "rules: stripping the C5 block reproduces the pre-C5 file byte-for-byte (additive only; G1 same-check amendment: the four G1 spans are stripped first — v9's only other deltas, strip-proven in the G1 suite)");
}

/* ============================ FIX (live-audit) ============================ */
suite("FIX", null); // Live-audit fixes — P&L≡sales reconciliation, negative-balance
// warnings, expense-date single-sourcing, journal viewer + trial
// balance, walk-in bill search (owner's live account audit, 2026-10-22)
{
  const FIXFULL = {
    fromDate: "2000-01-01", toDate: "2999-12-31",
    fromTs: "2000-01-01T00:00:00.000Z", toTs: "2999-01-01T00:00:00.000Z",
  };
  const seedSlabs = seed.getSeedTaxSlabs();
  const seedSettings = seed.getSeedSettings();
  const seedCtx = { returns: [], journal, taxSlabs: seedSlabs, settings: seedSettings };

  /* ---- Fix 1a: the seed identity — P&L == sales report ---- */
  const plFull = ledger.profitAndLossInRange(journal, FIXFULL.fromTs, FIXFULL.toTs);
  const seedRep = reports.salesReport(sales, products, [], FIXFULL, seedCtx);
  check(eq(seedRep.netSales, plFull.netRevenue),
    "FIX1 seed: sales-report net == P&L net revenue over the whole seed (the audit's 8,500 gap is 0 on the current construction)");
  check(eq(seedRep.otherRevenue, 0) && eq(seedRep.plNetRevenue, seedRep.netSales),
    "FIX1 seed: reconciling line is 0 — no journal-only revenue in the seed (the F-7 shape is gone from the template)");
  check(eq(seedRep.grossSales, sum(sales.map((s) => s.total))) && eq(seedRep.discounts, 0),
    "FIX1 seed: gross == Σ row totals and discounts 0 (seed bills carry neither discounts nor tax)");

  /* ---- Fix 1b: the Rs 375 counter-sale bucketing case ---- */
  const todayRange = reports.resolveReportRange("today", seedSettings);
  const todayRep = reports.salesReport(sales, products, [], todayRange, seedCtx);
  check(eq(todayRep.netSales, selectors.revenueOnDay(sales, 0)),
    "FIX1 seed: the report's 'today' net == the counter page's today total (revenueOnDay) — one bucketing, by ts, after the re-base");
  check(eq(todayRep.otherRevenue, 0),
    "FIX1 seed: 'today' also reconciles exactly (the day's journal summary is built from the same rows)");
  const row375 = sales.find((s) => s.productId === "p05" && s.total === 375 && s.dayOffset === 9);
  check(!!row375, "FIX1 seed: the audit's Rs 375 counter sale exists (Shan Biryani 3 × 125, dayOffset 9)");
  if (row375) {
    const dayISO = periods.businessDateISO(row375.ts);
    check(dayISO === periods.addDaysISO(periods.todayPktISO(), -9),
      "FIX1 seed construction: the 375 row's ts now falls on its dayOffset day (re-based)");
    const dayRange = reports.resolveReportRange("custom", seedSettings, { from: dayISO, to: dayISO });
    const dayRep = reports.salesReport(sales, products, [], dayRange, seedCtx);
    check(eq(dayRep.netSales, selectors.revenueOnDay(sales, 9)) && eq(dayRep.otherRevenue, 0),
      "FIX1 seed: on the 375 row's own day, report == counter total == journal — all three derivations agree");
  }

  /* ---- Fix 1c: synthetic mixed workload (the posting templates
   * composed verbatim through the REAL makeEntry guard) ---- */
  const inclSlab = { id: "fx-incl", name: "GST Incl", kind: "percent", rate: 25,
    appliesTo: "sales", inclusive: true, isDefault: false, active: true, ts: "2026-10-01T00:00:00.000Z" };
  const fxSlabs = [inclSlab];
  const fxSettings = { defaultSalesTaxSlabId: null, defaultPurchaseTaxSlabId: null };
  const fxProducts = [
    { id: "fx-a", name: "Taxed Tea", urduName: "", sku: "FXA", category: "grocery", unit: "packet", costPrice: 60, salePrice: 125, stockQty: 50, reorderLevel: 5, taxSlabId: "fx-incl" },
    { id: "fx-b", name: "Plain Rice", urduName: "", sku: "FXB", category: "grocery", unit: "kg", costPrice: 40, salePrice: 100, stockQty: 50, reorderLevel: 5 },
  ];
  // Bill 1: discounted, inclusive-taxed, paid Rs 1 short (F-2 rounding).
  const fxTax1 = tax.computeBillTaxes(
    [{ total: 250, qty: 2, slab: inclSlab }, { total: 200, qty: 2, slab: null }], 50);
  const fxBill1 = { id: "fx-b1", billNo: 1, customerId: "fx-c1", customerName: "Ahmed",
    customerPhone: "0300", items: [
      { productId: "fx-a", name: "Taxed Tea", qty: 2, unitPrice: 125, unitCost: 60, total: 250, taxAmount: fxTax1.lines[0].taxAmount, taxInclusive: true },
      { productId: "fx-b", name: "Plain Rice", qty: 2, unitPrice: 100, unitCost: 40, total: 200, taxAmount: 0 },
    ], subtotal: 450, discountType: "flat", discountValue: 50, discountAmount: 50,
    taxAmount: fxTax1.taxAmount, total: fxTax1.total,
    payments: [{ method: "cash", amount: 399, accountId: "acc-till" }],
    status: "paid", dayOffset: 0, ts: "2026-10-10T10:00:00.000Z" };
  const fxE1 = ledger.makeEntry("Bill #1 — Ahmed", "bill", "fx-b1", [
    { account: "cash", debit: 399, credit: 0, ref: "acc-till" },
    { account: "sales_discount", debit: 50 + (fxBill1.total - 399), credit: 0 },
    { account: "cogs", debit: 200, credit: 0 },
    { account: "sales_revenue", debit: 0, credit: tax.round2(450 - fxTax1.inclusiveTax) },
    { account: "tax_payable", debit: 0, credit: fxTax1.taxAmount },
    { account: "inventory", debit: 0, credit: 200 },
  ], { ts: fxBill1.ts });
  // Counter sale of the taxed product (recordSale template).
  const fxCounterTax = tax.computeBillTaxes([{ total: 125, qty: 1, slab: inclSlab }], 0);
  const fxE2 = ledger.makeEntry("Counter sale — Taxed Tea × 1", "sale", "fx-sc", [
    { account: "cash", debit: 125, credit: 0, ref: "acc-till" },
    { account: "cogs", debit: 60, credit: 0 },
    { account: "sales_revenue", debit: 0, credit: tax.round2(125 - fxCounterTax.inclusiveTax) },
    { account: "tax_payable", debit: 0, credit: fxCounterTax.taxAmount },
    { account: "inventory", debit: 0, credit: 60 },
  ], { ts: "2026-10-11T09:00:00.000Z" });
  // Partial return of bill 1 (reverseBillItems template; the tax
  // shares come from the REAL returnTaxShares, the discount share
  // from the store's F-3 cumulative formula).
  const fxRetItems = [{ productId: "fx-a", name: "Taxed Tea", qty: 1, unitPrice: 125,
    unitCost: 60, total: 125, taxAmount: 0, taxInclusive: true }];
  const fxShares = tax.returnTaxShares(fxBill1, [], fxRetItems);
  fxRetItems[0].taxAmount = fxShares.perLine.get("fx-a") ?? 0;
  const fxDiscShare = Math.round((fxBill1.discountAmount * 125) / fxBill1.subtotal);
  const fxRefund = 125 - fxDiscShare + fxShares.exclusiveTaxShare;
  const fxReturn = { id: "fx-r1", billId: "fx-b1", billNo: 1, items: fxRetItems,
    refundAmount: fxRefund, creditReduction: 0, method: "cash", accountId: "acc-till",
    dayOffset: 0, ts: "2026-10-12T09:00:00.000Z" };
  const fxE3 = ledger.makeEntry("Return against Bill #1", "return", "fx-b1", [
    { account: "sales_revenue", debit: tax.round2(125 - fxShares.inclusiveTaxShare), credit: 0 },
    { account: "tax_payable", debit: fxShares.taxShare, credit: 0 },
    { account: "inventory", debit: 60, credit: 0 },
    { account: "sales_discount", debit: 0, credit: fxDiscShare },
    { account: "cash", debit: 0, credit: fxRefund, ref: "acc-till" },
    { account: "cogs", debit: 0, credit: 60 },
  ], { ts: fxReturn.ts });
  // Bill 2 posted, then VOIDED in full (a SaleReturn doc covers it).
  const fxBill2 = { id: "fx-b2", billNo: 2, customerId: null, customerName: "",
    customerPhone: "", items: [
      { productId: "fx-b", name: "Plain Rice", qty: 1, unitPrice: 100, unitCost: 40, total: 100, taxAmount: 0 },
    ], subtotal: 100, discountType: "flat", discountValue: 0, discountAmount: 0,
    taxAmount: 0, total: 100,
    payments: [{ method: "cash", amount: 100, accountId: "acc-till" }],
    status: "voided", dayOffset: 0, ts: "2026-10-13T09:00:00.000Z" };
  const fxE4 = ledger.makeEntry("Bill #2 — Walk-in customer", "bill", "fx-b2", [
    { account: "cash", debit: 100, credit: 0, ref: "acc-till" },
    { account: "cogs", debit: 40, credit: 0 },
    { account: "sales_revenue", debit: 0, credit: 100 },
    { account: "inventory", debit: 0, credit: 40 },
  ], { ts: fxBill2.ts });
  const fxVoid = { id: "fx-r2", billId: "fx-b2", billNo: 2,
    items: [{ productId: "fx-b", name: "Plain Rice", qty: 1, unitPrice: 100, unitCost: 40, total: 100, taxAmount: 0 }],
    refundAmount: 100, creditReduction: 0, method: "cash", accountId: null,
    dayOffset: 0, ts: "2026-10-13T10:00:00.000Z" };
  const fxE5 = ledger.makeEntry("Bill #2 voided", "bill_void", "fx-b2", [
    { account: "sales_revenue", debit: 100, credit: 0 },
    { account: "inventory", debit: 40, credit: 0 },
    { account: "cash", debit: 0, credit: 100, ref: "acc-till" },
    { account: "cogs", debit: 0, credit: 40 },
  ], { ts: fxVoid.ts });
  // A HELD bill: documents only — no rows, no entry, no effect.
  const fxBill3 = { ...fxBill2, id: "fx-b3", billNo: 3, status: "held", ts: "2026-10-13T11:00:00.000Z" };
  const fxBills = [fxBill1, fxBill2, fxBill3];
  const fxReturns = [fxReturn, fxVoid];
  const fxSales = [
    { id: "fx-b1-s0", productId: "fx-a", qty: 2, unitPrice: 125, unitCost: 60, total: 250, billId: "fx-b1", kind: "sale", dayOffset: 0, ts: fxBill1.ts },
    { id: "fx-b1-s1", productId: "fx-b", qty: 2, unitPrice: 100, unitCost: 40, total: 200, billId: "fx-b1", kind: "sale", dayOffset: 0, ts: fxBill1.ts },
    { id: "fx-sc-row", productId: "fx-a", qty: 1, unitPrice: 125, unitCost: 60, total: 125, billId: null, kind: "sale", dayOffset: 0, ts: "2026-10-11T09:00:00.000Z" },
    { id: "fx-b1-r0", productId: "fx-a", qty: -1, unitPrice: 125, unitCost: 60, total: -125, billId: "fx-b1", kind: "return", dayOffset: 0, ts: fxReturn.ts },
    { id: "fx-b2-s0", productId: "fx-b", qty: 1, unitPrice: 100, unitCost: 40, total: 100, billId: "fx-b2", kind: "sale", dayOffset: 0, ts: fxBill2.ts },
    { id: "fx-b2-r0", productId: "fx-b", qty: -1, unitPrice: 100, unitCost: 40, total: -100, billId: "fx-b2", kind: "return", dayOffset: 0, ts: fxVoid.ts },
  ];
  const fxJournal = [fxE1, fxE2, fxE3, fxE4, fxE5];
  const FXOCT = reports.resolveReportRange("custom", null, { from: "2026-10-01", to: "2026-10-31" });
  const fxCtx = { returns: fxReturns, journal: fxJournal, taxSlabs: fxSlabs, settings: fxSettings };
  const fxPl = ledger.profitAndLossInRange(fxJournal, FXOCT.fromTs, FXOCT.toTs);
  const fxRep = reports.salesReport(fxSales, fxProducts, fxBills, FXOCT, fxCtx);
  check(eq(fxRep.netSales, fxPl.netRevenue) && eq(fxRep.otherRevenue, 0),
    "FIX1 synthetic: discounted+taxed bill, taxed counter sale, partial return, voided bill, held bill — report net == P&L net EXACTLY, reconciling line 0");
  check(eq(fxRep.revenue, fxPl.revenue) && eq(fxRep.discounts, fxPl.discounts),
    "FIX1 synthetic: the report's revenue and discounts lines equal the P&L's own two lines (not just their difference)");
  check(eq(sum(fxRep.byProduct.map((r) => r.amount)), fxRep.netSales) &&
        eq(sum(fxRep.byCustomer.map((r) => r.amount)), fxRep.netSales),
    "FIX1 synthetic: by-product and by-customer breakdowns sum back to net sales (breakdowns carry the same netting)");
  // The legacy shape: one journal-only revenue entry (pre-F-7
  // standalone udhaar posted to sales_revenue, Rs 8,500).
  const fxLegacy = ledger.makeEntry("Udhaar given — Haji Muhammad Saleem (legacy)", "credit", "fx-cr-legacy", [
    { account: "receivables", debit: 8500, credit: 0, ref: "fx-c9" },
    { account: "sales_revenue", debit: 0, credit: 8500 },
  ], { ts: "2026-10-14T09:00:00.000Z" });
  const fxJournalL = [...fxJournal, fxLegacy];
  const fxRepL = reports.salesReport(fxSales, fxProducts, fxBills, FXOCT,
    { ...fxCtx, journal: fxJournalL });
  const fxPlL = ledger.profitAndLossInRange(fxJournalL, FXOCT.fromTs, FXOCT.toTs);
  check(eq(fxRepL.otherRevenue, 8500) && eq(fxRepL.plNetRevenue, fxPlL.netRevenue) &&
        eq(fxRepL.netSales, fxRep.netSales),
    "FIX1 legacy: the 8,500 journal-only revenue surfaces as the labelled reconciling line; the document figures do not move");

  /* ---- Fix 2: negative money-account warning ---- */
  const walletLegacy = accounts.find((a) => a.id === "acc-wallet-legacy");
  check(!!walletLegacy && eq(ledger.moneyAccountBalance(journal, walletLegacy), -45000),
    "FIX2 seed: Wallet & Bank sits at −45,000 (the audit's silent overdraft, reproduced)");
  const prev1 = ledger.outflowPreview(journal, accounts,
    { method: "bank", accountId: "acc-wallet-legacy", amount: 1000 });
  check(!!prev1 && eq(prev1.balance, -45000) && eq(prev1.balanceAfter, -46000),
    "FIX2: previewing a further outflow from the overdrawn account reports the deeper negative (the warning's figures)");
  const prev2 = ledger.outflowPreview(journal, accounts,
    { method: "cash", accountId: null, amount: 60000 });
  check(!!prev2 && prev2.account.id === "acc-till" && eq(prev2.balanceAfter, -10000),
    "FIX2: a 60,000 cash outflow resolves to the till (50,000) and previews −10,000 — the warn case");
  const prev3 = ledger.outflowPreview(journal, accounts,
    { method: "cash", accountId: null, amount: 40000 });
  check(!!prev3 && eq(prev3.balanceAfter, 10000),
    "FIX2: an in-balance outflow previews positive — no warning fires");
  check(ledger.outflowPreview(journal, [], { method: "cash", accountId: null, amount: 1 }) === null,
    "FIX2: no accounts at all → null (the legacy GL-only path has no per-account figure to warn about)");

  /* ---- Fix 3: expense dates single-sourced ---- */
  const bookRows = ledger.cashBook(journal);
  let datesAgree = true;
  for (const e of expenses) {
    const entry = journal.find((j) => j.id === `j-seed-exp-${e.id}`);
    const row = entry ? bookRows.find((r) => r.entryId === entry.id) : undefined;
    if (!entry || !row ||
        periods.businessDateISO(e.ts) !== periods.businessDateISO(entry.ts) ||
        periods.businessDateISO(row.ts) !== periods.businessDateISO(e.ts)) {
      datesAgree = false;
      break;
    }
  }
  check(datesAgree,
    "FIX3 seed: every expense's register date == its journal entry's date == its cash-book row's date");
  const rebaseOk = [...sales, ...expenses, ...purchases, ...payments, ...credits]
    .every((r) => periods.businessDateISO(r.ts) === periods.addDaysISO(periods.todayPktISO(), -r.dayOffset));
  check(rebaseOk,
    "FIX3 seed construction: every day-bucketed seed row's ts falls on the calendar day its dayOffset denotes");
  const expSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/ExpensesRegister.tsx", "utf8");
  check(expSrc.includes("businessDateISO(e.ts)") && !expSrc.includes("e.dayOffset === 0"),
    "FIX3 source: the register groups AND labels by the expense's own business date — dayOffset grouping is gone");

  /* ---- Fix 4: journal viewer data + trial balance ---- */
  check(journal.every((e) => ledger.entryBalances(e)),
    "FIX4: every seed journal entry passes its ΣDr == ΣCr balance check (the journal viewer's badge)");
  const tb = reports.trialBalance(journal, FIXFULL);
  check(tb.balanced && eq(tb.difference, 0) && eq(tb.closingDifference, 0),
    "FIX4: seed trial balance renders the balanced state — period and closing differences are 0");
  check(eq(tb.totalDebits, tb.totalCredits) && eq(tb.closingDebits, tb.closingCredits),
    "FIX4: seed trial balance — Σ period debits == Σ period credits, Σ closing Dr == Σ closing Cr");
  const tbCash = tb.rows.find((r) => r.account === "cash");
  const tbInv = tb.rows.find((r) => r.account === "inventory");
  check(!!tbCash && eq(tbCash.closing, 50000) && !!tbInv && eq(tbInv.closing, 272805),
    "FIX4: trial-balance closings carry the frozen identities (cash 50,000 · inventory 272,805)");
  const tbToday = reports.trialBalance(journal, todayRange);
  check(tbToday.balanced && eq(tbToday.difference, 0),
    "FIX4: the trial balance balances on a single-day range too");
  const finSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/FinanceView.tsx", "utf8");
  check(finSrc.includes("fin.journal.title") && finSrc.includes("entryBalances") &&
        finSrc.includes("fin.acct.negative"),
    "FIX4/FIX2 source: FinanceView ships the journal viewer (with per-entry balance checks) and the account-card negative warning");
  const repViewSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/ReportsView.tsx", "utf8");
  check(repViewSrc.includes('"trialbalance"') && repViewSrc.includes("trialBalance(journal, range)"),
    "FIX4 source: the trial balance is the 14th report in the catalogue, built from the journal");

  /* ---- Fix 5: walk-in bill search ---- */
  const walkInBill = { id: "fx-w", billNo: 42, customerId: null, customerName: "",
    customerPhone: "", items: [], subtotal: 0, discountType: "flat", discountValue: 0,
    discountAmount: 0, total: 0, payments: [], status: "paid", dayOffset: 0,
    ts: "2026-10-10T10:00:00.000Z" };
  check(search.billMatches(walkInBill, "walk-in", "Walk-in customer") === true &&
        search.billMatches(walkInBill, "Walk-in Customer", "Walk-in customer") === true,
    "FIX5: a walk-in bill matches its displayed label, in part and in full");
  check(search.billMatches(walkInBill, "عام", "عام گاہک") === true,
    "FIX5: a walk-in bill matches its Urdu label (عام گاہک)");
  check(search.billMatches({ ...walkInBill, customerName: "Ahmed" }, "walk-in", "Walk-in customer") === false,
    "FIX5: a NAMED bill never matches the walk-in label");
  check(search.billMatches(walkInBill, "walk-in") === false &&
        search.billMatches(walkInBill, "42", "Walk-in customer") === true,
    "FIX5: without a label the legacy behaviour is unchanged; the bill number still matches");
  const deskSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/BillingDesk.tsx", "utf8");
  check(deskSrc.includes('billMatches(b, histSearch, t("billing.walkInCustomer"))'),
    "FIX5 source: the desk's bill-history search passes the localized walk-in label");

  /* ---- Fix 2 source: the warning is wired at every money-out desk ---- */
  const maSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/MoneyAccounts.tsx", "utf8");
  const supSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/SuppliersManager.tsx", "utf8");
  const dashSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/Dashboard.tsx", "utf8");
  check(maSrc.includes("export function NegativeBalanceWarning") && maSrc.includes("fin.acct.negative"),
    "FIX2 source: the shared warning modal ships in MoneyAccounts and the Settings account list warns inline");
  check(expSrc.includes("outflowPreview") && expSrc.includes("NegativeBalanceWarning") &&
        supSrc.includes("outflowPreview") && supSrc.includes("NegativeBalanceWarning") &&
        maSrc.includes("outflowPreview"),
    "FIX2 source: expenses, supplier payments and transfers all preview the outflow and raise the warning before posting");
  check(dashSrc.includes("negativeAccounts") && dashSrc.includes("fin.acct.negativeShort"),
    "FIX2 source: the dashboard money snapshot names its negative accounts");

  /* ---- i18n: the live-audit keys, both languages ---- */
  const fixKeys = ["fin.acct.negative", "fin.acct.negativeShort", "fin.neg.title",
    "fin.neg.body", "fin.neg.confirm", "fin.journal.title", "fin.journal.caption",
    "fin.journal.balanced", "fin.journal.unbalanced", "fin.journal.count",
    "fin.journal.showingLatest", "fin.journal.empty", "rep.tb.title", "rep.tb.desc",
    "rep.tb.debit", "rep.tb.credit", "rep.tb.dr", "rep.tb.cr", "rep.tb.difference",
    "rep.tb.balanced", "rep.tb.unbalanced", "rep.tot.otherRevenue", "rep.tot.plNetRevenue"];
  check(fixKeys.every((k) => typeof i18n.en[k] === "string" && i18n.en[k].length > 0 &&
        typeof i18n.ur[k] === "string" && i18n.ur[k].length > 0),
    "FIX i18n: all 23 live-audit keys present and non-empty in EN and UR");
  check(Object.keys(i18n.en).length === Object.keys(i18n.ur).length &&
        Object.keys(i18n.en).every((k) => k in i18n.ur),
    "FIX i18n: full dictionary parity EN ≡ UR after the additions");
}

/* ============================ D1 (Phase D · declarations, employees & attendance) ============================ */
suite("D1", null); // Phase D · D1 — declarations, employees & attendance (design §1/§2.2/§6/§9 D1; NO postings)
{
  /* ---- declarations: the ONE additive COA code (§3.1) ---- */
  check(coa.ACCOUNT_CODES.length === 30 && coa.ACCOUNT_CODES[27] === "loans_receivable",
    "D1 COA: loans_receivable is code #28 — every prior code keeps its place (H1 pin amendment: count 28→30, two additive H codes appended after it)");
  const lrMeta = coa.accountMeta("loans_receivable");
  check(lrMeta.type === "asset" && lrMeta.normalBalance === "debit" && lrMeta.since === "D" &&
        coa.normalBalanceSign("loans_receivable") === 1 && coa.isAccountCode("loans_receivable"),
    "D1 COA: loans_receivable is a debit-normal asset declared since \"D\"");
  check(Object.entries(coa.CHART_OF_ACCOUNTS).filter(([, m]) => m.since === "D").length === 1 &&
        Object.entries(coa.CHART_OF_ACCOUNTS).filter(([, m]) => m.since === "v1").length === 17 &&
        Object.entries(coa.CHART_OF_ACCOUNTS).filter(([, m]) => m.since === "A").length === 10,
    "D1 COA: exactly ONE Phase D code — the 17 v1 and 10 Phase A codes are untouched");

  /* ---- declarations: types + series (source-level, A1 pattern) ---- */
  const typesSrcD1 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/lib/types.ts", "utf8");
  check(["payroll_accrual", "payroll_payment", "salary_advance", "loan_drawdown",
         "loan_charge", "loan_repayment", "fy_close"]
        .every((r) => typesSrcD1.includes(`"${r}"`)),
    "D1 types: all seven Phase D journal refTypes are declared (type-only, unposted)");
  check(typesSrcD1.includes("interface Employee") && typesSrcD1.includes("interface AttendanceMonth") &&
        typesSrcD1.includes("interface PayrollRun") && typesSrcD1.includes("interface PayrollRunLine") &&
        typesSrcD1.includes("interface Loan") && typesSrcD1.includes("interface LoanEvent") &&
        typesSrcD1.includes('"payrollRun"') && typesSrcD1.includes('"loan"'),
    "D1 types: Employee / AttendanceMonth / PayrollRun(+Line) / Loan(+Event) and the payrollRun + loan series are declared");
  check(docs.seriesPrefix("payrollRun", null) === "PAY-" && docs.seriesPrefix("loan", null) === "LN-" &&
        docs.seriesPrefix("payrollRun", { docSeries: { payrollRun: "PR-" } }) === "PR-",
    "D1 series: PAY- (minted at finalise) and LN- (born numbered) defaults resolve, owner override honoured");

  /* ---- attendance summaries + the mark cycle (§1.3) ---- */
  const mkAtt = (days) => ({ id: "e1__2026-10", employeeId: "e1", month: "2026-10", days, ts: "" });
  const mixed = payroll.attendanceSummary(mkAtt(
    { "1": "present", "2": "present", "3": "absent", "4": "half", "5": "leave", "6": "off" }));
  check(mixed.present === 2 && mixed.absent === 1 && mixed.half === 1 && mixed.leave === 1 &&
        mixed.off === 1 && mixed.markedDays === 6,
    "D1 attendance: the summary counts each mark once (P2 A1 H1 L1 O1, 6 marked)");
  check(eq(mixed.workedUnits, 4.5),
    "D1 attendance: workedUnits = present + 0.5×half + leave + off = 4.5 (paid units, §1.4)");
  const emptySum = payroll.attendanceSummary(null);
  check(emptySum.markedDays === 0 && emptySum.workedUnits === 0,
    "D1 attendance: no doc reads as a blank register — never silently present");
  check(payroll.nextAttendanceMark(null) === "present" &&
        payroll.nextAttendanceMark("present") === "absent" &&
        payroll.nextAttendanceMark("absent") === "half" &&
        payroll.nextAttendanceMark("half") === "leave" &&
        payroll.nextAttendanceMark("leave") === "off" &&
        payroll.nextAttendanceMark("off") === null,
    "D1 attendance: one tap cycles present → absent → half → leave → off → cleared");
  check(payroll.attendanceDocId("emp-9", "2026-10") === "emp-9__2026-10" &&
        payroll.daysInMonthOf("2026-10") === 31 && payroll.daysInMonthOf("2026-02") === 28 &&
        payroll.daysInMonthOf("2024-02") === 29 && payroll.daysInMonthOf("bogus") === 0 &&
        payroll.shiftMonth("2026-12", 1) === "2027-01" && payroll.shiftMonth("2026-01", -1) === "2025-12",
    "D1 attendance: deterministic doc id, month lengths and month shifting are exact");

  /* ---- proration (§1.4) — hand-computed fixtures ---- */
  const monthly = { payBasis: "monthly", baseAmount: 31000, paidLeaveDays: 2 };
  const sumA = { present: 26, absent: 3, half: 0, leave: 1, off: 1, markedDays: 31, workedUnits: 28 };
  const earnedA = payroll.earnedBaseFor(monthly, sumA, 31);
  check(earnedA.unpaidAbsent === 1 && eq(earnedA.earnedBase, 30000),
    "D1 proration monthly: 3 absences − 2 paid leave = 1 unpaid → 31,000 × 30/31 = 30,000 exactly");
  const earnedB = payroll.earnedBaseFor(monthly, { ...sumA, absent: 2 }, 31);
  check(earnedB.unpaidAbsent === 0 && eq(earnedB.earnedBase, 31000),
    "D1 proration monthly: absences inside the paid-leave allowance dock nothing — full base");
  const earnedC = payroll.earnedBaseFor(
    { payBasis: "monthly", baseAmount: 10000, paidLeaveDays: 0 },
    { ...sumA, absent: 1 }, 31);
  check(eq(earnedC.earnedBase, 9677.42),
    "D1 proration monthly: the pro-rata division rounds to the paisa (10,000 × 30/31 = 9,677.42)");
  const earnedHalf = payroll.earnedBaseFor(monthly,
    { present: 29, absent: 0, half: 2, leave: 0, off: 0, markedDays: 31, workedUnits: 30 }, 31);
  check(eq(earnedHalf.earnedBase, 31000),
    "D1 proration monthly: half days are PAID days in the monthly bargain — no deduction");
  const daily = { payBasis: "daily", baseAmount: 1200, paidLeaveDays: 0 };
  const earnedD = payroll.earnedBaseFor(daily,
    { present: 20, absent: 3, half: 2, leave: 0, off: 4, markedDays: 29, workedUnits: 25 });
  check(earnedD.unpaidAbsent === 0 && eq(earnedD.earnedBase, 25200),
    "D1 proration daily: 1,200 × (20 present + 2 half) = 25,200 — absence simply earns nothing");
  check(eq(payroll.earnedBaseFor(daily,
    { present: 0, absent: 30, half: 0, leave: 0, off: 0, markedDays: 30, workedUnits: 0 }).earnedBase, 0),
    "D1 proration daily: a month with no presence earns exactly 0");

  /* ---- the salary_payable composition (§2.2) ---- */
  const sp = (memo, refType, lines) => ledger.makeEntry(memo, refType, null, lines);
  const spJournal = [
    sp("accrual emp-1", "payroll_accrual", [
      { account: "expense_salary", debit: 30000, credit: 0, ref: "emp-1" },
      { account: "salary_payable", debit: 0, credit: 30000, ref: "emp-1" }]),
    sp("accrual emp-2", "payroll_accrual", [
      { account: "expense_salary", debit: 20000, credit: 0, ref: "emp-2" },
      { account: "salary_payable", debit: 0, credit: 20000, ref: "emp-2" }]),
    // The C4 shape, verbatim: the accrual line carries NO ref key at all.
    sp("production issue (accrue)", "production_issue", [
      { account: "wip", debit: 5000, credit: 0, ref: "ord-1" },
      { account: "salary_payable", debit: 0, credit: 5000 }]),
    sp("advance emp-1", "salary_advance", [
      { account: "salary_payable", debit: 8000, credit: 0, ref: "emp-1" },
      { account: "cash", debit: 0, credit: 8000, ref: null }]),
    sp("payment emp-2", "payroll_payment", [
      { account: "salary_payable", debit: 20000, credit: 0, ref: "emp-2" },
      { account: "cash", debit: 0, credit: 20000, ref: null }]),
    sp("advance emp-3", "salary_advance", [
      { account: "salary_payable", debit: 5000, credit: 0, ref: "emp-3" },
      { account: "cash", debit: 0, credit: 5000, ref: null }]),
  ];
  check(eq(payroll.employeePosition(spJournal, "emp-1"), -22000) &&
        eq(payroll.employeePosition(spJournal, "emp-2"), 0) &&
        eq(payroll.employeePosition(spJournal, "emp-3"), 5000),
    "D1 composition: positions derive per employee — emp-1 owed 22,000, emp-2 settled, emp-3 advance 5,000");
  const comp = payroll.salaryPayableComposition(spJournal);
  check(eq(comp.glBalance, 22000) && eq(comp.owedToEmployees, 22000) &&
        eq(comp.advancesOutstanding, 5000) && eq(comp.unassignedAccrued, 5000),
    "D1 composition: GL 22,000 = owed 22,000 + unassigned (C4) bucket 5,000, advances 5,000 on the other side");
  check(eq(comp.owedToEmployees - comp.advancesOutstanding + comp.unassignedAccrued, comp.glBalance) &&
        eq(comp.glBalance, ledger.accountNormalBalance(spJournal, "salary_payable")),
    "D1 composition: the §2.2 identity holds to the paisa — GL ≡ Σ employee positions + unassigned bucket");
  const compSeed = payroll.salaryPayableComposition(journal);
  check(eq(compSeed.glBalance, 0) && compSeed.employees.length === 0 && eq(compSeed.unassignedAccrued, 0),
    "D1 composition: the seed journal carries no salary_payable at all — the composition is honestly empty");
  check(payroll.hasPostedRunForMonth([{ month: "2026-10", status: "posted" }], "2026-10") === true &&
        payroll.hasPostedRunForMonth([{ month: "2026-09", status: "draft" }], "2026-09") === false &&
        payroll.hasPostedRunForMonth([{ month: "2026-08", status: "reversed" }], "2026-08") === false &&
        payroll.hasPostedRunForMonth([], "2026-10") === false,
    "D1 register warning: only a POSTED run marks its month — drafts and reversed runs do not");

  /* ---- RBAC: the pre-declared rows, as declared (§6.1) ---- */
  check(perm.can("owner", "staffDirectory", "write") && perm.can("manager", "staffDirectory", "write") &&
        !perm.can("cashier", "staffDirectory", "view") && perm.can("accountant", "staffDirectory", "view") &&
        !perm.can("accountant", "staffDirectory", "write"),
    "RBAC staffDirectory: owner/manager write, accountant reads terms, cashier never reaches the surface (G-D1)");
  check(perm.can("accountant", "payroll", "write") && perm.can("manager", "payroll", "view") &&
        !perm.can("manager", "payroll", "write") && !perm.can("cashier", "payroll", "view") &&
        perm.can("accountant", "loans", "write") && !perm.can("manager", "loans", "write"),
    "RBAC payroll/loans rows stand as pre-declared in A3 (D2/D3 will consume them unchanged)");

  /* ---- demo seed: directory data only, zero journal footprint (§10.3) ---- */
  const seedEmps = seed.getSeedEmployees();
  const seedAtt = seed.getSeedAttendance(seedEmps);
  check(seedEmps.length === 2 && seedEmps.filter((e) => e.payBasis === "monthly").length === 1 &&
        seedEmps.filter((e) => e.payBasis === "daily").length === 1 &&
        seedEmps.every((e) => e.active),
    "D1 seed: two sample employees — one monthly-basis, one daily-basis, both active");
  check(seedAtt.length === 2 && seedAtt.every((a) =>
          a.id === payroll.attendanceDocId(a.employeeId, a.month) && a.month === payroll.currentMonthKey()),
    "D1 seed: one attendance doc per employee for the CURRENT (PKT) month, deterministic ids");
  check(seedAtt.every((a) => {
          const s = payroll.attendanceSummary(a);
          return s.markedDays === Object.keys(a.days).length && s.markedDays > 0;
        }),
    "D1 seed: the register is marked for the elapsed days and its summary re-derives exactly");
  check(journal.length === 21 && eq(ledger.accountBalance(journal, "inventory"), 272805) &&
        eq(ledger.accountBalance(journal, "cash"), 50000) &&
        journal.every((e) => ledger.entryBalances(e)),
    "D1 seed: the frozen journal identities stand — 21 entries, inventory 272,805, cash 50,000, every entry balanced");

  /* ---- employee search (lib/search, null-safe like every desk) ---- */
  check(search.employeeMatches({ name: "Muhammad Imran", phone: "0300-1", designation: "Salesman" }, "imran") &&
        search.employeeMatches({ name: "Rashid Ali", phone: null, designation: undefined }, "rashid") &&
        !search.employeeMatches({ name: "Rashid Ali" }, "imran") &&
        search.employeeMatches({ name: null, phone: null, designation: null }, "") === true,
    "D1 search: employeeMatches hits name/designation, never throws on missing fields");

  /* ---- source invariants: store wiring, NO new posting route ---- */
  const storeSrcD1 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx", "utf8");
  check(storeSrcD1.includes('"employees"') && storeSrcD1.includes('"attendance"') &&
        storeSrcD1.includes('"payrollRuns"') && storeSrcD1.includes('"loans"') &&
        storeSrcD1.includes('"dukaan-ai-store-v16"') && storeSrcD1.includes("ensurePhaseD") &&
        storeSrcD1.includes("setAttendanceMark") && storeSrcD1.includes('"phaseD.hrV1": true'),
    "source: the four Phase D collections, the v16 demo bump and the flag-only hrV1 migration are wired into the store");
  check((storeSrcD1.match(/makeEntry\(/g) || []).length === 24,
    "source: still 24 makeEntry calls in the store — D1 adds NO posting path (employees/attendance write docs only)");
  const payrollSrcD1 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/lib/payroll.ts", "utf8");
  /* Amended at D2 (same-check style): in D1 lib/payroll composed
   * nothing; D2 deliberately lands the §2.4 posting TEMPLATES
   * there (the C3/C4/C5 pattern — entries compose in lib through
   * the real makeEntry guard). The invariant that survives, and
   * the one this check now asserts: lib/payroll never GUARDS or
   * posts — guardPostings stays the store's choke point alone. */
  check(payrollSrcD1.includes("buildPayrollAccrualEntry") && !payrollSrcD1.includes("guardPostings("),
    "source: lib/payroll composes D2's entries through makeEntry but never guards a posting — the choke point stays in the store");
  const staffSrcD1 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/StaffView.tsx", "utf8");
  check(staffSrcD1.includes('can(role, "staffDirectory", "view")') &&
        staffSrcD1.includes("employeeMatches") && staffSrcD1.includes("hasPostedRunForMonth") &&
        staffSrcD1.includes("nextAttendanceMark"),
    "source: the Staff screen gates on staffDirectory, searches via lib/search and cycles marks via the pure core");

  /* ---- i18n: the D1 strings, both languages ---- */
  const hrKeys = Object.keys(i18n.en).filter(
    (k) => k.startsWith("staff.") || k.startsWith("att.") || k === "nav.staff");
  /* 103 at D1; +1 at D2 (staff.tab.payroll — the third Staff tab
   * chip lives in the same key family). */
  check(hrKeys.length === 104, `i18n: the hr part carries ${hrKeys.length} keys (104 expected)`);
  check(hrKeys.every((k) => typeof i18n.ur[k] === "string" && i18n.ur[k].length > 0) &&
        typeof i18n.en["fin.acct.loans_receivable"] === "string" &&
        i18n.ur["fin.acct.loans_receivable"].length > 0 &&
        i18n.en["settings.series.payrollRun"].length > 0 && i18n.ur["settings.series.payrollRun"].length > 0 &&
        i18n.en["settings.series.loan"].length > 0 && i18n.ur["settings.series.loan"].length > 0,
    "i18n: every D1 key present and non-empty in Urdu (parity), incl. the account + series labels");

  /* ---- rules: additive D1 blocks, narrowed reads (§6.2) ---- */
  const rulesD1 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8");
  const d1Seg = rulesD1.slice(
    rulesD1.indexOf("      // Phase D · D1"),
    rulesD1.indexOf("      // Expenses:"));
  check(d1Seg.includes("match /employees/{employeeId}") && d1Seg.includes("match /attendance/{attendanceId}") &&
        d1Seg.includes("hasRole(uid, ['owner', 'manager', 'accountant'])") &&
        d1Seg.includes("hasRole(uid, ['owner', 'manager'])"),
    "rules: employees + attendance blocks — read owner/manager/accountant, write owner/manager (design §6.2)");
  check(!stripE2BrandingBlock(d1Seg).includes("canAccess(uid)") && d1Seg.indexOf("match /employees") < d1Seg.indexOf("match /attendance"),
    "rules: Phase D reads are NARROWED — no canAccess read on either HR collection (salary data is not counter data) (E2 same-check amendment: the additive branding block — which legitimately reads canAccess, §2.1 — is stripped from the segment first; it is not an HR collection)");
  const strippedD1 = stripG1Blocks(stripG2Blocks(rulesD1.slice(0, rulesD1.indexOf("      // Phase D · D1")) +
    rulesD1.slice(rulesD1.indexOf("      // Expenses:"))));
  check(crypto.createHash("sha256").update(strippedD1, "utf8").digest("hex") ===
        "78df93ea7f53412bc634da26ab039ab40c33bcf1e110ac99cf02ce2f519b4761",
    "rules: stripping the D1 blocks reproduces the v6 file byte-for-byte (additive only; G1 same-check amendment: the four G1 spans are stripped first — v9's only other deltas, strip-proven in the G1 suite)");
}

/* ============================ D2 (Phase D · payroll runs, payments, advances, slips) ============================ */
suite("D2", null); // Phase D · D2 — payroll (design §2; the phase's heaviest finance checkpoint)
{
  const FULL = {
    fromDate: "2000-01-01", toDate: "2999-12-31",
    fromTs: "2000-01-01T00:00:00.000Z", toTs: "2999-01-01T00:00:00.000Z",
  };
  const T = {
    adv: "2026-10-02T05:00:00.000Z",
    c4: "2026-10-03T05:00:00.000Z",
    accr: "2026-11-01T05:00:00.000Z",
    pay: "2026-11-02T05:00:00.000Z",
    bucket: "2026-11-03T05:00:00.000Z",
    rev: "2026-11-04T05:00:00.000Z",
  };

  /* ---- fixtures: two employees + October attendance (§1.4) ---- */
  const empA = {
    id: "emp-a", name: "Ahmed Raza", phone: "0300-1", designation: "Salesman",
    linkedUserEmail: null, joinDateISO: "2024-01-01", payBasis: "monthly",
    baseAmount: 31000, allowances: [{ label: "Transport", amount: 3000 }],
    paidLeaveDays: 2, active: true, note: "", ts: "",
  };
  const empB = {
    id: "emp-b", name: "Bilal Hussain", phone: "0300-2", designation: "Helper",
    linkedUserEmail: null, joinDateISO: "2025-01-01", payBasis: "daily",
    baseAmount: 1200, allowances: [], paidLeaveDays: 0, active: true, note: "", ts: "",
  };
  const empOff = { ...empB, id: "emp-off", name: "Old Hand", active: false };
  const attDays = (marks) => {
    const days = {};
    let d = 1;
    for (const [mark, count] of marks) for (let i = 0; i < count; i++) days[String(d++)] = mark;
    return days;
  };
  const attA = { id: "emp-a__2026-10", employeeId: "emp-a", month: "2026-10",
    days: attDays([["present", 26], ["absent", 3], ["leave", 1], ["off", 1]]), ts: "" };
  const attB = { id: "emp-b__2026-10", employeeId: "emp-b", month: "2026-10",
    days: attDays([["present", 20], ["half", 2], ["absent", 3]]), ts: "" };

  /* ---- composition: lines snapshot the proration (§2.3) ---- */
  const lines = payroll.buildRunLines([empA, empB, empOff], [attA, attB], "2026-10");
  check(lines.length === 2 && lines.every((l) => l.employeeId !== "emp-off"),
    "D2 compose: one line per ACTIVE employee — the deactivated employee is not composed");
  const lineA = lines.find((l) => l.employeeId === "emp-a");
  const lineB = lines.find((l) => l.employeeId === "emp-b");
  check(lineA.present === 26 && lineA.absent === 3 && lineA.leave === 1 && lineA.unpaidAbsent === 1 &&
        eq(lineA.earnedBase, 30000) && eq(lineA.gross, 33000) && eq(lineA.netAccrued, 33000),
    "D2 compose: monthly line snapshots counts + §1.4 (31,000×30/31 = 30,000 earned; +3,000 allowance = 33,000)");
  check(eq(lineB.earnedBase, 25200) && eq(lineB.netAccrued, 25200) && lineB.unpaidAbsent === 0,
    "D2 compose: daily line = 1,200 × (20 + 2 halves) = 25,200");
  check(payroll.buildRunLines([], [], "2026-10").length === 0,
    "D2 compose: a shop with no employees composes no lines (Phase D posts nothing until used)");

  /* ---- desk overrides: reducers live on the line (§2.3/§2.5) ---- */
  const lineA2 = payroll.payrollLineTotals({
    ...lineA, deductions: [{ label: "Fine", amount: 500 }],
  });
  check(eq(lineA2.gross, 33000) && eq(lineA2.netAccrued, 32500),
    "D2 override: a 500 fine reduces the NET (33,000 − 500 = 32,500) — gross stays the slip's story");
  const runLines = [lineA2, lineB];
  const totals = payroll.payrollRunTotals(runLines);
  check(eq(totals.gross, 58200) && eq(totals.deductions, 500) && eq(totals.netAccrued, 57700),
    "D2 totals: run totals are a pure function of the lines (58,200 / 500 / 57,700)");

  const runDraft = {
    id: "run-1", number: null, month: "2026-10", lines: runLines, totals,
    payments: [], accrualEntryId: null, status: "draft", note: "", dayOffset: 0, ts: T.accr,
  };
  const runPosted = { ...runDraft, number: "PAY-1", status: "posted" };

  /* ---- the accrual entry (§2.4): NET, refs, no reducers ---- */
  const accrual = payroll.buildPayrollAccrualEntry(runPosted, { ts: T.accr });
  check(!!accrual && accrual.refType === "payroll_accrual" && accrual.refId === "run-1" &&
        ledger.entryBalances(accrual),
    "D2 accrual: ONE entry, refType payroll_accrual citing the run, balanced by construction");
  const spLines = accrual.lines.filter((l) => l.account === "salary_payable");
  const exLines = accrual.lines.filter((l) => l.account === "expense_salary");
  check(accrual.lines.length === 4 && spLines.length === 2 && exLines.length === 2 &&
        spLines.every((l) => l.credit > 0 && (l.ref === "emp-a" || l.ref === "emp-b")) &&
        exLines.every((l) => l.debit > 0 && (l.ref === "emp-a" || l.ref === "emp-b")),
    "D2 accrual: per-employee Dr expense_salary / Cr salary_payable pairs, BOTH lines carrying ref = employeeId");
  check(eq(sum(exLines.map((l) => l.debit)), totals.netAccrued) &&
        eq(sum(spLines.map((l) => l.credit)), totals.netAccrued),
    "D2 accrual: Σ lines == the run's net total (57,700) on both accounts");
  check(!accrual.lines.some((l) => l.debit === 500 || l.credit === 500) &&
        !accrual.lines.some((l) => l.debit === 58200 || l.credit === 58200),
    "D2 accrual: the 500 reducer and the 58,200 gross are NOWHERE in the journal — net accrual, never grossed up (§2.4)");
  check(payroll.buildPayrollAccrualEntry({ ...runDraft, lines: [
          { ...lineB, earnedBase: 0, allowances: [], gross: 0, netAccrued: 0 }] }) === null,
    "D2 accrual: a run whose lines all net to zero composes NO entry (finalise refuses)");

  /* ---- the mixed journal: advance + C4 accrual + run + payments ---- */
  const advEntry = payroll.buildSalaryAdvanceEntry({
    employeeId: "emp-a", name: "Ahmed Raza", amount: 8000,
    method: "cash", accountId: "acc-main", ts: T.adv,
  });
  check(advEntry.refType === "salary_advance" && advEntry.refId === "emp-a" &&
        advEntry.lines[0].account === "salary_payable" && advEntry.lines[0].debit === 8000 &&
        advEntry.lines[0].ref === "emp-a" && advEntry.lines[1].account === "cash" &&
        advEntry.lines[1].ref === "acc-main",
    "D2 advance: Dr salary_payable (ref = employee) / Cr cash (ref = account) — not an expense, not the customer khata");
  const c4Entry = ledger.makeEntry("Production issue — labour accrued", "production_issue", "ord-1", [
    { account: "wip", debit: 5000, credit: 0, ref: "ord-1" },
    { account: "salary_payable", debit: 0, credit: 5000 }, // the C4 shape: NO ref key
  ], { ts: T.c4 });
  const J = [advEntry, c4Entry, accrual];
  runPosted.accrualEntryId = accrual.id;

  check(eq(payroll.employeePosition(J, "emp-a"), -32500 + 8000),
    "D2 advance→position: after advance + accrual, emp-a's position is −24,500 (owed 32,500, advanced 8,000)");
  let comp = payroll.salaryPayableComposition(J);
  check(eq(comp.glBalance, 54700) && eq(comp.owedToEmployees, 24500 + 25200) &&
        eq(comp.advancesOutstanding, 0) && eq(comp.unassignedAccrued, 5000),
    "D2 composition (pre-payment): GL 54,700 = owed 49,700 + unassigned bucket 5,000 (the 8,000 advance debit nets inside emp-a's position)");
  check(eq(comp.owedToEmployees - comp.advancesOutstanding + comp.unassignedAccrued, comp.glBalance),
    "D2 composition identity holds after advance + C4 + accrual");

  /* ---- partial payment + the §2.7 slip figures ---- */
  const payEntry = payroll.buildPayrollPaymentEntry({
    run: runPosted, employeeId: "emp-a", name: "Ahmed Raza", amount: 20000,
    method: "cash", accountId: "acc-main", ts: T.pay,
  });
  check(payEntry.refType === "payroll_payment" && payEntry.refId === "run-1" &&
        payEntry.lines[0].account === "salary_payable" && payEntry.lines[0].ref === "emp-a" &&
        payEntry.lines[1].account === "cash" && payEntry.lines[1].credit === 20000,
    "D2 payment: Dr salary_payable (ref = employee) / Cr money — recovery is NOT a journal leg (§2.4)");
  const runPaid = { ...runPosted, payments: [{
    employeeId: "emp-a", name: "Ahmed Raza", amount: 20000, method: "cash",
    accountId: "acc-main", entryId: payEntry.id, dayOffset: 0, ts: T.pay,
  }] };
  J.push(payEntry);
  check(eq(payroll.paidForRun(runPaid, "emp-a"), 20000) && eq(payroll.paidForRun(runPaid, "emp-b"), 0),
    "D2 paidForRun: the run's events derive its paid state — 20,000 for emp-a, 0 for emp-b");
  const fig = payroll.runLineFigures(J, runPaid, lineA2);
  check(eq(fig.advanceBefore, 8000) && eq(fig.cashPaid, 20000) &&
        eq(fig.advanceRecovered, 8000) && eq(fig.stillOwed, 4500) && eq(fig.advanceOutstanding, 0),
    "D2 slip figures (§2.7): advance before 8,000 · recovered min(8,000, 32,500−20,000) = 8,000 · paid 20,000 · still owed 4,500");
  comp = payroll.salaryPayableComposition(J);
  check(eq(comp.glBalance, 34700) && eq(comp.owedToEmployees, 4500 + 25200) &&
        eq(comp.unassignedAccrued, 5000) &&
        eq(comp.owedToEmployees - comp.advancesOutstanding + comp.unassignedAccrued, comp.glBalance),
    "D2 composition (post-payment): GL 34,700 = owed 29,700 + bucket 5,000 — identity holds after the payment");

  /* ---- the unassigned bucket payment (§2.2/§2.4) ---- */
  const bucketEntry = payroll.buildPayrollPaymentEntry({
    run: runPaid, employeeId: null, name: "Production labour", amount: 5000,
    method: "cash", accountId: "acc-main", ts: T.bucket,
  });
  check(bucketEntry.lines[0].account === "salary_payable" && (bucketEntry.lines[0].ref ?? null) === null,
    "D2 bucket payment: the Dr salary_payable line carries NO ref — it settles the bucket, no employee");
  J.push(bucketEntry);
  comp = payroll.salaryPayableComposition(J);
  check(eq(comp.unassignedAccrued, 0) && eq(comp.glBalance, 29700) &&
        eq(comp.owedToEmployees, 29700) &&
        eq(comp.owedToEmployees - comp.advancesOutstanding + comp.unassignedAccrued, comp.glBalance),
    "D2 composition (bucket paid): bucket 0, GL 29,700 = owed 29,700 — the identity survives mixed traffic");

  /* ---- trial balance over the whole D2 journal ---- */
  const tbD2 = reports.trialBalance(J, FULL);
  check(tbD2.balanced && eq(tbD2.difference, 0) && eq(tbD2.closingDifference, 0),
    "D2 trial balance: the mixed payroll journal balances — period and closing differences are 0");
  const tbSal = tbD2.rows.find((r) => r.account === "salary_payable");
  check(!!tbSal && eq(tbSal.closing, 29700),
    "D2 trial balance: salary_payable closes at the composition's GL (29,700)");

  /* ---- run reversal: payments STAND as advances (§2.6) ---- */
  const runMirror = payroll.buildMirrorEntry(accrual, "Payroll reversal PAY-1 — 2026-10", { ts: T.rev });
  check(runMirror.reversesId === accrual.id && runMirror.refType === "payroll_accrual" &&
        ledger.entryBalances(runMirror),
    "D2 run reversal: the mirror cites the accrual via reversesId and balances");
  const J2 = [...J, runMirror];
  check(eq(payroll.employeePosition(J2, "emp-a"), 28000) &&
        eq(payroll.employeePosition(J2, "emp-b"), 0),
    "D2 run reversal: emp-a's 20,000 payment + 8,000 advance now sit as a 28,000 ADVANCE position (payments stand); emp-b restored to 0");
  const comp2 = payroll.salaryPayableComposition(J2);
  check(eq(comp2.glBalance, -28000) && eq(comp2.advancesOutstanding, 28000) &&
        eq(comp2.owedToEmployees, 0) && eq(comp2.unassignedAccrued, 0) &&
        eq(comp2.owedToEmployees - comp2.advancesOutstanding + comp2.unassignedAccrued, comp2.glBalance),
    "D2 composition (run reversed): GL −28,000 ≡ advances 28,000 — the two-bucket identity holds through reversal");
  const tbD2r = reports.trialBalance(J2, FULL);
  check(tbD2r.balanced && eq(tbD2r.closingDifference, 0),
    "D2 trial balance: still 0 after the run reversal");

  /* ---- payment reversal restores the position (§2.6) ---- */
  const J3 = [accrual];
  const payB = payroll.buildPayrollPaymentEntry({
    run: runPosted, employeeId: "emp-b", name: "Bilal Hussain", amount: 10000,
    method: "bank", accountId: "acc-bank", ts: T.pay,
  });
  J3.push(payB);
  check(eq(payroll.employeePosition(J3, "emp-b"), -15200),
    "D2 partial payment: emp-b owed 25,200 − paid 10,000 → position −15,200");
  const payBMirror = payroll.buildMirrorEntry(payB, "Salary payment reversal — Bilal Hussain", { ts: T.rev });
  J3.push(payBMirror);
  check(payBMirror.reversesId === payB.id && eq(payroll.employeePosition(J3, "emp-b"), -25200),
    "D2 payment reversal: the mirror restores emp-b's position to the full accrual (−25,200)");
  const runPaidB = { ...runPosted, payments: [
    { employeeId: "emp-b", name: "Bilal Hussain", amount: 10000, method: "bank",
      accountId: "acc-bank", entryId: payB.id, dayOffset: 0, ts: T.pay },
    { employeeId: "emp-b", name: "Bilal Hussain", amount: -10000, method: "bank",
      accountId: "acc-bank", entryId: payBMirror.id, dayOffset: 0, ts: T.rev },
  ] };
  check(eq(payroll.paidForRun(runPaidB, "emp-b"), 0),
    "D2 payment reversal: the reversing event (negative amount) nets the run's paid derivation back to 0");

  /* ---- period locks: backdated postings refuse (§7) ---- */
  const lockEnd = periods.endOfDayPktInstant("2026-10-31");
  const backdated = payroll.buildPayrollAccrualEntry(runPosted, { ts: "2026-10-05T05:00:00.000Z" });
  let lockThrew = false;
  try { periods.preparePosting(backdated, lockEnd); }
  catch (e) { lockThrew = periods.isPeriodLockedError(e); }
  check(lockThrew,
    "D2 period lock: an accrual dated inside the locked period is refused by preparePosting (PeriodLockedError)");
  check(periods.preparePosting(accrual, lockEnd).dateISO === "2026-11-01",
    "D2 period lock: the same accrual at its real (November) date passes — a run FOR a locked month finalises today (§7)");
  const backPay = payroll.buildPayrollPaymentEntry({
    run: runPosted, employeeId: "emp-a", name: "Ahmed Raza", amount: 1000,
    method: "cash", accountId: "acc-main", ts: "2026-10-05T05:00:00.000Z",
  });
  let payLockThrew = false;
  try { periods.preparePosting(backPay, lockEnd); }
  catch (e) { payLockThrew = periods.isPeriodLockedError(e); }
  check(payLockThrew,
    "D2 period lock: a backdated payment refuses the same way — the journal leg fails the whole batch");

  /* ---- RBAC: the payroll row, as pre-declared (§6.1) ---- */
  check(perm.can("owner", "payroll", "write") && perm.can("accountant", "payroll", "write") &&
        perm.can("manager", "payroll", "view") && !perm.can("manager", "payroll", "write") &&
        !perm.can("cashier", "payroll", "view"),
    "RBAC payroll: owner/accountant write, manager reads (G-D2), cashier excluded — the A3 row consumed unchanged");

  /* ---- demo seed: the DRAFT run, zero journal footprint (§10.3) ---- */
  const seedEmpsD2 = seed.getSeedEmployees();
  const seedAttD2 = seed.getSeedAttendance(seedEmpsD2);
  const draft = seed.getSeedPayrollRunDraft(seedEmpsD2, seedAttD2);
  check(draft.status === "draft" && draft.number === null && draft.accrualEntryId === null &&
        draft.payments.length === 0 && draft.lines.length === 2 &&
        draft.month === payroll.currentMonthKey(),
    "D2 seed: ONE draft run for the current month — unnumbered, unposted, no payments, both sample employees composed");
  const draftTotals = payroll.payrollRunTotals(draft.lines);
  check(eq(draft.totals.gross, draftTotals.gross) && eq(draft.totals.netAccrued, draftTotals.netAccrued),
    "D2 seed: the draft's totals are the composer's own totals over its lines");
  check(journal.length === 21 && eq(ledger.accountBalance(journal, "inventory"), 272805) &&
        eq(ledger.accountBalance(journal, "cash"), 50000) &&
        eq(ledger.accountBalance(journal, "salary_payable"), 0),
    "D2 seed: frozen identities stand — 21 entries, inventory 272,805, cash 50,000, no salary_payable in the seed journal");

  /* ---- source invariants: wiring + guards + no new posting route ---- */
  const storeSrcD2 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx", "utf8");
  check(storeSrcD2.includes("finalisePayrollRun") && storeSrcD2.includes("payPayrollEmployee") &&
        storeSrcD2.includes("giveSalaryAdvance") && storeSrcD2.includes("reversePayrollRun") &&
        storeSrcD2.includes("reversePayrollPayment") && storeSrcD2.includes("getSeedPayrollRunDraft"),
    "source: the D2 store actions + the demo draft are wired into the store");
  check(storeSrcD2.includes('r.month === cur.month && r.status === "posted"') &&
        storeSrcD2.includes("buildPayrollAccrualEntry") && storeSrcD2.includes("buildMirrorEntry"),
    "source: the one-posted-run-per-month guard refuses pre-composition; entries compose in lib/payroll");
  check((storeSrcD2.match(/makeEntry\(/g) || []).length === 24,
    "source: still 24 makeEntry calls in the store — D2 adds NO posting route (templates live in lib/payroll)");
  const staffSrcD2 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/StaffView.tsx", "utf8");
  check(staffSrcD2.includes('can(role, "payroll", "view")') && staffSrcD2.includes("runLineFigures") &&
        staffSrcD2.includes("SalarySlipSheet") && staffSrcD2.includes("NegativeBalanceWarning") &&
        staffSrcD2.includes("outflowPreview"),
    "source: the Payroll tab gates on the payroll row, derives via runLineFigures, prints slips, and warns via outflowPreview");
  const finSrcD2 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/FinanceView.tsx", "utf8");
  check(finSrcD2.includes("salaryPayableComposition") && finSrcD2.includes("fin.sal.title"),
    "source: Finance renders the §2.8 salary_payable composition card from the journal");

  /* ---- i18n: the D2 strings, both languages ---- */
  const payKeys = Object.keys(i18n.en).filter((k) => k.startsWith("pay."));
  const slipKeys = Object.keys(i18n.en).filter((k) => k.startsWith("slip."));
  check(payKeys.length === 84 && slipKeys.length === 20,
    `i18n: the hr part carries ${payKeys.length} pay.* + ${slipKeys.length} slip.* keys (84 + 20 expected)`);
  check([...payKeys, ...slipKeys].every((k) => typeof i18n.ur[k] === "string" && i18n.ur[k].length > 0) &&
        ["fin.sal.title", "fin.sal.owed", "fin.sal.advances", "fin.sal.unassigned",
         "fin.ref.payrollAccrual", "fin.ref.payrollPayment", "fin.ref.salaryAdvance"]
          .every((k) => typeof i18n.en[k] === "string" && i18n.en[k].length > 0 &&
                       typeof i18n.ur[k] === "string" && i18n.ur[k].length > 0),
    "i18n: every D2 key present and non-empty in Urdu (parity), incl. the Finance composition + journal labels");
  check(Object.keys(i18n.en).length === 3136 && Object.keys(i18n.ur).length === 3136,
    "i18n: the dictionary now carries 3,054 keys, EN ≡ UR (pin amended at the five-theme increment: +6 theme-picker keys; D3: +119 loan keys; D4: +55 fin.fy keys; D5: +12 fin.export keys; E1: +53 print keys; E2 pin amendment: +37 print.brand keys; E3 pin amendment: +35 Raast keys (34 print.raast + billing.wa.raastLine); E4 pin amendment: +49 pin keys; F5 pin amendment: +1 sync.online key; G1 pin amendment: +8 biz keys; G2 pin amendment: +36 plan keys; G3 pin amendment: +89 platform keys; G4 pin amendment: +47 keys (35 renew.* + 12 platform.*); G6 pin amendment: +25 backup.* keys; H1 pin amendment: +51 loyalty keys; H3 pin amendment: +108 storefront keys; WA pin amendment: +109 WhatsApp keys)");

  /* ---- rules: the additive payrollRuns block (§6.2) ---- */
  const rulesD2 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8");
  const d2Seg = rulesD2.slice(
    rulesD2.indexOf("      // Phase D · D2"),
    rulesD2.indexOf("      // Expenses:"));
  check(d2Seg.includes("match /payrollRuns/{runId}") &&
        d2Seg.includes("hasRole(uid, ['owner', 'manager', 'accountant'])") &&
        d2Seg.includes("hasRole(uid, ['owner', 'accountant']) && createInOpenPeriod(uid)") &&
        d2Seg.includes("allow delete: if isBusinessOwner(uid);"),
    "rules: payrollRuns — narrowed read (o/m/a), create owner/accountant + period backstop, update o/a, delete owner-only (FR2 same-check amendment: the leg is now isBusinessOwner — uid match OR registry leg — so a generated business's owner deletes exactly as a legacy owner does; staff gain nothing)");
  check(!stripE2BrandingBlock(d2Seg).includes("canAccess(uid)"),
    "rules: payroll reads are NARROWED — no canAccess read on payrollRuns (salary data is not counter data) (E2 same-check amendment: the additive branding block — which legitimately reads canAccess, §2.1 — is stripped from the segment first; it is not payroll data)");
  const strippedD2 = stripG1Blocks(stripG2Blocks(rulesD2.slice(0, rulesD2.indexOf("      // Phase D · D2")) +
    rulesD2.slice(rulesD2.indexOf("      // Expenses:"))));
  check(crypto.createHash("sha256").update(strippedD2, "utf8").digest("hex") ===
        "00d810dfb60d0b75faf9f58f078a4720121581c07d4d2216b0c054465c67bf4a",
    "rules: stripping the D2 block reproduces the D1-state file byte-for-byte (additive only; G1 same-check amendment: the four G1 spans are stripped first — v9's only other deltas, strip-proven in the G1 suite)");
}

/* ============================ D3 (Phase D · loans register) ============================ */
suite("D3", null); // Phase D · D3 — loans register (design §3)
{
  const FULL = {
    fromDate: "2000-01-01", toDate: "2999-12-31",
    fromTs: "2000-01-01T00:00:00.000Z", toTs: "2999-01-01T00:00:00.000Z",
  };
  const T = {
    dd: "2026-10-01T05:00:00.000Z",
    ch: "2026-11-01T05:00:00.000Z",
    rp: "2026-11-05T05:00:00.000Z",
    rv: "2026-11-06T05:00:00.000Z",
  };
  const withEvent = (loan, ev) => ({ ...loan, events: [...loan.events, ev] });
  const evOf = (kind, entry, extra = {}) => ({
    kind,
    amount: extra.amount ?? 0,
    principalPart: extra.principalPart ?? 0,
    chargePart: extra.chargePart ?? 0,
    accountId: extra.accountId ?? null,
    entryId: entry.id,
    dayOffset: 0,
    ts: entry.ts,
  });

  /* ---- terms: composition refusals (§3.2/§3.4) ---- */
  const flatTerms = {
    direction: "payable", partyName: "City Leasing Co", principal: 100000,
    chargeType: "flat", chargeRate: 10, feeAmount: 0, instalmentCount: 7,
  };
  check(loans.loanTermsError(flatTerms) === null,
    "D3 terms: a flat payable loan composes");
  check(loans.loanTermsError({ ...flatTerms, direction: "receivable" }) === "chargeReceivable",
    "D3 terms: charged RECEIVABLE lending is refused at composition (§3.2 rule 3) — never silently zeroed");
  check(loans.loanTermsError({ ...flatTerms, direction: "receivable", chargeType: "none" }) === null,
    "D3 terms: a charge-free receivable loan composes");
  check(loans.loanTermsError({ ...flatTerms, principal: 0 }) === "principal" &&
        loans.loanTermsError({ ...flatTerms, partyName: "  " }) === "party" &&
        loans.loanTermsError({ ...flatTerms, instalmentCount: 0 }) === "instalments" &&
        loans.loanTermsError({ ...flatTerms, chargeRate: 0 }) === "rate",
    "D3 terms: principal / party / instalments / rate refusals each name their reason");
  check(loans.loanTermsError({ ...flatTerms, chargeType: "fee_only", feeAmount: 0 }) === "fee" &&
        loans.loanTermsError({ ...flatTerms, feeAmount: 100000 }) === "fee",
    "D3 terms: a fee_only loan needs its fee, and a netted fee must leave positive proceeds (fee < principal)");
  check(eq(loans.loanChargeAmount(flatTerms), 10000) &&
        eq(loans.loanChargeAmount({ chargeType: "fee_only", principal: 50000, chargeRate: 0, feeAmount: 2000 }), 2000) &&
        eq(loans.loanChargeAmount({ chargeType: "reducing", principal: 120000, chargeRate: 2, feeAmount: 0 }), 0),
    "D3 charge snapshot: flat = % of ORIGINAL principal (10,000); fee_only = the fee; reducing snapshots no total");

  /* ---- the schedule derivation (§3.3) ---- */
  const flatLoan = {
    id: "loan-1", number: "LN-1", direction: "payable", partyName: "City Leasing Co",
    partyId: null, principal: 100000, chargeType: "flat", chargeRate: 10,
    chargeAmount: 10000, startDateISO: "2026-10-01", instalmentCount: 7,
    instalmentEvery: "month", firstDueISO: "2026-11-01", events: [],
    status: "active", note: "", dayOffset: 0, ts: "",
  };
  const sched = loans.loanSchedule(flatLoan);
  check(sched.length === 7 && eq(sum(sched.map((s) => s.principalPart)), 100000) &&
        eq(sum(sched.map((s) => s.chargePart)), 10000),
    "D3 schedule: 100,000 over 7 at flat 10% — principal parts sum to 100,000 and charge parts to 10,000 EXACTLY");
  check(eq(sched[0].principalPart, 14285.71) && eq(sched[6].principalPart, 14285.71) &&
        sched.every((s) => Math.abs(s.principalPart - 100000 / 7) < 0.02) &&
        eq(sched[0].chargePart, 1428.57) && eq(sched[3].chargePart, 1428.58),
    "D3 schedule: cumulative-allocation splits (14,285.71/72 alternating; the residual rides the cumulative discipline, not a lump)");
  check(sched[0].dueISO === "2026-11-01" && sched[6].dueISO === "2027-05-01" &&
        loans.addMonthsISO("2026-01-31", 1) === "2026-02-28" &&
        loans.instalmentDueISO({ ...flatLoan, instalmentEvery: "week", firstDueISO: "2026-11-06" }, 3) === "2026-11-20",
    "D3 schedule dates: monthly steps from the first due date; month-end clamps (31 Jan + 1mo = 28 Feb); weekly steps by 7 days");
  const redLoan = { ...flatLoan, id: "loan-2", principal: 120000, chargeType: "reducing",
    chargeRate: 2, chargeAmount: 0, instalmentCount: 4 };
  const redSched = loans.loanSchedule(redLoan);
  check(redSched.map((s) => s.chargePart).join(",") === "2400,1800,1200,600" &&
        eq(sum(redSched.map((s) => s.principalPart)), 120000),
    "D3 schedule: reducing charges compute per period on the SCHEDULE's outstanding (2,400 / 1,800 / 1,200 / 600)");

  /* ---- drawdown shapes (§3.4) ---- */
  const ddEntry = loans.buildLoanDrawdownEntry(flatLoan, {
    method: "cash", accountId: "acc-main", ts: T.dd,
  });
  check(ddEntry.refType === "loan_drawdown" && ddEntry.refId === "loan-1" &&
        ledger.entryBalances(ddEntry) && ddEntry.lines.length === 2 &&
        ddEntry.lines[0].account === "cash" && ddEntry.lines[0].debit === 100000 &&
        ddEntry.lines[0].ref === "acc-main" &&
        ddEntry.lines[1].account === "loans_payable" && ddEntry.lines[1].credit === 100000 &&
        ddEntry.lines[1].ref === "loan-1",
    "D3 drawdown (gross): Dr cash (ref = account) 100,000 / Cr loans_payable (ref = loan) 100,000 — one balanced entry");
  const feeLoan = { ...flatLoan, id: "loan-3", number: "LN-3", principal: 50000,
    chargeType: "fee_only", chargeRate: 0, chargeAmount: 2000, instalmentCount: 5 };
  const feeEntry = loans.buildLoanDrawdownEntry(feeLoan, {
    method: "bank", accountId: "acc-bank", feeAmount: 2000, ts: T.dd,
  });
  check(feeEntry.lines.length === 3 &&
        feeEntry.lines[0].account === "wallet" && eq(feeEntry.lines[0].debit, 48000) &&
        feeEntry.lines[1].account === "expense_finance" && eq(feeEntry.lines[1].debit, 2000) &&
        feeEntry.lines[2].account === "loans_payable" && eq(feeEntry.lines[2].credit, 50000) &&
        ledger.entryBalances(feeEntry),
    "D3 drawdown (fee netted): Dr money 48,000 + Dr expense_finance 2,000 / Cr loans_payable 50,000 — the fee is expensed at drawdown, never smeared into principal");

  /* ---- charges: proposed, never automatic (§3.2/§3.4) ---- */
  let loan1 = withEvent(flatLoan, evOf("drawdown", ddEntry, {
    amount: 100000, principalPart: 100000, accountId: "acc-main",
  }));
  const J = [ddEntry];
  check(!J.some((e) => e.refType === "loan_charge") &&
        !J.some((e) => e.lines.some((l) => l.account === "expense_finance")) &&
        eq(loans.loanPosition(loan1).chargesAccrued, 0),
    "D3 charges: a freshly drawn loan's journal carries NO charge — the schedule proposes, nothing posts on its own");
  const proposed = loans.nextChargeAccrual(loan1);
  check(!!proposed && proposed.n === 1 && eq(proposed.chargePart, 1428.57),
    "D3 charges: the next accrual is instalment 1's 1,428.57 — awaiting the desk's confirmation");
  check(eq(loans.loanJournalPosition(J, loan1), 100000) &&
        eq(loans.loanPosition(loan1).outstanding, 100000) &&
        eq(loans.loanJournalPosition(J, loan1), loans.loanPosition(loan1).outstanding),
    "D3 identity (drawdown): GL loans_payable == the diary's derived outstanding (100,000)");

  /* ---- charge accruals: discrete, ordinal, per instalment ---- */
  const ch1 = loans.buildLoanChargeEntry(loan1, { instalment: sched[0], ts: T.ch });
  check(ch1.refType === "loan_charge" && ch1.lines[0].account === "expense_finance" &&
        eq(ch1.lines[0].debit, 1428.57) && ch1.lines[1].account === "loans_payable" &&
        ch1.lines[1].ref === "loan-1" && ledger.entryBalances(ch1),
    "D3 charge entry: Dr expense_finance / Cr loans_payable (ref = loan) for exactly one instalment's charge");
  loan1 = withEvent(loan1, evOf("charge", ch1, { amount: 1428.57, chargePart: 1428.57 }));
  J.push(ch1);
  const ch2 = loans.buildLoanChargeEntry(loan1, { instalment: sched[1], ts: T.ch });
  loan1 = withEvent(loan1, evOf("charge", ch2, { amount: 1428.57, chargePart: 1428.57 }));
  J.push(ch2);
  check(loans.accruedChargeCount(loan1) === 2 &&
        eq(loans.loanPosition(loan1).chargesAccrued, 2857.14) &&
        eq(loans.loanPosition(loan1).outstanding, 102857.14) &&
        eq(loans.loanJournalPosition(J, loan1), loans.loanPosition(loan1).outstanding) &&
        loans.nextChargeAccrual(loan1)?.n === 3,
    "D3 identity (2 accruals): outstanding 102,857.14 on BOTH derivations; the next proposal is instalment 3 (ordinal)");

  /* ---- repayment: charges-first default + the split diary ---- */
  const split = loans.defaultRepaymentSplit(loan1, 20000);
  check(eq(split.chargePart, 2857.14) && eq(split.principalPart, 17142.86),
    "D3 split: the default settles charges first (2,857.14 of charges, then 17,142.86 of principal)");
  check(loans.repaymentSplitError(loan1, 20000, split) === null &&
        loans.repaymentSplitError(loan1, 20000, { principalPart: 20000, chargePart: 0 }) === null &&
        loans.repaymentSplitError(loan1, 20000, { principalPart: 19000, chargePart: 500 }) === "split" &&
        loans.repaymentSplitError(loan1, 20000, { principalPart: 17142.86, chargePart: 2857.15 }) === "split",
    "D3 split validation: a desk override may re-attribute (all-principal is valid); a split that mis-sums or over-draws a side refuses");
  check(loans.repaymentSplitError(loan1, 102857.15, { principalPart: 102857.15, chargePart: 0 }) === "overpay",
    "D3 overpayment: 1 paisa beyond the derived outstanding refuses pre-composition (§3.4)");
  const rpEntry = loans.buildLoanRepaymentEntry(loan1, {
    amount: 20000, method: "cash", accountId: "acc-main", ts: T.rp,
  });
  check(rpEntry.refType === "loan_repayment" && rpEntry.lines.length === 2 &&
        rpEntry.lines[0].account === "loans_payable" && rpEntry.lines[0].debit === 20000 &&
        rpEntry.lines[0].ref === "loan-1" && rpEntry.lines[1].account === "cash" &&
        rpEntry.lines[1].credit === 20000,
    "D3 repayment entry: the journal line is the WHOLE 20,000 — the split lives on the diary, never on the lines (§3.3)");
  loan1 = withEvent(loan1, evOf("repayment", rpEntry, {
    amount: 20000, principalPart: split.principalPart, chargePart: split.chargePart,
    accountId: "acc-main",
  }));
  J.push(rpEntry);
  const posAfterRp = loans.loanPosition(loan1);
  check(eq(posAfterRp.principalRepaid, 17142.86) && eq(posAfterRp.chargesRepaid, 2857.14) &&
        eq(posAfterRp.outstanding, 82857.14) &&
        eq(loans.loanJournalPosition(J, loan1), posAfterRp.outstanding),
    "D3 identity (repayment): outstanding 82,857.14 — diary and journal still agree to the paisa");
  const tbJ = reports.trialBalance(J, FULL);
  check(tbJ.balanced && eq(tbJ.closingDifference, 0),
    "D3 trial balance: the lifecycle journal balances (difference 0)");

  /* ---- overdue derivation off the schedule (§3.3/§3.5) ---- */
  const states = loans.loanInstalmentStates(loan1, "2027-01-15");
  check(states[0].state === "paid" && eq(states[0].paidAmount, 15714.28) &&
        states[1].state === "partial" && eq(states[1].paidAmount, 4285.72),
    "D3 instalment states: repayments apply in order — instalment 1 paid in full (15,714.28), instalment 2 partial (4,285.72)");
  check(states[2].state === "overdue" && eq(states[2].owed, 14285.71) && !states[2].chargeAccrued,
    "D3 overdue: instalment 3 (due 2027-01-01, unpaid, its charge NOT yet accrued) derives overdue on principal alone");
  const nextDue = loans.loanNextDue(loan1, "2027-01-15");
  check(!!nextDue && nextDue.instalment.n === 2 && nextDue.overdueCount === 1,
    "D3 next-due: the register points at instalment 2 (first with money owed) with exactly 1 overdue instalment");

  /* ---- reversal cleanliness (§3.4: mirror + negated diary) ---- */
  const rpMirror = loans.buildMirrorEntry(rpEntry, "Loan reversal LN-1", { ts: T.rv });
  const loan1r = withEvent(loan1, evOf("repayment", rpMirror, {
    amount: -20000, principalPart: -split.principalPart, chargePart: -split.chargePart,
    accountId: "acc-main",
  }));
  const Jr = [...J, rpMirror];
  check(rpMirror.reversesId === rpEntry.id && ledger.entryBalances(rpMirror) &&
        eq(loans.loanPosition(loan1r).outstanding, 102857.14) &&
        eq(loans.loanPosition(loan1r).totalRepaid, 0) &&
        eq(loans.loanJournalPosition(Jr, loan1r), 102857.14) &&
        reports.trialBalance(Jr, FULL).balanced,
    "D3 reversal: mirroring the repayment restores the position to 102,857.14 on both derivations; TB still 0");

  /* ---- the receivable mirror + the §3.1 isolation ---- */
  const recLoan = { ...flatLoan, id: "loan-9", number: "LN-9", direction: "receivable",
    partyName: "Partner — Ahmed", principal: 30000, chargeType: "none",
    chargeRate: 0, chargeAmount: 0, instalmentCount: 3 };
  const recDd = loans.buildLoanDrawdownEntry(recLoan, {
    method: "jazzcash", accountId: "acc-jazz", ts: T.dd,
  });
  check(recDd.lines[0].account === "loans_receivable" && recDd.lines[0].debit === 30000 &&
        recDd.lines[0].ref === "loan-9" && recDd.lines[1].account === "wallet" &&
        recDd.lines[1].credit === 30000,
    "D3 receivable drawdown: Dr loans_receivable (ref = loan) / Cr wallet — the mirror on the ONE additive code");
  let loan9 = withEvent(recLoan, evOf("drawdown", recDd, {
    amount: 30000, principalPart: 30000, accountId: "acc-jazz",
  }));
  const J9 = [recDd];
  const recRp = loans.buildLoanRepaymentEntry(loan9, {
    amount: 10000, method: "jazzcash", accountId: "acc-jazz", ts: T.rp,
  });
  loan9 = withEvent(loan9, evOf("repayment", recRp, {
    amount: 10000, principalPart: 10000, accountId: "acc-jazz",
  }));
  J9.push(recRp);
  check(eq(ledger.accountBalance(J9, "loans_receivable"), 20000) &&
        eq(loans.loanJournalPosition(J9, loan9), 20000) &&
        eq(loans.loanPosition(loan9).outstanding, 20000) &&
        eq(ledger.accountBalance(J9, "receivables"), 0) && eq(ledger.accountBalance(J9, "loans_payable"), 0),
    "D3 isolation: the lent loan rides loans_receivable ONLY — `receivables` (the customer khata) and loans_payable are untouched");
  check(loans.nextChargeAccrual(loan9) === null &&
        !J9.some((e) => e.lines.some((l) => l.account === "expense_finance")),
    "D3 receivable: charge-free end to end — no accrual is even proposed, no finance-expense line exists");

  /* ---- a charge-free loan's journal is principal-only ---- */
  const freeLoan = { ...recLoan, id: "loan-10", number: "LN-10", direction: "payable",
    partyName: "Uncle — family" };
  const freeDd = loans.buildLoanDrawdownEntry(freeLoan, {
    method: "cash", accountId: "acc-main", ts: T.dd,
  });
  const freeRp = loans.buildLoanRepaymentEntry(freeLoan, {
    amount: 30000, method: "cash", accountId: "acc-main", ts: T.rp,
  });
  const freeJ = [freeDd, freeRp];
  check(freeJ.every((e) => e.lines.every((l) => l.account === "cash" || l.account === "loans_payable")) &&
        loans.nextChargeAccrual({ ...freeLoan, events: [
          evOf("drawdown", freeDd, { amount: 30000, principalPart: 30000, accountId: "acc-main" }),
        ] }) === null,
    "D3 charge-free: a no-charge loan's whole lifecycle journal contains principal/money lines only");

  /* ---- settlement: outstanding 0 derives the settled label ---- */
  let settleLoan = loan1r; // outstanding 102,857.14, 2 charges accrued
  const Jsettle = [...Jr];
  for (let n = 3; n <= 7; n++) {
    const inst = sched[n - 1];
    const e = loans.buildLoanChargeEntry(settleLoan, { instalment: inst, ts: T.ch });
    settleLoan = withEvent(settleLoan, evOf("charge", e, {
      amount: inst.chargePart, chargePart: inst.chargePart,
    }));
    Jsettle.push(e);
  }
  const finalSplit = loans.defaultRepaymentSplit(settleLoan,
    loans.loanPosition(settleLoan).outstanding);
  const finalRp = loans.buildLoanRepaymentEntry(settleLoan, {
    amount: loans.loanPosition(settleLoan).outstanding, method: "cash",
    accountId: "acc-main", ts: T.rp,
  });
  settleLoan = withEvent(settleLoan, evOf("repayment", finalRp, {
    amount: finalRp.lines[0].debit, principalPart: finalSplit.principalPart,
    chargePart: finalSplit.chargePart, accountId: "acc-main",
  }));
  Jsettle.push(finalRp);
  check(eq(loans.loanPosition(settleLoan).outstanding, 0) &&
        eq(loans.loanJournalPosition(Jsettle, settleLoan), 0) &&
        loans.loanStatusFor(settleLoan) === "settled" &&
        reports.trialBalance(Jsettle, FULL).balanced,
    "D3 settlement: accrue the rest + repay the whole outstanding → 0 on both derivations, the label derives settled, TB 0");

  /* ---- period locks: backdated loan entries refuse (§7) ---- */
  const lockEnd = periods.endOfDayPktInstant("2026-10-31");
  const backDd = loans.buildLoanDrawdownEntry(flatLoan, {
    method: "cash", accountId: "acc-main", ts: "2026-10-05T05:00:00.000Z",
  });
  let ddLockThrew = false;
  try { periods.preparePosting(backDd, lockEnd); }
  catch (e) { ddLockThrew = periods.isPeriodLockedError(e); }
  check(ddLockThrew,
    "D3 period lock: a drawdown dated inside the locked period is refused by preparePosting");
  const backRp = loans.buildLoanRepaymentEntry(flatLoan, {
    amount: 1000, method: "cash", accountId: "acc-main", ts: "2026-10-05T05:00:00.000Z",
  });
  let rpLockThrew = false;
  try { periods.preparePosting(backRp, lockEnd); }
  catch (e) { rpLockThrew = periods.isPeriodLockedError(e); }
  const okRp = loans.buildLoanRepaymentEntry(flatLoan, {
    amount: 1000, method: "cash", accountId: "acc-main", ts: "2026-11-02T05:00:00.000Z",
  });
  check(rpLockThrew && periods.preparePosting(okRp, lockEnd).dateISO === "2026-11-02",
    "D3 period lock: a backdated repayment refuses the same way; the same repayment at its real date passes");

  /* ---- RBAC: the loans row, as pre-declared (§6.1) ---- */
  check(perm.can("owner", "loans", "write") && perm.can("accountant", "loans", "write") &&
        perm.can("manager", "loans", "view") && !perm.can("manager", "loans", "write") &&
        !perm.can("cashier", "loans", "view"),
    "RBAC loans: owner/accountant write, manager reads, cashier excluded — the A3 row consumed unchanged");

  /* ---- search: the register predicate is null-safe ---- */
  check(search.loanMatches({ number: "LN-1", partyName: "City Leasing Co" }, "leasing") &&
        search.loanMatches({ number: "LN-1" }, "ln-1") &&
        !search.loanMatches({ partyName: null, number: undefined }, "x") &&
        search.loanMatches({}, ""),
    "D3 search: loanMatches hits number/party, survives missing fields, and a blank query matches all");

  /* ---- demo seed: the journalless sample loan (§10.3) ---- */
  const seedLoans = seed.getSeedLoans();
  check(seedLoans.length === 1 && seedLoans[0].chargeType === "none" &&
        seedLoans[0].events.length === 0 && seedLoans[0].status === "active" &&
        seedLoans[0].number === "LN-1" &&
        eq(loans.loanPosition(seedLoans[0]).outstanding, seedLoans[0].principal) &&
        loans.loanPosition(seedLoans[0]).drawn === false,
    "D3 seed: ONE charge-free sample loan, no events — its outstanding derives as the full principal, drawn = false (demo-only posture)");
  check(journal.length === 21 && eq(ledger.accountBalance(journal, "inventory"), 272805) &&
        eq(ledger.accountBalance(journal, "cash"), 50000) &&
        eq(ledger.accountBalance(journal, "loans_payable"), 0) &&
        eq(ledger.accountBalance(journal, "loans_receivable"), 0),
    "D3 seed: frozen identities stand — 21 entries, inventory 272,805, cash 50,000, no loan balances in the seed journal");

  /* ---- register totals (§3.5) ---- */
  const regTotals = loans.loansRegisterTotals([loan1, loan9, { ...freeLoan, status: "cancelled" }]);
  check(eq(regTotals.borrowedOutstanding, 82857.14) && eq(regTotals.lentOutstanding, 20000),
    "D3 register totals: borrowed Σ outstanding + lent Σ outstanding, cancelled loans excluded");

  /* ---- source invariants: wiring + guards + no new posting route ---- */
  const storeSrcD3 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx", "utf8");
  check(storeSrcD3.includes("createLoan") && storeSrcD3.includes("accrueLoanCharge") &&
        storeSrcD3.includes("repayLoan") && storeSrcD3.includes("reverseLoanEvent") &&
        storeSrcD3.includes("deleteLoan") && storeSrcD3.includes("getSeedLoans"),
    "source: the D3 store actions + the demo sample loan are wired into the store");
  check(storeSrcD3.includes("loanTermsError(terms)") &&
        storeSrcD3.includes("repaymentSplitError(cur, amount, split)") &&
        storeSrcD3.includes("instalmentN !== accruedChargeCount(cur) + 1") &&
        storeSrcD3.includes("buildLoanDrawdownEntry") && storeSrcD3.includes("buildMirrorEntry"),
    "source: composition refusals + the ordinal accrual guard refuse pre-composition; entries compose in lib/loans");
  check((storeSrcD3.match(/makeEntry\(/g) || []).length === 24,
    "source: still 24 makeEntry calls in the store — D3 adds NO posting route (templates live in lib/loans)");
  const loansSrcD3 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/LoansView.tsx", "utf8");
  check(loansSrcD3.includes('can(role, "loans", "view")') && loansSrcD3.includes("loanPosition") &&
        loansSrcD3.includes("nextChargeAccrual") && loansSrcD3.includes("NegativeBalanceWarning") &&
        loansSrcD3.includes("outflowPreview") && loansSrcD3.includes("loanMatches"),
    "source: the Loans screen gates on the loans row, derives via lib/loans, warns via outflowPreview and searches via lib/search");
  const finSrcD3 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/FinanceView.tsx", "utf8");
  check(finSrcD3.includes("loansRegisterTotals") && finSrcD3.includes("fin.loan.title") &&
        finSrcD3.includes("fin.ref.loanDrawdown") && finSrcD3.includes("fin.ref.loanRepayment"),
    "source: Finance renders the §3.5 loans breakdown and the journal viewer names the loan refTypes");

  /* ---- i18n: the D3 strings, both languages ---- */
  const loanKeys = Object.keys(i18n.en).filter((k) => k.startsWith("loan."));
  const d3Keys = Object.keys(i18n.en).filter((k) =>
    k.startsWith("loan.") || k.startsWith("fin.loan.") ||
    k.startsWith("fin.ref.loan") || k === "nav.loans");
  check(loanKeys.length === 108 && d3Keys.length === 119,
    `i18n: D3 carries ${d3Keys.length} keys (119 expected: 108 loan.* + 7 fin.loan.* + 3 journal labels + nav.loans)`);
  check(d3Keys.every((k) => typeof i18n.ur[k] === "string" && i18n.ur[k].length > 0),
    "i18n: every D3 key present and non-empty in Urdu (parity)");
  check(Object.keys(i18n.en).length === 3136 && Object.keys(i18n.ur).length === 3136,
    "i18n: the dictionary now carries 3,054 keys, EN ≡ UR (D4: +55 fin.fy keys; D5: +12 fin.export keys; E1 pin amendment: +53 print keys; E2 pin amendment: +37 print.brand keys; E3 pin amendment: +35 Raast keys (34 print.raast + billing.wa.raastLine); E4 pin amendment: +49 pin keys; F5 pin amendment: +1 sync.online key; G1 pin amendment: +8 biz keys; G2 pin amendment: +36 plan keys; G3 pin amendment: +89 platform keys; G4 pin amendment: +47 keys (35 renew.* + 12 platform.*); G6 pin amendment: +25 backup.* keys; H1 pin amendment: +51 loyalty keys; H3 pin amendment: +108 storefront keys; WA pin amendment: +109 WhatsApp keys)");

  /* ---- rules: the additive loans block (§6.2) ---- */
  const rulesD3 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8");
  const d3Seg = rulesD3.slice(
    rulesD3.indexOf("      // Phase D · D3"),
    rulesD3.indexOf("      // Expenses:"));
  check(d3Seg.includes("match /loans/{loanId}") &&
        d3Seg.includes("hasRole(uid, ['owner', 'manager', 'accountant'])") &&
        d3Seg.includes("hasRole(uid, ['owner', 'accountant']) && createInOpenPeriod(uid)") &&
        d3Seg.includes("allow delete: if isBusinessOwner(uid);"),
    "rules: loans — narrowed read (o/m/a), create owner/accountant + period backstop, update o/a, delete owner-only (FR2 same-check amendment: the leg is now isBusinessOwner — uid match OR registry leg — so a generated business's owner deletes exactly as a legacy owner does; staff gain nothing)");
  check(!stripE2BrandingBlock(d3Seg).includes("canAccess(uid)"),
    "rules: loan reads are NARROWED — no canAccess read on loans (loan terms are not counter data) (E2 same-check amendment: the additive branding block — which legitimately reads canAccess, §2.1 — is stripped from the segment first; it is not a loan record)");
  const strippedD3 = stripG1Blocks(stripG2Blocks(rulesD3.slice(0, rulesD3.indexOf("      // Phase D · D3")) +
    rulesD3.slice(rulesD3.indexOf("      // Expenses:"))));
  check(crypto.createHash("sha256").update(strippedD3, "utf8").digest("hex") ===
        "1ee537fd95f2d9316ca0ebd8b9c67eacdf196e26bb0d8a3d894e269e47ab5bbf",
    "rules: stripping the D3 block reproduces the D2-state file byte-for-byte (additive only; G1 same-check amendment: the four G1 spans are stripped first — v9's only other deltas, strip-proven in the G1 suite)");
}

/* ============================ D4 (Phase D · fiscal-year close) ============================ */
suite("D4", null); // Phase D · D4 — fiscal-year close (design §4)
{
  const T = (dateISO, h = 6) =>
    new Date(Date.parse(periods.startOfDayPktInstant(dateISO)) + h * 3600e3).toISOString();
  const E = (memo, refType, dateISO, lines) =>
    ledger.makeEntry(memo, refType, null, lines, { ts: T(dateISO) });
  const L = (account, debit, credit, ref = null) => ({ account, debit, credit, ref });

  const range26 = periods.fiscalYearRange({}, T("2026-02-15"));
  const range27 = periods.fiscalYearRange({}, T("2026-09-15"));
  check(range26.startDate === "2025-07-01" && range26.endDate === "2026-06-30" &&
        range27.startDate === "2026-07-01" && range27.endDate === "2027-06-30",
    "D4 ranges: the default PK fiscal year runs 1 Jul – 30 Jun");
  check(fiscal.fyLabel(range26) === "FY 2025-26" &&
        fiscal.fyLabel(periods.fiscalYearRange(
          { fiscalYearStartMonth: 1, fiscalYearStartDay: 1 }, T("2026-03-01"))) === "FY 2026",
    "D4 label: FY 2025-26 for a July year; a 1-January year is simply FY 2026");

  /* ---- the closing set is the registry's P&L class (§4.3) ---- */
  const plCodes = fiscal.plAccountCodes();
  check(plCodes.length === 11 &&
        ["sales_revenue", "sales_discount", "cogs", "expense_rent", "expense_electricity",
         "expense_salary", "expense_transport", "expense_other", "expense_finance",
         "inventory_loss", "expense_loyalty"].every((c) => plCodes.includes(c)),
    "D4 closing set: exactly the registry's income + contra_income + expense codes (11 — H1 pin amendment: expense_loyalty joins BY TYPE from the registry, the §4.3 derivation itself unchanged)");
  check(!plCodes.includes("purchases") && !plCodes.includes("tax_payable") &&
        !plCodes.includes("tax_input") && !plCodes.includes("retained_earnings") &&
        !plCodes.includes("wip") && !plCodes.includes("capital"),
    "D4 closing set: clearing, tax, equity and balance-sheet accounts are NEVER closed — they carry forward");

  /* ---- the fixture: FY 2025-26 trading + FY 2026-27 start ---- */
  const J = [
    E("Owner capital in", "cashbook", "2025-08-10",
      [L("cash", 500000, 0), L("capital", 0, 500000)]),
    E("Purchase — goods in", "purchase", "2025-09-05",
      [L("purchases", 300000, 0), L("payables", 0, 300000)]),
    E("Purchase — into stock", "purchase", "2025-09-05",
      [L("inventory", 300000, 0), L("purchases", 0, 300000)]),
    E("Sale", "sale", "2025-10-12",
      [L("cash", 395000, 0), L("sales_discount", 5000, 0), L("sales_revenue", 0, 400000)]),
    E("Sale — COGS", "sale", "2025-10-12",
      [L("cogs", 220000, 0), L("inventory", 0, 220000)]),
    E("Rent", "expense", "2025-11-03",
      [L("expense_rent", 60000, 0), L("cash", 0, 60000)]),
    E("Salaries", "expense", "2025-12-08",
      [L("expense_salary", 80000, 0), L("cash", 0, 80000)]),
    E("Electricity", "expense", "2026-01-15",
      [L("expense_electricity", 10000, 0), L("cash", 0, 10000)]),
    E("Bank charges", "expense", "2026-02-20",
      [L("expense_finance", 3000, 0), L("cash", 0, 3000)]),
    E("Stock write-off", "adjustment", "2026-03-11",
      [L("inventory_loss", 2000, 0), L("inventory", 0, 2000)]),
    E("Sales tax collected", "cashbook", "2026-04-05",
      [L("cash", 8000, 0), L("tax_payable", 0, 8000)]),
    E("Production labour accrued", "production_issue", "2026-05-09",
      [L("wip", 4000, 0), L("salary_payable", 0, 4000)]), // ref-less C4 shape
    E("Sale (new FY)", "sale", "2026-08-14",
      [L("cash", 50000, 0), L("sales_revenue", 0, 50000)]),
    E("Sale — COGS (new FY)", "sale", "2026-08-14",
      [L("cogs", 30000, 0), L("inventory", 0, 30000)]),
  ];
  const baseArgs = {
    journal: J, payrollRuns: [], productionOrders: [], cheques: [], products: [],
    range: range26, lockedThrough: "",
  };

  /* ---- the checklist on a clean year (§4.2) ---- */
  const cl = fiscal.fiscalYearCloseChecklist(baseArgs);
  check(cl.hardGatesPass === true && cl.trialBalance.difference === 0 &&
        cl.trialBalance.closingDifference === 0 && cl.purchasesClearing === 0,
    "D4 checklist: a clean year passes both hard gates (TB zero, purchases clearing zero)");
  check(cl.warningIds.length === 0 && cl.draftPayrollRuns === 0 &&
        cl.openProductionOrders === 0,
    "D4 checklist: no warnings on a year with no draft runs and no open production pools");
  check(eq(cl.salary.glBalance, 4000) && eq(cl.salary.unassignedAccrued, 4000) &&
        eq(cl.salary.owedToEmployees, 0),
    "D4 checklist: salary_payable composition at FY end — the ref-less production accrual sits in the unassigned bucket (4,000)");
  check(eq(cl.stockGl, 78000) && eq(cl.stockShelf, 0) && eq(cl.stockDivergence, 78000) &&
        cl.lockCoversFyEnd === false,
    "D4 checklist: stock GL at FY end is 78,000 (300,000 in − 220,000 COGS − 2,000 loss); the shelf divergence and lock state are informational");

  /* ---- hard gate 1: an unbalanced journal blocks (§4.2 #1) ---- */
  const doctored = {
    id: "j-doctored", memo: "hand-doctored", refType: "cashbook", refId: null,
    reversesId: null, dayOffset: 0, ts: T("2026-02-01"),
    lines: [L("cash", 100, 0)], // no credit leg — bypasses makeEntry on purpose
  };
  const clBad = fiscal.fiscalYearCloseChecklist({ ...baseArgs, journal: [...J, doctored] });
  check(clBad.hardGatesPass === false && clBad.trialBalance.difference !== 0 &&
        clBad.items.find((i) => i.id === "trialBalance").triggered === true,
    "D4 gate: a deliberately unbalanced fixture makes the trial-balance gate FAIL — the close is blocked");

  /* ---- hard gate 2: stranded purchases clearing blocks (§4.2 #2) ---- */
  const stranded = E("Purchase — receipt leg missing", "purchase", "2026-02-01",
    [L("purchases", 50000, 0), L("payables", 0, 50000)]);
  const clStranded = fiscal.fiscalYearCloseChecklist({ ...baseArgs, journal: [...J, stranded] });
  check(clStranded.hardGatesPass === false && eq(clStranded.purchasesClearing, 50000) &&
        clStranded.items.find((i) => i.id === "purchasesClearing").triggered === true,
    "D4 gate: a purchase whose inventory leg never landed leaves clearing at 50,000 — the close refuses to bury it in equity");

  /* ---- warnings derive (§4.2 #3/#4) ---- */
  const draftRun = {
    id: "run-draft", number: null, month: "2026-03", lines: [],
    totals: { gross: 0, deductions: 0, netAccrued: 0 }, payments: [],
    accrualEntryId: null, status: "draft", note: "", dayOffset: 0, ts: "",
  };
  const draftRunNextFy = { ...draftRun, id: "run-draft-27", month: "2026-08" };
  const openOrder = {
    id: "po-1", status: "open", plannedQty: 10,
    events: [{ kind: "issue", qty: 0, value: 4000, lines: [], entryId: "x", ts: T("2026-05-09") }],
  };
  const clWarn = fiscal.fiscalYearCloseChecklist({
    ...baseArgs, payrollRuns: [draftRun, draftRunNextFy], productionOrders: [openOrder],
  });
  check(clWarn.draftPayrollRuns === 1 && clWarn.warningIds.includes("draftPayroll") &&
        clWarn.hardGatesPass === true,
    "D4 warnings: a draft run for a month INSIDE the FY warns (next-FY draft does not); warnings never masquerade as gates");
  check(clWarn.openProductionOrders === 1 && eq(clWarn.openProductionPoolTotal, 4000) &&
        clWarn.warningIds.includes("productionPools"),
    "D4 warnings: an open production order's WIP pool (4,000) surfaces as a warning — WIP carries forward legitimately");

  /* ---- the closing entry (§4.3) ---- */
  const plBefore = ledger.profitAndLossInRange(J, range26.fromTs, range26.toTs);
  check(eq(plBefore.revenue, 400000) && eq(plBefore.discounts, 5000) &&
        eq(plBefore.netRevenue, 395000) && eq(plBefore.cogs, 220000) &&
        eq(plBefore.expensesTotal, 150000) && eq(plBefore.stockLoss, 2000) &&
        eq(plBefore.net, 23000),
    "D4 fixture P&L: revenue 400,000 − discounts 5,000 − COGS 220,000 − expenses 150,000 − loss 2,000 = net 23,000");
  const closeEntry = fiscal.buildFiscalClosingEntry(J, range26, "per-d4-1");
  check(!!closeEntry && closeEntry.refType === "fy_close" && closeEntry.refId === "per-d4-1" &&
        ledger.entryBalances(closeEntry) && closeEntry.lines.length === 9,
    "D4 close: ONE fy_close entry citing the periods doc — 8 zeroing lines + the retained-earnings line, balanced by makeEntry");
  check(closeEntry.ts === periods.endOfDayPktInstant("2026-06-30") &&
        periods.businessDateISO(closeEntry.ts) === "2026-06-30",
    "D4 close: the entry is dated the FY's LAST DAY (2026-06-30) — an entry of that year");
  const retainedLine = closeEntry.lines.find((l) => l.account === "retained_earnings");
  check(!!retainedLine && retainedLine.credit === 20000 && retainedLine.debit === 0,
    "D4 close: retained earnings is credited exactly 20,000 (the year's true net incl. 3,000 finance charges the MonthPL shape does not track)");
  const J2 = [...J, closeEntry];
  const inFy26 = (arr) => arr.filter((e) => e.ts >= range26.fromTs && e.ts < range26.toTs);
  check(fiscal.plAccountCodes().every(
          (c) => eq(ledger.accountBalance(inFy26(J2), c), 0)),
    "D4 close: after the entry, EVERY P&L account's FY movement is zero — the year is zeroed, registry-wide");
  check(eq(ledger.accountNormalBalance(J2.filter((e) => e.ts < range26.toTs), "retained_earnings"), 20000) &&
        eq(ledger.accountNormalBalance(J2.filter((e) => e.ts < range26.toTs), "tax_payable"), 8000) &&
        eq(ledger.accountNormalBalance(J2.filter((e) => e.ts < range26.toTs), "salary_payable"), 4000),
    "D4 close: balance-sheet accounts are untouched by the close (tax payable 8,000 and salary payable 4,000 carry forward; retained earnings holds the result)");

  /* ---- §4.6: the three-way P&L identity ---- */
  const plAfter = ledger.profitAndLossInRange(J2, range26.fromTs, range26.toTs);
  check(eq(plAfter.revenue, plBefore.revenue) && eq(plAfter.discounts, plBefore.discounts) &&
        eq(plAfter.netRevenue, plBefore.netRevenue) && eq(plAfter.cogs, plBefore.cogs) &&
        eq(plAfter.grossProfit, plBefore.grossProfit) &&
        eq(plAfter.expensesTotal, plBefore.expensesTotal) &&
        eq(plAfter.stockLoss, plBefore.stockLoss) && eq(plAfter.net, plBefore.net),
    "D4 identity (§4.6): the closed year's P&L — with fy_close entries excluded — reads EXACTLY as before the close, field for field");
  const summary = fiscal.closingEntrySummary(closeEntry);
  const rowOf = (c) => summary.rows.find((r) => r.account === c)?.amount ?? 0;
  check(eq(rowOf("sales_revenue"), plBefore.revenue) && eq(rowOf("sales_discount"), plBefore.discounts) &&
        eq(rowOf("cogs"), plBefore.cogs) && eq(rowOf("inventory_loss"), plBefore.stockLoss) &&
        eq(rowOf("expense_rent"), 60000) && eq(rowOf("expense_salary"), 80000) &&
        eq(summary.net, 20000) && eq(plBefore.net - 3000, summary.net),
    "D4 identity (§4.6): the closing entry's own summary agrees with the P&L on every tracked account, its net (20,000) being the P&L net less the finance charges it alone carries");
  const plMonth = ledger.profitAndLoss(J2, new Date(T("2026-06-15")));
  check(eq(plMonth.revenue, 0) && eq(plMonth.net, 0),
    "D4 identity (§4.6): even the monthly P&L over the close month (June 2026) excludes the closing entry — it is a transfer, not trading");

  /* ---- the trial balance tells the zeroed truth ---- */
  const tbAfter = reports.trialBalance(J2, fiscal.reportRangeOf(range26));
  check(tbAfter.balanced === true && tbAfter.difference === 0 && tbAfter.closingDifference === 0,
    "D4 trial balance after close: still balanced (it does NOT exclude the closing entry)");
  check(tbAfter.rows.filter((r) => fiscal.plAccountCodes().includes(r.account))
          .every((r) => eq(r.closing, 0)) &&
        eq(tbAfter.rows.find((r) => r.account === "retained_earnings")?.closing ?? 0, 20000),
    "D4 trial balance after close: every P&L closing is 0 and retained earnings closes at 20,000");

  /* ---- the new FY starts clean ---- */
  const pl27Before = ledger.profitAndLossInRange(J, range27.fromTs, range27.toTs);
  const pl27After = ledger.profitAndLossInRange(J2, range27.fromTs, range27.toTs);
  check(eq(pl27Before.revenue, 50000) && eq(pl27Before.net, 20000) &&
        eq(pl27After.revenue, 50000) && eq(pl27After.net, 20000),
    "D4 new FY: FY 2026-27's P&L (revenue 50,000, net 20,000) is identical before and after the old year's close — the new year starts clean");

  /* ---- openings are derived, never posted (§4.5) ---- */
  const openings = fiscal.balanceSheetBalances(J2, range27.fromTs);
  const openOf = (c) => openings.find((r) => r.account === c)?.balance ?? 0;
  check(eq(openOf("cash"), 750000) && eq(openOf("capital"), 500000) &&
        eq(openOf("retained_earnings"), 20000) && eq(openOf("payables"), 300000) &&
        eq(openOf("inventory"), 78000) && eq(openOf("wip"), 4000) &&
        openings.every((r) => !fiscal.plAccountCodes().includes(r.account)),
    "D4 openings (§4.5): the next FY's opening balances derive from the continuous journal (cash 750,000 · capital 500,000 · retained 20,000 · inventory 78,000 · WIP 4,000) — no opening entry exists anywhere");

  /* ---- close state, double-close, reopen (§4.3/§4.4) ---- */
  const closeDoc = {
    id: "per-d4-1", kind: "fiscal_year", from: range26.fromTs,
    to: periods.endOfDayPktInstant("2026-06-30"), action: "close",
    byUid: "u1", byEmail: "owner@example.com", ts: T("2026-07-05"),
    note: "", prevLockedThrough: periods.endOfDayPktInstant("2025-12-31"),
    entryId: closeEntry.id, warningsAcked: false,
  };
  check(fiscal.fiscalCloseState(J2, [closeDoc], range26).closed === true &&
        fiscal.fiscalCloseState(J, [], range26).closed === false,
    "D4 state: a closed year is detected from its doc + entry (this is what makes a second close refuse); an untouched year is open");
  const mirror = fiscal.buildFiscalReopenEntry(closeEntry, T("2026-07-06"));
  check(mirror.refType === "fy_close" && mirror.reversesId === closeEntry.id &&
        mirror.lines.find((l) => l.account === "retained_earnings").debit === 20000 &&
        ledger.entryBalances(mirror),
    "D4 reopen: the mirror swaps every line (retained earnings debited back 20,000) and cites the closing entry in reversesId");
  const reopenDoc = {
    id: "per-d4-2", kind: "fiscal_year", from: closeDoc.from, to: closeDoc.to,
    action: "reopen", byUid: "u1", byEmail: "owner@example.com",
    ts: T("2026-07-06"), note: "missed bill", entryId: mirror.id,
    reopensPeriodId: "per-d4-1",
  };
  const J3 = [...J2, mirror];
  check(fiscal.fiscalCloseState(J3, [closeDoc, reopenDoc], range26).closed === false,
    "D4 reopen: after the mirror + reopen doc, the year reads open again (the state the store's double-close guard and re-close both consult)");
  check(fiscal.plAccountCodes().every(
          (c) => eq(ledger.accountNormalBalance(J3, c), ledger.accountNormalBalance(J, c))) &&
        eq(ledger.accountNormalBalance(J3, "retained_earnings"),
           ledger.accountNormalBalance(J, "retained_earnings")),
    "D4 reopen: every P&L balance and retained earnings are restored to the paisa — close + mirror cancel exactly, all-time");
  check(closeDoc.prevLockedThrough === periods.endOfDayPktInstant("2025-12-31"),
    "D4 reopen: the lock restoration target is the close doc's recorded prevLockedThrough — the store restores exactly this value in the reopen batch");

  /* ---- stack discipline (§4.4) ---- */
  const closeEntry27 = fiscal.buildFiscalClosingEntry(J2, range27, "per-d4-3");
  const closeDoc27 = {
    ...closeDoc, id: "per-d4-3", from: range27.fromTs,
    to: periods.endOfDayPktInstant("2027-06-30"), ts: T("2027-07-05"),
    entryId: closeEntry27.id,
  };
  const J4 = [...J2, closeEntry27];
  check(fiscal.fiscalReopenBlocker(J4, [closeDoc, closeDoc27], closeDoc)?.id === "per-d4-3" &&
        fiscal.fiscalReopenBlocker(J4, [closeDoc, closeDoc27], closeDoc27) === null,
    "D4 stack: reopening FY 2025-26 while FY 2026-27 stands closed is BLOCKED by the later close; the latest year itself reopens freely");
  const mirror27 = fiscal.buildFiscalReopenEntry(closeEntry27, T("2027-07-06"));
  const reopenDoc27 = { ...reopenDoc, id: "per-d4-4", reopensPeriodId: "per-d4-3", entryId: mirror27.id };
  check(fiscal.fiscalReopenBlocker([...J4, mirror27], [closeDoc, closeDoc27, reopenDoc27], closeDoc) === null,
    "D4 stack: once the later year is reopened, the earlier year's reopen unblocks — closes unwind in reverse order only");

  /* ---- period-lock interplay (§4.3 ordering + §7) ---- */
  let lockedThrew = false;
  try {
    periods.preparePosting({ ...closeEntry }, periods.endOfDayPktInstant("2026-08-31"));
  } catch (e) { lockedThrew = periods.isPeriodLockedError(e); }
  check(lockedThrew,
    "D4 lock: a closing entry dated inside an ALREADY-locked period is refused by the real guard (the close composes against the pre-close lock)");
  const admitted = periods.preparePosting(
    { ...closeEntry, dateISO: undefined },
    periods.endOfDayPktInstant("2025-12-31"));
  check(admitted.dateISO === "2026-06-30",
    "D4 lock: against a lock reaching only mid-year, the same entry is admitted and stamps dateISO = the FY's last day");
  let postCloseThrew = false;
  try {
    periods.preparePosting(
      ledger.makeEntry("late bill", "sale", null,
        [L("cash", 100, 0), L("sales_revenue", 0, 100)], { ts: T("2026-03-01") }),
      periods.endOfDayPktInstant("2026-06-30"));
  } catch (e) { postCloseThrew = periods.isPeriodLockedError(e); }
  check(postCloseThrew,
    "D4 lock: after the close advances the lock to the FY end, an ordinary posting dated inside the closed year refuses — the lock does its job");

  /* ---- the zero-movement year: no entry, still a close (§4.3) ---- */
  const range24 = periods.fiscalYearRange({}, T("2025-02-15"));
  check(fiscal.buildFiscalClosingEntry(J, range24, "per-d4-9") === null,
    "D4 zero year: an FY with no P&L movement composes NO entry (nothing to zero) — the close is its doc + lock only");
  const zeroDoc = {
    ...closeDoc, id: "per-d4-9", from: range24.fromTs,
    to: periods.endOfDayPktInstant("2025-06-30"), entryId: null,
  };
  check(fiscal.fiscalCloseState(J, [zeroDoc], range24).closed === true &&
        fiscal.fiscalCloseState(J, [zeroDoc, { ...reopenDoc, id: "per-d4-10", reopensPeriodId: "per-d4-9" }], range24).closed === false,
    "D4 zero year: its close state rides the DOCS alone (entryId null), and a citing reopen doc opens it again");

  /* ---- a loss year debits retained earnings (§4.3) ---- */
  const JL = [
    E("Sale", "sale", "2025-09-01", [L("cash", 10000, 0), L("sales_revenue", 0, 10000)]),
    E("Rent", "expense", "2025-10-01", [L("expense_rent", 15000, 0), L("cash", 0, 15000)]),
  ];
  const lossEntry = fiscal.buildFiscalClosingEntry(JL, range26, "per-d4-7");
  const lossRetained = lossEntry.lines.find((l) => l.account === "retained_earnings");
  check(!!lossEntry && lossRetained.debit === 5000 && lossRetained.credit === 0 &&
        ledger.entryBalances(lossEntry) &&
        eq(fiscal.closingEntrySummary(lossEntry).net, -5000),
    "D4 loss year: retained earnings is DEBITED the 5,000 loss and the entry still balances; the summary reports net −5,000");

  /* ---- i18n: the D4 strings, both languages ---- */
  const fyKeys = Object.keys(i18n.en).filter((k) => k.startsWith("fin.fy."));
  check(fyKeys.length === 59 && fyKeys.every((k) => typeof i18n.ur[k] === "string" && i18n.ur[k].length > 0),
    `i18n: D4 carries ${fyKeys.length} fin.fy.* keys (59 expected — 55 at D4; Fix Round 1 · F5 amendment: +4 fin.fy.openStock.* keys), each present and non-empty in Urdu`);
  check(Object.keys(i18n.en).length === 3136 && Object.keys(i18n.ur).length === 3136,
    "i18n: the dictionary now carries 3,054 keys, EN ≡ UR (E1 pin amendment: +53 print keys; E2 pin amendment: +37 print.brand keys; E3 pin amendment: +35 Raast keys (34 print.raast + billing.wa.raastLine); E4 pin amendment: +49 pin keys; F5 pin amendment: +1 sync.online key; G1 pin amendment: +8 biz keys; G2 pin amendment: +36 plan keys; G3 pin amendment: +89 platform keys; G4 pin amendment: +47 keys (35 renew.* + 12 platform.*); G6 pin amendment: +25 backup.* keys; H1 pin amendment: +51 loyalty keys; H3 pin amendment: +108 storefront keys; WA pin amendment: +109 WhatsApp keys)");

  /* ---- source invariants: the store wiring ---- */
  const storeSrcD4 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx", "utf8");
  check((storeSrcD4.match(/makeEntry\(/g) || []).length === 24,
    "source: still 24 makeEntry calls in the store — D4's closing and mirror entries compose in lib/fiscal + lib/payroll, no new inline posting path");
  check((storeSrcD4.match(/can\(roleRef\.current, "fiscalClose", "write"\)/g) || []).length === 3 &&
        storeSrcD4.includes("buildFiscalClosingEntry") &&
        storeSrcD4.includes("buildOpeningStockEntry") &&
        storeSrcD4.includes("fiscalYearCloseChecklist") &&
        storeSrcD4.includes("lockedThrough: restored"),
    "source: both FY actions are owner-gated on the fiscalClose row and compose through lib/fiscal; the reopen restores the recorded lock in its batch (Fix Round 1 · F5 amendment: a THIRD gate on the same row — postOpeningStock, composing through lib/fiscal's buildOpeningStockEntry)");

  /* ---- rules: §4 needs NO change — byte-identical, asserted ---- */
  const rulesD4 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8");
  check(crypto.createHash("sha256").update(stripE2BrandingBlock(stripG1Blocks(stripG2Blocks(rulesD4))), "utf8").digest("hex") ===
        "3cae3c7641955ab4fda07aa21b404fc9274e1bd49dc2aabeb96269fefad1942c",
    "rules: the D4 claim verified — the close rides the existing journal-create guard + owner-doc writes, so the rules file is byte-identical to the D3-state file (E2 same-check amendment: the additive branding block is stripped first — E2's only rules change, strip-proven in the E2 suite; G1 same-check amendment: the four G1 spans are stripped first — v9's only other deltas, strip-proven in the G1 suite)");

  /* ---- seed / legacy regression: a shop that never closes ---- */
  check(journal.length === 21 && !journal.some((e) => e.refType === "fy_close") &&
        eq(ledger.accountBalance(journal, "inventory"), 272805) &&
        eq(ledger.cashBalance(journal), 50000) &&
        eq(ledger.payablesTotal(journal), 27900) &&
        eq(ledger.receivablesTotal(journal), 5500),
    "seed regression: the frozen identities stand and the seed carries no fy_close entry — the P&L exclusion is a no-op for shops that never close");
}

/* =============================== D5 =============================== */
suite("D5", null); // Phase D · D5 — Tally export + journal CSV (design §5)
{
  const T = (dateISO, h = 6) =>
    new Date(Date.parse(periods.startOfDayPktInstant(dateISO)) + h * 3600e3).toISOString();
  const E = (memo, refType, dateISO, lines, refId = null) =>
    ledger.makeEntry(memo, refType, refId, lines, { ts: T(dateISO) });
  const L = (account, debit, credit, ref = null) => ({ account, debit, credit, ref });

  const parties = {
    customers: [
      { id: "cust-1", name: "Haji Muhammad Saleem", phone: "0300-1", address: "", note: "", ts: "" },
      { id: "cust-2", name: "Haji Muhammad Saleem", phone: "0300-2", address: "", note: "", ts: "" },
    ],
    suppliers: [
      { id: "sup-1", name: "Malik Traders", phone: "", company: "", notes: "", ts: "" },
    ],
    employees: [
      { id: "emp-1", name: "Ahmed Raza", phone: "", designation: "Salesman", linkedUserEmail: null, joinDateISO: null, payBasis: "monthly", baseAmount: 30000, allowances: [], paidLeaveDays: 0, active: true, note: "", ts: "" },
    ],
    accounts: [
      { id: "acct-till", name: "Main Till", kind: "cash", method: "cash", legacyFor: "cash", archived: false, sortOrder: 0, ts: "" },
    ],
    docNumbers: new Map([
      ["bill-0", "5"], ["bill-1", "6"], ["pay-1", "PV-1"], ["run-1", "PAY-1"], ["loan-1", "LN-1"],
    ]),
  };
  const settings = { shopName: "Madina General Store" };

  /* ---- §5.2: every COA code maps; groups are Tally's own ---- */
  check(coa.ACCOUNT_CODES.length === 30 &&
        coa.ACCOUNT_CODES.every((c) =>
          tally.TALLY_LEDGER_MAP[c] &&
          typeof tally.TALLY_LEDGER_MAP[c].name === "string" && tally.TALLY_LEDGER_MAP[c].name.length > 0 &&
          typeof tally.TALLY_LEDGER_MAP[c].group === "string" && tally.TALLY_LEDGER_MAP[c].group.length > 0),
    "mapping: all 28 COA codes carry a Tally ledger name + group — no unmapped code");
  check(tally.TALLY_LEDGER_MAP.cash.name === "Cash" && tally.TALLY_LEDGER_MAP.cash.group === "Cash-in-Hand" &&
        tally.TALLY_LEDGER_MAP.wallet.group === "Bank Accounts" &&
        tally.TALLY_LEDGER_MAP.receivables.name === "Sundry Debtors — Control" &&
        tally.TALLY_LEDGER_MAP.receivables.group === "Sundry Debtors" &&
        tally.TALLY_LEDGER_MAP.payables.group === "Sundry Creditors" &&
        tally.TALLY_LEDGER_MAP.loans_receivable.name === "Loans Receivable" &&
        tally.TALLY_LEDGER_MAP.loans_receivable.group === "Loans & Advances (Asset)" &&
        tally.TALLY_LEDGER_MAP.loans_payable.group === "Loans (Liability)" &&
        tally.TALLY_LEDGER_MAP.retained_earnings.group === "Reserves & Surplus" &&
        tally.TALLY_LEDGER_MAP.sales_discount.group === "Sales Accounts" &&
        tally.TALLY_LEDGER_MAP.cogs.group === "Direct Expenses" &&
        tally.TALLY_LEDGER_MAP.expense_finance.name === "Finance Charges" &&
        tally.TALLY_LEDGER_MAP.expense_finance.group === "Indirect Expenses" &&
        tally.TALLY_LEDGER_MAP.tax_payable.group === "Duties & Taxes" &&
        tally.TALLY_LEDGER_MAP.salary_payable.group === "Current Liabilities",
    "mapping: the §5.2 table's names + predefined groups are verbatim");

  /* ---- name overrides move names only, never groups ---- */
  const overridden = { shopName: "X", tallyLedgerNames: { sales_revenue: "Sales A/c", cash: "  " } };
  check(tally.tallyLedgerName("sales_revenue", overridden) === "Sales A/c" &&
        tally.tallyLedgerName("cash", overridden) === "Cash" &&
        tally.TALLY_LEDGER_MAP.sales_revenue.group === "Sales Accounts",
    "overrides: tallyLedgerNames renames a ledger (blank overrides ignored); its group is untouched");

  /* ---- §5.3: the full refType → voucher-type table ---- */
  const ALL_REFTYPES = [
    "sale", "bill", "bill_void", "return", "purchase", "supplier_payment",
    "expense", "expense_reversal", "credit", "repayment", "adjustment",
    "cashbook", "seed", "transfer", "tax_payment", "purchase_return",
    "cheque_clearing", "cheque_bounce", "cheque_return", "transfer_loss",
    "reclass", "production_issue", "production_complete", "production_scrap",
    "job_material", "job_material_return", "payroll_accrual", "payroll_payment",
    "salary_advance", "loan_drawdown", "loan_charge", "loan_repayment", "fy_close",
  ];
  const VCH_TYPES = ["Sales", "Purchase", "Payment", "Receipt", "Contra", "Journal", "Debit Note", "Credit Note"];
  check(ALL_REFTYPES.length === 33 &&
        ALL_REFTYPES.every((rt) =>
          VCH_TYPES.includes(tally.tallyVoucherType(rt, "payable")) &&
          VCH_TYPES.includes(tally.tallyVoucherType(rt, "receivable"))),
    "voucher types: every one of the 33 postable refTypes maps to a Tally voucher type in both directions");
  check(tally.tallyVoucherType("bill") === "Sales" && tally.tallyVoucherType("sale") === "Sales" &&
        tally.tallyVoucherType("purchase") === "Purchase" &&
        tally.tallyVoucherType("return") === "Credit Note" &&
        tally.tallyVoucherType("purchase_return") === "Debit Note" &&
        tally.tallyVoucherType("supplier_payment") === "Payment" &&
        tally.tallyVoucherType("expense") === "Payment" &&
        tally.tallyVoucherType("expense_reversal") === "Payment" &&
        tally.tallyVoucherType("payroll_payment") === "Payment" &&
        tally.tallyVoucherType("salary_advance") === "Payment" &&
        tally.tallyVoucherType("repayment") === "Receipt" &&
        tally.tallyVoucherType("credit") === "Receipt" &&
        tally.tallyVoucherType("transfer") === "Contra" &&
        tally.tallyVoucherType("tax_payment") === "Journal" &&
        tally.tallyVoucherType("cheque_bounce") === "Journal" &&
        tally.tallyVoucherType("payroll_accrual") === "Journal" &&
        tally.tallyVoucherType("loan_charge") === "Journal" &&
        tally.tallyVoucherType("fy_close") === "Journal" &&
        tally.tallyVoucherType("adjustment") === "Journal" &&
        tally.tallyVoucherType("seed") === "Journal",
    "voucher types: the §5.3 fixed table is exact (Sales/Purchase/Credit Note/Debit Note/Payment/Receipt/Contra/Journal catch-all)");
  check(tally.tallyVoucherType("loan_drawdown", "payable") === "Contra" &&
        tally.tallyVoucherType("loan_drawdown", "receivable") === "Receipt" &&
        tally.tallyVoucherType("loan_repayment", "payable") === "Payment" &&
        tally.tallyVoucherType("loan_repayment", "receivable") === "Receipt" &&
        tally.tallyVoucherType("loan_drawdown") === "Contra",
    "voucher types: the loan refTypes are directional — drawdown payable Contra / receivable Receipt; repayment payable Payment / receivable Receipt");
  {
    const ddP = E("Loan in", "loan_drawdown", "2026-07-10",
      [L("cash", 1000, 0), L("loans_payable", 0, 1000, "loan-1")]);
    const ddR = E("Loan out", "loan_drawdown", "2026-07-10",
      [L("loans_receivable", 1000, 0, "loan-2"), L("cash", 0, 1000)]);
    const rpR = E("Loan back", "loan_repayment", "2026-07-11",
      [L("cash", 400, 0), L("loans_receivable", 0, 400, "loan-2")]);
    check(tally.voucherTypeForEntry(ddP) === "Contra" &&
          tally.voucherTypeForEntry(ddR) === "Receipt" &&
          tally.voucherTypeForEntry(rpR) === "Receipt" &&
          tally.loanDirectionOf(ddP) === "payable" && tally.loanDirectionOf(rpR) === "receivable",
      "voucher types: an entry's loan direction derives from its own loan-account lines — no register lookup");
  }

  /* ---- the fixture journal: June (pre-range) + July (the range) ---- */
  const nastyMemo = 'Rent, "shop" & <main> — کرایہ';
  const J = [
    E("Owner capital in", "cashbook", "2026-06-05",
      [L("cash", 200000, 0, "acct-till"), L("capital", 0, 200000)]),
    E("Purchase — goods in", "purchase", "2026-06-10",
      [L("purchases", 40000, 0), L("payables", 0, 40000, "sup-1")]),
    E("Purchase — into stock", "purchase", "2026-06-10",
      [L("inventory", 40000, 0), L("purchases", 0, 40000)]),
    E("Bill #5", "bill", "2026-06-20",
      [L("cash", 5000, 0, "acct-till"), L("sales_revenue", 0, 5000)], "bill-0"),
    E("Bill #6", "bill", "2026-07-03",
      [L("cash", 10000, 0, "acct-till"), L("receivables", 15000, 0, "cust-1"), L("sales_revenue", 0, 25000)], "bill-1"),
    E("Repayment — Haji Muhammad Saleem", "repayment", "2026-07-05",
      [L("cash", 5000, 0, "acct-till"), L("receivables", 0, 5000, "cust-1")], "cred-1"),
    E("Payment — Malik Traders", "supplier_payment", "2026-07-06",
      [L("payables", 20000, 0, "sup-1"), L("cash", 0, 20000, "acct-till")], "pay-1"),
    E("Return — Bill #6", "return", "2026-07-08",
      [L("sales_revenue", 2000, 0), L("cash", 0, 2000, "acct-till")], "bill-1"),
    E("Loan drawdown LN-1", "loan_drawdown", "2026-07-10",
      [L("cash", 100000, 0, "acct-till"), L("loans_payable", 0, 100000, "loan-1")], "loan-1"),
    E(nastyMemo, "expense", "2026-07-15",
      [L("expense_rent", 12000, 0), L("cash", 0, 12000, "acct-till")]),
    E("Loan repayment LN-1", "loan_repayment", "2026-07-20",
      [L("loans_payable", 10000, 0, "loan-1"), L("cash", 0, 10000, "acct-till")], "loan-1"),
    E("Payroll accrual PAY-1", "payroll_accrual", "2026-07-31",
      [L("expense_salary", 30000, 0), L("salary_payable", 0, 30000, "emp-1")], "run-1"),
  ];
  const range = reports.resolveReportRange("custom", null, { from: "2026-07-01", to: "2026-07-31" });
  const model = tally.buildTallyExport(J, parties, settings, range);
  const tb = reports.trialBalance(J, range);
  const masterByName = new Map(model.masters.map((m) => [m.name, m]));

  check(model.vouchers.length === 8,
    "model: one voucher per in-range entry (8 July entries; the 4 June entries stay out)");
  check(model.vouchers.every((v) => eq(v.debitTotal, v.creditTotal)),
    "model: every voucher balances in our terms (ΣDr == ΣCr) before the Tally sign conversion");
  check(eq(model.totalDebits, tb.totalDebits) && eq(model.totalCredits, tb.totalCredits) && eq(tb.difference, 0),
    "model: the export's aggregate totals equal the period trial balance exactly");
  check(model.company === "Madina General Store" && model.fromDate === "2026-07-01" && model.toDate === "2026-07-31",
    "model: the company name rides from settings; the range echoes the requested period");

  /* ---- party ledgers vs control ledgers ---- */
  check(masterByName.has("Haji Muhammad Saleem") && masterByName.get("Haji Muhammad Saleem").group === "Sundry Debtors" &&
        masterByName.has("Malik Traders") && masterByName.get("Malik Traders").group === "Sundry Creditors" &&
        masterByName.has("Ahmed Raza") && masterByName.get("Ahmed Raza").group === "Current Liabilities",
    "party ledgers: ref'd receivables/payables/salary lines mint per-party ledgers under the mapped groups");
  check(!masterByName.has("Sundry Debtors — Control") && !masterByName.has("Sundry Creditors — Control") &&
        !masterByName.has("Salary Payable"),
    "party ledgers: when every receivables/payables/salary line is ref'd, the control and account masters for those accounts never appear — the party ledgers carry the whole truth");
  {
    const billV = model.vouchers.find((v) => v.number === "6");
    const recLine = billV.lines.find((l) => l.ledgerName === "Haji Muhammad Saleem");
    const cashLine = billV.lines.find((l) => l.ledgerName === "Cash");
    check(!!recLine && eq(recLine.debit, 15000) && recLine.isDeemedPositive && eq(recLine.amount, -15000) &&
          !!cashLine && eq(cashLine.amount, -10000) &&
          billV.type === "Sales" && billV.date === "20260703" && billV.dateISO === "2026-07-03",
      "vouchers: the bill's receivable leg lands on the customer's own ledger; Tally amounts are negative for debits (deemed positive), the date is YYYYMMDD");
    const salesLine = billV.lines.find((l) => l.ledgerName === "Sales");
    check(!!salesLine && !salesLine.isDeemedPositive && eq(salesLine.amount, 25000),
      "vouchers: a credit line is not deemed positive and its Tally amount is positive");
  }
  check(model.vouchers.find((v) => v.entryId === J[5].id).number === null &&
        model.vouchers.find((v) => v.type === "Contra").number === "LN-1" &&
        model.vouchers.find((v) => v.type === "Journal" && v.narration.startsWith("Payroll")).number === "PAY-1" &&
        model.vouchers.filter((v) => v.type === "Payment").some((v) => v.number === "PV-1") &&
        model.vouchers.some((v) => v.type === "Credit Note") &&
        model.vouchers.some((v) => v.type === "Receipt"),
    "voucher numbers: the cited documents' numbers ride (bill 6, PV-1, PAY-1, LN-1); an unmapped refId exports unnumbered; types follow the entries");

  /* ---- opening balances: derived in-file for a mid-journal range ---- */
  check(eq(masterByName.get("Cash").openingBalance, -205000) &&
        eq(masterByName.get("Owner Capital").openingBalance, 200000) &&
        eq(masterByName.get("Malik Traders").openingBalance, 40000) &&
        eq(masterByName.get("Stock — Goods").openingBalance, -40000) &&
        eq(masterByName.get("Sales").openingBalance, 5000) &&
        eq(masterByName.get("Loans Payable").openingBalance, 0),
    "openings: each ledger's pre-range balance is derived per ledger (party-aware) in Tally's sign convention (debit negative)");
  {
    // The openings + in-range movement must reproduce the closing truth.
    const tbAll = reports.trialBalance(J, reports.resolveReportRange("custom", null, { from: "2026-06-01", to: "2026-07-31" }));
    check(eq(tbAll.closingDifference, 0) &&
          eq(sum(model.masters.map((m) => m.openingBalance)) +
             (model.totalCredits - model.totalDebits), 0),
      "openings: Σ openings netted against the period's movement stays zero — the file's books balance end to end");
    const fullModel = tally.buildTallyExport(J, parties, settings,
      reports.resolveReportRange("custom", null, { from: "2026-06-01", to: "2026-07-31" }));
    check(fullModel.masters.every((m) => m.openingBalance === 0) && fullModel.vouchers.length === 12,
      "openings: a range starting at the journal's first entry emits NO opening balances (they are manufactured per export, never stored)");
  }

  /* ---- overrides flow into the file ---- */
  {
    const m2 = tally.buildTallyExport(J, parties,
      { shopName: "Madina General Store", tallyLedgerNames: { sales_revenue: "Sales A/c" } }, range);
    check(m2.masters.some((m) => m.name === "Sales A/c" && m.group === "Sales Accounts") &&
          !m2.masters.some((m) => m.name === "Sales") &&
          m2.vouchers.every((v) => v.lines.every((l) => l.ledgerName !== "Sales")),
      "overrides: a renamed ledger is used by masters AND voucher lines alike; the group stays Sales Accounts");
  }

  /* ---- same-name parties never merge ---- */
  {
    const clash = [
      E("Sale A", "bill", "2026-07-02",
        [L("receivables", 100, 0, "cust-1"), L("sales_revenue", 0, 100)]),
      E("Sale B", "bill", "2026-07-03",
        [L("receivables", 200, 0, "cust-2"), L("sales_revenue", 0, 200)]),
    ];
    const cm = tally.buildTallyExport(clash, parties, settings, range);
    const names = cm.masters.filter((m) => m.isParty).map((m) => m.name);
    check(names.length === 2 && names.includes("Haji Muhammad Saleem") && names.includes("Haji Muhammad Saleem (2)"),
      "party ledgers: two parties sharing a name get distinct Tally ledgers (clean name + suffixed), never a silent merge");
  }

  /* ---- the XML: well-formed, escaped, reconciled ---- */
  function xmlWellFormed(xml) {
    const stack = [];
    const re = /<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*?>/g;
    let m, last = 0;
    while ((m = re.exec(xml))) {
      if (/[<>]/.test(xml.slice(last, m.index))) return false;
      last = m.index + m[0].length;
      const tag = m[0];
      if (tag.startsWith("<?") || tag.startsWith("<!--")) continue;
      if (tag.endsWith("/>")) continue;
      if (tag.startsWith("</")) {
        if (stack.pop() !== tag.slice(2, -1).trim()) return false;
      } else stack.push(tag.slice(1).split(/[\s>]/)[0]);
    }
    return stack.length === 0 && !/[<>]/.test(xml.slice(last));
  }
  const xml = tally.tallyXML(J, parties, settings, range);
  check(xmlWellFormed(xml) && xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'),
    "XML: the generated file is well-formed (balanced tags, no stray angle brackets in text)");
  check((xml.match(/<VOUCHER /g) || []).length === 8 &&
        (xml.match(/<LEDGER /g) || []).length === model.masters.length &&
        xml.includes("<SVCURRENTCOMPANY>Madina General Store</SVCURRENTCOMPANY>") &&
        xml.includes("<OPENINGBALANCE>-205000.00</OPENINGBALANCE>") &&
        !xml.includes("<OPENINGBALANCE>0.00</OPENINGBALANCE>"),
    "XML: one TALLYMESSAGE per master and per voucher; the company rides in SVCURRENTCOMPANY; zero openings are omitted, real ones print signed");
  check(xml.includes("Rent, &quot;shop&quot; &amp; &lt;main&gt; — کرایہ") && !xml.includes("<main>"),
    "XML: memos are escaped (&, <, >, quotes) while Urdu text passes through as UTF-8");
  {
    const blocks = xml.split("<VOUCHER ").slice(1).map((s) => s.split("</VOUCHER>")[0]);
    let aggDr = 0, aggCr = 0, perVoucherOk = blocks.length === 8;
    for (const b of blocks) {
      let dr = 0, cr = 0;
      for (const mm of b.matchAll(/<ALLLEDGERENTRIES\.LIST>([\s\S]*?)<\/ALLLEDGERENTRIES\.LIST>/g)) {
        const inner = mm[1];
        const deemed = /<ISDEEMEDPOSITIVE>(\w+)<\/ISDEEMEDPOSITIVE>/.exec(inner)[1] === "Yes";
        const amount = parseFloat(/<AMOUNT>(-?[\d.]+)<\/AMOUNT>/.exec(inner)[1]);
        if (deemed) dr += -amount; else cr += amount;
      }
      if (!eq(dr, cr)) perVoucherOk = false;
      aggDr += dr; aggCr += cr;
    }
    check(perVoucherOk && eq(aggDr, tb.totalDebits) && eq(aggCr, tb.totalCredits),
      "XML: re-parsing the FILE reconciles — every voucher's deemed-positive total equals its credit total, and the file's aggregate equals the trial balance");
  }
  check(tally.tallyXML(J, parties, settings, range) === xml,
    "XML: the exporter is deterministic — identical inputs render byte-identical files");

  /* ---- fy_close: the voucher number is the FY label (§6.3) ---- */
  {
    const close = E("FY close", "fy_close", "2026-06-30",
      [L("sales_revenue", 100, 0), L("retained_earnings", 0, 100)], "periods-doc-1");
    check(tally.voucherNumberFor(close, parties, settings) === "FY 2025-26" &&
          tally.voucherTypeForEntry(close) === "Journal",
      "fy_close: its voucher number is the fiscal-year label (FY 2025-26), not a series number");
  }

  /* ---- the journal CSV ---- */
  const csv = tally.journalCSV(J, parties, settings, range);
  const parsed = csvLib.parseCSV(csv);
  const inRangeLines = J.filter((e) => reports.inRange(e.ts, range))
    .reduce((n, e) => n + e.lines.length, 0);
  check(csv.split("\n")[0] === tally.JOURNAL_CSV_HEADERS.join(",") &&
        parsed.length === inRangeLines && inRangeLines === 17,
    "CSV: the header is the design's eight columns and the row count equals the period's journal-line count (17)");
  {
    const nasty = parsed.find((r) => r.narration === nastyMemo);
    const billRows = parsed.filter((r) => r["voucher no"] === "6" && r.type === "Sales");
    check(!!nasty && nasty.account === "Rent" && eq(parseFloat(nasty.debit), 12000),
      "CSV: a memo carrying commas, quotes and Urdu round-trips through the house parser byte-exact");
    check(billRows.length === 3 &&
          billRows.some((r) => r.account === "Haji Muhammad Saleem" && r["party/ref"] === "Haji Muhammad Saleem") &&
          billRows.some((r) => r.account === "Cash" && r["party/ref"] === "Main Till") &&
          billRows.every((r) => r.type === "Sales" && r.date === "2026-07-03"),
      "CSV: rows carry the same ledger naming as the XML (party ledger for the receivable leg, bucket ledger for cash), the money account in Party/Ref, the voucher type and the business date");
    check(eq(sum(parsed.map((r) => parseFloat(r.debit || "0"))), tb.totalDebits) &&
          eq(sum(parsed.map((r) => parseFloat(r.credit || "0"))), tb.totalCredits),
      "CSV: the flat rows sum to the trial balance — the fallback loses nothing");
  }
  {
    const emptyRange = reports.resolveReportRange("custom", null, { from: "2024-01-01", to: "2024-01-31" });
    const emptyModel = tally.buildTallyExport(J, parties, settings, emptyRange);
    check(emptyModel.vouchers.length === 0 &&
          tally.journalCSV(J, parties, settings, emptyRange) === tally.JOURNAL_CSV_HEADERS.join(",") &&
          xmlWellFormed(tally.tallyXML(J, parties, settings, emptyRange)),
      "empty range: no vouchers, a header-only CSV, and a still-well-formed XML envelope");
  }

  /* ---- the seed journal exports whole; frozen identities stand ---- */
  {
    const seedParties = {
      customers: seed.getSeedCustomers(),
      suppliers: seed.getSeedSuppliers(),
      employees: seed.getSeedEmployees(),
      accounts,
    };
    const seedSettings = seed.getSeedSettings();
    const allRange = reports.resolveReportRange("custom", null, { from: "2000-01-01", to: "2100-12-31" });
    const sm = tally.buildTallyExport(journal, seedParties, seedSettings, allRange);
    const stb = reports.trialBalance(journal, allRange);
    check(journal.length === 21 && sm.vouchers.length === 21 &&
          sm.vouchers.every((v) => eq(v.debitTotal, v.creditTotal)) &&
          eq(sm.totalDebits, stb.totalDebits) && eq(sm.totalCredits, stb.totalCredits) &&
          sm.masters.every((m) => m.openingBalance === 0),
      "seed: all 21 seed entries export as balanced vouchers reconciling to the seed trial balance, with no manufactured openings");
    check(xmlWellFormed(tally.tallyXML(journal, seedParties, seedSettings, allRange)),
      "seed: the full seed journal renders as well-formed Tally XML");
  }

  /* ---- i18n: the D5 export keys ---- */
  const d5Keys = [
    "fin.export.tallyTitle", "fin.export.range", "fin.export.lastFiscal", "fin.export.all",
    "fin.export.count", "fin.export.tally", "fin.export.journalCsv", "fin.export.empty",
    "fin.export.tallyNote", "fin.export.ledgerNames", "fin.export.ledgerNamesCaption",
    "fin.export.ledgerSaved",
  ];
  check(d5Keys.length === 12 &&
        d5Keys.every((k) => typeof i18n.en[k] === "string" && i18n.en[k].length > 0 &&
                           typeof i18n.ur[k] === "string" && i18n.ur[k].length > 0),
    "i18n: the 12 new D5 fin.export.* keys are present and non-empty in both languages (parity)");
  check(Object.keys(i18n.en).length === 3136 && Object.keys(i18n.ur).length === 3136,
    "i18n: the dictionary now carries 3,054 keys, EN ≡ UR (D5: +12 fin.export keys; E1 pin amendment: +53 print keys; E2 pin amendment: +37 print.brand keys; E3 pin amendment: +35 Raast keys (34 print.raast + billing.wa.raastLine); E4 pin amendment: +49 pin keys; F5 pin amendment: +1 sync.online key; G1 pin amendment: +8 biz keys; G2 pin amendment: +36 plan keys; G3 pin amendment: +89 platform keys; G4 pin amendment: +47 keys (35 renew.* + 12 platform.*); G6 pin amendment: +25 backup.* keys; H1 pin amendment: +51 loyalty keys; H3 pin amendment: +108 storefront keys; WA pin amendment: +109 WhatsApp keys)");

  /* ---- source invariants: purity + wiring ---- */
  const tallySrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/lib/tally.ts", "utf8");
  check(!/writeBatch|guardPostings|setDoc|updateDoc|addDoc|deleteDoc/.test(tallySrc) &&
        tallySrc.includes("TALLY_LEDGER_MAP") && tallySrc.includes("buildTallyExport"),
    "source: lib/tally is a pure renderer — no store-write or posting call exists in it");
  const finSrcD5 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/FinanceView.tsx", "utf8");
  const repSrcD5 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/ReportsView.tsx", "utf8");
  const setSrcD5 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/SettingsView.tsx", "utf8");
  const storeSrcD5 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx", "utf8");
  check(finSrcD5.includes("ExportsPanel") && repSrcD5.includes("TallyExportButtons") &&
        setSrcD5.includes("tallyLedgerNames") &&
        (storeSrcD5.match(/makeEntry\(/g) || []).length === 24,
    "source: Finance hosts the export panel, Reports' trial balance hosts the same actions, Settings edits tallyLedgerNames; still 24 makeEntry calls in the store");

  /* ---- rules: D5 needs NO change — byte-identical, asserted ---- */
  const rulesD5 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8");
  check(crypto.createHash("sha256").update(stripE2BrandingBlock(stripG1Blocks(stripG2Blocks(rulesD5))), "utf8").digest("hex") ===
        "3cae3c7641955ab4fda07aa21b404fc9274e1bd49dc2aabeb96269fefad1942c",
    "rules: exports read only the already-readable journal — the rules file is byte-identical to the D3/D4-state file (E2 same-check amendment: the additive branding block is stripped first — E2's only rules change, strip-proven in the E2 suite; G1 same-check amendment: the four G1 spans are stripped first — v9's only other deltas, strip-proven in the G1 suite)");

  /* ---- seed regression: exporting changes nothing ---- */
  check(journal.length === 21 &&
        eq(ledger.accountBalance(journal, "inventory"), 272805) &&
        eq(ledger.cashBalance(journal), 50000) &&
        eq(ledger.payablesTotal(journal), 27900) &&
        eq(ledger.receivablesTotal(journal), 5500),
    "seed regression: the frozen identities stand — the exporter derived everything and stored nothing");
}

/* =============================== E1 =============================== */
suite("E1", null); // Phase E · E1 — print design foundation + invoice designer (design §1)
{
  const R = (pd) => print.resolvePrintDesign(pd ? { printDesign: pd } : {});
  const DEF = R(null);

  /* ---- §1.2: the resolver — defaults ARE today's rendering ---- */
  let defOk = true;
  try {
    assert.deepStrictEqual(DEF, {
      paper: "a4", fontScale: "standard", showLogo: false, logoSize: "m",
      showShopName: true, showShopNameAlt: true, showAddress: true, showPhone: true,
      colSku: false, colUrduName: false, colTax: false, colDiscount: false,
      footerNote: "", termsText: "", showThanks: true, thanksText: "",
      showSignature: false, headerMode: "text", showLetterheadFooter: false,
      stampMode: "paid",
      stampDocs: { notes: false, vouchers: false, quotations: false },
      signDocs: { vouchers: true, salarySlips: true, bills: false },
      showRaastQr: false, raastQrSize: "m", raastDynamic: true,
    });
  } catch { defOk = false; }
  check(defOk,
    "resolver: an absent printDesign resolves to the pinned default snapshot — classic A4, every identity line on, every E1 column/stamp/signature novelty off except the voucher + salary-slip signature lines that always printed");
  check(JSON.stringify(R({})) === JSON.stringify(DEF) &&
        JSON.stringify(print.resolvePrintDesign({ shopName: "X" })) === JSON.stringify(DEF),
    "resolver: an empty design (the designer's Reset state) is absence-equivalent — the single seam makes {} and missing indistinguishable");

  const sweeps = [
    [{ paper: "a5" }, "paper", "a5"], [{ paper: "thermal80" }, "paper", "thermal80"],
    [{ fontScale: "large" }, "fontScale", "large"],
    [{ showLogo: true }, "showLogo", true], [{ logoSize: "l" }, "logoSize", "l"],
    [{ showShopName: false }, "showShopName", false],
    [{ showShopNameAlt: false }, "showShopNameAlt", false],
    [{ showAddress: false }, "showAddress", false], [{ showPhone: false }, "showPhone", false],
    [{ colSku: true }, "colSku", true], [{ colUrduName: true }, "colUrduName", true],
    [{ colTax: true }, "colTax", true], [{ colDiscount: true }, "colDiscount", true],
    [{ footerNote: "Note" }, "footerNote", "Note"], [{ termsText: "Terms" }, "termsText", "Terms"],
    [{ showThanks: false }, "showThanks", false], [{ thanksText: "Shukriya" }, "thanksText", "Shukriya"],
    [{ showSignature: true }, "showSignature", true],
    [{ headerMode: "letterhead" }, "headerMode", "letterhead"],
    [{ showLetterheadFooter: true }, "showLetterheadFooter", true],
    [{ stampMode: "always" }, "stampMode", "always"],
    [{ showRaastQr: true }, "showRaastQr", true], [{ raastQrSize: "s" }, "raastQrSize", "s"],
    [{ raastDynamic: false }, "raastDynamic", false],
  ];
  check(sweeps.every(([patch, key, val]) => {
    const r = R(patch);
    return r[key] === val &&
      Object.keys(DEF).every((k) => k === key || JSON.stringify(r[k]) === JSON.stringify(DEF[k]));
  }),
    "resolver: each single-field patch moves exactly its own resolved key and no other (24-field sweep)");
  check(R({ stampDocs: { notes: true } }).stampDocs.notes === true &&
        R({ stampDocs: { notes: true } }).stampDocs.vouchers === false &&
        R({ stampDocs: { notes: true } }).stampDocs.quotations === false &&
        R({ signDocs: { bills: true } }).signDocs.bills === true &&
        R({ signDocs: { bills: true } }).signDocs.vouchers === true &&
        R({ signDocs: { bills: true } }).signDocs.salarySlips === true &&
        R({ signDocs: { vouchers: false } }).signDocs.salarySlips === true,
    "resolver: nested stampDocs/signDocs patches merge over the defaults field-by-field — a partial nested object never zeroes its siblings");

  const FULL = {
    paper: "a5", fontScale: "large", showLogo: true, logoSize: "s",
    showShopName: false, showShopNameAlt: false, showAddress: false, showPhone: false,
    colSku: true, colUrduName: true, colTax: true, colDiscount: true,
    footerNote: "F", termsText: "T", showThanks: false, thanksText: "Th",
    showSignature: true, headerMode: "logo-text", showLetterheadFooter: true,
    stampMode: "never",
    stampDocs: { notes: true, vouchers: true, quotations: true },
    signDocs: { vouchers: false, salarySlips: false, bills: true },
    showRaastQr: true, raastQrSize: "l", raastDynamic: false,
  };
  let passOk = true;
  try { assert.deepStrictEqual(R(FULL), FULL); } catch { passOk = false; }
  check(passOk,
    "resolver: a fully-specified design passes through untouched — no field is dropped, coerced or re-defaulted");

  /* ---- §1.7: paper mechanics ---- */
  check(print.paperPageRule("a4") === "size: A4 portrait; margin: 10mm" &&
        print.paperPageRule("a4-compact") === "size: A4 portrait; margin: 10mm" &&
        print.paperPageRule("a5") === "size: A5 portrait; margin: 8mm" &&
        print.paperPageRule("thermal80") === "size: 80mm auto; margin: 4mm",
    "@page: the paper mapping verbatim — compact is a layout on A4 paper (A4's rule), A5 at 8mm, thermal 80mm auto at 4mm");
  check(print.receiptClassName(DEF) === "receipt" &&
        print.receiptClassName(R({ paper: "a4-compact" })) === "receipt receipt-compact" &&
        print.receiptClassName(R({ paper: "a5" })) === "receipt receipt-a5" &&
        print.receiptClassName(R({ paper: "thermal80" })) === "receipt receipt-80" &&
        print.receiptClassName(R({ fontScale: "large" })) === "receipt receipt-lg" &&
        print.receiptClassName(R({ paper: "thermal80", fontScale: "large" })) === "receipt receipt-80 receipt-lg" &&
        print.receiptClassName(DEF, "thermal80") === "receipt receipt-80" &&
        print.receiptClassName(R({ paper: "thermal80" }), "a4") === "receipt",
    "layouts: the class composition — classic A4 is the bare .receipt (today's measure); the desk's per-print paper override wins over the template in both directions");

  /* ---- §1.5: the slot matrix, enforced structurally ---- */
  check(print.slotsFor("challan").signature === "customer" && print.slotsFor("challan").stamp === "none" &&
        print.slotsFor("job").signature === "customer" &&
        print.slotsFor("bill").stamp === "rule" && print.slotsFor("bill").signature === "shop" &&
        print.slotsFor("voucher").signature === "shop" && print.slotsFor("voucher").stamp === "toggle" &&
        print.slotsFor("salarySlip").signature === "shop" && print.slotsFor("salarySlip").footerNote === false &&
        print.slotsFor("report").paper === false && print.slotsFor("report").terms === false &&
        print.slotsFor("note").colTax === true && print.slotsFor("note").colDiscount === false &&
        print.slotsFor("quotation").colTax === false && print.slotsFor("quotation").colDiscount === true &&
        print.slotsFor("transfer").footerNote === false && print.slotsFor("production").terms === false,
    "slots: the §1.5 matrix as declared — challan/job signature lines are the customer's, the bill stamp is the status rule, reports take no template paper or terms, the note is tax-never-discount, the quotation discount-never-tax");
  const ALL_ON = R({ colSku: true, colUrduName: true, colTax: true, colDiscount: true });
  const NO_COLS = JSON.stringify({ sku: false, urduName: false, tax: false, discount: false });
  check(["challan", "po", "transfer", "production", "job", "voucher", "salarySlip", "report"]
          .every((k) => JSON.stringify(print.resolveItemColumns(ALL_ON, k)) === NO_COLS),
    "slots: with EVERY column toggle on, the price-free documents still resolve to no item columns at all — a delivery challan can NEVER gain prices through the designer");
  check(JSON.stringify(print.resolveItemColumns(ALL_ON, "bill")) ===
          JSON.stringify({ sku: true, urduName: true, tax: true, discount: true }) &&
        JSON.stringify(print.resolveItemColumns(ALL_ON, "note")) ===
          JSON.stringify({ sku: true, urduName: true, tax: true, discount: false }) &&
        JSON.stringify(print.resolveItemColumns(ALL_ON, "quotation")) ===
          JSON.stringify({ sku: true, urduName: true, tax: false, discount: true }) &&
        JSON.stringify(print.resolveItemColumns(ALL_ON, "order")) ===
          JSON.stringify({ sku: true, urduName: true, tax: false, discount: true }),
    "slots: the toggle ∩ matrix intersection — bill gets all four columns, the note tax-only beyond identity, quotation/order discount but never a tax column");
  check(JSON.stringify(print.resolveItemColumns(DEF, "bill")) === NO_COLS &&
        JSON.stringify(print.resolveItemColumns(DEF, "note")) === NO_COLS,
    "slots: the default design adds no column to any sheet — today's tables stand byte-for-byte");

  /* ---- §1.4: the column sources ---- */
  const prods = print.sampleProducts();
  check(print.productPrintInfo(prods, "sample-p1").sku === "SMP-001" &&
        print.productPrintInfo(prods, "sample-p1").urduName === "نمونہ چاول" &&
        print.productPrintInfo(prods, "sample-p2").sku === "SMP-002" &&
        print.productPrintInfo(prods, "sample-p2").urduName === "نمونہ تیل" &&
        print.productPrintInfo(prods, "gone").sku === "" &&
        print.productPrintInfo(prods, "gone").urduName === "" &&
        print.productPrintInfo(undefined, "sample-p1").sku === "",
    "columns: SKU + Urdu name resolve LIVE from the products list by productId — a deleted product (or no list) prints blank, never a stored snapshot");
  const sb = print.sampleBill();
  check(print.printLineTax(sb.items[0]) === 0 && eq(print.printLineTax(sb.items[1]), 320.73) &&
        print.printLineTax({}) === 0,
    "columns: the per-line tax reads A4's snapshotted taxAmount verbatim (absent ⇒ 0) — real document data, never recomputed at print");
  const tl = tax.billTaxLines(sb);
  check(tl.length === 1 && tl[0].name === "GST 18%" && tl[0].kind === "percent" &&
        tl[0].inclusive === false && eq(tl[0].amount, 320.73) &&
        eq(sum(sb.items.map((i) => print.printLineTax(i))), sb.taxAmount),
    "columns: the sample bill's snapshotted lines regroup to its single GST 18% summary line of 320.73 == the bill's own taxAmount");
  check(JSON.stringify(print.printLineDiscounts([100, 100, 100], 100)) ===
          JSON.stringify(tax.allocateProRata([100, 100, 100], 100)) &&
        eq(sum(print.printLineDiscounts([100, 100, 100], 100)), 100) &&
        eq(sum(print.printLineDiscounts([250, 200], 50)), 50) &&
        eq(sum(print.printLineDiscounts(sb.items.map((i) => i.total), sb.discountAmount)), sb.discountAmount) &&
        print.printLineDiscounts([500, 300], 0).every((v) => v === 0),
    "columns: the per-line discount IS allocateProRata — a display-only derivation whose shares sum to the document discount to the paisa (zero discount ⇒ zero shares)");
  const partialBill = { ...sb, status: "partially_returned" };
  check(eq(sum(print.printLineDiscounts(partialBill.items.map((i) => i.total), partialBill.discountAmount)), 200),
    "columns: the derivation is over the document's ORIGINAL lines — a partially-returned bill's per-line discounts still sum to its discountAmount");

  /* ---- §2.4: the stamp rule ---- */
  const ASSET = "data:image/png;base64,AAAA";
  const paidD = R({ stampMode: "paid" });
  check(print.stampVisible(paidD, null, "bill", "paid") === false &&
        print.stampVisible(paidD, undefined, "bill", "paid") === false &&
        print.stampVisible(R({ stampMode: "always", stampDocs: { notes: true } }), null, "note") === false,
    "stamp: no asset ⇒ no stamp, whatever the design says (E1's standing state — assets land in E2)");
  check(print.stampVisible(paidD, ASSET, "bill", "paid") === true &&
        print.stampVisible(paidD, ASSET, "bill", "partially_returned") === false &&
        print.stampVisible(paidD, ASSET, "bill", "credit") === false &&
        print.stampVisible(paidD, ASSET, "bill", "held") === false,
    "stamp: mode 'paid' asserts settlement only on a fully-paid bill — a partially-returned bill has lost that assertion, credit and held never had it");
  check(print.stampVisible(R({ stampMode: "always" }), ASSET, "bill", "partially_returned") === true &&
        print.stampVisible(R({ stampMode: "always" }), ASSET, "bill", "credit") === true &&
        print.stampVisible(R({ stampMode: "always" }), ASSET, "bill", "held") === false &&
        print.stampVisible(R({ stampMode: "never" }), ASSET, "bill", "paid") === false,
    "stamp: mode 'always' prints on open and settled bills alike, but a HELD bill never carries it in any mode (held paper is not a receipt); 'never' suppresses outright");
  check(print.stampVisible(R({ stampDocs: { notes: true } }), ASSET, "note") === true &&
        print.stampVisible(paidD, ASSET, "note") === false &&
        print.stampVisible(R({ stampDocs: { vouchers: true } }), ASSET, "voucher") === true &&
        print.stampVisible(paidD, ASSET, "voucher") === false &&
        print.stampVisible(R({ stampDocs: { quotations: true } }), ASSET, "quotation") === true &&
        print.stampVisible(R({ stampDocs: { quotations: true } }), ASSET, "order") === true &&
        print.stampVisible(R({ stampDocs: { notes: true, vouchers: true, quotations: true } }), ASSET, "challan") === false &&
        print.stampVisible(paidD, ASSET, "report") === false,
    "stamp: per-doc toggles govern notes/vouchers/quotations (orders ride the quotations key); slot-less documents never stamp");
  check(print.stampVisible(R({ paper: "thermal80", stampMode: "always" }), ASSET, "bill", "paid") === false,
    "stamp: thermal suppresses the stamp unconditionally (§1.7 hard rule)");

  /* ---- §1.3/§1.7: header slots ---- */
  check(print.letterheadHeaderVisible(R({ headerMode: "letterhead" }), true) === true &&
        print.letterheadHeaderVisible(R({ headerMode: "letterhead", paper: "thermal80" }), true) === false &&
        print.letterheadHeaderVisible(R({ headerMode: "letterhead" }), false) === false &&
        print.letterheadHeaderVisible(DEF, true) === false &&
        print.letterheadFooterVisible(R({ showLetterheadFooter: true }), true) === true &&
        print.letterheadFooterVisible(R({ showLetterheadFooter: true, paper: "thermal80" }), true) === false &&
        print.letterheadFooterVisible(DEF, true) === false,
    "header: the letterhead replaces the text header only in letterhead mode with an asset present; thermal suppresses letterhead head AND foot unconditionally — the text header prints instead");
  check(print.logoVisible(R({ showLogo: true }), true, false) === true &&
        print.logoVisible(DEF, true, false) === false &&
        print.logoVisible(R({ headerMode: "logo-text" }), true, false) === true &&
        print.logoVisible(R({ headerMode: "letterhead", showLogo: true }), true, true) === false &&
        print.logoVisible(R({ showLogo: true }), false, false) === false &&
        print.logoVisible(R({ showLogo: true, paper: "thermal80" }), true, false) === true,
    "header: the logo prints on its toggle or in logo-text mode, never under a letterhead banner, and is the one image thermal keeps (small, centred)");

  /* ---- §2.4: the signature slot ---- */
  check(print.shopSignatureVisible(DEF, "voucher") === true &&
        print.shopSignatureVisible(DEF, "salarySlip") === true &&
        print.shopSignatureVisible(DEF, "bill") === false &&
        print.shopSignatureVisible(R({ showSignature: true }), "bill") === true &&
        print.shopSignatureVisible(R({ signDocs: { bills: true } }), "bill") === true &&
        print.shopSignatureVisible(R({ signDocs: { vouchers: false } }), "voucher") === false &&
        print.shopSignatureVisible(R({ signDocs: { salarySlips: false } }), "salarySlip") === false &&
        print.shopSignatureVisible(R({ showSignature: true }), "challan") === false &&
        print.shopSignatureVisible(R({ showSignature: true }), "job") === false &&
        print.shopSignatureVisible(R({ showSignature: true }), "quotation") === false,
    "signature: vouchers + salary slips carry the shop slot by default (as their bodies always printed it), bills only on their toggle; the challan/job receiver lines are the customer's — the shop signature can never land there");

  /* ---- default-design rendering equivalence (the E1 promise) ---- */
  check(print.stampVisible(DEF, null, "bill", "paid") === false &&
        print.letterheadHeaderVisible(DEF, false) === false &&
        print.letterheadFooterVisible(DEF, false) === false &&
        print.logoVisible(DEF, false, false) === false &&
        print.receiptClassName(DEF) === "receipt" &&
        print.paperPageRule(DEF.paper) === "size: A4 portrait; margin: 10mm" &&
        DEF.footerNote === "" && DEF.termsText === "" && DEF.thanksText === "" && DEF.showThanks === true,
    "equivalence: under the default design every E1 novelty resolves OFF — no stamp, letterhead or logo (no assets exist in E1), no footer note/terms/custom thanks, the classic A4 receipt at the historical 10mm page margin: today's output, slot for slot");

  /* ---- §1.8: the sample fixtures ---- */
  check(eq(sum(sb.items.map((i) => i.total)), sb.subtotal) &&
        eq(sb.subtotal - sb.discountAmount + sb.taxAmount, sb.total) &&
        eq(sum(sb.payments.map((p) => p.amount)), sb.total) &&
        sb.status === "paid" && sb.billNo === 101 && sb.items.length === 2 &&
        sb.payments.length === 2,
    "fixture: the sample bill closes — lines 4,760 − discount 200 + tax 320.73 = 4,880.73, and its split cash/bank payments sum to the total");
  const sq = print.sampleQuotation();
  check(sq.number === "QT-101" && sq.status === "issued" &&
        eq(sum(sq.lines.map((l) => l.total)), sq.subtotal) &&
        eq(sq.subtotal - sq.discountAmount + sq.estimatedTax, sq.total) &&
        eq(sq.estimatedTax, sb.taxAmount),
    "fixture: the sample quotation mirrors the bill's lines with its tax carried as the estimate — 4,760 − 200 + 320.73 = 4,880.73");
  check(print.sampleProducts() !== print.sampleProducts() &&
        print.sampleBill() !== print.sampleBill() &&
        print.sampleBill().items !== print.sampleBill().items,
    "fixture: samples are fresh copies per call (code fixtures, §10.3 — never shared or seed state)");

  /* ---- i18n: the E1 print keys ---- */
  const e1Keys = [
    "print.title", "print.sub", "print.paper", "print.paper.a4", "print.paper.a4compact",
    "print.paper.a5", "print.paper.thermal80", "print.fontScale", "print.fontScale.standard",
    "print.fontScale.large", "print.headerTitle", "print.headerMode", "print.headerMode.text",
    "print.headerMode.letterhead", "print.headerMode.logoText", "print.headerModeNote",
    "print.shopNameAlt", "print.shopNameAltPh", "print.showLogo", "print.logoSize",
    "print.logoSize.s", "print.logoSize.m", "print.logoSize.l", "print.showShopName",
    "print.showShopNameAlt", "print.showAddress", "print.showPhone", "print.columnsTitle",
    "print.colSku", "print.colUrduName", "print.colTax", "print.colTaxNote", "print.colDiscount",
    "print.footerTitle", "print.footerNote", "print.footerNotePh", "print.termsText",
    "print.termsPh", "print.showThanks", "print.thanksText", "print.thanksPh",
    "print.showSignature", "print.previewTitle", "print.previewBill", "print.previewQuote",
    "print.sampleBadge", "print.reset", "print.saved",
    "print.col.sku", "print.col.tax", "print.col.discount", "print.termsLabel",
    "print.authorisedSignature",
  ];
  check(e1Keys.length === 53 &&
        e1Keys.every((k) => typeof i18n.en[k] === "string" && i18n.en[k].length > 0 &&
                           typeof i18n.ur[k] === "string" && i18n.ur[k].length > 0),
    "i18n: the 53 new E1 print.* keys are present and non-empty in both languages (parity)");
  check(Object.keys(i18n.en).length === 3136 && Object.keys(i18n.ur).length === 3136,
    "i18n: the dictionary now carries 3,054 keys, EN ≡ UR (E1 pin amendment: +53 print keys; E2 pin amendment: +37 print.brand keys; E3 pin amendment: +35 Raast keys (34 print.raast + billing.wa.raastLine); E4 pin amendment: +49 pin keys; F5 pin amendment: +1 sync.online key; G1 pin amendment: +8 biz keys; G2 pin amendment: +36 plan keys; G3 pin amendment: +89 platform keys; G4 pin amendment: +47 keys (35 renew.* + 12 platform.*); G6 pin amendment: +25 backup.* keys; H1 pin amendment: +51 loyalty keys; H3 pin amendment: +108 storefront keys; WA pin amendment: +109 WhatsApp keys)");

  /* ---- source invariants: purity + wiring ---- */
  const printSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/lib/print.ts", "utf8");
  check(!/makeEntry|guardPostings|writeBatch|setDoc|updateDoc|addDoc|deleteDoc/.test(printSrc) &&
        printSrc.includes("resolvePrintDesign") && printSrc.includes("allocateProRata") &&
        printSrc.includes("taxAmount"),
    "source: lib/print is a pure resolver — no posting or store-write call exists in it; the discount column reuses allocateProRata and the tax column reads the taxAmount snapshot");
  const chromeSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/PrintChrome.tsx", "utf8");
  const docSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/DocPrintSheet.tsx", "utf8");
  check(chromeSrc.includes("export function PrintHeader") && chromeSrc.includes("export function PrintFooter") &&
        chromeSrc.includes("export function PrintPageStyle") && chromeSrc.includes("export function PrintItemsTable"),
    "source: the shared chrome exports PrintHeader / PrintFooter / PrintPageStyle / PrintItemsTable");
  check(docSrc.includes("PrintHeader") && docSrc.includes("PrintFooter") && docSrc.includes("PrintPageStyle") &&
        docSrc.includes("export function BillPrintSheet") &&
        ["VoucherPrintSheet", "ChallanPrintSheet", "PoPrintSheet", "NotePrintSheet",
         "TransferPrintSheet", "ProductionPrintSheet", "JobPrintSheet", "SalarySlipSheet"]
          .every((n) => docSrc.includes(`export function ${n}`)),
    "source: all nine sheets + the extracted BillPrintSheet render through the shared chrome");
  const billDeskSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/BillingDesk.tsx", "utf8");
  check(billDeskSrc.includes("<BillPrintSheet") && !billDeskSrc.includes('receipt" + (thermal'),
    "source: the billing desk's receipt IS BillPrintSheet — the inline receipt markup is gone, one render path for screen print and designer preview alike");
  const cssSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/app/globals.css", "utf8");
  check(!/^@page\s*\{/m.test(cssSrc) && cssSrc.includes(".receipt-compact") &&
        cssSrc.includes(".receipt-a5") && cssSrc.includes(".receipt-lg") &&
        cssSrc.includes(".print-preview-frame"),
    "source: globals carries no global @page rule (each sheet renders its own via PrintPageStyle) and defines the compact/A5/large layouts + the screen-only preview frame");
  const setSrcE1 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/SettingsView.tsx", "utf8");
  const designerSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/PrintDesigner.tsx", "utf8");
  check(setSrcE1.includes("PrintDesignerSection") &&
        designerSrc.includes("sampleBill") && designerSrc.includes("sampleQuotation") &&
        designerSrc.includes("updateSettings") &&
        designerSrc.includes("BillPrintSheet") && designerSrc.includes("DocPrintSheet"),
    "source: Settings mounts the owner-only designer card; the designer saves via updateSettings and previews the sample fixtures through the real sheets");
  const storeSrcE1 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx", "utf8");
  check((storeSrcE1.match(/makeEntry\(/g) || []).length === 24 &&
        storeSrcE1.includes('"dukaan-ai-store-v16"'),
    "source: still 24 makeEntry calls in the store and demo storage still v16 — E1 posts nothing and migrates nothing");

  /* ---- rules: E1 needs NO change — byte-identical, asserted ---- */
  const rulesE1 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8");
  check(crypto.createHash("sha256").update(stripE2BrandingBlock(stripG1Blocks(stripG2Blocks(rulesE1))), "utf8").digest("hex") ===
        "3cae3c7641955ab4fda07aa21b404fc9274e1bd49dc2aabeb96269fefad1942c",
    "rules: print settings ride the owner settings doc under the existing write pattern — the rules file is byte-identical to the D3/D4/D5-state file (E2 same-check amendment: the additive branding block is stripped first — E2's only rules change, strip-proven in the E2 suite; G1 same-check amendment: the four G1 spans are stripped first — v9's only other deltas, strip-proven in the G1 suite)");

  /* ---- seed regression: Phase E posts nothing ---- */
  const normalizedE1 = journal.map((e) => { const { ts, ...rest } = e; return rest; });
  const shaE1 = crypto.createHash("sha256").update(JSON.stringify(normalizedE1), "utf8").digest("hex");
  const allRangeE1 = reports.resolveReportRange("custom", null, { from: "2000-01-01", to: "2100-12-31" });
  const tbE1 = reports.trialBalance(journal, allRangeE1);
  check(journal.length === 21 && shaE1 === "e17e5bda19e87de698b0c0a37e923f9b396bc387e2092b2ffbbd7d60d4971168" &&
        eq(ledger.accountBalance(journal, "inventory"), 272805) &&
        eq(ledger.cashBalance(journal), 50000) &&
        eq(ledger.payablesTotal(journal), 27900) &&
        eq(ledger.receivablesTotal(journal), 5500) &&
        eq(tbE1.totalDebits, tbE1.totalCredits),
    "seed regression: the frozen identities stand — 21 entries, the seed-journal SHA, inventory 272,805 / cash 50,000 / payables 27,900 / receivables 5,500, trial balance zero. Print design is settings, not postings");
}

/* ================================ E2 ================================ */
suite("E2", null); // Phase E · E2 — brand assets: the capped pipeline + slot consumption (design §2)
{
  const B = branding;
  const RE2 = (pd) => print.resolvePrintDesign(pd ? { printDesign: pd } : {});
  const DEF2 = RE2();
  const urlOf = (mime, payloadChars) => "data:" + mime + ";base64," + "A".repeat(payloadChars);

  /* ---- the spec table: caps are design constants (§2.3) ---- */
  check(JSON.stringify(B.BRANDING_KINDS) ===
        JSON.stringify(["logo", "letterheadHeader", "letterheadFooter", "stamp", "signature", "raastQrImage"]),
    "specs: the six asset kinds, in the design's order — the five print slots plus the reserved Raast QR image");
  check(B.BRANDING_SPECS.logo.capBytes === 150000 && B.BRANDING_SPECS.stamp.capBytes === 150000 &&
        B.BRANDING_SPECS.signature.capBytes === 150000 && B.BRANDING_SPECS.letterheadHeader.capBytes === 300000 &&
        B.BRANDING_SPECS.letterheadFooter.capBytes === 300000 && B.BRANDING_SPECS.raastQrImage.capBytes === 200000,
    "specs: the HARD CAPS — logo / stamp / signature ≤ 150,000 bytes, letterhead ≤ 300,000, the bank-issued Raast image ≤ 200,000");
  check(B.BRANDING_TOTAL_CAP_BYTES === 1250000 &&
        B.BRANDING_KINDS.every((k) => B.BRANDING_SPECS[k].capBytes < 1048576),
    "specs: the six caps total 1,250,000 bytes (~1 MB of branding per shop) and every single payload stays under the 1 MiB Firestore document limit");
  check(B.BRANDING_SPECS.logo.maxWidth === 600 && B.BRANDING_SPECS.logo.maxHeight === 600 &&
        B.BRANDING_SPECS.letterheadHeader.maxWidth === 1600 && B.BRANDING_SPECS.letterheadHeader.maxHeight === 400 &&
        B.BRANDING_SPECS.letterheadFooter.maxWidth === 1600 && B.BRANDING_SPECS.signature.maxWidth === 800 &&
        B.BRANDING_SPECS.signature.maxHeight === 300 && B.BRANDING_SPECS.raastQrImage.maxWidth === 800 &&
        B.BRANDING_SPECS.letterheadHeader.banner === true && B.BRANDING_SPECS.letterheadFooter.banner === true &&
        !B.BRANDING_SPECS.logo.banner && !B.BRANDING_SPECS.stamp.banner,
    "specs: the max boxes (logo 600², letterhead 1600×400, signature 800×300, Raast 800²) and the banner flags that force JPEG");

  /* ---- data-URL measures ---- */
  check(B.dataUrlBytes("data:image/png;base64,QUJD") === 3 &&
        B.dataUrlBytes("data:image/png;base64,QUI=") === 2 &&
        B.dataUrlBytes("data:image/png;base64,QQ==") === 1,
    "dataUrlBytes: the decoded length counts the base64 payload minus its padding (3 / 2 / 1)");
  check(B.dataUrlBytes("") === -1 && B.dataUrlBytes("nope") === -1 &&
        B.dataUrlBytes("data:image/png;base64") === -1 && B.dataUrlBytes("data:image/png;base64,QUI") === -1,
    "dataUrlBytes: malformed input (no marker, no comma, a payload that is not whole base64 quads) measures −1, never a guess");
  check(B.dataUrlMime("data:image/webp;base64,AAAA") === "image/webp" &&
        B.dataUrlMime("data:image/png;base64,AAAA") === "image/png" &&
        B.dataUrlMime("data:text/plain;base64,AAAA") === null && B.dataUrlMime("garbage") === null,
    "dataUrlMime: only the three encodable image mimes parse; anything else is null");

  /* ---- fitWithinBox: normalise, never upscale (§2.2 step 1) ---- */
  const fitLogo = B.fitWithinBox(1200, 900, B.BRANDING_SPECS.logo);
  check(fitLogo.width === 600 && fitLogo.height === 450,
    "fit: a 1200×900 logo normalises to 600×450 — the box binds on width, the aspect is kept");
  const fitHead = B.fitWithinBox(3200, 900, B.BRANDING_SPECS.letterheadHeader);
  check(fitHead.width === 1422 && fitHead.height === 400,
    "fit: a 3200×900 letterhead normalises to 1422×400 — the box binds on height");
  const fitSign = B.fitWithinBox(400, 150, B.BRANDING_SPECS.signature);
  check(fitSign.width === 400 && fitSign.height === 150,
    "fit: an already-small signature is NEVER upscaled (400×150 stays 400×150)");
  const fitStamp = B.fitWithinBox(90, 2000, B.BRANDING_SPECS.stamp);
  check(fitStamp.width === 27 && fitStamp.height === 600,
    "fit: a tall thin stamp (90×2000) fits by height to 27×600");
  const fitBad = B.fitWithinBox(0, 100, B.BRANDING_SPECS.logo);
  const fitThin = B.fitWithinBox(1, 10000, B.BRANDING_SPECS.logo);
  check(fitBad.width === 0 && fitBad.height === 0 && fitThin.width === 1 && fitThin.height === 600,
    "fit: unusable dimensions fit to 0×0 (the pipeline refuses them), and an extreme aspect still yields at least one pixel");

  /* ---- chooseFormat: transparency is data, banners are JPEG ---- */
  check(B.chooseFormat("letterheadHeader", true) === "image/jpeg" &&
        B.chooseFormat("letterheadFooter", true) === "image/jpeg",
    "format: letterhead art is JPEG even when the source carries alpha — a banner's transparency would print as a hole (§2.2 step 2)");
  check(B.chooseFormat("logo", true) === "image/webp" && B.chooseFormat("stamp", true) === "image/webp" &&
        B.chooseFormat("signature", true) === "image/webp" && B.chooseFormat("raastQrImage", true) === "image/webp" &&
        B.chooseFormat("logo", false) === "image/jpeg" && B.chooseFormat("stamp", false) === "image/jpeg" &&
        B.chooseFormat("signature", false) === "image/jpeg" && B.chooseFormat("raastQrImage", false) === "image/jpeg",
    "format: real alpha → WebP (transparency preserved for logo / stamp / signature / QR); no alpha → JPEG everywhere");

  /* ---- compressionPlan: the ladder (§2.2 step 3) ---- */
  const planLogo = B.compressionPlan("logo", { width: 1200, height: 900, hasAlpha: true });
  check(planLogo.length === 4 && planLogo.every((s) => s.mime === "image/webp") &&
        planLogo.map((s) => Math.round(s.quality * 100)).join(",") === "92,82,82,72",
    "plan: a transparent logo walks WebP at quality 0.92 → 0.82 → 0.82 → 0.72 (quality first, then the box)");
  check(planLogo.map((s) => s.width + "x" + s.height).join(",") === "600x450,600x450,450x337,337x253",
    "plan: the box holds for two rungs, then shrinks ×0.75 per rung (600×450 → 450×337 → 337×253) — fitted dimensions FLOOR, so a step never lands a pixel over its box");
  const planSign = B.compressionPlan("signature", { width: 1600, height: 600, hasAlpha: false });
  check(planSign.every((s) => s.mime === "image/jpeg") &&
        planSign.map((s) => Math.round(s.quality * 100)).join(",") === "90,80,80,70" &&
        planSign.map((s) => s.width + "x" + s.height).join(",") === "800x300,800x300,600x225,450x168",
    "plan: an opaque signature walks JPEG 0.90 → 0.70 over the 800×300 box");
  const planHead = B.compressionPlan("letterheadHeader", { width: 3200, height: 900, hasAlpha: true });
  check(planHead.every((s) => s.mime === "image/jpeg") &&
        planHead.map((s) => Math.round(s.quality * 100)).join(",") === "85,75,75,65" &&
        planHead.map((s) => s.width + "x" + s.height).join(",") === "1422x400,1422x400,1066x300,799x225",
    "plan: a letterhead banner walks JPEG from 0.85 regardless of alpha, over the 1600×400 box");
  check(B.compressionPlan("logo", { width: 0, height: 0, hasAlpha: false }).length === 0 &&
        B.BRANDING_KINDS.every((k) => {
          const p = B.compressionPlan(k, { width: 4000, height: 3000, hasAlpha: true });
          return p.length === 4 && p.every((s, i) => i === 0 ||
            (s.width <= p[i - 1].width && s.height <= p[i - 1].height && s.quality <= p[i - 1].quality));
        }),
    "plan: unusable dimensions plan nothing; for every kind the ladder is monotone — the box and the quality only ever step DOWN");

  /* ---- runCompressionPlan: caps enforced, refusal honest ---- */
  const encModelA = (step) => ({
    dataUrl: "data:" + step.mime + ";base64,AAAA",
    bytes: 500 + Math.floor((step.width * step.height) / 50),
  });
  const runA = B.runCompressionPlan("logo", { width: 1200, height: 900, hasAlpha: true }, encModelA);
  check(runA.ok === true && runA.stepIndex === 0 && runA.bytes === 5900 &&
        runA.dataUrl.indexOf("data:image/webp") === 0,
    "run: a compressible logo lands on the FIRST rung (5,900 bytes under the model) — the pipeline never degrades what already fits");
  const encModelB = (step) => ({
    dataUrl: "data:" + step.mime + ";base64,AAAA",
    bytes: Math.floor(step.width * step.height * 0.7),
  });
  const runB = B.runCompressionPlan("logo", { width: 1200, height: 900, hasAlpha: true }, encModelB);
  check(runB.ok === true && runB.stepIndex === 2 && runB.bytes === 106155 &&
        runB.step.width === 450 && runB.step.height === 337,
    "run: a heavy logo walks to rung 2 (the ×0.75 box) and lands at 106,155 bytes — under the 150,000 cap, quality already spent");
  const runHead = B.runCompressionPlan("letterheadHeader", { width: 3200, height: 900, hasAlpha: true },
    (step) => ({ dataUrl: "data:" + step.mime + ";base64,AAAA", bytes: Math.floor(step.width * step.height * 0.6) }));
  check(runHead.ok === true && runHead.stepIndex === 2 && runHead.bytes === 191880,
    "run: a heavy letterhead lands on rung 2 at 191,880 bytes under ITS 300,000 cap — the caps are per-kind, not global");
  const runRefuse = B.runCompressionPlan("logo", { width: 1200, height: 900, hasAlpha: true },
    (step) => ({ dataUrl: "data:" + step.mime + ";base64,AAAA", bytes: 999999 }));
  check(runRefuse.ok === false && runRefuse.capBytes === 150000 &&
        runRefuse.lastBytes === 999999 && runRefuse.stepsTried === 4,
    "run: an image no rung can save is REFUSED with the actual figures (cap 150,000; last encode 999,999 after 4 rungs) — never silently truncated (§2.2 step 4)");
  let sweepOk = true;
  const sweepModels = [
    () => 400000,
    (s) => Math.floor(s.width * s.height * 1.2),
    (s) => Math.floor(s.width * s.height * 0.05),
  ];
  for (const kind of B.BRANDING_KINDS) {
    for (const hasAlpha of [true, false]) {
      for (let m = 0; m < sweepModels.length; m++) {
        const out = B.runCompressionPlan(kind, { width: 4000, height: 3000, hasAlpha },
          (step) => ({ dataUrl: "data:" + step.mime + ";base64,AAAA", bytes: sweepModels[m](step) }));
        if (out.ok && out.bytes > B.BRANDING_SPECS[kind].capBytes) sweepOk = false;
        if (m === 0 && out.ok) sweepOk = false; // a flat 400 KB encode exceeds EVERY cap
        if (m === 2 && !out.ok) sweepOk = false; // a light encode must always land
      }
    }
  }
  check(sweepOk,
    "run (property sweep): across all kinds × alpha × size models, no run ever yields a stored payload over its cap; a flat 400 KB encode is refused everywhere; a light encode always lands");

  /* ---- buildBrandingAsset: the boundary guard ---- */
  const goodLogo = B.buildBrandingAsset("logo", urlOf("image/png", 132), 120, 90, "2026-10-22T00:00:00.000Z");
  check(goodLogo !== null && goodLogo.id === "logo" && goodLogo.kind === "logo" &&
        goodLogo.mime === "image/png" && goodLogo.bytes === 99 &&
        goodLogo.width === 120 && goodLogo.height === 90 &&
        goodLogo.updatedAt === "2026-10-22T00:00:00.000Z" &&
        B.dataUrlBytes(goodLogo.dataUrl) === goodLogo.bytes,
    "asset: a valid encode becomes the fixed-id doc (id == kind) with the MEASURED byte count — the stored size is the data URL's own length, never a caller's claim");
  check(B.buildBrandingAsset("logo", urlOf("image/jpeg", 200000), 600, 450, "t") !== null &&
        B.buildBrandingAsset("letterheadHeader", urlOf("image/jpeg", 400000), 1600, 400, "t") !== null,
    "asset: exactly AT the cap is accepted (150,000 bytes for the logo, 300,000 for the letterhead) — the cap is a ≤, not a <");
  check(B.buildBrandingAsset("logo", urlOf("image/jpeg", 200004), 600, 450, "t") === null &&
        B.buildBrandingAsset("letterheadHeader", urlOf("image/jpeg", 400004), 1600, 400, "t") === null,
    "asset: one base64 quad OVER the cap (150,003 / 300,003 bytes) is refused at the boundary — the store can never persist an over-cap payload");
  check(B.buildBrandingAsset("logo", urlOf("image/gif", 132), 10, 10, "t") === null &&
        B.buildBrandingAsset("logo", urlOf("image/png", 132), 0, 10, "t") === null &&
        B.buildBrandingAsset("logo", "data:image/png;base64,!!!", 10, 10, "t") === null,
    "asset: a non-encodable mime, a zero dimension, or a corrupt payload are all refused — the doc only ever holds a real, measured image");

  /* ---- the maps the print seam consumes ---- */
  const stampAsset = B.buildBrandingAsset("stamp", urlOf("image/webp", 132), 50, 50, "t");
  const byKindE2 = B.brandingByKind([goodLogo, stampAsset]);
  check(byKindE2.logo === goodLogo && byKindE2.stamp === stampAsset &&
        byKindE2.signature === undefined && byKindE2.raastQrImage === undefined,
    "maps: brandingByKind files each doc under its kind; absent slots stay absent");
  const urlsE2 = B.brandingDataUrls([goodLogo, stampAsset]);
  check(Object.keys(urlsE2).length === 6 && urlsE2.logo === goodLogo.dataUrl &&
        urlsE2.stamp === stampAsset.dataUrl && urlsE2.letterheadHeader === null &&
        urlsE2.letterheadFooter === null && urlsE2.signature === null && urlsE2.raastQrImage === null,
    "maps: brandingDataUrls emits the full PrintAssets shape — present slots as URLs, absent slots as null, so `assets?.logo` Just Works at every sheet");
  check(B.brandingTotalBytes([goodLogo, stampAsset]) === 198 && B.brandingTotalBytes([]) === 0,
    "maps: the settings total is the plain sum of the stored byte counts (99 + 99)");

  /* ---- slot consumption WITH real assets (the E1 matrix, fed) ---- */
  const allAssets = B.brandingDataUrls(B.BRANDING_KINDS.map((k) =>
    B.buildBrandingAsset(k, urlOf("image/png", 132), 10, 10, "t")));
  check(print.stampVisible(DEF2, allAssets.stamp, "bill", "paid") === true &&
        print.stampVisible(DEF2, allAssets.stamp, "bill", "partially_returned") === false &&
        print.stampVisible(DEF2, allAssets.stamp, "bill", "held") === false &&
        print.stampVisible(DEF2, allAssets.stamp, "bill", "credit") === false,
    "slots: with a stamp asset stored, a PAID bill prints it — a partially-returned or held or credit bill never does (the E1 §2.4 rule, now fed a real asset)");
  check(print.stampVisible(RE2({ paper: "thermal80", stampMode: "always" }), allAssets.stamp, "bill", "paid") === false &&
        print.letterheadHeaderVisible(RE2({ headerMode: "letterhead", paper: "thermal80" }), allAssets.letterheadHeader !== null) === false &&
        print.letterheadFooterVisible(RE2({ showLetterheadFooter: true, paper: "thermal80" }), allAssets.letterheadFooter !== null) === false &&
        print.logoVisible(RE2({ headerMode: "logo-text", paper: "thermal80" }), allAssets.logo !== null, allAssets.letterheadHeader !== null) === true,
    "slots: thermal suppresses the stamp AND the letterhead (header + footer) even with assets stored — the logo alone survives, small and centred (§1.7)");
  check(print.stampVisible(DEF2, allAssets.stamp, "voucher") === false &&
        print.stampVisible(RE2({ stampDocs: { vouchers: true } }), allAssets.stamp, "voucher") === true &&
        print.stampVisible(RE2({ stampDocs: { notes: true } }), allAssets.stamp, "note") === true &&
        print.stampVisible(RE2({ stampDocs: { notes: true, vouchers: true, quotations: true } }), allAssets.stamp, "challan") === false,
    "slots: the per-document stamp toggles the E2 brand group edits gate vouchers and notes (default off); a challan never carries the stamp");
  check(print.letterheadHeaderVisible(RE2({ headerMode: "letterhead" }), allAssets.letterheadHeader !== null) === true &&
        print.letterheadFooterVisible(RE2({ showLetterheadFooter: true }), allAssets.letterheadFooter !== null) === true &&
        print.letterheadHeaderVisible(RE2({ headerMode: "letterhead" }), urlsE2.letterheadHeader !== null) === false &&
        print.stampVisible(DEF2, stampAsset.dataUrl, "bill", "paid") === true &&
        print.stampVisible(DEF2, null, "bill", "paid") === false,
    "slots: letterhead chrome prints on A4 exactly when its asset exists — remove the asset and the slot goes silent, nothing dangles");
  check(print.logoVisible(RE2({ headerMode: "logo-text" }), allAssets.logo !== null, allAssets.letterheadHeader !== null) === true &&
        print.logoVisible(RE2({ headerMode: "letterhead" }), allAssets.logo !== null, allAssets.letterheadHeader !== null) === false,
    "slots: the logo prints beside the shop name in logo-text mode, and yields when a letterhead banner has replaced the header wholesale");
  check(print.shopSignatureVisible(RE2({ showSignature: true }), "challan") === false &&
        print.shopSignatureVisible(RE2({ showSignature: true }), "job") === false &&
        print.shopSignatureVisible(DEF2, "voucher") === true &&
        print.shopSignatureVisible(RE2({ signDocs: { vouchers: false } }), "voucher") === false &&
        print.shopSignatureVisible(DEF2, "salarySlip") === true &&
        print.shopSignatureVisible(RE2({ signDocs: { salarySlips: false } }), "salarySlip") === false,
    "slots: the signature image fills ONLY the shop-signature slot (vouchers + salary slips by default, toggles honoured) — the challan/job receiver lines stay the customer's, asset or no asset");

  /* ---- i18n: the brand group speaks both languages ---- */
  const brandKeys = Object.keys(i18n.en).filter((k) => k.startsWith("print.brand."));
  check(brandKeys.length === 37 && brandKeys.every((k) => typeof i18n.ur[k] === "string" && i18n.ur[k].length > 0),
    "i18n: E2 carries 37 print.brand.* keys, every one present and non-empty in Urdu (parity)");
  check(Object.keys(i18n.en).length === 3136 && Object.keys(i18n.ur).length === 3136,
    "i18n: the dictionary now carries 3,054 keys, EN ≡ UR (E2: +37 print.brand keys; E3 pin amendment: +35 Raast keys (34 print.raast + billing.wa.raastLine); E4 pin amendment: +49 pin keys; F5 pin amendment: +1 sync.online key; G1 pin amendment: +8 biz keys; G2 pin amendment: +36 plan keys; G3 pin amendment: +89 platform keys; G4 pin amendment: +47 keys (35 renew.* + 12 platform.*); G6 pin amendment: +25 backup.* keys; H1 pin amendment: +51 loyalty keys; H3 pin amendment: +108 storefront keys; WA pin amendment: +109 WhatsApp keys)");

  /* ---- source invariants ---- */
  const brandingSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/lib/branding.ts", "utf8");
  check(!brandingSrc.includes("makeEntry(") && !brandingSrc.includes("guardPostings") &&
        !brandingSrc.includes("setDoc") && !brandingSrc.includes("updateDoc") &&
        !brandingSrc.includes("deleteDoc") && !brandingSrc.includes("writeBatch") &&
        !brandingSrc.includes("firebase"),
    "source: lib/branding is pure — no store writes, no Firestore, no journal calls; the canvas lives in the component, the caps live here");
  const storeSrcE2 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx", "utf8");
  check(storeSrcE2.includes('"branding"') && storeSrcE2.includes("setBrandingAsset") &&
        storeSrcE2.includes("removeBrandingAsset") &&
        (storeSrcE2.match(/makeEntry\(/g) || []).length === 24,
    "source: the store subscribes the branding collection and exposes the owner-gated setter/remover; still exactly 24 makeEntry calls — E2 posts nothing");
  check(storeSrcE2.includes('"dukaan-ai-store-v17"') && storeSrcE2.includes('STORAGE_KEY = "dukaan-ai-store-v17"'),
    "demo: storage bumps v16 → v17 — the branding field joins the demo snapshot shape (an older demo cache can never render the new build's state incomplete)");
  check(storeSrcE2.includes("branding: []") &&
        !/branding:\s*\[\s*\{/.test(storeSrcE2),
    "demo: the seed ships NO brand assets (design §2.6) — the demo shop's paper stays exactly as unbranded as today's until its owner uploads; nothing implies a real brand");
  const brandUiSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/BrandAssets.tsx", "utf8");
  const designerSrcE2 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/PrintDesigner.tsx", "utf8");
  const sheetSrcE2 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/DocPrintSheet.tsx", "utf8");
  const reportSheetSrcE2 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/ReportPrintSheet.tsx", "utf8");
  check(brandUiSrc.includes("runCompressionPlan") && brandUiSrc.includes("buildBrandingAsset") &&
        brandUiSrc.includes("BRANDING_SPECS") && designerSrcE2.includes("BrandAssetsGroup") &&
        designerSrcE2.includes("brandingDataUrls(branding)") &&
        (sheetSrcE2.match(/assets=\{assets\}/g) || []).length >= 15 &&
        reportSheetSrcE2.includes("assets={assets}"),
    "source: the brand group runs the pure pipeline and the boundary guard; the designer mounts it and previews with the live assets; every sheet forwards the assets into the print chrome");

  /* ---- rules: ONE additive block, strip-proven (§5) ---- */
  const rulesE2 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8");
  const strippedE2 = stripE2BrandingBlock(stripG1Blocks(stripG2Blocks(rulesE2)));
  const blockStart = rulesE2.indexOf("      // Phase E · E2 — brand assets");
  const blockEnd = rulesE2.indexOf("      // Expenses:");
  const blockE2 = blockStart >= 0 && blockEnd > blockStart ? rulesE2.slice(blockStart, blockEnd) : "";
  check(crypto.createHash("sha256").update(strippedE2, "utf8").digest("hex") ===
        "3cae3c7641955ab4fda07aa21b404fc9274e1bd49dc2aabeb96269fefad1942c" &&
        !strippedE2.includes("match /branding/"),
    "rules: strip the additive branding block and the file is byte-identical to the pre-E2 577-line file (the pinned D3-state SHA) — E2 changed nothing else (G1 same-check amendment: the four G1 spans are stripped first — v9's only other deltas, strip-proven in the G1 suite)");
  check(blockE2.includes("match /branding/{kind}") &&
        blockE2.includes("allow read: if canAccess(uid);") &&
        blockE2.includes("allow create, update, delete: if isBusinessOwner(uid);") &&
        blockStart > rulesE2.indexOf("match /users/{uid}"),
    "rules: the branding block sits inside the tenant match — every role READS (every desk prints branded paper), the OWNER alone creates / updates / deletes (FR2 same-check amendment: the leg is now isBusinessOwner — uid match OR registry leg — so a generated business's owner manages brand assets exactly as a legacy owner does; staff gain nothing)");

  /* ---- seed regression: branding is not journal data ---- */
  const normalizedE2 = journal.map((e) => { const { ts, ...rest } = e; return rest; });
  const shaE2 = crypto.createHash("sha256").update(JSON.stringify(normalizedE2), "utf8").digest("hex");
  const allRangeE2 = reports.resolveReportRange("custom", null, { from: "2000-01-01", to: "2100-12-31" });
  const tbE2 = reports.trialBalance(journal, allRangeE2);
  check(journal.length === 21 && shaE2 === "e17e5bda19e87de698b0c0a37e923f9b396bc387e2092b2ffbbd7d60d4971168" &&
        eq(ledger.accountBalance(journal, "inventory"), 272805) &&
        eq(ledger.cashBalance(journal), 50000) &&
        eq(ledger.payablesTotal(journal), 27900) &&
        eq(ledger.receivablesTotal(journal), 5500) &&
        eq(tbE2.totalDebits, tbE2.totalCredits),
    "seed regression: the frozen identities stand — 21 entries, the seed-journal SHA, inventory 272,805 / cash 50,000 / payables 27,900 / receivables 5,500, trial balance zero. Brand assets are documents beside the journal, never entries in it");
}

/* ================================ E3 ================================ */
suite("E3", null); // Phase E · E3 — Raast QR: IBAN validation, the P2P payload + parser, the framing seam, print resolution (design §3)
{
  const R = raast;
  const IBAN_SCBL = "PK36SCBL0000001123456702"; // the published IBAN-registry example for Pakistan
  const IBAN_MEZN = "PK56MEZN0001234567890123";
  const IBAN_UNIL = "PK74UNIL0109000123456789";
  const IBAN_HABB = "PK84HABB0010020801234503";
  const IBAN_MUCB = "PK63MUCB0001234567890456";
  const IBAN_ABPA = "PK32ABPA0010001234567890";
  const IBAN_NBPA = "PK51NBPA1234567890123456";

  /* ---- the framing seam: shipped PROVISIONAL, and it says so ---- */
  check(R.RAAST_FRAMING.mode === "bare" && R.RAAST_FRAMING.status === "provisional" && R.RAAST_FRAMING.pinnedBy === null,
    "seam: RAAST_FRAMING ships bare + PROVISIONAL + unpinned — the owner's bank-app QR has not yet pinned the framing (design §3.3), and the generated path is nowhere claimed verified");
  check(R.RAAST_SAMPLE_IBAN === IBAN_SCBL && R.validatePkIban(R.RAAST_SAMPLE_IBAN).ok === true,
    "seam: the demo sample is the published registry example IBAN — checksum-valid, a format sample rather than anyone's account (§7)");

  /* ---- CRC-16/CCITT known answers ---- */
  check(R.crc16Ccitt("123456789") === 0x29b1 && R.crc16CcittHex("123456789") === "29B1",
    "crc: the canonical known answer — CRC-16/CCITT-FALSE of \"123456789\" is 0x29B1");
  check(R.crc16Ccitt("") === 0xffff && R.crc16Ccitt("A") === 0xb915,
    "crc: the empty string keeps the 0xFFFF init; \"A\" gives 0xB915");
  {
    // An independent, table-driven implementation must agree
    // with the shipped bitwise one everywhere sampled — two
    // implementations, one algorithm.
    const table = [];
    for (let n = 0; n < 256; n++) {
      let c = n << 8;
      for (let k = 0; k < 8; k++) c = c & 0x8000 ? (c << 1) ^ 0x1021 : c << 1;
      table[n] = c & 0xffff;
    }
    const crcT = (s) => {
      let c = 0xffff;
      for (let i = 0; i < s.length; i++) c = ((c << 8) ^ table[((c >> 8) ^ s.charCodeAt(i)) & 0xff]) & 0xffff;
      return c;
    };
    const samples = ["", "A", "123456789", "Raast", IBAN_SCBL,
      "00020111023003Standard Chartered04" + IBAN_SCBL + "10",
      "0002020102120202300318Meezan Bank0424" + IBAN_MEZN + "1004"];
    check(samples.every((s) => crcT(s) === R.crc16Ccitt(s)),
      "crc: the shipped bitwise CRC and an independent table-driven one agree on every sampled string");
  }

  /* ---- IBAN validation: the valid vectors ---- */
  check([IBAN_SCBL, IBAN_MEZN, IBAN_UNIL, IBAN_HABB, IBAN_MUCB, IBAN_ABPA, IBAN_NBPA]
        .every((i) => R.validatePkIban(i).ok === true),
    "iban: the published example and six bank fixtures (SCBL/MEZN/UNIL/HABB/MUCB/ABPA/NBPA) all validate");
  check(R.validatePkIban("pk36 scbl 0000 0011 2345 6702").ok === true &&
        R.validatePkIban(" PK56-MEZN-0001-2345-6789-0123 ").ok === true &&
        R.validatePkIban("pk36scbl0000001123456702").iban === IBAN_SCBL,
    "iban: entry normalisation — spaces, dashes, case and padding all fold to the bare 24 characters");
  check(R.pkIbanWithCheckDigits("SCBL", "0000001123456702") === IBAN_SCBL &&
        R.pkIbanWithCheckDigits("MEZN", "0001234567890123") === IBAN_MEZN,
    "iban: the check-digit composer reproduces the published example from its parts (98 − mod-97)");
  check(R.groupIban(IBAN_SCBL) === "PK36 SCBL 0000 0011 2345 6702",
    "iban: display grouping in fours — the form paper and screen both print");

  /* ---- IBAN validation: refusal, with the right reasons ---- */
  check(R.validatePkIban("").code === "empty" && R.validatePkIban(null).code === "empty" &&
        R.validatePkIban(undefined).code === "empty",
    "iban: empty input is its own code (Settings treats it as 'feature off', never an error)");
  check(R.validatePkIban("03001234567").code === "alias" &&
        R.validatePkIban("0300-1234567").code === "alias" &&
        R.validatePkIban("+92 300 1234567").code === "alias" &&
        R.validatePkIban("923001234567").code === "alias",
    "iban: a Raast ALIAS (mobile number, in any of its written forms) is REFUSED with the alias code — the P2P template has no alias object (§3.2)");
  check(R.validatePkIban("GB29NWBK60161331926819").code === "notPk" &&
        R.validatePkIban("123456789012345678901234").code === "notPk",
    "iban: a non-PK IBAN is refused (Raast is domestic), and a bare 24-digit string is not an IBAN");
  check(R.validatePkIban("PK36SCBL000000112345670").code === "badLength" &&
        R.validatePkIban("PK36SCBL00000011234567021").code === "badLength",
    "iban: 23 or 25 characters is badLength — a missing or extra character, caught before structure");
  check(R.validatePkIban("PK36SCBL00000011234567AB").code === "badStructure" &&
        R.validatePkIban("PK36SCB10000001123456702").code === "badStructure",
    "iban: letters in the account segment, or a digit inside the bank code, is badStructure");
  {
    // mod-97 detects EVERY single-character substitution:
    // the difference is (Δ·10^k) with |Δ| ≤ 25 and 97 prime,
    // so it can never be ≡ 0 (mod 97). Corrupt each position
    // of a fixture in turn and require refusal — with the
    // checksum code wherever the structure survives.
    let allRefused = true;
    let allChecksum = true;
    for (let i = 2; i < IBAN_MEZN.length; i++) {
      const ch = IBAN_MEZN[i];
      const repl = /[0-9]/.test(ch)
        ? String((Number(ch) + 1) % 10)
        : ch === "Z" ? "A" : String.fromCharCode(ch.charCodeAt(0) + 1);
      const corrupted = IBAN_MEZN.slice(0, i) + repl + IBAN_MEZN.slice(i + 1);
      const res = R.validatePkIban(corrupted);
      if (res.ok) allRefused = false;
      else if (res.code !== "badChecksum") allChecksum = false;
    }
    check(allRefused && allChecksum,
      "iban: EVERY single-character corruption of a valid IBAN (all 22 positions) is refused, each with badChecksum — a typo'd digit is caught at the desk");
  }
  check(R.validatePkIban("PK00MEZN0001234567890123").code === "badChecksum",
    "iban: zeroed check digits fail the checksum even with perfect structure");

  /* ---- FI name ---- */
  check(R.validateRaastFiName("  Meezan Bank ").ok === true &&
        R.validateRaastFiName("  Meezan Bank ").value === "Meezan Bank" &&
        R.validateRaastFiName("").ok === true && R.validateRaastFiName(null).ok === true,
    "fi: the bank name trims; empty is simply absent (object 03 is optional)");
  check(R.validateRaastFiName("A".repeat(26)).code === "fiTooLong" &&
        R.validateRaastFiName("میزان بینک").code === "fiBadChars" &&
        R.validateRaastFiName("A".repeat(25)).ok === true,
    "fi: 25 characters is the cap (26 refuses), and non-ASCII refuses — the payload's class is ASCII (§3.3)");

  /* ---- amount formatting (§3.3) ---- */
  check(R.formatRaastAmount(1500) === "1500" && R.formatRaastAmount(1500.5) === "1500.5" &&
        R.formatRaastAmount(1500.50) === "1500.5" && R.formatRaastAmount(4880.73) === "4880.73" &&
        R.formatRaastAmount(0.5) === "0.5" && R.formatRaastAmount(9999999.99) === "9999999.99",
    "amount: integers plain, one decimal kept, trailing zeros trimmed, no separators — up to the 10-character object limit");
  {
    let threw = 0;
    for (const [amt, code] of [[99999999.99, "amountTooLong"], [0, "badAmount"], [-5, "badAmount"], [NaN, "badAmount"]]) {
      try { R.formatRaastAmount(amt); } catch (e) { if (e.code === code) threw++; }
    }
    check(threw === 4,
      "amount: an 11-character amount, zero, a negative and NaN each refuse at composition with their codes — the builder never emits an over-length object");
  }

  /* ---- the builder, bare seam (the shipped provisional framing) ---- */
  const STATIC_FIXTURE = "00020111023003Standard Chartered04" + IBAN_SCBL + "10E600";
  const DYNAMIC_FIXTURE = "00020112023004" + IBAN_SCBL + "054880.7306Bill #1011009B3";
  check(R.buildRaastP2pPayload({ iban: IBAN_SCBL, fiName: "Standard Chartered" }) === STATIC_FIXTURE,
    "builder (bare): the static fixture byte-for-byte — PFI 02, initiation 11, scheme 30 (Raast), FI name, IBAN, CRC E600 over the payload + \"10\"");
  check(R.buildRaastP2pPayload({ iban: IBAN_SCBL, amount: 4880.73, particulars: R.billParticulars(101) }) === DYNAMIC_FIXTURE,
    "builder (bare): the dynamic fixture byte-for-byte — initiation 12, the amount object, \"Bill #101\" particulars, CRC 09B3");
  check(R.billParticulars(7) === "Bill #7" && R.billParticulars("QT-9") === "Bill #QT-9",
    "builder: the particulars is the bill label and nothing else — ASCII by construction (§3.3)");

  /* ---- round-trips: builder and parser prove each other ---- */
  const rtCases = [
    { iban: IBAN_MEZN },
    { iban: IBAN_MEZN, fiName: "Meezan Bank" },
    { iban: IBAN_UNIL, amount: 250 },
    { iban: IBAN_HABB, fiName: "Habib Bank", amount: 1500.5, particulars: "Bill #42" },
    { iban: IBAN_MUCB, particulars: "Bill #9" },
    { iban: IBAN_NBPA, fiName: "National Bank", amount: 9999999.99, particulars: "Bill #100000" },
  ];
  for (const framing of ["bare", "tlv"]) {
    const allOk = rtCases.every((input) => {
      const payload = R.buildRaastP2pPayload(input, framing);
      const parsed = R.parseRaastP2pPayload(payload, framing);
      if (!parsed.ok) return false;
      const o = parsed.objects;
      return o.pfi === "02" && o.scheme === "30" && o.iban === input.iban &&
        o.initiation === (input.amount !== undefined ? "12" : "11") &&
        o.fiName === (input.fiName || undefined) &&
        o.amount === (input.amount !== undefined ? R.formatRaastAmount(input.amount) : undefined) &&
        o.particulars === (input.particulars || undefined) &&
        typeof o.crc === "string" && o.crc.length === 4;
    });
    check(allOk,
      `round-trip (${framing}): every builder output parses back object-by-object — FI/amount/particulars presence and the dynamic ⇔ initiation-12 correspondence exact, CRC verifying`);
  }
  check(R.buildRaastP2pPayload({ iban: IBAN_SCBL, fiName: "Standard Chartered" }, "tlv")
        .startsWith("0002020102110202300318Standard Chartered0424" + IBAN_SCBL),
    "builder (tlv): the alternative framing frames every object id + 2-digit length — the seam's other hypothesis, one constant away");
  check(R.parseRaastP2pPayload(STATIC_FIXTURE, "tlv").ok === false &&
        R.parseRaastP2pPayload(R.buildRaastP2pPayload({ iban: IBAN_MEZN }, "tlv"), "bare").ok === false,
    "parser: the two framings do NOT cross-parse — framing is a real distinction, which is why the seam exists and the fixture must pin it");
  {
    const tampered = DYNAMIC_FIXTURE.slice(0, -1) + (DYNAMIC_FIXTURE.endsWith("0") ? "1" : "0");
    const midTamper = DYNAMIC_FIXTURE.replace("4880.73", "4880.74");
    check(R.parseRaastP2pPayload(tampered).ok === false && R.parseRaastP2pPayload(midTamper).ok === false &&
          R.parseRaastP2pPayload("00020111023004" + IBAN_MEZN).ok === false,
      "parser: a flipped CRC digit, a flipped amount digit, and a truncated payload are all rejected — the CRC is verified, never assumed");
  }
  {
    let codes = [];
    for (const [input, code] of [
      [{ iban: "03001234567" }, "iban:alias"],
      [{ iban: IBAN_MEZN, amount: 99999999.99 }, "amountTooLong"],
      [{ iban: IBAN_MEZN, particulars: "بل #5" }, "badParticulars"],
      [{ iban: IBAN_MEZN, particulars: "x".repeat(31) }, "badParticulars"],
      [{ iban: IBAN_MEZN, fiName: "A".repeat(26) }, "fiName:fiTooLong"],
    ]) {
      try { R.buildRaastP2pPayload(input); codes.push("NO-THROW"); }
      catch (e) { codes.push(e.code); }
    }
    check(codes.join(",") === "iban:alias,amountTooLong,badParticulars,badParticulars,fiName:fiTooLong",
      "builder guards: an alias IBAN, an over-length amount, Urdu or 31-char particulars, and a 26-char FI name each refuse with their codes — never a malformed payload");
  }

  /* ---- the QR matrix fixture (the reference encoder, pinned) ---- */
  check(qrLib.QR_ERROR_CORRECTION === "M" && qrLib.QR_QUIET_ZONE_MODULES === 4,
    "qr: error-correction level M (the payment-QR convention, §3.7) and the 4-module quiet zone");
  {
    const FIXTURE_ROWS = [
      "#######.###........###...#.#..#######",
      "#.....#..#..#.###..#...###....#.....#",
      "#.###.#......#.###...##.#...#.#.###.#",
      "#.###.#.####..#..##.#....###..#.###.#",
      "#.###.#.#.##.#...#..#..#.####.#.###.#",
      "#.....#.###.#.####.##....##.#.#.....#",
      "#######.#.#.#.#.#.#.#.#.#.#.#.#######",
      "........###.##.##....#....#.#........",
      "#...#.#####.#..##..##.....#.######..#",
      ".##.......#..##...##..#.##.#.#.##..#.",
      "..##.###..##.#.#.#.#.####..###..####.",
      ".##..#...#...#####.###.#..####...###.",
      "...#..#..###..#......##.#...#.#..##.#",
      "#.#..#..##...#..#.#.###..##.##.##..#.",
      ".#.#..#...##..####.....#...#.#.#.###.",
      "##.###...#...##.###.#.##....#.#..###.",
      "....###.###.......##..#.##..#.#..##.#",
      ".#.#....####.##.##.##.....##.#.##..#.",
      "###...#..#.#....#...#.#..###.#.#.###.",
      "###..#..#.#.#....##..##.#....##..###.",
      ".###..##..#..###.########...#.#..##.#",
      ".##.##.##..##...##....######.#.##..#.",
      "...#..##.##....#..#.####..###..#.#.#.",
      "#......#.##.....#...##.##.####...###.",
      "....#####.##.#..#..##...#.#.#.#..##.#",
      "##.##......#..#...##..#.##.#.#.##..#.",
      "..#..##.#...##.#...#.#.#..####.#.###.",
      "........###.##.#########......#..###.",
      "##.#.##.##.##....##.###.#...#######.#",
      "........#.......#....#.#.####...#..#.",
      "#######.#####..#.#.....#.##.#.#.####.",
      "#.....#..#.#....####..#....##...####.",
      "#.###.#.#.###.#...##..#...#.########.",
      "#.###.#..####.#.#..##..###....#.....#",
      "#.###.#..#..#...#.#.##.#...##.#..##..",
      "#.....#.....###..#...#.#..#....#.###.",
      "#######.#..##..##..#.##......########",
    ];
    const m = qrLib.qrModuleRows(STATIC_FIXTURE);
    check(m.size === 37 && JSON.stringify(m.rows) === JSON.stringify(FIXTURE_ROWS),
      "qr: the reference encoder's 37×37 module matrix for the static fixture payload, pinned byte-for-byte — any encoder or payload drift breaks this anchor");
    const m2 = qrLib.qrModuleRows(STATIC_FIXTURE);
    check(JSON.stringify(m2.rows) === JSON.stringify(m.rows),
      "qr: the matrix is deterministic across calls (auto version, byte mode, EC M)");
  }

  /* ---- resolveRaastBlock: which path prints (§3.4/§3.5) ---- */
  const baseInput = {
    enabled: true, imagePresent: false, iban: IBAN_MEZN, fiName: "Meezan Bank",
    size: "m", thermal: false,
  };
  const billDoc = (over) => ({ kind: "bill", billNo: 101, total: 4880.73, dynamic: true, ...over });
  check(R.resolveRaastBlock({ ...baseInput, enabled: false, doc: billDoc() }).path === "none" &&
        R.resolveRaastBlock({ ...baseInput, doc: { kind: "other" } }).path === "none" &&
        R.resolveRaastBlock({ ...baseInput, doc: { kind: "other" }, imagePresent: true }).path === "none",
    "resolve: the showRaastQr toggle off ⇒ nothing, and documents outside bill/quotation/order/poster never carry a Raast block (§1.5) — even with an image uploaded");
  {
    const img = R.resolveRaastBlock({ ...baseInput, imagePresent: true, doc: billDoc() });
    const imgNoIban = R.resolveRaastBlock({ ...baseInput, imagePresent: true, iban: null, doc: billDoc() });
    check(img.path === "image" && img.iban === IBAN_MEZN &&
          imgNoIban.path === "image" && imgNoIban.iban === null,
      "resolve: the bank-issued IMAGE wins whenever it exists (Path 1) — the generated path steps aside; the IBAN text line rides only when an IBAN is also on record");
  }
  {
    const dyn = R.resolveRaastBlock({ ...baseInput, doc: billDoc() });
    const parsed = dyn.path === "generated" ? R.parseRaastP2pPayload(dyn.payload) : null;
    check(dyn.path === "generated" && dyn.dynamic === true && parsed !== null && parsed.ok &&
          parsed.objects.amount === "4880.73" && parsed.objects.particulars === "Bill #101" &&
          parsed.objects.initiation === "12",
      "resolve: a dynamic bill QR carries the bill TOTAL + \"Bill #101\" — what the bill charges, reconcilable by number (§3.4)");
    const stat = R.resolveRaastBlock({ ...baseInput, doc: billDoc({ dynamic: false }) });
    const sp = stat.path === "generated" ? R.parseRaastP2pPayload(stat.payload) : null;
    check(stat.path === "generated" && stat.dynamic === false && sp !== null && sp.ok &&
          sp.objects.amount === undefined && sp.objects.particulars === "Bill #101" &&
          sp.objects.initiation === "11",
      "resolve: dynamic off ⇒ a static bill code (no amount object) that still carries the bill number");
    const zero = R.resolveRaastBlock({ ...baseInput, doc: billDoc({ total: 0 }) });
    const zp = zero.path === "generated" ? R.parseRaastP2pPayload(zero.payload) : null;
    check(zero.path === "generated" && zero.dynamic === false && zp !== null && zp.ok &&
          zp.objects.amount === undefined,
      "resolve: a zero-total bill never embeds a zero amount — it falls back to the static code");
  }
  {
    const quote = R.resolveRaastBlock({ ...baseInput, doc: { kind: "quotation" } });
    const order = R.resolveRaastBlock({ ...baseInput, doc: { kind: "order" } });
    const poster = R.resolveRaastBlock({ ...baseInput, doc: { kind: "poster" } });
    const qp = quote.path === "generated" ? R.parseRaastP2pPayload(quote.payload) : null;
    check(qp !== null && qp.ok && qp.objects.amount === undefined && qp.objects.particulars === undefined &&
          order.path === "generated" && poster.path === "generated",
      "resolve: quotations, orders and the counter poster are STATIC, always — an estimate never hardens into a payment demand (§3.4)");
  }
  check(R.resolveRaastBlock({ ...baseInput, iban: "PK00MEZN0001234567890123", doc: billDoc() }).path === "none" &&
        R.resolveRaastBlock({ ...baseInput, iban: null, doc: billDoc() }).path === "none" &&
        R.resolveRaastBlock({ ...baseInput, iban: "03001234567", doc: billDoc() }).path === "none",
    "resolve: no valid IBAN and no image ⇒ no block — a checksum-failing IBAN or an alias in settings (however it got there) prints nothing");
  check(R.raastQrSizeMm("s", false) === 22 && R.raastQrSizeMm("m", false) === 28 && R.raastQrSizeMm("l", false) === 36 &&
        R.raastQrSizeMm("l", true) === 28 && R.raastQrSizeMm("m", true) === 28 && R.raastQrSizeMm("s", true) === 22,
    "resolve: sizes s/m/l = 22/28/36mm on paper; thermal caps at 28mm whatever the template asks (§3.5)");

  /* ---- i18n: parity + the honesty wording is really there ---- */
  check(Object.keys(i18n.en).length === 3136 && Object.keys(i18n.ur).length === 3136,
    "i18n: the dictionary now carries 3,054 keys, EN ≡ UR (E3 pin amendment: +35 Raast keys — 34 print.raast + billing.wa.raastLine); E4 pin amendment: +49 pin keys; F5 pin amendment: +1 sync.online key; G1 pin amendment: +8 biz keys; G2 pin amendment: +36 plan keys; G3 pin amendment: +89 platform keys; G4 pin amendment: +47 keys (35 renew.* + 12 platform.*); G6 pin amendment: +25 backup.* keys; H1 pin amendment: +51 loyalty keys; H3 pin amendment: +108 storefront keys; WA pin amendment: +109 WhatsApp keys");
  check(i18n.en["print.raast.provisional"].includes("pending verification") &&
        i18n.ur["print.raast.provisional"].includes("تصدیق باقی") &&
        i18n.en["print.raast.honest"].includes("has not yet been verified") &&
        i18n.en["billing.wa.raastLine"].includes("{iban}") &&
        !i18n.en["print.raast.pathGenerated"].toLowerCase().includes("verified") &&
        i18n.en["print.raast.pathImage"].toLowerCase().includes("verified path"),
    "i18n honesty: the generated path is labelled 'pending verification' in BOTH languages and 'not yet been verified' in the explainer; only the bank-image path is called verified; the WhatsApp line carries the IBAN placeholder");

  /* ---- source invariants: purity, the seam's isolation, wiring ---- */
  const raastSrc = fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/lib/raast.ts", "utf8");
  const qrSrc = fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/lib/qr.ts", "utf8");
  check(!/makeEntry|guardPostings|postEntry|writeBatch|setDoc|addDoc|firebase/.test(raastSrc) &&
        !/makeEntry|guardPostings|postEntry|writeBatch|setDoc|addDoc|firebase/.test(qrSrc),
    "source: neither Raast module touches a posting path, the store or Firestore — Phase E posts NOTHING (invariant 1)");
  {
    const chromeSrc = fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/components/PrintChrome.tsx", "utf8");
    const qrComponentSrc = fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/components/QrCode.tsx", "utf8");
    const settingsSrc = fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/components/RaastSettings.tsx", "utf8");
    const sheetSrc = fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/components/DocPrintSheet.tsx", "utf8");
    check(!/frameObject|crcObjectFor|RAAST_FRAMING/.test(chromeSrc + qrComponentSrc + settingsSrc) &&
          (raastSrc.match(/frameObject\(/g) || []).length >= 3,
      "source: the framing decision exists ONLY inside lib/raast (frameObject/crcObjectFor + the RAAST_FRAMING seam) — no component frames, prefixes or checksums a payload");
    check(chromeSrc.includes("resolveRaastBlock") && chromeSrc.includes("QrCode") &&
          sheetSrc.includes("billNo: bill.billNo") && sheetSrc.includes("total: bill.total"),
      "source: the footer resolves its Raast block through lib/raast and renders the one QrCode component; the bill sheet passes its number + total into the footer");
    check(qrComponentSrc.includes("#ffffff") && qrComponentSrc.includes("#000000") &&
          !/var\(--/.test(qrComponentSrc),
      "source: the QR renders black on white, hard-coded — no theme token can reach the matrix (invariant 3's sharpest case)");
  }
  check((fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx", "utf8")
        .match(/makeEntry\(/g) || []).length === 24,
    "source: still exactly 24 makeEntry calls in the store — E3 composed no entry, template or refType");
  check(!/raastIban|raastFiName/.test(fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/lib/seed.ts", "utf8")) &&
        !/raastIban/.test(fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/lib/seed-data.json", "utf8")),
    "source: the seed ships no Raast IBAN — absence is the default, and a shop that never opens the Raast card prints exactly what it printed before E3 (§10.2)");

  /* ---- rules: E3 changes none ---- */
  check(crypto.createHash("sha256")
        .update(stripG1Blocks(stripG2Blocks(fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8"))), "utf8")
        .digest("hex") === "04807268c2c1891c070e1cc34443fe4c3892ea35dde739718499e392c661f859",
    "rules: the file is byte-identical to the pre-E3 file (SHA pinned) — Raast rides the owner settings doc + the existing branding match; E3 adds no rules (G1 same-check amendment: the four G1 spans are stripped first — v9's only other deltas, strip-proven in the G1 suite)");

  /* ---- seed regression: Raast is not journal data ---- */
  const journal = seed.getSeedJournal(products, sales, purchases, payments, expenses, credits);
  const normalizedE3 = journal.map((e) => { const { ts, ...rest } = e; return rest; });
  const shaE3 = crypto.createHash("sha256").update(JSON.stringify(normalizedE3), "utf8").digest("hex");
  const allRangeE3 = reports.resolveReportRange("custom", null, { from: "2000-01-01", to: "2100-12-31" });
  const tbE3 = reports.trialBalance(journal, allRangeE3);
  check(journal.length === 21 && shaE3 === "e17e5bda19e87de698b0c0a37e923f9b396bc387e2092b2ffbbd7d60d4971168" &&
        eq(ledger.accountBalance(journal, "inventory"), 272805) &&
        eq(ledger.cashBalance(journal), 50000) &&
        eq(ledger.payablesTotal(journal), 27900) &&
        eq(ledger.receivablesTotal(journal), 5500) &&
        eq(tbE3.totalDebits, tbE3.totalCredits),
    "seed regression: the frozen identities stand — 21 entries, the seed-journal SHA, inventory 272,805 / cash 50,000 / payables 27,900 / receivables 5,500, trial balance zero. A QR is a rendering of a settings string, never an entry in the journal");
}

/* =============================== G1 (Phase G · G1 — tenancy foundation) =============================== */
{
  suite("G1", null);
  const NOW = "2026-10-23T00:00:00.000Z";
  const A = "bizA";
  const B = "bizB";
  const rulesG1 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8");
  const readSrc = (p) => fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/" + p, "utf8");

  /* ---- the resolver truth table (design §1.3/§6.2) ---- */
  const MIRROR_A = ["staff@a.pk", "both@a.pk"];
  const member = (role, source) =>
    role === undefined
      ? { email: "staff@a.pk", addedBy: A, addedAt: NOW, source: source ?? "invite" }
      : { email: "staff@a.pk", role, addedBy: A, addedAt: NOW, source: source ?? "invite" };
  const res = (over) =>
    tenancy.resolveAccess({
      callerUid: "u-x", callerEmail: "staff@a.pk", businessId: A,
      staffEmails: MIRROR_A, membership: null, staffIndex: null,
      ...over,
    });

  let r = res({ callerUid: A, callerEmail: "owner@a.pk" });
  check(r.access && r.role === "owner" && r.via === "owner",
    "resolver: the owner resolves as owner in their own business (uid match)");
  r = res({ callerUid: "u-mgr", membership: member("manager") });
  check(r.access && r.role === "manager" && r.via === "membership",
    "resolver: a claimed membership grants its role (manager)");
  r = res({ callerUid: "u-cash", membership: member("cashier") });
  check(r.access && r.role === "cashier" && r.via === "membership",
    "resolver: a claimed membership grants its role (cashier)");
  r = res({ callerUid: "u-norole", membership: member(undefined, "staff") });
  check(r.access && r.role === "manager" && r.via === "membership",
    "resolver: a membership doc WITHOUT a role resolves to manager — the legacy default, on the new leg too");
  r = res({ callerUid: "u-leg", staffIndex: { ownerUid: A, role: "accountant" } });
  check(r.access && r.role === "accountant" && r.via === "legacy",
    "resolver: a pre-G staff member with no membership still resolves through the legacy staffIndex leg");
  r = res({ callerUid: "u-leg2", staffIndex: { ownerUid: A } });
  check(r.access && r.role === "manager" && r.via === "legacy",
    "resolver: a legacy staffIndex doc without a role resolves to manager");
  r = res({ callerUid: "u-stranger", callerEmail: "nobody@x.pk" });
  check(!r.access && r.role === "none" && r.via === null,
    "resolver: a stranger — no membership, no index, not on the mirror — is denied (this is also the state of a merely INVITED email: an unclaimed invite confers nothing)");
  r = res({
    callerUid: "u-removed", callerEmail: "gone@a.pk", staffEmails: ["staff@a.pk"],
    membership: { email: "gone@a.pk", role: "manager", addedBy: A, addedAt: NOW, source: "invite" },
  });
  check(!r.access && r.via === null,
    "resolver: a REMOVED member is denied even though their membership doc still exists — the removal cut the staffEmails mirror, and the membership leg requires the mirror (R-G4: the next read denies)");
  r = res({ callerUid: "u-mem", membership: member("manager"), staffIndex: null });
  check(r.access && r.via === "membership",
    "resolver: with staffIndex deleted, the membership leg alone grants — the legs are independent by design");
  r = res({
    callerUid: "u-div", membership: member("cashier"),
    staffIndex: { ownerUid: A, role: "accountant" },
  });
  check(r.access && r.role === "cashier" && r.via === "membership",
    "resolver: when both legs could grant, the MEMBERSHIP role wins — it is the G-era record (amendment #1's order)");
  /* cross-business isolation: the same person, resolved against B */
  r = tenancy.resolveAccess({
    callerUid: "u-both", callerEmail: "both@a.pk", businessId: B,
    staffEmails: ["other@b.pk"], membership: null,
    staffIndex: { ownerUid: A, role: "manager" },
  });
  check(!r.access && r.via === null,
    "isolation: a member of A read against business B (not a member there; their staffIndex points at A) is denied — membership in one business is not a skeleton key");
  const rA = res({ callerUid: "u-both", callerEmail: "both@a.pk", membership: { email: "both@a.pk", role: "manager", addedBy: A, addedAt: NOW, source: "invite" } });
  const rB = tenancy.resolveAccess({
    callerUid: "u-both", callerEmail: "both@a.pk", businessId: B,
    staffEmails: ["both@a.pk"],
    membership: { email: "both@a.pk", role: "cashier", addedBy: B, addedAt: NOW, source: "invite" },
    staffIndex: null,
  });
  check(rA.access && rA.role === "manager" && rB.access && rB.role === "cashier",
    "resolver: roles are PER-BUSINESS — the same person is manager in A and cashier in B");

  /* ---- counters + month keys (design §2.3) ---- */
  check(tenancy.pktMonthKey("2026-10-01T00:30:00.000Z") === "2026-10" &&
        tenancy.pktMonthKey("2026-10-31T20:30:00.000Z") === "2026-11",
    "counters: the month key is Asia/Karachi's — Oct 31 20:30 UTC is already November in PKT");
  const migBills = [
    { ts: "2026-10-05T10:00:00.000Z", status: "final" },
    { ts: "2026-10-06T10:00:00.000Z", status: "final" },
    { ts: "2026-10-07T10:00:00.000Z", status: "held" },
    { ts: "2026-09-15T10:00:00.000Z", status: "final" },
  ];
  const migSales = [
    { ts: "2026-10-02T09:00:00.000Z" },
    { ts: "2026-08-02T09:00:00.000Z" },
  ];
  check(tenancy.countMonthlyInvoiceEvents(migBills, migSales, tenancy.pktMonthKey(NOW)) === 3,
    "counters: the monthly invoice count is non-held bills + counter sales in the PKT month (2 + 1 = 3; the held bill never counts)");

  /* ---- the §7.2 lazy migration ---- */
  const mig = tenancy.planMigration({
    ownerUid: "own1", ownerEmail: "o@x.pk", shopName: "Madina",
    phone: "0300", staffEmails: ["ghost@x.pk"], registryExists: false,
    bills: migBills, sales: migSales, nowISO: NOW,
  });
  check(mig.length === 3 && mig.every((w) => w.kind !== "set" || !w.path.startsWith("users/")),
    "migration: exactly registry + counters + event, and NO write path enters any users/{uid} tree (the users-tree diff is empty by construction)");
  const migReg = mig.find((w) => w.kind === "set" && w.path === "businesses/own1");
  check(!!migReg && migReg.data.plan.planId === "founding" &&
        migReg.data.plan.modulesTier === "advanced" &&
        migReg.data.plan.usersLimit === 10 && migReg.data.plan.invoiceLimit === 10000 &&
        migReg.data.plan.assignedBy === "migration" && migReg.data.plan.tierRank === 3 &&
        migReg.data.plan.trialEndsAt === null && migReg.data.plan.periodTo === null &&
        migReg.data.status === "active" && migReg.data.enforce === false,
    "migration: a pre-G shop receives the FOUNDING comp assignment — Advanced limits (10 users / 10,000 invoices), no expiry of any kind (both date fields null), enforcement off (design §7.2)");
  const migCtr = mig.find((w) => w.kind === "set" && w.path === "businessCounters/own1");
  check(!!migCtr && migCtr.data.invoiceCount === 3 && migCtr.data.memberCount === 1 &&
        migCtr.data.invoiceMonth === "2026-10" && migCtr.data.baseline === "migration",
    "migration: counters initialise from a LABELLED baseline (this month's 3 invoice events, the PKT month key, memberCount = the staff mirror's size — membership DOCS wait for each staffer's own first G sign-in, the only client that knows their uid)");
  const migEvt = mig.find((w) => w.kind === "add" && w.collection === "businessEvents");
  check(!!migEvt && migEvt.data.kind === "business.migrated" && migEvt.data.actor === "own1",
    "migration: the migration itself is a businessEvents entry, written by the owner");
  check(tenancy.planMigration({
    ownerUid: "own1", ownerEmail: "o@x.pk", shopName: "Madina", phone: "0300",
    staffEmails: [], registryExists: true, bills: migBills, sales: migSales, nowISO: NOW,
  }).length === 0,
    "migration: idempotent — with the registry doc present, a second sign-in plans ZERO writes");
  {
    const journalG1 = seed.getSeedJournal(products, sales, purchases, payments, expenses, credits);
    const normG1 = journalG1.map((e) => { const { ts, ...rest } = e; return rest; });
    const shaG1 = crypto.createHash("sha256").update(JSON.stringify(normG1), "utf8").digest("hex");
    check(journalG1.length === 21 && shaG1 === "e17e5bda19e87de698b0c0a37e923f9b396bc387e2092b2ffbbd7d60d4971168" &&
          eq(ledger.accountBalance(journalG1, "inventory"), 272805) &&
          eq(ledger.cashBalance(journalG1), 50000) &&
          eq(ledger.payablesTotal(journalG1), 27900) &&
          eq(ledger.receivablesTotal(journalG1), 5500),
      "migration identity: the frozen seed stands after the G1 migration — 21 entries, the seed SHA, inventory 272,805 / cash 50,000 / payables 27,900 / receivables 5,500. Tenancy is metadata; the journal never hears about it");
  }

  /* ---- the §4.3 trial birth ---- */
  const birth = tenancy.planTrialBirth({
    ownerUid: "new1", ownerEmail: "n@x.pk", shopName: "New Shop", phone: "", nowISO: NOW,
  });
  const birthReg = birth.find((w) => w.kind === "set" && w.path === "businesses/new1");
  check(birth.length === 3 && !!birthReg &&
        birthReg.data.plan.planId === "trial" && birthReg.data.plan.usersLimit === 2 &&
        birthReg.data.plan.invoiceLimit === 200 && birthReg.data.plan.modulesTier === "standard" &&
        birthReg.data.plan.assignedBy === "signup" &&
        birthReg.data.plan.trialEndsAt === "2026-11-06T00:00:00.000Z",
    "trial birth: a new business is born on the trial snapshot (2 users / 200 invoices / standard, +14 days exactly) — never on limits it did not earn");
  check(tenancy.foundingPlanSnapshot(NOW).trialEndsAt === null &&
        tenancy.trialPlanSnapshot(NOW).trialEndsAt === "2026-11-06T00:00:00.000Z",
    "plans: the founding snapshot's expiry is null (no expiry, ever); the trial snapshot's end is start + 14d");

  /* ---- invite → claim (design §1.3) ---- */
  const invite = { email: "new@x.pk", role: "cashier", status: "pending", invitedBy: A, createdAt: NOW };
  const claim = tenancy.planClaim({
    businessId: A, callerUid: "u-new", callerEmail: "new@x.pk",
    invite, existingMembership: null, nowISO: NOW,
  });
  check(claim.ok && claim.role === "cashier" &&
        claim.writes.some((w) => w.kind === "set" && w.path === "businessMembers/bizA/members/u-new" &&
          w.data.role === "cashier" && w.data.source === "invite") &&
        claim.writes.some((w) => w.kind === "update" && w.path === "businessInvites/bizA/invites/new@x.pk" &&
          w.data.status === "claimed" && w.data.claimedBy === "u-new") &&
        claim.writes.some((w) => w.kind === "index" && w.businessId === A && w.role === "cashier") &&
        claim.writes.some((w) => w.kind === "add" && w.collection === "businessEvents" && w.data.kind === "membership.claimed"),
    "claim: a pending invite claims into a membership WITH THE INVITED ROLE, marks the invite claimed, indexes the business, and writes its audit event — one plan, one batch");
  check(tenancy.planClaim({ businessId: A, callerUid: "u-x", callerEmail: "other@x.pk", invite, existingMembership: null, nowISO: NOW }).reason === "email-mismatch",
    "claim: a signed-in account whose email is NOT the invited email cannot claim it — the invite belongs to the email, not to whoever finds it");
  check(tenancy.planClaim({ businessId: A, callerUid: "u-x", callerEmail: "new@x.pk", invite: null, existingMembership: null, nowISO: NOW }).reason === "no-invite" &&
        tenancy.planClaim({ businessId: A, callerUid: "u-x", callerEmail: "new@x.pk", invite: { ...invite, status: "claimed" }, existingMembership: null, nowISO: NOW }).reason === "already-claimed" &&
        tenancy.planClaim({ businessId: A, callerUid: "u-x", callerEmail: "new@x.pk", invite: { ...invite, status: "revoked" }, existingMembership: null, nowISO: NOW }).reason === "not-pending",
    "claim: no invite → refused; an invite claimed by SOMEONE ELSE → refused; a non-pending invite → refused");
  const reclaim = tenancy.planClaim({
    businessId: A, callerUid: "u-new", callerEmail: "new@x.pk",
    invite: { ...invite, status: "claimed", claimedBy: "u-new", claimedAt: NOW },
    existingMembership: { email: "new@x.pk", role: "cashier", addedBy: A, addedAt: NOW, source: "invite" },
    nowISO: NOW,
  });
  check(reclaim.ok && reclaim.writes.length === 0,
    "claim: the SAME member re-claiming is an idempotent no-op — a second device does not churn the membership");
  const claimNoRole = tenancy.planClaim({
    businessId: A, callerUid: "u-nr", callerEmail: "nr@x.pk",
    invite: { email: "nr@x.pk", status: "pending", invitedBy: A, createdAt: NOW },
    existingMembership: null, nowISO: NOW,
  });
  check(claimNoRole.ok && claimNoRole.role === "manager",
    "claim: an invite carrying no role claims as manager — the standing default");

  /* ---- the legacy backfill (§7.2) ---- */
  const bf = tenancy.planLegacyBackfill({
    businessId: A, callerUid: "u-old", callerEmail: "old@x.pk",
    staffIndex: { ownerUid: A, email: "old@x.pk", role: "accountant" },
    existingMembership: null, nowISO: NOW,
  });
  check(bf.length === 3 &&
        bf.some((w) => w.kind === "set" && w.path === "businessMembers/bizA/members/u-old" && w.data.source === "staff" && w.data.role === "accountant") &&
        bf.some((w) => w.kind === "add" && w.data.kind === "membership.backfilled"),
    "backfill: a legacy member's first G sign-in mirrors their staffIndex relationship into a membership (source 'staff', role carried) + index + audit event");
  check(tenancy.planLegacyBackfill({
    businessId: A, callerUid: "u-old", callerEmail: "old@x.pk",
    staffIndex: { ownerUid: B, email: "old@x.pk", role: "accountant" },
    existingMembership: null, nowISO: NOW,
  }).length === 0 &&
  tenancy.planLegacyBackfill({
    businessId: A, callerUid: "u-old", callerEmail: "old@x.pk",
    staffIndex: { ownerUid: A, email: "old@x.pk", role: "accountant" },
    existingMembership: { businessId: A, memberUid: "u-old", email: "old@x.pk", role: "accountant", source: "staff", joinedAt: NOW },
    nowISO: NOW,
  }).length === 0,
    "backfill: nothing is written when the index points at ANOTHER business, or when the membership already exists");

  /* ---- the switcher index (design §1.4) ---- */
  const healed = tenancy.healIndex(
    [{ businessId: A, role: "manager" }, { businessId: B, role: "manager" }],
    { [A]: { businessId: A, memberUid: "u1", email: "e@x.pk", role: "cashier", source: "invite", joinedAt: NOW }, [B]: null }
  );
  check(healed.kept.length === 1 && healed.kept[0].businessId === A && healed.kept[0].role === "cashier" &&
        healed.dropped.length === 1 && healed.dropped[0] === B,
    "switcher healing: an entry whose membership doc is gone DROPS OUT (and is reported); a surviving entry's role refreshes from the membership doc — the index can drift, the memberships cannot lie");
  const switcherList = tenancy.buildSwitcherList({
    own: { businessId: "me", name: "My Shop" },
    entries: [{ businessId: "z9", role: "manager" }, { businessId: "a1", role: "cashier" }],
    names: { z9: "Zed Traders", a1: "Alpha Store" },
  });
  check(switcherList.length === 3 && switcherList[0].own === true &&
        switcherList[1].name === "Alpha Store" && switcherList[2].name === "Zed Traders",
    "switcher: own business first, memberships after, sorted by display name");
  check(tenancy.indexWith([{ businessId: A, role: "manager" }], { businessId: A, role: "cashier" }).length === 1 &&
        tenancy.membershipStatusFor("a@x.pk", [{ email: "a@x.pk" }], []) === "joined" &&
        tenancy.membershipStatusFor("b@x.pk", [], [{ email: "b@x.pk", status: "pending" }]) === "pending" &&
        tenancy.membershipStatusFor("c@x.pk", [], []) === "legacy",
    "switcher/settings: the index upsert dedupes by business; the staff-row chip reads joined / pending / legacy from memberships + invites");

  /* ---- rules v9 part 1 (design §6) ---- */
  check(crypto.createHash("sha256").update(stripG1Blocks(stripG2Blocks(rulesG1)), "utf8").digest("hex") ===
        "04807268c2c1891c070e1cc34443fe4c3892ea35dde739718499e392c661f859",
    "rules: STRIP PROOF — v9 minus the four delimited G1 spans (header note, amendment #1 restored to the exact v8 text, helpers, platform blocks) is byte-for-byte the v8 file (its pinned SHA). Additive except the ONE named amendment (G3 same-check amendment: the shared strip helpers first cut the delimited G3 span — a pure addition after the G1 span, strip-proven against the pre-G3 v9 SHA in the G3 suite)");
  check(rulesG1.includes("v9 vs v8:") &&
        rulesG1.includes("match /businesses/{businessId}") &&
        rulesG1.includes("match /businessMembers/{businessId}") &&
        rulesG1.includes("match /businessInvites/{businessId}") &&
        rulesG1.includes("match /userMemberships/{memberUid}") &&
        rulesG1.includes("match /businessCounters/{businessId}") &&
        rulesG1.includes("match /platformAdmins/{adminUid}") &&
        rulesG1.includes("match /businessEvents/{eventId}"),
    "rules: all seven platform collections exist as designed (§1.2) — registry, members, invites, switcher index, counters, admins, audit log");
  const g1Span = rulesG1.slice(rulesG1.indexOf("// ---- Phase G · G1: platform collections (START)"));
  check(g1Span.includes("match /businessEvents/{eventId}") &&
        g1Span.slice(g1Span.indexOf("match /businessEvents")).includes("allow update, delete: if false;") &&
        g1Span.slice(g1Span.indexOf("match /businessCounters"), g1Span.indexOf("match /businessEvents")).includes("allow update: if canAccess(businessId) && counterArithmeticOk(businessId);") &&
        g1Span.slice(g1Span.indexOf("match /businessCounters"), g1Span.indexOf("match /businessEvents")).includes("allow delete: if false;"),
    "rules: the audit log is create-only for EVERYONE; the counters' write leg is now G2's batch-paired arithmetic (canAccess + counterArithmeticOk; delete still never) — G2 same-check amendment: part 2 landed the named amendment this check anticipated");
  const usersRegion = rulesG1.slice(
    rulesG1.indexOf("match /users/{uid}"),
    rulesG1.indexOf("// ---- Phase G · G1: platform collections (START)"));
  check(!usersRegion.includes("platformAdmins") &&
        rulesG1.includes("return isBusinessOwner(uid) || isMemberOf(uid) || isStaffOf(uid);") &&
        rulesG1.includes(".data.ownerUid == uid"),
    "rules: §2.3's doctrine is structural — NO platform-admin leg exists anywhere in the users namespace; amendment #1 orders owner → membership → legacy, and the v8 staffIndex body survives verbatim as the fallback leg (FR2 same-check amendment: the first leg is now isBusinessOwner — uid match OR registry leg — so a generated business's owner passes the same gate; the doctrine is unchanged, the leg widened)");
  const bizBlock = g1Span.slice(g1Span.indexOf("match /businesses/{businessId}"),
    g1Span.indexOf("match /businessMembers"));
  check(bizBlock.includes("businessBirthOk(businessId)") &&
        rulesG1.includes("function businessBirthOk(businessId)") &&
        rulesG1.includes("function selfClaimOk(businessId)") &&
        rulesG1.includes("function isMemberOf(uid)"),
    "rules: the registry's create is birth-shape-validated (trial XOR founding), and the membership leg + vouched self-claim helpers exist as designed");

  /* ---- i18n: every new string in both languages ---- */
  const BIZ_KEYS = ["biz.switchBusiness", "biz.yourBusiness", "biz.businessFallback",
    "biz.memberJoined", "biz.memberPending", "biz.memberLegacy",
    "biz.noAccessTitle", "biz.noAccessBody"];
  check(BIZ_KEYS.every((k) => typeof i18n.en[k] === "string" && i18n.en[k].length > 0 &&
                             typeof i18n.ur[k] === "string" && i18n.ur[k].length > 0) &&
        Object.keys(i18n.en).length === 3136 && Object.keys(i18n.ur).length === 3136,
    "i18n: all 8 new biz.* keys exist in EN and UR (dictionary 3,054 after the H1 pin amendment (+51 loyalty keys; H3 pin amendment: +108 storefront keys; WA pin amendment: +109 WhatsApp keys; G6 had added +25 backup.* keys; G4 had added +47: 35 renew.* + 12 platform.*; G3 had added +89 platform.* over G2's 2,625), parity kept) — the switcher, chips and no-access state never render a raw key");

  /* ---- source wiring ---- */
  const authSrc = readSrc("components/AuthProvider.tsx");
  const storeSrcG1 = readSrc("components/StoreProvider.tsx");
  check(authSrc.includes("collectionGroup") && authSrc.includes("businessInvites") &&
        authSrc.includes("userMemberships") && authSrc.includes("switchBusiness") &&
        authSrc.includes("planClaim") && authSrc.includes("planLegacyBackfill"),
    "source: AuthProvider resolves the session through the tenancy planners — claim (collection-group invite scan) → backfill → healed index — and exposes the switcher state");
  check(storeSrcG1.includes("ensureBusinessRegistry") && storeSrcG1.includes("createTrialRegistry") &&
        storeSrcG1.includes("businessInvites") && storeSrcG1.includes("businessEvents") &&
        storeSrcG1.includes("Timestamp.fromDate") &&
        (storeSrcG1.match(/makeEntry\(/g) || []).length === 24,
    "source: the store runs the registry migration + trial birth, writes invites/events in its staff batches, and converts the trial end to a Firestore Timestamp at the write seam (the rules validate it as one) — and still composes exactly 24 journal entries (tenancy posts nothing)");
  check(readSrc("components/AppShell.tsx").includes("BusinessSwitcher") &&
        !readSrc("components/Sidebar.tsx").includes("BusinessSwitcher") &&
        readSrc("components/AuthGate.tsx").includes("biz.noAccessTitle") &&
        readSrc("components/SettingsView.tsx").includes("membershipStatusFor"),
    "source: the switcher lives in the TOP HEADER (AppShell) and NOT the sidebar (the owner's shell standard); the gate carries the no-access state; settings shows the membership chips");
  check(!readSrc("lib/tenancy.ts").includes("firebase"),
    "purity: lib/tenancy imports no Firebase — the planners are pure, so demo mode (which never calls them) is untouched by construction");
}

/* =============================== G2 (Phase G · G2 — plans, counters, enforcement) =============================== */
{
  suite("G2", null); // Phase G · G2 — the plan catalogue, the derived plan state, the batch-riding counters, staged enforcement (design §3/§4/§6/§8-G2)

  const rulesG2 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8"
  );
  const ISO0 = "2026-10-06T00:00:00.000Z"; // a Tuesday in the shop's first month
  const regOf = (plan, extra) => ({
    ownerUid: "o1", ownerEmail: "o@x.pk", name: "Shop", phone: "", city: "",
    createdAt: ISO0, status: "active", enforce: true, plan, ...(extra || {}),
  });

  /* ---- the catalogue (design §3.1) + the module partition (§3.3) ---- */
  const allModules = [
    ...plans.CORE_MODULES, ...plans.DOCUMENTS_MODULES,
    ...plans.OPERATIONS_MODULES, ...plans.ADVANCED_MODULES,
    ...plans.GROWTH_MODULES,
  ];
  check(plans.CORE_MODULES.length === 26 && plans.DOCUMENTS_MODULES.length === 6 &&
        plans.OPERATIONS_MODULES.length === 2 && plans.ADVANCED_MODULES.length === 7 &&
        plans.GROWTH_MODULES.length === 2 &&
        new Set(allModules).size === 43 &&
        Object.keys(perm.PERMISSION_MATRIX).every((m) => allModules.includes(m)),
    "catalogue: the 43 PermModules are partitioned exactly once — Core 26 + Documents 6 + Operations 2 + Advanced 7 + Growth 2 (H1 pin amendment: loyalty entered via GROWTH_MODULES at the Standard seam, Phase H design §5.1; H3 pin amendment: storefront joins ADVANCED_MODULES, Phase H design §2.6; WA pin amendment: whatsapp joins GROWTH_MODULES beside loyalty at the Standard seam, Phase H design §3.1/§5.1), no module in two sets, none missing");
  check(plans.MODULE_SETS.core.length === 26 && plans.MODULE_SETS.standard.length === 36 &&
        plans.MODULE_SETS.advanced.length === 43 &&
        plans.tierIncludesModule("core", "billing") && !plans.tierIncludesModule("core", "quotations") &&
        plans.tierIncludesModule("standard", "quotations") && plans.tierIncludesModule("standard", "warehouses") &&
        !plans.tierIncludesModule("standard", "payroll") && plans.tierIncludesModule("advanced", "payroll") &&
        plans.tierIncludesModule("advanced", "fiscalClose") &&
        !plans.tierIncludesModule("core", "loyalty") && plans.tierIncludesModule("standard", "loyalty") &&
        plans.tierIncludesModule("advanced", "loyalty") && plans.moduleMinTier("loyalty") === "standard" &&
        !plans.tierIncludesModule("core", "whatsapp") && plans.tierIncludesModule("standard", "whatsapp") &&
        plans.tierIncludesModule("advanced", "whatsapp") && plans.moduleMinTier("whatsapp") === "standard" &&
        !plans.tierIncludesModule("standard", "storefront") && plans.tierIncludesModule("advanced", "storefront") &&
        plans.moduleMinTier("storefront") === "advanced",
    "catalogue: the tier sets are cumulative (Core ⊂ Standard ⊂ Advanced) and the seams fall where §3.3 puts them (H1: loyalty joins at Standard; H3: storefront is Advanced-only, design §2.6; WA: whatsapp joins at Standard beside loyalty, design §3.1)");
  check(plans.moduleMinTier("billing") === "core" && plans.moduleMinTier("cheques") === "standard" &&
        plans.moduleMinTier("jobTracker") === "standard" && plans.moduleMinTier("loans") === "advanced",
    "catalogue: moduleMinTier reads the partition back (door labels + tier gates share one source)");
  check(plans.PLAN_CATALOGUE.trial.priceMonthlyPKR === 0 && plans.PLAN_CATALOGUE.trial.usersLimit === 2 &&
        plans.PLAN_CATALOGUE.trial.invoiceLimit === 200 && plans.PLAN_CATALOGUE.trial.modulesTier === "standard" &&
        plans.PLAN_CATALOGUE.basic.priceMonthlyPKR === 1500 && plans.PLAN_CATALOGUE.basic.usersLimit === 3 &&
        plans.PLAN_CATALOGUE.basic.invoiceLimit === 500 && plans.PLAN_CATALOGUE.standard.priceMonthlyPKR === 2500 &&
        plans.PLAN_CATALOGUE.standard.usersLimit === 5 && plans.PLAN_CATALOGUE.standard.invoiceLimit === 2000 &&
        plans.PLAN_CATALOGUE.advanced.priceMonthlyPKR === 4000 && plans.PLAN_CATALOGUE.advanced.usersLimit === 10 &&
        plans.PLAN_CATALOGUE.advanced.invoiceLimit === 10000 &&
        plans.PLAN_CATALOGUE.enterprise.priceMonthlyPKR === null && plans.PLAN_CATALOGUE.enterprise.usersLimit === null &&
        plans.ANNUAL_MONTHS_CHARGED === 10,
    "catalogue: the five tiers carry the §3.1 anchors (prices are owner-to-confirm data — design Q1); annual is 10 × monthly; Enterprise is custom (nulls in the catalogue, set at assignment)");

  /* ---- snapshots: enforcement reads the ASSIGNMENT, never the catalogue (§3.2) ---- */
  const trialSnap = plans.snapshotFor("trial", ISO0, { assignedBy: "signup" });
  const trialG1 = tenancy.trialPlanSnapshot(ISO0);
  check(trialSnap.planId === trialG1.planId && trialSnap.usersLimit === trialG1.usersLimit &&
        trialSnap.invoiceLimit === trialG1.invoiceLimit && trialSnap.modulesTier === trialG1.modulesTier &&
        trialSnap.trialEndsAt === trialG1.trialEndsAt && trialSnap.periodTo === null &&
        trialSnap.trialEndsAt === "2026-10-20T00:00:00.000Z",
    "snapshot: snapshotFor('trial') is G1's birth shape field-for-field — 2 users, the 200 pool, Standard modules, the end exactly +14 days out");
  const foundSnap = plans.snapshotFor("founding", ISO0, { assignedBy: "migration" });
  const foundG1 = tenancy.foundingPlanSnapshot(ISO0);
  check(foundSnap.planId === foundG1.planId && foundSnap.usersLimit === foundG1.usersLimit &&
        foundSnap.invoiceLimit === foundG1.invoiceLimit && foundSnap.modulesTier === foundG1.modulesTier &&
        foundSnap.periodTo === null && foundSnap.trialEndsAt === null,
    "snapshot: snapshotFor('founding') is G1's migration shape — Advanced set + limits, no expiry of any kind");
  const cappedSnap = plans.snapshotFor("basic", ISO0, {
    assignedBy: "admin", invoiceLimit: 7, periodTo: "2026-11-06T00:00:00.000Z",
  });
  check(plans.planGate(regOf(cappedSnap), { invoiceMonth: "2026-10", invoiceCount: 7, memberCount: 0 }, ISO0).refusal === "invoice-cap" &&
        plans.planGate(regOf(cappedSnap), { invoiceMonth: "2026-10", invoiceCount: 6, memberCount: 0 }, ISO0).refusal === null,
    "snapshot: a Basic shop ASSIGNED a 7-invoice cap is refused at 7 — the catalogue's 500 is never consulted mid-period (§3.2's whole point)");
  const entSnap = plans.snapshotFor("enterprise", ISO0, {
    assignedBy: "admin", usersLimit: 25, invoiceLimit: null, periodTo: "2027-10-06T00:00:00.000Z",
  });
  check(entSnap.usersLimit === 25 && entSnap.invoiceLimit === 0 &&
        plans.planGate(regOf(entSnap), { invoiceMonth: "2026-10", invoiceCount: 999999, memberCount: 24 }, ISO0).refusal === null,
    "snapshot: Enterprise assignment stores its explicit user cap and 0 = unlimited invoices — no count ever caps it");

  /* ---- the plan-state truth table, at the boundary instants (§3.6) ---- */
  const END = "2026-11-05T19:00:00.000Z"; // 2026-11-06 00:00 PKT
  const trialAt = plans.snapshotFor("trial", "2026-10-22T19:00:00.000Z", { assignedBy: "signup" });
  check(trialAt.trialEndsAt === END, "state: the trial fixture's end is the intended instant");
  check(plans.derivePlanState(regOf(trialAt), "2026-11-05T18:59:59.999Z") === "trial" &&
        plans.derivePlanState(regOf(trialAt), END) === "trial" &&
        plans.derivePlanState(regOf(trialAt), "2026-11-05T19:00:00.001Z") === "grace" &&
        plans.derivePlanState(regOf(trialAt), "2026-12-05T19:00:00.000Z") === "grace" &&
        plans.derivePlanState(regOf(trialAt), "2026-12-05T19:00:00.001Z") === "readonly",
    "state: trial — the end instant itself still belongs to the trial; grace runs through end + 30 days INCLUSIVE; read-only begins 1ms later");
  const paidAt = plans.snapshotFor("standard", ISO0, { assignedBy: "admin", periodTo: END });
  check(plans.derivePlanState(regOf(paidAt), END) === "active" &&
        plans.derivePlanState(regOf(paidAt), "2026-11-05T19:00:00.001Z") === "grace" &&
        plans.derivePlanState(regOf(paidAt), "2026-12-05T19:00:00.000Z") === "grace" &&
        plans.derivePlanState(regOf(paidAt), "2026-12-05T19:00:00.001Z") === "readonly",
    "state: a paid period follows the same boundary table (active → grace → readonly)");
  check(plans.derivePlanState(regOf(paidAt, { status: "suspended" }), ISO0) === "suspended" &&
        plans.derivePlanState(regOf(foundSnap), "2100-01-01T00:00:00.000Z") === "founding" &&
        plans.derivePlanState(null, ISO0) === "none" &&
        plans.derivePlanState(regOf(plans.snapshotFor("basic", ISO0, { assignedBy: "admin" })), ISO0) === "active",
    "state: suspension overlays every state; founding never expires (year 2100 still founding); no registry is 'none'; a dateless paid shape reads 'active' rather than bricking the shop");
  check(["none", "trial", "active", "founding"].every((s) => plans.stateAllowsPosting(s)) &&
        ["grace", "readonly", "suspended"].every((s) => !plans.stateAllowsPosting(s)),
    "state: posting is allowed in none/trial/active/founding and denied in grace/readonly/suspended — reads are never state-gated (§3.7)");
  check(plans.rulesPlanPostable(regOf(paidAt, { enforce: false }), "2026-12-06T00:00:00.000Z") === true &&
        plans.rulesPlanPostable(regOf(paidAt), "2026-12-06T00:00:00.000Z") === false &&
        plans.rulesPlanPostable(regOf(paidAt, { status: "suspended", enforce: false }), ISO0) === true &&
        plans.rulesPlanPostable(regOf(paidAt, { status: "suspended" }), ISO0) === false &&
        plans.rulesPlanPostable(null, ISO0) === true,
    "state: the rules mirror — with enforce FALSE everything posts (observation), even past expiry, even suspended; the identical facts refuse the moment the flag flips; no registry always posts");

  /* ---- counter integrity (design §4.2's checkpoint suite) ---- */
  const ctr = (invoiceMonth, invoiceCount, memberCount) => ({ invoiceMonth, invoiceCount, memberCount });
  check((() => {
    const before = ctr("2026-10", 57, 1);
    const rolled = plans.nextInvoiceCounter(before, paidAt, "2026-10-31T19:30:00.000Z");
    const sameMonth = plans.nextInvoiceCounter(before, paidAt, "2026-10-31T18:59:59.000Z");
    return rolled.invoiceMonth === "2026-11" && rolled.invoiceCount === 1 &&
      sameMonth.invoiceMonth === "2026-10" && sameMonth.invoiceCount === 58 &&
      rolled.memberCount === 1;
  })(),
    "counter: the month roll is PKT's — Oct 31 19:30Z is already November in Karachi (roll to 1); 18:59:59Z is still October (+1)");
  check((() => {
    const at199 = ctr("2026-10", 199, 0);
    const at200 = plans.nextInvoiceCounter(at199, trialAt, "2026-11-02T00:00:00.000Z");
    const at201 = plans.nextInvoiceCounter(at200, trialAt, "2026-11-02T01:00:00.000Z");
    return at200.invoiceMonth === "2026-10" && at200.invoiceCount === 200 &&
      plans.invoiceEventAllowed(at199, at200, trialAt) === true &&
      plans.invoiceEventAllowed(at200, at201, trialAt) === false;
  })(),
    "counter: the trial pool NEVER rolls — the count accumulates across the month boundary a 14-day trial can cross; the 200th pool invoice posts, the 201st is denied");
  check(plans.counterTransitionOk(ctr("2026-10", 5, 1), ctr("2026-10", 6, 1), "invoice") &&
        plans.counterTransitionOk(ctr("2026-10", 5, 1), ctr("2026-11", 1, 1), "invoice") &&
        !plans.counterTransitionOk(ctr("2026-10", 5, 1), ctr("2026-10", 7, 1), "invoice") &&
        !plans.counterTransitionOk(ctr("2026-10", 5, 1), ctr("2026-09", 1, 1), "invoice") &&
        !plans.counterTransitionOk(ctr("2026-10", 5, 1), ctr("2026-10", 4, 1), "invoice") &&
        !plans.counterTransitionOk(ctr("2026-10", 5, 1), ctr("2026-10", 6, 2), "invoice"),
    "counter: the doc's own arithmetic admits exactly +1 / a forward roll to 1 — never +2, never backwards, and NEVER a decrease (a voided bill keeps its count: the invoice was issued; only the month roll resets)");
  check(plans.counterTransitionOk(ctr("2026-10", 5, 1), ctr("2026-10", 5, 2), "member-plus") &&
        plans.counterTransitionOk(ctr("2026-10", 5, 1), ctr("2026-10", 5, 0), "member-minus") &&
        !plans.counterTransitionOk(ctr("2026-10", 5, 1), ctr("2026-10", 5, 3), "member-plus") &&
        !plans.counterTransitionOk(ctr("2026-10", 5, 0), ctr("2026-10", 5, -1), "member-minus") &&
        !plans.counterTransitionOk(ctr("2026-10", 5, 1), ctr("2026-10", 6, 2), "member-plus") &&
        !plans.counterTransitionOk(
          { ...ctr("2026-10", 5, 1), baseline: { invoiceCount: 5 } },
          { ...ctr("2026-10", 6, 1), baseline: { invoiceCount: 9 } }, "invoice"),
    "counter: seat transitions are exactly ±1 (never below 0), the other family never moves in the same write, and the migration baseline marker is untouchable");
  check((() => {
    // A week at the desk, replayed: post, hold, finalize, void, sell.
    let c = ctr("2026-10", 0, 0);
    const step = (next) => {
      const ok = plans.counterTransitionOk(c, next, "invoice");
      c = next;
      return ok;
    };
    const s1 = step(plans.nextInvoiceCounter(c, paidAt, "2026-10-06T10:00:00.000Z")); // bill posts
    const heldNoWrite = c.invoiceCount === 1; // the held bill writes NOTHING
    const s2 = step(plans.nextInvoiceCounter(c, paidAt, "2026-10-06T11:00:00.000Z")); // held bill finalized = posts NOW
    const voidNoWrite = c.invoiceCount === 2; // voiding the first bill writes NOTHING
    const s3 = step(plans.nextInvoiceCounter(c, paidAt, "2026-10-06T12:00:00.000Z")); // counter sale
    return s1 && s2 && s3 && heldNoWrite && voidNoWrite && c.invoiceCount === 3;
  })(),
    "counter: held/resumed bills count exactly once, at posting — a hold writes nothing, its finalize writes the +1; a void writes nothing back; three postings, count 3");
  check(plans.memberCapOk(ctr("2026-10", 0, 1), trialAt) === true &&
        plans.memberCapOk(ctr("2026-10", 0, 2), trialAt) === false &&
        plans.planMemberRefusal(regOf(trialAt), ctr("2026-10", 0, 0)) === null &&
        plans.planMemberRefusal(regOf(trialAt), ctr("2026-10", 0, 1)) === "member-cap" &&
        plans.planMemberRefusal(regOf(trialAt, { enforce: false }), ctr("2026-10", 0, 1)) === null,
    "counter: the user cap counts seats + the owner against usersLimit (trial: 1 seat fits, the 2nd seat's invite is refused client-side) — and refuses nothing while enforce is false");
  check(plans.planInvoiceRefusal(regOf(paidAt), ctr("2026-10", 2000, 0), ISO0) === "invoice-cap" &&
        plans.planInvoiceRefusal(regOf(paidAt), ctr("2026-10", 1999, 0), ISO0) === null &&
        plans.planInvoiceRefusal(regOf(paidAt), ctr("2026-10", 2000, 0), "2026-12-06T00:00:00.000Z") === "state",
    "gate: at the limit the client refuses 'invoice-cap' BEFORE the write; one below it proceeds; in grace the refusal is 'state' (state precedes cap, the rules' own order)");

  /* ---- derived actuals: the observation surface's other side ---- */
  const actBills = [
    { ts: "2026-10-05T10:00:00.000Z", status: "paid" },
    { ts: "2026-10-06T10:00:00.000Z", status: "held" },
    { ts: "2026-10-07T10:00:00.000Z", status: "voided" },
    { ts: "2026-09-07T10:00:00.000Z", status: "paid" },
  ];
  const actSales = [
    { ts: "2026-10-02T09:00:00.000Z", billId: null, kind: "sale" },
    { ts: "2026-10-05T10:01:00.000Z", billId: "b1", kind: "sale" },
    { ts: "2026-10-05T10:02:00.000Z", billId: "b1", kind: "sale" },
    { ts: "2026-10-08T09:00:00.000Z", billId: null, kind: "return" },
    { ts: "2026-09-02T09:00:00.000Z", billId: null, kind: "sale" },
  ];
  const actual = plans.deriveActualCounters(actBills, actSales, ["a@x.pk", "b@x.pk"], regOf(paidAt), "2026-10-20T00:00:00.000Z");
  check(actual.invoiceCount === 3 && actual.memberCount === 2,
    "actuals: derived from the collections, the month holds 3 invoice events (paid + voided bills + the counter sale) — held bills, bill line rows and return rows are NOT events; members are the mirror's size");
  const trialEarly = plans.snapshotFor("trial", "2026-10-01T00:00:00.000Z", { assignedBy: "signup" });
  check(tenancy.countMonthlyInvoiceEvents(actBills, actSales, "2026-10") === 3 &&
        plans.deriveActualCounters(actBills, actSales, [], regOf(trialEarly), "2026-10-20T00:00:00.000Z").invoiceCount === 3,
    "actuals: tenancy's counter and the trial pool window agree on the same fixtures (G2 tightened the count to the rules' event definition — a bill's rows no longer inflate it)");
  check(plans.refTypeTierOk(paidAt, "payroll_accrual") === false &&
        plans.refTypeTierOk(plans.snapshotFor("advanced", ISO0, { assignedBy: "admin", periodTo: END }), "payroll_accrual") === true &&
        plans.refTypeTierOk(paidAt, "job_material") === true &&
        plans.refTypeTierOk(plans.snapshotFor("basic", ISO0, { assignedBy: "admin", periodTo: END }), "job_material") === false &&
        plans.refTypeTierOk(plans.snapshotFor("basic", ISO0, { assignedBy: "admin", periodTo: END }), "bill") === true &&
        plans.collectionTierOk(paidAt, "jobs") === true && plans.collectionTierOk(paidAt, "boms") === false &&
        Object.keys(plans.COLLECTION_CREATE_TIER).length === 6,
    "tiers: the refType/collection gates mirror §4.1 — payroll needs Advanced, job material Standard, a bill is Core everywhere; the collection list is the named six");

  /* ---- rules v9 part 2: text + strip proofs ---- */
  check(crypto.createHash("sha256").update(stripG2Blocks(rulesG2), "utf8").digest("hex") ===
        "5a960a502cf11ab7b721eec7a6ff80ee4cb17ac27ea47e2523b20b9fb3b18e3a",
    "rules: STRIP PROOF — v9 final minus every delimited G2 span (amendments restored to their exact part-1 text) is byte-for-byte v9 part 1 (its pinned SHA) (G3 same-check amendment: the G3 span is cut first by the shared helper — it did not exist in part 1, so the pin asserts exactly what it asserted)");
  check(crypto.createHash("sha256").update(stripG1Blocks(stripG2Blocks(rulesG2)), "utf8").digest("hex") ===
        "04807268c2c1891c070e1cc34443fe4c3892ea35dde739718499e392c661f859",
    "rules: STRIP PROOF composed — minus G2 spans, then G1 spans, the file is byte-for-byte v8: part 2 is additive except amendment #2 and the three platform-block amendments, each in its own span (G3 same-check amendment: the G3 span is cut first by the shared helper)");
  check((rulesG2.match(/planPostable\(uid\)/g) || []).length === 16 &&
        (rulesG2.match(/planTierOk\(uid, 'advanced'\)/g) || []).length === 5 &&
        (rulesG2.match(/invoiceEventOk\(uid\)/g) || []).length === 4 &&
        rulesG2.includes("function planState(uid)") && rulesG2.includes("duration.value(720, 'h')") &&
        rulesG2.includes("duration.value(312, 'h')") && rulesG2.includes("duration.value(360, 'h')"),
    "rules: amendment #2's shape — planPostable on all 14 A5 create legs (16 occurrences incl. definition + the pairing helper), Advanced tier on the 5 named creates, the invoice pairing on bills create/update + sales create, grace 720h in the state mirror, the §4.3 birth window at 312h–360h");
  check(rulesG2.includes("allow update: if canAccess(businessId) && counterArithmeticOk(businessId);") &&
        rulesG2.includes("memberCounterPaired(businessId, 1)") &&
        rulesG2.includes("memberCounterPaired(businessId, -1)") &&
        rulesG2.includes("memberCapOk(businessId)") &&
        rulesG2.includes("request.resource.data.get('billId', null) == null") &&
        rulesG2.includes("request.resource.data.get('status', '') == 'held' || invoiceEventOk(uid)"),
    "rules: the counter legs — the doc's arithmetic update, the seat pairing on invites (+1) and removals (−1), the claim-leg cap, and the bills/sales invoice-event shapes (held births pair nothing; only bill-less sale rows pair)");
  check(rulesG2.split("\n").filter((l) => l.includes("allow read")).every((l) =>
          !/planPostable|planTierOk|planState|planEnforced|invoiceEventOk|memberCapOk|counterArithmeticOk/.test(l)),
    "rules: NO read line names a plan function — suspension and expiry deny writes, never reads (§3.6/§3.7's data rights, pinned so no later phase can quietly gate a read)");

  /* ---- i18n: the plan strings ---- */
  const planKeys = Object.keys(i18n.en).filter((k) => k.startsWith("plan."));
  check(planKeys.length === 36 && planKeys.every((k) => k in i18n.ur) &&
        Object.keys(i18n.en).length === 3136,
    "i18n: 36 plan.* keys (names, states, banners, limit copy, the panel) with full EN ≡ UR parity — dictionary 3,054 (G3: +89 platform keys; G4: +47 renew/platform keys; G6: +25 backup.* keys; H1 pin amendment: +51 loyalty keys; H3 pin amendment: +108 storefront keys; WA pin amendment: +109 WhatsApp keys))");

  /* ---- source wiring ---- */
  const storeSrcG2 = fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx", "utf8");
  const authSrcG2 = fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/components/AuthProvider.tsx", "utf8");
  check(storeSrcG2.includes('doc(db, "businessCounters", uid)') && storeSrcG2.includes('doc(db, "businesses", uid)') &&
        (storeSrcG2.match(/rideInvoiceCounter\(batch, ctx\.db, ctx\.uid\)/g) || []).length === 2 &&
        storeSrcG2.includes("rideMemberCounter(batch, ctx.db, ctx.uid, 1)") &&
        storeSrcG2.includes("rideMemberCounter(batch, ctx.db, ctx.uid, -1)") &&
        (storeSrcG2.match(/planInvoiceCheck\(\)\) return false/g) || []).length === 2,
    "source: the store subscribes registry + counters for every role; the invoice counter rides BOTH posting batches (postBill, recordSale); the seat rides invite +1 / removal −1; both posting paths pre-check the gate");
  check(!/enforce:\s*true/.test(storeSrcG2) && !/enforce:\s*true/.test(authSrcG2) &&
        !/enforce:\s*true/.test(fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/lib/plans.ts", "utf8")) &&
        !/enforce:\s*true/.test(fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/lib/tenancy.ts", "utf8")),
    "source: enforce:true appears NOWHERE in the shipping code — no live business ends G2 enforced; the flip is a platform act (G3), per business, later (§6.3)");
  const sidebarSrcG2 = fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/components/Sidebar.tsx", "utf8");
  const shellSrcG2 = fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/components/AppShell.tsx", "utf8");
  const settingsSrcG2 = fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/components/SettingsView.tsx", "utf8");
  const panelSrcG2 = fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/components/PlanPanel.tsx", "utf8");
  check(sidebarSrcG2.includes("tierIncludesModule") && sidebarSrcG2.includes("sb-link locked") &&
        shellSrcG2.includes("plan.trialBanner") && shellSrcG2.includes("plan.lockedBody") &&
        shellSrcG2.includes("plan.suspendedBanner") &&
        settingsSrcG2.includes("<PlanPanel />") && panelSrcG2.includes("deriveActualCounters") &&
        panelSrcG2.includes("plan.panel.enforceOff"),
    "source: the surfaces are wired — locked sidebar doors from the snapshot tier, the shell's state + refusal banners and locked route panel, and the settings observation panel comparing counter vs derived actual");

  /* ---- frozen seed identities ---- */
  const journalG2 = seed.getSeedJournal(products, sales, purchases, payments, expenses, credits);
  const shaG2 = crypto.createHash("sha256")
    .update(JSON.stringify(journalG2.map((e) => { const { ts, ...rest } = e; return rest; })), "utf8")
    .digest("hex");
  const tbG2 = reports.trialBalance(journalG2, reports.resolveReportRange("custom", null, { from: "2000-01-01", to: "2100-12-31" }));
  check(journalG2.length === 21 && shaG2 === "e17e5bda19e87de698b0c0a37e923f9b396bc387e2092b2ffbbd7d60d4971168" &&
        eq(ledger.accountBalance(journalG2, "inventory"), 272805) &&
        eq(ledger.accountBalance(journalG2, "cash"), 50000) &&
        eq(ledger.payablesTotal(journalG2), 27900) && eq(ledger.receivablesTotal(journalG2), 5500) &&
        eq(tbG2.totalDebits, tbG2.totalCredits),
    "seed: frozen identities intact — 21 entries, the pinned SHA, Inventory 272,805 · Cash 50,000 · payables 27,900 · receivables 5,500, TB balanced");
  check((storeSrcG2.match(/makeEntry\(/g) || []).length === 24,
    "seed: still exactly 24 makeEntry( sites — G2 composed no entry, template or refType; the plan layer only gates and counts");
}


/* =============================== G3 (Phase G · G3 — super admin console) =============================== */
{
  suite("G3", null); // Phase G · G3 — the super admin console: closed-list privacy, aggregates, the audit law (design §2/§3.5/§6.1/§8-G3)

  const NOW3 = "2026-10-23T00:00:00.000Z";
  const ADMIN = "admin-1";
  const rulesG3 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8");
  const readSrc3 = (p) => fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/" + p, "utf8");
  const reg3 = (bid, plan, extra) => ({
    ownerUid: bid, ownerEmail: bid + "@x.pk", name: "Shop " + bid, phone: "0300",
    city: "Sargodha", createdAt: "2026-10-01T00:00:00.000Z",
    status: "active", enforce: false, plan, ...(extra || {}),
  });

  /* ---- fixture businesses: one per derived state ---- */
  const trialSnap3 = plans.snapshotFor("trial", "2026-10-20T00:00:00.000Z", { assignedBy: "signup" });
  const bizTrial = reg3("bizTrial", trialSnap3);
  const bizStd = reg3("bizStd", plans.snapshotFor("standard", "2026-10-16T00:00:00.000Z", { assignedBy: "admin", periodTo: "2026-11-15T00:00:00.000Z" }));
  const bizGrace = reg3("bizGrace", plans.snapshotFor("basic", "2026-09-10T00:00:00.000Z", { assignedBy: "admin", periodTo: "2026-10-10T00:00:00.000Z" }));
  const bizSusp = reg3("bizSusp", plans.snapshotFor("advanced", "2026-10-01T00:00:00.000Z", { assignedBy: "admin", periodTo: "2027-01-01T00:00:00.000Z" }), { status: "suspended", enforce: true });
  const bizFound = reg3("bizFound", plans.snapshotFor("founding", "2026-10-01T00:00:00.000Z", { assignedBy: "migration" }));
  const ctr3 = {
    bizTrial: { invoiceMonth: "2026-10", invoiceCount: 137, memberCount: 1 },
    bizStd: { invoiceMonth: "2026-10", invoiceCount: 1540, memberCount: 3 },
    bizGrace: { invoiceMonth: "2026-10", invoiceCount: 480, memberCount: 2 },
    bizSusp: { invoiceMonth: "2026-10", invoiceCount: 9000, memberCount: 9 },
    bizFound: { invoiceMonth: "2026-10", invoiceCount: 55, memberCount: 4 },
  };
  const statsStd = {
    lastActiveAt: "2026-10-22T10:00:00.000Z", lastDayCloseAt: "2026-10-21T19:00:00.000Z",
    docCounts: { products: 120, bills: 1540, customers: 210 }, versions: ["web"],
  };
  const payments3 = [
    { id: "p1", businessId: "bizStd", amount: 2500, method: "raast", reference: "R-1", periodFrom: "2026-10-15T00:00:00.000Z", periodTo: "2026-11-15T00:00:00.000Z", planId: "standard", state: "confirmed", submittedBy: "bizStd", confirmedBy: ADMIN, submittedAt: "2026-10-14T00:00:00.000Z", confirmedAt: "2026-10-05T09:00:00.000Z" },
    { id: "p2", businessId: "bizGrace", amount: 1500, method: "bank", reference: "B-2", periodFrom: "2026-09-10T00:00:00.000Z", periodTo: "2026-10-10T00:00:00.000Z", planId: "basic", state: "confirmed", submittedBy: "bizGrace", confirmedBy: ADMIN, submittedAt: "2026-09-09T00:00:00.000Z", confirmedAt: "2026-09-15T09:00:00.000Z" },
    { id: "p3", businessId: "bizStd", amount: 2500, method: "raast", reference: "R-3", periodFrom: "2026-11-15T00:00:00.000Z", periodTo: "2026-12-15T00:00:00.000Z", planId: "standard", state: "submitted", submittedBy: "bizStd", confirmedBy: null, submittedAt: "2026-10-22T08:00:00.000Z", confirmedAt: null },
    { id: "p4", businessId: "bizGrace", amount: 1500, method: "cash", reference: "C-4", periodFrom: "2026-11-10T00:00:00.000Z", periodTo: "2026-12-10T00:00:00.000Z", planId: "basic", state: "submitted", submittedBy: "bizGrace", confirmedBy: null, submittedAt: "2026-10-21T08:00:00.000Z", confirmedAt: null },
    { id: "p5", businessId: "bizTrial", amount: 2500, method: "jazzcash", reference: "J-5", periodFrom: "2026-11-03T00:00:00.000Z", periodTo: "2026-12-03T00:00:00.000Z", planId: "standard", state: "rejected", submittedBy: "bizTrial", confirmedBy: ADMIN, submittedAt: "2026-10-20T08:00:00.000Z", confirmedAt: "2026-10-20T09:00:00.000Z", note: "Reference not found" },
  ];

  /* ---- aggregates reconcile BY HAND (§8-G3's checkpoint) ---- */
  const agg = platform.platformAggregates(
    [bizTrial, bizStd, bizGrace, bizSusp, bizFound], ctr3, payments3, NOW3);
  check(agg.totalBusinesses === 5 &&
        agg.byPlan.trial === 1 && agg.byPlan.standard === 1 && agg.byPlan.basic === 1 &&
        agg.byPlan.advanced === 1 && agg.byPlan.founding === 1 &&
        agg.byState.trial === 1 && agg.byState.active === 1 && agg.byState.grace === 1 &&
        agg.byState.suspended === 1 && agg.byState.founding === 1 &&
        agg.suspended === 1 && agg.enforced === 1,
    "aggregates: five fixture businesses reconcile by hand — one per plan, one per DERIVED state (trial/active/grace/suspended/founding), one suspended, one enforced");
  check(agg.invoicesThisMonth === 1540 + 480 + 9000 + 55 &&
        agg.trialPoolUsed === 137,
    "aggregates: invoices this month = Σ the non-trial hard counters on the current PKT month (11,075); the trial contributes its POOL separately (137 of 200) — a trial counter never rolls into a month");
  check(agg.confirmedRevenueTotal === 4000 &&
        agg.confirmedRevenueByMonth["2026-10"] === 2500 &&
        agg.confirmedRevenueByMonth["2026-09"] === 1500 &&
        agg.pendingPayments === 2,
    "aggregates: confirmed revenue sums CONFIRMED payments only, by PKT month of confirmation (Oct 2,500 + Sep 1,500); the two submitted records are the pending queue, the rejected one is neither");

  /* ---- directory derivation + filters ---- */
  const rowStd = platform.directoryEntry(bizStd, ctr3.bizStd, statsStd, NOW3);
  check(rowStd.state === "active" && rowStd.planId === "standard" &&
        rowStd.invoiceCount === 1540 && rowStd.invoiceLimit === 2000 &&
        rowStd.memberCount === 3 && rowStd.usersLimit === 5 &&
        rowStd.lastActiveAt === "2026-10-22T10:00:00.000Z" && rowStd.enforce === false,
    "directory: a row carries the registry label fields, the DERIVED state (never a stored one), counter vs snapshot limit, and the SOFT last-active — each figure's source visible in its shape");
  const allRows = [bizTrial, bizStd, bizGrace, bizSusp, bizFound].map((b) =>
    platform.directoryEntry(b, ctr3[b.ownerUid], b.ownerUid === "bizStd" ? statsStd : null, NOW3));
  check(platform.filterDirectory(allRows, { query: "bizgr" }).length === 1 &&
        platform.filterDirectory(allRows, { query: "sargodha" }).length === 5 &&
        platform.filterDirectory(allRows, { state: "grace" }).length === 1 &&
        platform.filterDirectory(allRows, { status: "suspended" }).length === 1 &&
        platform.filterDirectory(allRows, { planId: "founding" }).length === 1 &&
        platform.filterDirectory(allRows, { enforce: "on" }).length === 1 &&
        platform.filterDirectory(allRows, {}).length === 5,
    "directory: search (id/city) and the plan/state/status/enforce filters each cut the fixture set exactly");

  /* ---- the act planners + the audit law ---- */
  const actResults = [];
  const eventOf = (res) => res.writes.find((w) => w.kind === "add" && w.collection === "businessEvents");
  const assignStd = platform.planAssignPlan({
    businessId: "bizTrial", current: bizTrial, planId: "standard",
    periodTo: "2026-11-23T00:00:00.000Z", actor: ADMIN, now: NOW3,
  });
  actResults.push(assignStd);
  check(assignStd.ok && assignStd.writes[0].kind === "update" &&
        assignStd.writes[0].path === "businesses/bizTrial" &&
        assignStd.writes[0].data.plan.planId === "standard" &&
        assignStd.writes[0].data.plan.usersLimit === 5 &&
        assignStd.writes[0].data.plan.invoiceLimit === 2000 &&
        assignStd.writes[0].data.plan.assignedBy === "admin" &&
        eventOf(assignStd).data.kind === "plan.assigned" &&
        eventOf(assignStd).data.detail.before.planId === "trial" &&
        eventOf(assignStd).data.detail.after.planId === "standard",
    "act assign: the assignment IS the snapshot (catalogue limits copied in, admin-stamped) and its event carries before/after plan summaries — the §3.2 doctrine executed by the planner");
  const assignEnt = platform.planAssignPlan({
    businessId: "bizStd", current: bizStd, planId: "enterprise",
    periodTo: "2027-10-23T00:00:00.000Z", usersLimit: 25, invoiceLimit: null,
    actor: ADMIN, now: NOW3,
  });
  actResults.push(assignEnt);
  check(assignEnt.ok && assignEnt.writes[0].data.plan.usersLimit === 25 &&
        assignEnt.writes[0].data.plan.invoiceLimit === 0 &&
        assignEnt.writes[0].data.plan.modulesTier === "advanced",
    "act assign: Enterprise takes its limits from the ASSIGNMENT (25 users explicit; null invoices stored as 0 = unlimited) — the catalogue's nulls are never a limit");
  const assignNoPeriod = platform.planAssignPlan({
    businessId: "bizTrial", current: bizTrial, planId: "basic", actor: ADMIN, now: NOW3,
  });
  actResults.push(assignNoPeriod);
  check(!assignNoPeriod.ok && assignNoPeriod.reason === "period-required" && assignNoPeriod.writes.length === 0,
    "act assign: a priced tier without a period end is refused — a paid assignment cannot be born dateless from the console either");
  const retrial = platform.planAssignPlan({
    businessId: "bizStd", current: bizStd, planId: "trial", actor: ADMIN, now: NOW3,
  });
  const compTrial = platform.planAssignPlan({
    businessId: "bizStd", current: bizStd, planId: "trial", compTrial: true, actor: ADMIN, now: NOW3,
  });
  actResults.push(retrial, compTrial);
  check(!retrial.ok && retrial.reason === "retrial-needs-comp" &&
        compTrial.ok && eventOf(compTrial).data.kind === "plan.compTrial" &&
        compTrial.writes[0].data.plan.trialEndsAt === "2026-11-06T00:00:00.000Z",
    "act assign: re-trial is refused as a silent assignment and lands ONLY as an explicit comp — its own event kind, a fresh +14d trial end (§3.4)");
  const extend = platform.planExtendPeriod({
    businessId: "bizGrace", current: bizGrace, newEnd: "2026-11-30T00:00:00.000Z", actor: ADMIN, now: NOW3,
  });
  const extendTrial = platform.planExtendPeriod({
    businessId: "bizTrial", current: bizTrial, newEnd: "2026-11-20T00:00:00.000Z", actor: ADMIN, now: NOW3,
  });
  const extendFound = platform.planExtendPeriod({
    businessId: "bizFound", current: bizFound, newEnd: "2027-01-01T00:00:00.000Z", actor: ADMIN, now: NOW3,
  });
  const extendBack = platform.planExtendPeriod({
    businessId: "bizGrace", current: bizGrace, newEnd: "2026-10-01T00:00:00.000Z", actor: ADMIN, now: NOW3,
  });
  actResults.push(extend, extendTrial, extendFound, extendBack);
  check(extend.ok && extend.writes[0].data.plan.periodTo === "2026-11-30T00:00:00.000Z" &&
        eventOf(extend).data.detail.field === "periodTo" &&
        eventOf(extend).data.detail.before === "2026-10-10T00:00:00.000Z" &&
        extendTrial.ok && eventOf(extendTrial).data.detail.field === "trialEndsAt" &&
        !extendFound.ok && extendFound.reason === "no-expiry" &&
        !extendBack.ok && extendBack.reason === "not-later",
    "act extend: only the end moves (periodTo for paid, trialEndsAt for trial), the event names field + before/after; founding has no end to extend and a backwards 'extension' is refused");
  const suspend = platform.planSetStatus({
    businessId: "bizStd", current: bizStd, status: "suspended", reason: "non-payment", actor: ADMIN, now: NOW3,
  });
  const suspendNoReason = platform.planSetStatus({
    businessId: "bizStd", current: bizStd, status: "suspended", actor: ADMIN, now: NOW3,
  });
  const activate = platform.planSetStatus({
    businessId: "bizSusp", current: bizSusp, status: "active", actor: ADMIN, now: NOW3,
  });
  const statusNoChange = platform.planSetStatus({
    businessId: "bizStd", current: bizStd, status: "active", actor: ADMIN, now: NOW3,
  });
  actResults.push(suspend, suspendNoReason, activate, statusNoChange);
  check(suspend.ok && suspend.writes[0].data.status === "suspended" &&
        eventOf(suspend).data.kind === "business.suspended" &&
        eventOf(suspend).data.detail.before === "active" &&
        eventOf(suspend).data.detail.after === "suspended" &&
        eventOf(suspend).data.detail.reason === "non-payment" &&
        !suspendNoReason.ok && suspendNoReason.reason === "reason-required" &&
        activate.ok && eventOf(activate).data.kind === "business.activated" &&
        !statusNoChange.ok && statusNoChange.reason === "no-change",
    "act status: suspension demands its reason (§2.2) and logs before/after + reason; activation mirrors it; a no-op flip is refused, not logged");
  check(platform.countersAgree(ctr3.bizStd, { invoicesReported: 1540, membersJoined: 3 }) === true &&
        platform.countersAgree(ctr3.bizStd, { invoicesReported: 1400, membersJoined: 3 }) === false &&
        platform.countersAgree(ctr3.bizStd, { invoicesReported: null, membersJoined: 4 }) === false &&
        platform.countersAgree(ctr3.bizStd, { invoicesReported: null, membersJoined: 2 }) === true &&
        platform.countersAgree(null, { invoicesReported: 0, membersJoined: 0 }) === false,
    "enforce check: agreement = the reported bill count EQUALS the counter, and joined members never exceed seats (seats also hold unclaimed invites); no counter doc is never agreement");
  const enforceOk = platform.planSetEnforce({
    businessId: "bizStd", current: bizStd, enforce: true, counters: ctr3.bizStd,
    actual: { invoicesReported: 1540, membersJoined: 3 }, actor: ADMIN, now: NOW3,
  });
  const enforceBlocked = platform.planSetEnforce({
    businessId: "bizStd", current: bizStd, enforce: true, counters: ctr3.bizStd,
    actual: { invoicesReported: 1400, membersJoined: 3 }, actor: ADMIN, now: NOW3,
  });
  const enforceForced = platform.planSetEnforce({
    businessId: "bizStd", current: bizStd, enforce: true, counters: ctr3.bizStd,
    actual: { invoicesReported: 1400, membersJoined: 3 }, confirmed: true, actor: ADMIN, now: NOW3,
  });
  const enforceOff = platform.planSetEnforce({
    businessId: "bizSusp", current: bizSusp, enforce: false, counters: ctr3.bizSusp,
    actual: { invoicesReported: 1, membersJoined: 0 }, actor: ADMIN, now: NOW3,
  });
  actResults.push(enforceOk, enforceBlocked, enforceForced, enforceOff);
  check(enforceOk.ok && eventOf(enforceOk).data.kind === "enforce.enabled" &&
        eventOf(enforceOk).data.detail.countersAgree === true &&
        !enforceBlocked.ok && enforceBlocked.reason === "counter-disagreement" &&
        enforceForced.ok && eventOf(enforceForced).data.detail.countersAgree === false &&
        eventOf(enforceForced).data.detail.confirmedDespiteDisagreement === true &&
        enforceOff.ok && eventOf(enforceOff).data.kind === "enforce.disabled",
    "act enforce: agreeing figures flip freely; disagreeing figures REFUSE until the admin confirms — and the confirmation itself is recorded in the event (never silent); flipping OFF never needs agreement (§6.3's safety valve, wielded honestly)");
  const confirm3 = platform.planConfirmPayment({
    payment: payments3[2], business: bizStd, actor: ADMIN, now: NOW3,
  });
  const confirmAgain = platform.planConfirmPayment({
    payment: payments3[0], business: bizStd, actor: ADMIN, now: NOW3,
  });
  const confirmMismatch = platform.planConfirmPayment({
    payment: payments3[3], business: bizStd, actor: ADMIN, now: NOW3,
  });
  actResults.push(confirm3, confirmAgain, confirmMismatch);
  check(confirm3.ok && confirm3.writes.length === 3 &&
        confirm3.writes[0].path === "platformPayments/p3" &&
        confirm3.writes[0].data.state === "confirmed" &&
        confirm3.writes[0].data.confirmedBy === ADMIN &&
        confirm3.writes[1].path === "businesses/bizStd" &&
        confirm3.writes[1].data.plan.periodTo === "2026-12-15T00:00:00.000Z" &&
        confirm3.writes[1].data.plan.periodFrom === "2026-11-15T00:00:00.000Z" &&
        eventOf(confirm3).data.kind === "payment.confirmed" &&
        eventOf(confirm3).data.detail.amount === 2500 &&
        !confirmAgain.ok && confirmAgain.reason === "not-submitted" &&
        !confirmMismatch.ok && confirmMismatch.reason === "business-mismatch",
    "act confirm: ONE plan — payment signed confirmed, period extended + snapshot refreshed from the payment's own terms, event with amount + before/after; a settled record cannot re-confirm and another business's payment cannot confirm against this registry");
  const reject4 = platform.planRejectPayment({
    payment: payments3[3], note: "Slip unreadable", actor: ADMIN, now: NOW3,
  });
  const rejectNoNote = platform.planRejectPayment({
    payment: payments3[3], actor: ADMIN, now: NOW3,
  });
  actResults.push(reject4, rejectNoNote);
  check(reject4.ok && reject4.writes[0].data.state === "rejected" &&
        reject4.writes[0].data.note === "Slip unreadable" &&
        eventOf(reject4).data.kind === "payment.rejected" &&
        !rejectNoNote.ok && rejectNoNote.reason === "note-required",
    "act reject: the note the owner sees is mandatory (§3.5) and rides both the record and the event");
  const queue = platform.paymentQueue(payments3);
  check(queue.length === 2 && queue[0].id === "p4" && queue[1].id === "p3",
    "queue: submitted only, OLDEST first — the admin works the queue in the order the money arrived");
  const grant = platform.planGrantAdmin({
    uid: "u-new", email: "new@x.pk", existing: null, actor: ADMIN, now: NOW3,
  });
  const grantDup = platform.planGrantAdmin({
    uid: "admin-2", email: "two@x.pk",
    existing: { email: "two@x.pk", addedAt: NOW3, addedBy: ADMIN }, actor: ADMIN, now: NOW3,
  });
  const revoke = platform.planRevokeAdmin({
    uid: "admin-2", adminUids: [ADMIN, "admin-2"], actor: ADMIN, now: NOW3,
  });
  const revokeSelf = platform.planRevokeAdmin({
    uid: ADMIN, adminUids: [ADMIN, "admin-2"], actor: ADMIN, now: NOW3,
  });
  const revokeLast = platform.planRevokeAdmin({
    uid: "admin-2", adminUids: ["admin-2"], actor: ADMIN, now: NOW3,
  });
  const revokeStranger = platform.planRevokeAdmin({
    uid: "u-nobody", adminUids: [ADMIN, "admin-2"], actor: ADMIN, now: NOW3,
  });
  actResults.push(grant, grantDup, revoke, revokeSelf, revokeLast, revokeStranger);
  check(grant.ok && grant.writes[0].kind === "set" &&
        grant.writes[0].path === "platformAdmins/u-new" &&
        grant.writes[0].data.addedBy === ADMIN &&
        eventOf(grant).data.businessId === "platform" &&
        eventOf(grant).data.kind === "admin.granted" &&
        !grantDup.ok && grantDup.reason === "already-admin" &&
        revoke.ok && revoke.writes[0].kind === "delete" &&
        revoke.writes[0].path === "platformAdmins/admin-2" &&
        eventOf(revoke).data.kind === "admin.revoked" &&
        !revokeSelf.ok && revokeSelf.reason === "self-revoke" &&
        !revokeLast.ok && revokeLast.reason === "last-admin" &&
        !revokeStranger.ok && revokeStranger.reason === "not-admin",
    "act admins: a grant writes the doc + a 'platform' event; revocation deletes + logs — and the guards hold: no self-revoke, the LAST admin cannot be revoked, a non-admin cannot be 'revoked', a duplicate grant is refused");

  /* ---- audit completeness: NO silent acts (§8-G3) ---- */
  check(platform.CONSOLE_ACTS.every((n) => typeof platform[n] === "function") &&
        platform.CONSOLE_ACTS.length === 9,
    "audit: the console's act list is closed and enumerable — all 9 named planners exist (G4 added planSavePlatformConfig) (an act not on this list is an unaudited act, and this suite would fail)");
  check(actResults.every((r) => !r.ok || (
          r.writes.filter((w) => w.kind === "add" && w.collection === "businessEvents").length === 1 &&
          r.writes[r.writes.length - 1].kind === "add" &&
          r.writes[r.writes.length - 1].collection === "businessEvents")) &&
        actResults.every((r) => r.ok || r.writes.length === 0) &&
        actResults.every((r) => !r.ok || (
          eventOf(r).data.actor === ADMIN && typeof eventOf(r).data.kind === "string")),
    "audit: across EVERY act fixture above — each successful plan carries EXACTLY ONE businessEvents entry, as its LAST write (the act and its event land in one batch or not at all); each refusal plans ZERO writes; every event names its actor");

  /* ---- snapshot history from the log (§2.2) ---- */
  const histEvents = [
    { businessId: "bizStd", kind: "plan.assigned", actor: ADMIN, at: "2026-10-16T00:00:00.000Z",
      detail: { before: { planId: "trial" }, after: { planId: "standard", periodTo: "2026-11-15T00:00:00.000Z", trialEndsAt: null } } },
    { businessId: "bizStd", kind: "business.suspended", actor: ADMIN, at: "2026-10-18T00:00:00.000Z",
      detail: { before: "active", after: "suspended", reason: "non-payment" } },
    { businessId: "bizStd", kind: "payment.confirmed", actor: ADMIN, at: "2026-10-22T00:00:00.000Z",
      detail: { paymentId: "p3", amount: 2500, after: { planId: "standard", periodTo: "2026-12-15T00:00:00.000Z", trialEndsAt: null } } },
  ];
  const hist = platform.snapshotHistory(histEvents);
  check(hist.length === 2 && hist[0].kind === "payment.confirmed" &&
        hist[0].periodTo === "2026-12-15T00:00:00.000Z" &&
        hist[1].kind === "plan.assigned" && hist[1].planId === "standard",
    "history: the detail's plan history is the EVENT LOG read back (assignments + confirmations, newest first) — status events carry no snapshot and are skipped; there is no second record to drift");

  /* ---- rules: the G3 span + strip proof ---- */
  check(crypto.createHash("sha256").update(stripG3Blocks(stripH3Blocks(stripWaBlocks(stripFR2Blocks(rulesG3)))), "utf8").digest("hex") ===
        "89e84a29bfa17185ded0ee3c98ab6a4c5ffb2a70dc239ab3356106daf14802a5",
    "rules: STRIP PROOF — v9 + G3 minus the ONE delimited G3 span is byte-for-byte the pre-G3 v9 file (its pinned SHA): G3's rules change is purely additive, in its span (H3 same-check amendment: the shared strip helper first cuts the delimited H3 spans — v10's only other deltas, strip-proven against the v9 SHA in the H3 suite) (WA same-check amendment: the helper first cuts the delimited WhatsApp spans too — the v10 amendment's only other deltas, strip-proven against the H3-final v10 SHA in the WA suite) (FR2 same-check amendment: stripFR2Blocks runs first — v11 minus FR2 is v10, strip-proven in the FR2 suite)");
  const g3Span = rulesG3.slice(
    rulesG3.indexOf("// ---- Phase G · G3: platform collections II (START) ----"),
    rulesG3.indexOf("// ---- Phase G · G3: platform collections II (END) ----"));
  check(g3Span.includes("match /businessStats/{businessId}") &&
        g3Span.includes("match /platformPayments/{paymentId}") &&
        g3Span.includes("match /platformConfig/{docId}"),
    "rules: the G3 span lands §6.1's remaining three blocks — soft telemetry, renewal records, platform config");
  const statsBlock = g3Span.slice(g3Span.indexOf("match /businessStats"), g3Span.indexOf("match /platformPayments"));
  const payBlock = g3Span.slice(g3Span.indexOf("match /platformPayments"), g3Span.indexOf("match /platformConfig"));
  const configBlock = g3Span.slice(g3Span.indexOf("match /platformConfig"));
  check(statsBlock.includes("allow read: if isOwner(businessId) || isPlatformAdmin();") &&
        statsBlock.includes("allow create, update: if isOwner(businessId);") &&
        statsBlock.includes("allow delete: if false;") &&
        configBlock.includes("allow read: if isSignedIn();") &&
        configBlock.includes("allow create, update: if isPlatformAdmin();"),
    "rules: telemetry is owner-written + owner/admin-read (a shop reports ITSELF; the platform never writes a shop's figures); config is signed-in-readable, admin-written display data (§6.1)");
  check(payBlock.includes("request.resource.data.get('state', '') == 'submitted'") &&
        payBlock.includes("request.resource.data.get('businessId', '') == request.auth.uid") &&
        payBlock.includes("resource.data.get('state', '') in ['confirmed', 'rejected']") &&
        payBlock.includes("request.resource.data.get('confirmedBy', '') == request.auth.uid") &&
        payBlock.includes("hasOnly(['state', 'confirmedBy', 'confirmedAt', 'note'])") &&
        payBlock.includes("allow delete: if false;"),
    "rules: a payment is BORN submitted in its owner's own name (no client mints a confirmed payment); only an admin moves submitted → confirmed/rejected, signing with their own uid, touching exactly the four settlement fields; delete never");

  /* ---- the PRIVACY suite (§2.3's doctrine as tests) ---- */
  const usersRegion3 = rulesG3.slice(
    rulesG3.indexOf("match /users/{uid}"),
    rulesG3.indexOf("// ---- Phase G · G1: platform collections (START)"));
  const tenantMatches = [...usersRegion3.matchAll(/match \/([a-zA-Z]+)\/\{/g)].map((m) => m[1]);
  check(tenantMatches.length >= 35 &&
        ["journal", "products", "customers", "bills", "sales", "employees", "payrollRuns", "loans"].every((c) => tenantMatches.includes(c)),
    "privacy: the tenant enumeration is complete — " + tenantMatches.length + " named collections under users/{uid} (journal, products, customers, bills, sales, payroll, loans among them); the suite below speaks for EVERY one, not a sample");
  const tenantSegments = usersRegion3.split(/match \/([a-zA-Z]+)\//).slice(1);
  let adminFreeBlocks = tenantMatches.length > 0;
  for (let i = 0; i < tenantSegments.length; i += 2) {
    if (tenantSegments[i + 1].includes("isPlatformAdmin") || tenantSegments[i + 1].includes("platformAdmins")) {
      adminFreeBlocks = false;
    }
  }
  check(adminFreeBlocks && !usersRegion3.includes("isPlatformAdmin"),
    "privacy: EVERY tenant collection's block is admin-free — no read leg, no write leg, no helper call names the platform grant; an admin's read of a shop's books fails at the same catch-all as a stranger's (§2.3, enforced by rules, not policy)");
  check(rulesG3.includes("match /{document=**}") &&
        rulesG3.includes("allow read, write: if false;"),
    "privacy: the catch-all still denies everything unlisted — the platform collections are the ONLY new doors G opened, and they are all outside the tenant namespace");
  const platRegion3 = rulesG3.slice(rulesG3.indexOf("// ---- Phase G · G1: platform collections (START)"));
  const platBlock = (name, next) => platRegion3.slice(platRegion3.indexOf(name), next ? platRegion3.indexOf(next) : undefined);
  check(platBlock("match /businesses/{businessId}", "match /businessMembers").includes("|| isPlatformAdmin()") &&
        platBlock("match /businessCounters/{businessId}", "match /platformAdmins").includes("|| isPlatformAdmin()") &&
        platBlock("match /businessEvents/{eventId}", "// ---- Phase G · G1: platform collections (END)").includes("allow read: if isPlatformAdmin()") &&
        platBlock("match /businessStats/{businessId}", "match /platformPayments").includes("isPlatformAdmin()") &&
        platBlock("match /platformPayments/{paymentId}", "match /platformConfig").includes("allow read: if isPlatformAdmin()"),
    "privacy: the platform's OWN surfaces read fine for an admin — registry, counters, events, telemetry, payments (the closed list, working as designed; the denial above is surgical, not a blanket outage)");
  check(platBlock("match /platformAdmins/{adminUid}", "match /businessEvents").includes("allow create, delete: if isPlatformAdmin();") &&
        !platBlock("match /platformAdmins/{adminUid}", "match /businessEvents").includes("allow create, delete: if request.auth"),
    "privacy: NO self-grant — platformAdmins create/delete require an EXISTING admin; the only first doc is the owner's manual Firebase-console act, outside the rules entirely (§2.1)");
  check([...platform.CONSOLE_READ_COLLECTIONS].join(",") ===
        "businesses,businessCounters,businessStats,businessEvents,platformPayments,platformAdmins,platformConfig" &&
        platform.CONSOLE_READ_COLLECTIONS.every((c) => !c.includes("/")),
    "privacy: the console's read list is CLOSED and pinned — seven top-level platform collections (G4 added platformConfig: platform display data), no tenant path among them; adding a name here is a design change that fails this suite until §2.3 is amended");

  /* ---- i18n: the console strings ---- */
  const platKeys = Object.keys(i18n.en).filter((k) => k.startsWith("platform."));
  check(platKeys.length === 101 && platKeys.every((k) => typeof i18n.ur[k] === "string" && i18n.ur[k].length > 0) &&
        Object.keys(i18n.en).length === 3136 && Object.keys(i18n.ur).length === 3136,
    "i18n: all 101 platform.* keys exist in EN and UR (dictionary 3,054 (G4 pin amendment: +12 platform.*; G6: +25 backup.* keys; H1 pin amendment: +51 loyalty keys; H3 pin amendment: +108 storefront keys; WA pin amendment: +109 WhatsApp keys) — the config editor + the amount-mismatch flag) — the console is bilingual like every other surface; the platform team works in the same two languages");

  /* ---- source wiring + the console's own closed list ---- */
  const platLibSrc = readSrc3("lib/platform.ts");
  check(!platLibSrc.includes("firebase") && !platLibSrc.includes("users/${"),
    "purity: lib/platform imports no Firebase and constructs no tenant path — the planners are pure, so the privacy list is a property of the code, not of its callers");
  const platDataSrc = readSrc3("components/PlatformData.tsx");
  check(!platDataSrc.includes("users/") && !platDataSrc.includes("StoreProvider") &&
        !platDataSrc.includes("makeEntry(") && !platDataSrc.includes("lib/selectors") &&
        !platDataSrc.includes("lib/ledger") && !platDataSrc.includes("lib/reports") &&
        platDataSrc.includes("platformAdmins") && platDataSrc.includes("businessEvents"),
    "source: the console's data layer has NO import path to tenant data — no store, no selectors/ledger/reports, no `users/` path anywhere; it reads only platform collections and executes the lib's plans");
  check(["components/PlatformConsole.tsx", "components/PlatformDetail.tsx", "components/PlatformAdmins.tsx"].every((f) => {
          const s = readSrc3(f);
          return !s.includes("users/") && !s.includes("useStore") && !s.includes("StoreProvider");
        }),
    "source: no console component touches the shop store or a tenant path — a shopkeeper-admin's console session cannot leak one hat into the other");
  const shellSrc3 = readSrc3("components/AppShell.tsx");
  const platBranch = shellSrc3.slice(shellSrc3.indexOf("if (isPlatform)"), shellSrc3.indexOf("if (isAuth)"));
  check(shellSrc3.includes('"/platform"') && platBranch.length > 0 &&
        !platBranch.includes("<Sidebar") && !platBranch.includes("<AuthGate") &&
        !platBranch.includes("BusinessSwitcher") && platBranch.includes("platform.badge"),
    "source: /platform renders in its OWN minimal shell — no shop sidebar, no shop AuthGate (no redirect games, no no-access hijack), no business switcher; the platform badge is always on it, so the two hats are never confused");
  check(readSrc3("app/platform/page.tsx").includes("PlatformConsole") &&
        (readSrc3("components/StoreProvider.tsx").match(/makeEntry\(/g) || []).length === 24,
    "source: the /platform route mounts the console; the store still composes exactly 24 journal entries — the platform layer posts nothing, ever");

  /* ---- frozen seed identities ---- */
  const journalG3 = seed.getSeedJournal(products, sales, purchases, payments, expenses, credits);
  const shaG3 = crypto.createHash("sha256")
    .update(JSON.stringify(journalG3.map((e) => { const { ts, ...rest } = e; return rest; })), "utf8")
    .digest("hex");
  const tbG3 = reports.trialBalance(journalG3, reports.resolveReportRange("custom", null, { from: "2000-01-01", to: "2100-12-31" }));
  check(journalG3.length === 21 && shaG3 === "e17e5bda19e87de698b0c0a37e923f9b396bc387e2092b2ffbbd7d60d4971168" &&
        eq(ledger.accountBalance(journalG3, "inventory"), 272805) &&
        eq(ledger.accountBalance(journalG3, "cash"), 50000) &&
        eq(ledger.payablesTotal(journalG3), 27900) && eq(ledger.receivablesTotal(journalG3), 5500) &&
        eq(tbG3.totalDebits, tbG3.totalCredits),
    "seed: frozen identities intact — 21 entries, the pinned SHA, Inventory 272,805 · Cash 50,000 · payables 27,900 · receivables 5,500, TB balanced. The platform administers businesses; it has never touched a journal");
}


/* =============================== G4 (Phase G · G4 — renewal flow + trial lifecycle) =============================== */
{
  suite("G4", null); // Phase G · G4 — the owner renewal surface's pure core (lib/renewal), the platformConfig act + amount check (lib/platform), the lifecycle banners, and the full scripted lifecycle walk (design §3.4–§3.6/§8-G4)

  const readSrc4 = (p) => fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/" + p, "utf8");
  const rulesG4 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8"
  );
  const shaRulesG4 = crypto.createHash("sha256").update(stripH3Blocks(stripWaBlocks(stripFR2Blocks(rulesG4))), "utf8").digest("hex");
  const journalG4 = seed.getSeedJournal(products, sales, purchases, payments, expenses, credits);
  const shaJournalG4 = () =>
    crypto.createHash("sha256")
      .update(JSON.stringify(journalG4.map((e) => { const { ts, ...rest } = e; return rest; })), "utf8")
      .digest("hex");
  const SEED_SHA = "e17e5bda19e87de698b0c0a37e923f9b396bc387e2092b2ffbbd7d60d4971168";
  const walkWrites = []; // every platform write the walk produces — swept at the end for tenant paths

  /* ---- the quote arithmetic (§3.5) ---- */
  const T0 = "2027-01-01T00:00:00.000Z";
  const birthR = tenancy.planTrialBirth({
    ownerUid: "bizR", ownerEmail: "r@x.pk", shopName: "Renewal Shop", phone: "", nowISO: T0,
  });
  const regTrial = birthR.find((w) => w.kind === "set" && w.path === "businesses/bizR").data;
  check(regTrial.plan.planId === "trial" && regTrial.plan.trialEndsAt === "2027-01-15T00:00:00.000Z" &&
        shaJournalG4() === SEED_SHA,
    "walk 0 · trial birth: the lifecycle shop is born on the trial snapshot (ends 2027-01-15); the seed journal's SHA stands");
  const q1 = renewal.renewalQuote(regTrial, "basic", "monthly", "2027-01-06T00:00:00.000Z");
  check(q1.ok && q1.quote.amount === 1500 &&
        q1.quote.periodFrom === "2027-01-15T00:00:00.000Z" && q1.quote.periodTo === "2027-02-15T00:00:00.000Z",
    "quote: mid-trial, a monthly Basic purchase is priced 1,500 FROM the catalogue and starts the day the trial ends — bought time is never overlapped or lost");
  const q2 = renewal.renewalQuote(regTrial, "standard", "annual", "2027-01-06T00:00:00.000Z");
  check(q2.ok && q2.quote.amount === 25000 && q2.quote.periodTo === "2028-01-15T00:00:00.000Z",
    "quote: annual = 10 × monthly (§3.1) — Standard annual is 25,000 for a full year from the trial's end");
  const regMonthEnd = { ...regTrial, status: "active",
    plan: { ...plans.snapshotFor("basic", "2026-12-31T00:00:00.000Z", { assignedBy: "admin" }),
            periodFrom: "2026-12-31T00:00:00.000Z", periodTo: "2027-01-31T00:00:00.000Z", trialEndsAt: null } };
  const q3 = renewal.renewalQuote(regMonthEnd, "basic", "monthly", "2027-01-10T00:00:00.000Z");
  check(q3.ok && q3.quote.periodFrom === "2027-01-31T00:00:00.000Z" && q3.quote.periodTo === "2027-02-28T00:00:00.000Z" &&
        renewal.addMonthsISO("2027-01-31T00:00:00.000Z", 12) === "2028-01-31T00:00:00.000Z",
    "quote: an early renewal extends from the CURRENT period end (not from today), and month arithmetic clamps at month end (Jan 31 + 1mo = Feb 28, + 12mo = next Jan 31)");
  check(!renewal.renewalQuote(null, "basic", "monthly", T0).ok &&
        renewal.renewalQuote(null, "basic", "monthly", T0).reason === "no-registry" &&
        renewal.renewalQuote(regTrial, "trial", "monthly", T0).reason === "not-purchasable" &&
        renewal.renewalQuote(regTrial, "founding", "monthly", T0).reason === "not-purchasable" &&
        renewal.renewalQuote(regTrial, "enterprise", "monthly", T0).reason === "custom-plan" &&
        renewal.renewalQuote({ ...regTrial, plan: tenancy.foundingPlanSnapshot(T0) }, "basic", "monthly", T0).reason === "not-applicable",
    "quote refusals: no registry / the trial itself / founding / a custom Enterprise price are never quoted a catalogue figure; a founding shop is told renewal does not apply at all");

  /* ---- the submission plan (§3.5) ---- */
  const subBase = {
    registry: regTrial, businessId: "bizR", planId: "standard", billing: "monthly",
    method: "raast", reference: "FT-778899", actor: "bizR", now: "2027-01-06T00:00:00.000Z",
  };
  const sub1 = renewal.planRenewalSubmission({ ...subBase, ownerNote: "Paid via my Raast app" });
  walkWrites.push(...(sub1.ok ? sub1.writes : []));
  check(sub1.ok && sub1.writes.length === 1 && sub1.writes[0].kind === "add" &&
        sub1.writes[0].collection === "platformPayments" &&
        sub1.writes[0].data.state === "submitted" && sub1.writes[0].data.businessId === "bizR" &&
        sub1.writes[0].data.submittedBy === "bizR" && sub1.writes[0].data.amount === 2500 &&
        sub1.writes[0].data.planId === "standard" && sub1.writes[0].data.billingPeriod === "monthly" &&
        sub1.writes[0].data.periodFrom === "2027-01-15T00:00:00.000Z" &&
        sub1.writes[0].data.periodTo === "2027-02-15T00:00:00.000Z" &&
        sub1.writes[0].data.ownerNote === "Paid via my Raast app" &&
        sub1.writes[0].data.confirmedBy === null && sub1.writes[0].data.confirmedAt === null,
    "submission: exactly ONE platform write — a platformPayments record born `submitted` in the owner's own name (the rules' create shape), the amount composed from the catalogue (never caller-supplied), the owner note riding along, settlement fields empty");
  const subNoNote = renewal.planRenewalSubmission(subBase);
  check(subNoNote.ok && !("ownerNote" in subNoNote.writes[0].data),
    "submission: no owner note, no ownerNote field — the record carries only what was supplied");
  check(renewal.planRenewalSubmission({ ...subBase, actor: "someone-else" }).reason === "not-owner" &&
        renewal.planRenewalSubmission({ ...subBase, reference: "   " }).reason === "reference-required" &&
        renewal.planRenewalSubmission({ ...subBase, method: "card" }).reason === "bad-method" &&
        renewal.planRenewalSubmission({ ...subBase, registry: null }).reason === "no-registry" &&
        [renewal.planRenewalSubmission({ ...subBase, actor: "x" }),
         renewal.planRenewalSubmission({ ...subBase, reference: "" })]
          .every((r) => !r.ok && r.writes.length === 0),
    "submission refusals write NOTHING: only the owner submits for their own business, a payment reference is mandatory (it is the admin's matching key), the method is one of the five rails, and a registry must exist");

  /* ---- the amount check (§3.5: flagged, never settled) ---- */
  check(platform.paymentAmountCheck({ planId: "standard", amount: 2500, billingPeriod: "monthly", periodFrom: "2027-01-15T00:00:00.000Z", periodTo: "2027-02-15T00:00:00.000Z" }) === "ok" &&
        platform.paymentAmountCheck({ planId: "standard", amount: 25000, billingPeriod: "annual", periodFrom: "2027-01-15T00:00:00.000Z", periodTo: "2028-01-15T00:00:00.000Z" }) === "ok" &&
        platform.paymentAmountCheck({ planId: "standard", amount: 2400, billingPeriod: "monthly", periodFrom: "2027-01-15T00:00:00.000Z", periodTo: "2027-02-15T00:00:00.000Z" }) === "mismatch" &&
        platform.paymentAmountCheck({ planId: "standard", amount: 2500, billingPeriod: "annual", periodFrom: "2027-01-15T00:00:00.000Z", periodTo: "2028-01-15T00:00:00.000Z" }) === "mismatch" &&
        platform.paymentAmountCheck({ planId: "enterprise", amount: 9999, periodFrom: "2027-01-15T00:00:00.000Z", periodTo: "2027-02-15T00:00:00.000Z" }) === "custom" &&
        platform.paymentAmountCheck({ planId: "advanced", amount: 40000, periodFrom: "2027-01-15T00:00:00.000Z", periodTo: "2028-01-15T00:00:00.000Z" }) === "ok" &&
        platform.paymentAmountCheck({ planId: "advanced", amount: 4000, periodFrom: "2027-01-15T00:00:00.000Z", periodTo: "2028-01-15T00:00:00.000Z" }) === "mismatch",
    "amount check: the queue compares every record against catalogue × period — exact matches pass, under/over-payments and monthly-priced 'annual' records FLAG as mismatches, Enterprise reads custom (nothing to compare), and a legacy record without a billing period infers its span from its own dates");

  /* ---- the platformConfig act (§3.5/§8-G4 item 3) ---- */
  const cfgFields = {
    raastNumber: "0300-1234567", iban: "PK36ABCD0000000000000000", bankName: "Meezan Bank",
    accountTitle: "CodeHubb", instructions: "Send to the Raast number, then submit the FT id.", supportContact: "support@codehubb.com",
  };
  const cfgSave1 = platform.planSavePlatformConfig({
    config: cfgFields, current: null, actor: "admin-1", now: "2027-01-02T00:00:00.000Z",
  });
  walkWrites.push(...(cfgSave1.ok ? cfgSave1.writes : []));
  check(cfgSave1.ok && cfgSave1.writes.length === 2 &&
        cfgSave1.writes[0].kind === "set" && cfgSave1.writes[0].path === "platformConfig/main" &&
        cfgSave1.writes[0].data.raastNumber === "0300-1234567" &&
        cfgSave1.writes[0].data.updatedBy === "admin-1" &&
        cfgSave1.writes[0].data.updatedAt === "2027-01-02T00:00:00.000Z" &&
        cfgSave1.writes[1].kind === "add" && cfgSave1.writes[1].collection === "businessEvents" &&
        cfgSave1.writes[1].data.businessId === "platform" &&
        cfgSave1.writes[1].data.kind === "platformConfig.updated" &&
        cfgSave1.writes[1].data.detail.changed.length === 6,
    "config act: the first save creates platformConfig/main AND its audit event in one plan — the event rides under the reserved 'platform' business id with every field named as changed");
  const cfgSaved = cfgSave1.writes[0].data;
  const cfgSave2 = platform.planSavePlatformConfig({
    config: { ...cfgFields, iban: "PK00NEWBANK000000000000000" },
    current: cfgSaved, actor: "admin-1", now: "2027-01-03T00:00:00.000Z",
  });
  walkWrites.push(...(cfgSave2.ok ? cfgSave2.writes : []));
  check(cfgSave2.ok &&
        JSON.stringify(cfgSave2.writes[1].data.detail.changed) === "[\"iban\"]" &&
        cfgSave2.writes[1].data.detail.before.iban === "PK36ABCD0000000000000000" &&
        cfgSave2.writes[1].data.detail.after.iban === "PK00NEWBANK000000000000000",
    "config act: a later save's event names ONLY what changed, with before/after — the §2.3 audit doctrine holds for platform content too");
  check(platform.CONSOLE_ACTS.includes("planSavePlatformConfig") &&
        platform.CONSOLE_READ_COLLECTIONS.includes("platformConfig") &&
        platform.PLATFORM_CONFIG_DOC_ID === "main",
    "config: the act is on the console's closed act list and the collection on its closed read list — the editor is an audited console surface, not a side door");

  /* ---- the lifecycle banner derivation (§3.4/§3.6) ---- */
  const viewAt = (reg, now) => plans.planViewOf(reg, null, now);
  const bTrial = renewal.lifecycleBanner(viewAt(regTrial, "2027-01-06T00:00:00.000Z"), "2027-01-06T00:00:00.000Z");
  const bApproach = renewal.lifecycleBanner(viewAt(regTrial, "2027-01-09T00:00:00.000Z"), "2027-01-09T00:00:00.000Z");
  const bUrgent = renewal.lifecycleBanner(viewAt(regTrial, "2027-01-14T12:00:00.000Z"), "2027-01-14T12:00:00.000Z");
  check(bTrial.kind === "trial" && bTrial.daysLeft === 9 &&
        bApproach.kind === "trial-approaching" && bApproach.daysLeft === 6 &&
        bUrgent.kind === "trial-urgent" && bUrgent.daysLeft === 1,
    "banner: the trial countdown tiers by the days left — plain countdown beyond a week, approaching inside 7 days, urgent on the last day — the §3.4 notice points, derived from the same state the shell renders");
  const bGrace = renewal.lifecycleBanner(viewAt(regTrial, "2027-01-20T00:00:00.000Z"), "2027-01-20T00:00:00.000Z");
  const bReadonly = renewal.lifecycleBanner(viewAt(regTrial, "2027-02-20T00:00:00.000Z"), "2027-02-20T00:00:00.000Z");
  check(bGrace.kind === "grace" && bGrace.daysElapsed === 5 && bGrace.graceLeft === 25 &&
        bReadonly.kind === "readonly",
    "banner: grace names the days elapsed AND the days of grace left (trial end + 30d, inclusive); past the grace end the banner is the read-only fact");
  check(renewal.lifecycleBanner(viewAt(regMonthEnd, "2027-01-10T00:00:00.000Z"), "2027-01-10T00:00:00.000Z") === null &&
        renewal.lifecycleBanner(viewAt({ ...regTrial, plan: tenancy.foundingPlanSnapshot(T0) }, "2027-01-06T00:00:00.000Z"), "2027-01-06T00:00:00.000Z") === null,
    "banner: a healthy active shop and a founding shop see NO lifecycle banner — banners are state facts, not nagging");
  check(renewal.latestSuspensionReason([
          { businessId: "bizR", kind: "business.suspended", actor: "admin-1", at: "2027-01-03T00:00:00.000Z", detail: { reason: "Chargeback abuse" } },
          { businessId: "bizR", kind: "business.activated", actor: "admin-1", at: "2027-01-04T00:00:00.000Z", detail: {} },
        ]) === null &&
        renewal.latestSuspensionReason([
          { businessId: "bizR", kind: "business.activated", actor: "admin-1", at: "2027-01-02T00:00:00.000Z", detail: {} },
          { businessId: "bizR", kind: "business.suspended", actor: "admin-1", at: "2027-01-03T00:00:00.000Z", detail: { reason: "Chargeback abuse" } },
        ]) === "Chargeback abuse" &&
        renewal.latestSuspensionReason([]) === null,
    "banner: the suspension reason is the LATEST suspension act's recorded reason — a later activation clears it, so the banner never accuses a reinstated shop (§2.4)");

  /* ---- THE LIFECYCLE WALK (§8-G4's checkpoint) ----
   * trial birth → trading → trial expiry → grace (posting
   * denied, reads/exports never gated) → payment submitted →
   * admin confirms → active with the extended period →
   * period runs out → grace → readonly → renewal again →
   * active. The shop journal's SHA is spot-asserted at
   * EVERY step: platform acts never touch the journal. */
  let reg = regTrial;
  check(plans.derivePlanState(reg, "2027-01-10T00:00:00.000Z") === "trial" &&
        plans.rulesPlanPostable({ ...reg, enforce: true }, "2027-01-10T00:00:00.000Z") === true &&
        shaJournalG4() === SEED_SHA,
    "walk 1 · trading: mid-trial the shop trades and (under enforcement) posts freely; journal SHA unchanged");
  check(plans.derivePlanState(reg, "2027-01-15T00:00:00.000Z") === "trial" &&
        plans.derivePlanState(reg, "2027-01-15T00:00:00.001Z") === "grace" &&
        plans.derivePlanState(reg, "2027-02-14T00:00:00.000Z") === "grace" &&
        plans.derivePlanState(reg, "2027-02-14T00:00:00.001Z") === "readonly" &&
        shaJournalG4() === SEED_SHA,
    "walk 2 · expiry: the trial's end instant still belongs to the trial; grace runs 30 further days inclusive; read-only begins 1 ms later — no act, no flag, pure derivation; journal SHA unchanged");
  check(plans.rulesPlanPostable({ ...reg, enforce: true }, "2027-01-20T00:00:00.000Z") === false &&
        rulesG4.includes("allow read: if canAccess(uid);") &&
        !/allow read:[^;]*plan/i.test(rulesG4),
    "walk 3 · grace posture: under enforcement, posting is DENIED in grace — while the rules' read seam carries NO plan condition at all, so the shop's data (and its export) stays fully readable; the lock is on writing, never on seeing; journal SHA unchanged");
  const S1 = "2027-01-20T10:00:00.000Z";
  const walkSub1 = renewal.planRenewalSubmission({
    registry: reg, businessId: "bizR", planId: "standard", billing: "monthly",
    method: "raast", reference: "FT-WALK-1", actor: "bizR", now: S1,
  });
  walkWrites.push(...(walkSub1.ok ? walkSub1.writes : []));
  check(walkSub1.ok && walkSub1.writes[0].data.periodFrom === S1 &&
        walkSub1.writes[0].data.periodTo === "2027-02-20T10:00:00.000Z" &&
        walkSub1.writes[0].data.amount === 2500 && shaJournalG4() === SEED_SHA,
    "walk 4 · submission in grace: a grace shop CAN submit (the remedy is never blocked, §2.4) — the purchased month runs from the submission instant (the trial's end is already past), priced from the catalogue; journal SHA unchanged");
  const payWalk1 = { ...walkSub1.writes[0].data, id: "payW1" };
  const C1 = "2027-01-21T09:00:00.000Z";
  const confirmW1 = platform.planConfirmPayment({ payment: payWalk1, business: reg, actor: "admin-1", now: C1 });
  walkWrites.push(...(confirmW1.ok ? confirmW1.writes : []));
  check(confirmW1.ok && confirmW1.writes[0].data.state === "confirmed" &&
        confirmW1.writes[0].data.confirmedAt === C1 &&
        confirmW1.writes[1].data.plan.planId === "standard" &&
        confirmW1.writes[1].data.plan.periodFrom === S1 &&
        confirmW1.writes[1].data.plan.periodTo === "2027-02-20T10:00:00.000Z" &&
        confirmW1.writes[1].data.plan.trialEndsAt === null &&
        shaJournalG4() === SEED_SHA,
    "walk 5 · confirmation: the console settles the record and the registry's snapshot refreshes FROM THE PAYMENT'S OWN TERMS — the period the owner bought at submission is honoured verbatim, so confirmation lag can never eat purchased time; the trial converts to paid; journal SHA unchanged");
  reg = { ...reg, plan: confirmW1.writes[1].data.plan };
  check(plans.derivePlanState(reg, C1) === "active" &&
        plans.rulesPlanPostable({ ...reg, enforce: true }, C1) === true &&
        renewal.lifecycleBanner(viewAt(reg, C1), C1) === null && shaJournalG4() === SEED_SHA,
    "walk 6 · active again: state derives back to active, posting resumes by derivation alone (no flag surgery), the banner clears; journal SHA unchanged");
  check(plans.derivePlanState(reg, "2027-02-20T10:00:00.000Z") === "active" &&
        plans.derivePlanState(reg, "2027-02-20T10:00:00.001Z") === "grace" &&
        plans.derivePlanState(reg, "2027-03-22T10:00:00.000Z") === "grace" &&
        plans.derivePlanState(reg, "2027-03-22T10:00:00.001Z") === "readonly" &&
        renewal.lifecycleBanner(viewAt(reg, "2027-03-25T08:00:00.000Z"), "2027-03-25T08:00:00.000Z").kind === "readonly" &&
        shaJournalG4() === SEED_SHA,
    "walk 7 · the period runs out: active through its end instant, grace for 30 days, then read-only — the second descent needs no one's hand; journal SHA unchanged");
  const S2 = "2027-03-25T08:00:00.000Z";
  const walkSub2 = renewal.planRenewalSubmission({
    registry: reg, businessId: "bizR", planId: "advanced", billing: "annual",
    method: "bank", reference: "IBFT-WALK-2", actor: "bizR", now: S2,
  });
  walkWrites.push(...(walkSub2.ok ? walkSub2.writes : []));
  const confirmW2 = walkSub2.ok
    ? platform.planConfirmPayment({ payment: { ...walkSub2.writes[0].data, id: "payW2" }, business: reg, actor: "admin-1", now: "2027-03-25T12:00:00.000Z" })
    : { ok: false, writes: [] };
  walkWrites.push(...(confirmW2.ok ? confirmW2.writes : []));
  check(walkSub2.ok && walkSub2.writes[0].data.amount === 40000 &&
        walkSub2.writes[0].data.periodTo === "2028-03-25T08:00:00.000Z" && confirmW2.ok &&
        shaJournalG4() === SEED_SHA,
    "walk 8 · renewal from read-only: even a read-only shop submits (the remedy is never blocked) — an annual Advanced year at 40,000 from the submission instant, confirmed the same day; journal SHA unchanged");
  reg = { ...reg, plan: confirmW2.writes[1].data.plan };
  check(plans.derivePlanState(reg, "2027-03-25T12:00:00.000Z") === "active" &&
        reg.plan.planId === "advanced" && shaJournalG4() === SEED_SHA,
    "walk 9 · active on the new plan: the shop stands active on Advanced for the purchased year — the full lifecycle (trial → grace → paid → lapse → read-only → renewed) closed by derivation alone; journal SHA unchanged");
  const qEarly = renewal.renewalQuote(reg, "basic", "monthly", "2027-06-01T00:00:00.000Z");
  check(qEarly.ok && qEarly.quote.periodFrom === "2028-03-25T08:00:00.000Z" &&
        qEarly.quote.periodTo === "2028-04-25T08:00:00.000Z" && qEarly.quote.amount === 1500,
    "walk 10 · early renewal stacks: buying again mid-period extends from the CURRENT period end (2028-03-25), never from today — purchased time is additive, always");

  /* ---- the rejected branch (§3.5) ---- */
  const regGrace = regTrial; // still in grace at S1 below
  const rejSub = renewal.planRenewalSubmission({
    registry: regGrace, businessId: "bizR", planId: "basic", billing: "monthly",
    method: "jazzcash", reference: "JC-BAD-1", actor: "bizR", now: S1,
  });
  const rejPay = { ...rejSub.writes[0].data, id: "payRJ" };
  const rejected = platform.planRejectPayment({
    payment: rejPay, note: "Slip unreadable — resend a clear photo", actor: "admin-1", now: "2027-01-21T09:30:00.000Z",
  });
  walkWrites.push(...(rejected.ok ? rejected.writes : []));
  const resub = renewal.planRenewalSubmission({
    registry: regGrace, businessId: "bizR", planId: "basic", billing: "monthly",
    method: "jazzcash", reference: "JC-GOOD-2", actor: "bizR", now: "2027-01-21T10:00:00.000Z",
  });
  check(rejSub.ok && rejected.ok && rejected.writes[0].data.state === "rejected" &&
        rejected.writes[0].data.note === "Slip unreadable — resend a clear photo" &&
        rejected.writes.length === 2 &&
        plans.derivePlanState(regGrace, "2027-01-21T10:00:00.000Z") === "grace" &&
        resub.ok && shaJournalG4() === SEED_SHA,
    "rejected branch: rejection settles ONLY the record (no registry write — the shop stays exactly where it was, in grace) and the admin's note rides the record the owner reads; the resubmission path plans cleanly; journal SHA unchanged");

  /* ---- the walk's write sweep + frozen identities ---- */
  check(walkWrites.length > 0 &&
        walkWrites.every((w) => !(w.path || "").startsWith("users/") && w.collection !== "journal") &&
        walkWrites.every((w) => w.kind !== "set" || w.path === "platformConfig/main" || (w.path || "").startsWith("businesses/") || (w.path || "").startsWith("platformPayments/")),
    "sweep: across the whole walk, NO platform write touches a tenant path — submissions and settlements land only on platformPayments / businesses / platformConfig / businessEvents; the shop's books are never a platform write's target");
  check(shaRulesG4 === "734f6ba4cebc9c19203e0d022b810a7e1c76e57fd644d040abbe2a421ad7d3ad" &&
        journalG4.length === 21 && shaJournalG4() === SEED_SHA &&
        eq(ledger.accountBalance(journalG4, "inventory"), 272805) &&
        eq(ledger.accountBalance(journalG4, "cash"), 50000) &&
        eq(ledger.payablesTotal(journalG4), 27900) && eq(ledger.receivablesTotal(journalG4), 5500),
    "frozen: rules v9 is byte-identical (G4 needed NO rules change — the G3 blocks already carried the renewal surface), and the seed identities stand — 21 entries, the pinned SHA, Inventory 272,805 · Cash 50,000 · payables 27,900 · receivables 5,500 (H3 same-check amendment: the hash runs over stripH3Blocks(rules) — v10 minus the H3 spans IS v9, strip-proven in the H3 suite) (WA same-check amendment: the hash runs over stripH3Blocks(stripWaBlocks(rules)) — the amended v10 minus the WhatsApp spans is the H3-final v10, strip-proven in the WA suite) (FR2 same-check amendment: the hash runs over stripH3Blocks(stripWaBlocks(stripFR2Blocks(rules))) — v11 minus FR2 is v10, strip-proven in the FR2 suite)");

  /* ---- i18n: the renewal strings ---- */
  const renewKeys = Object.keys(i18n.en).filter((k) => k.startsWith("renew."));
  const planKeysG4 = Object.keys(i18n.en).filter((k) => k.startsWith("plan."));
  check(renewKeys.length === 35 &&
        renewKeys.every((k) => typeof i18n.ur[k] === "string" && i18n.ur[k].length > 0) &&
        planKeysG4.length === 36 &&
        Object.keys(i18n.en).length === 3136 && Object.keys(i18n.ur).length === 3136,
    "i18n: all 35 new renew.* keys exist in EN and UR (dictionary 3,054 (G4 pin amendment: +47 = 35 renew.* + 12 platform.*; G6: +25 backup.* keys; H1 pin amendment: +51 loyalty keys; H3 pin amendment: +108 storefront keys; WA pin amendment: +109 WhatsApp keys); the plan.* count stays 36 — the renewal surface is bilingual like every other surface");

  /* ---- source wiring ---- */
  const storeSrcG4 = readSrc4("components/StoreProvider.tsx");
  check(storeSrcG4.includes('collection(db, "platformPayments")') &&
        storeSrcG4.includes('doc(db, "platformConfig"') &&
        storeSrcG4.includes('collection(db, "businessEvents")') &&
        storeSrcG4.includes("planRenewalSubmission") &&
        (storeSrcG4.match(/makeEntry\(/g) || []).length === 24,
    "source: the store subscribes the owner's own payments + the platform config + the business's own events, and executes the renewal plan — while still composing exactly 24 journal entries (a renewal is a platform write, never a sale)");
  const panelSrcG4 = readSrc4("components/PlanPanel.tsx");
  check(panelSrcG4.includes("renewalQuote") && panelSrcG4.includes("submitRenewalPayment") &&
        panelSrcG4.includes("ownPayments") && panelSrcG4.includes("platformConfig"),
    "source: the Settings plan panel grew its action half — quote preview, instructions from the platform config, the submission, and the business's own payment history");
  const platDataSrcG4 = readSrc4("components/PlatformData.tsx");
  const cfgSrcG4 = readSrc4("components/PlatformConfig.tsx");
  const consoleSrcG4 = readSrc4("components/PlatformConsole.tsx");
  const payQueueSrcG4 = readSrc4("components/PlatformPayments.tsx");
  check(platDataSrcG4.includes('collection(db, "platformConfig")') &&
        cfgSrcG4.includes("planSavePlatformConfig") &&
        consoleSrcG4.includes("PlatformConfig") && consoleSrcG4.includes("platform.tab.config") &&
        payQueueSrcG4.includes("paymentAmountCheck") && payQueueSrcG4.includes("platform.pay.mismatch"),
    "source: the console grew the config tab + editor (saving through the audited act), and the payment queue flags catalogue mismatches inline");
  const shellSrcG4 = readSrc4("components/AppShell.tsx");
  check(shellSrcG4.includes("lifecycleBanner") && shellSrcG4.includes("renew.cta") &&
        shellSrcG4.includes("suspensionReason") && shellSrcG4.includes("plan.suspendedBanner"),
    "source: the shell banner renders lib/renewal's lifecycle derivation — countdown tiers, grace with its days left, read-only, suspension with its reason — with the renewal path into Settings on the renewable states");
  const renewalSrc = readSrc4("lib/renewal.ts");
  check(!renewalSrc.includes("firebase") && !renewalSrc.includes("enforce: true") &&
        !readSrc4("lib/platform.ts").includes("enforce: true"),
    "purity: lib/renewal is Firebase-free pure planning, and enforcement stays OFF in every line of shipping code (staged rollout, §6) — G4 ships the lifecycle, not the lock");
}

/* =============================== G6 (Phase G · G6 — backup & restore, design §9) =============================== */
{
  suite("G6", null);
  const NOW6 = "2026-10-23T12:00:00.000Z";
  const A6 = "bizA6";
  const B6 = "bizB6";
  const J6 = (v) => JSON.parse(JSON.stringify(v));
  const readSrc6 = (p) => fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/" + p, "utf8");

  /* ---- SHA-256 known answers + the journal fingerprint ---- */
  check(backup.sha256Hex("") === "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" &&
        backup.sha256Hex("abc") === "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad" &&
        backup.sha256Hex("دکان ایپ") === crypto.createHash("sha256").update("دکان ایپ", "utf8").digest("hex") &&
        backup.sha256Hex("x".repeat(100000)) === crypto.createHash("sha256").update("x".repeat(100000), "utf8").digest("hex"),
    "sha256: lib/backup's self-contained SHA-256 reproduces the published known answers (empty, abc) and Node's crypto on Urdu text and a 100 KB input — the fingerprint's hash is not taken on faith");
  check(backup.journalFingerprint(journal) === "e17e5bda19e87de698b0c0a37e923f9b396bc387e2092b2ffbbd7d60d4971168",
    "fingerprint: fed the frozen seed journal, lib/backup's fingerprint IS the B1-recorded e17e5bda…1168 — the manifest's fingerprint and the audit's frozen identity are one computation (drop ts, JSON, SHA-256)");
  {
    const retimed = journal.map((e) => ({ ...e, ts: "2030-01-01T00:00:00.000Z" }));
    const tampered = J6(journal);
    tampered[0].lines[0].debit += 1;
    check(backup.journalFingerprint(retimed) === backup.journalFingerprint(journal) &&
          backup.journalFingerprint(tampered) !== backup.journalFingerprint(journal),
      "fingerprint: blind to wall-clock ts (the B1 normalization drops it) and sensitive to a single rupee in a single line — a restore that altered money could not pass it");
  }

  /* ---- the fixture shop: the seed business, assembled as the
   * store assembles it (same getters, same empty collections) ---- */
  const prods6 = seed.getSeedProducts();
  const customers6 = seed.getSeedCustomers();
  const employees6 = seed.getSeedEmployees();
  const orders6 = seed.getSeedSaleOrders(customers6, prods6);
  const shopCollections = {
    products: prods6,
    sales,
    bills: [],
    suppliers: seed.getSeedSuppliers(),
    purchases,
    supplierPayments: payments,
    expenses,
    credits,
    customers: customers6,
    returns: [],
    adjustments: [],
    dayCloses: [],
    cashEntries: [],
    journal,
    accounts,
    taxSlabs: seed.getSeedTaxSlabs(),
    periods: [],
    quotations: seed.getSeedQuotations(customers6, prods6),
    saleOrders: orders6,
    deliveryChallans: seed.getSeedDeliveryChallans(orders6),
    purchaseOrders: [],
    notes: [],
    purchaseReturns: [],
    cheques: [],
    warehouses: seed.getSeedWarehouses(),
    stockLevels: seed.getSeedStockLevels(prods6),
    stockTransfers: seed.getSeedStockTransfers(prods6),
    boms: seed.getSeedBoms(prods6),
    productionOrders: seed.getSeedProductionOrders(prods6, seed.getSeedBoms(prods6)),
    jobs: seed.getSeedJobs(customers6),
    employees: employees6,
    attendance: seed.getSeedAttendance(employees6),
    payrollRuns: [seed.getSeedPayrollRunDraft(employees6, seed.getSeedAttendance(employees6))],
    loans: seed.getSeedLoans(),
    branding: [],
    waTemplates: [],
    waCampaigns: [],
    waSends: [],
  };
  const ownerDoc6 = {
    ...seed.getSeedSettings(),
    staffEmails: ["staff@shop.pk"],
    staff: [{ email: "staff@shop.pk", role: "manager", addedAt: NOW6 }],
  };
  const mig6 = tenancy.planMigration({
    ownerUid: A6, ownerEmail: "owner@shop.pk", shopName: "Madina General Store",
    phone: "0300", staffEmails: ["staff@shop.pk"], registryExists: false,
    bills: [], sales: [], nowISO: NOW6,
  });
  const platformRaw6 = {
    registry: mig6.find((w) => w.path === `businesses/${A6}`).data,
    counters: mig6.find((w) => w.path === `businessCounters/${A6}`).data,
    stats: null,
    members: [{ key: "uid-staff-1", data: { email: "staff@shop.pk", role: "manager", addedBy: A6, addedAt: NOW6, source: "staff" } }],
    invites: [{ key: "pending@shop.pk", data: { email: "pending@shop.pk", role: "cashier", status: "pending", invitedBy: A6, createdAt: NOW6 } }],
    events: [
      { key: "evt-mig", data: mig6.find((w) => w.kind === "add").data },
      { key: "evt-foreign", data: { businessId: "bizFOREIGN", kind: "plan.assigned", actor: "admin1", at: NOW6, detail: {} } },
    ],
    payments: [
      { key: "pay-1", data: { businessId: A6, amount: 2500, method: "raast", reference: "R-1", periodFrom: "2026-10-01", periodTo: "2026-11-01", planId: "standard", state: "confirmed", submittedBy: A6, confirmedBy: "admin1" } },
      { key: "pay-foreign", data: { businessId: "bizFOREIGN", amount: 999, method: "cash", reference: "X", periodFrom: "2026-10-01", periodTo: "2026-11-01", planId: "basic", state: "confirmed", submittedBy: "bizFOREIGN" } },
    ],
  };
  const file6 = backup.assembleBackup({
    businessId: A6, exportedAt: NOW6, exportedBy: "web",
    owner: ownerDoc6, collections: shopCollections, platform: platformRaw6,
  });

  /* ---- assembly ---- */
  check(backup.TENANT_COLLECTIONS.length === 38 &&
        backup.TENANT_COLLECTIONS.every((n) => Array.isArray(file6.collections[n]) &&
          file6.manifest.counts[n] === shopCollections[n].length) &&
        file6.manifest.totalDocs === 1 + backup.TENANT_COLLECTIONS.reduce((a, n) => a + shopCollections[n].length, 0) &&
        file6.manifest.journalCount === 21,
    "assembly: the manifest counts every one of the 38 tenant collections exactly, totalDocs = owner + Σ collections, journalCount 21 (WA pin amendment: 35 → 38 — waTemplates/waCampaigns/waSends join the manifest, design §3.3)");
  {
    const storeSrc6 = readSrc6("components/StoreProvider.tsx");
    const subscribed = new Set([...storeSrc6.matchAll(/sub<[^>]+>\("([a-zA-Z]+)"/g)].map((m) => m[1]));
    check(subscribed.size === 38 && backup.TENANT_COLLECTIONS.every((n) => subscribed.has(n)),
      "assembly: lib/backup's collection list is exactly the set StoreProvider subscribes — the backup cannot silently miss a collection the app writes (source-pinned) (WA pin amendment: 35 → 38 subscriptions)");
  }
  check(file6.collections.journal.every((e, i, arr) =>
          i === 0 || String(arr[i - 1].ts) < String(e.ts) ||
          (String(arr[i - 1].ts) === String(e.ts) && String(arr[i - 1].id) <= String(e.id))) &&
        file6.manifest.journalFingerprint === backup.journalFingerprint(file6.collections.journal),
    "assembly: the exported journal rides in the store's own order (ts, then id) and the manifest fingerprint is computed over exactly the exported array");
  check(file6.platform.events.length === 1 && file6.platform.payments.length === 1 &&
        file6.platform.events[0].data.businessId === A6 && file6.platform.payments[0].data.businessId === A6 &&
        file6.manifest.platformCounts.events === 1 && file6.manifest.platformCounts.payments === 1 &&
        file6.manifest.platformCounts.members === 1 && file6.manifest.platformCounts.registry === 1,
    "assembly: the platform slice is the business's OWN only — the foreign business's event and payment handed to the assembler are filtered out at the lib seam (§9), and the platform counts say so");
  check(backup.docsEqual(file6.owner, ownerDoc6) &&
        backup.verifyBackup(file6).ok === true &&
        backup.verifyBackup(J6(file6)).ok === true,
    "assembly: the owner doc rides verbatim, and the file verifies — in memory and after a JSON write/read round-trip (the file as a file still matches its manifest)");

  /* ---- the tamper ladder: verification before any write ---- */
  const tamper = (fn) => { const f = J6(file6); fn(f); return f; };
  check(backup.verifyBackup(tamper((f) => { f.manifest.counts.bills += 1; })).problem === "manifest-mismatch" &&
        backup.verifyBackup(tamper((f) => { f.collections.journal[0].lines[0].debit += 5; })).problem === "manifest-mismatch" &&
        backup.verifyBackup(tamper((f) => { f.collections.products.pop(); })).problem === "manifest-mismatch" &&
        backup.verifyBackup(tamper((f) => { f.manifest.platformCounts.members = 9; })).problem === "manifest-mismatch" &&
        backup.verifyBackup(tamper((f) => { f.manifest.journalFingerprint = "0".repeat(64); })).problem === "manifest-mismatch",
    "verify: a tampered count, a tampered journal line, a dropped document, a tampered platform count and a forged fingerprint EACH fail the recompute — the manifest is a proof, not a label");
  check(backup.verifyBackup(tamper((f) => { f.formatVersion = 99; })).problem === "unknown-format" &&
        backup.verifyBackup(tamper((f) => { f.manifest.schemaVersion = 7; })).problem === "unknown-format" &&
        backup.verifyBackup(tamper((f) => { f.kind = "something-else"; })).problem === "not-a-backup" &&
        backup.verifyBackup(null).problem === "not-a-backup" &&
        backup.verifyBackup(tamper((f) => { delete f.manifest; })).problem === "not-a-backup",
    "verify: an unknown format version (file or manifest schema) is refused as unknown-format — a future format is refused or converted, never misread — and non-backups are refused as not-a-backup");

  /* ---- selector digest: the round-trip's measuring instrument ---- */
  const allRange6 = reports.resolveReportRange("custom", null, { from: "2000-01-01", to: "2100-12-31" });
  function digest6(cols) {
    const j = cols.journal;
    const tb = reports.trialBalance(j, allRange6);
    const perCustomer = {};
    for (const c of cols.credits) {
      const k = ledger.creditKey(c);
      perCustomer[k] = ledger.customerOutstanding(cols.credits, k);
    }
    const perSupplier = {};
    for (const s of cols.suppliers) {
      perSupplier[s.id] = ledger.supplierBalance(cols.purchases, cols.supplierPayments, s.id, cols.purchaseReturns);
    }
    const perAccount = {};
    for (const a of cols.accounts) perAccount[a.id] = ledger.moneyAccountBalance(j, a);
    const perProduct = {};
    for (const p of cols.products) perProduct[p.id] = stock.rowsTotal(cols.stockLevels, p.id);
    return {
      tb: [tb.totalDebits, tb.totalCredits, tb.closingDebits, tb.closingCredits, tb.balanced],
      tbRows: tb.rows.map((r) => [r.account, r.debitTotal, r.creditTotal, r.closing]),
      inventory: ledger.accountBalance(j, "inventory"),
      cash: ledger.cashBalance(j),
      payables: ledger.payablesTotal(j),
      receivables: ledger.receivablesTotal(j),
      perCustomer, perSupplier, perAccount, perProduct,
      counts: Object.fromEntries(backup.TENANT_COLLECTIONS.map((n) => [n, (cols[n] || []).length])),
    };
  }
  const sourceDigest6 = digest6(shopCollections);

  /* ---- restore into a fresh namespace ---- */
  const bornOwner6 = { shopName: "New Shop", staffEmails: [], staff: [] };
  const freshTarget6 = { ...backup.emptyNamespace(), owner: bornOwner6 };
  const plan6 = backup.planRestore({ file: file6, targetBusinessId: B6, target: freshTarget6, actorUid: B6, nowISO: NOW6 });
  check(plan6.ok === true && plan6.alreadyRestored === false && plan6.skipped === 0,
    "restore: a fresh, empty namespace plans cleanly — nothing skipped, nothing already there");
  check(plan6.ok && plan6.writes.filter((w) => w.kind === "set").length === file6.manifest.totalDocs + 2 &&
        plan6.writes.every((w) => w.kind !== "set" ||
          w.path.startsWith(`users/${B6}`) || w.path.startsWith(`businessMembers/${B6}/`) || w.path.startsWith(`businessInvites/${B6}/`)) &&
        !plan6.writes.some((w) => w.kind === "set" && w.path.includes(A6)),
    "restore: the plan writes every tenant document + the owner doc + the re-keyed membership and invite — and NO write path enters the SOURCE business's namespace (users-tree purity, target side)");
  {
    const sets6 = plan6.writes.map((w, i) => [w, i]).filter(([w]) => w.kind === "set");
    const ownerIdx = sets6.find(([w]) => w.path === `users/${B6}`)[1];
    const lastSetIdx = sets6[sets6.length - 1][1];
    const lastWrite = plan6.writes[plan6.writes.length - 1];
    check(ownerIdx === lastSetIdx && lastWrite.kind === "add" && lastWrite.collection === "businessEvents" &&
          lastWrite.data.kind === "restore.performed" && lastWrite.data.businessId === B6 &&
          lastWrite.data.detail.sourceBusinessId === A6 &&
          lastWrite.data.detail.journalFingerprint === file6.manifest.journalFingerprint,
      "restore: the owner doc lands LAST among the data writes (the source shop's period lock can never gate the transplant's own dated creates) and the plan's final write is the restore.performed platform event citing the source business + the manifest fingerprint");
  }
  check(plan6.ok && plan6.writes.filter((w) => w.kind === "set" && w.path.includes("/journal/"))
          .every((w) => backup.docsEqual(w.data, file6.collections.journal.find((e) => String(e.id) === w.path.split("/").pop()))),
    "restore: every journal write is the backup's own document, byte for byte — a transplant of data, never a composed posting (restore's journal effect is zero BY CONSTRUCTION)");

  const restored6 = backup.applyRestoreWrites(backup.emptyNamespace(), B6, plan6.writes);
  check(restored6.owner !== null && backup.docsEqual(restored6.owner, file6.owner) &&
        backup.journalFingerprint(backup.sortJournalDocs(restored6.collections.journal)) === file6.manifest.journalFingerprint &&
        restored6.collections.journal.length === 21,
    "round-trip: backup → empty namespace → restore reproduces the journal exactly — recomputed fingerprint equals the manifest's, 21 entries, owner doc verbatim");
  check(backup.canonicalJson(digest6(restored6.collections)) === backup.canonicalJson(sourceDigest6),
    "round-trip: EVERY selector reads the restored business identically to the source — trial balance (rows + totals), inventory/cash/payables/receivables, per-customer outstanding, per-supplier balances, per-account money balances, per-product stock rows, all counts");
  {
    const j = restored6.collections.journal;
    check(ledger.accountBalance(j, "inventory") === 272805 && ledger.cashBalance(j) === 50000 &&
          ledger.payablesTotal(j) === 27900 && ledger.receivablesTotal(j) === 5500,
      "round-trip: the frozen seed identities stand on the restored business — inventory 272,805 · cash 50,000 · payables 27,900 · receivables 5,500 (and TB 0 via the digest)");
  }
  check(restored6.members.length === 1 && restored6.members[0].key === "uid-staff-1" &&
        restored6.members[0].data.role === "manager" && restored6.invites.length === 1 &&
        restored6.events.length === 1 && restored6.events[0].kind === "restore.performed",
    "round-trip: the team lands in the restored business — the membership and the pending invite re-keyed with their roles, and exactly one restore.performed event recorded");

  /* ---- the refusal truth table ---- */
  const planInto = (target, file) =>
    backup.planRestore({ file: file ?? file6, targetBusinessId: B6, target, actorUid: B6, nowISO: NOW6 });
  {
    const altered = backup.emptyNamespace();
    altered.collections.journal = J6(file6.collections.journal);
    altered.collections.journal[0] = { ...altered.collections.journal[0], lines: altered.collections.journal[0].lines.map((l, i) => i === 0 ? { ...l, debit: l.debit + 1 } : l) };
    const p = planInto(altered);
    check(p.ok === false && p.reason === "target-not-empty" && p.writes.length === 0 &&
          p.conflicts.some((c) => c.includes("/journal/")),
      "refusal: a target whose journal holds the backup's entry with ONE line altered is refused target-not-empty, naming the entry — the live book is never overwritten");
  }
  {
    const extra = backup.emptyNamespace();
    extra.collections.journal = [...J6(file6.collections.journal),
      { id: "j-foreign", memo: "not from the backup", refType: "seed", ref: null, ts: NOW6, lines: [] }];
    const p = planInto(extra);
    check(p.ok === false && p.reason === "target-not-empty" && p.conflicts.some((c) => c.endsWith("/journal/j-foreign")),
      "refusal: a target with a journal entry the backup does not contain is refused — an existing journal, however small, closes the door (design §9's emptiness law)");
  }
  {
    const stray = backup.emptyNamespace();
    stray.collections.cheques = [{ id: "chq-1", amount: 500 }];
    const p = planInto(stray);
    check(p.ok === false && p.reason === "target-not-empty" && p.conflicts.some((c) => c.includes("/cheques/chq-1")),
      "refusal: a single stray document in ANY collection (here a cheque) refuses the restore — emptiness is probed across the whole namespace, not just the journal");
  }
  {
    const memberTarget = backup.emptyNamespace();
    memberTarget.members = [{ key: "uid-other", data: { email: "other@x.pk", role: "cashier", addedBy: B6, addedAt: NOW6, source: "invite" } }];
    const p = planInto(memberTarget);
    check(p.ok === false && p.reason === "target-not-empty" && p.conflicts.some((c) => c.startsWith("businessMembers/")),
      "refusal: a membership the target gained on its own refuses the restore — the transplant does not silently overwrite the target's own acts");
  }
  check(planInto(backup.emptyNamespace(), tamper((f) => { f.manifest.counts.sales += 2; })).reason === "manifest-mismatch" &&
        planInto(backup.emptyNamespace(), tamper((f) => { f.formatVersion = 2; })).reason === "unknown-format" &&
        planInto(backup.emptyNamespace(), { hello: "world" }).reason === "not-a-backup",
    "refusal: the planner surfaces the verification ladder unchanged — manifest-mismatch, unknown-format, not-a-backup — before the target is even considered");

  /* ---- resume + idempotence ---- */
  {
    const dataWrites = plan6.writes.slice(0, -1); // all but the event
    const half = Math.floor(dataWrites.length / 2);
    const partial = backup.applyRestoreWrites(backup.emptyNamespace(), B6, dataWrites.slice(0, half));
    const plan2 = backup.planRestore({ file: file6, targetBusinessId: B6, target: partial, actorUid: B6, nowISO: NOW6 });
    const appliedPaths = new Set(dataWrites.slice(0, half).filter((w) => w.kind === "set").map((w) => w.path));
    check(plan2.ok === true && plan2.skipped === half &&
          plan2.writes.every((w) => w.kind !== "set" || !appliedPaths.has(w.path)) &&
          plan2.writes[plan2.writes.length - 1].kind === "add",
      "resume: an interrupted restore re-plans exactly the missing remainder — every already-written document skipped byte-identically, no write repeated, the completion event still last");
    const finished = backup.applyRestoreWrites(partial, B6, plan2.writes);
    check(backup.canonicalJson(digest6(finished.collections)) === backup.canonicalJson(sourceDigest6) &&
          finished.events.length === 1,
      "resume: the resumed restore lands byte-identical to the single-run restore (same selector digest) with exactly ONE restore.performed event");
    const plan3 = backup.planRestore({ file: file6, targetBusinessId: B6, target: finished, actorUid: B6, nowISO: NOW6 });
    check(plan3.ok === true && plan3.alreadyRestored === true && plan3.writes.length === 0 && plan3.event === null,
      "resume: re-running a completed restore is a clean no-op — zero writes, no second event (the audit log records the act once)");
  }

  /* ---- surface + invariant wiring ---- */
  {
    const backupSrc = readSrc6("lib/backup.ts");
    const panelSrc = readSrc6("components/BackupPanel.tsx");
    const settingsSrc = readSrc6("components/SettingsView.tsx");
    const storeSrc = readSrc6("components/StoreProvider.tsx");
    check(!/^import/m.test(backupSrc) && !backupSrc.includes("firebase"),
      "purity: lib/backup imports nothing — no Firebase, no ledger, no store; the planner cannot compose a journal entry because it has no composition machinery (the F/G pure-lib discipline)");
    check((storeSrc.match(/makeEntry\(/g) || []).length === 24,
      "invariant: the store still composes exactly 24 makeEntry( sites — backup/restore added none (restore writes documents; it never posts)");
    check(settingsSrc.includes('{!isStaff && mode !== "demo" && <BackupPanel />}') &&
          !panelSrc.includes("derivePlanState") && !panelSrc.includes("planView") && !panelSrc.includes("planState"),
      "surface: the backup card mounts owner-only outside demo, and the panel never consults plan state — export stays available in trial, grace, read-only and suspended alike (§3.7's data right, enforced by absence)");
    check(crypto.createHash("sha256").update(stripH3Blocks(stripWaBlocks(stripFR2Blocks(fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8")))), "utf8").digest("hex") ===
          "734f6ba4cebc9c19203e0d022b810a7e1c76e57fd644d040abbe2a421ad7d3ad",
      "rules: G6 changes no rules — v9 FINAL byte-identical (SHA 734f6ba4…); restore rides the owner's own existing legs and backup is reads only (H3 same-check amendment: the hash runs over stripH3Blocks(rules) — v10 minus the H3 spans IS v9, strip-proven in the H3 suite; G6's own verdict stands: H3's backup-slice growth rides the platform collections, not new rules) (WA same-check amendment: the composed strip also cuts the delimited WhatsApp spans — the amended v10 minus WhatsApp is the H3-final v10, strip-proven in the WA suite; WA's backup-slice growth rides the tenant manifest, not new rules legs beyond its own member-scoped spans) (FR2 same-check amendment: the strip first cuts the delimited FR2 spans — v11 minus FR2 is v10)");
    const backupKeys = Object.keys(i18n.en).filter((k) => k.startsWith("backup."));
    check(backupKeys.length === 25 && backupKeys.every((k) => typeof i18n.ur[k] === "string" && i18n.ur[k].length > 0 && i18n.en[k].length > 0),
      "i18n: all 25 backup.* keys exist in EN and UR with real copy — the backup surface is bilingual like every other surface (dictionary 3,054 after the WA pin amendment (+109 WhatsApp keys); 2,945 after H3; 2,837 after H1; 2,786 after G6)");
  }
}

/* ================================ H1 ================================ */
suite("H1", null); // Phase H · H1 — loyalty journal core (design §1 doctrine, §5.1 catalogue, §6 H1)
{
  const S = loyalty.resolveLoyaltySettings({ loyalty: { enabled: true } });
  const CUST = "h1-cust";
  const T = (d) => `${d}T05:00:00.000Z`; // 10:00 PKT the same day

  /* ---- settings resolver: absent block = defaults + OFF ---- */
  const off = loyalty.resolveLoyaltySettings({});
  check(off.enabled === false && off.earnRsPerPointBase === 100 && off.pointValueRs === 1 &&
        off.redeemCapPct === 50 && off.expiryMonths === 12 && off.silverAt === 500 &&
        off.goldAt === 2000 && off.silverMult === 1.25 && off.goldMult === 1.5,
    "resolver: an absent loyalty block resolves to the design's Q1 defaults with the programme OFF (opt-in)");
  const partial = loyalty.resolveLoyaltySettings({ loyalty: { enabled: true, pointValueRs: 2, earnRsPerPointBase: -5, silverMult: 0.5 } });
  check(partial.enabled === true && partial.pointValueRs === 2 && partial.earnRsPerPointBase === 100 && partial.silverMult === 1.25,
    "resolver: owner values win field-by-field; invalid figures (negative base, sub-1 multiplier) fall back to defaults");

  /* ---- the two additive COA codes + their registry followers ---- */
  check(coa.ACCOUNT_CODES.length === 30 && coa.ACCOUNT_CODES[28] === "loyalty_payable" && coa.ACCOUNT_CODES[29] === "expense_loyalty",
    "COA: exactly two codes appended (28→30), since \"H\" — every prior code keeps its place");
  const lpMeta = coa.accountMeta("loyalty_payable");
  const elMeta = coa.accountMeta("expense_loyalty");
  check(lpMeta.type === "liability" && lpMeta.normalBalance === "credit" && lpMeta.since === "H" &&
        elMeta.type === "expense" && elMeta.normalBalance === "debit" && elMeta.since === "H",
    "COA: loyalty_payable is a credit-normal liability; expense_loyalty a debit-normal expense");
  check(tally.TALLY_LEDGER_MAP.loyalty_payable.name === "Customer Loyalty Payable" &&
        tally.TALLY_LEDGER_MAP.loyalty_payable.group === "Current Liabilities" &&
        tally.TALLY_LEDGER_MAP.expense_loyalty.name === "Loyalty Programme Cost" &&
        tally.TALLY_LEDGER_MAP.expense_loyalty.group === "Indirect Expenses" &&
        tally.TALLY_VOUCHER_TYPE_BY_REFTYPE.loyalty_earn === "Journal" &&
        tally.TALLY_VOUCHER_TYPE_BY_REFTYPE.loyalty_expire === "Journal",
    "Tally: both codes map to their ledgers/groups; loyalty_earn + loyalty_expire export as Journal vouchers");
  check(fiscal.plAccountCodes().includes("expense_loyalty") && !fiscal.plAccountCodes().includes("loyalty_payable") &&
        fiscal.balanceSheetAccountCodes().includes("loyalty_payable"),
    "FY close: expense_loyalty sweeps BY TYPE from the registry; the liability is never swept and rides the balance sheet");

  /* ---- the frozen seed carries no loyalty ---- */
  check(ledger.accountNormalBalance(journal, "loyalty_payable") === 0 &&
        ledger.accountBalance(journal, "expense_loyalty") === 0 &&
        loyalty.loyaltyCustomerIds(journal).length === 0 &&
        !journal.some((e) => e.refType === "loyalty_earn" || e.refType === "loyalty_expire"),
    "seed: both new codes read ZERO on the frozen seed journal and no loyalty entries exist there");
  const seedNorm = journal.map((e) => { const { ts, ...rest } = e; return rest; });
  check(crypto.createHash("sha256").update(JSON.stringify(seedNorm), "utf8").digest("hex") ===
        "e17e5bda19e87de698b0c0a37e923f9b396bc387e2092b2ffbbd7d60d4971168",
    "seed: the frozen journal fingerprint (SHA e17e5bda…1168) stands — H1 changed no seed content");

  /* ---- plan gating (design §5.1/§5.2) ---- */
  check(plans.moduleMinTier("loyalty") === "standard" &&
        !plans.tierIncludesModule("core", "loyalty") && plans.tierIncludesModule("standard", "loyalty") &&
        plans.REFTYPE_MIN_TIER.loyalty_expire === "standard" && !("loyalty_earn" in plans.REFTYPE_MIN_TIER),
    "plans: loyalty joins the catalogue at Standard via GROWTH_MODULES; only loyalty_expire is tier-mapped (the earn rides the bill's Core invoice leg)");
  check(perm.can("owner", "loyalty", "write") && perm.can("manager", "loyalty", "write") &&
        perm.can("accountant", "loyalty", "view") && !perm.can("accountant", "loyalty", "write") &&
        !perm.can("cashier", "loyalty", "view") && perm.can("cashier", "billing", "write"),
    "RBAC: loyalty row — owner/manager full, accountant read, cashier none (the cashier's points tender rides the billing row)");

  /* ---- makeEntry site discipline (design §6 H1) ---- */
  const storeSrc = fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx", "utf8");
  const loyaltySrc = fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/lib/loyalty.ts", "utf8");
  check((storeSrc.match(/makeEntry\(/g) || []).length === 24,
    "sites: StoreProvider still holds exactly 24 makeEntry( sites — loyalty added none there");
  check((loyaltySrc.match(/makeEntry\(/g) || []).length === 3,
    "sites: lib/loyalty.ts holds exactly the design's 3 named loyalty compositions (earn, clawback, expiry) — 24 + 3 = 27 posting compositions, redemption adds none (it is a leg)");

  /* ---- the lifecycle walk ------------------------------------ */
  let J = [];
  const tbZero = (arr) => coa.ACCOUNT_CODES.reduce((a, c) => a + ledger.accountBalance(arr, c), 0) === 0;
  const identities = (arr) => {
    if (!tbZero(arr)) return false;
    const gl = ledger.accountNormalBalance(arr, "loyalty_payable");
    const byCust = loyalty.loyaltyRupeesByCustomer(arr);
    let sum = 0;
    for (const v of byCust.values()) sum += v;
    if (!eq(gl, sum)) return false;
    for (const [cid, rs] of byCust) {
      const pos = loyalty.customerLoyalty(arr, cid, S, "2027-06-01T00:00:00.000Z");
      if (!eq(pos.rupees, rs)) return false;
      if (!eq(pos.rupees, pos.vintages.reduce((a, v) => a + v.rsUnspent, 0))) return false;
    }
    return true;
  };
  const billWithEarn = (id, billNo, total, cost, ts, extraLines = [], payload = null) => {
    const e = ledger.makeEntry(`Bill #${billNo}`, "bill", id, [
      { account: "cash", debit: total - (extraLines.reduce((a, l) => a + l.debit, 0)), credit: 0 },
      ...extraLines,
      { account: "cogs", debit: cost, credit: 0 },
      { account: "sales_revenue", debit: 0, credit: total },
      { account: "inventory", debit: 0, credit: cost },
    ], { ts });
    if (payload) Object.assign(e, payload);
    J.push(e);
    const earn = loyalty.buildLoyaltyEarnEntry({
      journal: J, bill: { id, billNo, customerId: CUST, total }, settings: S, ts,
    });
    if (earn) J.push(earn);
    return earn;
  };

  // Step 1 — earn on a cash bill (Standard tier).
  const earn1 = billWithEarn("h1-b1", 1, 10000, 6000, T("2026-01-05"));
  check(!!earn1 && earn1.refType === "loyalty_earn" && earn1.refId === "h1-b1" && earn1.points === 100 &&
        earn1.rsPerPoint === 1 && earn1.loyaltyExpiryMonths === 12 && earn1.loyaltyTierMult === 1 &&
        earn1.lines[0].account === "expense_loyalty" && earn1.lines[0].debit === 100 &&
        earn1.lines[1].account === "loyalty_payable" && earn1.lines[1].credit === 100 && earn1.lines[1].ref === CUST,
    "earn: Dr expense_loyalty / Cr loyalty_payable (ref = customer) at 1 pt per Rs 100, with rate + horizon + multiplier snapshots on the entry");
  check(identities(J), "step 1 (first earn): TB == 0 and both audit identities hold");

  // Step 2 — earn across bills, crossing Silver then Gold (speed only).
  billWithEarn("h1-b2", 2, 150000, 90000, T("2026-02-01"));
  const earn3 = billWithEarn("h1-b3", 3, 10000, 6000, T("2026-02-02"));
  check(!!earn3 && earn3.points === 125 && earn3.loyaltyTierMult === 1.25,
    "tiers: at 1,600 trailing points the customer is Silver — the next earn runs at 1.25× SPEED (125 pts on Rs 10,000)");
  billWithEarn("h1-b4", 4, 40000, 24000, T("2026-02-03"));
  const earn5 = billWithEarn("h1-b5", 5, 10000, 6000, T("2026-02-04"));
  check(!!earn5 && earn5.points === 150 && earn5.loyaltyTierMult === 1.5,
    "tiers: at 2,225 trailing points the customer is Gold — earn speed 1.5× (150 pts on Rs 10,000), the point still worth Rs 1");
  const posAfterEarns = loyalty.customerLoyalty(J, CUST, S, T("2026-02-04"));
  check(posAfterEarns.points === 2375 && eq(posAfterEarns.rupees, 2375) && posAfterEarns.tier === "gold",
    "position: 2,375 points = Rs 2,375 after five bills (100 + 1,500 + 125 + 500 + 150)");
  check(identities(J), "step 2 (tier-crossing earns): TB == 0 and both audit identities hold");

  // Step 3 — redeem as a split tender INSIDE the bill entry.
  const q6 = loyalty.loyaltyRedemptionQuote(J, CUST, 500, loyalty.loyaltyRedeemCapRs(2000, S));
  check(q6.points === 500 && eq(q6.rs, 500), "redeem quote: 500 points settle Rs 500 (under the 50% cap of a Rs 2,000 bill)");
  const earn6 = billWithEarn("h1-b6", 6, 2000, 1200, T("2026-02-05"),
    [{ account: "loyalty_payable", debit: 500, credit: 0, ref: CUST }],
    { loyaltyPointsUsed: 500 });
  const b6Entry = J.find((e) => e.refId === "h1-b6" && e.refType === "bill");
  check(!!b6Entry && b6Entry.loyaltyPointsUsed === 500 &&
        b6Entry.lines.some((l) => l.account === "loyalty_payable" && l.debit === 500 && l.ref === CUST) &&
        !!earn6 && earn6.points === 30,
    "redeem: the Dr loyalty_payable leg rides INSIDE bill #6's entry beside the cash leg (payload carries the count); the bill still earns (30 pts at Gold speed on its full total)");
  const posAfterRedeem = loyalty.customerLoyalty(J, CUST, S, T("2026-02-05"));
  check(posAfterRedeem.points === 1905 &&
        posAfterRedeem.vintages[0].pointsUnspent === 0 && posAfterRedeem.vintages[1].pointsUnspent === 1100,
    "FIFO: redemption consumed the oldest vintage first (bill #1's 100 gone, bill #2's vintage down to 1,100)");
  check(identities(J), "step 3 (split-tender redemption): TB == 0 and both audit identities hold");

  // Step 4 — partial return: proportional re-credit (points, never
  // cash) + the floored clawback companion.
  const rec1 = loyalty.loyaltyRecreditForReturn(J, { id: "h1-b6", total: 2000 }, 1000, false);
  check(rec1.points === 250 && eq(rec1.rs, 250),
    "return: half of bill #6 given back re-credits half its tender — 250 points as POINTS (fold-priced LIFO restore)");
  const ret1 = ledger.makeEntry("Return against Bill #6", "return", "h1-b6", [
    { account: "sales_revenue", debit: 1000, credit: 0 },
    { account: "inventory", debit: 600, credit: 0 },
    { account: "loyalty_payable", debit: 0, credit: rec1.rs, ref: CUST },
    { account: "cash", debit: 0, credit: 750 },
    { account: "cogs", debit: 0, credit: 600 },
  ], { ts: T("2026-02-06") });
  ret1.loyaltyPointsReturned = rec1.points;
  J.push(ret1);
  const clawPts1 = loyalty.loyaltyClawbackPoints({ journal: J, bill: { id: "h1-b6", total: 2000 }, refundTotalRs: 1000, priorRefundedRs: 0, completesBill: false });
  const claw1 = loyalty.buildLoyaltyClawbackEntry({
    journal: J, bill: { id: "h1-b6", billNo: 6, customerId: CUST },
    clawPoints: clawPts1, refId: "h1-cn-1", memo: "Loyalty points taken back — return on Bill #6", ts: T("2026-02-06"),
  });
  check(clawPts1 === 15 && !!claw1 && claw1.points === -15 && claw1.refType === "loyalty_earn" &&
        claw1.refId === "h1-cn-1" && claw1.loyaltySourceBillId === "h1-b6" &&
        claw1.lines[0].account === "loyalty_payable" && claw1.lines[0].debit === 15,
    "clawback: floor(30 × 1,000/2,000) = 15 points taken back as a negative-points loyalty_earn entry citing the credit note, naming its source bill");
  J.push(claw1);
  check(loyalty.customerLoyalty(J, CUST, S, T("2026-02-06")).points === 2140 && identities(J),
    "step 4 (partial return): position 1,905 + 250 re-credited − 15 clawed = 2,140; TB == 0, identities hold");

  // Step 5 — the completing return absorbs the exact remainders.
  const rec2 = loyalty.loyaltyRecreditForReturn(J, { id: "h1-b6", total: 2000 }, 1000, true);
  const ret2 = ledger.makeEntry("Return against Bill #6", "return", "h1-b6", [
    { account: "sales_revenue", debit: 1000, credit: 0 },
    { account: "inventory", debit: 600, credit: 0 },
    { account: "loyalty_payable", debit: 0, credit: rec2.rs, ref: CUST },
    { account: "cash", debit: 0, credit: 750 },
    { account: "cogs", debit: 0, credit: 600 },
  ], { ts: T("2026-02-07") });
  ret2.loyaltyPointsReturned = rec2.points;
  J.push(ret2);
  // priorRefundedRs is the store's own reading of the first
  // return's SaleReturn doc: cash refund 750 + udhaar reduction 0
  // + points re-credit Rs 250 = the full Rs 1,000 give-back.
  const clawPts2 = loyalty.loyaltyClawbackPoints({ journal: J, bill: { id: "h1-b6", total: 2000 }, refundTotalRs: 1000, priorRefundedRs: 1000, completesBill: true });
  const claw2 = loyalty.buildLoyaltyClawbackEntry({
    journal: J, bill: { id: "h1-b6", billNo: 6, customerId: CUST },
    clawPoints: clawPts2, refId: "h1-cn-2", memo: "Loyalty points taken back — return on Bill #6", ts: T("2026-02-07"),
  });
  if (claw2) J.push(claw2);
  const posAfterReturns = loyalty.customerLoyalty(J, CUST, S, T("2026-02-07"));
  check(rec2.points === 250 && clawPts2 === 15 && posAfterReturns.points === 2375 &&
        posAfterReturns.vintages.find((v) => v.billId === "h1-b6").pointsUnspent === 0 &&
        posAfterReturns.vintages[0].pointsUnspent === 100 && posAfterReturns.vintages[1].pointsUnspent === 1500,
    "completing return: the tender restores in full (vintages #1/#2 whole again), the earn is clawed to zero — position back to exactly 2,375");
  check(identities(J), "step 5 (completing return): TB == 0 and both audit identities hold");

  // Step 6 — void: the mirror reverses the tender whole, and the
  // earn reversal companion takes the earn back in full.
  const q7 = loyalty.loyaltyRedemptionQuote(J, CUST, 1000, loyalty.loyaltyRedeemCapRs(3000, S));
  const earn7 = billWithEarn("h1-b7", 7, 3000, 1800, T("2026-02-08"),
    [{ account: "loyalty_payable", debit: q7.rs, credit: 0, ref: CUST }],
    { loyaltyPointsUsed: q7.points });
  check(q7.points === 1000 && !!earn7 && earn7.points === 45 &&
        loyalty.customerLoyalty(J, CUST, S, T("2026-02-08")).points === 1420,
    "void setup: bill #7 spends 1,000 points and earns 45 — position 1,420");
  const voidEntry = ledger.makeEntry("Bill #7 voided", "bill_void", "h1-b7", [
    { account: "sales_revenue", debit: 3000, credit: 0 },
    { account: "inventory", debit: 1800, credit: 0 },
    { account: "cash", debit: 0, credit: 2000 },
    { account: "loyalty_payable", debit: 0, credit: 1000, ref: CUST },
    { account: "cogs", debit: 0, credit: 1800 },
  ], { ts: T("2026-02-09") });
  voidEntry.loyaltyPointsReturned = 1000;
  J.push(voidEntry);
  const earnBack = (earn7.points ?? 0) - loyalty.billLoyaltyClawedPoints(J, "h1-b7");
  const voidClaw = loyalty.buildLoyaltyClawbackEntry({
    journal: J, bill: { id: "h1-b7", billNo: 7, customerId: CUST },
    clawPoints: earnBack, refId: "h1-b7", memo: "Loyalty earn reversed — Bill #7 voided",
    ts: T("2026-02-09"), reversesId: earn7.id,
  });
  if (voidClaw) J.push(voidClaw);
  check(loyalty.customerLoyalty(J, CUST, S, T("2026-02-09")).points === 2375 &&
        loyalty.billLoyaltyEarnEntry(J, "h1-b7") === null && identities(J),
    "step 6 (void): tender restored whole by the mirror + earn reversed in full (marked reversed) — position exactly 2,375; TB == 0, identities hold");

  // Step 7 — FY close sweeps the cost, never the liability.
  const fyRange = periods.fiscalYearRange(null, "2026-02-10T00:00:00.000Z");
  const closeEntry = fiscal.buildFiscalClosingEntry(J, fyRange, "per-h1-1");
  const loyCloseLine = closeEntry ? closeEntry.lines.find((l) => l.account === "expense_loyalty") : null;
  check(!!closeEntry && !!loyCloseLine && eq(loyCloseLine.credit, 2375) && loyCloseLine.debit === 0 &&
        !closeEntry.lines.some((l) => l.account === "loyalty_payable"),
    "FY close: the closing entry sweeps expense_loyalty's full Rs 2,375 to retained earnings and never touches loyalty_payable");
  J.push(closeEntry);
  check(ledger.accountBalance(J, "expense_loyalty") === 0 &&
        eq(ledger.accountNormalBalance(J, "loyalty_payable"), 2375) && identities(J),
    "step 7 (post-close): programme cost reads zero in the new year while the Rs 2,375 liability carries forward untouched");

  // Step 8 — expiry: derived due-list, owner-posted cost release.
  const due = loyalty.loyaltyExpiryDue(J, "2027-01-05T10:00:00.000Z", CUST);
  const totalsBefore = loyalty.loyaltyProgrammeTotals(J, "2027-01-05T10:00:00.000Z");
  check(due.length === 1 && due[0].vintage.billId === "h1-b1" && due[0].vintage.pointsUnspent === 100 &&
        totalsBefore.expiredUnpostedPoints === 100 && eq(totalsBefore.liabilityRs, 2375),
    "expiry: only bill #1's vintage is due at its snapshotted 12 months — and until posted it still sits IN the liability (nothing expires on its own)");
  const expEntry = loyalty.buildLoyaltyExpiryEntry({
    customerId: CUST, customerName: "H1 Customer", vintage: due[0].vintage, ts: "2027-01-05T10:00:00.000Z",
  });
  check(!!expEntry && expEntry.refType === "loyalty_expire" && expEntry.refId === due[0].vintage.earnEntryId &&
        expEntry.points === 100 && expEntry.lines[0].account === "loyalty_payable" && expEntry.lines[0].debit === 100 &&
        expEntry.lines[1].account === "expense_loyalty" && expEntry.lines[1].credit === 100,
    "expiry release: Dr loyalty_payable / Cr expense_loyalty at the vintage's snapshot rate — a COST release, never revenue (no sales_revenue line)");
  J.push(expEntry);
  check(loyalty.customerLoyalty(J, CUST, S, "2027-01-06T00:00:00.000Z").points === 2275 &&
        eq(ledger.accountBalance(J, "expense_loyalty"), -100) && identities(J),
    "step 8 (expiry posted): position 2,275; the release lands as a Rs 100 credit in the new FY's programme cost; TB == 0, identities hold");
  const spentVintage = loyalty.customerLoyalty(J, CUST, S, "2027-01-06T00:00:00.000Z").vintages.find((v) => v.billId === "h1-b6");
  check(loyalty.buildLoyaltyExpiryEntry({ customerId: CUST, customerName: "H1 Customer", vintage: spentVintage, ts: "2027-01-06T00:00:00.000Z" }) === null,
    "expiry: a fully-spent vintage composes no release (null, not a zero entry)");

  /* ---- the report (customers family) ---- */
  const rep = loyalty.loyaltyReport(J, { fromTs: "2026-01-01T00:00:00.000Z", toTs: "2026-03-01T00:00:00.000Z" });
  check(rep.earnedPoints === 2450 && rep.redeemedPoints === 1500 && rep.recreditedPoints === 1500 &&
        rep.clawedPoints === 75 && rep.expiredPoints === 0 && eq(rep.liabilityRs, 2375) &&
        rep.rows.length === 1 && rep.rows[0].points === 2375 && eq(rep.rows[0].rupees, 2375),
    "report: Jan–Feb movements earned 2,450 / redeemed 1,500 / re-credited 1,500 / clawed 75, closing liability Rs 2,375 — the same fold the desk reads");

  /* ---- Tally: the customer's loyalty ledger is a party ledger ---- */
  const tallyRange = reports.resolveReportRange("custom", null, { from: "2026-01-01", to: "2026-12-31" });
  const model = tally.buildTallyExport(J, { customers: [{ id: CUST, name: "H1 Customer" }], suppliers: [] }, { shopName: "Madina General Store" }, tallyRange);
  const partyMaster = model.masters.find((m) => m.name === "H1 Customer");
  const costMaster = model.masters.find((m) => m.name === "Loyalty Programme Cost");
  check(!!partyMaster && partyMaster.group === "Current Liabilities" && partyMaster.isParty === true &&
        !!costMaster && costMaster.group === "Indirect Expenses",
    "Tally export: the customer's points sit in a per-customer ledger under Current Liabilities; the programme cost under Indirect Expenses");

  /* ---- guardrails ---- */
  const posNow = loyalty.customerLoyalty(J, CUST, S, "2027-01-06T00:00:00.000Z");
  const overBalance = loyalty.loyaltyRedemptionQuote(J, CUST, 999999, 100000000);
  check(overBalance.points === posNow.redeemablePoints && eq(overBalance.rs, 2275),
    "guardrail: a redemption can never exceed the derived balance — the quote clamps to 2,275 spendable points");
  const overCap = loyalty.loyaltyRedemptionQuote(J, CUST, 2275, loyalty.loyaltyRedeemCapRs(100, S));
  check(eq(overCap.rs, 50) && overCap.points === 50,
    "guardrail: the 50% redeem cap binds — a Rs 100 bill takes at most Rs 50 of points");
  check(loyalty.buildLoyaltyEarnEntry({ journal: J, bill: { id: "h1-walk", billNo: 99, customerId: null, total: 5000 }, settings: S, ts: T("2026-02-10") }) === null &&
        loyalty.loyaltyEarnQuote(J, CUST, 50, S, T("2026-02-10")) === null,
    "guardrail: walk-in bills earn nothing, and a bill under the Rs 100 base earns nothing");
  check(loyalty.loyaltyEarnQuote(J, CUST, 10000, off, T("2026-02-10")) === null &&
        loyalty.buildLoyaltyEarnEntry({ journal: J, bill: { id: "h1-off", billNo: 98, customerId: CUST, total: 10000 }, settings: off, ts: T("2026-02-10") }) === null &&
        loyalty.loyaltyRedemptionQuote(J, CUST, 100, 100000).points === 100,
    "guardrail: disabling the programme stops future earns — existing balances remain redeemable (the quote never consults the on/off switch)");

  /* ---- snapshot rates: a point is worth what its EARN said ---- */
  const S2 = loyalty.resolveLoyaltySettings({ loyalty: { enabled: true, pointValueRs: 2 } });
  let J2 = [];
  const e2bill = ledger.makeEntry("Bill #1", "bill", "h1x-b1", [
    { account: "cash", debit: 10000, credit: 0 },
    { account: "sales_revenue", debit: 0, credit: 10000 },
  ], { ts: T("2026-03-01") });
  J2.push(e2bill);
  const e2arn = loyalty.buildLoyaltyEarnEntry({ journal: J2, bill: { id: "h1x-b1", billNo: 1, customerId: CUST, total: 10000 }, settings: S2, ts: T("2026-03-01") });
  J2.push(e2arn);
  const qSnap = loyalty.loyaltyRedemptionQuote(J2, CUST, 100, 100000);
  check(!!e2arn && e2arn.points === 100 && eq(e2arn.lines[0].debit, 200) && qSnap.points === 100 && eq(qSnap.rs, 200),
    "snapshots: earned at Rs 2/point, the vintage carries Rs 200 of liability and redeems at Rs 200 even after the setting returns to Rs 1 — the rate is the entry's, not today's");

  /* ---- clawback flooring: the remainder stays with the customer ---- */
  let J3 = [];
  J3.push(ledger.makeEntry("Bill #1", "bill", "h1y-b1", [
    { account: "cash", debit: 300, credit: 0 },
    { account: "sales_revenue", debit: 0, credit: 300 },
  ], { ts: T("2026-03-01") }));
  J3.push(loyalty.buildLoyaltyEarnEntry({ journal: J3, bill: { id: "h1y-b1", billNo: 1, customerId: CUST, total: 300 }, settings: S, ts: T("2026-03-01") }));
  const clawSeq = [];
  let prior = 0;
  for (const completes of [false, false, true]) {
    const pts = loyalty.loyaltyClawbackPoints({ journal: J3, bill: { id: "h1y-b1", total: 300 }, refundTotalRs: 100, priorRefundedRs: prior, completesBill: completes });
    clawSeq.push(pts);
    const ce = loyalty.buildLoyaltyClawbackEntry({ journal: J3, bill: { id: "h1y-b1", billNo: 1, customerId: CUST }, clawPoints: pts, refId: `h1y-ret-${clawSeq.length}`, memo: "clawback", ts: T("2026-03-02") });
    if (ce) J3.push(ce);
    prior += 100;
  }
  check(clawSeq.join(",") === "1,1,1" && loyalty.customerLoyalty(J3, CUST, S, T("2026-03-03")).points === 0,
    "clawback flooring: a 3-point earn returned in thirds claws floor-wise 1 + 1 and the completing return absorbs the last 1 — never more than was earned");

  /* ---- no rules surface for loyalty (design doctrine) ---- */
  const rulesSrc = fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8");
  check(!stripH3Blocks(stripWaBlocks(stripFR2Blocks(rulesSrc))).includes("loyalty") &&
        crypto.createHash("sha256").update(stripH3Blocks(stripWaBlocks(stripFR2Blocks(rulesSrc))), "utf8").digest("hex") === "734f6ba4cebc9c19203e0d022b810a7e1c76e57fd644d040abbe2a421ad7d3ad",
    "rules: H1 adds NO rules block and no collection — firestore.rules stays v9 FINAL byte-identical; loyalty lives entirely inside the existing journal + bills legs (H3 same-check amendment: both prongs run over stripH3Blocks(rules) — the ONLY 'loyalty' string in v10 is H3's named §5.2 amendment inside its delimited span, asserted in the H3 suite; stripped, the file is v9 and loyalty-free exactly as H1 left it) (WA same-check amendment: both prongs run over the composed strip — the WhatsApp spans carry no 'loyalty' string either, asserted in the WA suite) (FR2 same-check amendment: the strip first cuts the delimited FR2 spans — v11 minus FR2 is v10, strip-proven in the FR2 suite)");

  /* ---- i18n parity for the new strings ---- */
  const loyPart = require("./out/i18n/parts/loyalty.js");
  const loyKeys = Object.keys(loyPart.enLoyalty);
  check(Object.keys(i18n.en).length === 3136 && Object.keys(i18n.ur).length === 3136 &&
        loyKeys.length === 51 && Object.keys(loyPart.urLoyalty).length === 51 &&
        loyKeys.every((k) => typeof i18n.ur[k] === "string" && i18n.ur[k].length > 0 && i18n.en[k].length > 0),
    "i18n: 51 loyalty keys with real EN + UR copy (dictionary 3,054, EN ≡ UR — H1 pin amendment; H3 pin amendment: +108 storefront keys; WA pin amendment: +109 WhatsApp keys)");
}

/* =============================== H3 =============================== */
{
  suite("H3", null); // Phase H · H3 — the online storefront: published snapshot + slug rules, the create-only public inbox, exactly-once conversion with drift, the lit/dark derivation, rules v10 + strip proof, the backup slice, and the full order journey (design §2/§5.2)

  const readSrcH3 = (p) => fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/" + p, "utf8");
  const rulesH3 = fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8");
  const NOW_H3 = "2026-10-23T10:00:00.000Z";
  const BIZ_H3 = "bizH3";
  const settingsH3 = { shopName: "Madina General Store", phone: "0301-2345678" };
  const productsH3 = [
    { id: "p-rice", name: "Rice Basmati 5kg", urduName: "چاول باسمتی", category: "Grocery", salePrice: 1450, costPrice: 1200, stockQty: 40, reorderLevel: 5, unit: "bag" },
    { id: "p-oil", name: "Cooking Oil 5L", category: "Grocery", salePrice: 2600, costPrice: 2450, stockQty: 3, reorderLevel: 5, unit: "tin" },
    { id: "p-soap", name: "Soap Bar", category: "Care", salePrice: 120, costPrice: 80, stockQty: 0, reorderLevel: 2, unit: "pc" },
    { id: "p-tea", name: "Tea 500g", category: "Grocery", salePrice: 950, costPrice: 800, stockQty: 12, reorderLevel: 3, unit: "pack" },
  ];
  const byPid = (docH3, pid) => docH3.products.find((p) => p.productId === pid);

  /* ---- slug rules (§2.2/§2.6) ---- */
  check(storefront.slugOk("madina-store") && storefront.slugOk("a1b") &&
        storefront.slugOk("x".repeat(40)) && storefront.slugProblem("madina-store") === null,
    "slug: lowercase letters/digits with single hyphens pass, at the 3..40 bounds");
  check(storefront.slugProblem("") === "too-short" && storefront.slugProblem("ab") === "too-short",
    "slug: under 3 chars is too-short");
  check(storefront.slugProblem("x".repeat(41)) === "too-long",
    "slug: over 40 chars is too-long");
  check(storefront.slugProblem("Madina") === "bad-chars" && storefront.slugProblem("my shop") === "bad-chars" &&
        storefront.slugProblem("-lead") === "bad-chars" && storefront.slugProblem("trail-") === "bad-chars" &&
        storefront.slugProblem("double--hyphen") === "bad-chars" && storefront.slugProblem("under_score") === "bad-chars",
    "slug: capitals, spaces, edge hyphens, double hyphens and underscores are bad-chars — no silent rewriting of a printed slug");
  check(storefront.slugProblem("demo") === "reserved" && storefront.slugProblem("platform") === "reserved" &&
        !storefront.slugOk("s") && !storefront.slugOk("storefront") &&
        storefront.suggestSlug("Madina General Store") === "madina-general-store" &&
        storefront.slugOk(storefront.suggestSlug("Madina General Store")),
    "slug: route-colliding and lying slugs are refused (demo is the §5.3 preview's, never a shop's; the app's own route names likewise); the name suggestion is itself valid");

  /* ---- stock bands (§2.2: bands, never counts) ---- */
  check(storefront.stockBandFor({ stockQty: 0, reorderLevel: 5 }) === "out" &&
        storefront.stockBandFor({ stockQty: -2, reorderLevel: 5 }) === "out" &&
        storefront.stockBandFor({ stockQty: 5, reorderLevel: 5 }) === "low" &&
        storefront.stockBandFor({ stockQty: 6, reorderLevel: 5 }) === "in" &&
        storefront.stockBandFor({ stockQty: 1, reorderLevel: 0 }) === "in",
    "bands: out at/below zero, low at/below the reorder level, in above it — the boundaries are the product's own reorder level");

  /* ---- the snapshot (§2.2) ---- */
  const snap1 = storefront.assembleStorefrontSnapshot({
    businessId: BIZ_H3, slug: "madina-store", settings: settingsH3, city: "Sargodha",
    logoDataUrl: null, products: productsH3, previous: null, nowISO: NOW_H3,
  });
  check(snap1.businessId === BIZ_H3 && snap1.slug === "madina-store" && snap1.shopName === "Madina General Store" &&
        snap1.phone === "0301-2345678" && snap1.city === "Sargodha" && snap1.enabled === true &&
        snap1.publishedAt === NOW_H3 && snap1.updatedAt === NOW_H3 && snap1.currency === "PKR" &&
        !("tagline" in snap1) && !("notice" in snap1) && !("logoRef" in snap1),
    "snapshot: the doc carries shop identity + PKR + the publish stamps; optional fields ride only when set");
  check(Object.keys(byPid(snap1, "p-rice")).sort().join(",") === "category,name,nameUr,price,productId,sort,stockState,unit" &&
        Object.keys(byPid(snap1, "p-oil")).sort().join(",") === "category,name,price,productId,sort,stockState,unit",
    "snapshot: a product entry is exactly {productId, name, price, unit, stockState, sort} + nameUr/category only when the product has them");
  {
    const scan = (v, acc) => {
      if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { acc.push(k); scan(x, acc); }
      return acc;
    };
    const keys = scan(snap1, []);
    check(!keys.includes("costPrice") && !keys.includes("stockQty") && !keys.includes("urduName"),
      "snapshot: DEEP SCAN — no cost price, no stock count, no internal field name anywhere in the published doc (bands, never counts; prices, never costs)");
  }
  check(byPid(snap1, "p-rice").stockState === "in" && byPid(snap1, "p-oil").stockState === "low" &&
        byPid(snap1, "p-soap").stockState === "out" && byPid(snap1, "p-tea").stockState === "in" &&
        snap1.products.map((p) => p.productId).join(",") === "p-soap,p-oil,p-rice,p-tea" &&
        snap1.products.every((p, i) => p.sort === i),
    "snapshot: bands derive from live stock at publish; products sort category → name with sequential sort stamps");
  const snapHidden = storefront.assembleStorefrontSnapshot({
    businessId: BIZ_H3, slug: "madina-store", settings: settingsH3, city: "Sargodha",
    logoDataUrl: null, products: productsH3, excludedProductIds: ["p-tea"], previous: snap1, nowISO: NOW_H3,
  });
  const snapStillHidden = storefront.assembleStorefrontSnapshot({
    businessId: BIZ_H3, slug: "madina-store", settings: settingsH3, city: "Sargodha",
    logoDataUrl: null, products: productsH3, previous: snapHidden, nowISO: NOW_H3,
  });
  const snapShown = storefront.assembleStorefrontSnapshot({
    businessId: BIZ_H3, slug: "madina-store", settings: settingsH3, city: "Sargodha",
    logoDataUrl: null, products: productsH3, includeProductIds: ["p-tea"], previous: snapHidden, nowISO: NOW_H3,
  });
  check(byPid(snapHidden, "p-tea").stockState === "hidden" &&
        byPid(snapStillHidden, "p-tea").stockState === "hidden" &&
        byPid(snapShown, "p-tea").stockState === "in" &&
        snapHidden.publishedAt === NOW_H3 && snapHidden.enabled === true,
    "snapshot: hiding is STICKY across re-publishes (the hidden set is the previous doc's ∪ exclusions − inclusions) until the owner deliberately re-shows; publishedAt and enabled carry from the previous doc");
  check(storefront.storefrontContentEqual(snap1, { ...snap1, publishedAt: "2027-01-01T00:00:00.000Z", updatedAt: "2027-01-01T00:00:00.000Z" }) &&
        !storefront.storefrontContentEqual(snap1, storefront.assembleStorefrontSnapshot({
          businessId: BIZ_H3, slug: "madina-store", settings: settingsH3, city: "Sargodha", logoDataUrl: null,
          products: productsH3.map((p) => (p.id === "p-rice" ? { ...p, salePrice: 1500 } : p)), previous: snap1, nowISO: NOW_H3,
        })),
    "snapshot: the auto-republish seam — content equality ignores the stamps alone and breaks on a real price move, so the subscription's own echo never loops a write");

  /* ---- lit / dark (§2.6: the read rule derives from the assignment snapshot) ---- */
  const regH3 = (plan, extra) => ({
    ownerUid: BIZ_H3, ownerEmail: "o@x.pk", name: "Shop", phone: "", city: "",
    createdAt: "2026-10-01T00:00:00.000Z", status: "active", enforce: false, plan, ...(extra || {}),
  });
  const advActive = regH3(plans.snapshotFor("advanced", "2026-10-01T00:00:00.000Z", { assignedBy: "admin", periodTo: "2026-11-01T00:00:00.000Z" }));
  const advGrace = regH3(plans.snapshotFor("advanced", "2026-09-01T00:00:00.000Z", { assignedBy: "admin", periodTo: "2026-10-10T00:00:00.000Z" }));
  const founding = regH3(plans.snapshotFor("founding", "2026-10-01T00:00:00.000Z", { assignedBy: "migration" }));
  const trial = regH3(plans.snapshotFor("trial", "2026-10-20T00:00:00.000Z", { assignedBy: "signup" }));
  const standard = regH3(plans.snapshotFor("standard", "2026-10-01T00:00:00.000Z", { assignedBy: "admin", periodTo: "2026-11-01T00:00:00.000Z" }));
  check(storefront.storefrontLit(advActive, snap1, NOW_H3) === true &&
        storefront.storefrontLit(founding, snap1, NOW_H3) === true,
    "lit: an Advanced shop in its paid period and a founding shop are lit");
  check(storefront.storefrontLit(trial, snap1, NOW_H3) === false &&
        storefront.storefrontLit(standard, snap1, NOW_H3) === false &&
        storefront.storefrontLit(advGrace, snap1, NOW_H3) === false &&
        storefront.storefrontLit(regH3(advActive.plan, { status: "suspended" }), snap1, NOW_H3) === false &&
        storefront.storefrontLit(advActive, { ...snap1, enabled: false }, NOW_H3) === false &&
        storefront.storefrontLit(null, snap1, NOW_H3) === false &&
        storefront.storefrontLit(advActive, null, NOW_H3) === false,
    "dark: trial (Standard modules), Standard tier, grace, suspension, a switched-off snapshot, no registry and no snapshot are EACH dark — the store is lit exactly while its plan is active/founding, per §2.6");
  check(storefront.storefrontLitState("advanced", "active", snap1) === storefront.storefrontLit(advActive, snap1, NOW_H3) &&
        storefront.storefrontLitState("standard", "active", snap1) === false &&
        storefront.storefrontLitState("advanced", "grace", snap1) === false,
    "lit: the desk's PlanView door (storefrontLitState) is the same rule over the same inputs");

  /* ---- the inbox shape (§2.4: create-only, shape-validated) ---- */
  const goodOrder = {
    businessId: BIZ_H3, slug: "madina-store", customerName: "Ahmed Raza", phone: "0301-2345678",
    lines: [{ productId: "p-rice", qty: 2 }], fulfilment: "pickup", createdAt: NOW_H3, state: "new",
  };
  check(storefront.storeOrderShapeOk(goodOrder) &&
        storefront.storeOrderShapeOk({ ...goodOrder, note: "please pack separately" }),
    "inbox: a well-formed public order passes (note optional)");
  check(!storefront.storeOrderShapeOk({ ...goodOrder, coupon: "SAVE10" }) &&
        !storefront.storeOrderShapeOk({ ...goodOrder, total: 2900 }),
    "inbox: ANY extra key refuses the shape — the public cannot smuggle fields (a claimed total above all) into the shop's paperwork");
  check(!storefront.storeOrderShapeOk({ ...goodOrder, state: "converted" }) &&
        !storefront.storeOrderShapeOk({ ...goodOrder, state: "dismissed" }) &&
        !storefront.storeOrderShapeOk({ ...goodOrder, createdAt: "not-a-date" }) &&
        !storefront.storeOrderShapeOk({ ...goodOrder, slug: "Demo" }),
    "inbox: a preset state, a non-date createdAt and an un-slug all refuse — an order is born `new`, timestamped, for a real store");
  check(!storefront.storeOrderShapeOk({ ...goodOrder, lines: [{ productId: "p-rice", qty: 0 }] }) &&
        !storefront.storeOrderShapeOk({ ...goodOrder, lines: [{ productId: "p-rice", qty: 1000 }] }) &&
        !storefront.storeOrderShapeOk({ ...goodOrder, lines: [{ productId: "p-rice", qty: 1.5 }] }) &&
        !storefront.storeOrderShapeOk({ ...goodOrder, lines: [{ productId: "p-rice", qty: 1, price: 1 }] }) &&
        !storefront.storeOrderShapeOk({ ...goodOrder, lines: [] }) &&
        !storefront.storeOrderShapeOk({ ...goodOrder, lines: Array.from({ length: 51 }, () => ({ productId: "p-rice", qty: 1 })) }),
    "inbox: line hostility refuses — qty 0 / 1000 / fractional, a line carrying its own price, no lines, 51 lines");
  check(!storefront.storeOrderShapeOk({ ...goodOrder, customerName: "x".repeat(61) }) &&
        !storefront.storeOrderShapeOk({ ...goodOrder, customerName: "   " }) &&
        !storefront.storeOrderShapeOk({ ...goodOrder, phone: "123" }) &&
        !storefront.storeOrderShapeOk({ ...goodOrder, phone: "0".repeat(20) }) &&
        !storefront.storeOrderShapeOk({ ...goodOrder, note: "x".repeat(301) }) &&
        !storefront.storeOrderShapeOk({ ...goodOrder, fulfilment: "cod" }),
    "inbox: scalar hostility refuses — oversized/blank name, implausible phones, an oversized note, an unknown fulfilment");
  const composed = storefront.composeStoreOrder(
    { customerName: "  Ahmed Raza ", phone: "0301-2345678", note: " ", fulfilment: "delivery",
      lines: [{ productId: "p-rice", qty: 2 }, { productId: "p-rice", qty: 3 }, { productId: "p-oil", qty: 1 }] },
    { businessId: BIZ_H3, slug: "madina-store", nowISO: NOW_H3 }
  );
  check(composed !== null && composed.lines.length === 2 &&
        composed.lines.find((l) => l.productId === "p-rice").qty === 5 &&
        composed.customerName === "Ahmed Raza" && !("note" in composed) && composed.state === "new" &&
        storefront.storeOrderShapeOk(composed) &&
        storefront.composeStoreOrder(
          { customerName: "A", phone: "0301-2345678", fulfilment: "pickup",
            lines: [{ productId: "p-rice", qty: 600 }, { productId: "p-rice", qty: 600 }] },
          { businessId: BIZ_H3, slug: "madina-store", nowISO: NOW_H3 }) === null,
    "inbox: compose trims, omits an empty note, MERGES duplicate lines — and a merge that overflows the qty bound refuses the whole order rather than clamping it");

  /* ---- the public page model (snapshot alone, no tenant access) ---- */
  const model = storefront.storefrontPageModel(snapHidden);
  check(model.shopName === "Madina General Store" && model.groups.length === 2 &&
        model.groups[0].category === "Care" && model.groups[1].category === "Grocery" &&
        model.cards.length === 3 && !model.cards.some((c) => c.productId === "p-tea"),
    "page model: built from the snapshot literal ALONE (this fixture never touched a tenant collection) — hidden products are absent, groups keep publish order");
  check(model.cards.find((c) => c.productId === "p-soap").orderable === false &&
        model.cards.find((c) => c.productId === "p-oil").orderable === true &&
        Object.keys(model.cards[0]).sort().join(",") === "category,name,orderable,price,productId,stockState,unit",
    "page model: out-of-stock is visible but not orderable; a card is exactly the public fields (the Urdu name rides only when published)");

  /* ---- conversion (§2.5: re-priced, drift shown, exactly-once) ---- */
  const customersH3 = [
    { id: "cu-1", name: "Ahmed Raza", phone: "+92 301 2345678", address: "", note: "", ts: NOW_H3 },
  ];
  const orderH3 = { id: "ord-1", ...goodOrder, lines: [{ productId: "p-rice", qty: 2 }, { productId: "p-oil", qty: 1 }] };
  const planClean = storefront.planStoreConversion(orderH3, snap1, productsH3, customersH3);
  check(planClean !== null && planClean.droppedCount === 0 &&
        planClean.drift.every((d) => !d.priceChanged && !d.productMissing) &&
        planClean.customer !== null && planClean.customer.id === "cu-1",
    "conversion: a clean order plans with zero drift, and the customer is phone-matched across formats (0301… ≡ +92 301…) — an offer to the member, never a silent merge");
  const productsMoved = productsH3.map((p) => (p.id === "p-rice" ? { ...p, salePrice: 1500 } : p)).filter((p) => p.id !== "p-oil");
  const planDrift = storefront.planStoreConversion(orderH3, snap1, productsMoved, customersH3);
  check(planDrift !== null && planDrift.lines.length === 1 && planDrift.lines[0].unitPrice === 1500 &&
        planDrift.drift.find((d) => d.productId === "p-rice").priceChanged === true &&
        planDrift.drift.find((d) => d.productId === "p-rice").publishedPrice === 1450 &&
        planDrift.drift.find((d) => d.productId === "p-rice").livePrice === 1500 &&
        planDrift.drift.find((d) => d.productId === "p-oil").productMissing === true &&
        planDrift.droppedCount === 1,
    "conversion: drift is SHOWN with both prices (published 1,450 → live 1,500), the SO re-prices to LIVE, and a deleted product drops out flagged — never silently repriced, never silently kept");
  check(storefront.planStoreConversion({ ...orderH3, lines: [{ productId: "p-oil", qty: 1 }] }, snap1, productsMoved, customersH3) === null &&
        storefront.planStoreConversion({ ...orderH3, state: "converted" }, snap1, productsH3, customersH3) === null &&
        storefront.planStoreConversion({ ...orderH3, state: "dismissed" }, snap1, productsH3, customersH3) === null,
    "conversion: an order whose every product vanished refuses, and a converted or dismissed order NEVER plans again — the state is the exactly-once claim");
  const soH3 = storefront.buildStoreSaleOrder(orderH3, planDrift, {
    number: "SO-1", customerId: "cu-1", customerName: "Ahmed Raza", customerPhone: "+92 301 2345678",
    products: productsMoved, taxSlabs: [], settings: settingsH3, nowISO: NOW_H3,
  });
  check(soH3.status === "open" && soH3.number === "SO-1" && soH3.sourceType === "storefront" &&
        soH3.sourceOrderId === "ord-1" && soH3.total === 3000 && soH3.lines.length === 1,
    "conversion: the born sale order is `open`, numbered, stamped with its storefront origin, and totals the LIVE-priced lines (2 × 1,500)");
  check(storefront.storeOrderCounts([orderH3, { ...orderH3, id: "o2", state: "converted" }, { ...orderH3, id: "o3", state: "dismissed" }]).fresh === 1 &&
        storefront.storeOrderCounts([orderH3, { ...orderH3, id: "o2", state: "converted" }, { ...orderH3, id: "o3", state: "dismissed" }]).converted === 1,
    "conversion: the inbox headline counts derive from the rows (1 fresh / 1 converted / 1 dismissed) — never a stored counter");

  /* ---- the full journey: publish → order → convert → SO → challan → bill → TB 0 ---- */
  const journeyOrder = { id: "ord-9", ...storefront.composeStoreOrder(
    { customerName: "Ahmed Raza", phone: "0301-2345678", fulfilment: "pickup", lines: [{ productId: "p-rice", qty: 2 }] },
    { businessId: BIZ_H3, slug: "madina-store", nowISO: NOW_H3 }) };
  const journeyPlan = storefront.planStoreConversion(journeyOrder, snap1, productsH3, customersH3);
  const journeySO = { id: "so-9", ...storefront.buildStoreSaleOrder(journeyOrder, journeyPlan, {
    number: "SO-9", customerId: "cu-1", customerName: "Ahmed Raza", customerPhone: "0301-2345678",
    products: productsH3, taxSlabs: [], settings: settingsH3, nowISO: NOW_H3 }) };
  const journeyChallan = {
    id: "dc-9", number: "DC-9", orderId: "so-9", status: "dispatched",
    lines: journeySO.lines.map((l) => ({ ...l })),
  };
  const journeyJournal = seed.getSeedJournal(products, sales, purchases, payments, expenses, credits);
  const billTax = tax.computeBillTaxes([{ total: 2900, qty: 2, slab: null }], 0);
  const billEntry = ledger.makeEntry("Bill — converted from DC-9", "bill", "b-9", [
    { account: "cash", debit: billTax.total, credit: 0 },
    { account: "cogs", debit: 2400, credit: 0 },
    { account: "sales_revenue", debit: 0, credit: 2900 },
    { account: "inventory", debit: 0, credit: 2400 },
  ]);
  journeyJournal.push(billEntry);
  const journeyBill = {
    id: "b-9", status: "paid", sourceType: "challan", sourceId: "dc-9",
    items: [{ productId: "p-rice", qty: 2, sourceProductId: "p-rice" }],
  };
  const tbFold = journeyJournal.reduce((a, e) => a + e.lines.reduce((x, l) => x + l.debit - l.credit, 0), 0);
  check(ledger.entryBalances(billEntry) && tbFold === 0 &&
        eq(ledger.accountBalance(journeyJournal, "cash"), 50000 + 2900) &&
        eq(ledger.accountBalance(journeyJournal, "inventory"), 272805 - 2400),
    "journey: the bill the journey ends in balances, the journal's trial balance stays 0, and cash/inventory move by exactly the bill's amounts over the frozen seed");
  check(docs.deriveOrderStatus(journeySO, [journeyBill], [journeyChallan]) === "fulfilled" &&
        docs.deriveChallanStatus(journeyChallan, [journeyBill]) === "billed",
    "journey: SO → challan → bill derives fulfilled/billed through the ordinary Phase B machinery — the storefront added no fulfilment state of its own");
  {
    const handSO = { ...journeySO, sourceType: null, sourceOrderId: null };
    const handEntry = ledger.makeEntry("Bill — converted from DC-9", "bill", "b-9", [
      { account: "cash", debit: billTax.total, credit: 0 },
      { account: "cogs", debit: 2400, credit: 0 },
      { account: "sales_revenue", debit: 0, credit: 2900 },
      { account: "inventory", debit: 0, credit: 2400 },
    ]);
    const stripEntry = (e) => { const { id, ts, ...rest } = e; return rest; };
    check(handSO.sourceType === null && JSON.stringify(stripEntry(handEntry)) === JSON.stringify(stripEntry(billEntry)),
      "journey: the converted order's bill entry is identical to a hand-made order's in every journal-bearing field (memo, refType, refId, lines — only the entry's own id/stamp differ, as any two entries' do): a storefront origin leaves no fingerprint in the journal");
  }

  /* ---- rules v10 (§5.2: v9 + the H3 spans, nothing else) ---- */
  check(crypto.createHash("sha256").update(stripH3Blocks(stripWaBlocks(stripFR2Blocks(rulesH3))), "utf8").digest("hex") ===
        "734f6ba4cebc9c19203e0d022b810a7e1c76e57fd644d040abbe2a421ad7d3ad",
    "rules: STRIP PROOF — v10 minus the four delimited H3 spans (header note, the §5.2 amendment restored to its exact v9 text, helpers, storefront blocks) is byte-for-byte v9 FINAL (SHA 734f6ba4…): H3's rules change is exactly its spans (WA same-check amendment: the strip first cuts the delimited WhatsApp spans — the amended file minus WhatsApp is the H3-final v10, strip-proven in the WA suite) (FR2 same-check amendment: the strip first cuts the delimited FR2 spans — v11 minus FR2 is v10, strip-proven in the FR2 suite; the FR2 storefront-pin change sits inside the H3 span and is swallowed by the H3 strip)");
  const h3Span = rulesH3.slice(
    rulesH3.indexOf("// ---- Phase H · H3: storefront blocks (START) ----"),
    rulesH3.indexOf("// ---- Phase H · H3: storefront blocks (END) ----"));
  check(h3Span.includes("match /storefronts/{slug}") && h3Span.includes("match /storeOrders/{orderId}") &&
        h3Span.includes("storefrontLit(resource.data.get('businessId'") &&
        h3Span.includes("allow delete: if false"),
    "rules: the blocks span lands both collections — the snapshot read gated on the lit derivation, deletes closed (slugs are never recycled, inbox paper is never destroyed)");
  check(h3Span.includes("storeOrderCreateOk()") && h3Span.includes("hasOnly(['state', 'convertedSoId', 'convertedBy',") &&
        h3Span.includes("'convertedAt', 'dismissedBy', 'dismissedAt'])") &&
        h3Span.includes("request.resource.data.get('state', '') in ['converted', 'dismissed']") &&
        h3Span.includes("resource.data.get('state', '') == 'new'") &&
        h3Span.includes("isBusinessOwner(resource.data.get('businessId', ''))"),
    "rules: the inbox is create-only for the public, its one update is the member state flip out of `new` over exactly the conversion keys, and a snapshot update can never change hands (the anti-hijack businessId pin) (FR2 same-check amendment: the pin is now isBusinessOwner — uid match OR registry leg — the same anti-hijack property, registry-aware so a generated business's owner can update its own snapshot)");
  const amendSpan = rulesH3.slice(
    rulesH3.indexOf("// ---- Phase H · H3 amendment (journal tier list) (START) ----"),
    rulesH3.indexOf("// ---- Phase H · H3 amendment (journal tier list) (END) ----"));
  check(amendSpan.includes("'loyalty_expire'") && !stripH3Blocks(stripWaBlocks(stripFR2Blocks(rulesH3))).includes("loyalty"),
    "rules: §5.2 amendment #1 is exactly the one named string — 'loyalty_expire' joins the Standard tier list inside its span, and the stripped file carries no loyalty text at all (H1's rules posture intact) (WA same-check amendment: the prong runs over the composed strip — the WhatsApp spans carry no 'loyalty' string either)");
  check(rulesH3.includes("function storefrontLit(") && rulesH3.includes("function storeOrderCreateOk(") &&
        rulesH3.includes("createdAt', null) == request.time") &&
        JSON.parse(fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.indexes.json", "utf8"))
          .indexes.some((ix) => ix.collectionGroup === "storeOrders"),
    "rules: the H3 helpers derive lit-ness from the registry and pin the order's createdAt to the server clock; the storeOrders composite index ships with the rules");

  /* ---- the backup slice (G6 manifest gains the H3 collections) ---- */
  const emptyCols = Object.fromEntries(backup.TENANT_COLLECTIONS.map((n) => [n, []]));
  emptyCols.journal = seed.getSeedJournal(products, sales, purchases, payments, expenses, credits)
    .map((e) => ({ key: e.id, data: e }));
  const fileH3 = backup.assembleBackup({
    businessId: BIZ_H3, exportedAt: NOW_H3, exportedBy: "web",
    owner: { shopName: "Madina General Store" }, collections: emptyCols,
    platform: {
      registry: null, counters: null, stats: null, members: [], invites: [], events: [], payments: [],
      storefront: { key: "madina-store", data: { ...snap1 } },
      storeOrders: [
        { key: "ord-1", data: { ...goodOrder } },
        { key: "ord-x", data: { ...goodOrder, businessId: "another-shop" } },
      ],
    },
  });
  check(fileH3.platform.storefront !== null && fileH3.platform.storefront.key === "madina-store" &&
        fileH3.platform.storeOrders.length === 1 && fileH3.manifest.platformCounts.storefront === 1 &&
        fileH3.manifest.platformCounts.storeOrders === 1 && backup.verifyBackup(fileH3).ok === true,
    "backup: the manifest gains the snapshot + inbox (the business's OWN only — a foreign order handed to the assembler is filtered at the seam) and the file verifies");
  {
    const foreignFront = backup.assembleBackup({
      businessId: BIZ_H3, exportedAt: NOW_H3, exportedBy: "web",
      owner: { shopName: "Madina General Store" }, collections: emptyCols,
      platform: {
        registry: null, counters: null, stats: null, members: [], invites: [], events: [], payments: [],
        storefront: { key: "other-shop", data: { ...snap1, businessId: "another-shop", slug: "other-shop" } },
        storeOrders: [],
      },
    });
    check(foreignFront.platform.storefront === null && foreignFront.manifest.platformCounts.storefront === 0,
      "backup: a snapshot whose businessId is not the business's own never rides the file — the public face in a backup is the shop's own or nothing");
  }
  {
    const legacy = JSON.parse(JSON.stringify(fileH3));
    delete legacy.platform.storefront;
    delete legacy.platform.storeOrders;
    delete legacy.manifest.platformCounts.storefront;
    delete legacy.manifest.platformCounts.storeOrders;
    check(backup.verifyBackup(legacy).ok === true,
      "backup: a pre-H3 (G6-shaped) file — no storefront slice, no new counts — still verifies: the tolerance is deliberate, old backups stay readable");
  }
  {
    const targetEmpty = { owner: null, collections: Object.fromEntries(backup.TENANT_COLLECTIONS.map((n) => [n, []])), members: [], invites: [], storefront: null, storeOrders: [] };
    const plan = backup.planRestore({ file: fileH3, targetBusinessId: BIZ_H3, target: targetEmpty, actorUid: BIZ_H3, nowISO: NOW_H3 });
    check(plan.ok === true &&
          plan.writes.some((w) => w.path === "storefronts/madina-store") &&
          plan.writes.some((w) => w.path === "storeOrders/ord-1"),
      "backup: a restore into an empty namespace plans the snapshot and the inbox back as documents — no journal entry is composed for either (they are not money)");
    const planForeignSlug = backup.planRestore({
      file: fileH3, targetBusinessId: BIZ_H3, actorUid: BIZ_H3, nowISO: NOW_H3,
      target: { ...targetEmpty, storefront: { key: "someone-else", data: { businessId: BIZ_H3, slug: "someone-else" } } },
    });
    check(planForeignSlug.ok === false && planForeignSlug.conflicts.some((c) => c.startsWith("storefronts/")),
      "backup: a target already wearing a DIFFERENT slug refuses — a restore never steals or overwrites another storefront's name");
  }

  /* ---- invariants + wiring ---- */
  const storeSrcH3 = readSrcH3("components/StoreProvider.tsx");
  const publicSrcH3 = readSrcH3("components/StorefrontPublicView.tsx");
  check((storeSrcH3.match(/makeEntry\(/g) || []).length === 24 &&
        !readSrcH3("lib/storefront.ts").includes("makeEntry("),
    "invariant: the store still composes exactly 24 makeEntry( sites and lib/storefront composes NONE — the storefront is documents and a snapshot, never a posting");
  check(!publicSrcH3.includes("users/") && !publicSrcH3.includes("setDoc") && !publicSrcH3.includes("updateDoc") &&
        publicSrcH3.includes("storeOrders") && publicSrcH3.includes("serverTimestamp()"),
    "invariant: the public page's source touches NO tenant path and holds no set/update verb at all — its only write is the inbox create, server-timestamped");
  check(perm.accessOf("owner", "storefront") === "full" && perm.accessOf("manager", "storefront") === "full" &&
        perm.accessOf("accountant", "storefront") === "read" && perm.accessOf("cashier", "storefront") === "none" &&
        readSrcH3("lib/nav.ts").includes('"/storefront"'),
    "wiring: the storefront matrix row is owner/manager full, accountant read, cashier none — and the desk is in the nav (plan-gated to Advanced by the sidebar's tier seam)");
  const storePart = require("./out/i18n/parts/store.js");
  check(Object.keys(storePart.enStore).length === 109 && Object.keys(storePart.urStore).length === 109 &&
        Object.keys(storePart.enStore).every((k) => typeof storePart.urStore[k] === "string" && storePart.urStore[k].length > 0 && storePart.enStore[k].length > 0) &&
        Object.keys(i18n.en).length === 3136 && Object.keys(i18n.ur).length === 3136,
    "i18n: the 109 storefront keys (desk store.* + public shop.* + nav.storefront + the receipt caption) carry real EN + UR copy — dictionary 3,077, EN ≡ UR (H3 pin amendment: 108; WA pin amendment: +109 WhatsApp keys; H6 pin amendment: +1 shop.consentLabel, the checkout consent tick; footer-fix pin amendment: +5 shell.footerCol* footer category headings; Fix Round 1 pin amendment: +14 keys (1 dc.backlog + 9 rep.bs.* + 4 fin.fy.openStock.*))");
}

/* ============================== WA ============================== */
{
  suite("WA", null); // Phase H · WhatsApp — consent-first marketing: the consent truth table + import guard, live audience derivations (udhaar FIFO aging, points-expiring via the H1 fold, tier, inactivity, storefront origin, service-due), the campaign lifecycle (draft → launch → queue → per-recipient confirm → log), template rendering, snapshot tier gating, the rules v10-amendment strip proof, the backup slice, i18n (design §3/§5.2)

  const readSrcWA = (p) => fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/" + p, "utf8");
  const rulesWA = fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8");
  const NOW_WA = "2026-11-15T10:00:00.000Z";
  const settingsWA = {
    shopName: "Madina General Store",
    phone: "0301-2345678",
    loyalty: { enabled: true },
    whatsapp: { serviceIntervalDays: 90 },
  };

  /* ---- consent: the truth table (design §3.2) ---- */
  check(whatsapp.customerOptedIn({ id: "x" }) === false &&
        whatsapp.customerOptedIn({ id: "x", waOptIn: false }) === false &&
        whatsapp.customerOptedIn({ id: "x", waOptIn: true }) === true,
    "consent: absent and false are the same answer — NO; only an explicit true opts in (default OFF)");
  check(JSON.stringify(whatsapp.waConsentPatch("counter", true, NOW_WA)) ===
        JSON.stringify({ waOptIn: true, waOptInAt: NOW_WA, waOptInSource: "counter" }) &&
        JSON.stringify(whatsapp.waConsentPatch("storefront", false, NOW_WA)) ===
        JSON.stringify({ waOptIn: false, waOptInAt: NOW_WA, waOptInSource: "storefront" }),
    "consent: the stamp always writes all three fields — state, moment, source — for grants AND revocations (a history of one, never a silent flag)");
  const imported = whatsapp.stripImportConsent({
    name: "Bought List", phone: "0300-0000000", waOptIn: "yes", waOptInAt: "2020-01-01", waOptInSource: "import",
  });
  check(!("waOptIn" in imported) && !("waOptInAt" in imported) && !("waOptInSource" in imported) &&
        imported.name === "Bought List" && whatsapp.customerOptedIn(imported) === false,
    "consent: import can NEVER set it — a parsed row claiming consent (even a 'yes' column, even a source of 'import') comes out with every consent field removed: no consent laundering through a spreadsheet");
  check(whatsapp.resolveWaSettings({}).serviceIntervalDays === 90 &&
        whatsapp.resolveWaSettings({ whatsapp: { serviceIntervalDays: 30 } }).serviceIntervalDays === 30 &&
        whatsapp.resolveWaSettings({ whatsapp: { serviceIntervalDays: -5 } }).serviceIntervalDays === 90,
    "settings: the service interval resolves field-by-field — absent/invalid degrade to the 90-day default the module pins where the design names no number");

  /* ---- phone + links (the house wa.me pattern) ---- */
  check(whatsapp.waIntlPhone("0300-1112233") === "923001112233" &&
        whatsapp.waIntlPhone("+92 300 1112233") === "923001112233" &&
        whatsapp.waPhoneOk("0300-1112233") === true && whatsapp.waPhoneOk("123") === false,
    "phone: local numbers normalise to international digits exactly as the bill share composes them; a 3-digit stub is not a recipient");
  check(whatsapp.waMeLink("0300-1112233", "Salam alaikum").startsWith("https://wa.me/923001112233?text="),
    "transport: the v1 link is the product's proven wa.me pattern with the message pre-filled — opening it is the shopkeeper's act; nothing here sends");

  /* ---- template rendering ---- */
  check(whatsapp.renderWaMessage("Salam {name}, Rs {amount} due at {shop}; {points} pts; code {xyz}",
          { name: "Ahmad", shop: "Madina", points: 2500, amount: 3000.4 }) ===
        "Salam Ahmad, Rs 3000 due at Madina; 2500 pts; code {xyz}",
    "render: {name}/{shop}/{points}/{amount} substitute per recipient (amount rounds to whole rupees) and an unknown {token} is left standing — visible paper, not a silent gap");

  /* ---- fixtures: five customers, one of each story ---- */
  const custWA = [
    { id: "wa-al", name: "Ahmad Ali", phone: "0300-1112233", address: "", note: "", ts: "2026-01-01T00:00:00.000Z", waOptIn: true, waOptInAt: "2026-10-01T00:00:00.000Z", waOptInSource: "counter" },
    { id: "wa-bina", name: "Bilal Hussain", phone: "0321-4445566", address: "", note: "", ts: "2026-01-01T00:00:00.000Z", waOptIn: true, waOptInAt: "2026-10-02T00:00:00.000Z", waOptInSource: "storefront" },
    { id: "wa-cid", name: "Chaudhry Iqbal", phone: "0333-7778899", address: "", note: "", ts: "2026-01-01T00:00:00.000Z" },
    { id: "wa-dal", name: "Daud Khan", phone: "0345-9990011", address: "", note: "", ts: "2026-01-01T00:00:00.000Z", waOptIn: true, waOptInAt: "2026-10-03T00:00:00.000Z", waOptInSource: "counter" },
    { id: "wa-eza", name: "Ehsan Ullah", phone: "123", address: "", note: "", ts: "2026-01-01T00:00:00.000Z", waOptIn: true, waOptInAt: "2026-10-04T00:00:00.000Z", waOptInSource: "counter" },
  ];
  const creditsWA = [
    { id: "cr-al-1", customerId: "wa-al", kind: "credit", amount: 5000, dayOffset: 20, ts: "2026-10-26T00:00:00.000Z", note: "" },
    { id: "cr-al-2", customerId: "wa-al", kind: "repayment", amount: 2000, dayOffset: 5, ts: "2026-11-10T00:00:00.000Z", note: "" },
    { id: "cr-bi-1", customerId: "wa-bina", kind: "credit", amount: 1000, dayOffset: 40, ts: "2026-10-06T00:00:00.000Z", note: "" },
    { id: "cr-bi-2", customerId: "wa-bina", kind: "credit", amount: 500, dayOffset: 3, ts: "2026-11-12T00:00:00.000Z", note: "" },
    { id: "cr-bi-3", customerId: "wa-bina", kind: "repayment", amount: 1200, dayOffset: 1, ts: "2026-11-14T00:00:00.000Z", note: "" },
    { id: "cr-ci-1", customerId: "wa-cid", kind: "credit", amount: 9000, dayOffset: 30, ts: "2026-10-16T00:00:00.000Z", note: "" },
  ];
  const posAl = whatsapp.customerUdhaarPosition(creditsWA, "wa-al");
  const posBi = whatsapp.customerUdhaarPosition(creditsWA, "wa-bina");
  check(posAl.outstanding === 3000 && posAl.oldestAgeDays === 20,
    "udhaar: one customer's position folds his own rows only — Rs 5,000 given, Rs 2,000 repaid, Rs 3,000 standing at 20 days");
  check(posBi.outstanding === 300 && posBi.oldestAgeDays === 3,
    "udhaar FIFO: repayments retire the OLDEST credit first — Rs 1,200 against (1,000 @ 40d + 500 @ 3d) leaves Rs 300 standing at 3 days, not Rs 300 at 40 (the aging report's own allocation)");

  /* loyalty journal: real H1 earn entries for al (gold, expiring)
   * and bina (standard, fresh) */
  const J_WA = [];
  const earnFor = (cid, billId, total, ts) => {
    J_WA.push(ledger.makeEntry(`Bill #${billId}`, "bill", billId, [
      { account: "cash", debit: total, credit: 0 },
      { account: "cogs", debit: Math.round(total * 0.6), credit: 0 },
      { account: "sales_revenue", debit: 0, credit: total },
      { account: "inventory", debit: 0, credit: Math.round(total * 0.6) },
    ], { ts }));
    const earn = loyalty.buildLoyaltyEarnEntry({
      journal: J_WA,
      bill: { id: billId, billNo: 1, customerId: cid, total },
      settings: loyalty.resolveLoyaltySettings({ loyalty: { enabled: true } }),
      ts,
    });
    if (earn) J_WA.push(earn);
    return earn;
  };
  const earnAl = earnFor("wa-al", "wa-b-al", 250000, "2025-11-20T05:00:00.000Z");
  earnFor("wa-bina", "wa-b-bi", 10000, "2026-10-01T05:00:00.000Z");
  check(!!earnAl && earnAl.points === 2500,
    "fixtures: al's earn is a real H1 entry — 2,500 points on Rs 250,000 at the standard speed, vintage expiring 2026-11-20");

  const dataWA = {
    customers: custWA,
    credits: creditsWA,
    journal: J_WA,
    bills: [
      { id: "wa-bill-al", customerId: "wa-al", status: "paid", ts: "2026-11-10T05:00:00.000Z", total: 1200 },
      { id: "wa-bill-bi", customerId: "wa-bina", status: "paid", ts: "2026-08-01T05:00:00.000Z", total: 800 },
    ],
    saleOrders: [
      { id: "wa-so-1", customerId: "wa-bina", sourceType: "storefront" },
      { id: "wa-so-2", customerId: "wa-al", sourceType: "phone" },
    ],
    jobs: [
      { id: "wa-job-al", customerId: "wa-al", status: "delivered", ts: "2026-07-01T05:00:00.000Z" },
      { id: "wa-job-bi", customerId: "wa-bina", status: "delivered", ts: "2026-11-01T05:00:00.000Z" },
    ],
    settings: settingsWA,
    nowISO: NOW_WA,
  };
  const idsOf = (aud) => whatsapp.resolveWaAudience(aud, dataWA).map((c) => c.id).join(",");

  /* ---- audiences: live derivations, consent filter LAST ---- */
  check(idsOf({ kind: "all_opted_in" }) === "wa-al,wa-bina,wa-dal,wa-eza",
    "audience all_opted_in: every opted-in customer in directory order — cid (never consented) is absent, eza (bad number) is present: validity is a send-time judgement, not an audience one");
  check(idsOf({ kind: "udhaar_outstanding", minRs: 1, minDays: 7 }) === "wa-al",
    "audience udhaar: amount AND age both bind — al (3,000 @ 20d) in; bina (300 @ 3d) out on age; cid (9,000 @ 30d) out on consent alone");
  check(whatsapp.waSegmentMatches({ kind: "udhaar_outstanding", minRs: 1, minDays: 7 }, custWA[2], dataWA) === true &&
        !whatsapp.resolveWaAudience({ kind: "udhaar_outstanding", minRs: 1, minDays: 7 }, dataWA).some((c) => c.id === "wa-cid"),
    "audience doctrine: the SEGMENT test alone admits cid — it is the resolver's consent filter, applied last for every kind, that excludes him; there is no path around it");
  check(idsOf({ kind: "points_expiring", withinDays: 7 }) === "wa-al",
    "audience points_expiring: al's H1 vintage (2,500 pts, expires 2026-11-20) is inside the 7-day horizon at 2026-11-15; bina's fresh vintage (expires 2027-10-01) is not");
  check(idsOf({ kind: "tier", tier: "gold" }) === "wa-al" && idsOf({ kind: "tier", tier: "silver" }) === "",
    "audience tier: the H1 fold's derived tier — al is Gold on 2,500 trailing points; nobody is Silver");
  check(idsOf({ kind: "inactive", days: 60 }) === "wa-bina,wa-dal,wa-eza",
    "audience inactive: bina's last bill is 106 days old; dal and eza have never bought (no bill in N days is literally true); al bought 5 days ago");
  check(idsOf({ kind: "storefront_customers" }) === "wa-bina",
    "audience storefront: only orders BORN from the storefront count (sourceType) — al's phone order does not make him a store customer");
  check(idsOf({ kind: "service_due" }) === "wa-al",
    "audience service_due: al's delivered job is 137 days old against the 90-day settings interval; bina's is 14 days old; the interval is settings, not a campaign param");
  const suggWA = whatsapp.waSuggestedReminders(dataWA);
  check(suggWA.udhaarCount === 1 && suggWA.pointsExpiringCount === 1 && suggWA.serviceDueCount === 1 && suggWA.serviceIntervalDays === 90,
    "suggestions: today's counts (udhaar ≥ 7d, points ≤ 7d, service-due) run the full resolution — consent filter included — and suggest nothing about cid despite his 9,000 @ 30d");

  /* ---- launch: the send log materialises (design §3.4) ---- */
  const campaignWA = {
    id: "wac-1", name: "Fixture campaign", templateId: "wat-1",
    audience: { kind: "all_opted_in" }, resolvedCount: null,
    createdBy: "owner-1", ts: NOW_WA, state: "draft",
  };
  let nWA = 0;
  const planWA = whatsapp.planWaLaunch(campaignWA, dataWA, () => `was-${++nWA}`);
  check(planWA.resolvedCount === 4 && planWA.sends.length === 4 &&
        planWA.sends.every((s) => s.state === "queued" && s.campaignId === "wac-1") &&
        planWA.sends[0].phone === "0300-1112233" && planWA.sends[3].phone === "123",
    "launch: one queued row per resolved recipient, resolvedCount stamped, phones stamped from the customer docs AS THEY STAND at launch (the log records where each message was aimed)");

  /* ---- the queue walk: confirm, opt-out, bad number ---- */
  const byIdWA = (arr, id) => arr.find((s) => s.id === id);
  let sendsWA = [...planWA.sends];
  const step1 = whatsapp.waQueueStep(sendsWA, custWA, null);
  check(step1 !== null && step1.send.id === "was-1" && step1.action === "send",
    "queue: the head is the first non-terminal row, and a consented, valid recipient is workable");
  const openedWA = whatsapp.waSendTransition(step1.send, "opened", custWA[0]);
  const sentWA = whatsapp.waSendTransition(openedWA, "sent", custWA[0]);
  check(openedWA.state === "opened" && sentWA.state === "sent",
    "queue: queued → opened (the wa.me tap) → sent (the shopkeeper's own confirmation — the ONLY thing 'sent' has ever meant here)");
  sendsWA = sendsWA.map((s) => (s.id === "was-1" ? sentWA : s));
  const binaSent = whatsapp.waSendTransition(byIdWA(sendsWA, "was-2"), "sent", custWA[1]);
  sendsWA = sendsWA.map((s) => (s.id === "was-2" ? binaSent : s));
  /* dal opts OUT after launch — the send-time re-check governs */
  const custAfterOptOut = custWA.map((c) =>
    c.id === "wa-dal" ? { ...c, ...whatsapp.waConsentPatch("counter", false, NOW_WA) } : c);
  const stepDal = whatsapp.waQueueStep(sendsWA, custAfterOptOut, null);
  check(stepDal !== null && stepDal.send.id === "was-3" && stepDal.action === "skip-optout",
    "queue re-check: dal opted out AFTER launch — at his turn the queue reads the customer doc AS IT STANDS NOW and the verdict is skip-optout, however clean the launch was");
  const dalLanded = whatsapp.waSendTransition(stepDal.send, "sent", custAfterOptOut.find((c) => c.id === "wa-dal"));
  check(dalLanded.state === "skipped_optout",
    "queue re-check: the re-check OVERRIDES the act — even the 'I sent it' tap lands the row in skipped_optout; he is never, ever recorded as sent");
  sendsWA = sendsWA.map((s) => (s.id === "was-3" ? dalLanded : s));
  const stepEza = whatsapp.waQueueStep(sendsWA, custAfterOptOut, null);
  const ezaLanded = stepEza ? whatsapp.waSendTransition(stepEza.send, "opened", custAfterOptOut.find((c) => c.id === "wa-eza")) : null;
  check(stepEza !== null && stepEza.action === "skip-invalid" && ezaLanded !== null && ezaLanded.state === "skipped_invalid",
    "queue re-check: eza's stamped number is not WhatsApp-reachable — the row lands in skipped_invalid rather than opening a dead chat");
  sendsWA = sendsWA.map((s) => (s.id === "was-4" ? ezaLanded : s));
  const progWA = whatsapp.waCampaignProgress(sendsWA);
  check(progWA.total === 4 && progWA.sent === 2 && progWA.skippedOptout === 1 && progWA.skippedInvalid === 1 &&
        progWA.terminal === 4 && progWA.complete === true && whatsapp.waQueueStep(sendsWA, custAfterOptOut, null) === null,
    "lifecycle: 2 sent + 1 skipped_optout + 1 skipped_invalid = every row terminal — progress.complete is what closes the campaign to done");
  const cursorStep = whatsapp.waQueueStep(planWA.sends, custWA, "was-1");
  check(cursorStep !== null && cursorStep.send.id === "was-2" &&
        whatsapp.waQueueStep(planWA.sends, custWA, null).send.id === "was-1" &&
        planWA.sends.every((s) => s.state === "queued"),
    "queue cursor: 'skip for now' writes NOTHING — the session cursor steps past was-1, and next session (no cursor) the same row resurfaces at the head, still queued, because it was never sent and the log does not pretend otherwise");
  check(whatsapp.waQueueMessage("Assalam-o-Alaikum {name}, Rs {amount} outstanding at {shop}; you have {points} points.", custWA[0], dataWA) ===
        "Assalam-o-Alaikum Ahmad Ali, Rs 3000 outstanding at Madina General Store; you have 2500 points.",
    "queue message: the campaign template renders with the recipient's LIVE facts — name, the shop's name, the H1-fold points, the FIFO udhaar amount");

  /* ---- plan gates: the snapshot governs (design §5.1) ---- */
  const basicViewWA = {
    snapshot: plans.snapshotFor("basic", "2026-10-06T00:00:00.000Z", { assignedBy: "signup" }),
    enforce: true, suspended: false, state: "active", counters: null,
  };
  const standardViewWA = {
    snapshot: plans.snapshotFor("standard", "2026-10-06T00:00:00.000Z", { assignedBy: "signup" }),
    enforce: true, suspended: false, state: "active", counters: null,
  };
  check(plans.tierIncludesModule("standard", "whatsapp") === true && whatsapp.waModuleAllowed(basicViewWA) === false,
    "gating: the live CATALOGUE grants whatsapp at Standard — and a Basic-SNAPSHOT shop is still refused: the gate reads the assignment snapshot, never the catalogue (the G doctrine)");
  check(whatsapp.waModuleAllowed(standardViewWA) === true && whatsapp.waSendingAllowed(standardViewWA) === true,
    "gating: a Standard snapshot in an active state passes both gates");
  check(whatsapp.waModuleAllowed({ ...standardViewWA, state: "grace" }) === true &&
        whatsapp.waSendingAllowed({ ...standardViewWA, state: "grace" }) === false &&
        whatsapp.waSendingAllowed({ ...standardViewWA, state: "suspended" }) === false,
    "gating: plan expiry degrades SENDING only (invariant 5) — in grace/suspension the module stays allowed (desk, templates, history readable) while launching and queueing stop");
  check(whatsapp.waModuleAllowed(null) === true && whatsapp.waSendingAllowed(null) === true,
    "gating: a null plan view (demo, pre-G registry-less shop) gates nothing, exactly as every G surface behaves");
  check(perm.can("owner", "whatsapp", "write") && perm.can("manager", "whatsapp", "write") &&
        perm.can("accountant", "whatsapp", "view") && !perm.can("accountant", "whatsapp", "write") &&
        !perm.can("cashier", "whatsapp", "view"),
    "RBAC: the whatsapp row — owner/manager full, accountant read, cashier none (the rules' narrowed read leg mirrors it)");

  /* ---- rules: the v10 amendment + strip proofs ---- */
  check(crypto.createHash("sha256").update(stripWaBlocks(stripH6Blocks(stripFR2Blocks(rulesWA))), "utf8").digest("hex") ===
        "4a4107296db055eef16670a3f0f4f3d1fd68a5b3b41e270bab85edb051ef12b2",
    "rules: STRIP PROOF — the amended v10 minus the two delimited WhatsApp spans (header note, wa collections) is byte-for-byte the H3-final v10 (SHA 4a410729…): the WhatsApp rules change is exactly its spans (lineage: H6 amendment — stripH6Blocks runs first since H6; the H6 order-consent span nests inside the H3 helpers, so the composed v9 proof below needed no H6 step) (FR2 same-check amendment: stripFR2Blocks runs first of all — v11 minus FR2 is v10, strip-proven in the FR2 suite)");
  check(crypto.createHash("sha256").update(stripH3Blocks(stripWaBlocks(stripFR2Blocks(rulesWA))), "utf8").digest("hex") ===
        "734f6ba4cebc9c19203e0d022b810a7e1c76e57fd644d040abbe2a421ad7d3ad",
    "rules: the composed strip still lands on v9 FINAL (SHA 734f6ba4…) — WhatsApp + H3 spans together are the whole delta from v9 (FR2 same-check amendment: stripFR2Blocks runs first — v11 minus FR2 is v10)");
  const waSpan = rulesWA.slice(
    rulesWA.indexOf("// ---- Phase H · WhatsApp: wa collections (START) ----"),
    rulesWA.indexOf("// ---- Phase H · WhatsApp: wa collections (END) ----"));
  const waHead = rulesWA.slice(
    rulesWA.indexOf("// ---- Phase H · WhatsApp: rules v10 header note (START) ----"),
    rulesWA.indexOf("// ---- Phase H · WhatsApp: rules v10 header note (END) ----"));
  check(waSpan.includes("match /waTemplates/{templateId}") && waSpan.includes("match /waCampaigns/{campaignId}") &&
        waSpan.includes("match /waSends/{sendId}") &&
        (waSpan.match(/hasRole\(uid, \['owner', 'manager', 'accountant'\]\)/g) || []).length === 3 &&
        (waSpan.match(/allow delete: if false/g) || []).length === 2 &&
        waSpan.includes("allow create, update, delete: if hasRole(uid, ['owner', 'manager'])"),
    "rules: the wa span lands all three collections — reads narrowed to owner/manager/accountant on every one, template writes owner/manager incl. delete, campaigns + the send log delete-closed (history is not deleted)");
  check(!waSpan.includes("loyalty") && !waHead.includes("loyalty") && !waSpan.includes("planPostable") && !waSpan.includes("createInOpenPeriod"),
    "rules: the WhatsApp spans carry no 'loyalty' string (H1's strip prong stays honest) and NO plan/period legs — these docs assert no money fact; plan gating is the client snapshot gates' job (paper-doc precedent)");

  /* ---- backup: the manifest gains the three collections ---- */
  const emptyColsWA = Object.fromEntries(backup.TENANT_COLLECTIONS.map((n) => [n, []]));
  emptyColsWA.journal = journal;
  const tplDocWA = { id: "wat-1", name: "Fixture offer", kind: "promo", body: "Salam {name}", createdBy: "owner-1", ts: NOW_WA };
  const campDocWA = { ...campaignWA, state: "done", resolvedCount: 4 };
  const sendDocWA = { id: "was-1", campaignId: "wac-1", customerId: "wa-al", phone: "0300-1112233", state: "sent", ts: NOW_WA };
  emptyColsWA.waTemplates = [tplDocWA];
  emptyColsWA.waCampaigns = [campDocWA];
  emptyColsWA.waSends = [sendDocWA];
  const fileWA = backup.assembleBackup({
    businessId: "bizWA", exportedAt: NOW_WA, exportedBy: "web",
    owner: { shopName: "Madina General Store", staffEmails: [], staff: [] },
    collections: emptyColsWA,
    platform: { registry: null, counters: null, stats: null, members: [], invites: [], events: [], payments: [], storefront: null },
  });
  check(fileWA.manifest.counts.waTemplates === 1 && fileWA.manifest.counts.waCampaigns === 1 &&
        fileWA.manifest.counts.waSends === 1 && backup.verifyBackup(fileWA).ok === true,
    "backup: the three WhatsApp collections ride the manifest with their counts, and the file verifies");
  const planRestoreWA = backup.planRestore({
    file: fileWA, targetBusinessId: "bizWA2",
    target: { ...backup.emptyNamespace(), owner: { shopName: "New Shop", staffEmails: [], staff: [] } },
    actorUid: "bizWA2", nowISO: NOW_WA,
  });
  check(planRestoreWA.ok === true &&
        ["waTemplates/wat-1", "waCampaigns/wac-1", "waSends/was-1"].every((tail) =>
          planRestoreWA.writes.some((w) => w.kind === "set" && w.path === `users/bizWA2/${tail}`)),
    "backup: the restore plan writes the WhatsApp docs into the TARGET business's own users tree — and no path enters the source namespace");
  const restoredWA = backup.applyRestoreWrites(backup.emptyNamespace(), "bizWA2", planRestoreWA.writes);
  check(backup.docsEqual(restoredWA.collections.waTemplates[0], tplDocWA) &&
        backup.docsEqual(restoredWA.collections.waCampaigns[0], campDocWA) &&
        backup.docsEqual(restoredWA.collections.waSends[0], sendDocWA),
    "backup round-trip: template, campaign and send-log row survive backup → empty namespace → restore byte-for-byte");

  /* ---- wiring + journal discipline ---- */
  const storeSrcWA = readSrcWA("components/StoreProvider.tsx");
  check((storeSrcWA.match(/makeEntry\(/g) || []).length === 24 &&
        !readSrcWA("lib/whatsapp.ts").includes("makeEntry("),
    "journal discipline: marketing moves no money — the store's makeEntry site count stays exactly 24 and lib/whatsapp composes no entry at all");
  check(readSrcWA("lib/nav.ts").includes('"/whatsapp"') &&
        readSrcWA("components/Sidebar.tsx").includes('"/whatsapp": "whatsapp"') &&
        readSrcWA("components/WhatsAppView.tsx").includes("waMeLink") &&
        readSrcWA("components/WhatsAppView.tsx").includes("advanceWaSend"),
    "wiring: the desk is in the nav under the whatsapp matrix module, and the view drives the store's queue actions over the wa.me pattern");
  const waPart = require("./out/i18n/parts/wa.js");
  check(Object.keys(waPart.enWa).length === 109 && Object.keys(waPart.urWa).length === 109 &&
        Object.keys(waPart.enWa).every((k) => typeof waPart.urWa[k] === "string" && waPart.urWa[k].length > 0 && waPart.enWa[k].length > 0) &&
        Object.keys(i18n.en).length === 3136 && Object.keys(i18n.ur).length === 3136,
    "i18n: the 109 WhatsApp keys carry real EN + UR copy — dictionary 3,054, EN ≡ UR (WA pin amendment)");
  const tbWA = reports.trialBalance(journal, { from: "2000-01-01", to: "2100-01-01" });
  check(ledger.accountBalance(journal, "inventory") === 272805 && ledger.cashBalance(journal) === 50000 &&
        ledger.payablesTotal(journal) === 27900 && ledger.receivablesTotal(journal) === 5500 &&
        tbWA.totalDebits === tbWA.totalCredits,
    "frozen: the seed identities stand untouched by the whole WhatsApp build — Inventory 272,805 · Cash 50,000 · payables 27,900 · receivables 5,500 · TB 0");
}

suite("PSFA", null); // Phase H · PS/FA — Pashto + Farsi language packs: four-locale parity gates, the review manifest + badge state machine, the drift-refusing review merge, Naskh/RTL wiring (design §4)
{
  const reviewL = require("./out/i18n/review.js");
  const mergeToolL = require("./review-merge.js");
  const readSrcL = (p) => fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/" + p, "utf8");
  const manifestL = JSON.parse(readSrcL("lib/i18n/review-manifest.json"));
  const enKeysL = Object.keys(i18n.en).sort();
  const tokSetL = (s) => [...new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort().join(",");

  check(enKeysL.length === 3136 && Object.keys(i18n.ps).length === 3136 && Object.keys(i18n.fa).length === 3136,
    "i18n: four locales at 3,077 keys each (PS/FA pin amendment: +3 settings.lang keys over the WA-era 3,054; H6 pin amendment: +1 shop.consentLabel, the storefront consent tick, drafted in PS/FA like every H6 key; footer-fix pin amendment: +5 shell.footerCol* footer category headings, drafted in PS/FA like every draft key; Fix Round 1 pin amendment: +14 keys (1 dc.backlog + 9 rep.bs.* + 4 fin.fy.openStock.*), drafted in PS/FA like every draft key)");
  check(JSON.stringify(Object.keys(i18n.ps).sort()) === JSON.stringify(enKeysL) &&
        JSON.stringify(Object.keys(i18n.fa).sort()) === JSON.stringify(enKeysL),
    "i18n: PS and FA key sets are exactly EN's — no missing, no extra (§4.4)");
  check(enKeysL.every((k) => typeof i18n.ps[k] === "string" && i18n.ps[k].length > 0 &&
        typeof i18n.fa[k] === "string" && i18n.fa[k].length > 0),
    "i18n: every PS/FA value is a non-empty string — completeness is content, not just keys");
  check(enKeysL.every((k) => tokSetL(i18n.ps[k]) === tokSetL(i18n.en[k]) &&
        tokSetL(i18n.fa[k]) === tokSetL(i18n.en[k]) && tokSetL(i18n.ur[k]) === tokSetL(i18n.en[k])),
    "i18n: {placeholder} token sets match EN in UR/PS/FA for every key — interpolation cannot strand a token in any locale");
  const wlL = new Set(manifestL.copyThroughAllowed ?? []);
  check(enKeysL.every((k) =>
        (i18n.ps[k] !== i18n.en[k] || !/[A-Za-z]/.test(i18n.en[k]) || wlL.has(k)) &&
        (i18n.fa[k] !== i18n.en[k] || !/[A-Za-z]/.test(i18n.en[k]) || wlL.has(k))),
    "i18n: no un-translated English copy-through in PS/FA beyond the manifest's whitelist (brands, tech tokens, format-only strings, single-letter codes)");
  check([...wlL].every((k) => k in i18n.en),
    "manifest: every copyThroughAllowed entry names a real key");
  check(JSON.stringify(Object.keys(manifestL.ps.states).sort()) === JSON.stringify(enKeysL) &&
        JSON.stringify(Object.keys(manifestL.fa.states).sort()) === JSON.stringify(enKeysL),
    "manifest: every PS/FA key carries a state and every state names a real key — an unaccounted key cannot exist (§4.1)");
  check(enKeysL.every((k) => manifestL.ps.states[k] === "draft" && manifestL.fa.states[k] === "draft") &&
        manifestL.ps.reviewer === null && manifestL.fa.reviewer === null,
    "manifest: at this increment every PS/FA key is a labelled DRAFT and no reviewer is recorded — no review has happened and none is claimed");
  check(reviewL.localeIsDraft("ps") === true && reviewL.localeIsDraft("fa") === true &&
        reviewL.localeIsDraft("ur") === false && reviewL.localeIsDraft("en") === false,
    "badge: PS/FA wear the Draft preview label; EN/UR never do (§4.2)");
  const sumL = reviewL.localeReview("ps");
  check(sumL !== null && sumL.total === 3136 && sumL.reviewed === 0 && sumL.complete === false && sumL.reviewer === null,
    "badge: localeReview(ps) reports 0/3,077 reviewed — derived from the manifest, never stored");
  check(reviewL.reviewStateOf("ps", "billing.title") === "draft" && reviewL.reviewStateOf("en", "billing.title") === null,
    "manifest: reviewStateOf reads per-key state; EN is untracked");
  check(reviewL.reviewSummary({ a: "reviewed", b: "reviewed" }).complete === true &&
        reviewL.reviewSummary({ a: "reviewed", b: "draft" }).complete === false &&
        reviewL.reviewSummary({}).complete === false,
    "badge state machine: 100% reviewed drops the badge; any draft (or an empty map) keeps it — per language, independently");
  check(i18n.langDir("en") === "ltr" && i18n.langDir("ur") === "rtl" && i18n.langDir("ps") === "rtl" && i18n.langDir("fa") === "rtl" &&
        i18n.isRtlLang("ps") && i18n.isNaskhLang("ps") && i18n.isNaskhLang("fa") && !i18n.isNaskhLang("ur"),
    "direction truth table: en LTR; ur/ps/fa RTL; Naskh = ps/fa only (Nastaliq stays UR's, §4.5)");
  check(JSON.stringify(i18n.LANGS) === JSON.stringify(["en", "ur", "ps", "fa"]) && i18n.DICTS.ps === i18n.ps &&
        i18n.translate("ps", "settings.langDraftPreview") === "مسوده" &&
        i18n.translate("fa", "settings.langDraftPreview").length > 0 &&
        i18n.translate("fa", "settings.langDraftPreview") !== "Draft preview",
    "locales: LANGS widen to four; translate() serves PS/FA from their own dictionaries (the badge label is dictionary copy in all four languages)");
  const cssL = readSrcL("app/globals.css");
  check(cssL.includes("--font-naskh") && cssL.includes('html[lang="ps"]') && cssL.includes('html[lang="fa"]') && cssL.includes(".naskh"),
    "fonts (web): a Naskh-first system stack + ps/fa typography rules join Nastaliq — no downloadable webfont added (§4.5)");
  check(readSrcL("components/ReportPrintSheet.tsx").includes("isNaskhLang") &&
        readSrcL("components/DocPrintSheet.tsx").includes("ps-AF-u-nu-latn") &&
        readSrcL("components/DocPrintSheet.tsx").includes("fa-AF-u-nu-latn"),
    "print (web): report/doc sheets route PS/FA to the Naskh class and the Afghan locales with Latin digits forced — the same browser pipeline, no new print engine, no Jalali");
  check(readSrcL("components/LangToggle.tsx").includes("localeIsDraft") && readSrcL("components/SettingsView.tsx").includes("localeIsDraft"),
    "badge wiring: the header picker and Settings both derive the Draft preview label from the manifest — the demo shell uses the same picker, so the showroom wears the same badge (§4.2)");
  check(readSrcL("components/LangProvider.tsx").includes('saved === "ps"') && readSrcL("app/layout.tsx").includes("l==='ps'"),
    "wiring: stored ps/fa selections survive reload and the pre-paint script paints the right lang/dir before hydration");
  const dictL = { a: "A", b: "B", c: "C" };
  const statesL = { a: "draft", b: "draft", c: "draft" };
  const csvHeadL = "key,surface,en,ur,draft,corrected,seen";
  const rowsL = mergeToolL.parsePack([csvHeadL, "a,common,A,ا,A,AA,1", "b,common,B,ب,B,,1", "c,common,C,ج,C,,"].join("\n"));
  const planL = mergeToolL.planMerge({ rows: rowsL, dict: dictL, states: statesL, reviewer: "Test Reviewer" });
  check(planL.ok && planL.updates.length === 1 && planL.updates[0].key === "a" && planL.updates[0].to === "AA" &&
        JSON.stringify(planL.flips) === JSON.stringify(["a", "b"]),
    "review merge: the reviewer's correction replaces the draft and exactly the seen keys flip draft → reviewed — nothing else moves (§4.3a/b)");
  const planDriftKeysL = mergeToolL.planMerge({ rows: rowsL.slice(0, 2), dict: dictL, states: statesL, reviewer: "T" });
  check(!planDriftKeysL.ok && planDriftKeysL.errors.some((e) => e.type === "drift-keys"),
    "review merge: a pack whose key set has drifted from the current dictionary is REFUSED — a stale pack reviews a product that no longer exists (§4.3c)");
  const rowsStaleL = mergeToolL.parsePack([csvHeadL, "a,common,A,ا,STALE,AA,1", "b,common,B,ب,B,,1", "c,common,C,ج,C,,"].join("\n"));
  const planStaleL = mergeToolL.planMerge({ rows: rowsStaleL, dict: dictL, states: statesL, reviewer: "T" });
  check(!planStaleL.ok && planStaleL.errors.some((e) => e.type === "drift-base" && e.key === "a"),
    "review merge: a seen row reviewed against text the product no longer has is REFUSED, not silently merged");
  const planNoNameL = mergeToolL.planMerge({ rows: rowsL, dict: dictL, states: statesL, reviewer: "" });
  check(!planNoNameL.ok && planNoNameL.errors.some((e) => e.type === "no-reviewer"),
    "review merge: no anonymous review — a merge without a reviewer's name is refused (§4.1)");
  const planAgainL = mergeToolL.planMerge({ rows: rowsL, dict: dictL, states: { a: "reviewed", b: "reviewed", c: "draft" }, reviewer: "T" });
  check(planAgainL.ok && planAgainL.flips.length === 0 && planAgainL.alreadyReviewed.length === 2 && planAgainL.updates.length === 1,
    "review merge: states never move backwards — reviewed keys stay reviewed (a fresh correction on one still lands as a re-review)");
  const packRowsL = mergeToolL.parsePack(readSrcL("lib/i18n/review-packs/ps-review-pack.csv"));
  check(packRowsL.length === 3136 && packRowsL[0].key.startsWith("billing.") &&
        fs.existsSync("/home/hatch/workspace/ai-dukaan-ai/web/lib/i18n/review-packs/fa-review-pack.csv") &&
        fs.existsSync("/home/hatch/workspace/ai-dukaan-ai/web/lib/i18n/review-packs/ps-review-pack.md") &&
        fs.existsSync("/home/hatch/workspace/ai-dukaan-ai/web/lib/i18n/review-packs/fa-review-pack.md"),
    "review packs: a CSV + a readable sheet per language, one row per key, money surfaces first (§4.3)");
  const tbL = reports.trialBalance(journal, { from: "2000-01-01", to: "2100-12-31" });
  check(journal.length === 21 && ledger.accountBalance(journal, "inventory") === 272805 &&
        ledger.cashBalance(journal) === 50000 && tbL.totalDebits === tbL.totalCredits,
    "frozen: two new languages changed no money — seed journal 21 entries, Inventory 272,805, Cash 50,000, TB 0");
}

suite("H6", null); // Phase H · H6 — the release-audit fixes: web backup tolerance, the storefront checkout consent tick, demo loyalty completeness, Dart day-close alignment + exporter determinism (PHASE-H-RELEASE-AUDIT.md)
{
  const readSrcH6 = (p) => fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/" + p, "utf8");
  const JH6 = (v) => JSON.parse(JSON.stringify(v));

  /* ---- fix 1: web backup tolerance (the Dart twin's rule) ---- */
  const g6H6 = JSON.parse(readSrcH6("harness/fixtures/g6-core.json"));
  check(backup.verifyBackup(g6H6.file).ok === true,
    "backup (fix 1): the FROZEN g6 fixture file — a genuine pre-WhatsApp backup (35 tenant collections, no WA counts) — now VERIFIES on web; until H6 web refused it as not-a-backup while the Dart twin restored it (the §9 data right governs)");
  const planH6 = backup.planRestore({ file: g6H6.file, targetBusinessId: g6H6.targetBusinessId, target: backup.emptyNamespace(), actorUid: g6H6.targetBusinessId, nowISO: g6H6.nowISO });
  check(planH6.ok === true && planH6.writes.filter((w) => /waTemplates|waCampaigns|waSends/.test(w.path ?? "")).length === 0,
    "backup (fix 1): the frozen file also PLANS a restore — the WhatsApp-era collections restore EMPTY; no writes are invented for them");
  check(g6H6.verifyCases.every((c) => { const r = backup.verifyBackup(c.file); return c.expect === null ? r.ok === true : (r.ok === false && r.problem === c.expect); }),
    "backup (fix 1): the tamper ladder still refuses, each with its pinned reason — count +1, one journal digit, format 99, schema 7, non-backup");
  const waLieH6 = JH6(g6H6.file); waLieH6.collections.waTemplates = [{ id: "wt-smuggled" }];
  check(backup.verifyBackup(waLieH6).ok === false && backup.verifyBackup(waLieH6).problem === "manifest-mismatch",
    "backup (fix 1): tolerance is not blindness — a WA document the manifest does not count still refuses as manifest-mismatch");
  const badH6 = JH6(g6H6.file); badH6.collections.waSends = "nope";
  check(backup.verifyBackup(badH6).ok === false && backup.verifyBackup(badH6).problem === "not-a-backup",
    "backup (fix 1): a collection PRESENT but not an array is still corruption (not-a-backup) — only ABSENCE is tolerated");

  /* ---- fix 2: the storefront checkout consent tick ---- */
  const rulesH6 = readSrcH6("firebase/firestore.rules");
  check(crypto.createHash("sha256").update(stripFR2Blocks(rulesH6), "utf8").digest("hex") === "f10b2ee07ceb0c5a583f3762fa021222fb1a9a90832bf566956ae157372220ba",
    "rules (fix 2): rules v10 FINAL as amended by H6 — pinned SHA f10b2ee0… (the rollout artifact; 1,489 lines) (FR2 same-check amendment: the hash runs over stripFR2Blocks(rules) — v11 minus FR2 is v10, strip-proven in the FR2 suite)");
  check(crypto.createHash("sha256").update(stripH6Blocks(stripFR2Blocks(rulesH6)), "utf8").digest("hex") === "e556c92e9e27c0234ade367b4f16a9b294287bd1388385d2a10296b185017295",
    "rules (fix 2): stripH6 alone reproduces the WA-era v10 FINAL (SHA e556c92e…) byte-for-byte — the H6 delta is exactly its two delimited spans (FR2 same-check amendment: stripFR2Blocks runs first — v11 minus FR2 is v10)");
  check(crypto.createHash("sha256").update(stripH3Blocks(stripWaBlocks(stripFR2Blocks(rulesH6))), "utf8").digest("hex") === "734f6ba4cebc9c19203e0d022b810a7e1c76e57fd644d040abbe2a421ad7d3ad",
    "rules (fix 2): the fully composed strip still lands on v9 FINAL (SHA 734f6ba4…) — the chain extended H6 → WA → H3 and proven in both directions (FR2 same-check amendment: stripFR2Blocks runs first — v11 minus FR2 is v10)");
  const orderFnH6 = rulesH6.slice(rulesH6.indexOf("function storeOrderCreateOk()"), rulesH6.indexOf("function storeOrderCreateOk()") + 2800);
  check(orderFnH6.includes("'createdAt', 'state', 'waOptIn']") && orderFnH6.includes("(!keys.hasAny(['waOptIn']) || d.get('waOptIn', false) == true)"),
    "rules (fix 2): the order's exactly-keyed shape gains exactly ONE key — waOptIn — admitted only as exactly true (absent ≡ unticked ≡ no consent)");
  const coH6 = { businessId: "biz-h6", slug: "h6-shop", nowISO: "2026-10-15T10:00:00.000Z" };
  const baseInH6 = { customerName: "Test Customer", phone: "0300-1234567", fulfilment: "pickup", lines: [{ productId: "p1", qty: 2 }] };
  const tickedH6 = storefront.composeStoreOrder({ ...baseInH6, waOptIn: true }, coH6);
  const untickedH6 = storefront.composeStoreOrder({ ...baseInH6 }, coH6);
  const falseH6 = storefront.composeStoreOrder({ ...baseInH6, waOptIn: false }, coH6);
  check(tickedH6 !== null && tickedH6.waOptIn === true && storefront.storeOrderShapeOk(tickedH6) === true &&
        untickedH6 !== null && !("waOptIn" in untickedH6) && storefront.storeOrderShapeOk(untickedH6) === true &&
        falseH6 !== null && !("waOptIn" in falseH6),
    "consent (fix 2): the composer stamps waOptIn ONLY from an explicit true — unticked and false both compose the key ABSENT (≡ no consent)");
  check(storefront.storeOrderShapeOk({ ...untickedH6, waOptIn: false }) === false &&
        storefront.storeOrderShapeOk({ ...untickedH6, waOptIn: "yes" }) === false &&
        storefront.storeOrderShapeOk({ ...untickedH6, waOptIn: 1 }) === false,
    "consent (fix 2): the shape mirror rejects every non-true waOptIn — false, a string, a number (the rules guard's twin, both clients)");
  const provH6 = readSrcH6("web/components/StoreProvider.tsx");
  check(provH6.includes("order.waOptIn === true") && provH6.includes('waConsentPatch("storefront", true, nowISO)') && !provH6.includes("opts?.waOptIn"),
    "consent (fix 2): conversion stamps consent (source \"storefront\") from the ORDER's flag alone, in the conversion batch — the desk-toggle plumbing (opts) is gone from the provider");
  const pubH6 = readSrcH6("web/components/StorefrontPublicView.tsx");
  check(pubH6.includes('t("shop.consentLabel")') && pubH6.includes("waOptIn: waConsent"),
    "consent (fix 2): the public checkout form carries the customer's OWN tick (shop.consentLabel) and composes it onto the order — the demo preview still never writes");
  const viewH6 = readSrcH6("web/components/StorefrontView.tsx");
  check(viewH6.includes("order.waOptIn === true") && !viewH6.includes("setWaOptIn"),
    "consent (fix 2): the desk inbox only DISPLAYS the customer's tick (a badge when the order carries it) — its capture checkbox is removed");
  check(typeof i18n.en["shop.consentLabel"] === "string" && i18n.en["shop.consentLabel"].length > 0 &&
        i18n.ur["shop.consentLabel"].length > 0 && i18n.ps["shop.consentLabel"].length > 0 && i18n.fa["shop.consentLabel"].length > 0 &&
        i18n.ps["shop.consentLabel"] !== i18n.en["shop.consentLabel"] && i18n.fa["shop.consentLabel"] !== i18n.en["shop.consentLabel"],
    "consent (fix 2): shop.consentLabel exists in all four locales — first-person checkout copy; PS/FA carry it as labelled machine drafts like every PS/FA key (dictionary 3,063)");

  /* ---- fix 3: demo loyalty completeness ---- */
  const frozenH6 = seed.getSeedJournal(seed.getSeedProducts(), seed.getSeedSales(), seed.getSeedPurchases(), seed.getSeedSupplierPayments(), seed.getSeedExpenses(), seed.getSeedCredits());
  check(frozenH6.length === 21 && backup.journalFingerprint(frozenH6) === "e17e5bda19e87de698b0c0a37e923f9b396bc387e2092b2ffbbd7d60d4971168",
    "demo (fix 3): the CLOUD seed is untouched — getSeedJournal still composes exactly the frozen 21 (SHA e17e5bda…); the loyalty story is a separate demo-only getter the seeder never calls");
  const demoH6 = [...frozenH6, ...seed.getDemoLoyaltyEntries(seed.getSeedCustomers())];
  const demoSettingsH6 = loyalty.resolveLoyaltySettings(seed.getDemoSettings());
  const nowH6 = new Date().toISOString();
  const tbH6 = reports.trialBalance(demoH6, { from: "2000-01-01", to: "2100-12-31" });
  check(demoH6.length === 29 && demoH6.every((e) => ledger.entryBalances(e)) && tbH6.totalDebits === tbH6.totalCredits,
    "demo (fix 3): the demo journal is the frozen 21 + 8 loyalty entries (4 bills + 4 earns composed by the REAL earn composer) — every entry balances, TB 0");
  const cu1H6 = loyalty.customerLoyalty(demoH6, "cu-1", demoSettingsH6, nowH6);
  const cu2H6 = loyalty.customerLoyalty(demoH6, "cu-2", demoSettingsH6, nowH6);
  const totalsH6 = loyalty.loyaltyProgrammeTotals(demoH6, nowH6);
  check(cu1H6.points === 70 && cu1H6.rupees === 70 && cu2H6.points === 250 && cu2H6.rupees === 250 &&
        totalsH6.liabilityRs === 320 && ledger.accountBalance(demoH6, "loyalty_payable") === -320,
    "demo (fix 3): the story lands as told — cu-1 holds 70 pts / Rs 70 (200 earned − 150 redeemed + 20 earned), cu-2 holds 250 / Rs 250, and the programme liability is Rs 320 in the fold AND the GL");
  check(demoSettingsH6.enabled === true && loyalty.resolveLoyaltySettings(seed.getSeedSettings()).enabled === false,
    "demo (fix 3): the programme is ON in the demo settings only (getDemoSettings) — the production seed's absent loyalty block still resolves OFF, and the demo stays hermetic (local state, no writes leave it)");

  /* ---- fix 4: day-close fixture + exporter determinism ---- */
  const h6fxH6 = JSON.parse(readSrcH6("harness/fixtures/h6-core.json"));
  check(JSON.stringify(ledger.dayCloseSummary(h6fxH6.inputs)) === JSON.stringify(h6fxH6.expected),
    "day-close (fix 4): the h6 fixture's expected block IS the web derivation over its crafted inputs — cheque/points parts, voided + held bills, a credit part, a counter sale, cheque expense/repayment/supplier rows and a reversal all exercised (the Dart port is pinned to the same fixture by h6_fixtures_test.dart)");
  const h2fxH6 = JSON.parse(readSrcH6("harness/fixtures/h2-core.json"));
  check(h2fxH6.fyCloseCase.entry.id === "h2-e21" && h2fxH6.steps.find((s) => s.name === "fy-close").appended[0].id === "h2-e21",
    "exporters (fix 4): h2's FY-close case and its walk now carry the SAME stamped id (h2-e21) — the wall-clock id the H4 incident recovered by search (j-mvks8hhtl) is gone BY CONSTRUCTION (stamp before capture)");
  check(crypto.createHash("md5").update(readSrcH6("harness/fixtures/h2-core.json")).digest("hex") === "9fd58f6dc0bf285d29e995bd06473be1" &&
        crypto.createHash("md5").update(readSrcH6("harness/fixtures/g6-core.json")).digest("hex") === "22194673de3f6d3120501ae32a20bb2b" &&
        crypto.createHash("md5").update(readSrcH6("harness/fixtures/h6-core.json")).digest("hex") === "15e612822a4a399bce89a5317ff22a4c",
    "exporters (fix 4): the re-baselined fixtures are pinned — h2 md5 9fd58f6d… (one field: the stamped close id), g6 md5 22194673… (the current assemble shape: H3 slice + WA collections, zero value changes), h6 md5 15e61282…; seed timestamps in g6/h2 are pinned to the 2026-10-23 fixture epoch so re-export is byte-stable on any day");
  const ciH6 = readSrcH6(".github/workflows/app-ci.yml");
  check(ciH6.includes("fixtures-export-g6.js") && ciH6.includes("fixtures-export-h2.js") && ciH6.includes("fixtures-export-h6.js"),
    "exporters (fix 4): the CI freshness gate's membership is DELIBERATE — g6 + h2 + h6 exporters join f1–f5/g5/h4/h5 in it (the gate comment + this audit record why they were excluded until determinism was fixed)");
}


/* ============================== FR1 ============================== */
/* Fix Round 1 — the five findings of the owner's live test of
 * 2026-10-24 (report: your_files/dukaan-ai-live-test-report-
 * 2026-10-24.md). Every check reproduces the LIVE failure shape
 * first (the pre-fix derivation, computed inline, disagrees) and
 * then the fixed derivation. Root causes in PRODUCTION.md. */
suite("FR1", null);
{
  const readFR1 = (p) => fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/" + p, "utf8");
  const storeSrcFR1 = readFR1("web/components/StoreProvider.tsx");
  const ALL_RANGE = {
    fromDate: "2000-01-01", toDate: "2100-12-31",
    fromTs: "2000-01-01T00:00:00.000Z", toTs: "2100-01-01T00:00:00.000Z",
  };

  /* ---- F1: the cloud settings parse dropped the loyalty block ----
   * The live shop's owner doc is Phase-C-era shaped; the loyalty
   * block the Settings save merges onto it is exactly what
   * `updateSettings` writes. The pre-fix store rebuilt settings
   * from the snapshot through a hand-maintained field list that
   * never included `loyalty` (nor raast/storefront/whatsapp/
   * slug), so the resolver read absence as OFF forever. */
  const legacyDocFR1 = {
    shopName: "Madina General Store",
    address: "Main Bazaar Road, Near Jamia Masjid",
    phone: "0301-2345678",
    staffEmails: ["helper@example.com"],
    staff: [{ email: "Helper@Example.com", role: "cashier", addedAt: "2026-03-01T00:00:00.000Z" }],
    defaultSalesTaxSlabId: null,
    defaultPurchaseTaxSlabId: null,
    fiscalYearStartMonth: 7,
    fiscalYearStartDay: 1,
    lockedThrough: "",
    phaseA: { rbacV1: true },
    phaseC: { stockV1: true },
    phaseD: { hrV1: true },
    docSeries: { bill: "B-" },
    jobStages: ["Received", "Done"],
    printDesign: { accent: "#0f766e" },
    shopNameAlt: "مدینہ جنرل اسٹور",
    loyalty: { enabled: true, earnRsPerPointBase: 50, pointValueRs: 1, redeemCapPct: 40 },
    raastIban: "PK36MEZN0001234567890123",
    raastFiName: "Meezan Bank",
    storefront: { published: true, heroTitle: "Madina" },
    storefrontSlug: "madina-general",
    whatsapp: { serviceIntervalDays: 90 },
  };
  const parsedFR1 = settingsLib.settingsFromOwnerDoc(legacyDocFR1);
  const resolvedFR1 = loyalty.resolveLoyaltySettings(parsedFR1);
  check(parsedFR1.loyalty && parsedFR1.loyalty.enabled === true &&
        resolvedFR1.enabled === true && resolvedFR1.earnRsPerPointBase === 50 &&
        resolvedFR1.redeemCapPct === 40,
    "F1: a legacy-shaped owner doc's saved loyalty block survives the settings parse — the resolver reads the programme ON with the owner's own terms (the live shop's toggle reverted because this parse dropped the field, not because the write failed)");
  check(parsedFR1.raastIban === "PK36MEZN0001234567890123" && parsedFR1.raastFiName === "Meezan Bank" &&
        parsedFR1.storefrontSlug === "madina-general" &&
        parsedFR1.storefront && parsedFR1.storefront.published === true &&
        parsedFR1.whatsapp && parsedFR1.whatsapp.serviceIntervalDays === 90,
    "F1: the same dropped families all survive now — the Raast pair, the storefront block + slug, and the WhatsApp block were lost by the same inline whitelist");
  const bareFR1 = settingsLib.settingsFromOwnerDoc({ shopName: "X" });
  check(bareFR1.loyalty === undefined &&
        loyalty.resolveLoyaltySettings(bareFR1).enabled === false &&
        bareFR1.shopName === "X" && bareFR1.lockedThrough === "",
    "F1: a doc WITHOUT the blocks still parses to absence ⇒ the resolver's defaults (programme OFF until the owner switches it on) — the fix invents nothing");
  const staffFR1 = settingsLib.parseStaff([
    { email: "  A@B.COM ", role: "cashier", addedAt: "t1" },
    { email: "a@b.com", role: "owner", addedAt: "t2" },
    { email: "c@d.com", role: "bogus", addedAt: "t3" },
    { email: "", role: "cashier" },
  ]);
  check(staffFR1.length === 2 && staffFR1[0].email === "a@b.com" && staffFR1[0].role === "cashier" &&
        staffFR1[1].role === "manager",
    "F1: parseStaff (moved with the parse into lib/settings) still trims/lowercases, dedupes, and resolves unknown roles to the legacy default");
  check(storeSrcFR1.includes("settingsFromOwnerDoc(snap.data() ?? {})") &&
        storeSrcFR1.includes('from "@/lib/settings"') &&
        !storeSrcFR1.includes("(d.defaultSalesTaxSlabId as string | null)"),
    "F1 source: the store's snapshot handler calls lib/settings' parse — the inline field-by-field rebuild (the bug) is gone, so a future settings family cannot be dropped by a forgotten list again");

  /* ---- F4: receivables aging ignored credit-note reversals ----
   * The live sequence: pre-existing udhaar 5,500; a Rs 300 bill on
   * credit; Rs 100 repaid; a Rs 150 credit note. Finance said
   * 5,550 (signed subledger — right); aging said 5,700 (its FIFO
   * skipped the negative reversal row entirely). */
  const crFR1 = (id, customerId, kind, amount, billId, dayOffset) => ({
    id, customerId, customerName: customerId, customerPhone: "", kind, amount,
    method: "cash", accountId: null, voucherNo: null, note: "", billId, dayOffset,
    ts: "2026-10-24T05:00:00.000Z",
  });
  const creditsFR1 = [
    crFR1("fr1-c1", "fr1-cust-1", "credit", 5500, "fr1-bill-old", 70),
    crFR1("fr1-c2", "fr1-cust-1", "credit", 300, "fr1-bill-test", 0),
    crFR1("fr1-c3", "fr1-cust-1", "repayment", 100, null, 0),
    crFR1("fr1-c4", "fr1-cust-1", "credit", -150, "fr1-bill-test", 0),
    crFR1("fr1-c5", "fr1-cust-2", "credit", 200, "fr1-bill-a", 45),
    crFR1("fr1-c6", "fr1-cust-2", "credit", 400, "fr1-bill-b", 10),
    crFR1("fr1-c7", "fr1-cust-2", "credit", -50, "fr1-bill-b", 0),
    crFR1("fr1-c8", "fr1-cust-2", "repayment", 150, null, 0),
  ];
  const agingFR1 = ledger.receivablesAging(creditsFR1);
  check(eq(agingFR1.total, 5950) && eq(agingFR1.old, 5400) && eq(agingFR1.mid, 50) && eq(agingFR1.current, 500),
    "F4: the live scenario ages correctly — cust-1: 5,500 − 100 repaid = 5,400 in the >60d bucket + the test bill's 300 − 150 CN = 150 current; cust-2: 50 in the 31–60d bucket + 350 current; total 5,950 (pre-fix aging reported cust-1 alone at 5,700)");
  const sumOutstandingFR1 = ["fr1-cust-1", "fr1-cust-2"]
    .map((k) => Math.max(0, ledger.customerOutstanding(creditsFR1, k)))
    .reduce((a, b) => a + b, 0);
  check(eq(agingFR1.total, sumOutstandingFR1),
    "F4: the aging total equals Σ positive customerOutstanding by construction — aging and Finance can never disagree again");
  const billStubFR1 = (id, customerId) => ({ id, customerId, customerName: customerId, customerPhone: "" });
  check(eq(ledger.billCreditOutstanding(creditsFR1, billStubFR1("fr1-bill-test", "fr1-cust-1")).outstanding, 150) &&
        eq(ledger.billCreditOutstanding(creditsFR1, billStubFR1("fr1-bill-b", "fr1-cust-2")).outstanding, 350),
    "F4: the per-bill outstanding (the lot model aging now shares) nets each reversal against its OWN bill — the CN reduced bill-test to 150, bill-b to 350");
  const udh1FR1 = whatsapp.customerUdhaarPosition(creditsFR1, "fr1-cust-1");
  const udh2FR1 = whatsapp.customerUdhaarPosition(creditsFR1, "fr1-cust-2");
  check(eq(udh1FR1.outstanding, 5550) && udh1FR1.oldestAgeDays === 70 &&
        eq(udh2FR1.outstanding, 400) && udh2FR1.oldestAgeDays === 45,
    "F4: the WhatsApp udhaar position (which carried its own copy of the same FIFO defect) reads the same lots — and a today's-dated reversal does NOT make its bill younger (bill-b's lot keeps age 10, cust-2's oldest open lot stays 45)");
  const purchasesFR1 = [{ id: "fr1-p1", supplierId: "fr1-sup-1", total: 1000, dayOffset: 70, ts: "2026-08-14T05:00:00.000Z" }];
  const pRetsFR1 = [{ id: "fr1-pr1", purchaseId: "fr1-p1", supplierId: "fr1-sup-1", items: [], payableOffset: 300, refundAmount: 0, method: null, accountId: null, dayOffset: 0, ts: "2026-10-24T05:00:00.000Z" }];
  const paymentsFR1 = [{ id: "fr1-sp1", supplierId: "fr1-sup-1", amount: 200, dayOffset: 0, ts: "2026-10-24T05:00:00.000Z", method: "cash" }];
  const payAgingFR1 = ledger.payablesAging(purchasesFR1, paymentsFR1, pRetsFR1);
  check(eq(payAgingFR1.total, 500) && eq(payAgingFR1.old, 500) &&
        eq(ledger.supplierBalance(purchasesFR1, paymentsFR1, "fr1-sup-1", pRetsFR1), 500),
    "F4 mirror: payables aging already netted debit-note returns per purchase (Phase B4's design) — purchase 1,000 − DN 300 − paid 200 = 500 in the >60d bucket, agreeing with supplierBalance; no change needed and now regression-pinned");

  /* ---- F3: the day close's "today" widened every day ----
   * Root cause: dayOffset is a creation-day stamp (always written
   * 0, never recomputed), so on 24-Oct the live shop's 22-Oct rows
   * still counted as today. The fix derives the effective offset
   * from the row's ts at load (lib/periods dayOffsetForTs). */
  check(periods.dayOffsetForTs("2026-10-22T05:00:00.000Z", "2026-10-24") === 2 &&
        periods.dayOffsetForTs("2026-10-24T05:00:00.000Z", "2026-10-24") === 0 &&
        periods.dayOffsetForTs("2026-10-24T19:30:00.000Z", "2026-10-24") === 0 &&
        periods.dayOffsetForTs("not-a-date", "2026-10-24", 7) === 7,
    "F3: dayOffsetForTs derives whole PKT business days from ts — 22-Oct is 2 on 24-Oct; a post-midnight-PKT stamp floors at 0 (never negative); an unparseable ts keeps the caller's fallback");
  const tillFR1 = accounts.find((a) => a.legacyFor === "cash");
  const L_FR1 = (account, debit, credit) => ({ account, debit, credit });
  const walkRawFR1 = [
    ledger.makeEntry("Sale day 1", "bill", null, [L_FR1("cash", 1000, 0), L_FR1("sales_revenue", 0, 1000)], { ts: "2026-10-22T05:00:00.000Z", dayOffset: 0 }),
    ledger.makeEntry("Sale day 2", "bill", null, [L_FR1("cash", 500, 0), L_FR1("sales_revenue", 0, 500)], { ts: "2026-10-24T05:00:00.000Z", dayOffset: 0 }),
    ledger.makeEntry("Rent day 2", "expense", null, [L_FR1("expense_rent", 200, 0), L_FR1("cash", 0, 200)], { ts: "2026-10-24T06:00:00.000Z", dayOffset: 0 }),
  ];
  const rebaseFR1 = (rows) => rows.map((r) => ({ ...r, dayOffset: periods.dayOffsetForTs(r.ts, "2026-10-24", r.dayOffset) }));
  const walkFR1 = rebaseFR1(walkRawFR1);
  check(ledger.accountDayNet(walkRawFR1, tillFR1, 0) === 1300 &&
        ledger.accountDayNet(walkFR1, tillFR1, 0) === 300 &&
        ledger.moneyAccountBalance(walkFR1, tillFR1) === 1300,
    "F3: with the live shape (every stamp 0) the journal's 'today' net reads 1,300 — two days folded together; after the load re-base it reads exactly day 2's 300, and the till balance is untouched at 1,300");
  const openingFR1 = ledger.moneyAccountBalance(walkFR1, tillFR1) - ledger.accountDayNet(walkFR1, tillFR1, 0);
  const billsRawFR1 = [
    { id: "fr1-b1", billNo: 1, status: "completed", dayOffset: 0, ts: "2026-10-22T05:00:00.000Z", payments: [{ method: "cash", amount: 1000 }] },
    { id: "fr1-b2", billNo: 2, status: "completed", dayOffset: 0, ts: "2026-10-24T05:00:00.000Z", payments: [{ method: "cash", amount: 500 }] },
  ];
  const expRawFR1 = [{ id: "fr1-e1", amount: 200, method: "cash", dayOffset: 0, ts: "2026-10-24T06:00:00.000Z" }];
  const dcArgsFR1 = (bills, exps) => ({
    sales: [], bills, expenses: exps, credits: [], supplierPayments: [],
    returnsRefundCash: 0, cashIn: 0, cashOut: 0, openingCash: openingFR1,
  });
  const dcFixedFR1 = ledger.dayCloseSummary(dcArgsFR1(rebaseFR1(billsRawFR1), rebaseFR1(expRawFR1)));
  const dcBuggyFR1 = ledger.dayCloseSummary(dcArgsFR1(billsRawFR1, expRawFR1));
  check(openingFR1 === 1000 && eq(dcFixedFR1.expectedCash, 1300) &&
        eq(ledger.expectedCloseForAccount(walkFR1, tillFR1, openingFR1), 1300) &&
        eq(dcBuggyFR1.expectedCash, 2300),
    "F3: counter ≡ journal by construction after the re-base — opening 1,000 (pre-today balance, not the old double-counting full balance) + today's 500 − 200 = 1,300 = the journal expectation; the same documents un-rebased overstate 'today' at 2,300 (the live counter-vs-journal gap's mechanism)");
  const closesFR1 = [{ id: "fr1-dc1", dateISO: "2026-10-22", dayOffset: 0, ts: "2026-10-22T15:00:00.000Z" }];
  check(closesFR1.find((d) => d.dateISO === "2026-10-24") === undefined &&
        closesFR1.find((d) => d.dayOffset === 0) !== undefined,
    "F3: a close belongs to its dateISO — the 22-Oct close (stamp frozen at 0) is NOT today's close under the fixed predicate, while the old dayOffset predicate matched it forever");
  const dcViewFR1 = readFR1("web/components/DayCloseView.tsx");
  check((storeSrcFR1.match(/rebaseAges\(/g) || []).length >= 2 && storeSrcFR1.includes("dayOffsetForTs") &&
        dcViewFR1.includes("dateISO === todayPktISO()") && dcViewFR1.includes("dateISO: todayPktISO()") &&
        dcViewFR1.includes("dc.backlog") && dcViewFR1.includes("journalClose.opening"),
    "F3 source: the store re-bases at BOTH load paths (cloud snapshot mapper + local load); the day-close screen matches closes by dateISO, stamps the PKT business date (not the UTC slice), offers the journal-derived pre-today opening, and labels the un-closed backlog");

  /* ---- F2: the Balance Sheet report ----
   * Presentation (stated): point-in-time "as at" the range end;
   * Assets (+ the purchases clearing line, when non-zero) =
   * Liabilities + Equity + the unclosed Result to date. */
  const bsSeedFR1 = fiscal.balanceSheetReport(journal, ALL_RANGE);
  const panelSeedFR1 = new Map(fiscal.balanceSheetBalances(journal, ALL_RANGE.toTs).map((r) => [r.account, r.balance]));
  check(bsSeedFR1.balanced && bsSeedFR1.difference === 0 &&
        eq(bsSeedFR1.totalAssets, bsSeedFR1.totalLiabilitiesEquity),
    "F2: the Balance Sheet balances on the frozen seed journal");
  check(eq(bsSeedFR1.assets.find((r) => r.account === "inventory").balance, 272805) &&
        eq(bsSeedFR1.assets.find((r) => r.account === "cash").balance, 50000) &&
        bsSeedFR1.assets.every((r) => eq(r.balance, panelSeedFR1.get(r.account))) &&
        bsSeedFR1.liabilities.every((r) => eq(r.balance, panelSeedFR1.get(r.account))),
    "F2: the statement's rows ARE the FY panel's balanceSheetBalances figures (inventory 272,805 · cash 50,000 on the seed) — one derivation, two presentations");
  const plRawFR1 = fiscal.plAccountCodes().reduce((a, c) => a + ledger.accountBalance(journal, c), 0);
  check(eq(bsSeedFR1.resultToDate, -plRawFR1),
    "F2: the result-to-date line is exactly the net of the P&L accounts at the same instant (fy_close entries included), so the identity Assets = Liabilities + Equity + Result is the trial balance's zero restated");
  const T_FR1 = (ts) => ({ ts, dayOffset: 0 });
  const walkBSFR1 = [
    ledger.makeEntry("Capital in", "cashbook", null, [L_FR1("cash", 100000, 0), L_FR1("capital", 0, 100000)], T_FR1("2026-02-10T05:00:00.000Z")),
    ledger.makeEntry("Stock bought on credit", "purchase", null, [L_FR1("inventory", 40000, 0), L_FR1("payables", 0, 40000)], T_FR1("2026-02-11T05:00:00.000Z")),
    ledger.makeEntry("Sale", "bill", null, [L_FR1("cash", 25000, 0), L_FR1("sales_revenue", 0, 25000)], T_FR1("2026-02-12T05:00:00.000Z")),
    ledger.makeEntry("COGS", "bill", null, [L_FR1("cogs", 15000, 0), L_FR1("inventory", 0, 15000)], T_FR1("2026-02-12T05:01:00.000Z")),
    ledger.makeEntry("Rent", "expense", null, [L_FR1("expense_rent", 5000, 0), L_FR1("cash", 0, 5000)], T_FR1("2026-02-13T05:00:00.000Z")),
    ledger.makeEntry("Drawings", "cashbook", null, [L_FR1("drawings", 2000, 0), L_FR1("cash", 0, 2000)], T_FR1("2026-02-14T05:00:00.000Z")),
    ledger.makeEntry("Supplier paid", "supplier_payment", null, [L_FR1("payables", 10000, 0), L_FR1("cash", 0, 10000)], T_FR1("2026-02-15T05:00:00.000Z")),
  ];
  const bsWalkFR1 = fiscal.balanceSheetReport(walkBSFR1, ALL_RANGE);
  check(bsWalkFR1.balanced && eq(bsWalkFR1.totalAssets, 133000) &&
        eq(bsWalkFR1.liabilitiesTotal, 30000) && eq(bsWalkFR1.equityTotal, 98000) &&
        eq(bsWalkFR1.resultToDate, 5000) &&
        eq(bsWalkFR1.equity.find((r) => r.account === "drawings").balance, -2000),
    "F2: a trading walk states exactly — assets 133,000 (cash 108,000 + stock 25,000) = payables 30,000 + equity 98,000 (capital 100,000 − drawings 2,000, shown as a negative contribution) + result 5,000");
  const bsClearFR1 = fiscal.balanceSheetReport([
    ...walkBSFR1,
    ledger.makeEntry("Purchase mid-clearing", "purchase", null, [L_FR1("purchases", 8000, 0), L_FR1("payables", 0, 8000)], T_FR1("2026-02-16T05:00:00.000Z")),
  ], ALL_RANGE);
  check(eq(bsClearFR1.clearing, 8000) && eq(bsClearFR1.totalAssets, 141000) && bsClearFR1.balanced,
    "F2: an uncleared purchases balance appears as its own assets-side line and the statement still balances to the paisa (141,000 = 141,000)");
  const fyRangeFR1 = periods.fiscalYearRange({}, "2026-02-10T05:00:00.000Z");
  const closeFR1 = fiscal.buildFiscalClosingEntry(walkBSFR1, fyRangeFR1, "per-fr1-1");
  const bsClosedFR1 = fiscal.balanceSheetReport([...walkBSFR1, closeFR1], ALL_RANGE);
  check(!!closeFR1 && eq(bsClosedFR1.resultToDate, 0) &&
        eq(bsClosedFR1.equity.find((r) => r.account === "retained_earnings").balance, 5000) &&
        eq(bsClosedFR1.totalAssets, 133000) && bsClosedFR1.balanced,
    "F2: after the FY close the result line reads 0 and the year's 5,000 sits in retained earnings — the statement total does not move and it still balances");
  const reportsViewFR1 = readFR1("web/components/ReportsView.tsx");
  check(reportsViewFR1.includes('"balancesheet"') && reportsViewFR1.includes("balanceSheetReport(journal, range)") &&
        typeof fiscal.balanceSheetReport === "function",
    "F2 source: the Balance Sheet is a first-class Reports catalogue entry built on lib/fiscal's balanceSheetReport over the live journal + range");

  /* ---- F5: the opening-stock owner path ----
   * There is NO general manual journal in this app (by design);
   * the minimal correct path is one composed entry: Dr inventory
   * (class-split) / Cr capital — never a P&L account. */
  const productsFR1 = [
    { id: "fr1-p1", name: "Goods", stockQty: 10, costPrice: 1000, salePrice: 1200, stockClass: null },
    { id: "fr1-p2", name: "Raw", stockQty: 5, costPrice: 2000, salePrice: 2600, stockClass: "raw" },
  ];
  const journalGapFR1 = [
    ledger.makeEntry("Bought goods", "purchase", null, [L_FR1("inventory", 4000, 0), L_FR1("payables", 0, 4000)], T_FR1("2026-10-20T05:00:00.000Z")),
    ledger.makeEntry("Bought raw", "purchase", null, [L_FR1("inventory_raw", 12000, 0), L_FR1("payables", 0, 12000)], T_FR1("2026-10-20T05:01:00.000Z")),
  ];
  const gapFR1 = fiscal.openingStockGap(journalGapFR1, productsFR1);
  check(eq(gapFR1.shelf, 20000) && eq(gapFR1.book, 16000) && eq(gapFR1.gap, 4000) && eq(gapFR1.rawGap, 0),
    "F5: the gap is shelf − book on today's figures (20,000 − 16,000 = 4,000), and the raw share clamps at 0 when the raw BOOK already exceeds the raw shelf");
  const entryFR1 = fiscal.buildOpeningStockEntry(gapFR1.gap, gapFR1.rawGap, { ts: "2026-10-24T05:00:00.000Z" });
  check(!!entryFR1 && entryFR1.refType === "opening_stock" && ledger.entryBalances(entryFR1) &&
        entryFR1.lines.length === 2 &&
        entryFR1.lines[0].account === "inventory" && eq(entryFR1.lines[0].debit, 4000) &&
        entryFR1.lines[1].account === "capital" && eq(entryFR1.lines[1].credit, 4000),
    "F5: the opening entry is exactly Dr inventory / Cr capital (capital — the owner's own investment; no P&L account is touched, so no period result is corrupted)");
  check(eq(fiscal.openingStockGap([...journalGapFR1, entryFR1], productsFR1).gap, 0) &&
        fiscal.balanceSheetReport([...journalGapFR1, entryFR1], ALL_RANGE).balanced,
    "F5: after posting, the gap reads 0 and the Balance Sheet still balances — the divergence the FY checklist reports is healed by the entry, not by editing history");
  const gapBFR1 = fiscal.openingStockGap(journalGapFR1.slice(0, 1).concat([
    ledger.makeEntry("Bought raw", "purchase", null, [L_FR1("inventory_raw", 6000, 0), L_FR1("payables", 0, 6000)], T_FR1("2026-10-20T05:01:00.000Z")),
  ]), productsFR1);
  const entryBFR1 = fiscal.buildOpeningStockEntry(gapBFR1.gap, gapBFR1.rawGap, { ts: "2026-10-24T05:00:00.000Z" });
  const lineBFR1 = (a) => entryBFR1.lines.find((l) => l.account === a);
  check(eq(gapBFR1.gap, 10000) && eq(gapBFR1.rawGap, 4000) && entryBFR1.lines.length === 3 &&
        eq(lineBFR1("inventory").debit, 6000) && eq(lineBFR1("inventory_raw").debit, 4000) &&
        eq(lineBFR1("capital").credit, 10000) && ledger.entryBalances(entryBFR1),
    "F5: with a raw shortfall the entry class-splits through the C3 seam — Dr inventory 6,000 + Dr inventory_raw 4,000 / Cr capital 10,000");
  check(fiscal.buildOpeningStockEntry(0, 0) === null && fiscal.buildOpeningStockEntry(-500, 0) === null &&
        eq(fiscal.openingStockGap([...journalGapFR1, entryFR1], productsFR1).gap, 0),
    "F5: no positive gap, no entry — zero/negative amounts compose nothing");
  const rulesFR1 = readFR1("firebase/firestore.rules");
  check(!rulesFR1.includes("opening_stock") && plans.REFTYPE_MIN_TIER.opening_stock === undefined &&
        tally.TALLY_VOUCHER_TYPE_BY_REFTYPE.opening_stock === "Journal",
    "F5: NO rules amendment was needed — opening_stock is unlisted in both tier maps (client + rules mirror), so it rides the Core default exactly like the legacy refTypes; its Tally voucher is a Journal");
  const fyPanelFR1 = readFR1("web/components/FiscalClosePanel.tsx");
  check(fyPanelFR1.includes("openingStockGap") && fyPanelFR1.includes("fin.fy.openStock.action") &&
        fyPanelFR1.includes("postOpeningStock") && storeSrcFR1.includes("buildOpeningStockEntry"),
    "F5 source: the action lives where the owner sees the divergence — the fiscal panel's stock row, offering the live gap through the owner-gated store action that composes in lib/fiscal");
}


suite("FR2", null); // Fix Round 2 — demo opt-in, clear-to-trash, multi-business (the owner's 2026-10-24 redefinition, replacing the 'Start fresh' proposal)
{
  const FR2_NOW = "2026-10-24T07:00:00.000Z";
  const demoDocsFR2 = demoLib.demoSetDocs();
  const demoIdsFR2 = demoLib.demoSetIds();
  const summaryFR2 = demoLib.demoSummary();

  /* ---- FR2·1: the demo set is exactly the live demo seed's figures ---- */
  check(summaryFR2.products === 25 && summaryFR2.customers === 3 &&
        summaryFR2.suppliers === 2 && summaryFR2.salesRows === 347 &&
        summaryFR2.journalEntries === 29 && summaryFR2.stockCost === 272805 &&
        summaryFR2.stockRetail === 303250,
    "FR2 demo: the set the owner is shown before seeding is the live demo seed's own figures — 25 products, 3 customers, 2 suppliers, 347 sale rows, 29 journal entries, stock 272,805 cost / 303,250 retail (the figures the live demo business carries, not a new invented set)");
  check(demoLib.cloudDemoHasGodown() === false &&
        demoDocsFR2.warehouses.length === 1 && demoDocsFR2.warehouses[0].id === "wh-main" &&
        demoDocsFR2.accounts.length === 5 &&
        demoDocsFR2.bills.length === 0 && demoDocsFR2.returns.length === 0 &&
        demoDocsFR2.adjustments.length === 0 && demoDocsFR2.dayCloses.length === 0 &&
        demoDocsFR2.cashEntries.length === 0,
    "FR2 demo: the cloud set carries the Godown nowhere (demo-mode-only flavour, filtered exactly as seedNamespace did) and no bills/returns/adjustments/day-closes/cash-entries — the cloud demo is the sales + journal seed only, plus the 5 structural money accounts and the single default warehouse");
  const seedJournalFR2 = seed.getSeedJournal(
    seed.getSeedProducts(), seed.getSeedSales(), seed.getSeedPurchases(),
    seed.getSeedSupplierPayments(), seed.getSeedExpenses(), seed.getSeedCredits());
  check(demoDocsFR2.journal.length === 29 &&
        demoDocsFR2.journal.slice(0, 21).every((e, i) => e.id === seedJournalFR2[i].id) &&
        demoDocsFR2.journal.filter((e) => e.refType === "loyalty_earn").length === 4 &&
        demoDocsFR2.journal.length - seedJournalFR2.length === 8,
    "FR2 demo: the 29 journal entries are the frozen 21 (ids identical to the seed journal) plus 8 demo entries — 4 loyalty bills + 4 loyalty earns — the demo journal is the frozen seed's journal, extended, never rewritten");

  /* ---- FR2·1: the seed plan — 438 writes against a skeleton, 0 when full ---- */
  {
    const skeletonIds = {
      accounts: new Set(demoDocsFR2.accounts.map((d) => d.id)),
      warehouses: new Set(demoDocsFR2.warehouses.map((d) => d.id)),
    };
    const planSkeleton = demoLib.planDemoSeed(skeletonIds);
    const planCounts = planSkeleton.reduce((acc, w) => {
      acc[w.collection] = (acc[w.collection] || 0) + 1;
      return acc;
    }, {});
    check(planSkeleton.length === 438 && planCounts.products === 25 &&
          planCounts.sales === 347 && planCounts.journal === 29 &&
          planCounts.customers === 3 && planCounts.suppliers === 2 &&
          planCounts.stockLevels === 25 && planCounts.taxSlabs === 1 &&
          planCounts.purchases === 1 && planCounts.supplierPayments === 1 &&
          planCounts.expenses === 2 && planCounts.credits === 2 &&
          !("accounts" in planCounts) && !("warehouses" in planCounts),
      "FR2 demo: against a skeleton (accounts + warehouse already present) the seed plan is exactly 438 writes, and it never rewrites the structural pair — the plan is the demo set minus what is already there, so re-running it over a seeded business writes nothing");
    const fullIds = {};
    for (const [k, v] of Object.entries(demoDocsFR2)) fullIds[k] = new Set(v.map((d) => d.id));
    check(demoLib.planDemoSeed(fullIds).length === 0,
      "FR2 demo: over a fully seeded business the plan is empty — re-add is a no-op unless rows were deleted, never a duplicate seed");
    const added = demoLib.summarizeSeedWrites(planSkeleton);
    const writtenProducts = planSkeleton.filter((w) => w.collection === "products").map((w) => w.data);
    const writtenCost = writtenProducts.reduce((n, pr) => n + (pr.stockQty || 0) * (pr.costPrice || 0), 0);
    const writtenRetail = writtenProducts.reduce((n, pr) => n + (pr.stockQty || 0) * (pr.salePrice || 0), 0);
    check(added.products === 25 && added.journal === 29 && added.sales === 347 &&
          added.customers === 3 && added.suppliers === 2 && added.stockLevels === 25 &&
          writtenCost === 272805 && writtenRetail === 303250,
      "FR2 demo: the post-seed summary is computed from the writes actually committed — per-collection counts plus the written products' stock at cost and retail — and it reproduces the pre-list figures exactly: what the owner was promised is what the store confirms");
  }

  /* ---- FR2·1: classification — content decides, never the flag ---- */
  {
    const idsOnly = (docs) => Object.fromEntries(
      Object.entries(docs).map(([k, v]) => [k, v.map((d) => ({ id: d.id }))]));
    check(demoLib.classifyBusinessContent({}) === "empty" &&
          demoLib.classifyBusinessContent({ accounts: [{ id: "acc-till" }], warehouses: [{ id: "wh-main" }] }) === "empty",
      "FR2 demo: an empty business and a skeleton-only business both classify 'empty' — structural docs are never content, so a fresh business is seedable and a skeleton is not 'real data'");
    check(demoLib.classifyBusinessContent(idsOnly(demoDocsFR2)) === "demo-only",
      "FR2 demo: the full demo set classifies 'demo-only'");
    const minusOne = idsOnly(demoDocsFR2);
    minusOne.products = minusOne.products.slice(0, -1);
    check(demoLib.classifyBusinessContent(minusOne) === "demo-only",
      "FR2 demo: a demo business with one demo row deleted is still 'demo-only' — deletion of demo rows does not turn the business real, so re-add stays available");
    check(demoLib.classifyBusinessContent({ products: [{ id: "p-mh123abc" }] }) === "real" &&
          demoLib.classifyBusinessContent({ ...idsOnly(demoDocsFR2), bills: [{ id: "bill-real-1" }] }) === "real",
      "FR2 demo: one user-created row — timestamp-shaped ids can never equal a demo id — turns the business 'real', and a demo set plus one real bill is 'real': demo seeding is refused there, so demo seed can never mix into a real book");
  }

  /* ---- FR2·2: trash chunking — 400k chars, order-free, corruption-refusing ---- */
  {
    const payload = "x".repeat(900166);
    const chunks = trashLib.chunkBackupJson(payload);
    check(chunks.length === 3 && chunks[0].data.length === 400000 &&
          chunks[1].data.length === 400000 && chunks[2].data.length === 100166,
      "FR2 trash: a 900,166-char backup splits into 3 chunks of at most 400,000 chars — well under the 1 MiB Firestore document limit even for multi-byte text, and the live 154 KB backup fits in ONE chunk");
    check(trashLib.reassembleChunks(chunks) === payload &&
          trashLib.reassembleChunks([...chunks].reverse()) === payload,
      "FR2 trash: reassembly is order-free — document return order is meaningless, the index does the ordering");
    check(trashLib.reassembleChunks([chunks[0], chunks[2]]) === null &&
          trashLib.reassembleChunks(chunks.slice(0, 2), chunks.length) === null &&
          trashLib.reassembleChunks(chunks, chunks.length + 1) === null &&
          trashLib.reassembleChunks([]) === null,
      "FR2 trash: a middle gap, a truncated tail, and a wrong manifest count are all refused as null — the reassembler never hands verifyBackup a spliced file");
  }

  /* ---- FR2·2: trash manifest + expiry — read-time, never a cron ---- */
  {
    const manifest = trashLib.trashManifestFor({
      trashId: "trash-fr2-1",
      backup: { manifest: { businessId: "biz-fr2-1", counts: { products: 2, journal: 1 }, totalDocs: 4, journalCount: 1, journalFingerprint: "aa".repeat(32) } },
      clearedAtISO: FR2_NOW,
      replacedTrashId: null,
    }).manifest;
    check(manifest.businessId === "biz-fr2-1" && manifest.source === "clear" &&
          manifest.clearedAt === FR2_NOW && manifest.expiresAt === "2026-11-23T07:00:00.000Z" &&
          manifest.totalDocs === 4 && manifest.journalCount === 1 &&
          manifest.journalFingerprint === "aa".repeat(32) && manifest.status === "active",
      "FR2 trash: the manifest carries businessId, clearedAt, expiresAt = clearedAt + 30 days exactly, doc counts and the journal fingerprint copied verbatim from the backup manifest — panel and file cannot disagree");
    check(trashLib.trashPanelState(manifest, FR2_NOW) === "active" &&
          trashLib.trashPanelState(manifest, "2026-11-22T07:00:00.000Z") === "active" &&
          trashLib.trashPanelState(manifest, "2026-11-23T07:00:01.000Z") === "expired" &&
          trashLib.trashPanelState({ ...manifest, status: "restored" }, "2026-12-25T07:00:00.000Z") === "restored" &&
          trashLib.trashPanelState({ ...manifest, status: "deleted" }, FR2_NOW) === "deleted",
      "FR2 trash: 'expired' is DERIVED at read time — active at clear and at 29 days, expired 1 second past 30 days, with no cron and no stored flag; restored/deleted come from the stored status and survive past expiry");
    check(trashLib.canRestoreFromTrash(manifest, FR2_NOW) === true &&
          trashLib.canRestoreFromTrash(manifest, "2026-11-23T07:00:01.000Z") === false &&
          trashLib.canRestoreFromTrash({ ...manifest, status: "restored" }, FR2_NOW) === false &&
          trashLib.canRestoreFromTrash({ ...manifest, status: "deleted" }, FR2_NOW) === false,
      "FR2 trash: restore is offered only for an active, unexpired snapshot — expired, restored and deleted snapshots all refuse, so a consumed trash entry is never restorable again");
    check(trashLib.clearReplacesTrash([manifest, { ...manifest, trashId: "old", status: "restored" }]) === manifest &&
          trashLib.clearReplacesTrash([{ ...manifest, status: "restored" }]) === null,
      "FR2 trash: a new clear replaces only an ACTIVE snapshot, and only after the confirm — restored/deleted/expired snapshots are not 'replaced', they are already gone");
  }

  /* ---- FR2·2: clear → trash → restore, end to end over the model ---- */
  {
    const ownerFR2 = { shopName: "Demo Shop", demoState: "seeded" };
    const backupFR2 = backup.assembleBackup({
      businessId: "biz-fr2-demo", exportedAt: FR2_NOW, exportedBy: "web",
      owner: ownerFR2, collections: demoDocsFR2,
      platform: { registry: null, members: [], invites: [], counters: null, stats: null, events: [], payments: [], storefront: null, storeOrders: [] },
    });
    check(backup.verifyBackup(backupFR2).ok === true,
      "FR2 trash: the pre-clear backup verifies before it is ever written to trash — a corrupt snapshot is never stored");
    const trashDoc = trashLib.trashManifestFor({
      trashId: "trash-fr2-demo", backup: backupFR2, clearedAtISO: FR2_NOW, replacedTrashId: null,
    });
    const chunksFR2 = trashLib.chunkBackupJson(JSON.stringify(backupFR2));
    check(trashDoc.manifest.totalDocs === backupFR2.manifest.totalDocs &&
          trashDoc.manifest.journalFingerprint === backupFR2.manifest.journalFingerprint &&
          trashDoc.manifest.chunkCount === chunksFR2.length,
      "FR2 trash: clear→snapshot counts ≡ pre-clear counts — the trash manifest is the backup manifest, not a recount");
    const reassembled = trashLib.reassembleChunks(chunksFR2, trashDoc.manifest.chunkCount);
    const restoredBackup = JSON.parse(reassembled);
    check(backup.verifyBackup(restoredBackup).ok === true &&
          restoredBackup.manifest.journalFingerprint === backupFR2.manifest.journalFingerprint,
      "FR2 trash: the reassembled snapshot verifies and carries the exact pre-clear journal fingerprint — the trash round-trip is lossless");
    const emptied = backup.emptyNamespace();
    const countTenant = (cols) => Object.values(cols).reduce((n, arr) => n + arr.length, 0);
    check(countTenant(emptied.collections) === 0,
      "FR2 trash: the wipe leaves 0 tenant docs in the model — the business is empty, so the restore guard opens");
    const planFR2 = backup.planRestore({
      file: restoredBackup, targetBusinessId: "biz-fr2-demo", target: emptied,
      actorUid: "user-fr2-uid", nowISO: FR2_NOW,
    });
    check(planFR2.ok === true,
      "FR2 trash: restore-from-trash into the emptied business is allowed by the existing pipeline, guard and all");
    const appliedFR2 = backup.applyRestoreWrites(emptied, "biz-fr2-demo", planFR2.writes);
    check(backup.journalFingerprint(appliedFR2.collections.journal) === backupFR2.manifest.journalFingerprint &&
          countTenant(appliedFR2.collections) === backupFR2.manifest.totalDocs - 1,
      "FR2 trash: restore-from-trash into the emptied business reproduces the exact journal fingerprint and the exact tenant doc count — the book comes back entry for entry");
    const nonEmpty = { ...emptied, collections: { ...emptied.collections, products: [{ id: "p-new-1" }] } };
    const refusedFR2 = backup.planRestore({
      file: restoredBackup, targetBusinessId: "biz-fr2-demo", target: nonEmpty,
      actorUid: "user-fr2-uid", nowISO: FR2_NOW,
    });
    check(refusedFR2.ok === false && refusedFR2.reason === "target-not-empty" &&
          refusedFR2.conflicts.length === 1 &&
          refusedFR2.conflicts[0] === "users/biz-fr2-demo/products/p-new-1",
      "FR2 trash: restore into a business that gained new data after clearing is refused by the existing empty-business guard — never merged, the existing refusal stands");
    check(trashLib.canRestoreFromTrash(trashDoc.manifest, "2026-11-23T07:00:01.000Z") === false,
      "FR2 trash: the same snapshot, 30 days later, cannot restore — expiry is a read-time gate on the manifest, not a deletion of the data");
  }

  /* ---- FR2·3: multi-business — the phase plans ---- */
  {
    const nb = { businessId: "biz-fr2-gen-001", ownerUid: "user-fr2-uid", ownerEmail: "o@x.com", name: "Second Shop", phone: "0300-1", address: "Main Road", nowISO: FR2_NOW };
    const p1 = tenancy.planNewBusinessPhase1(nb);
    const reg = p1.find((w) => w.path === "businesses/biz-fr2-gen-001");
    check(reg && reg.data.ownerUid === "user-fr2-uid" && reg.data.plan.planId === "trial" &&
          reg.data.plan.usersLimit === 2 && reg.data.plan.invoiceLimit === 200 &&
          reg.data.enforce === false && reg.data.plan.assignedBy === "signup" &&
          !JSON.stringify(p1).includes("founding") &&
          p1.some((w) => w.collection === "businessEvents" && w.data.kind === "business.created"),
      "FR2 multi: phase 1 births a GENERATED business on Free Trial — ownerUid is the creator's uid (never the business id), limits 2 users / 200 invoices, enforce false, and founding appears nowhere: the founding comp plan is pre-G only, by construction");
    const p2 = tenancy.planNewBusinessPhase2(nb);
    const ctr = p2.find((w) => w.path === "businessCounters/biz-fr2-gen-001");
    const idx = p2.find((w) => w.kind === "index" && w.businessId === "biz-fr2-gen-001");
    check(ctr && ctr.data.invoiceCount === 0 && ctr.data.invoiceMonth === tenancy.pktMonthKey(FR2_NOW) &&
          idx && idx.uid === "user-fr2-uid" && idx.role === "owner" &&
          !p2.some((w) => (w.path ?? "").startsWith("businessMembers/")),
      "FR2 multi: phase 2 zeroes the birth-month counters and writes the creator's switcher index entry with role 'owner' — and writes NO members doc: an owner is never a member of their own business");
    const skel = tenancy.newBusinessSkeleton(nb);
    check(skel.ownerDoc.demoState === "none" && skel.ownerDoc.seedV2 === true &&
          skel.accounts.length === 5 && skel.warehouse.id === "wh-main" &&
          skel.ownerDoc.shopName === "Second Shop" &&
          skel.ownerDoc.phone === "0300-1" && skel.ownerDoc.address === "Main Road" &&
          skel.ownerDoc.lockedThrough === "",
      "FR2 multi: the new-business skeleton is EMPTY content — demoState none, 5 money accounts, the default warehouse, the creation form's name/phone/address, no lock — so a new business starts exactly as item 1 requires");
    check(tenancy.newBusinessInputOk({ name: "Second Shop", phone: "0300-1", address: "Main Road" }) === true &&
          tenancy.newBusinessInputOk({ name: "   ", phone: "", address: "" }) === false &&
          tenancy.newBusinessInputOk({ name: "x".repeat(61), phone: "", address: "" }) === false,
      "FR2 multi: creation input validation — name required, 1–60 chars; phone ≤ 16; address ≤ 200");
  }

  /* ---- FR2·3: healing, switcher ordering, active picking, migration identity ---- */
  {
    const healed = tenancy.healIndex(
      [{ businessId: "biz-fr2-gen-001", role: "owner" }, { businessId: "biz-fr2-gone", role: "manager" }],
      { "biz-fr2-gone": null },
      ["biz-fr2-gen-001"]
    );
    check(healed.kept.length === 1 && healed.kept[0].businessId === "biz-fr2-gen-001" && healed.kept[0].role === "owner" &&
          healed.dropped.length === 1 && healed.dropped[0] === "biz-fr2-gone",
      "FR2 multi: healing keeps an owner-owned business even though it has no membership doc — without this carve-out every additionally-owned business would vanish on the next sign-in");
    const list = tenancy.buildSwitcherList({
      own: { businessId: "user-fr2-uid", name: "First Shop" },
      entries: [
        { businessId: "biz-fr2-gen-001", role: "owner", own: true },
        { businessId: "biz-fr2-member", role: "manager" },
      ],
      names: { "biz-fr2-gen-001": "Second Shop", "biz-fr2-member": "A Shop" },
    });
    check(list.length === 3 && list[0].businessId === "user-fr2-uid" && list[0].own === true &&
          list[1].businessId === "biz-fr2-gen-001" && list[1].own === true &&
          list[2].businessId === "biz-fr2-member" && list[2].own === false,
      "FR2 multi: the switcher lists the uid-shaped own business first, then other owned businesses, then member businesses — the owner's live business stays business #1 in the list");
    check(tenancy.pickActiveBusiness(list, ["biz-fr2-member", "biz-fr2-gen-001"])?.businessId === "biz-fr2-member" &&
          tenancy.pickActiveBusiness(list, ["biz-fr2-gone"]) === null,
      "FR2 multi: active picking honours the first candidate present in the list; an absent candidate falls back to list[0] — the caller's decision, never a guess");
    const mig = tenancy.planMigration({
      ownerUid: "user-fr2-uid", ownerEmail: "o@x.com", shopName: "First Shop",
      phone: "0300-1", staffEmails: [], registryExists: false, bills: [], sales: [],
      nowISO: FR2_NOW,
    });
    const migReg = mig.find((w) => w.path === "businesses/user-fr2-uid");
    check(migReg && migReg.data.plan.planId === "founding" &&
          mig.some((w) => w.path === "businessCounters/user-fr2-uid"),
      "FR2 multi: the legacy migration path is unchanged — a pre-G business still births at businesses/{uid} on the founding comp plan, so the owner's live business (aVmi6MiyvgTgw9QwnqCcaiCaqBq2) keeps working untouched as business #1 with no data move and no re-keying");
  }

  /* ---- FR2 rules v11: additive delta, strip-proof back to v10 ---- */
  {
    const rulesFR2 = fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8");
    const stripped = stripFR2Blocks(rulesFR2);
    check(backup.sha256Hex(stripped) === "f10b2ee07ceb0c5a583f3762fa021222fb1a9a90832bf566956ae157372220ba",
      "FR2 rules: stripping the FR2 spans returns the v10 FINAL text byte-for-byte (SHA f10b2ee0…) — the v11 delta is purely additive, nothing else in the file moved");
    check(backup.sha256Hex(stripBizCreateFixBlocks(rulesFR2)) === "0f19f56e5da1d36840767468da71550105be65786a0939566115b19be4b40e70" &&
          stripBizCreateFixBlocks(rulesFR2).split("\n").length === 1670,
      "FR2 rules: v11 is 1,670 lines (JS split count), SHA 0f19f56e… (BizCreateFix same-check amendment: the v11 pin now runs over the v12-stripped file — v12 minus its two spans IS v11, proven in the BizCreateFix suite) — the deploy re-paste is REQUIRED (unlike FR1, where rules were unchanged)");
    check(rulesFR2.includes("isRegistryOwner(uid)") && rulesFR2.includes("isBusinessOwner(uid)") &&
          rulesFR2.includes("isClearWindow(uid)") && rulesFR2.includes("match /businessTrash/") &&
          rulesFR2.includes("businessBirthOk(businessId)") &&
          rulesFR2.includes("ownerUid == request.auth.uid") &&
          rulesFR2.includes("isPlatformAdmin()"),
      "FR2 rules: the new helpers exist — registry-owner, business-owner (uid match OR registry leg), and the clear window — and the trash block is owner-only");
    const trashBlock = rulesFR2.slice(rulesFR2.indexOf("match /businessTrash/"));
    const trashEnd = trashBlock.indexOf("match /{document=**}");
    check(trashBlock.slice(0, trashEnd).includes("isBusinessOwner(businessId)") &&
          !trashBlock.slice(0, trashEnd).includes("isPlatformAdmin"),
      "FR2 rules: the /platform console gains NO leg into trash — the super-admin rule (no leg into any tenant namespace) holds for the trash area too");
    const tenantRegion = rulesFR2.slice(
      rulesFR2.indexOf("match /users/{uid}"),
      rulesFR2.indexOf("// ---- Phase G · G1: platform collections (START)"));
    const countOcc = (text, line) => text.split(line).length - 1;
    check(countOcc(tenantRegion, "allow update, delete: if isBusinessOwner(uid);") === 4 &&
          countOcc(tenantRegion, "allow delete: if isBusinessOwner(uid);") === 5 &&
          countOcc(tenantRegion, "allow create, update, delete: if isBusinessOwner(uid);") === 1 &&
          tenantRegion.includes("match /taxSlabs/{slabId} {\n        allow read: if canAccess(uid);\n        allow write: if isBusinessOwner(uid);") &&
          tenantRegion.includes("match /periods/{periodId} {\n        allow read: if canAccess(uid);\n        allow write: if isBusinessOwner(uid);") &&
          countOcc(tenantRegion, "allow delete: if isOwner(uid);") === 0 &&
          countOcc(tenantRegion, "allow update, delete: if isOwner(uid);") === 0,
      "FR2 rules: the 12 bare-isOwner legs in the tenant region are widened to isBusinessOwner — returns/dayCloses/notes/purchaseReturns (update+delete), cheques/warehouses/stockLevels/payrollRuns/loans (delete), branding (create/update/delete), taxSlabs + periods (write) — and NO bare-isOwner delete/update leg remains there: a generated business's owner deletes exactly as a legacy owner does, which clear-to-trash on a generated business depends on (staff gain nothing: isBusinessOwner is uid match OR registry leg)");
  }

  /* ---- FR2 i18n: 59 new keys, four-locale parity ---- */
  {
    const prefixCount = (dict, p) => Object.keys(dict).filter((k) => k.startsWith(p)).length;
    check(prefixCount(i18n.en, "demo.") === 20 && prefixCount(i18n.en, "trash.") === 26 &&
          ["biz.newBusiness", "biz.createTitle", "biz.createBody", "biz.nameLabel", "biz.namePlaceholder",
           "biz.phoneLabel", "biz.addressLabel", "biz.createButton", "biz.created", "biz.createFailed",
           "biz.setupIncomplete", "biz.retrySetup", "biz.activeBusiness"].every((k) => k in i18n.en),
      "FR2 i18n: 20 demo + 26 trash + 13 business keys — the FR2 growth is exactly the three new surfaces, nothing else");
    check(["ur", "ps", "fa"].every((l) =>
          prefixCount(i18n[l], "demo.") === 20 && prefixCount(i18n[l], "trash.") === 26 &&
          ["biz.newBusiness", "biz.createTitle", "biz.createBody", "biz.nameLabel", "biz.namePlaceholder",
           "biz.phoneLabel", "biz.addressLabel", "biz.createButton", "biz.created", "biz.createFailed",
           "biz.setupIncomplete", "biz.retrySetup", "biz.activeBusiness"].every((k) => k in i18n[l])),
      "FR2 i18n: the same 59 keys exist in UR, PS and FA — PS/FA are machine drafts, 0 reviewed, exactly as the FR1/Phase H rule requires");
  }

  /* ---- FR2 client wiring: source checks (the harness cannot run
   * React, so it pins the wiring textually — the same FR1 pattern:
   * the new code paths must be present, and the old silent paths
   * must be gone) ---- */
  {
    const readFR2 = (p) => fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/" + p, "utf8");
    const storeFR2 = readFR2("web/components/StoreProvider.tsx");
    const authFR2 = readFR2("web/components/AuthProvider.tsx");
    const switcherFR2 = readFR2("web/components/BusinessSwitcher.tsx");
    const dashFR2 = readFR2("web/components/Dashboard.tsx");
    const settingsFR2 = readFR2("web/components/SettingsView.tsx");
    const backupFR2 = readFR2("web/components/BackupPanel.tsx");
    const platDataFR2 = readFR2("web/components/PlatformData.tsx");
    const platLibFR2 = readFR2("web/lib/platform.ts");
    const platConsoleFR2 = readFR2("web/components/PlatformConsole.tsx");
    const platDetailFR2 = readFR2("web/components/PlatformDetail.tsx");
    const platPayFR2 = readFR2("web/components/PlatformPayments.tsx");
    const demoModalFR2 = readFR2("web/components/DemoDataModal.tsx");

    /* Item 1 — auto-seeding is gone; the new branch creates EMPTY. */
    check(!storeFR2.includes("seedNamespace(db, uid") &&
          storeFR2.includes("createEmptyNamespace") &&
          storeFR2.includes("seedDemoCollections") &&
          storeFR2.includes("demoState: \"seeded\""),
      "FR2 wiring (item 1): StoreProvider no longer calls seedNamespace on the brand-new-owner path — it creates an EMPTY namespace (skeleton only) and seeds demo data only through the explicit seedDemoCollections action, which marks demoState seeded");
    check(storeFR2.includes("demoClass") && storeFR2.includes("addDemoData") &&
          storeFR2.includes("resetDemoData") && storeFR2.includes("classFromIds") &&
          storeFR2.includes("summaryFromWrites"),
      "FR2 wiring (item 1): the store exposes demoClass + addDemoData + resetDemoData, re-classifies from fresh reads before writing, and returns the summary confirmed from the writes committed");
    check(dashFR2.includes("DemoDataModal") && dashFR2.includes("demo.addButton") &&
          dashFR2.includes("demo.reAddButton") && dashFR2.includes("demoClass") &&
          dashFR2.includes("mode === \"demo\"") &&
          settingsFR2.includes("DemoDataModal") && settingsFR2.includes("demo.addButton"),
      "FR2 wiring (item 1): Dashboard and Settings both offer the demo actions through the shared DemoDataModal, gated on demoClass (empty → add, demo-only → re-add, real → hidden); the Dashboard's demo-mode branch keeps its legacy showroom reset, but the production footer button is state-aware, not the old unconditional reset");
    check(demoModalFR2.includes("requirePin") && demoModalFR2.includes("demo.addButton") &&
          demoModalFR2.includes("demo.reAddButton") && demoModalFR2.includes("demoSummary()") &&
          demoModalFR2.includes("demo.addedBody"),
      "FR2 wiring (item 1): the demo modal PIN-challenges with the action's own label key, shows the pre-list from the pure demoSummary() generator, and the post-seed summary from the action's result — never from live counts");

    /* Item 2 — clear-to-trash + trash panel wiring. */
    check(storeFR2.includes("clearBusinessData") && storeFR2.includes("listTrash") &&
          storeFR2.includes("restoreFromTrash") && storeFR2.includes("deleteTrashPermanently") &&
          storeFR2.includes("businessTrash") && storeFR2.includes("clearing: now") &&
          storeFR2.includes("clearing: deleteField()"),
      "FR2 wiring (item 2): the store exposes clearBusinessData + listTrash + restoreFromTrash + deleteTrashPermanently, snapshots under businessTrash, and opens/closes the rules clear window (clearing flag set before the wipe, cleared in a finally so a half-failed wipe never strands it open)");
    check(settingsFR2.includes("trash.clearButton") && settingsFR2.includes("trash.typeLabel") &&
          settingsFR2.includes("trash.replaceWarning") && settingsFR2.includes("CLEAR") &&
          settingsFR2.includes("trash.storefrontNote") && settingsFR2.includes("trash.sweepNote") &&
          settingsFR2.includes("requirePin(\"trash.clearButton\")"),
      "FR2 wiring (item 2): Settings carries the production danger zone — type-CLEAR confirm, PIN challenge on the Clear button, replace warning, and the storefront/sweep notes");
    check(backupFR2.includes("trash.title") && backupFR2.includes("listTrash") &&
          backupFR2.includes("restoreFromTrash") && backupFR2.includes("deleteTrashPermanently") &&
          backupFR2.includes("trash.restoreRefused") && backupFR2.includes("trash.restoreExpired") &&
          backupFR2.includes("trashPanelState"),
      "FR2 wiring (item 2): BackupPanel carries the trash panel — list (which sweeps expired lazily), restore with the guard-refusal and expired messages, delete-permanently, and read-time state derivation");

    /* Item 3 — multi-business creation + switcher + platform fix. */
    check(authFR2.includes("createBusiness") && authFR2.includes("planNewBusinessPhase1") &&
          authFR2.includes("planNewBusinessPhase2") && authFR2.includes("newBusinessInputOk") &&
          authFR2.includes("serverActive") && authFR2.includes("activeBusinessId") &&
          authFR2.includes("{ activeBusinessId: businessId }"),
      "FR2 wiring (item 3): AuthProvider exposes createBusiness (phase-1 registry + phase-2 counters/index, skeleton last with a setup-failed retry path) and persists the active business server-side in userMemberships as well as device-locally");
    check(switcherFR2.includes("biz.newBusiness") && switcherFR2.includes("biz.createTitle") &&
          switcherFR2.includes("biz.retrySetup") && switcherFR2.includes("retryBusinessSetup") &&
          switcherFR2.includes("businesses.some((b) => b.own)"),
      "FR2 wiring (item 3): the header switcher (NOT the sidebar) lists owned/member businesses, offers New business to owners, and a retry row when a generated business's skeleton never landed");
    check(platDataFR2.includes("businessId: docId") && platDataFR2.includes("normRegistry(d.id,") &&
          platLibFR2.includes("consoleBusinessId") &&
          platLibFR2.includes("businessId: consoleBusinessId(registry)") &&
          platLibFR2.includes("countersById[consoleBusinessId(b)]") &&
          platConsoleFR2.includes("consoleBusinessId(b)") &&
          platDetailFR2.includes("const bid = consoleBusinessId(business)") &&
          platPayFR2.includes("consoleBusinessId(b) === p.businessId"),
      "FR2 wiring (item 3): the /platform console keys businesses by registry doc id (consoleBusinessId, ownerUid fallback for legacy fixtures) — directory, aggregates, payment guard, selection, detail acts and payment matching — so two businesses of one owner list and act independently instead of collapsing onto the creator uid");
    check(platLibFR2.includes("CONSOLE_READ_COLLECTIONS") &&
          !platLibFR2.includes("businessTrash"),
      "FR2 wiring (item 3): the platform console's closed read list is untouched by trash — no leg into any tenant namespace, trash included");
  }
}

suite("BizCreateFix", null); // Business-creation fix — the FR2 birth path's Timestamp seam + the skeleton accounts leg (rules v12)
{
  const rulesV12 = fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8");
  check(backup.sha256Hex(stripBizCreateFixBlocks(rulesV12)) === "0f19f56e5da1d36840767468da71550105be65786a0939566115b19be4b40e70" &&
        stripBizCreateFixBlocks(rulesV12).split("\n").length === 1670,
    "BizCreateFix rules: stripping the two v12 spans returns the v11 FINAL text byte-for-byte (SHA 0f19f56e…, 1,670 lines) — the v12 delta is purely additive, nothing else in the file moved");
  check(backup.sha256Hex(rulesV12) === "8b58c1d2357905cc91fbc9979de3ca6f6324a24aa3241c521439e9bba33336c0" &&
        rulesV12.split("\n").length === 1688,
    "BizCreateFix rules: v12 is 1,688 lines (JS split count), SHA 8b58c1d2… — the deploy re-paste + PUBLISH is REQUIRED (rules changed)");
  check(rulesV12.includes("// ---- BizCreateFix · v12 header note (START) ----") &&
        rulesV12.includes("match /accounts/{accountId} {\n        allow read: if canAccess(uid);\n        allow create, update: if isOwner(uid);\n        // ---- BizCreateFix · v12 amendment (accounts) (START) ----\n        allow create, update: if isRegistryOwner(uid);\n        // ---- BizCreateFix · v12 amendment (accounts) (END) ----"),
    "BizCreateFix rules: the v12 header note and the accounts isRegistryOwner leg exist in the accounts block alongside (not instead of) the isOwner leg");
  const readBiz = (p) => fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/" + p, "utf8");
  const authBiz = readBiz("web/components/AuthProvider.tsx");
  check(authBiz.includes("platformRegistryWriteData") &&
        authBiz.includes("Timestamp.fromDate(new Date(plan.trialEndsAt))") &&
        authBiz.includes("platformRegistryWriteData(w.path, w.data)") &&
        authBiz.includes("path.startsWith(\"businesses/\")"),
    "BizCreateFix wiring (textual pin — the harness cannot run React, so the wiring is pinned textually, the FR2 precedent): applyPlatformWrites converts plan.trialEndsAt string → Timestamp on businesses/ set ops only");
}

(async () => {
  const nodeSubtle = crypto.webcrypto.subtle;
  const hexOf = (u8) => [...u8].map((b) => b.toString(16).padStart(2, "0")).join("");
  const fakeStorage = () => {
    const map = new Map();
    const touched = [];
    return {
      map,
      touched,
      getItem: (k) => { touched.push(k); return map.has(k) ? map.get(k) : null; },
      setItem: (k, v) => { touched.push(k); map.set(k, String(v)); },
      removeItem: (k) => { touched.push(k); map.delete(k); },
    };
  };

  suite("E4", null); // Phase E · E4 — PIN lock: PBKDF2 core, device-local storage, friction + idle state machines (design §4)

  /* ---- PBKDF2 known-answer vectors, through the app's own code ---- */
  const katSalt = new TextEncoder().encode("salt");
  check(hexOf(await pinlock.derivePinBits("password", katSalt, 1, nodeSubtle)) ===
      "120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b",
    "KAT: PBKDF2-HMAC-SHA256 (RFC 7914 §11) c=1 matches through lib/pinlock.derivePinBits — the production code path, not a re-implementation");
  check(hexOf(await pinlock.derivePinBits("password", katSalt, 2, nodeSubtle)) ===
      "ae4d0c95af6b46d32d0adff928f06dd02a303f8ef3c251dfd6e2d85a95474c43",
    "KAT: PBKDF2-HMAC-SHA256 c=2 matches");
  check(hexOf(await pinlock.derivePinBits("password", katSalt, 4096, nodeSubtle)) ===
      "c5e478d59288c841aa530db6845c4c8d962893a001ce4e11a4963873aa98134a",
    "KAT: PBKDF2-HMAC-SHA256 c=4096 matches");

  /* ---- create / record shape (§4.2) ---- */
  const rngA = (n) => new Uint8Array(Array.from({ length: n }, (_, i) => i + 1));
  const rngB = (n) => new Uint8Array(Array.from({ length: n }, (_, i) => 200 - i));
  const fixedNow = () => new Date("2026-10-22T00:00:00.000Z");
  const rec = await pinlock.createPinRecord("97531", { subtle: nodeSubtle, randomBytes: rngA, now: fixedNow });
  check(rec.v === 1 && rec.iterations === 150000 && rec.digits === 5 && rec.setAt === "2026-10-22T00:00:00.000Z",
    "shape: a created record is exactly §4.2 — v 1, 150,000 iterations, the chosen digit length, the set instant");
  check(pinlock.base64ToBytes(rec.salt).length === 16 && pinlock.base64ToBytes(rec.hash).length === 32,
    "shape: the salt decodes to 16 bytes and the hash to 32 bytes");

  /* ---- verify: accepts the set PIN, rejects neighbours ---- */
  check((await pinlock.verifyPin(rec, "97531", nodeSubtle)) === true,
    "verify: the set PIN is accepted");
  check((await pinlock.verifyPin(rec, "97532", nodeSubtle)) === false,
    "verify: a wrong digit is rejected");
  check((await pinlock.verifyPin(rec, "9753", nodeSubtle)) === false,
    "verify: a wrong (short) length is rejected");
  check((await pinlock.verifyPin(rec, "975310", nodeSubtle)) === false,
    "verify: an over-length entry is rejected");
  check((await pinlock.verifyPin(rec, "", nodeSubtle)) === false,
    "verify: an empty entry is rejected");

  /* ---- salt uniqueness ---- */
  const recB = await pinlock.createPinRecord("97531", { subtle: nodeSubtle, randomBytes: rngB, now: fixedNow });
  check(recB.salt !== rec.salt && recB.hash !== rec.hash,
    "salt: the same PIN under a different salt yields a different record AND a different hash");
  check((await pinlock.verifyPin(recB, "97531", nodeSubtle)) === true,
    "salt: the second record verifies its own PIN");

  /* ---- tampered records never verify ---- */
  const flip = (s) => (s[0] === "A" ? "B" : "A") + s.slice(1);
  check((await pinlock.verifyPin({ ...rec, hash: flip(rec.hash) }, "97531", nodeSubtle)) === false,
    "tamper: a flipped hash character is rejected");
  check((await pinlock.verifyPin({ ...rec, salt: flip(rec.salt) }, "97531", nodeSubtle)) === false,
    "tamper: a flipped salt character is rejected");
  check((await pinlock.verifyPin({ ...rec, iterations: 149999 }, "97531", nodeSubtle)) === false,
    "tamper: a changed iteration count derives a different key and is rejected");
  check(pinlock.timingSafeEqualBytes(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3])) === true &&
        pinlock.timingSafeEqualBytes(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4])) === false &&
        pinlock.timingSafeEqualBytes(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3])) === false,
    "compare: the constant-time byte compare accepts equals, rejects a differing byte and a differing length");

  /* ---- storage: device-local round-trips + the no-PIN-in-storage proof ---- */
  const st = fakeStorage();
  pinlock.savePinRecord(st, rec);
  check(JSON.stringify(pinlock.loadPinRecord(st)) === JSON.stringify(rec),
    "storage: the record round-trips through the injected storage seam");
  const rawStored = st.map.get(pinlock.PIN_RECORD_KEY);
  check(!rawStored.includes("97531") && !/"pin"\s*:/.test(rawStored),
    "storage: the stored record contains NO substring of the PIN and no pin field — salt + slow hash only (§4.3)");
  pinlock.clearPinRecord(st);
  check(pinlock.loadPinRecord(st) === null,
    "storage: clearing removes the record (the recovery/delete path)");
  check(pinlock.loadPinRecord({ getItem: () => "{not json", setItem: () => {}, removeItem: () => {} }) === null &&
        pinlock.loadPinRecord({ getItem: () => '{"v":2}', setItem: () => {}, removeItem: () => {} }) === null,
    "storage: malformed or foreign-version records parse to NO record — never a crash, never a phantom PIN");
  const emptySt = fakeStorage();
  check(pinlock.loadPinPrefs(emptySt).idleMinutes === 5 && pinlock.loadPinPrefs(emptySt).gateSensitive === false,
    "prefs: the defaults are idle 5 minutes and the E5 gate OFF (§4.2/§4.6)");
  pinlock.savePinPrefs(st, { idleMinutes: 15, gateSensitive: true });
  check(pinlock.loadPinPrefs(st).idleMinutes === 15 && pinlock.loadPinPrefs(st).gateSensitive === true,
    "prefs: a saved prefs pair round-trips");
  check(pinlock.loadPinPrefs({ getItem: () => '{"idleMinutes":7,"gateSensitive":true}', setItem: () => {}, removeItem: () => {} }).idleMinutes === 5,
    "prefs: an out-of-set idle value falls back to the default — a tampered prefs blob cannot invent a schedule");
  pinlock.savePinGuard(st, { failures: 3, pausedUntil: 12345 });
  const guardBack = pinlock.loadPinGuard(st);
  check(guardBack.failures === 3 && guardBack.pausedUntil === 12345,
    "guard: the friction counters round-trip (a reload cannot reset a pause)");
  check(st.touched.every((k) => k.startsWith("dukaan-ai-pinlock")),
    "zero-Firestore seam: across a full set/save/load/clear cycle the PIN module touched ONLY its own dukaan-ai-pinlock* storage keys — device-local by construction (§4.2)");

  /* ---- friction schedule (§4.4 — pure function, schedule points) ---- */
  check(pinlock.frictionPauseMs(0) === 0 && pinlock.frictionPauseMs(4) === 0 &&
        pinlock.frictionPauseMs(5) === 30000 && pinlock.frictionPauseMs(9) === 30000 &&
        pinlock.frictionPauseMs(10) === 120000 && pinlock.frictionPauseMs(14) === 120000 &&
        pinlock.frictionPauseMs(15) === 300000 && pinlock.frictionPauseMs(100) === 300000,
    "friction: free below 5 failures; 30s at 5; 2 minutes per further 5; 5-minute cap — friction, honestly labelled, never strength (§4.1/§4.4)");
  let g = { failures: 0, pausedUntil: 0 };
  for (let i = 0; i < 4; i++) g = pinlock.applyPinFailure(g, 1000);
  check(g.failures === 4 && g.pausedUntil === 0,
    "friction: four failures accrue with no pause yet");
  g = pinlock.applyPinFailure(g, 1000);
  check(g.failures === 5 && g.pausedUntil === 31000 && pinlock.pinPauseRemainingMs(g, 11000) === 20000,
    "friction: the fifth failure starts the 30-second pause from the failure instant");
  const gReset = pinlock.applyPinSuccess();
  check(gReset.failures === 0 && gReset.pausedUntil === 0,
    "friction: a success clears the failure count and any pause");

  /* ---- idle / lock state machine (§4.4 — pure reducer) ---- */
  const R = pinlock.pinLockReducer;
  check(R(pinlock.initialPinLockState, { type: "launch", hasRecord: true, now: 0 }).locked === true,
    "lock: launch WITH a record opens locked");
  check(R(pinlock.initialPinLockState, { type: "launch", hasRecord: false, now: 0 }).locked === false,
    "lock: launch with NO record opens unlocked — no record, no lock UI");
  let ls = { locked: false, lastActivityAt: 0 };
  check(R(ls, { type: "check", now: 299999, idleMinutes: 5 }).locked === false &&
        R(ls, { type: "check", now: 300000, idleMinutes: 5 }).locked === true,
    "idle: the check locks exactly at the idle deadline, not before");
  ls = R(ls, { type: "activity", now: 200000 });
  check(ls.lastActivityAt === 200000 &&
        R(ls, { type: "check", now: 499999, idleMinutes: 5 }).locked === false &&
        R(ls, { type: "check", now: 500000, idleMinutes: 5 }).locked === true,
    "idle: activity resets the epoch — the deadline moves with the last activity");
  check(R({ locked: false, lastActivityAt: 0 }, { type: "check", now: 99999999, idleMinutes: 0 }).locked === false,
    "idle: idleMinutes 0 is launch-only — a check never locks");
  check(R({ locked: false, lastActivityAt: 0 }, { type: "check", now: 600000, idleMinutes: 5 }).locked === true,
    "idle: a deadline that passed while the tab was hidden locks on the return check — hidden time counts toward idle (§4.4)");
  const lockedState = { locked: true, lastActivityAt: 42 };
  check(R(lockedState, { type: "activity", now: 999999 }).locked === true &&
        R(lockedState, { type: "activity", now: 999999 }).lastActivityAt === 42,
    "idle: activity while LOCKED changes nothing — the lock screen cannot extend its own deadline");
  check(R({ locked: false, lastActivityAt: 0 }, { type: "lockNow" }).locked === true,
    "lock: the manual lock engages immediately (the header button)");
  const unlocked = R(lockedState, { type: "unlock", now: 700000 });
  check(unlocked.locked === false &&
        R(unlocked, { type: "check", now: 700000 + 299999, idleMinutes: 5 }).locked === false,
    "lock: unlock opens AND starts a fresh idle epoch");

  /* ---- source invariants ---- */
  {
    const pinSrc = fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/lib/pinlock.ts", "utf8");
    check(!/makeEntry|guardPostings|postEntry|writeBatch|setDoc|addDoc|updateDoc/.test(pinSrc),
      "source: lib/pinlock touches no posting path and no Firestore write — it is storage + crypto + pure state machines only");
    const gateSrc = fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/components/PinGate.tsx", "utf8");
    check(!/firebase\/firestore|setDoc|addDoc|updateDoc|deleteDoc|writeBatch/.test(gateSrc) &&
          gateSrc.includes("reauthenticateWithCredential"),
      "source: PinGate performs ZERO Firestore writes — its only Firebase call is Auth reauthentication, the §4.5 recovery key");
    check((gateSrc.match(/resetDemo/g) || []).length === 3,
      "source: PinGate references resetDemo exactly three times (destructure, the demo erase call, its dep array) — the ONLY store write the PIN system ever reaches, and it is demo-local storage, not Firestore");
    const shellSrc = fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/components/AppShell.tsx", "utf8");
    check(shellSrc.includes("PinGateProvider") && shellSrc.includes("PinLockButton"),
      "source: AppShell mounts PinGateProvider around the non-auth branch and the header lock button beside logout (§4.4)");
    const settingsSrc = fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/components/SettingsView.tsx", "utf8");
    check(settingsSrc.includes("<DeviceLockCard />"),
      "source: Settings mounts the Device lock card");
    const cardSrc = fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/components/DeviceLockCard.tsx", "utf8");
    check(!/useStore|firebase|setDoc|updateDoc/.test(cardSrc),
      "source: the Device lock card holds no store or backend seam at all — it speaks only to the PinGate context (device-local state, §5)");
    const pinKeys = Object.keys(i18n.en).filter((k) => k.startsWith("pin."));
    check(pinKeys.length === 49 && pinKeys.every((k) => k in i18n.ur),
      "i18n: 49 pin.* keys landed with full EN ≡ UR parity");
    check(i18n.en["pin.honesty"].includes("not a replacement for your account password") &&
          i18n.ur["pin.honesty"].includes("متبادل نہیں"),
      "i18n: the §4.7 honesty copy is really in the product, both languages — the PIN is never sold as account security");
  }

  /* ---- zero journal effect ---- */
  check((fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx", "utf8")
        .match(/makeEntry\(/g) || []).length === 24,
    "source: still exactly 24 makeEntry calls in the store — E4 composed no entry, template or refType");
  check(crypto.createHash("sha256")
        .update(stripG1Blocks(stripG2Blocks(fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8"))), "utf8")
        .digest("hex") === "04807268c2c1891c070e1cc34443fe4c3892ea35dde739718499e392c661f859",
    "rules: byte-identical to the pre-E4 file (SHA pinned) — the PIN needs no rules and no Firestore presence at all (§5) (G1 same-check amendment: the four G1 spans are stripped first — v9's only other deltas, strip-proven in the G1 suite)");
  {
    const journalE4 = seed.getSeedJournal(products, sales, purchases, payments, expenses, credits);
    const normalizedE4 = journalE4.map((e) => { const { ts, ...rest } = e; return rest; });
    const shaE4 = crypto.createHash("sha256").update(JSON.stringify(normalizedE4), "utf8").digest("hex");
    const allRangeE4 = reports.resolveReportRange("custom", null, { from: "2000-01-01", to: "2100-12-31" });
    const tbE4 = reports.trialBalance(journalE4, allRangeE4);
    check(journalE4.length === 21 && shaE4 === "e17e5bda19e87de698b0c0a37e923f9b396bc387e2092b2ffbbd7d60d4971168" &&
          eq(ledger.accountBalance(journalE4, "inventory"), 272805) &&
          eq(ledger.cashBalance(journalE4), 50000) &&
          eq(ledger.payablesTotal(journalE4), 27900) &&
          eq(ledger.receivablesTotal(journalE4), 5500) &&
          eq(tbE4.totalDebits, tbE4.totalCredits),
      "seed regression: the frozen identities stand — 21 entries, the seed-journal SHA, inventory 272,805 / cash 50,000 / payables 27,900 / receivables 5,500, trial balance zero. A PIN is device state, never an entry");
  }

  /* =============================== E5 (Phase E · E5 — sensitive-action gating) =============================== */
  suite("E5", null); // Phase E · E5 — sensitive-action PIN gating: the gate matrix + the four call sites (design §4.6)

  /* ---- the precondition truth table (one seam, all four actions) ---- */
  check(pinlock.pinGateRequired({ idleMinutes: 5, gateSensitive: true }, false) === false,
    "gate: NO record on this device ⇒ never required, whatever the pref says");
  check(pinlock.pinGateRequired({ idleMinutes: 5, gateSensitive: false }, true) === false,
    "gate: record + pref OFF (the default) ⇒ not required — every gated action behaves exactly as before E5");
  check(pinlock.pinGateRequired({ idleMinutes: 0, gateSensitive: true }, true) === true,
    "gate: record + pref ON ⇒ required");
  check(["pin.gate.actVoid", "pin.gate.actDayClose", "pin.gate.actPeriod", "pin.gate.actFiscal"]
        .every((k) => k in i18n.en && k in i18n.ur),
    "gate: the v1 gate list is exactly void bill · day-close submit · period close/reopen · FY close/reopen, each with its challenge label in both languages (§4.6)");

  /* ---- the composition matrix: writes composed exactly in the allow cases ---- */
  const composedWrites = (required, outcome) => (pinlock.gateAllows(required, outcome) ? 1 : 0);
  const matrix = [
    [false, "pass", 1], [false, "fail", 1], [false, "cancel", 1], [false, "not-run", 1],
    [true, "pass", 1], [true, "fail", 0], [true, "cancel", 0], [true, "not-run", 0],
  ];
  check(matrix.every(([req, outcome, want]) => composedWrites(req, outcome) === want),
    "gate matrix: {not required} × any outcome composes (today's behaviour); {required} composes ONLY on pass — a failed or cancelled challenge composes ZERO writes, for every gated action (they share this one seam)");

  /* ---- the gate helpers never touch the lock state (§4.6: a satisfied
   * challenge IS activity — the standard activity path, nothing else) ---- */
  {
    const probe = { locked: false, lastActivityAt: 777 };
    const before = JSON.stringify(probe);
    pinlock.pinGateRequired({ idleMinutes: 5, gateSensitive: true }, true);
    pinlock.gateAllows(true, "pass");
    check(JSON.stringify(probe) === before,
      "gate: the E5 decision helpers are pure — they read prefs + record presence only and cannot move the idle epoch");
    const afterChallengeActivity = pinlock.pinLockReducer(probe, { type: "activity", now: 5000 });
    check(afterChallengeActivity.lastActivityAt === 5000 &&
          pinlock.pinLockReducer(afterChallengeActivity, { type: "check", now: 5000 + 299999, idleMinutes: 5 }).locked === false,
      "gate: challenge interaction rides the ordinary activity event (the pad's own pointer/key events) — it neither bypasses nor resets the idle machine beyond being activity");
  }

  /* ---- the four call sites: challenge awaited BEFORE composition ---- */
  {
    const bdSrc = fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/components/BillingDesk.tsx", "utf8");
    check(bdSrc.includes('if (!(await requirePin("pin.gate.actVoid")))') &&
          bdSrc.indexOf('requirePin("pin.gate.actVoid")') < bdSrc.indexOf("voidBill(bill.id)"),
      "call site: BillingDesk awaits the void-bill challenge BEFORE voidBill composes — cancel/fail returns without touching the store");
    const dcSrc = fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/components/DayCloseView.tsx", "utf8");
    check(dcSrc.includes('if (!(await requirePin("pin.gate.actDayClose"))) return;') &&
          dcSrc.indexOf('requirePin("pin.gate.actDayClose")') < dcSrc.indexOf("saveDayClose({"),
      "call site: DayClose awaits the day-close challenge BEFORE saveDayClose composes");
    const perSrc = fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/components/PeriodsPanel.tsx", "utf8");
    const perReq1 = perSrc.indexOf('requirePin("pin.gate.actPeriod")');
    const perReq2 = perSrc.indexOf('requirePin("pin.gate.actPeriod")', perReq1 + 1);
    check(perReq1 >= 0 && perReq2 > perReq1 &&
          perReq1 < perSrc.indexOf("closePeriod(closeDate") &&
          perReq2 < perSrc.indexOf("reopenPeriod(reopenFully"),
      "call site: PeriodsPanel awaits the period challenge before BOTH closePeriod and reopenPeriod");
    const fySrc = fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/components/FiscalClosePanel.tsx", "utf8");
    const fyReq1 = fySrc.indexOf('requirePin("pin.gate.actFiscal")');
    const fyReq2 = fySrc.indexOf('requirePin("pin.gate.actFiscal")', fyReq1 + 1);
    check(fyReq1 >= 0 && fyReq2 > fyReq1 &&
          fyReq1 < fySrc.indexOf("closeFiscalYear(range.startDate") &&
          fyReq2 < fySrc.indexOf("reopenFiscalYear(range.startDate"),
      "call site: FiscalClosePanel awaits the fiscal challenge before BOTH closeFiscalYear and reopenFiscalYear");
    const gateSrc = fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/components/PinGate.tsx", "utf8");
    check(gateSrc.includes("if (!required) return Promise.resolve(true);") &&
          !/requirePin/.test(fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/components/StaffView.tsx", "utf8")) &&
          !/requirePin/.test(fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/components/LoansView.tsx", "utf8")),
      "seam: requirePin resolves true immediately when not required (ungated flows are byte-for-byte the pre-E5 flows), and neither the payroll desk nor the loans desk is gated — those money actions are deliberately excluded (§4.6)");
    check(!/requirePin/.test(fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx", "utf8")),
      "seam: the store knows nothing of the gate — no store action signature changed (view-layer precondition only, §4.6)");
  }

  /* ---- close: zero journal effect, rules untouched ---- */
  check((fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx", "utf8")
        .match(/makeEntry\(/g) || []).length === 24,
    "source: still exactly 24 makeEntry calls in the store — E5 composed no entry and changed no posting");
  check(crypto.createHash("sha256")
        .update(stripG1Blocks(stripG2Blocks(fs.readFileSync("/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8"))), "utf8")
        .digest("hex") === "04807268c2c1891c070e1cc34443fe4c3892ea35dde739718499e392c661f859",
    "rules: byte-identical to the pre-E5 file (SHA pinned) — gating is a device-local view-layer precondition, invisible to the backend (§5/§6) (G1 same-check amendment: the four G1 spans are stripped first — v9's only other deltas, strip-proven in the G1 suite)");
  {
    const journalE5 = seed.getSeedJournal(products, sales, purchases, payments, expenses, credits);
    const normalizedE5 = journalE5.map((e) => { const { ts, ...rest } = e; return rest; });
    const shaE5 = crypto.createHash("sha256").update(JSON.stringify(normalizedE5), "utf8").digest("hex");
    const allRangeE5 = reports.resolveReportRange("custom", null, { from: "2000-01-01", to: "2100-12-31" });
    const tbE5 = reports.trialBalance(journalE5, allRangeE5);
    check(journalE5.length === 21 && shaE5 === "e17e5bda19e87de698b0c0a37e923f9b396bc387e2092b2ffbbd7d60d4971168" &&
          eq(ledger.accountBalance(journalE5, "inventory"), 272805) &&
          eq(ledger.cashBalance(journalE5), 50000) &&
          eq(ledger.payablesTotal(journalE5), 27900) &&
          eq(ledger.receivablesTotal(journalE5), 5500) &&
          eq(tbE5.totalDebits, tbE5.totalCredits),
      "seed regression: the frozen identities stand — a gate on a screen is not an accounting event");
  }

  runAll();
})().catch((err) => {
  console.error("E4/E5 suite crashed:", err);
  process.exit(1);
});

/* -------------------------------- runner -------------------------------- */
/* The runner is a hoisted function since E4: the E4/E5 suites are
 * async (PBKDF2 through Node's WebCrypto), so they run inside the
 * IIFE above and call runAll() when their checks are registered.
 * Every earlier suite is synchronous and has already run by then. */
function runAll() {
let totalPass = 0, totalFail = 0, countProblems = 0;
for (const s of suites) {
  totalPass += s.pass; totalFail += s.fail;
  const counted = s.pass + s.fail;
  const countOk = s.expected === null || counted === s.expected;
  if (!countOk) countProblems++;
  console.log(
    `${s.name}: ${s.pass} passed, ${s.fail} failed` +
    (s.expected !== null ? ` (expected ${s.expected}, ran ${counted}${countOk ? "" : " — COUNT MISMATCH"})` : ` (${counted} checks)`)
  );
}
console.log(`TOTAL: ${totalPass} passed, ${totalFail} failed, ${totalPass + totalFail} checks`);
if (totalFail > 0 || countProblems > 0) process.exit(1);
console.log("ALL SUITES GREEN");
}

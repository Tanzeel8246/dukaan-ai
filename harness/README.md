# Verification harness (dev-only; not part of any build/deploy)

Reconstructed at Phase B · B1 (the Phase A originals were ephemeral
/tmp work and were lost). Compiles `web/lib` FRESH and runs the
documented suites: FIN 34 · COA 10 · A2 16 · RBAC 115 · A4 56 ·
A5 51 (= 282) + the B1 suite (40) + the B2 suite (39) + the B3
suite (37) + the SEARCH suite (72) — null-safe search predicates
(lib/search.ts): verbatim-equivalence with the legacy inline
predicates on well-formed data, plus no-throw fixtures for every
legacy field-missing shape (the "search doesn't work anywhere" fix;
the final 23 checks cover the SuppliersManager and NotesViews
predicates, deferred until B4 landed) + the B4 suite (34) —
credit/debit notes + the purchase-return engine — + the B5 suite
(38) — the cheque registry: both lifecycles with the registry ≡ GL
identity asserted at every step, issuance-settles-payable, F-6
compensating rows, PDC edges, day-close instrument exclusions —
+ the B6 suite (34) — payment vouchers: RV-/PV- stamps on payment
rows, sequence/no-burn/legacy proofs, no journal writes, and the
voucher print-data builders equalling their source rows
+ the REPORTS suite (68) — the Reports section's builders proven
EQUAL to the screens they mirror: P&L == profitAndLossInRange,
per-slab tax totals == taxPosition over the in-range journal,
stock valuation/low/expiry == the selectors, aging == Finance's
aging calls, customer statement closing == customerOutstanding,
supplier statement closing == supplierBalance (incl. the
offset+refund purchase-return fixture), account statement closing
== moneyAccountBalance; plus range edges (half-open instants, FY
boundary), EN/UR figure determinism and legacy-row safety
+ the C1 suite (46) — Phase C · C1 warehouses & stock rows: the
entry-free stockV1 migration identity (Σ rows == stockQty per
product; journal length/SHA/GL identities untouched; idempotent;
per-product skip-whole), the §1.3 resolution rule, an every-path
workload (purchase/bill/counter/return/purchase-return/adjustment/
edit/import/delete) asserting Σ rows == stockQty after each step,
journal byte-stillness across warehouses, the promise partition
reproducing B2's globals per product, the drift detector catching
an injected +5 plus the recount repair (default row absorbs;
clean data no-op; missing default row created), the warehouses
RBAC row, C1 i18n parity, and the additive-only rules proof
(strip the C1 blocks → the pre-C1 file's SHA)
+ the C2 suite (49) — Phase C · C2 stock transfers: the TR-
series (TR- default + override; drafts burn no numbers; max+1
mint at dispatch), composition + route refusals (duplicate
picks merge, names snapshot; same-warehouse / missing /
archived endpoints refuse pre-composition), dispatch dropping
source rows with the journal byte-still (seed SHA re-pinned)
and product totals unchanged, in-transit derived exactly +
incoming per destination, partial receives summing exactly,
over-receipt refused pre-composition, the close-short loss
posting exactly (short × current costPrice through the real
makeEntry guard; Dr inventory_loss / Cr the class account —
the inventory_raw seam proven with a structural raw fixture)
with product totals dropping and §1.3's identity restored,
return-to-source landing the road remainder at the source, the
§2.5 period-lock scenario (a pre-lock dispatch received after
the lock composes nothing; the loss is dated today and refuses
under a today-lock), the transfer-aware drift detector (an
open transfer's road stock is not drift; the legacy two-arg
reading misreads it, by design of the proof) + recount leaving
in-transit untouched, the demo DRAFT seed moving nothing,
RBAC on the warehouses row, C2 i18n parity (73 keys; total
1,702), source invariants (v12 demo bump; still 24 makeEntry
calls in the store — the loss composes in lib/transfers), and
the additive-only rules proof (strip the C2 block → the
pre-C2 file's SHA).

The C3 suite covers Phase C · C3 (product class & BOM): the
class resolver + the ledger's class-split leg helper (the
no-raw byte-identical regression proven at template level —
the full prior harness re-runs unamended, and the generalised
purchase entry with zero raw share is byte-identical to the
legacy one), raw/mixed purchase legs with the tax + payables
legs untouched, the sale/counter/return/purchase-return
mirrors, the lib-composed reclass builder (flip with stock =
exactly one entry of stockQty × costPrice; zero stock/value =
no entry; negative stock = the mirror image) with both class
identities asserted after, a replayed mixed workload pinning
GL inventory / inventory_raw to their per-class movements,
BOM draft validation (self-component, raw output, empties)
and immutable versioning over the real helpers (edit = n+1,
n stays readable), standard batch/unit costs, the demo BOM
seed (the fresh seed product list stays class-free), the
manufacturing RBAC row, C3 i18n parity (44 mfg keys + 6 inv
additions; total 1,752 — the C2 total check was amended to the
new figure, same parity assertion), source invariants (v13
demo bump; still 24 makeEntry calls in the store — the reclass
composes in lib/transfers; no store template hardcodes the
`inventory` account), and the additive-only rules proof
(strip the C3 block → the pre-C3 file's SHA).

The C4 suite covers Phase C · C4 (production orders): the
recipe snapshot discipline (a mid-order BOM edit never
re-costs an open order — issue defaults read the snapshot),
the full worked production through the REAL lib/production
compositions — issue valued at shelf costs split per class
account (raw → `inventory_raw`, goods component →
`inventory`) with labour/overhead paid from the till →
partial completion → scrap → final completion — asserting
GL `wip` == Σ order pools at every step and the closing
roll-up (completions + scraps == issues) to the paisa; the
second settlement scenario (accrued to `salary_payable`, no
money line) closed with nothing produced (closeout residual
exact, lands cancelled); over-production as a final
completion spreading the whole pool; the paisa scenario
(33.33 + 33.34 + 33.33 == 100, final-absorb leaves nothing);
the refusal set (empty pool, insufficient stock AT the
order's warehouse, zero-value issue, paid settlement with
no account, events on closed orders, duplicate-pick merge);
the PR- series (drafts burn no numbers, prefix overrides);
the demo draft seed (one DRAFT order, no events, zero
journal footprint) with the frozen seed identities + SHA
re-verified; the manufacturing RBAC row; C4 i18n parity (86
production keys + the series label; total 1,839 — the C2
total check and the C3 mfg-part count were amended to the
new figures, same parity assertions); source invariants
(v14 demo bump; still 24 makeEntry calls — production
entries compose in lib/production; BOTH live subscriptions
incl. the C3 boms-subscription repair); and the
additive-only rules proof (strip the C4 block → the pre-C4
file's SHA).

The C5 suite covers Phase C · C5 (job tracker, design §5):
the stage lifecycle over the real lib/jobs derivation
(defaults, an owner list trimmed/deduped, first/middle/last
positions, sticky delivered/cancelled, renamed-away stages
reading open until the job visibly starts), JB- numbering
(born numbered at creation — the §5.1 exception; max+1;
prefix overrides), material events through the real
compositions (a mixed raw+goods issue = Dr `cogs` ref'd to
the job / Cr each component's CLASS account at shelf cost;
rows + totals + GL moving together under the §1.3 identity;
the return as the exact mirror; GL cogs == jobMaterialsCost
to the paisa; the refusal set — insufficient at the JOB's
warehouse, over-return, zero-value, not-active, empty /
unknown / bad-qty, duplicate-pick merge), the pooled
advance identity (the journal diff of a job advance is
EXACTLY one ordinary repayment entry — identical memo,
refType and lines to a plain repayment's, carrying no job
reference; the customer's pool goes to −advance and the
citing bill's F-6 lot absorbs it, leaving total − advance),
the citing-bill citation discipline (only POSTED bills
citing the job count; held/voided/direct/other-job bills
contribute nothing), the §5.5 profit figure hand-computed
over the mixed scenario (3,000 − 320 − 700 − 500 = 1,480)
and the unbilled job (revenue 0, profit −(materials +
labour)), the demo seed job (one open JB-1, no events,
zero footprint) with the frozen seed identities + SHA
re-verified, the `jobTracker` RBAC row AS DECLARED (F/F/R/R
— cashier and accountant read, never write; G-C4), C5 i18n
parity (118 job keys + the series label; total 1,958 — the
C2 total check was amended to the new figure, same parity
assertion), source invariants (v15 demo bump; still 24
makeEntry calls in the store — job entries compose in
lib/jobs; the advances ride the EXISTING addRepayment with
the citing note), and the additive-only rules proof (strip
the C5 block → the pre-C5 file's SHA).

The FIX suite covers the live-audit fixes (2026-10-22): the
P&L ≡ sales-report revenue identity (seed + a synthetic mixed
workload composed through the real makeEntry guard), the
labelled reconciling line for journal-only revenue, the
Rs 375 counter-sale bucketing case, outflow previews against
the seed's −45,000 Wallet & Bank, expense register ≡ cash-book
dates, the trial balance, walk-in bill search, and the FIX
i18n keys (dictionary now 1,992, EN ≡ UR).

The D1 suite covers ERP Phase D · D1 (declarations, employees
& attendance — NO postings): the additive `loans_receivable`
COA code (the COA suite's count literal amended 27 → 28, same
check), the seven declared refTypes + PAY-/LN- series defaults,
§1.4 proration fixtures to hand-computed figures, the §2.2
salary_payable composition identity over a synthetic journal
(employee refs + a C4-style ref-less accrual; GL ≡ Σ positions
+ unassigned bucket), attendance tallies + the mark cycle,
staffDirectory RBAC cells, the zero-journal-footprint demo
seed (frozen identities re-asserted), D1 i18n parity (103 hr
keys; the C2 total pin amended 1,992 → 2,098), and the
additive-only rules proof (strip the D1 blocks → the v6
file's SHA).

The D2 suite covers ERP Phase D · D2 (payroll runs, payments,
advances, slips — design §2): run lines composed by the real
buildRunLines (proration snapshotted; deactivated employees
excluded), desk overrides via payrollLineTotals, the finalise
accrual through the real builder (NET per employee, refs on
both lines, Σ == run net, the reducer and the gross nowhere in
the entry, all-zero runs compose no entry), the
one-posted-run guard as a store-source proof, an advance →
accrual → partial-payment sequence with the §2.7 slip figures
(runLineFigures) to the paisa, the composition identity after
every step of mixed traffic (advance + C4-shaped ref-less
accrual + accrual + payment + bucket payment), trial balance
0 throughout, run reversal (payments stand as advance
positions) and payment reversal (position + paid derivation
restored), period-lock refusal for backdated accrual/payment
through the real preparePosting, payroll RBAC cells, the demo
DRAFT seed (zero footprint, frozen identities re-asserted),
D2 i18n parity (+114 keys; the C2 total pin amended 2,098 →
2,212; the D1 hr pin amended 103 → 104 for the tab chip), the
C2–C5 rules-segment checks re-pointed at the next block's
marker (the D2 block's createInOpenPeriod is by design §6.2),
source invariants (still 24 makeEntry calls in the store —
D2's templates compose in lib/payroll), and the additive-only
rules proof (strip the D2 block → the D1-state file's SHA).
(The D2 i18n total pin was amended 2,212 → 2,214 when the
shell/theme polish landed after D2 — same-check amendment.)

The D3 suite covers ERP Phase D · D3 (the loans register —
design §3): composition refusals via the real `loanTermsError`
(charged receivable lending refused, never zeroed; fee at or
above principal refused), charge snapshots (flat = % of the
original principal; fee_only = the fee; reducing = none), the
schedule derivation (100,000 over 7 instalments at flat 10%
splits to the paisa under cumulative allocation; reducing
charges 2,400/1,800/1,200/600 on the schedule's outstanding;
weekly steps and the month-end clamp), both drawdown shapes
through the real builders (gross; fee-netted with the
`expense_finance` leg), charge accrual as a composed event
only (a drawn loan's journal carries no charge until the desk
composes one; the ordinal `nextChargeAccrual` proposal), the
lifecycle identity after every step (GL `loans_payable` ≡
the events diary's derived outstanding; trial balance 0),
charges-first + desk-overridden repayment splits with the
overpayment refusal, overdue derivation off the schedule
(paid/partial/overdue states + next-due), mirror-reversal
restoration, the receivable mirror on `loans_receivable` with
`receivables` provably untouched (the §3.1 isolation), full
settlement deriving the settled label, period-lock refusals
through the real preparePosting, the loans RBAC row, the
null-safe register search, register totals, the demo sample
loan (charge-free, no events, outstanding == principal;
frozen seed identities re-asserted), D3 i18n parity (+119
keys; the C2 + D2 total pins amended 2,214 → 2,333), source
invariants (still 24 makeEntry calls in the store — D3's
templates compose in lib/loans), and the additive-only rules
proof (strip the D3 block → the D2-state file's SHA).

The D4 suite covers Phase D · D4 (fiscal-year close): the
registry-driven P&L closing set (exactly the COA's income /
contra_income / expense codes; clearing, tax and balance-sheet
accounts never close), the derived pre-close checklist with its
two HARD gates (a deliberately unbalanced fixture blocks on
the trial-balance gate; a stranded purchases-clearing balance
blocks on the clearing gate) and its deriving warnings (draft
payroll runs inside the FY, open production WIP pools), the
closing entry's shape (one `fy_close` entry dated the FY's
last day; every P&L account zeroed; retained earnings credited
the exact 20,000 net — and DEBITED in the loss-year fixture),
the §4.6 three-way identity (pre-close P&L == post-close P&L
under the `fy_close` exclusion == the closing entry's own
summary), the trial balance's zeroed truth after close, the
new FY starting clean, opening balances as pure derivations
(§4.5 — no opening entries anywhere), close-state detection
(the double-close guard), reopen by mirror with balances
restored to the paisa and stack discipline (a later closed
year blocks; unwinding it unblocks), period-lock interplay
through the real preparePosting (close dated into a lock
refuses; postings into the closed year refuse after it), the
zero-movement year (no entry; doc-cited close state), D4 i18n
parity (+55 `fin.fy.*` keys; earlier total pins amended
2,339 → 2,394), source invariants (still 24 makeEntry calls
in the store — D4 composes in lib/fiscal), and the rules
claim verified by SHA: §4 needs no rules change, so the file
is byte-identical to the D3-state file.
+ the D5 suite (40) — Phase D · D5 Tally export + journal
CSV (design §5): the fixed COA → Tally group mapping (all 28
codes mapped; ledger names overridable via `tallyLedgerNames`,
groups never), the full §5.3 refType → voucher-type table (all
33 refTypes; the two loan refTypes in both directions, derived
from the entry's own loan lines), per-party ledgers
(customer/supplier/employee refs land on party ledgers under
the mapped groups; same-name parties disambiguated, never
merged), opening balances derived in-file for a mid-journal
range in Tally's sign convention, one voucher per entry with
per-voucher Dr == Cr and the aggregate == the period trial
balance, the generated XML re-parsed (well-formedness,
escaping of comma/quote/Urdu memos, the FILE's own totals
reconciling to the trial balance), the CSV's row count ==
the period's journal-line count with memos round-tripping
through the house parser, the `fy_close` voucher number (the
FY label), the seed journal exporting whole (21 balanced
vouchers, no manufactured openings, frozen identities
untouched), D5 i18n parity (+12 `fin.export.*` keys; earlier
total pins amended 2,394 → 2,406), source invariants (the
exporter is pure — no store-write calls in lib/tally; still
24 makeEntry calls in the store), and the rules file
byte-identical by the pinned SHA (no D5 rules change).
+ the E1 suite (39) — Phase E · E1 print design foundation
(design §1): the resolver's default snapshot and its
24-field sweep, the @page strings, the PRINT_SLOTS matrix
(challan never priced), the column sources, the §2.4 stamp
matrix with the asset always absent, thermal suppression,
the fixtures' closing arithmetic, and the rules SHA
re-pinned (no E1 rules change).
+ the E2 suite (47) — Phase E · E2 brand assets (design §2):
the spec table and HARD CAPS (150/150/150/300/300/200 KB,
total 1,250,000, each under 1 MiB), data-URL measuring
(ragged payloads measure −1), fit-within-box (never
upscale; dimensions floor), the format rule (alpha → WebP,
banners → JPEG), the compression ladder's exact rungs and
its runner (fits at rung 0 / only at rung 2 / the honest
refusal with actual figures, plus a property sweep proving
no run stores over its cap), the buildBrandingAsset
boundary guard (at-cap accepted, one quad over refused),
the slot-consumption matrix fed REAL assets through
brandingDataUrls into E1's visibility rules (paid-only
stamp, thermal suppression with the logo kept, signature
slot discipline), E2 i18n parity (+37 `print.brand.*` keys;
earlier total pins amended 2,459 → 2,496), source
invariants (lib/branding pure; the store wires the
collection with owner-gated setters; still 24 makeEntry
calls; demo storage v16 → v17; the seed ships no assets),
the rules strip-proof (remove the ONE additive branding
block and the file is byte-identical to the pre-E2 SHA;
the D1–D3 canAccess-absence checks and the D4/D5/E1
byte-pins amended same-check style to strip first), and
the frozen seed identities closing the suite.
+ the E3 suite (50) — Phase E · E3 Raast QR (design §3):
full ISO 13616 IBAN validation (every single-character
corruption refused), CRC-16/CCITT known answers, builder/
parser round-trips under both framings, the PROVISIONAL
framing seam pinned as shipped (bare, unpinned — the
owner's bank QR not yet captured), the reference
encoder's matrix anchor, and the resolveRaastBlock
matrix. Rules byte-identical; the seed ships no IBAN.
+ the E4 suite (49) — Phase E · E4 PIN lock (design §4):
lib/pinlock exercised through its REAL code path (Node
WebCrypto in the injectable subtle seam) — RFC 7914
PBKDF2 known-answer vectors, the §4.2 record shape,
verify accept/reject (wrong digit/length/empty), salt
uniqueness, tampered hash/salt/iterations, the storage
proofs (no PIN substring stored; ONLY the module's own
dukaan-ai-pinlock* keys touched — the zero-Firestore
seam), the friction schedule at its points, and the
idle/lock reducer's full transition set (launch locked,
activity resets, deadline-while-hidden locks on return,
success clears failures). Source invariants: PinGate
performs zero Firestore writes (Auth reauthentication
only); the Device lock card holds no store/backend seam;
49 pin.* keys EN ≡ UR with the §4.7 honesty copy in both
languages; earlier total pins amended 2,531 → 2,580.
+ the E5 suite (16) — Phase E · E5 sensitive-action
gating (design §4.6): the precondition truth table, the
composition matrix (writes exactly in the allow cases;
required × fail/cancel composes ZERO), the four call
sites awaiting requirePin before their store calls,
payroll/loans desks deliberately ungated, the store
knowing nothing of the gate. Both suites close on
still-24 makeEntry calls, the byte-identical rules SHA
and the frozen seed identities. NOTE: the E4/E5 suites
are async (PBKDF2), so the runner is a hoisted
`runAll()` they call when done.
+ the G1 suite (42) — Phase G · G1 tenancy: the registry /
membership / invite planners, the trial birth, the legacy
backfill, and the rules v9 additive-only strip proof.
+ the G2 suite (35) — Phase G · G2 plans & counters: the
catalogue, the derived plan state at its boundary
instants, the batch-riding counters, staged enforcement
posture, and the G2 rules spans' strip proof.
+ the G3 suite (37) — Phase G · G3 the /platform console:
the closed read list + act list (privacy pinned at the
rules text and the data layer's imports), every act's
audit event, the payment queue's settlement plans, and
rules v9 FINAL (1,222 lines; the G3 span strip-proven).
+ the G4 suite (35) — Phase G · G4 renewal flow + trial
lifecycle: lib/renewal's quote arithmetic (catalogue
amounts, later-of period starts, month-end clamping),
the submission plan (born `submitted`, owner-named,
refusals write nothing), the queue's amount check
(flagged, never settled), the platformConfig act (set +
audited event, changed-fields only), the lifecycle
banner tiers (trial → approaching → urgent → grace →
read-only; suspension reason with activation clearing),
and the full scripted LIFECYCLE WALK — trial birth →
trading → expiry → grace (posting denied under
enforcement; reads carry no plan condition in the rules)
→ submit → confirm → active on the payment's own period
→ lapse → grace → read-only → annual renewal → active,
plus the rejected branch (record-only settlement, note
visible, resubmission plans) — with the shop journal's
SHA spot-asserted UNCHANGED at every step and a closing
sweep proving no platform write ever targets a tenant
path. Rules byte-identical (no G4 rules change);
dictionary 2,761 (+47: 35 renew.* + 12 platform.*).

Run:
    cd ../web && npx tsc -p ../harness/tsconfig.json
    node ../harness/harness.js

Expected: `ALL SUITES GREEN` (1,538 checks). The `out/` dir is
build scratch — safe to delete; it is regenerated by the tsc step.

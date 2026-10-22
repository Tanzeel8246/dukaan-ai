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

Run:
    cd ../web && npx tsc -p ../harness/tsconfig.json
    node ../harness/harness.js

Expected: `ALL SUITES GREEN` (1,054 checks). The `out/` dir is
build scratch — safe to delete; it is regenerated by the tsc step.

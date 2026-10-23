# Dukaan AI — ERP Phase F "Native Apps" — DESIGN

**Status:** Design only — no app code (web or Flutter) changed by this document.
**Scope:** Phase F of `dukaan-erp-roadmap.md` (Flutter Android + Windows apps, offline-first sync), designed against the complete Phase A–E web data layer. Parity target: the same shop, the same journal, the same rules — a third and fourth *client* of one backend, never a second system.
**Sources read:** `dukaan-erp-roadmap.md` (Phase F + the roadmap's own honesty notes), `ERP-PHASE-A-DESIGN.md` (§1 money accounts, §3 RBAC, §5 periods, §6 migration/rollout), `ERP-PHASE-B-DESIGN.md` (§1.3 numbering, §5 print-of-the-row), `ERP-PHASE-C-DESIGN.md`, `ERP-PHASE-D-DESIGN.md` (§12 open-question style), `ERP-PHASE-E-DESIGN.md` (§1 print templates, §2 brand assets, §3 Raast honesty, §4 PIN lock), `PRODUCTION.md` + `PHASE-E-RELEASE-AUDIT.md` (baselines), `web/components/StoreProvider.tsx` (`guardPostings`/`postEntry` choke point, `COLLECTION_NAMES`), `web/lib/ledger.ts` (`makeEntry`), `web/lib/documents.ts` (numbering), `web/lib/permissions.ts` (module list + matrix), `web/lib/pinlock.ts`, `web/lib/firebase.ts`, `firebase/firestore.rules` (594 lines), `harness/` (the TS verification harness), and the existing `flutter-app/` scaffold (appraised in §0.2).

## Non-negotiable invariants carried over (Complete edition + Phases A–E)

Every design choice below is subordinate to these — Phase F must not regress any of them:

1. **One backend, one data contract.** The apps read and write the **same Firebase project (`dukan-8246`, Spark plan)**, the **same `users/{uid}/…` namespace**, the **same 35 collections**, the **same document shapes** (`web/lib/types.ts` is the schema of record). No parallel database, no sync translation layer, no server component. No Blaze-plan feature is assumed anywhere in this design; the one surface that would want one (AI assistant, §2) is staged later and flagged as an owner decision, not designed around a hoped-for upgrade.
2. **The journal rules are the contract, on every client.** Append-only; **one atomic balanced journal entry per money event**, written in the same `WriteBatch` as its operational records; `makeEntry` throws on imbalance; corrections are reversing entries (`reversesId`), never edits; **no stored balance counters anywhere** — every balance is derived from journal lines (plus the operational subledgers the audits proved reconcile).
3. **The posting guard is reproduced, not approximated.** Every Flutter posting path composes entries through a Dart port of the web's seam — `makeEntry` (F-1 balance enforcement) + `preparePosting` (A5: `dateISO` stamping + `lockedThrough` assertion) invoked via a `guardPostings` equivalent **before any write** — so a Flutter client can no more post an unbalanced or period-backdated entry than the web can. The Firestore rules backstop (v8, 594 lines) is client-agnostic and already binds the apps identically.
4. **Seed identities are frozen — and are web-demo facts, not app facts.** The seed journal (21 entries · Inventory 272,805 · Cash 50,000 · payables 27,900 · receivables 5,500 · TB 0 · SHA `e17e5bda…1168`) is neither reproduced nor asserted by the apps (§8.3 states exactly what ports and what does not). Nothing in Phase F touches the web seed, the web harness's pins, or any live journal.
5. **Rules changes: none required; any change must be additive and flagged.** The published rules gate *roles and document shapes*, not clients; a conforming Flutter client needs no rules delta (§10.2). If implementation discovers a genuine need, it is reported as a finding with a drafted additive block — never slipped into an app release.
6. **Print figures are the document's own figures** (B §5 / E invariant 5), print is **theme-independent** (E invariant 3), and Urdu on paper is **never shaped by a PDF library** (E invariant 4's lesson — §5.3 applies it to Flutter honestly).
7. **Language purity:** EN/UR full parity through the web dictionary as the single source of truth (§6) — no hardcoded strings in either language, in either app.

## Current state (what Phase F builds on)

| Area | Today |
|---|---|
| Web app | Next.js static export on shared hosting + a Vercel server build; Firestore (Spark, `dukan-8246`) with `persistentLocalCache` + multi-tab manager — the web is *already* an offline-first Firestore client. |
| Data layer | 33 collections under `users/{uid}/` in `COLLECTION_NAMES` (bills, suppliers, purchases, supplierPayments, expenses, credits, customers, returns, adjustments, dayCloses, cashEntries, journal, accounts, taxSlabs, periods, quotations, saleOrders, deliveryChallans, purchaseOrders, notes, purchaseReturns, cheques, warehouses, stockLevels, stockTransfers, boms, productionOrders, jobs, employees, attendance, payrollRuns, loans, branding) + `products` and `sales` carried as first-class store fields; owner doc carries settings (incl. `lockedThrough`, `docSeries`, `printDesign`, fiscal fields) + `staff[]`/`staffEmails[]`; `staffIndex/{email} → { ownerUid, role }` resolves staff. |
| Posting seam | `StoreProvider`: every posting action composes via `makeEntry` (24 call sites), runs `guardPostings(...)` (A5 choke point), and funnels cloud writes through `postEntry` → `batchJournal` inside one `WriteBatch` with the operational docs. |
| Numbering | B §1.3: client-side `1 + max(sequence over subscribed docs)`, minted when a document leaves draft; drafts burn no numbers; `billNo` is the same pattern, older. **No transactions are used anywhere in the codebase; all writes are batches.** |
| Auth / RBAC | Firebase Auth (email/password). Roles owner/manager/cashier/accountant; missing role ⇒ manager; `can(role, module, action)` matrix in `lib/permissions.ts` (40 `PermModule`s); rules enforce the same table server-side. |
| PIN lock (E4/E5) | Device-local by design: PBKDF2-HMAC-SHA256 record in `localStorage` (`dukaan-ai-pinlock`, 150k iterations, salted), idle/launch/manual lock, optional sensitive-action gating (default OFF). Never synced, never in Firestore. |
| Themes | Five calm themes — `emerald` (light, default), `sand` (light), `ocean` (light), `midnight` (dark), `dusk` (dark) — `[data-theme]` token sets; choice persisted device-locally (`dukaan-ai-theme`). |
| Print (E1–E3) | `PrintDesign` settings resolved by one pure seam (`lib/print.ts`); brand assets as compressed data-URLs in `branding` docs; Raast: bank-issued QR **image** is the verified path; the generated SBP P2P payload's framing is still **`provisional`, `pinnedBy: null`** — unpinned against a real bank QR (Phase E audit, standing flag). |
| Verification | TS harness **1,389/1,389** green; i18n **2,580 keys EN ≡ UR** across 27 part files; rules 594 lines; demo storage v17. |
| Build reality | **No Flutter/Android SDK in this workspace.** All compilation happens in the cloud (GitHub Actions / Codemagic). The first cloud build of any increment is its first real compile — increments are therefore sized so a red first build is cheap to iterate (§7.5). |

### 0.2 The existing `flutter-app/` scaffold — appraised, and retired by this design

A Flutter scaffold from the Complete-edition era sits at `flutter-app/` (~15 Dart files: dashboard / inventory / sales / alerts, a login screen, Codemagic + GitHub-Actions APK workflows, package `com.codehubb.dukaanai`). It must be dealt with plainly, because building Phase F "on" it is the first decision:

- **Its architecture contradicts the current contract.** sqflite is its source of truth with Firestore as "an optional layer on top"; products merge **last-write-wins on `updatedAt`**; sales are local rows with a `synced` flag. There is no journal, no `makeEntry`, no batch atomicity, no RBAC, no period guard — a sale recorded there cannot produce the balanced entry invariant 2 requires, and its merge rule would silently overwrite the subledger discipline Phases A–D proved.
- **It is not buildable as it stands.** The tree contains `lib/`, `pubspec.yaml`, `codemagic.yaml`, `.github/` — and **no `android/` or `windows/` platform folders**, no `firebase_options.dart`. Even the scaffold's own CI would fail before reaching Dart compilation.
- **Nothing of it is live.** No Play listing, no distributed APK, no user data exists only in its sqflite shape (its Firestore writes, if ever run, used the `users/{uid}` namespace but pre-ERP document shapes). Retirement costs no migration.

**Decision: Phase F builds a new application in the same `flutter-app/` root** (repository history preserves the scaffold; its README is replaced, its CI patterns are the starting point for §7, its package id is kept — §12 Q1). Retrofitting was the alternative and is rejected for a concrete reason: every layer of the scaffold — data, state, models, screens — would be replaced anyway; what would survive is the folder. **Salvaged by reference, not by code:** the warm Material 3 visual starting point, the Codemagic/GHA workflow shapes, and the package id `com.codehubb.dukaanai` (already the id in `firebase/SETUP.md`).

---

## 1. One codebase, two targets

### 1.1 Project shape

A **single Flutter project** at `flutter-app/` (Flutter stable, Dart `>=3.4`), regenerated platform scaffolding (`flutter create --platforms=android,windows .` over the new tree in F1), one `lib/` serving both targets:

```
lib/
  main.dart               — bootstrap: Firebase init, persistence, PinGate, shell
  core/                   — platform-neutral contracts
    ledger.dart           — makeEntry port + entryBalances (F-1)
    periods.dart          — preparePosting port (dateISO + lockedThrough)
    coa.dart              — COA registry port (28 codes: type/normal balance)
    types.dart            — document models mirroring web/lib/types.ts
    selectors.dart        — derived balances (journal-only derivations)
    documents.dart        — nextDocNumber port + series/prefix resolution
    tax.dart              — slab resolution + computeBillTaxes + allocateProRata ports
    permissions.dart      — can() matrix port (data, generated — §6.3)
    pinlock.dart          — PBKDF2 record port (§4.3)
    raast.dart            — payload port (behind the provisional flag, §5.4)
  data/
    store.dart            — the StoreProvider analogue: subscriptions, actions,
                            guardPostings equivalent, batch composition
    firebase_options.dart — injected per build (§7.3), never hand-edited
  features/               — one folder per module (billing/, inventory/, …),
                            screens consume store + selectors only
  platform/               — the seams of §1.2 (interfaces + per-platform impls)
  l10n/                   — GENERATED dictionary (§6) — never hand-edited
  theme/                  — the five token sets (§6.4)
test/                     — the Dart harness (§8)
```

State management: a single store object with listenable state, mirroring the web store's action API name-for-name where the module exists — the web store is the specification of behaviour; the Dart store is a port of it, not a redesign of it. (Framework choice — Provider vs Riverpod vs plain `ChangeNotifier` — is an F1 implementation detail; the design constrains only the shape: one store, actions as methods, derivations as pure functions in `core/` so §8 can test them without widgets.)

### 1.2 Platform seams

Everything platform-specific hides behind an interface in `core/`, with implementations in `platform/` selected at bootstrap — feature code never imports a platform plugin directly:

| Seam | Android impl | Windows impl | Why it is a seam |
|---|---|---|---|
| `ReceiptPrinter` (§5) | ESC/POS raster over Bluetooth/USB + PrintManager share path | PDF render → system print (`printing` package) | Byte pipelines share nothing below the receipt model |
| `FilePicker` / `ShareSink` | Android SAF picker; share sheet | Win32 file dialog; save dialog | CSV import/export, Tally export, backup files |
| `WindowShell` | no-op (single window, OS-managed) | min size, title, remembered geometry | Desktop ergonomics without mobile conditionals in features |
| `SecureRandom`/`SubtleCrypto` | platform CSPRNG + pointycastle PBKDF2 (§4.3) | same | PIN hashing must be KAT-identical on both (§8) |
| `AppPaths` | app documents dir | per-user app data dir | Local exports cache, rejected-write tray (§3.5) |

### 1.3 What "same backend" concretely requires of the project

- Firebase registration for **both** platforms against project `dukan-8246`: Android app (package `com.codehubb.dukaanai`, SHA-1 registered by the owner for any future auth providers) and a **Windows app registered as a web-config app** (Flutter Windows uses the web-style `FirebaseOptions`; there is no `google-services.json` for Windows). Both configs are build inputs injected by CI (§7.3) — placeholder values in the repo, exactly the web's discipline (`lib/firebase.ts` reads config and the repo carries placeholders only).
- Firestore initialised with **persistence enabled** (`Settings(persistenceEnabled: true)`, unlimited cache size) on both targets — §3's backbone. (The web's multi-tab manager has no Flutter analogue and needs none: one app instance per device is the norm; Windows multi-instance is an accepted edge, §11 R-F6.)

---

## 2. Parity matrix — honestly staged

Staging principle: **F1 is the counter** — the set without which a shop cannot trade from the app — plus the guard and sync machinery everything else depends on. Back-office depth follows in dependency order (the same order the web grew: documents → operations → HR/finance depth), and each stage lands whole modules, never half-modules. "Later" means a named later increment of this phase; "web-only (Phase F)" means deliberately not in F at all, with the reason stated.

| Module | Stage | Notes |
|---|---|---|
| Auth (email/password) + role resolution + shop context | **F1** | §4. Same `staffIndex` resolution; missing role ⇒ manager |
| App shell (nav, sync centre, theme picker) | **F1** | Sync centre is F1, not polish — §3.5 makes it a correctness surface |
| PIN lock (launch/idle/manual) + sensitive-action gating | **F1** | §4.3 — device-local port, E4/E5 semantics identical |
| Dashboard (KPIs, chart, attention items) | **F1** | Read-only derivations; attention items incl. negative-stock + duplicate-number flags (§3.4) |
| Billing / POS (create, split payments, tax, hold, finalize, void, returns) | **F1** | The counter's core. Held bills sync as documents like any other — a bill held on the till can be resumed on the phone (this is free: held bills are docs, not device state) |
| Sales counter (quick sale) | **F1** | Same `sale` template |
| Inventory — view, search, product add/edit, stock adjustment, CSV import | **F1** | Cost-price visibility follows the matrix's `(UI)` grain exactly as web |
| Customers directory + udhaar (give standalone, repayment, customer statement) | **F1** | F-6 FIFO derivations ported |
| Day close (per cash account) | **F1** | Journal-derived expected cash, as web |
| Receipt printing + share (bill / counter receipt) | **F1** | §5 |
| Suppliers + purchases + supplier payments | **F2** | Back office; purchase receipt posts the perpetual template |
| Expenses | **F2** | incl. reversal-by-mirror |
| Finance — cash book / account books, P&L, aging, tax position, tax payment, transfers, manual cash entries, capital/drawings | **F2** | All derivations; no new math |
| Journal viewer + trial balance | **F2** | Read-only; the owner's audit window (live-audit Fix 4's surfaces) |
| Reports (the 14) — view, print, share | **F2** | Builders ported; report ≡ screen identities re-proven in Dart (§8) |
| Forecast | **F2** | Pure derivation over sales history — portable, no excuse to defer further |
| Document chain — quotations, sale orders, delivery challans, purchase orders, credit/debit notes, vouchers (RV-/PV-) | **F2** | Conversions post only through the F1 engines, as on web (B §2.2) |
| Cheques registry (capture, deposit, clear, bounce; issued lifecycle) | **F2** | Instrument-on-payment-row model, unchanged |
| Warehouses + stock levels + drift detector | **F3** | |
| Stock transfers (dispatch/receive/close-short) | **F3** | Close-short is the only posting (C §2.3) |
| Manufacturing — BOM, production orders, WIP | **F3** | |
| Job tracker | **F3** | incl. bill-this-job through the billing engine |
| Staff directory + attendance | **F4** | |
| Payroll (runs, payments, advances, slips) | **F4** | Slips print via §5 |
| Loans register | **F4** | Charge rules exactly as D §3.2 (explicit, confirmed, never silent) |
| Fiscal-year close + period close/reopen | **F4** | Owner-only, PIN-gated per E5 list |
| Trial-balance / Tally / CSV exports | **F4** | Tally builder is a pure port (D §5); file leaves via `FilePicker`/`ShareSink` |
| Settings — shop profile, money accounts, tax slabs, doc series, job stages, print design + brand assets, Raast settings | **F4** | Owner-only writes, as web. Print-design *consumption* (receipts honouring the template) is F1 — a counter app that prints yesterday's template is a parity break; the *editor* is F4 |
| Staff & roles management | **F4** | Owner-only |
| AI assistant | **Web-only (Phase F)** | The assistant's key/billing path is server-mediated on the web's server build and has no client-side story on a Spark project: distributing an API key inside an APK is not a design. Revisit when the owner chooses a key strategy (own key per shop, or a Blaze-backed proxy) — flagged as **Open Question Q5**, not silently dropped: the nav slot exists in the matrix (`assistant` module) and the app shows the honest "available on web" state to roles that have it |
| Demo mode | **Web-only** | The public demo's job (a showcase with no login) is already served by the web subdomain. The apps are companions to a real shop login; a demo *account* remains usable in the apps like any account |

**The F1 set, named precisely** (the release the owner first installs): auth + roles · shell + sync centre + themes · PIN lock · dashboard · billing/POS + returns · sales counter · inventory (view/CRUD/adjust/CSV import) · customers + udhaar · day close · thermal/PDF receipt printing honouring the web print template · the Dart core (ledger/guard/selectors) with its §8 suite green. Everything else is F2–F4 in the table's order.

---

## 3. Data, the guard, offline sync, conflicts

### 3.1 The local truth is Firestore's cache — there is no second database

The scaffold's sqflite-truth model is inverted: **Firestore with persistence enabled is the only on-device store.** Subscriptions (`snapshots()`) over the same collections feed the store, exactly as the web's `onSnapshot` listeners do; the persistent cache *is* the offline database, maintained by the SDK, in the same document shapes the web writes. Consequences, all deliberate:

- **No sync translation, ever.** A document written by the phone is byte-for-byte a document the web reads. There is no merge code to audit — the class of bug the scaffold's LWW product merge represented cannot be written.
- **Offline reads are the shop's last-synced state** (plus the device's own queued writes, which the SDK folds into local snapshots with `hasPendingWrites` metadata — the store surfaces this, §3.5).
- Demo seed data is **not** bundled: the apps never call `getSeedJournal` or its kin (invariant 4).

### 3.2 The posting seam in Dart

`core/ledger.dart` + `core/periods.dart` port, function for function:

- `makeEntry(memo, refType, refId, lines, {ts, reversesId, idPrefix})` — filters zero lines, stamps `ts`/`dayOffset`, and **throws on ΣDr ≠ ΣCr** (F-1), with the same error contract.
- `preparePosting(entry, lockedThrough)` — stamps `dateISO` (Asia/Karachi business date) and **throws `PeriodLockedError`** when the entry's business instant is ≤ `lockedThrough` (A5 §5.2), including the legacy `dateISO`-absent reading.
- `guardPostings(entries)` in the store — every posting action runs it over its composed entries **before** composing the `WriteBatch`, exactly the web's ordering (guard first, batch second, so a refusal is atomic — nothing half-commits).
- The batch itself: operational docs + journal entry in **one `WriteBatch`**, committed once — the Dart mirror of `postEntry`/`batchJournal`. There is no code path that writes a journal entry outside a batch, and no action that writes operational money docs without its entry.

**Templates port, they do not get re-derived.** Each posting action's entry shape comes from the web template it mirrors (bill, counter sale, return, purchase, payment, expense, repayment, transfer, cheque lifecycle, payroll, loan, production, close-short, fy-close…). Equivalence is not asserted by inspection — §8's golden fixtures make the TS harness and the Dart suite assert against the *same* composed entries.

**IDs.** New documents and entries created by the apps use Firestore auto-IDs (`collection.doc().id`) or UUIDv4 — opaque, collision-safe across devices (the web's `Date.now()`-derived ids are a single-browser habit the apps do not import). Fixed semantic ids (default money accounts, branding kinds) keep the web's fixed strings where the contract requires them.

### 3.3 Offline queueing and flush

Firestore persistence queues batches while offline and flushes them **in commit order** on reconnect — the SDK's queue is the write queue; the apps build no other. Design points around that fact:

- **Compose-time truth, flush-time backstop.** The guard runs at composition (device clock, local `lockedThrough` from the last-synced owner doc). If a period was locked on another device while this one was offline, queued entries dated inside the lock will be **refused by the rules backstop at flush** — the A5/R-5 shape, now with a phone in the story. The rails compound: (a) the existing rule that a close may not cover today/yesterday (PKT) makes the window small by construction; (b) §3.5's rejected-write tray makes a refusal *visible and recoverable* instead of the web's original invisible failure.
- **Money actions confirm honestly.** When online, a posting action's completion is the batch commit. When offline, the UI states "saved on this device — will post when connection returns" (dictionary copy, both languages) and the document appears in lists with the SDK's pending state. The app never shows an offline-queued bill as server-confirmed; the distinction is one boolean the SDK already maintains.
- **Order is preserved within a device; across devices, order is arrival.** Two devices' offline backlogs flush in whatever order they reconnect. The journal tolerates this *by design*: entries carry their own business `ts`/`dateISO`, derivations sort by business time, and no derivation reads journal insertion order. (The web already lives this way across browser tabs; F extends the population, not the principle.)

### 3.4 The conflict posture — why collisions are structurally rare, and the two real exceptions

The data model's shape does most of the work:

- **The journal is append-only with unique ids** — concurrent appends cannot conflict; there is nothing to merge.
- **Posted operational documents are immutable** (the B §1.4 / audit discipline): after posting, a document's money content never changes; corrections are new documents/entries. The only post-posting writes are **status labels**, which B §1.4 already defines as *cached labels over derived truth* — if two devices race a status write, last-writer-wins on the label is safe because the label is never an input to money, and the next conversion on any client repairs it from the derivation.
- **New documents have unique ids** — creates never collide.
- **Settings and the owner doc are single-writer by role** (owner only) — concurrent settings edits across an owner's two devices are last-writer-wins on a document the owner alone edits; accepted, as on web.
- **Product/stock edits:** two devices editing the same product's *fields* merge as the web merges today (`setDoc` field writes; F invents no new merge semantics — consistency with the web beats a mobile-only rule). **Stock quantities are not a field-merge problem at all**: `stockQty` changes ride journal-posting batches (invariant: inventory moves only through the ledger), so concurrent sales from two tills both post, both decrement the derivation, and the derived stock is the arithmetic truth — **including going negative** when two offline devices sell the last unit. Posture, stated plainly: both sales stand (they happened; customers left with goods), the derived stock shows negative, and the dashboard attention list flags **negative stock** items for the owner's adjustment/recount — the C1 drift/repair machinery is the remedy, not a write-time block. A hard block was considered and rejected: it would require cross-device stock reservation (a server), and refusing a real counter sale because another device *might* have sold the unit is the worse failure at a real till.

**Exception 1 — document numbering (the one shared counter).** §3.6, given its own section because the brief demands a stated strategy.

**Exception 2 — `stockLevels` rows (C1).** Per-warehouse rows are written inside the same posting batches as their journal entries (the C1 discipline), keyed by product+warehouse — concurrent postings from two devices touch *different rows or the same row via separate batches*; Firestore applies them sequentially server-side, each batch's row write being the delta the C1 builders compute from the batch's own documents (not a read-modify-write of a balance — the row is a *mirror* whose truth is re-derivable, and the C1 drift detector exists precisely to repair any mirror that history proves wrong). The apps reuse the web's builders; no new semantics.

### 3.5 The sync centre and the rejected-write tray

A first-class screen (F1), because offline correctness that cannot be seen will not be trusted:

- **Pending count** — from snapshot metadata (`hasPendingWrites` per collection, aggregated): "N changes waiting to sync", per-collection detail on tap.
- **Connection state** — from the SDK's snapshot `isFromCache` + reachability; worded plainly (dictionary), never as a raw error.
- **Rejected tray** — when a queued batch's commit future completes with a rules denial (the §3.3 flush-refusal case, or a role revoked mid-queue), the SDK surfaces the error on the write's future; the store records the failed batch's documents (kept as JSON in `AppPaths` local storage, device-only, never re-uploaded) into a **tray** listing what was refused, when, and the rule-level reason class (period-locked / permission / other). The owner acts from the tray: *discard* (the documents never existed server-side; any local paper printed from them is the shop's to chase — the tray copy says so) or *re-compose as a correction dated today* where the flow supports it (the reversal discipline's mobile form: the correction posts at today's date referencing the refused original's local id in its memo/`reversesId` chain where applicable). Nothing in the tray auto-retries into a different period, and nothing is silently dropped — the tray empties only by an explicit owner/manager act. This is the mobile completion of the A5 commit-failure-surfacing work, not a new policy.

### 3.6 Numbering — the stated strategy

The problem, exactly: numbers are minted client-side as `1 + max(sequence over subscribed documents)` (B §1.3). One browser made collisions a rarity; a counter PC + a till tablet + the owner's phone — any of them possibly offline — makes two devices minting the same `billNo`/series number a *when*, not an *if*, unless the design answers it. The candidate answers, weighed:

| Option | Verdict |
|---|---|
| **Server-minted via transaction** on a `counters` doc | **Rejected for F.** A transaction cannot run offline — minting at finalize would block offline billing, the phase's core scenario. It also needs an additive rules surface (a counters collection writable by selling roles) and breaks the codebase's no-transactions-anywhere pattern. It remains the **Phase G** (multi-branch) conversation, exactly where B §1.3 parked it. |
| **Device-scoped series** (each device mints in its own range or with a device code in the number) | **Rejected.** It changes the printed number format owners and their accountants already read (`QT-104` becomes `QT-T2-104`), breaks the gapless-series expectation, and forks `nextDocNumber`'s contract per client. The number's job is to be a clean human reference on paper; device plumbing does not belong in it. |
| **Keep max+1, harden the inputs, detect the residue** | **Adopted** — below. |

The adopted strategy, in four parts:

1. **The max is taken over the fullest available view.** Minting reads the subscribed collection, which — once a device has synced — already contains *every* device's documents (the subscription is the shop's whole series, not the device's own). The collision window is therefore only *simultaneous offline/unsynced minting*, not ordinary multi-device use.
2. **Online mints re-read before minting.** When the device is online, a finalize/mint first performs a server-source read of the series collection (`GetOptions(source: server)`) and mints from that — one extra read collapses the online race to near zero. Offline mints proceed from the cache (the counter must not stop), accepting the residual window knowingly.
3. **Duplicates are detectable, displayed, never rewritten.** A pure selector (`duplicateNumbers(docs)`) finds any series+number held by more than one document; the dashboard attention list and the affected lists flag them ("two bills numbered 118 — tap to view both"). **Numbers are never renumbered after the fact** (paper is already out; the number is a reference, identity is the doc `id` — B §1.3's own doctrine). The documents remain distinguishable by id, timestamp, device-of-origin stamp (below) and printed content.
4. **Origin stamping.** Every app-composed document and journal entry carries an additive optional field the web already tolerates (unknown fields are inert to web selectors): `originDevice` — a short owner-visible device label (set at first run, e.g. "Counter Tablet"; stored device-locally, changeable in the app's device settings). It makes duplicate forensics — and the rejected tray, and "which till held this bill" — answerable at a glance. Web-composed documents simply lack the field. *(Additive field on documents the client already writes — no rules change: rules validate role/access, not a closed field list, per the v8 file's shape; flagged here so the release audit verifies that claim against the rules text rather than assuming it.)*

Residual risk, stated for the record: two devices finalizing bills in the same series while *both* offline can still produce a duplicate number. Frequency is bounded by (2); consequence is bounded by (3)+(4) — a flagged, explainable duplicate, never a lost or merged sale, because **the money never keys on the number**.

---

## 4. Auth, roles, PIN

### 4.1 Auth — same accounts, same resolution

Firebase Auth **email/password**, the same project. Sign-in resolves the shop exactly as the web does: owner uid ⇒ own namespace; otherwise `staffIndex/{email}` ⇒ `{ ownerUid, role }`; missing role ⇒ **manager** (A §3.1's legacy default, applied identically). Sign-out, password reset (email link), and session persistence use the SDK's defaults (persisted auth state — a counter tablet stays signed in across restarts, which is the point of §4.3's lock). There is no app-specific account, no separate user store, and **no anonymous/demo auth** (§2).

### 4.2 RBAC — one matrix, two enforcements, already aligned

- **Rules enforce** (unchanged v8): every write the apps attempt is already gated server-side by role; a Flutter bug can produce a denial (→ §3.5 tray), never an unauthorised write.
- **The app mirrors the UX gating**: `can()` and the 40-module matrix port to Dart as **generated data** (§6.3) from `web/lib/permissions.ts`, so the mobile matrix cannot drift from the web's — including the `(UI)` grains rules cannot express (cost-price visibility), applied as UI-only exactly as on web.
- Role changes made on the web (owner re-roling a staffer) reach the app on the next `staffIndex`/owner-doc snapshot — no app-side role cache beyond the live subscription.

### 4.3 PIN lock — E4/E5 semantics, ported exactly

The web's PIN is **device-local by design**, and the apps honour that literally: the record is *this device's* record, in *this device's* storage, and is **not** expected to match the PIN on the same person's browser (E §4.2's model — different devices, different records, is a feature the design already chose).

- **Storage:** the platform keystore-backed preferences (`flutter_secure_storage` — Android Keystore / Windows DPAPI) under the same logical key name (`dukaan-ai-pinlock`), holding the same record shape `{ v, salt, hash, iterations: 150000, digits, setAt }` + the prefs half (`idleMinutes`, `gateSensitive`).
- **Hashing:** PBKDF2-HMAC-SHA256, 150,000 iterations, 16-byte salt, 32-byte output — Dart has no built-in PBKDF2; the port uses **pointycastle** behind the `SubtleCrypto` seam (§1.2), and §8 pins it to the **same published known-answer vectors the web's E4 suite uses**, so "same semantics" is a test result, not a hope. Verification compares in constant time.
- **Behaviour:** lock on launch (when a record exists), idle lock on the E4 schedule (activity-reset timer; backgrounding starts the countdown), manual lock from the header, the E4 friction schedule on wrong attempts (5 failures → 30s pause, doubling, 5-minute cap), the sensitive-action gate list **exactly E5's v1 list** (void posted bill · day-close submit · period close/reopen · fiscal close/reopen), default OFF.
- **Recovery:** the account password is the key (E §4.5): "Forgot PIN?" reauthenticates the **signed-in** user via Firebase `reauthenticateWithCredential`; success deletes the record and routes to setting a new one. The app copy carries E §4.1's honesty line in both languages: the PIN guards against a walk-up hand; it is not the account's security.
- There is **no demo-mode recovery path** in the apps (no demo mode, §2) — one recovery story, the real one.

---

## 5. Printing from the apps

### 5.1 The receipt model is shared; the byte pipelines are not

One Dart receipt model — a port of the web's resolved print design (`resolvePrintDesign` + the E1 slot matrix + the E2 stamp rule + brand assets read from the same `branding` docs) — produces a device-independent rendering of the document. Platform pipelines consume it. Figures are the document's own (invariant 6); the template honoured is the shop's *web-saved* template from F1 (the editor is F4, the consumption is F1 — §2).

### 5.2 Android — ESC/POS raster for thermal; the print framework for paper

- **Thermal (the counter default): ESC/POS, committed for F1.** Bluetooth (classic SPP thermal printers — the class of device Pakistani counters actually own) and USB-OTG where the printer/profile supports it. The pipeline is: receipt model → **raster lines** (§5.3) → ESC/POS raster bit-image commands, 80mm profile primary, 58mm secondary, via a maintained ESC/POS package (`esc_pos_utils`-lineage) behind the `ReceiptPrinter` seam. Cash-drawer kick and cutter commands are part of the profile (a till printer that cannot open the drawer is half a till).
- **Paper/PDF on Android:** the same receipt (or any F2+ document/report) rendered to PDF (§5.3) and handed to the Android print framework / share sheet — A4 invoices, statements, reports.
- Printer selection is a device-local preference (last-used printer per class), never synced — printers belong to devices, like PINs.

### 5.3 Urdu on paper — the honest rendering decision

Neither ESC/POS printers nor Dart PDF libraries shape Nastaliq: thermal heads print code-page text or raster; the mainstream Dart `pdf` package lays out embedded TTFs without a full complex-text shaper — the exact failure the web avoided by printing through the browser (E invariant 4). Flutter's **engine**, however, shapes correctly (its text stack is a real shaper, the same class as the browser's). Therefore:

- **All Urdu-bearing print output is rendered by the Flutter engine to raster first** — receipt lines drawn on a canvas at printer DPI for thermal; full pages rendered at ≥ 200 DPI for PDF — and the raster is what the pipeline emits (ESC/POS bit-image; image pages inside a PDF wrapper).
- **Consequences, stated:** printed PDFs are image-pages (text not selectable/searchable — accepted for receipts and shop documents, whose life is paper); thermal Urdu is as crisp as the head's DPI allows and always correctly joined; Latin-only content still travels the same path for uniformity (one pipeline, no per-language surprises).
- Print colours are the E1 hard-coded print palette (invariant 6) — the app's five themes never reach paper on mobile either.

### 5.4 Raast on mobile receipts

The E3 position carries over **unchanged, including its honesty flag**:

- If the shop has a **`raastQrImage` brand asset** (the bank-issued QR), mobile receipts print it verbatim — the verified path, first-class on mobile paper.
- The **generated** SBP P2P payload remains `provisional / pinnedBy: null` in the web source of truth. The Dart port (`core/raast.dart`) exists behind the same status flag, §8 tests its CRC/structure against the web's vectors, and the apps **surface the same "pending verification" state** the web settings show. The generated QR is enabled on mobile receipts only when the web's fixture pins the framing (an E-follow-up act) — until then mobile follows the web: bank image or no QR, never an unverified matrix. The IBAN-in-text line (E §1.9/§3.5) prints regardless, as on web.
- WhatsApp sharing from the app reuses the web's text-bill builder (ported) via the OS share sheet — `wa.me` text only, same as web, no image-attachment pretence.

### 5.5 Windows — system printers via PDF, ESC/POS later (stated)

- **F1 commits to PDF → system printer** (the `printing` package's native dialog + direct-print APIs): A4/A5/thermal-page-size PDFs (§5.3 raster pages inside) print to whatever the shop's Windows knows — laser/inkjet for invoices and statements, and driver-managed thermal printers acceptably for receipts (a Windows thermal driver renders the 80mm PDF page fine; it is slower and less crisp than raw ESC/POS, and the design says so).
- **Raw ESC/POS on Windows** (USB thermal bypassing the driver) is **later than F1** — it needs a Win32 raw-device path with no maintained cross-platform package, and F1 does not pretend otherwise. Shops whose Windows till *is* their thermal counter are served by the driver path in F1 or by an Android till; the gap is named, not hidden.

---

## 6. i18n — one dictionary, generated twice

### 6.1 Source of truth and mechanism

The web's typed dictionaries (27 part files, 2,580 keys, EN ≡ UR by construction) remain the **only** place strings are authored. The Flutter app consumes a **generated artifact**:

- A repo tool (`flutter-app/tools/gen_l10n.mjs`, Node — the workspace's existing runtime) reads the web dictionaries (compiling `web/lib/i18n` the way the harness does, so generation runs against *source*, not a stale bundle) and emits, into `flutter-app/lib/l10n/`: `strings_en.json`, `strings_ur.json`, and a typed Dart accessor class (one getter per key, generated from the key names, with the web's `{placeholder}` interpolation preserved as method parameters where a key carries them).
- **Generated files are never hand-edited** (header comment says so; CI regenerates and diffs — §6.2). A string change is a web-dictionary change; the apps inherit it. New module strings are added to the web dictionary *first* (typed, both languages, parity by the TS compiler) even when the surface being built is mobile-only — the dictionary is the shop's voice, and it has one home.

### 6.2 The parity gate moves into CI

The web guarantees parity at TS compile time; the port's equivalent is mechanical and enforced in the app CI (§7.4): regenerate → `git diff --exit-code lib/l10n` fails the build on drift; key-count and EN≡UR equality are asserted by the generator itself (it refuses to emit on a parity break, mirroring the harness's count pins in spirit). A Flutter build can therefore never ship a dictionary the web wouldn't compile.

### 6.3 The permission matrix and other data tables

`can()`'s matrix, the COA registry (codes → type/normal/sign), and the series/prefix defaults are likewise **generated Dart data** from their TS sources by the same tool family (they are data, not prose — but drift in any of them is a finance bug, so they travel the same generated-and-diffed road). What is *not* generated: posting templates and selectors — those are code, ported by hand and proven by §8's fixtures (generating business logic from TS was considered and rejected: an unreviewable transpilation of the shop's money rules is worse than a tested port).

### 6.4 RTL, fonts, themes in Flutter

- **Directionality** follows locale (`Directionality` at the app root; `ur` ⇒ RTL) — the web's logical-property discipline maps to Flutter's `start/end` alignments; feature code uses directional APIs only (a lint-level rule in F1's `analysis_options`).
- **Urdu typeface:** devices' system Urdu fonts vary from acceptable to absent on cheap tablets; the app **bundles Noto Nastaliq Urdu** (SIL OFL) in one weight for Urdu body text (display sizes use the platform font where Nastaliq metrics would overflow — the port follows the web's `.ur` treatment in spirit: Nastaliq where the web uses it, sizes stepped down for its tall line-height). Latin text uses the platform default (no bundled Latin face — bundle size spent where it matters).
- **Themes:** the five token sets port as Dart `ThemeData` extensions carrying the **same token names and values** as `globals.css`'s `[data-theme]` blocks (emerald/sand/ocean/midnight/dusk — calm, AA-contrast, per the owner's standing theme directive), picked from the same header-style picker, persisted device-locally under the same logical key. Theme *values* are ported constants (a §8 source-invariant test pins the Dart token table against the CSS values for the core tokens, so the two cannot quietly diverge).

---

## 7. CI, build, signing, release

### 7.1 Repository and workflows

The app lives in the existing repo at `flutter-app/`; the scaffold's two workflow files are replaced by a canonical **GitHub Actions** set (the repo's home; Codemagic is retired with the scaffold — two CI truths for one app is how stale builds ship):

| Workflow | Trigger | Jobs |
|---|---|---|
| `app-ci.yml` | push/PR touching `flutter-app/**` or `web/lib/**` (dictionary/matrix sources) | `flutter analyze` (0 issues) · `flutter test` (the §8 Dart harness) · l10n/matrix regeneration drift gate (§6.2) · golden-fixture freshness check (§8.2) |
| `app-release.yml` | manual dispatch or tag `app-v*` | Android: `flutter build apk --release` (+ `--split-per-abi` off; one universal APK for sideload simplicity) · Windows (on `windows-latest`): `flutter build windows --release` → installer (§7.2) · artifacts uploaded with checksums + a build report (versions, signing identity used, test totals) attached to the GitHub release |

Every increment's deliverable is exactly: **source + `app-ci` green + the release workflow's installable artifact + its build report** — mirroring the web phases' "distinct zip + audit" discipline.

### 7.2 Windows packaging

`flutter build windows` produces a folder of binaries, not an installer. F1 packages it with **Inno Setup** (script in-repo, compiled in the release workflow) into a single `DukaanAI-Setup-<version>.exe` — per-user install (no admin), Start-menu + desktop shortcuts, uninstaller. **MSIX** is the considered alternative: proper MSIX install requires a code-signing certificate trusted by the target machines (or Store distribution), which the owner does not hold today; an unsigned/self-signed MSIX that refuses to install on a customer's PC is worse than a classic installer. MSIX is revisited if Play-Store-equivalent distribution for Windows is ever chosen (Q3). Unsigned Inno installers trip SmartScreen's "unknown publisher" prompt on first run — stated in the release notes with the one-tap "Run anyway" instruction, not hidden.

### 7.3 Signing and configuration injection

- **Android release keystore: owner-held.** The owner generates the upload keystore once (instructions ship with F1's release notes) and stores it as GitHub Secrets (`KEYSTORE_BASE64`, passwords, alias). CI decodes it into the runner only. **Until those secrets exist, the release workflow builds with the debug key** and the artifact + release are labelled **`INTERNAL — debug-signed, not for distribution`** in the filename and notes. A debug-signed APK sideloads and runs fine for the owner's own testing — but it can never be uploaded to Play and cannot be updated by a properly-signed build later (signature change = reinstall = the app's local data (PIN record, printer prefs) resets; Firestore data is unaffected, being server-side). The label exists so nobody mistakes an interim build for the shippable one.
- **Firebase config injection:** `google-services.json` (Android) and the Windows `firebase_options.dart` values are supplied by CI from repository secrets/variables — the repo carries **placeholders only**, the web's standing discipline. The owner registers the two apps in the Firebase console once (F1 checklist act, like publishing rules was for the web phases).
- **Flutter SDK in CI:** pinned via the workflow's Flutter version (stable channel, exact version recorded in the build report; bumps are deliberate PRs, never floating — a floating SDK is how "same source, different app" happens).

### 7.4 Versioning — aligned with the web releases

`pubspec.yaml`'s `version: X.Y.Z+N` is the single source: **X.Y tracks the ERP phase lineage** (the apps are born at the Phase F release: `6.0.0`), Z is the app's own patch line for app-only fixes between web releases, `+N` is a monotonically increasing build number (CI-stamped from the run number on release builds). The app displays its version + the data-contract version it speaks (the rules/schema generation — in practice: "works with web releases ≥ Phase A rules v3", stated in Settings → About) so a mismatched shop is diagnosable from the counter. Release tags `app-vX.Y.Z` trigger §7.1's release workflow; the GitHub release notes carry the web-phase changelog entry the build corresponds to.

### 7.5 The acceptance script per increment (emulator-less reality, stated)

There is no device farm and no local SDK; acceptance is therefore three-legged and does not pretend to a fourth:

1. **CI leg** (§7.1): analyze clean, §8 suites green, drift gates clean, artifact produced. This leg is *the* compile test — the first cloud build of an increment is expected to be iterated on (red → fix → green is normal F-phase workflow, budgeted in every increment's scope).
2. **Owner-device leg:** the owner installs the artifact (Android: sideload the APK; Windows: run the installer) and walks the increment's **scripted checklist** (each increment ships one — the F1 script: sign in → sync centre shows 0 pending → record a counter sale offline (airplane mode) → reconnect → the sale appears on the web → print a receipt → lock/unlock with PIN). Checklist results come back like the web phases' live verifications did.
3. **Cross-client leg:** the increment's headline flows are re-verified on the **web** against data the app wrote (and vice versa) — the parity proof that matters: one journal, read by two clients, agreeing to the rupee (the harness identities, observed live).

Firebase Test Lab / cloud emulators are noted as an available future hardening (Spark-tier quotas exist) but are **not** in the F critical path.

---

## 8. The Dart harness — the finance identities, re-proven in Dart

### 8.1 Form

`flutter test` suites under `flutter-app/test/`, organised as the TS harness is (one suite per phase-area), running in `app-ci` on every change. The Dart suites test `core/` (pure Dart — no widgets, no Firebase) with the store's batch composition exercised through a fake Firestore seam (the store composes `WriteBatch` descriptions as data against an interface; tests assert on the composed batches — the same trick the TS harness's structure suggests, adapted: composition is what's proven; the SDK's commit is trusted machinery).

### 8.2 Golden fixtures — the cross-language contract

The strongest mechanism in this design, stated precisely: the **TS harness gains an export step** (`harness/fixtures/`, a small addition in F1 — web-side test tooling only, no app behaviour change) that writes canonical JSON fixtures: for each core scenario, the input documents + settings, and the **exact journal entries the web composes** (accounts, refs, debit/credit to the paisa, `refType`/`refId`, line order normalised by the fixture format). The Dart suite consumes the **same files** and asserts its composed batches match. A template change on either side must move the fixture deliberately (regenerate + diff reviewed) — silent divergence between the web's money math and the app's is thereby made a *reviewable diff*, not a runtime discovery in a shop.

### 8.3 Exactly which identities get Dart tests

**Ported (asserted in Dart):**

- `makeEntry` balance enforcement: throws on every unbalanced construction; zero-line filtering; `entryBalances` over all fixture entries.
- **Every posting template's shape**, via §8.2 fixtures: bill finalize (cash / credit / split / discount / F-2 tolerance to `sales_discount`), taxed sale exclusive + inclusive, counter sale, sale return (item-by-item cumulative reversal to the paisa, incl. tax share), purchase (perpetual clearing nets zero; payables = gross incl. input tax), supplier payment, expense + mirror reversal, udhaar give + repayment (F-6 FIFO effect on derived per-customer balances), money transfer (incl. wallet→wallet GL-net-zero), cheque received → deposit → clear / bounce, cheque issued → clear, payroll accrual (net-per-employee lines, reducers absent from the journal) + payment + advance, loan drawdown (incl. fee-netted) + repayment split, production issue/completion (WIP pool to exactly zero on final completion), transfer close-short (the only transfer posting), FY close entry shape.
- **Derived-selector identities** over fixture journals/document sets: trial balance == 0 for every fixture set; Σ money-account balances == GL `cash`/`wallet` (incl. null-ref `legacyFor` resolution); receivables (GL) == credits subledger; payables (GL) == supplier subledger; Σ `stockLevels` == product `stockQty` mirror; `salaryPayable` GL == Σ employee positions + unassigned bucket; P&L net revenue == sales-report net revenue (+ labelled other-revenue line) over the fixture document set (the live-audit FIX identity); aging buckets == Finance's calls.
- `preparePosting`: `dateISO` stamping (PKT boundary cases) + `lockedThrough` refusal set.
- Numbering: `nextDocNumber` monotonic/gapless-on-drafts behaviour + the `duplicateNumbers` detector's truth table.
- PIN: PBKDF2 known-answer vectors (**the web E4 suite's published vectors**), record round-trip, friction-schedule points.
- Raast: CRC-16 known-answer vector + payload structural tests — behind the provisional flag (§5.4); these prove the port matches the web's builder, not that a bank accepts it (nothing can prove that yet — the flag says so).
- Print-design resolver: the E1 default snapshot + slot-matrix invariants (a challan resolves zero price-bearing columns under every toggle) — the apps print, so the resolver's proofs travel.
- Search null-safety: the SEARCH suite's no-throw fixtures for legacy field-missing shapes (a smaller port — the verbatim-equivalence half stays a TS concern).

**Not ported (stated, with reasons):**

- **Seed-journal identities + SHA** — the seed is web-demo data; the apps never seed (invariant 4). Asserting them in Dart would prove a fact about data the app never creates.
- The TS harness's *source-invariant* checks (grep-level pins over web source, rules-SHA, migration internals) — they police the web tree; the app repo has its own, smaller set (generated-file headers, seam usage).
- Rules-behaviour scenarios — rules are enforced server-side and tested once, at the rules layer (the web's RBAC suite); the apps test that they *compose* rule-conforming writes, via fixtures whose shapes the rules accept.

---

## 9. Implementation order — increments F1…F5

Five increments, each independently installable (distinct artifact + build report + acceptance script, §7.5), each closing with a finance-integrity checkpoint in the house pattern. Order is dependency-driven: core before counter, counter before back office, depth last.

### F1 — Core + the counter release
- New project in `flutter-app/` (scaffold retired per §0.2; platform folders generated; package id kept); CI set (§7.1) **first** — the first cloud build is expected red and iterated to green before features pile up.
- `core/` ports: types, COA, `makeEntry`, `preparePosting`, tax computation + allocator, documents/numbering, selectors for the F1 modules; the store (subscriptions, batch composition, `guardPostings` equivalent, sync metadata, rejected tray); TS-harness fixture export + the §8.3 F1 subset green.
- Features: auth + role resolution, shell + sync centre + five themes, PIN lock (full §4.3 incl. recovery + E5 gate list), dashboard, billing/POS + returns, sales counter, inventory (view/CRUD/adjust/import), customers + udhaar, day close; printing §5 (Android ESC/POS raster + share/PDF; Windows PDF) honouring the web print template + brand assets; i18n generation pipeline (§6) covering the F1 key subset (the whole dictionary is generated; only F1 surfaces consume it).
- **Checkpoint:** §8 F1 suites green in CI; owner-device + cross-client acceptance (§7.5) on the counter script; debug-signed interim artifact labelled per §7.3 until the owner provisions the release keystore.

### F2 — Back office + documents
- Suppliers/purchases/payments, expenses, finance surfaces (books, P&L, aging, tax, transfers, manual entries), journal viewer + trial balance, the 14 reports (view/print/share), forecast, document chain (quotations → orders → challans; POs; notes; vouchers), cheques registry. Fixtures extended to every F2 template; report ≡ screen identities asserted in Dart.
- **Checkpoint:** §8 full-template fixture parity (every web template now has a Dart twin proven equal); cross-client leg on documents (a quotation raised on Windows converts to a bill on the web).

### F3 — Operations
- Warehouses + stock levels + drift surfacing, stock transfers, manufacturing (BOM + production orders), job tracker. WIP/stock identities join §8.
- **Checkpoint:** production + transfer fixtures green; a production order run split across devices (issue on Android, complete on Windows) reconciles to zero WIP.

### F4 — HR, advanced finance, settings editors
- Staff directory + attendance, payroll + slips, loans, fiscal-year close + period management, exports (Tally/CSV), the settings editors (profile, accounts, tax slabs, series, stages, print design + brand assets + Raast, staff & roles).
- **Checkpoint:** payroll/loan/close fixtures green; Tally export from the app byte-compares against the web's export for the same fixture journal (one builder, two ports, §8 fixture).

### F5 — Hardening + distribution readiness
- Windows raw ESC/POS evaluation (§5.5's named gap — implement if the F1–F4 device reality demands it, else document the driver path as the standing answer); Play Store readiness **if the owner provisions signing + a Play account** (Q2): release AAB build, store listing assets from the web brand kit; installer signing evaluation for Windows (Q3); Test-Lab smoke suite if adopted; performance pass on low-end counter hardware (large-journal shops: selector pagination/virtualisation where the web already paginates).
- **Checkpoint:** the phase-end audit (below).

### Phase-end finance-integrity audit checklist (Phase F close — all must pass)
- [ ] §8 suites fully green in CI on the release commit; fixture set covers **every** web posting template (a census: TS `makeEntry` call sites ≡ fixture scenarios ≡ Dart composers).
- [ ] Cross-client journal agreement: a scripted week-in-the-life (mixed postings from web + Android + Windows, incl. offline windows) ends with TB == 0 and every cross-checked figure (cash, receivables, payables, stock value, P&L) identical on all three clients to the rupee.
- [ ] Offline backlog vs period lock: the §3.3 refusal lands in the tray, visibly, with nothing silently lost.
- [ ] Rules file **byte-identical** to its Phase E state (or any delta is the flagged, additive, separately-audited kind — §10.2).
- [ ] Frozen seed identities re-asserted on the web side (untouched by F, proven untouched).
- [ ] i18n: generated dictionary == web dictionary (drift gate green); no hardcoded strings audit on the F surfaces.

---

## 10. Migration & compatibility

### 10.1 There is no data migration — that is the design's central convenience

The apps are new *clients* of existing data. A shop's first app sign-in performs **no writes**: no migration flags, no opening entries, no namespace seeding (contrast the web's `seedV2`/`phaseA` steps — those were for a store being born; an app joining a live shop must be a read-only guest until the user posts something). The `originDevice` field (§3.6) appears only on documents the apps themselves create. Compatibility matrix:

| Combination | Behaviour |
|---|---|
| Web (current) + Android/Windows apps | Full interop — one journal, read identically by all clients (the phase's thesis; §7.5 cross-client leg proves it per increment) |
| Older web build + apps | The apps require the Phase A+ data contract (roles, accounts, `dateISO` backstop) — in practice the live web is at Phase E; the app's About line (§7.4) states the minimum contract so a stale self-hosted web build is diagnosable |
| App offline for days + web trading meanwhile | On reconnect: subscriptions converge to the server's state; the device's queued batches flush in order; refusals (if any) land in the tray (§3.5). Derivations are order-insensitive (§3.3), so convergence needs no reconciliation pass |
| Scaffold-era `flutter-app` installs | None exist in the wild (§0.2) — no upgrade path owed. If the owner has a scaffold APK on a personal device, it is uninstalled, not upgraded (different data model; same package id means the new app *replaces* it on install — its sqflite demo data is discarded with it, which is correct: it was fictional demo data) |
| Release-key signing switch (§7.3) | Debug-signed interim → release-signed: Android treats as a different app (uninstall/reinstall; device-local PIN/printer prefs reset; **no shop data is on the device to lose** — Firestore is the store) |

### 10.2 Rules

**No rules change ships with Phase F.** The v8 rules (594 lines) gate by role and shape, both client-agnostic; the apps' writes are the same documents the web writes. Two claims inside that sentence are verified, not assumed, at F1's checkpoint: (i) the rules impose no closed field list that `originDevice` would violate; (ii) `staffIndex` role reads work for a non-web client (they are plain `get()`s on documents any authenticated client may read per the existing grants). If either check fails, the remedy is a drafted **additive** rules block, published rules-first under the standing rollout discipline (A §6.2) and recorded as a phase finding — never bundled silently into an app release.

---

## 11. Risk list

| # | Risk | Severity | Mitigation in this design |
|---|---|---|---|
| R-F1 | First-cloud-build reality: no local SDK means every increment's first CI run is its first compile; a platform/plugin surprise (esp. ESC/POS Bluetooth permissions on newer Android) can eat an increment's budget | High | CI lands before features (F1 order); increments sized for red→green iteration; platform seams (§1.2) keep a plugin swap local; Bluetooth permission model (Android 12+ runtime permissions) is an F1 checklist item, not a discovery |
| R-F2 | Template drift: a web template fixed in a later phase (a G/H fix) is not re-ported, and the apps quietly compose yesterday's entry | High | §8.2 golden fixtures make divergence a CI failure on either side's change — the fixture diff is the tripwire; the phase-end census (§9) re-counts templates |
| R-F3 | Offline backlog meets a period locked from another device; queued entries refuse at flush | Medium | A5's today/yesterday rail bounds the window; §3.5 tray makes refusals visible + recoverable; nothing auto-reposts |
| R-F4 | Duplicate document numbers from simultaneous offline minting | Medium | §3.6: fullest-view max, server re-read when online, derived duplicate detection + dashboard flag, numbers never rewritten; money never keys on numbers |
| R-F5 | Negative stock from concurrent offline sales of the last unit | Medium | Accepted by design (§3.4): both sales stand, derivation tells the truth, attention list flags, C1 repair machinery is the remedy. A block would need a server |
| R-F6 | Windows multi-instance / Android multi-profile edge: two app instances on one device hold two PIN records / printer prefs / trays | Low | Device-local state is per-install by definition (E4's model); documented in the app About; no design contortion for a rare shape |
| R-F7 | Bundle/font weight: bundled Nastaliq + five themes + Firebase on low-end tablets | Low | One font weight bundled; APK size is a build-report line item from F1 so growth is watched, not discovered |
| R-F8 | Debug-signed interim builds circulate beyond the owner and later cannot update to the signed release | Medium | §7.3's labelling (filename + notes + in-app About shows signing identity class); F1 release notes instruct owner-only circulation |
| R-F9 | Flutter/Firebase plugin churn breaks Windows builds (the youngest target) | Medium | SDK + plugin versions pinned; bumps are deliberate PRs with the full §8 suite as the gate (§7.3) |
| R-F10 | The generated-Raast temptation: pressure to "just enable" the Dart QR port before the web fixture pins the framing | Medium | §5.4 carries the web's provisional flag into the app verbatim; enabling is a data event (fixture pinned) not a code preference |

---

## 12. Decisions by precedent vs open questions; what Phase F does NOT do

### 12.1 Settled by precedent (no owner input needed — recorded so they are not re-litigated)

- **Firestore cache is the only on-device store** — the scaffold's sqflite-truth + LWW merge contradicts invariants 1–3 and is retired with it (§0.2, §3.1).
- **Templates port; fixtures prove** — no transpiled business logic, no re-derived math (§6.3, §8.2).
- **Numbering stays client-side max+1** — transactions are impossible offline and device-series forks the printed contract (§3.6); Phase G owns the counter conversation.
- **PIN is per-device and never synced** — E4 already decided the model; the apps inherit it, including its honesty copy (§4.3).
- **Print is engine-rasterised for Urdu and theme-independent** — E invariants 3+4 applied to a new pipeline (§5.3).
- **The dictionary has one home (the web's)** — mobile strings are generated, never forked (§6.1).
- **Rules ship unchanged** — a conforming client needs no delta; any exception follows the rules-first additive discipline (§10.2).

### 12.2 Open questions (owner's call genuinely needed — recommendations given)

- **Q1 — App name & bundle id.** The scaffold and `firebase/SETUP.md` already use package **`com.codehubb.dukaanai`**, display name "Dukaan AI". *Recommendation: keep both.* The id is a one-way door (changing it later orphans installs and the Firebase registration); the existing id is clean, owned, and already documented. Confirm once, at F1.
- **Q2 — Play Store vs sideload-first.** *Recommendation: sideload-first.* Phase F ships installable APKs (owner + his shops install directly — the actual distribution the owner's businesses need today); Play requires the release keystore, a Play developer account, and store review overhead, and adds nothing for known-shop distribution. The release workflow gains an AAB job in F5 *if* the owner opts in — the door is kept open, not walked through.
- **Q3 — Windows installer format.** *Recommendation: Inno Setup `.exe`, per-user, unsigned at first* (§7.2), with the SmartScreen note written plainly in the release notes. MSIX becomes right if a signing certificate or Store distribution enters the picture; code-signing the Inno installer with an OV certificate is the middle step if SmartScreen friction proves real in the owner's shops.
- **Q4 — Minimum Android version.** *Recommendation: API 24 (Android 7.0).* Current Flutter stable's floor and the Firebase plugins sit comfortably there, and API 24 covers the cheap counter tablets/hand-me-down phones the target shops run; going lower buys ~no real devices and costs plugin compatibility. Windows floor follows Flutter's own: Windows 10 (1809)+.
- **Q5 — AI assistant on mobile.** Parked as web-only (§2) for one reason: the key/billing path. *Recommendation: decide with Phase G's SaaS conversation* — per-shop own-key entry (a settings field + client calls) is buildable on Spark today if the owner accepts shops supplying their own Gemini keys; a shared proxy needs Blaze. Either is a small increment *after* the choice; guessing now would bake a billing assumption into F1.
- **Q6 — One owner's several shops (pre-G multi-business).** Until Phase G's switcher, a staffer serving two of the owner's shops signs out/in per shop in the app (the web is identical today). *Recommendation: accept for F*; the app remembers the last-used account email to soften the loop, and G designs the real switcher once for all clients.

### 12.3 What Phase F deliberately does NOT do

- **No iOS app.** The roadmap's Phase F is Android + Windows; the codebase stays iOS-*capable* (no Android-only APIs in `core/`/`features/`) so a future phase can add the target, but no iOS build, signing, or App Store path is designed or promised here.
- **No server component, no Cloud Functions, no Blaze assumption** (invariant 1) — including for push notifications: F ships none (a notification story without a server is a polling story; the sync centre is the honest substitute).
- **No change to any web behaviour** — the web app gains exactly one thing from F: the harness fixture export (§8.2, test tooling). If an increment believes it needs a web change, that is a finding to report, not a liberty to take (the B §12 discipline).
- **No offline stock reservation / hard stock blocks** (§3.4) and **no renumbering of duplicates** (§3.6) — the two "obvious" fixes that would each break a deeper invariant.
- **No Play Store, no MSIX, no auto-update channel in F1–F4** — distribution is owner-installed artifacts (§7); F5 revisits with Q2/Q3 answered.

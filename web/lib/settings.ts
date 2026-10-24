/**
 * Dukaan AI — the owner doc → shop settings parse (Fix Round 1 · F1).
 *
 * Shop settings live ON the owner doc (`users/{uid}`) itself; every
 * settings write is a field-level merge onto that doc, and the cloud
 * store rebuilds its settings state from each snapshot. That rebuild
 * is THIS function — the single source of truth for which doc fields
 * are settings, shared by the store and the verification harness.
 *
 * Why this module exists (the F1 root cause): the rebuild used to
 * live inline in the store as a hand-maintained field list. Every
 * phase that added a settings family had to remember to extend it;
 * E2's note in the store records the print-design family being
 * dropped exactly this way, and Phase H's families — `loyalty`,
 * `storefront`, `whatsapp`, `storefrontSlug`, and E3's Raast pair —
 * never landed in the list at all. On a cloud shop the write
 * succeeded in Firestore (the owner doc rule is a plain owner
 * write) and the Settings surface honestly toasted "Saved", but the
 * very next snapshot rebuilt settings WITHOUT the field, so the
 * resolver read its absence as "programme off" forever: the loyalty
 * toggle reverted on navigation, the desk read programme-off, and
 * bills earned 0 points — the owner's live test of 2026-10-24.
 * The demo/local path never showed it (it spreads the stored
 * settings whole), and the harness exercised the resolvers, not
 * this parse — so the fix puts the parse where the harness can
 * hold it: a legacy-shaped doc goes in, every settings family must
 * come out.
 */
import { resolveStaffRole } from "./permissions";
import type { ShopSettings, StaffMember } from "./types";

/** The owner doc's `staff[]` management record, defensively read:
 *  trimmed/lowercased emails, deduped, unknown roles resolving to
 *  the legacy default (lib/permissions' `resolveStaffRole`). */
export function parseStaff(raw: unknown): StaffMember[] {
  if (!Array.isArray(raw)) return [];
  const out: StaffMember[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const m = item as Partial<StaffMember> | null;
    const email = typeof m?.email === "string" ? m.email.trim().toLowerCase() : "";
    if (!email || seen.has(email)) continue;
    seen.add(email);
    out.push({
      email,
      role: resolveStaffRole(m?.role),
      addedAt: typeof m?.addedAt === "string" ? m.addedAt : "",
    });
  }
  return out;
}

/**
 * Rebuild the shop settings from an owner doc's data — EVERY
 * `ShopSettings` field, in interface order. Adding a settings field
 * to lib/types without adding it here fails the FR1 harness suite,
 * which asserts each family survives this parse.
 */
export function settingsFromOwnerDoc(
  d: Record<string, unknown>
): ShopSettings {
  return {
    shopName: String(d.shopName ?? ""),
    address: String(d.address ?? ""),
    phone: String(d.phone ?? ""),
    shopNameAlt:
      typeof d.shopNameAlt === "string" ? d.shopNameAlt : undefined,
    printDesign:
      (d.printDesign as ShopSettings["printDesign"]) ?? undefined,
    // Phase E · E3: the Raast beneficiary pair (the generated-QR
    // settings) — dropped by the old inline parse with the rest of
    // the post-E2 families.
    raastIban:
      typeof d.raastIban === "string" ? d.raastIban : undefined,
    raastFiName:
      typeof d.raastFiName === "string" ? d.raastFiName : undefined,
    staffEmails: Array.isArray(d.staffEmails)
      ? (d.staffEmails as string[])
      : [],
    staff: parseStaff(d.staff),
    defaultSalesTaxSlabId:
      (d.defaultSalesTaxSlabId as string | null) ?? null,
    defaultPurchaseTaxSlabId:
      (d.defaultPurchaseTaxSlabId as string | null) ?? null,
    // A5: the fiscal-year start + the period-lock enforcement value
    // live on this doc too.
    fiscalYearStartMonth:
      typeof d.fiscalYearStartMonth === "number"
        ? d.fiscalYearStartMonth
        : undefined,
    fiscalYearStartDay:
      typeof d.fiscalYearStartDay === "number"
        ? d.fiscalYearStartDay
        : undefined,
    lockedThrough: typeof d.lockedThrough === "string" ? d.lockedThrough : "",
    phaseA: (d.phaseA as ShopSettings["phaseA"]) ?? undefined,
    // Phase C · C1: the stockV1 migration flag.
    phaseC: (d.phaseC as ShopSettings["phaseC"]) ?? undefined,
    // Phase D · D1: the hrV1 migration flag + the D5 Tally
    // ledger-name overrides (declared in D1).
    phaseD: (d.phaseD as ShopSettings["phaseD"]) ?? undefined,
    tallyLedgerNames:
      (d.tallyLedgerNames as ShopSettings["tallyLedgerNames"]) ?? undefined,
    // Phase H · H1: the loyalty programme's terms — THE F1 field.
    loyalty: (d.loyalty as ShopSettings["loyalty"]) ?? undefined,
    // Phase H · H3: the storefront publish preferences + the
    // claimed slug cached on the owner doc at publish time.
    storefront:
      (d.storefront as ShopSettings["storefront"]) ?? undefined,
    storefrontSlug:
      (d.storefrontSlug as string | null | undefined) ?? undefined,
    // Phase H · WhatsApp: the service-reminder interval block.
    whatsapp: (d.whatsapp as ShopSettings["whatsapp"]) ?? undefined,
    // Phase B · B1: document-numbering prefix overrides.
    docSeries: (d.docSeries as ShopSettings["docSeries"]) ?? undefined,
    // Phase C · C4: the production desk's settlement preference
    // (§4.4 + Q3).
    productionSettlement:
      d.productionSettlement === "accrue" ? "accrue" : undefined,
    productionAccountId:
      typeof d.productionAccountId === "string"
        ? (d.productionAccountId as string)
        : undefined,
    // Phase C · C5: the workshop's job stage names (§5.2) — shop
    // data on this doc, like the series prefixes.
    jobStages: Array.isArray(d.jobStages)
      ? (d.jobStages as unknown[]).filter(
          (s): s is string => typeof s === "string"
        )
      : undefined,
  };
}

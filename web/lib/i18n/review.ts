/**
 * Dukaan AI — PS/FA review state (Phase H design §4.1/§4.2).
 *
 * The review manifest (review-manifest.json, product data in the repo)
 * carries one draft|reviewed state per Pashto/Farsi key. Review is a
 * HUMAN act with a name on it: states flip only through the review
 * workflow (harness/gen-review-packs.mjs out, harness/review-merge.mjs
 * back) — nothing in the app ever writes the manifest, and there is no
 * runtime machine translation anywhere. This module only READS it:
 *
 * - localeReview(lang)  → { total, reviewed, complete, reviewer, date }
 * - localeIsDraft(lang) → the badge rule (§4.2): while any key of a
 *   PS/FA locale is still a draft, the locale wears the "Draft
 *   preview" label in the picker and in Settings. At 100% reviewed the
 *   badge drops — per language, independently. EN is the source and
 *   UR is the owner's reviewed second; neither is tracked or badged.
 */
import type { I18nKey, Lang } from "./index";
import manifest from "./review-manifest.json";

export type ReviewState = "draft" | "reviewed";

interface LangManifest {
  reviewer: string | null;
  date: string | null;
  states: Record<string, ReviewState>;
}

const MANIFEST = manifest as unknown as {
  version: number;
  copyThroughAllowed?: string[];
  ps: LangManifest;
  fa: LangManifest;
};

export type DraftLang = "ps" | "fa";

export function isDraftLang(lang: Lang): lang is DraftLang {
  return lang === "ps" || lang === "fa";
}

/** The manifest block for a draft locale; null for en/ur. */
export function langManifest(lang: Lang): LangManifest | null {
  return isDraftLang(lang) ? MANIFEST[lang] : null;
}

/** One key's review state; null when the locale is untracked (en/ur)
 *  or the key is unaccounted (the parity gate fails on that — §4.4). */
export function reviewStateOf(lang: Lang, key: I18nKey): ReviewState | null {
  const m = langManifest(lang);
  return m ? (m.states[key] ?? null) : null;
}

export interface LocaleReview {
  total: number;
  reviewed: number;
  /** reviewed === total (and total > 0). */
  complete: boolean;
  reviewer: string | null;
  date: string | null;
}

/** The badge state machine, pure over a states map (the harness pins
 *  its transitions: any draft → incomplete; all reviewed → complete;
 *  an empty map is never "complete"). */
export function reviewSummary(
  states: Record<string, ReviewState>
): { total: number; reviewed: number; complete: boolean } {
  const values = Object.values(states);
  const reviewed = values.filter((s) => s === "reviewed").length;
  return {
    total: values.length,
    reviewed,
    complete: values.length > 0 && reviewed === values.length,
  };
}

export function localeReview(lang: Lang): LocaleReview | null {
  const m = langManifest(lang);
  if (!m) return null;
  return { ...reviewSummary(m.states), reviewer: m.reviewer, date: m.date };
}

/** §4.2 badge rule: a PS/FA locale is a labelled draft until every
 *  accounted key is reviewed. Derived from the manifest, never stored. */
export function localeIsDraft(lang: Lang): boolean {
  const r = localeReview(lang);
  return r !== null && !r.complete;
}

/** Keys whose PS/FA value may legitimately equal the EN source
 *  (language self-names, brand-only strings, pure tokens) — the
 *  manifest's own copy-through whitelist, enforced by the gates. */
export function copyThroughAllowed(): readonly string[] {
  return MANIFEST.copyThroughAllowed ?? [];
}

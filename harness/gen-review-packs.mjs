#!/usr/bin/env node
/**
 * Dukaan AI — PS/FA review-pack generator (Phase H design §4.3).
 *
 * Emits, per draft language, a review pack under
 * web/lib/i18n/review-packs/:
 *   <lang>-review-pack.csv  — machine-readable; the merge tool
 *                              (harness/review-merge.js) consumes the
 *                              corrected return of THIS file.
 *   <lang>-review-pack.md   — the readable sheet: EN, UR and the
 *                              draft side by side, grouped by surface.
 *
 * Grouping puts MONEY SURFACES FIRST (billing, finance, reports,
 * print) so a reviewer with one sitting covers the strings a wrong
 * word would hurt most (§4.3, risk R-H5); the rest follow.
 *
 * CSV columns: key, surface, en, ur, draft, corrected, seen
 *   draft     — the current dictionary value; the merge tool treats
 *               it as the drift base and refuses a stale pack.
 *   corrected — the reviewer writes the fixed text here (blank =
 *               draft stands).
 *   seen      — the reviewer marks 1 on every row they have read;
 *               exactly those keys flip to "reviewed" on merge.
 *
 * Usage: node harness/gen-review-packs.mjs
 * Sources: the COMPILED web dictionaries (harness/out), like gen_l10n.
 */
import { createRequire } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const require = createRequire(import.meta.url);
const i18n = require(join(repoRoot, "harness", "out", "i18n", "index.js"));

/** Surface order: money first (§4.3), then the working surfaces. */
const SURFACE_ORDER = [
  "billing", "fin", "reports", "print",
  "sales", "docs", "dc", "chq", "credit", "cust", "exp",
  "inv", "sup", "wh", "tr", "mfg", "jobs", "hr", "loyalty",
  "store", "wa", "dash", "common", "shell", "auth", "settings",
  "tax", "notes", "ai", "platform",
];

/** key → part, from the compiled part modules (en exports). */
const partOfKey = new Map();
{
  const { readdirSync } = await import("node:fs");
  const partsDir = join(repoRoot, "harness", "out", "i18n", "parts");
  for (const f of readdirSync(partsDir)) {
    if (!f.endsWith(".js") || f.includes(".ps.") || f.includes(".fa.")) continue;
    const mod = require(join(partsDir, f));
    const enName = Object.keys(mod).find((k) => k.startsWith("en"));
    if (!enName) continue;
    const part = f.replace(/\.js$/, "");
    for (const key of Object.keys(mod[enName])) partOfKey.set(key, part);
  }
}

const enKeys = Object.keys(i18n.en);
const unmapped = enKeys.filter((k) => !partOfKey.has(k));
if (unmapped.length > 0) {
  console.error(`pack: ${unmapped.length} keys with no part: ${unmapped.slice(0, 5).join(", ")}`);
  process.exit(1);
}

function surfaceRank(part) {
  const i = SURFACE_ORDER.indexOf(part);
  return i === -1 ? SURFACE_ORDER.length : i;
}
const rows = enKeys
  .map((key) => ({ key, surface: partOfKey.get(key) }))
  .sort((a, b) => surfaceRank(a.surface) - surfaceRank(b.surface) || a.key.localeCompare(b.key));

function csvCell(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const outDir = join(repoRoot, "web", "lib", "i18n", "review-packs");
mkdirSync(outDir, { recursive: true });

for (const lang of ["ps", "fa"]) {
  const dict = i18n[lang];
  const langName = lang === "ps" ? "Pashto (پښتو)" : "Farsi / Dari (فارسی)";

  const csv = [
    "key,surface,en,ur,draft,corrected,seen",
    ...rows.map((r) =>
      [r.key, r.surface, csvCell(i18n.en[r.key]), csvCell(i18n.ur[r.key]), csvCell(dict[r.key]), "", ""].join(",")
    ),
  ].join("\n") + "\n";
  writeFileSync(join(outDir, `${lang}-review-pack.csv`), csv);

  const md = [];
  md.push(`# Dukaan AI — ${langName} review pack`);
  md.push("");
  md.push(
    "Every UI string in the product, with the English source, the reviewed Urdu, and the " +
      `${langName} MACHINE DRAFT side by side. Correct the draft in place (edit the CSV twin of this ` +
      "sheet: put fixed text in `corrected`, mark `1` in `seen` for every row you have read). " +
      "Money surfaces (billing, finance, reports, print) come first on purpose. " +
      "Keys you mark seen become `reviewed` when the pack is merged; the language keeps its " +
      '"Draft preview" badge until every key is reviewed.'
  );
  md.push("");
  let current = null;
  for (const r of rows) {
    if (r.surface !== current) {
      current = r.surface;
      md.push(`## ${current}`);
      md.push("");
      md.push("| Key | English | اردو | Draft |");
      md.push("| --- | --- | --- | --- |");
    }
    const cell = (v) => String(v ?? "").replace(/\|/g, "\\|").replace(/\n/g, "<br>");
    md.push(`| \`${r.key}\` | ${cell(i18n.en[r.key])} | ${cell(i18n.ur[r.key])} | ${cell(dict[r.key])} |`);
  }
  md.push("");
  writeFileSync(join(outDir, `${lang}-review-pack.md`), md.join("\n"));
  console.log(`${lang}: wrote review pack (${rows.length} keys)`);
}

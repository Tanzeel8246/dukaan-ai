#!/usr/bin/env node
/**
 * Dukaan AI — review-manifest generator (Phase H design §4.1/§4.3).
 *
 * web/lib/i18n/review-manifest.json is product data in the repo: one
 * draft|reviewed state per PS/FA dictionary key, plus the reviewer +
 * date per language. This tool (re)builds it from the COMPILED web
 * dictionaries (harness/out), keyed on the EN key set:
 *
 *   - a key with no manifest entry GAINS one, as "draft" (an
 *     unreviewed key may exist; an unaccounted key may not — §4.1);
 *   - an existing state is PRESERVED verbatim (re-running the
 *     generator never un-reviews a key);
 *   - a state naming a key the dictionary no longer has is dropped
 *     and reported;
 *   - reviewer/date/copyThroughAllowed are preserved.
 *
 * Usage: node harness/gen-review-manifest.mjs [--check]
 *   --check  exit 1 (listing drift) if the committed manifest differs
 *            from a fresh generation; writes nothing.
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const manifestPath = join(repoRoot, "web", "lib", "i18n", "review-manifest.json");
const require = createRequire(import.meta.url);

const i18n = require(join(repoRoot, "harness", "out", "i18n", "index.js"));
const enKeys = Object.keys(i18n.en).sort();

const check = process.argv.includes("--check");
const existing = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, "utf8"))
  : null;

function buildLang(lang) {
  const prev = existing?.[lang] ?? {};
  const prevStates = prev.states ?? {};
  const states = {};
  let kept = 0;
  for (const k of enKeys) {
    if (prevStates[k] === "reviewed" || prevStates[k] === "draft") {
      states[k] = prevStates[k];
      kept++;
    } else {
      states[k] = "draft";
    }
  }
  const dropped = Object.keys(prevStates).filter((k) => !(k in states));
  return {
    block: {
      reviewer: prev.reviewer ?? null,
      date: prev.date ?? null,
      states,
    },
    kept,
    dropped,
  };
}

const psB = buildLang("ps");
const faB = buildLang("fa");
const next = {
  version: 1,
  copyThroughAllowed: existing?.copyThroughAllowed ?? [],
  ps: psB.block,
  fa: faB.block,
};
const text = JSON.stringify(next, null, 1) + "\n";

for (const [lang, b] of [["ps", psB], ["fa", faB]]) {
  const reviewed = Object.values(b.block.states).filter((s) => s === "reviewed").length;
  console.log(
    `${lang}: ${Object.keys(b.block.states).length} states (${reviewed} reviewed, ` +
      `${Object.keys(b.block.states).length - reviewed} draft); kept ${b.kept}, dropped ${b.dropped.length}` +
      (b.dropped.length ? ` — dropped: ${b.dropped.slice(0, 10).join(", ")}` : "")
  );
}

if (check) {
  const current = existsSync(manifestPath) ? readFileSync(manifestPath, "utf8") : "";
  if (current !== text) {
    console.error("DRIFT: review-manifest.json differs from a fresh generation");
    process.exit(1);
  }
  console.log("review manifest: clean");
} else {
  writeFileSync(manifestPath, text);
  console.log(`wrote ${manifestPath}`);
}

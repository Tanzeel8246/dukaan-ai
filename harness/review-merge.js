"use strict";
/**
 * Dukaan AI — PS/FA review-pack merge tool (Phase H design §4.3).
 *
 * A reviewer returns the pack CSV (harness/gen-review-packs.mjs) with
 * corrections in `corrected` and `1` in `seen` for the rows they read.
 * This tool merges it back — and ONLY this tool flips manifest states:
 *
 *   (a) draft strings are replaced by the reviewer's corrected text;
 *   (b) exactly the keys the pack marks seen flip draft → reviewed;
 *   (c) a pack whose key set has drifted from the current dictionary
 *       is REFUSED (a stale pack reviews a product that no longer
 *       exists), and so is a seen/corrected row whose `draft` base no
 *       longer matches the current value.
 *
 * States never move backwards: a reviewed key stays reviewed (a new
 * correction on it is a re-review — the value updates, the state
 * stands). The manifest's reviewer + date are stamped on apply.
 *
 * CLI:
 *   node harness/review-merge.js --lang ps --pack <csv> --reviewer "Name" [--write]
 * Without --write it prints the plan and changes nothing. After a
 * --write, recompile the web dictionaries, regenerate the Dart side
 * (flutter-app/tools/gen_l10n.mjs) and run the gates.
 *
 * The pure core (parsePack / planMerge) is exported for the harness.
 */
const fs = require("node:fs");
const path = require("node:path");

/* ---------------- CSV (RFC 4180, as emitted by the pack generator) ---------------- */

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  const src = String(text).replace(/\r\n/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || r[0] !== "");
}

/** Pack CSV text → [{ key, surface, en, ur, draft, corrected, seen }]. */
function parsePack(text) {
  const rows = parseCsv(text);
  if (rows.length === 0) throw new Error("pack: empty file");
  const header = rows[0].map((c) => c.trim());
  const want = ["key", "surface", "en", "ur", "draft", "corrected", "seen"];
  if (JSON.stringify(header) !== JSON.stringify(want)) {
    throw new Error(`pack: unexpected header [${header.join(",")}] — expected [${want.join(",")}]`);
  }
  return rows.slice(1).map((r, i) => {
    if (r.length !== 7) throw new Error(`pack: row ${i + 2} has ${r.length} cells, expected 7`);
    return {
      key: r[0],
      surface: r[1],
      en: r[2],
      ur: r[3],
      draft: r[4],
      corrected: r[5],
      seen: r[6].trim() === "1" || r[6].trim().toLowerCase() === "yes",
    };
  });
}

/* ---------------- the merge plan (pure) ---------------- */

/**
 * Plan a merge. Refuses (ok:false, errors[]) on:
 *  - no reviewer name (review is a human act with a name on it — §4.1);
 *  - key-set drift between pack and current dictionary (§4.3c);
 *  - a seen or corrected row whose draft base ≠ the current value
 *    (that row was reviewed against text the product no longer has).
 * Base drift on rows the reviewer did not touch is reported as a
 * warning only — those rows change nothing.
 */
function planMerge({ rows, dict, states, reviewer }) {
  const errors = [];
  const warnings = [];
  if (!reviewer || !String(reviewer).trim()) {
    errors.push({ type: "no-reviewer" });
  }
  const packKeys = rows.map((r) => r.key);
  const dictKeys = Object.keys(dict);
  const packSet = new Set(packKeys);
  const dictSet = new Set(dictKeys);
  const missing = dictKeys.filter((k) => !packSet.has(k));
  const extra = packKeys.filter((k) => !dictSet.has(k));
  if (packKeys.length !== packSet.size) {
    errors.push({ type: "duplicate-keys" });
  }
  if (missing.length > 0 || extra.length > 0) {
    errors.push({ type: "drift-keys", missing: missing.slice(0, 20), extra: extra.slice(0, 20),
      missingCount: missing.length, extraCount: extra.length });
  }

  const updates = [];
  const flips = [];
  const alreadyReviewed = [];
  let staleUntouched = 0;
  if (errors.length === 0) {
    for (const r of rows) {
      const touched = r.seen || r.corrected !== "";
      if (r.draft !== dict[r.key]) {
        if (touched) {
          errors.push({ type: "drift-base", key: r.key });
        } else {
          staleUntouched++;
        }
        continue;
      }
      if (r.corrected !== "" && r.corrected !== dict[r.key]) {
        updates.push({ key: r.key, from: dict[r.key], to: r.corrected });
      }
      if (r.seen) {
        if (states[r.key] === "draft") flips.push(r.key);
        else if (states[r.key] === "reviewed") alreadyReviewed.push(r.key);
      }
    }
    if (staleUntouched > 0) warnings.push({ type: "stale-untouched", count: staleUntouched });
  }
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    updates,
    flips,
    alreadyReviewed,
    totals: { packRows: rows.length, dictKeys: dictKeys.length },
  };
}

/* ---------------- apply (repo-shaped; CLI only) ---------------- */

const PART_EXPORT = (lang, part) =>
  `${lang}${part.charAt(0).toUpperCase()}${part.slice(1)}`;

function satelliteHeader(lang, part) {
  if (lang === "ps") {
    return (
      `/** i18n part: ${part} — Pashto (پښتو) DRAFT dictionary (Phase H design §4.1).\n` +
      ` *  Machine-drafted once at build time; every key's review state lives in\n` +
      ` *  ../review-manifest.json. A draft is a starting point for a named human\n` +
      ` *  reviewer — never finished copy, never runtime translation. */`
    );
  }
  return (
    `/** i18n part: ${part} — Farsi / Dari (فارسی) DRAFT dictionary (Phase H design §4.1).\n` +
    ` *  Machine-drafted once at build time; every key's review state lives in\n` +
    ` *  ../review-manifest.json. A draft is a starting point for a named human\n` +
    ` *  reviewer — never finished copy, never runtime translation. */`
  );
}

function renderSatellite(lang, part, enObj, values) {
  const lines = [
    satelliteHeader(lang, part),
    `import type { en${part.charAt(0).toUpperCase()}${part.slice(1)} } from "./${part}";`,
    "",
    `export const ${PART_EXPORT(lang, part)}: Record<keyof typeof en${part.charAt(0).toUpperCase()}${part.slice(1)}, string> = {`,
  ];
  for (const key of Object.keys(enObj)) {
    lines.push(`  ${JSON.stringify(key)}: ${JSON.stringify(values[key])},`);
  }
  lines.push("};", "");
  return lines.join("\n");
}

function applyToRepo({ repoRoot, lang, plan, reviewer, date }) {
  const outParts = path.join(repoRoot, "harness", "out", "i18n", "parts");
  const i18n = require(path.join(repoRoot, "harness", "out", "i18n", "index.js"));
  const dict = { ...i18n[lang] };
  for (const u of plan.updates) dict[u.key] = u.to;

  // key → part, from the compiled EN part modules.
  const partOfKey = new Map();
  const enParts = new Map();
  for (const f of fs.readdirSync(outParts)) {
    if (!f.endsWith(".js") || f.includes(".ps.") || f.includes(".fa.")) continue;
    const mod = require(path.join(outParts, f));
    const enName = Object.keys(mod).find((k) => k.startsWith("en"));
    if (!enName) continue;
    const part = f.replace(/\.js$/, "");
    enParts.set(part, mod[enName]);
    for (const key of Object.keys(mod[enName])) partOfKey.set(key, part);
  }

  const touchedParts = new Set(plan.updates.map((u) => partOfKey.get(u.key)));
  const partsDir = path.join(repoRoot, "web", "lib", "i18n", "parts");
  for (const part of touchedParts) {
    const values = {};
    for (const key of Object.keys(enParts.get(part))) values[key] = dict[key];
    fs.writeFileSync(
      path.join(partsDir, `${part}.${lang}.ts`),
      renderSatellite(lang, part, enParts.get(part), values)
    );
  }

  const manifestPath = path.join(repoRoot, "web", "lib", "i18n", "review-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  for (const key of plan.flips) manifest[lang].states[key] = "reviewed";
  if (plan.flips.length > 0 || plan.updates.length > 0) {
    manifest[lang].reviewer = reviewer;
    manifest[lang].date = date;
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + "\n");
  return { filesWritten: touchedParts.size };
}

/* ---------------- CLI ---------------- */

function main(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const name = argv[i].slice(2);
      args[name] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
    }
  }
  const lang = args.lang;
  if (lang !== "ps" && lang !== "fa") {
    console.error("usage: --lang ps|fa --pack <csv> --reviewer \"Name\" [--write]");
    process.exit(2);
  }
  const repoRoot = path.join(__dirname, "..");
  const i18n = require(path.join(repoRoot, "harness", "out", "i18n", "index.js"));
  const manifest = JSON.parse(
    fs.readFileSync(path.join(repoRoot, "web", "lib", "i18n", "review-manifest.json"), "utf8")
  );
  const rows = parsePack(fs.readFileSync(args.pack, "utf8"));
  const plan = planMerge({
    rows,
    dict: i18n[lang],
    states: manifest[lang].states,
    reviewer: args.reviewer,
  });
  console.log(
    `plan: ${plan.totals.packRows} pack rows vs ${plan.totals.dictKeys} dictionary keys; ` +
      `${plan.updates.length} corrections, ${plan.flips.length} flips to reviewed, ` +
      `${plan.alreadyReviewed.length} already reviewed`
  );
  for (const w of plan.warnings) console.log(`warning: ${w.type} (${w.count ?? ""})`);
  if (!plan.ok) {
    for (const e of plan.errors) console.error(`REFUSED: ${JSON.stringify(e)}`);
    process.exit(1);
  }
  if (args.write) {
    const date = new Date().toISOString().slice(0, 10);
    const { filesWritten } = applyToRepo({ repoRoot, lang, plan, reviewer: args.reviewer, date });
    console.log(
      `applied: ${filesWritten} satellite file(s) rewritten; manifest stamped reviewer="${args.reviewer}" date=${date}. ` +
        "Now recompile the web dictionaries, regenerate the Dart side (tools/gen_l10n.mjs) and run all gates."
    );
  } else {
    console.log("dry run — nothing written. Re-run with --write to apply.");
  }
}

if (require.main === module) main(process.argv);

module.exports = { parseCsv, parsePack, planMerge };

#!/usr/bin/env node
/**
 * Dukaan AI — Flutter code generation from the web sources of truth
 * (Phase F design §6). NEVER hand-edit the outputs:
 *   lib/l10n/strings_en.json / strings_ur.json  (the full dictionary)
 *   lib/l10n/strings_ps.json / strings_fa.json  (PS/FA drafts, H §4)
 *   lib/l10n/strings.dart                        (typed accessor)
 *   lib/l10n/review_states.dart                  (PS/FA review table)
 *   lib/core/permissions_data.dart               (the RBAC matrix)
 *
 * Sources: the web dictionaries + permission matrix, COMPILED the way
 * the TS harness compiles them (harness/out), so generation runs
 * against source, not a stale bundle. The generator REFUSES to emit
 * on a parity break (any locale's key set ≢ EN's) — mirroring the
 * web's compile-time guarantee mechanically for the apps (§6.2).
 *
 * Phase H design §4.4 extends the gate to four locales: key-set
 * equality across en/ur/ps/fa, no empty values, no un-translated
 * English copy-through in PS/FA (a value equal to EN that carries
 * Latin letters must be whitelisted in the review manifest), and
 * manifest coverage — every PS/FA key has a draft|reviewed state and
 * every state names a real key. Failures NAME the offending keys.
 *
 * Usage:  node tools/gen_l10n.mjs [--check]
 *   --check  regenerate in memory and exit 1 if committed files drift.
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = join(here, "..");
const repoRoot = join(appRoot, "..");
const outDir = join(repoRoot, "harness", "out");
const require = createRequire(import.meta.url);

if (!existsSync(join(outDir, "i18n", "index.js"))) {
  console.error("harness/out not compiled — run: cd web && npx tsc -p ../harness/tsconfig.json");
  process.exit(2);
}
const i18n = require(join(outDir, "i18n", "index.js"));
const permissions = require(join(outDir, "permissions.js"));
const plans = require(join(outDir, "plans.js"));

const en = i18n.en;
const ur = i18n.ur;
const ps = i18n.ps;
const fa = i18n.fa;
if (!ps || !fa) {
  console.error("PARITY BREAK: web dictionary exports no ps/fa locale (Phase H §4)");
  process.exit(1);
}
const enKeys = Object.keys(en).sort();
for (const [name, dict] of [["ur", ur], ["ps", ps], ["fa", fa]]) {
  const keys = Object.keys(dict).sort();
  if (JSON.stringify(enKeys) !== JSON.stringify(keys)) {
    const missing = enKeys.filter((k) => !(k in dict));
    const extra = keys.filter((k) => !(k in en));
    console.error(`PARITY BREAK: ${missing.length} keys missing from ${name.toUpperCase()}, ${extra.length} extra`);
    console.error({ missing: missing.slice(0, 10), extra: extra.slice(0, 10) });
    process.exit(1);
  }
}
for (const k of enKeys) {
  for (const [name, dict] of [["en", en], ["ur", ur], ["ps", ps], ["fa", fa]]) {
    if (typeof dict[k] !== "string" || dict[k] === "") {
      console.error(`PARITY BREAK: empty/non-string ${name} value at ${k}`);
      process.exit(1);
    }
  }
}

/* ---- review manifest: coverage + copy-through whitelist (§4.1/§4.4) ---- */
const manifestPath = join(repoRoot, "web", "lib", "i18n", "review-manifest.json");
if (!existsSync(manifestPath)) {
  console.error("PARITY BREAK: web/lib/i18n/review-manifest.json missing");
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const copyThroughAllowed = new Set(manifest.copyThroughAllowed ?? []);
for (const lang of ["ps", "fa"]) {
  const states = manifest[lang]?.states ?? {};
  const stateKeys = Object.keys(states).sort();
  if (JSON.stringify(stateKeys) !== JSON.stringify(enKeys)) {
    const unaccounted = enKeys.filter((k) => !(k in states));
    const unknown = stateKeys.filter((k) => !(k in en));
    console.error(
      `MANIFEST BREAK (${lang}): ${unaccounted.length} keys with no state, ${unknown.length} states naming no key`
    );
    console.error({ unaccounted: unaccounted.slice(0, 10), unknown: unknown.slice(0, 10) });
    process.exit(1);
  }
  for (const k of enKeys) {
    if (states[k] !== "draft" && states[k] !== "reviewed") {
      console.error(`MANIFEST BREAK (${lang}): bad state "${states[k]}" at ${k}`);
      process.exit(1);
    }
  }
  // Copy-through: a PS/FA value identical to EN that carries Latin
  // letters is un-translated text unless the manifest whitelists the
  // key (language self-names, brand-only strings, pure tokens).
  // Values with no Latin letters (اردو / پښتو / digits / symbols)
  // are legitimately identical across locales.
  const dict = lang === "ps" ? ps : fa;
  const offenders = enKeys.filter(
    (k) => dict[k] === en[k] && /[A-Za-z]/.test(en[k]) && !copyThroughAllowed.has(k)
  );
  if (offenders.length > 0) {
    console.error(
      `COPY-THROUGH BREAK (${lang}): ${offenders.length} values identical to EN and not whitelisted in the manifest`
    );
    console.error({ offenders: offenders.slice(0, 20) });
    process.exit(1);
  }
}

const check = process.argv.includes("--check");
let drift = 0;
function emit(relPath, content) {
  const target = join(appRoot, relPath);
  if (check) {
    const current = existsSync(target) ? readFileSync(target, "utf8") : "";
    if (current !== content) {
      console.error(`DRIFT: ${relPath} differs from a fresh generation`);
      drift++;
    }
  } else {
    writeFileSync(target, content);
    console.log(`wrote ${relPath}`);
  }
}

emit("lib/l10n/strings_en.json", JSON.stringify(en, null, 1) + "\n");
emit("lib/l10n/strings_ur.json", JSON.stringify(ur, null, 1) + "\n");
emit("lib/l10n/strings_ps.json", JSON.stringify(ps, null, 1) + "\n");
emit("lib/l10n/strings_fa.json", JSON.stringify(fa, null, 1) + "\n");

/* ---- typed accessor: one member per key, {placeholder} → named params ---- */
function methodName(key) {
  // Segments join camelCase, with "_" marking boundaries after the
  // second segment so "a.deleteAria" and "a.delete.aria" can never
  // collide into one member name.
  const segs = key.split(".").map((seg) => seg.replace(/[^a-zA-Z0-9]/g, ""));
  return segs
    .map((clean, i) => {
      if (i === 0) return clean;
      const cap = clean.charAt(0).toUpperCase() + clean.slice(1);
      return i >= 2 ? `_${cap}` : cap;
    })
    .join("");
}
const seen = new Map();
const members = [];
for (const key of enKeys) {
  let name = methodName(key);
  if (seen.has(name)) {
    // Deterministic disambiguation (sorted key order): suffix the
    // later key with its segment count until unique.
    var suffix = key.split(".").length;
    while (seen.has(`${name}_${suffix}`)) suffix++;
    name = `${name}_${suffix}`;
  }
  seen.set(name, key);
  const placeholders = [...new Set([...en[key].matchAll(/\{(\w+)\}/g)].map((m) => m[1]))];
  const dartKey = key.replace(/'/g, "\\'");
  if (placeholders.length === 0) {
    members.push(`  String get ${name} => _m['${dartKey}'] ?? '${dartKey}';`);
  } else {
    const params = placeholders.map((p) => `required String ${p}`).join(", ");
    const map = placeholders.map((p) => `'${p}': ${p}`).join(", ");
    members.push(`  String ${name}({${params}}) => fill(_m['${dartKey}'] ?? '${dartKey}', {${map}});`);
  }
}
emit(
  "lib/l10n/strings.dart",
  `// GENERATED by tools/gen_l10n.mjs from the web dictionary — DO NOT EDIT.
// Source of truth: web/lib/i18n (${enKeys.length.toLocaleString("en-US")} keys, EN ≡ UR ≡ PS ≡ FA). Regenerate after
// any dictionary change; CI diffs this file (§6.2 drift gate).

/// Typed accessor over the generated dictionary. Interpolation mirrors
/// the web: "{name}" tokens replaced from named arguments.
class Strings {
  final Map<String, String> _m;
  const Strings(this._m);

  String raw(String key) => _m[key] ?? key;

  static String fill(String template, Map<String, String> params) {
    var out = template;
    params.forEach((k, v) => out = out.replaceAll('{$k}', v));
    return out;
  }

${members.join("\n")}
}
`
);

/* ---- PS/FA review-state table (Phase H design §4.4): the manifest
 * states as generated Dart data, so the apps' draft badge derives from
 * exactly the states the web ships. Coverage was asserted above. ---- */
function stateMap(name, states) {
  const rows = enKeys.map((k) => `  '${k.replace(/'/g, "\\'")}': '${states[k]}',`);
  return `const Map<String, String> ${name} = {\n${rows.join("\n")}\n};`;
}
emit(
  "lib/l10n/review_states.dart",
  `// GENERATED by tools/gen_l10n.mjs from web/lib/i18n/review-manifest.json — DO NOT EDIT.
// The PS/FA review-state table (Phase H design §4.4): one draft|reviewed
// state per key, regenerated from the manifest so the apps cannot drift
// from the web's account of what a human has reviewed.

${stateMap("psReviewStates", manifest.ps.states)}

${stateMap("faReviewStates", manifest.fa.states)}
`
);

/* ---- permission matrix as generated Dart data ---- */
const matrix = permissions.PERMISSION_MATRIX;
const modules = Object.keys(matrix);
const rows = modules.map((mod) => {
  const r = matrix[mod];
  return `  '${mod}': {'owner': '${r.owner}', 'manager': '${r.manager}', 'cashier': '${r.cashier}', 'accountant': '${r.accountant}'},`;
});
emit(
  "lib/core/permissions_data.dart",
  `// GENERATED by tools/gen_l10n.mjs from web/lib/permissions.ts — DO NOT EDIT.
// The RBAC matrix as data (§6.3): the mobile matrix cannot drift from
// the web's because it IS the web's, regenerated. can() lives in
// permissions.dart.

/// module → role → access level ("full" | "read" | "none").
const Map<String, Map<String, String>> permissionMatrixData = {
${rows.join("\n")}
};

/// Every PermModule of the web matrix, in order.
const List<String> permModules = [
${modules.map((m) => `  '${m}',`).join("\n")}
];
`
);

/* ---- plan catalogue as generated Dart data (Phase G design §5.3:
 * the catalogue is DATA — tiers, module sets, limits, tier gates —
 * generated from web/lib/plans.ts exactly like the RBAC matrix.
 * Plan-state DERIVATION is code: hand-ported in core/plans.dart and
 * proven against shared fixtures, never generated.) ---- */
const dartNum = (v) => (v === null || v === undefined ? "null" : String(v));
const catRows = Object.values(plans.PLAN_CATALOGUE).map((t) =>
  `  '${t.planId}': PlanTierData(planId: '${t.planId}', tierRank: ${t.tierRank}, modulesTier: '${t.modulesTier}', usersLimit: ${dartNum(t.usersLimit)}, invoiceLimit: ${dartNum(t.invoiceLimit)}, priceMonthlyPKR: ${dartNum(t.priceMonthlyPKR)}),`
);
const strList = (xs) => xs.map((x) => `  '${x}',`).join("\n");
const tierMapRows = (obj) =>
  Object.entries(obj).map(([k, v]) => `  '${k}': '${v}',`).join("\n");
emit(
  "lib/core/plans_data.dart",
  `// GENERATED by tools/gen_l10n.mjs from web/lib/plans.ts — DO NOT EDIT.
// The plan catalogue as data (Phase G design §5.3): tiers, module
// sets and tier gates, regenerated from the TS source so the apps
// cannot drift from the web's table. Derivations live in plans.dart.

/// One catalogue tier (design §3.1). Null limits/prices are the
/// catalogue's own nulls (unlimited / custom) — snapshotFor's
/// null→0 storage happens in plans.dart, as in the TS source.
class PlanTierData {
  final String planId;
  final int tierRank;
  final String modulesTier;
  final int? usersLimit;
  final int? invoiceLimit;
  final int? priceMonthlyPKR;
  const PlanTierData({
    required this.planId,
    required this.tierRank,
    required this.modulesTier,
    required this.usersLimit,
    required this.invoiceLimit,
    required this.priceMonthlyPKR,
  });
}

/// The catalogue (§3.1): id → tier.
const Map<String, PlanTierData> planCatalogueData = {
${catRows.join("\n")}
};

/// Annual billing = 10 × monthly (two months free) — §3.1.
const int annualMonthsChargedData = ${plans.ANNUAL_MONTHS_CHARGED};

/// Core (Basic and up) — §3.3.
const List<String> coreModulesData = [
${strList(plans.CORE_MODULES)}
];

/// + Documents (Standard and up) — §3.3.
const List<String> documentsModulesData = [
${strList(plans.DOCUMENTS_MODULES)}
];

/// + Operations (Standard and up) — §3.3.
const List<String> operationsModulesData = [
${strList(plans.OPERATIONS_MODULES)}
];

/// + Growth (Standard and up) — Phase H design §5.1 (H1: loyalty).
const List<String> growthModulesData = [
${strList(plans.GROWTH_MODULES)}
];

/// + Advanced (Advanced and up) — §3.3.
const List<String> advancedModulesData = [
${strList(plans.ADVANCED_MODULES)}
];

/// Journal refTypes whose module sits above Core (§4.1).
const Map<String, String> refTypeMinTierData = {
${tierMapRows(plans.REFTYPE_MIN_TIER)}
};

/// Operational collections whose CREATE is tier-checked (§4.1).
const Map<String, String> collectionCreateTierData = {
${tierMapRows(plans.COLLECTION_CREATE_TIER)}
};
`
);

console.log(`dictionary: ${enKeys.length} keys EN ≡ UR ≡ PS ≡ FA; matrix: ${modules.length} modules`);
if (check) {
  if (drift > 0) {
    console.error(`DRIFT GATE: ${drift} generated file(s) stale`);
    process.exit(1);
  }
  console.log("drift gate: clean");
}

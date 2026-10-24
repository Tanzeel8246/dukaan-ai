/**
 * Phase E · E2 — brand assets: the pure half of the pipeline
 * (design: ERP-PHASE-E-DESIGN.md §2). The canvas calls are DOM and
 * live in components/BrandAssets.tsx; every DECISION — the target
 * box, the format, the quality/scale ladder, the hard caps, the
 * refusal — is made here, where the harness can prove it.
 *
 * The discipline (§2.2): one doc per asset kind in the `branding`
 * collection, payload a compressed data-URL under a HARD cap. An
 * encode that exceeds its cap steps down (quality −0.1, then box
 * ×0.75) up to three times; still over ⇒ the pipeline REFUSES with
 * the actual figures rather than storing a degraded surprise. No
 * input can produce a stored payload over its cap — the runner
 * below is the only path from image to asset, and `buildBranding
 * Asset` re-checks the cap at the boundary.
 *
 * This module posts NOTHING and writes NOTHING: no store, no
 * Firestore, no journal — pure functions over image facts.
 */
import type { BrandingAsset, BrandingAssetKind } from "./types";

export type { BrandingAsset, BrandingAssetKind } from "./types";

export const BRANDING_KINDS: readonly BrandingAssetKind[] = [
  "logo",
  "letterheadHeader",
  "letterheadFooter",
  "stamp",
  "signature",
  "raastQrImage",
];

export interface BrandingAssetSpec {
  /** Canvas max box (§2.2) — the encode never exceeds it and
   *  never upscales into it. */
  maxWidth: number;
  maxHeight: number;
  /** The HARD encoded-size cap for the stored doc (§2.2). */
  capBytes: number;
  /** Letterhead banners are photograph-like: they encode JPEG
   *  q0.85 regardless of alpha (§2.2 step 2). */
  banner: boolean;
}

export const BRANDING_SPECS: Record<BrandingAssetKind, BrandingAssetSpec> = {
  logo: { maxWidth: 600, maxHeight: 600, capBytes: 150_000, banner: false },
  letterheadHeader: { maxWidth: 1600, maxHeight: 400, capBytes: 300_000, banner: true },
  letterheadFooter: { maxWidth: 1600, maxHeight: 400, capBytes: 300_000, banner: true },
  stamp: { maxWidth: 600, maxHeight: 600, capBytes: 150_000, banner: false },
  signature: { maxWidth: 800, maxHeight: 300, capBytes: 150_000, banner: false },
  raastQrImage: { maxWidth: 800, maxHeight: 800, capBytes: 200_000, banner: false },
};

/** The worst-case total across all six docs if every slot sat at
 *  its cap — the ≈1 MB discipline of §2.2 (each doc individually
 *  sits far inside Firestore's 1 MiB limit; this sum is what the
 *  demo's localStorage budget feels). */
export const BRANDING_TOTAL_CAP_BYTES = Object.values(BRANDING_SPECS).reduce(
  (sum, s) => sum + s.capBytes,
  0
);

/* ------------------------------------------------------------------ */
/* Data-URL facts                                                      */
/* ------------------------------------------------------------------ */

const DATA_URL_RE = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/;

/** The mime a data-URL carries, or null when the payload is not
 *  one of the three encodings the pipeline stores. */
export function dataUrlMime(
  dataUrl: string
): BrandingAsset["mime"] | null {
  const m = DATA_URL_RE.exec(dataUrl);
  return m ? (m[1] as BrandingAsset["mime"]) : null;
}

/** The decoded byte length of a base64 data-URL — computed from
 *  the payload itself, so it can never disagree with what is
 *  stored. −1 for a malformed payload. */
export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (!dataUrl.startsWith("data:") || comma < 0) return -1;
  if (!dataUrl.slice(0, comma).endsWith(";base64")) return -1;
  const b64 = dataUrl.slice(comma + 1);
  // Whole base64 quads only: a ragged payload has no decoded
  // length worth the name, so it measures −1, never a guess.
  if (b64.length === 0 || b64.length % 4 !== 0) return -1;
  let pad = 0;
  if (b64.endsWith("==")) pad = 2;
  else if (b64.endsWith("=")) pad = 1;
  return (b64.length * 3) / 4 - pad;
}

/* ------------------------------------------------------------------ */
/* The plan — pure decisions (§2.2 steps 2–3)                          */
/* ------------------------------------------------------------------ */

/** Fit (w × h) inside the kind's box, preserving aspect, NEVER
 *  upscaling. Degenerate inputs collapse to 0×0 (unplannable). */
export function fitWithinBox(
  width: number,
  height: number,
  spec: BrandingAssetSpec
): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) return { width: 0, height: 0 };
  const scale = Math.min(1, spec.maxWidth / width, spec.maxHeight / height);
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  };
}

/** The encode format (§2.2): letterhead banners are JPEG; an image
 *  WITH alpha keeps its transparency (WebP where the encoder
 *  offers it — a canvas that cannot encode WebP returns PNG, and
 *  the pipeline records the mime the data-URL actually carries);
 *  an image with no alpha encodes JPEG. The pipeline checks; the
 *  owner never decides this. */
export function chooseFormat(
  kind: BrandingAssetKind,
  hasAlpha: boolean
): BrandingAsset["mime"] {
  if (BRANDING_SPECS[kind].banner) return "image/jpeg";
  return hasAlpha ? "image/webp" : "image/jpeg";
}

/** One planned encode: the canvas draws at (width × height) and
 *  encodes as `mime` at `quality` (null = the encoder's lossless
 *  default, for PNG outcomes). */
export interface CompressionStep {
  mime: BrandingAsset["mime"];
  quality: number | null;
  width: number;
  height: number;
}

/**
 * The step ladder (§2.2): step 0 at the fitted box and the base
 * quality, then up to THREE step-downs — quality −0.1, then
 * box ×0.75, then quality −0.1 at the shrunken box. Pure and
 * deterministic: the same image facts always plan the same ladder.
 */
export function compressionPlan(
  kind: BrandingAssetKind,
  info: { width: number; height: number; hasAlpha: boolean }
): CompressionStep[] {
  const spec = BRANDING_SPECS[kind];
  const mime = chooseFormat(kind, info.hasAlpha);
  const fit = fitWithinBox(info.width, info.height, spec);
  const baseQuality =
    mime === "image/jpeg" ? (spec.banner ? 0.85 : 0.9) : mime === "image/webp" ? 0.92 : null;
  const q = (base: number | null, drops: number): number | null =>
    base === null ? null : Math.round((base - 0.1 * drops) * 100) / 100;
  const at = (quality: number | null, scale: number): CompressionStep => ({
    mime,
    quality,
    width: Math.max(1, Math.floor(fit.width * scale)),
    height: Math.max(1, Math.floor(fit.height * scale)),
  });
  if (fit.width === 0 || fit.height === 0) return [];
  return [
    at(baseQuality, 1),
    at(q(baseQuality, 1), 1),
    at(q(baseQuality, 1), 0.75),
    at(q(baseQuality, 2), 0.75 * 0.75),
  ];
}

export type CompressionOutcome =
  | {
      ok: true;
      stepIndex: number;
      step: CompressionStep;
      dataUrl: string;
      bytes: number;
    }
  | {
      ok: false;
      /** Why it refused, in figures — the UI shows both (§2.2). */
      capBytes: number;
      lastBytes: number;
      stepsTried: number;
    };

/**
 * Walk the ladder with the caller's encoder (the DOM pipeline's
 * canvas, or the harness's stub) and stop at the first encode
 * under the cap. The cap is HARD: no outcome of this function —
 * success or refusal — ever carries a payload over it.
 */
export function runCompressionPlan(
  kind: BrandingAssetKind,
  info: { width: number; height: number; hasAlpha: boolean },
  encode: (step: CompressionStep) => { dataUrl: string; bytes: number }
): CompressionOutcome {
  const spec = BRANDING_SPECS[kind];
  const steps = compressionPlan(kind, info);
  let lastBytes = 0;
  for (let i = 0; i < steps.length; i++) {
    const r = encode(steps[i]);
    lastBytes = r.bytes;
    if (r.bytes >= 0 && r.bytes <= spec.capBytes) {
      return { ok: true, stepIndex: i, step: steps[i], dataUrl: r.dataUrl, bytes: r.bytes };
    }
  }
  return { ok: false, capBytes: spec.capBytes, lastBytes, stepsTried: steps.length };
}

/* ------------------------------------------------------------------ */
/* The asset boundary                                                  */
/* ------------------------------------------------------------------ */

/**
 * Build the stored doc from a finished encode — the boundary
 * guard every write passes (§2.2): the mime must be one the
 * pipeline stores, the payload's OWN byte count must sit under
 * the kind's cap, and the pixel size must be real. Anything else
 * is refused (null) — a caller bug or a hand-crafted doc can
 * never smuggle an over-cap payload into the collection.
 */
export function buildBrandingAsset(
  kind: BrandingAssetKind,
  dataUrl: string,
  width: number,
  height: number,
  updatedAt: string
): BrandingAsset | null {
  const mime = dataUrlMime(dataUrl);
  if (!mime) return null;
  const bytes = dataUrlBytes(dataUrl);
  if (bytes < 0 || bytes > BRANDING_SPECS[kind].capBytes) return null;
  const w = Math.round(width);
  const h = Math.round(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  return { id: kind, kind, dataUrl, mime, width: w, height: h, bytes, updatedAt };
}

/* ------------------------------------------------------------------ */
/* Read seam — the single interface sheets + Settings consume (§2.1)   */
/* ------------------------------------------------------------------ */

/** Assets by kind; a kind with no doc is simply absent (absence
 *  is meaningful — the slot renders nothing, §2.1). */
export function brandingByKind(
  list: readonly BrandingAsset[]
): Partial<Record<BrandingAssetKind, BrandingAsset>> {
  const out: Partial<Record<BrandingAssetKind, BrandingAsset>> = {};
  for (const a of list) {
    if (a && (BRANDING_KINDS as readonly string[]).includes(a.kind)) out[a.kind] = a;
  }
  return out;
}

/** The data-URL map the print chrome consumes (structurally the
 *  `PrintAssets` shape of components/PrintChrome.tsx — null for
 *  every slot the shop has not filled). */
export interface BrandingDataUrls {
  logo: string | null;
  letterheadHeader: string | null;
  letterheadFooter: string | null;
  stamp: string | null;
  signature: string | null;
  raastQrImage: string | null;
}

export function brandingDataUrls(list: readonly BrandingAsset[]): BrandingDataUrls {
  const by = brandingByKind(list);
  return {
    logo: by.logo?.dataUrl ?? null,
    letterheadHeader: by.letterheadHeader?.dataUrl ?? null,
    letterheadFooter: by.letterheadFooter?.dataUrl ?? null,
    stamp: by.stamp?.dataUrl ?? null,
    signature: by.signature?.dataUrl ?? null,
    raastQrImage: by.raastQrImage?.dataUrl ?? null,
  };
}

/** Σ stored bytes across the shop's assets (the Settings readout
 *  and the ≈1 MB discipline's running figure). */
export function brandingTotalBytes(list: readonly BrandingAsset[]): number {
  return list.reduce((sum, a) => sum + (a?.bytes ?? 0), 0);
}

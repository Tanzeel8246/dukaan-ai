"use client";

/**
 * Phase E · E3 — the ONLY QR renderer (design §3.7): designer
 * preview, Settings, the counter poster and the receipts all
 * consume this component. It renders the payload's module
 * matrix (lib/qr) as an inline SVG — crisp at print sizes, no
 * canvas raster, no data-URL.
 *
 * Black modules on white, ALWAYS — regardless of app theme or
 * print template. A themed QR is an unscannable QR; this is
 * print invariant 3's sharpest application, so the colours are
 * hard-coded here and no prop can change them. The 4-module
 * quiet zone is part of the viewBox.
 */
import { useMemo } from "react";
import { qrModuleRows, QR_QUIET_ZONE_MODULES } from "@/lib/qr";

export default function QrCode({
  payload,
  sizeMm,
  sizePx,
  label,
}: {
  payload: string;
  /** Print size (receipts/poster). Exactly one of sizeMm /
   *  sizePx is used; screen surfaces pass sizePx. */
  sizeMm?: number;
  sizePx?: number;
  label?: string;
}) {
  const { size, rows } = useMemo(() => qrModuleRows(payload), [payload]);
  const q = QR_QUIET_ZONE_MODULES;
  const dim = size + q * 2;
  // One path of per-row dark runs — compact and exact.
  const d = useMemo(() => {
    const parts: string[] = [];
    for (let r = 0; r < size; r++) {
      const row = rows[r];
      let c = 0;
      while (c < size) {
        if (row[c] === "#") {
          let run = 1;
          while (c + run < size && row[c + run] === "#") run++;
          parts.push(`M${c + q} ${r + q}h${run}v1H${c + q}z`);
          c += run;
        } else {
          c++;
        }
      }
    }
    return parts.join("");
  }, [rows, size, q]);
  const style: React.CSSProperties =
    sizeMm !== undefined
      ? { width: `${sizeMm}mm`, height: `${sizeMm}mm` }
      : { width: sizePx ?? 160, height: sizePx ?? 160 };
  return (
    <svg
      viewBox={`0 0 ${dim} ${dim}`}
      style={style}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect x={0} y={0} width={dim} height={dim} fill="#ffffff" />
      <path d={d} fill="#000000" />
    </svg>
  );
}

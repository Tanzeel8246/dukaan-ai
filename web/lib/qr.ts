/**
 * Phase E · E3 — the QR matrix seam (design §3.7).
 *
 * The encoder is `qrcode-generator` (Kazuhiko Arase, MIT,
 * zero-dependency) — the design rejected a hand-rolled encoder
 * outright: ~500 lines of Reed–Solomon whose failure mode is a
 * QR that renders but does not scan. This module is the ONLY
 * place the encoder is touched: it turns a payload string into
 * module rows ("#"/"." strings), from which components/QrCode
 * renders an SVG. Byte mode, error-correction level M (the
 * payment-QR convention — the payloads here are short, so the
 * symbol stays a low version with large, forgiving modules),
 * auto version (type number 0). Deterministic for a given
 * payload, which is what lets the harness pin a reference
 * matrix as a regression fixture.
 */
import qrcode from "qrcode-generator";

export const QR_ERROR_CORRECTION = "M" as const;

/** Scanners need a 4-module quiet zone (§3.7) — renderers add
 *  it around the matrix; it is not part of the matrix itself. */
export const QR_QUIET_ZONE_MODULES = 4;

export function qrModuleRows(payload: string): { size: number; rows: string[] } {
  const qr = qrcode(0, QR_ERROR_CORRECTION);
  qr.addData(payload, "Byte");
  qr.make();
  const size = qr.getModuleCount();
  const rows: string[] = [];
  for (let r = 0; r < size; r++) {
    let row = "";
    for (let c = 0; c < size; c++) row += qr.isDark(r, c) ? "#" : ".";
    rows.push(row);
  }
  return { size, rows };
}

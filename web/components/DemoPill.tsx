"use client";

import { isDemoMode } from "@/lib/firebase";
import { useLang } from "./LangProvider";

/**
 * Footer "Demo project" pill — rendered ONLY in demo mode (no Firebase
 * config), using the same source of truth as the navbar badge
 * (isDemoMode() from lib/firebase). In production builds the env values are
 * inlined at build time, so this returns false at prerender and the pill
 * never reaches the static HTML. The wording comes from the dictionary in
 * the active language.
 */
export default function DemoPill() {
  const { t } = useLang();
  if (!isDemoMode()) return null;
  return <span className="demo-pill">{t("shell.demoPill")}</span>;
}

"use client";

import { isDemoMode } from "@/lib/firebase";
import { useLang } from "./LangProvider";

/**
 * Footer bottom bar — mode-aware copy using the same source of truth as the
 * navbar badge and DemoPill (isDemoMode() from lib/firebase). In production
 * builds the env values are inlined at build time, so isDemoMode() returns
 * false at prerender and the clean production lines land in the static HTML;
 * demo builds keep the demo wording. The wording itself comes from the
 * dictionary in the active language.
 */
export default function FooterBottom() {
  const { t } = useLang();
  if (isDemoMode()) {
    return (
      <div className="footer-bottom">
        <span>
          {t("shell.footerByDemo")}{" "}
          <a href="https://codehubb.com" target="_blank" rel="noopener">
            CodeHubb
          </a>
        </span>
        <span>{t("shell.footerRightsDemo")}</span>
      </div>
    );
  }
  return (
    <div className="footer-bottom">
      <span>
        {t("shell.footerByProd")}{" "}
        <a href="https://codehubb.com" target="_blank" rel="noopener">
          CodeHubb
        </a>
      </span>
      <span>{t("shell.footerRights")}</span>
    </div>
  );
}

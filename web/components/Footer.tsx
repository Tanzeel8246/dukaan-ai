"use client";

import Link from "next/link";
import { NAV_GROUPS } from "@/lib/nav";
import { useLang } from "./LangProvider";
import { IconBasket } from "./ui";
import DemoPill from "./DemoPill";
import FooterBottom from "./FooterBottom";

export default function Footer() {
  const { t } = useLang();
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link href="/" className="brand-logo" aria-label={t("shell.homeLabel")}>
              <span className="mark">
                <IconBasket />
              </span>
              Dukaan&nbsp;AI
            </Link>
            <p>{t("shell.footerTagline")}</p>
            <DemoPill />
          </div>
          <nav aria-label={t("shell.footerAppHeading")}>
            <h4>{t("shell.footerAppHeading")}</h4>
            <ul>
              {NAV_GROUPS.flatMap((g) => g.links).map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{t(l.key)}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <h4>{t("shell.footerAboutHeading")}</h4>
            <ul>
              <li>
                <a href="https://codehubb.com" target="_blank" rel="noopener">
                  CodeHubb
                </a>
              </li>
              <li>
                <span style={{ color: "var(--muted)", fontSize: "0.94rem" }}>
                  {t("shell.footerTech")}
                </span>
              </li>
            </ul>
          </div>
        </div>
        <FooterBottom />
      </div>
    </footer>
  );
}

"use client";

import Link from "next/link";
import { NAV_LINKS, type NavLink } from "@/lib/nav";
import type { I18nKey } from "@/lib/i18n";
import { useLang } from "./LangProvider";
import { IconBasket } from "./ui";
import DemoPill from "./DemoPill";
import FooterBottom from "./FooterBottom";

const byHref = new Map(NAV_LINKS.map((l) => [l.href, l]));

const linkFor = (href: string): NavLink => {
  const link = byHref.get(href);
  if (!link) throw new Error(`NAV_LINKS is missing ${href}`);
  return link;
};

/**
 * Footer link columns — categorized (owner direction, 2026-10-23):
 * the brand column plus five headed columns instead of one flat
 * 29-link column. Every NAV_LINKS entry appears in exactly one
 * column; hrefs and labels stay sourced from lib/nav (single truth),
 * and the company column also carries the pre-existing CodeHubb /
 * tech lines.
 */
const FOOTER_COLUMNS: { headingKey: I18nKey; hrefs: string[] }[] = [
  {
    headingKey: "shell.footerColSales",
    hrefs: ["/", "/sales", "/billing", "/quotations", "/sale-orders", "/delivery-challans"],
  },
  {
    headingKey: "shell.footerColStock",
    hrefs: [
      "/purchase-orders",
      "/inventory",
      "/warehouses",
      "/stock-transfers",
      "/manufacturing",
      "/jobs",
      "/forecast",
    ],
  },
  {
    headingKey: "shell.footerColGrowth",
    hrefs: ["/customers", "/suppliers", "/staff", "/loyalty", "/storefront", "/whatsapp"],
  },
  {
    headingKey: "shell.footerColFinance",
    hrefs: [
      "/credit",
      "/expenses",
      "/finance",
      "/loans",
      "/reports",
      "/notes",
      "/cheques",
      "/day-close",
    ],
  },
];

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
          {FOOTER_COLUMNS.map((col) => (
            <nav key={col.headingKey} aria-label={t(col.headingKey)}>
              <h4>{t(col.headingKey)}</h4>
              <ul>
                {col.hrefs.map((href) => {
                  const l = linkFor(href);
                  return (
                    <li key={l.href}>
                      <Link href={l.href}>{t(l.key)}</Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ))}
          <nav aria-label={t("shell.footerColCompany")}>
            <h4>{t("shell.footerColCompany")}</h4>
            <ul>
              {[linkFor("/assistant"), linkFor("/settings")].map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{t(l.key)}</Link>
                </li>
              ))}
              <li>
                <a href="https://codehubb.com" target="_blank" rel="noopener">
                  CodeHubb
                </a>
              </li>
              <li>
                <span style={{ color: "var(--muted)", fontSize: "0.94rem", whiteSpace: "nowrap" }}>
                  {t("shell.footerTech")}
                </span>
              </li>
            </ul>
          </nav>
        </div>
        <FooterBottom />
      </div>
    </footer>
  );
}

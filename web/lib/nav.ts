/** Dukaan AI — shared navigation links (plain module, no "use client").
 *  `label` is the English fallback; the shell renders via the i18n key. */

import type { I18nKey } from "./i18n";

export interface NavLink {
  href: string;
  label: string;
  key: I18nKey;
}

export const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Dashboard", key: "nav.dashboard" },
  { href: "/sales", label: "Sales", key: "nav.sales" },
  { href: "/billing", label: "Billing", key: "nav.billing" },
  { href: "/quotations", label: "Quotations", key: "nav.quotations" },
  { href: "/sale-orders", label: "Sale Orders", key: "nav.saleOrders" },
  { href: "/delivery-challans", label: "Delivery Challans", key: "nav.deliveryChallans" },
  { href: "/purchase-orders", label: "Purchase Orders", key: "nav.purchaseOrders" },
  { href: "/notes", label: "Notes", key: "nav.notes" },
  { href: "/cheques", label: "Cheques", key: "nav.cheques" },
  { href: "/inventory", label: "Inventory", key: "nav.inventory" },
  { href: "/warehouses", label: "Warehouses", key: "nav.warehouses" },
  { href: "/stock-transfers", label: "Stock Transfers", key: "nav.stockTransfers" },
  { href: "/manufacturing", label: "Manufacturing", key: "nav.manufacturing" },
  { href: "/jobs", label: "Jobs", key: "nav.jobs" },
  { href: "/staff", label: "Staff", key: "nav.staff" },
  { href: "/forecast", label: "Forecast", key: "nav.forecast" },
  { href: "/suppliers", label: "Suppliers", key: "nav.suppliers" },
  { href: "/customers", label: "Customers", key: "nav.customers" },
  { href: "/credit", label: "Credit · Udhaar", key: "nav.credit" },
  { href: "/expenses", label: "Expenses", key: "nav.expenses" },
  { href: "/finance", label: "Finance", key: "nav.finance" },
  { href: "/reports", label: "Reports", key: "nav.reports" },
  { href: "/day-close", label: "Day Close", key: "nav.dayclose" },
  { href: "/assistant", label: "AI Assistant", key: "nav.assistant" },
  { href: "/settings", label: "Settings", key: "nav.settings" },
];

const byHref = (href: string): NavLink => {
  const link = NAV_LINKS.find((l) => l.href === href);
  if (!link) throw new Error(`NAV_LINKS is missing ${href}`);
  return link;
};

export interface NavGroup {
  groupKey: I18nKey;
  links: NavLink[];
}

/** Sidebar grouping — reuses the NAV_LINKS entries above. */
export const NAV_GROUPS: NavGroup[] = [
  {
    groupKey: "nav.group.main",
    links: [byHref("/"), byHref("/sales"), byHref("/billing")],
  },
  {
    groupKey: "nav.group.manage",
    links: [
      byHref("/quotations"),
      byHref("/sale-orders"),
      byHref("/delivery-challans"),
      byHref("/purchase-orders"),
      byHref("/inventory"),
      byHref("/warehouses"),
      byHref("/stock-transfers"),
      byHref("/manufacturing"),
      byHref("/jobs"),
      byHref("/staff"),
      byHref("/forecast"),
      byHref("/suppliers"),
      byHref("/customers"),
      byHref("/credit"),
    ],
  },
  {
    groupKey: "nav.group.finance",
    links: [
      byHref("/expenses"),
      byHref("/finance"),
      byHref("/reports"),
      byHref("/notes"),
      byHref("/cheques"),
      byHref("/day-close"),
    ],
  },
  {
    groupKey: "nav.group.system",
    links: [byHref("/assistant"), byHref("/settings")],
  },
];

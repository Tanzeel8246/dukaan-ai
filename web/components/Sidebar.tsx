"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { useStore } from "./StoreProvider";
import { useLang } from "./LangProvider";
import { NAV_GROUPS, type NavLink } from "@/lib/nav";
import { can, type PermModule } from "@/lib/permissions";
import {
  IconBasket,
  IconBox,
  IconCalendarCheck,
  IconCard,
  IconCash,
  IconChart,
  IconChat,
  IconClipboard,
  IconClose,
  IconGear,
  IconHome,
  IconReceipt,
  IconScale,
  IconTruck,
  IconUsers,
  IconWallet,
} from "./ui";

const LINK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "/": IconHome,
  "/sales": IconReceipt,
  "/billing": IconCard,
  "/quotations": IconBasket,
  "/sale-orders": IconClipboard,
  "/purchase-orders": IconTruck,
  "/inventory": IconBox,
  "/warehouses": IconBox,
  "/stock-transfers": IconTruck,
  "/forecast": IconChart,
  "/suppliers": IconTruck,
  "/customers": IconUsers,
  "/staff": IconUsers,
  "/credit": IconWallet,
  "/expenses": IconCash,
  "/finance": IconScale,
  "/cheques": IconCard,
  "/day-close": IconCalendarCheck,
  "/assistant": IconChat,
  "/settings": IconGear,
};

interface SidebarProps {
  collapsed: boolean;
  onNavigate: () => void;
}

/** A3: which permission module each nav destination belongs to.
 *  Links the signed-in role cannot view at all are hidden (design
 *  §3.2); read-only roles keep the link and the view itself renders
 *  without its write controls. Settings stays visible to every role
 *  (language + own account live there). */
const HREF_MODULE: Record<string, PermModule> = {
  "/": "dashboard",
  "/sales": "salesCounter",
  "/billing": "billing",
  "/quotations": "quotations",
  "/sale-orders": "saleOrders",
  "/purchase-orders": "purchaseOrders",
  "/notes": "creditDebitNotes",
  "/cheques": "cheques",
  "/inventory": "inventoryView",
  "/warehouses": "warehouses",
  "/stock-transfers": "warehouses",
  "/manufacturing": "manufacturing",
  "/jobs": "jobTracker",
  "/staff": "staffDirectory",
  "/forecast": "forecast",
  "/suppliers": "suppliersManage",
  "/customers": "customersManage",
  "/credit": "creditRepayment",
  "/expenses": "expenses",
  "/finance": "finance",
  "/day-close": "dayCloseHistory",
  "/assistant": "assistant",
};

export default function Sidebar({ collapsed, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { role } = useAuth();
  const { settings } = useStore();
  const { t } = useLang();
  const shopName = settings.shopName?.trim() || t("shell.brandFallback");

  const visible = (l: NavLink): boolean => {
    if (l.href === "/settings") return true;
    const module = HREF_MODULE[l.href];
    return module ? can(role, module, "view") : true;
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const renderLink = (l: NavLink) => {
    const Icon = LINK_ICONS[l.href] ?? IconBox;
    const label = t(l.key);
    return (
      <Link
        key={l.href}
        href={l.href}
        className={`sb-link${isActive(l.href) ? " active" : ""}`}
        title={collapsed ? label : undefined}
        onClick={onNavigate}
      >
        <Icon />
        <span className="sb-link-label">{label}</span>
      </Link>
    );
  };

  return (
    <aside className="sidebar" aria-label={t("shell.mainNav")}>
      <div className="sb-brand">
        <Link href="/" className="sb-brand-link" aria-label={t("shell.homeLabel")} onClick={onNavigate}>
          <span className="mark">
            <IconBasket />
          </span>
          <span className="sb-brand-name">{shopName}</span>
        </Link>
        <button
          type="button"
          className="sb-close"
          onClick={onNavigate}
          aria-label={t("shell.closeMenu")}
        >
          <IconClose />
        </button>
      </div>

      {/* Navigation only: the account block (name, logout) and the
          theme/language switchers live in the top header bar now
          (shell restructure), and the collapse toggle sits there
          too — the sidebar footer block is gone. */}
      <nav className="sb-nav">
        {NAV_GROUPS.map((g) => {
          const links = g.links.filter(visible);
          if (links.length === 0) return null;
          return (
            <div key={g.groupKey} className="sb-group">
              <div className="sb-group-label">{t(g.groupKey)}</div>
              {links.map(renderLink)}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

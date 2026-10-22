"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AuthGate from "./AuthGate";
import Footer from "./Footer";
import LangToggle from "./LangToggle";
import Sidebar from "./Sidebar";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "./AuthProvider";
import { useStore } from "./StoreProvider";
import { useLang } from "./LangProvider";
import { IconBasket, IconChevronLeft, IconLogout, IconMenu } from "./ui";

const SB_STORAGE_KEY = "dukaan-ai-sb";
const AUTH_PATHS = ["/login", "/signup"];

/**
 * App shell — two layouts:
 *  - /login & /signup: slim top strip (logo + language/theme) and centred
 *    content; no sidebar, no footer.
 *  - everything else: navigation-only sidebar + main column under a
 *    slim sticky header bar. The header carries the shop context
 *    (name + mode) and, clustered at its end, the language switcher,
 *    theme switcher, account-holder name and logout — the block that
 *    used to crowd the sidebar footer (owner directive). On mobile
 *    the same bar leads with a hamburger that opens the sidebar as
 *    an off-canvas drawer.
 * AuthGate wraps the content in BOTH branches so its redirect behaviour
 * (signed-in users are bounced off /login) is preserved exactly.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const { settings } = useStore();
  const { mode, user, signOut } = useAuth();
  const { t } = useLang();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAuth = AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const shopName = settings.shopName?.trim() || t("shell.brandFallback");

  useEffect(() => {
    try {
      if (localStorage.getItem(SB_STORAGE_KEY) === "rail") setCollapsed(true);
    } catch {
      /* keep expanded */
    }
  }, []);

  // The drawer closes whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SB_STORAGE_KEY, next ? "rail" : "full");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  if (isAuth) {
    return (
      <div className="auth-layout">
        <header className="auth-topbar">
          <Link href="/" className="brand-logo" aria-label={t("shell.homeLabel")}>
            <span className="mark">
              <IconBasket />
            </span>
            Dukaan&nbsp;AI
          </Link>
          <div className="auth-topbar-actions">
            <LangToggle />
            <ThemeToggle />
          </div>
        </header>
        <AuthGate>
          <main>{children}</main>
        </AuthGate>
      </div>
    );
  }

  return (
    <div
      className={`app-shell${mobileOpen ? " sb-open" : ""}`}
      data-sb={collapsed ? "rail" : "full"}
    >
      <Sidebar
        collapsed={collapsed}
        onNavigate={() => setMobileOpen(false)}
      />
      {mobileOpen && (
        <div
          className="sb-scrim"
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div className="app-main">
        <header className="topbar">
          <button
            type="button"
            className="topbar-burger"
            onClick={() => setMobileOpen(true)}
            aria-label={t("shell.openMenu")}
            aria-expanded={mobileOpen}
          >
            <IconMenu />
          </button>
          <button
            type="button"
            className="topbar-collapse"
            onClick={toggleCollapse}
            aria-label={collapsed ? t("shell.expandSidebar") : t("shell.collapseSidebar")}
            title={collapsed ? t("shell.expandSidebar") : t("shell.collapseSidebar")}
          >
            <IconChevronLeft />
          </button>
          <span className="topbar-name">{shopName}</span>
          {mode === "demo" && (
            <span className="demo-badge" title={t("shell.demoBadgeTitle")}>
              {t("shell.demoMode")}
            </span>
          )}
          <div className="topbar-actions">
            <LangToggle />
            <ThemeToggle />
            {mode !== "demo" &&
              (user ? (
                <div className="topbar-user">
                  <span className="auth-email" title={user.email ?? ""}>
                    {user.email}
                  </span>
                  <button
                    type="button"
                    className="topbar-logout"
                    onClick={() => void signOut()}
                    title={t("action.logout")}
                  >
                    <IconLogout />
                    <span>{t("action.logout")}</span>
                  </button>
                </div>
              ) : (
                <Link className="topbar-logout" href="/login">
                  <IconLogout />
                  <span>{t("action.login")}</span>
                </Link>
              ))}
          </div>
        </header>
        <AuthGate>
          <main>{children}</main>
        </AuthGate>
        <Footer />
      </div>
    </div>
  );
}

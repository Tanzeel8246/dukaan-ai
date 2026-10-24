"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AuthGate from "./AuthGate";
import { PinGateProvider, PinLockButton } from "./PinGate";
import { BusinessSwitcher } from "./BusinessSwitcher";
import Footer from "./Footer";
import LangToggle from "./LangToggle";
import Sidebar, { planModuleForHref } from "./Sidebar";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "./AuthProvider";
import { useStore } from "./StoreProvider";
import { useLang } from "./LangProvider";
import { moduleMinTier, tierIncludesModule } from "@/lib/plans";
import { lifecycleBanner } from "@/lib/renewal";
import { NAV_LINKS } from "@/lib/nav";
import type { I18nKey } from "@/lib/i18n";
import { IconBasket, IconChevronLeft, IconClose, IconLock, IconLogout, IconMenu } from "./ui";

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
 * The non-auth branch additionally mounts PinGateProvider (Phase E ·
 * E4/E5): the device-local PIN lock + sensitive-action gate. Auth
 * paths are exempt — the lock never covers the login form, which is
 * also the recovery route (design §4.4).
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const { settings, planView, planRefusal, clearPlanRefusal, suspensionReason } = useStore();
  const { mode, user, signOut } = useAuth();
  const { t } = useLang();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isPlatform = pathname === "/platform" || pathname.startsWith("/platform/");
  const isAuth = AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  /* Phase H · H3 (design §2.3): the public store page lives
   * OUTSIDE the shop's shell entirely — no AuthGate (its reader
   * is the public), no sidebar, no plan banners, no PIN gate.
   * Just the brand bar with the standing language/theme
   * controls, exactly the platform branch's minimalism. */
  const isStorefront = pathname === "/s" || pathname.startsWith("/s/");

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

  /* Phase G · G2 (design §3.6/§4.2): the plan surfaces. The
   * state banner speaks only in the states a shopkeeper must
   * act on (trial running out, grace, read-only, suspended);
   * the refusal banner carries the store's mapped gate refusals
   * (never a raw rules error); the route gate swaps an
   * above-tier destination for the locked panel, matching the
   * sidebar's locked doors. All three are dark without a plan
   * view (demo mode, pre-G namespaces). */
  /* Phase G · G4 (design §3.4/§3.6/§2.4): the lifecycle
   * banner. The derivation lives in lib/renewal
   * (lifecycleBanner) so the harness walks the whole
   * lifecycle — trial countdown → approaching (7 days) →
   * urgent (1 day) → grace (with the days of grace left) →
   * read-only — against the rendered logic; suspension
   * names its recorded reason and the remedy, and the
   * renewable states carry the renewal path into Settings.
   * State banners are facts, not ads: none is dismissible
   * while its state persists. */
  const lifecycle = planView
    ? lifecycleBanner(planView, new Date().toISOString())
    : null;
  let planBanner: React.ReactNode = null;
  if (planView && lifecycle) {
    const cta = (
      <Link href="/settings" className="plan-banner-link">
        {t("renew.cta")}
      </Link>
    );
    if (lifecycle.kind === "suspended") {
      planBanner = (
        <>
          <span>
            {t("plan.suspendedBanner")}
            {suspensionReason
              ? ` ${t("renew.banner.suspendedReason", { reason: suspensionReason })}`
              : ""}{" "}
            {t("renew.banner.suspendedRemedy")}
          </span>
          {cta}
        </>
      );
    } else if (lifecycle.kind === "trial") {
      const limit = planView.snapshot.invoiceLimit;
      const used = planView.counters?.invoiceCount ?? 0;
      planBanner = t("plan.trialBanner", {
        days: lifecycle.daysLeft,
        left: Math.max(0, limit - used),
        limit,
      });
    } else if (lifecycle.kind === "trial-approaching") {
      planBanner = (
        <>
          <span>{t("renew.banner.trialApproaching", { days: lifecycle.daysLeft })}</span>
          {cta}
        </>
      );
    } else if (lifecycle.kind === "trial-urgent") {
      planBanner = (
        <>
          <span>{t("renew.banner.trialUrgent", { days: lifecycle.daysLeft })}</span>
          {cta}
        </>
      );
    } else if (lifecycle.kind === "grace") {
      planBanner = (
        <>
          <span>
            {t("plan.graceBanner", { days: lifecycle.daysElapsed })}{" "}
            {t("renew.banner.graceLeft", { days: lifecycle.graceLeft })}
          </span>
          {cta}
        </>
      );
    } else if (lifecycle.kind === "readonly") {
      planBanner = (
        <>
          <span>{t("plan.readonlyBanner")}</span>
          {cta}
        </>
      );
    }
  }
  const refusalText =
    planRefusal && planView
      ? planRefusal === "invoice-cap"
        ? t("plan.limitInvoices", { limit: planView.snapshot.invoiceLimit })
        : planRefusal === "member-cap"
          ? t("plan.limitMembers", { limit: planView.snapshot.usersLimit })
          : t("plan.postingPaused", {
              state: t(`plan.state.${planView.state}` as I18nKey),
            })
      : null;
  const navMatch = NAV_LINKS.filter(
    (l) =>
      l.href !== "/" && (pathname === l.href || pathname.startsWith(l.href + "/"))
  ).sort((a, b) => b.href.length - a.href.length)[0];
  const lockedModule =
    planView && navMatch ? planModuleForHref(navMatch.href) : null;
  const routeLocked =
    lockedModule != null &&
    planView != null &&
    !tierIncludesModule(planView.snapshot.modulesTier, lockedModule);

  /* Phase G · G3 (design §2.1): the platform console lives in
   * its own minimal shell — brand, the platform badge, the
   * standing header controls (language, theme, account) — and
   * NOTHING of the shop: no sidebar navigation, no switcher,
   * no plan banners, no PIN gate. A shopkeeper who wanders here
   * meets the console's own not-authorized page, not their
   * shop dressed as an admin tool. */
  if (isPlatform) {
    return (
      <div className="platform-shell">
        <header className="topbar">
          <Link href="/platform" className="brand-logo" aria-label={t("shell.homeLabel")}>
            <span className="mark">
              <IconBasket />
            </span>
            Dukaan&nbsp;AI
          </Link>
          <span className="badge amber">{t("platform.badge")}</span>
          <div className="topbar-actions">
            <LangToggle />
            <ThemeToggle />
            {mode !== "demo" &&
              (user ? (
                <>
                  <span className="acct-email">{user.email}</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => void signOut()}
                  >
                    {t("action.logout")}
                  </button>
                </>
              ) : (
                <Link href="/login" className="btn btn-ghost btn-sm">
                  {t("auth.submitLogin")}
                </Link>
              ))}
          </div>
        </header>
        <main>{children}</main>
      </div>
    );
  }

  /* Phase H · H3 (design §2.3): the public store shell —
   * brand mark, the standing language/theme controls, and the
   * page itself. No account controls at all: the visitor is
   * the public, and the page must not dress a shop session's
   * identity onto a customer's screen. */
  if (isStorefront) {
    return (
      <div className="platform-shell">
        <header className="topbar">
          <span className="brand-logo" aria-label={t("shell.homeLabel")}>
            <span className="mark">
              <IconBasket />
            </span>
            Dukaan&nbsp;AI
          </span>
          <div className="topbar-actions">
            <LangToggle />
            <ThemeToggle />
          </div>
        </header>
        <main>{children}</main>
      </div>
    );
  }

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
    <PinGateProvider>
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
          <BusinessSwitcher settings={settings} />
          {mode === "demo" && (
            <span className="demo-badge" title={t("shell.demoBadgeTitle")}>
              {t("shell.demoMode")}
            </span>
          )}
          <div className="topbar-actions">
            <LangToggle />
            <ThemeToggle />
            <PinLockButton />
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
        {planBanner && (
          <div
            className={`plan-banner${lifecycle?.kind === "trial-urgent" ? " urgent" : ""}`}
            role="status"
          >
            {planBanner}
          </div>
        )}
        {refusalText && (
          <div className="plan-banner refusal" role="alert">
            <span>{refusalText}</span>
            <button
              type="button"
              className="plan-banner-close"
              onClick={clearPlanRefusal}
              aria-label={t("action.close")}
            >
              <IconClose />
            </button>
          </div>
        )}
        <AuthGate>
          <main>
            {routeLocked && planView && lockedModule ? (
              <div className="plan-locked">
                <IconLock />
                <h2>{t("plan.lockedTitle")}</h2>
                <p>
                  {t("plan.lockedBody", {
                    tier: t(`plan.name.${moduleMinTier(lockedModule)}` as I18nKey),
                    plan: t(`plan.name.${planView.snapshot.planId}` as I18nKey),
                  })}
                </p>
              </div>
            ) : (
              children
            )}
          </main>
        </AuthGate>
        <Footer />
      </div>
    </div>
    </PinGateProvider>
  );
}

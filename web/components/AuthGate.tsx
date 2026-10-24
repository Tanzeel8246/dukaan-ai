/**
 * Dukaan AI — route protection.
 *
 * DEMO MODE: renders children untouched (public demo, no login wall).
 * PRODUCTION MODE: signed-out visitors are redirected to /login; signed-in
 * users who land on /login or /signup are sent back to the app. While the
 * auth state is resolving (or mid-redirect) a neutral splash is shown so
 * protected data never flashes on screen.
 */
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { useLang } from "./LangProvider";

const PUBLIC_PATHS = ["/login", "/signup"];

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { mode, user, loading, noAccess, signOut } = useAuth();
  const { t } = useLang();
  const pathname = usePathname() ?? "/";
  const router = useRouter();

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  useEffect(() => {
    if (mode !== "production" || loading) return;
    if (!user && !isPublic) router.replace("/login");
    else if (user && isPublic) router.replace("/");
  }, [mode, user, loading, isPublic, router]);

  if (mode === "production") {
    if (loading || (!user && !isPublic) || (user && isPublic)) {
      return (
        <div className="section">
          <div className="container">
            <div className="empty">{t("shell.checkingSession")}</div>
          </div>
        </div>
      );
    }
    // Phase G · G1: the session resolved to NO business — the
    // person was removed from the only shop they belonged to
    // (design §1.3: removal takes effect on the next read, this
    // session included). A plain explanation + sign-out, never a
    // shop shell over a namespace they may not read.
    if (user && noAccess && !isPublic) {
      return (
        <div className="section">
          <div className="container">
            <div className="empty">
              <h2>{t("biz.noAccessTitle")}</h2>
              <p>{t("biz.noAccessBody")}</p>
              <button
                type="button"
                className="btn"
                onClick={() => void signOut()}
              >
                {t("action.logout")}
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

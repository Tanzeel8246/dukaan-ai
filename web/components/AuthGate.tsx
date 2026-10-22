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
  const { mode, user, loading } = useAuth();
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
  }

  return <>{children}</>;
}

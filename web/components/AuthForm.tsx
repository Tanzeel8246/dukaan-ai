/**
 * Dukaan AI — shared login / sign-up form (email + password).
 *
 * Only reachable in production mode: in demo mode <AuthGate> never routes
 * anyone here, and if a demo visitor types /login directly the form
 * explains that accounts activate once Firebase is connected.
 *
 * All copy comes from the auth i18n part; Firebase errors are mapped from
 * their error CODE to auth.err.* keys so a raw English Firebase message
 * is never rendered (especially in Urdu mode).
 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { useLang } from "./LangProvider";
import type { I18nKey } from "@/lib/i18n";

function authErrorKey(err: unknown): I18nKey {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code: unknown }).code)
      : "";
  switch (code) {
    case "auth/invalid-email":
      return "auth.err.invalidEmail";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "auth.err.invalidCredential";
    case "auth/email-already-in-use":
      return "auth.err.emailInUse";
    case "auth/weak-password":
      return "auth.err.weakPassword";
    case "auth/too-many-requests":
      return "auth.err.tooMany";
    case "auth/network-request-failed":
      return "auth.err.network";
    default:
      return "auth.err.generic";
  }
}

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { mode: appMode, signIn, signUp } = useAuth();
  const { t } = useLang();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorKey, setErrorKey] = useState<I18nKey | null>(null);
  const [busy, setBusy] = useState(false);

  const isLogin = mode === "login";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErrorKey(null);
    setBusy(true);
    try {
      if (isLogin) await signIn(email, password);
      else await signUp(email, password);
      router.replace("/");
    } catch (err) {
      setErrorKey(authErrorKey(err));
      setBusy(false);
    }
  };

  return (
    <div className="section">
      <div className="container">
        <div className="auth-shell">
          <div className="auth-card">
            <span className="eyebrow">{t("auth.eyebrow")}</span>
            <h1 className="h3" style={{ marginTop: 6 }}>
              {isLogin ? t("auth.loginTitle") : t("auth.signupTitle")}
            </h1>
            <p style={{ color: "var(--muted)", marginTop: 8 }}>
              {isLogin ? t("auth.loginSub") : t("auth.signupSub")}
            </p>

            {appMode === "demo" ? (
              <div className="form-error" style={{ marginTop: 20 }}>
                {t("auth.demoNote")}
              </div>
            ) : (
              <form className="form" style={{ marginTop: 22 }} onSubmit={submit}>
                <div className="field">
                  <label htmlFor="auth-email">{t("auth.email")}</label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("auth.emailPlaceholder")}
                  />
                </div>
                <div className="field">
                  <label htmlFor="auth-password">{t("auth.password")}</label>
                  <input
                    id="auth-password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("auth.passwordPlaceholder")}
                  />
                </div>
                {errorKey && <div className="form-error">{t(errorKey)}</div>}
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy
                    ? t("auth.wait")
                    : isLogin
                      ? t("auth.submitLogin")
                      : t("auth.submitSignup")}
                </button>
              </form>
            )}

            <p style={{ marginTop: 18, color: "var(--muted)", fontSize: "0.92rem" }}>
              {isLogin ? (
                <>
                  {t("auth.newHere")}{" "}
                  <Link href="/signup" className="text-link">
                    {t("auth.createAccountLink")}
                  </Link>
                </>
              ) : (
                <>
                  {t("auth.haveAccount")}{" "}
                  <Link href="/login" className="text-link">
                    {t("auth.loginLink")}
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

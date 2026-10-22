"use client";

/**
 * Shown when the signed-in role has no access to a section at all
 * (Phase A · A3, design §3.2). The sidebar already hides such links;
 * this covers direct navigation. Copy is dictionary-driven like every
 * other string in the app.
 */
import { useLang } from "./LangProvider";

export default function PermDenied() {
  const { t } = useLang();
  return (
    <div className="section">
      <div className="container">
        <div className="empty">
          <h2 style={{ fontSize: "1.3rem", marginBottom: 8 }}>{t("common.accessDenied")}</h2>
          <p style={{ color: "var(--muted)" }}>{t("common.accessDeniedBody")}</p>
        </div>
      </div>
    </div>
  );
}

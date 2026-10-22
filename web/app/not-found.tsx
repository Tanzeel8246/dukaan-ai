"use client";

import Link from "next/link";
import { useLang } from "@/components/LangProvider";

export default function NotFound() {
  const { t } = useLang();
  return (
    <div className="section">
      <div className="container" style={{ textAlign: "center" }}>
        <h1 className="h2">{t("shell.notFoundTitle")}</h1>
        <p className="lead" style={{ marginInline: "auto", marginBottom: 28 }}>
          {t("shell.notFoundBody")}
        </p>
        <Link href="/" className="btn btn-primary">
          {t("shell.backHome")}
        </Link>
      </div>
    </div>
  );
}

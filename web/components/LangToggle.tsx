"use client";

import { useLang } from "./LangProvider";
import { IconGlobe } from "./ui";

/**
 * Language switch — shows the CURRENT language's own name (from the
 * dictionary) and switches to the other language on click, so each mode
 * stays single-language.
 */
export default function LangToggle({ className }: { className?: string }) {
  const { lang, setLang, t } = useLang();
  return (
    <button
      type="button"
      className={className ?? "lang-toggle"}
      onClick={() => setLang(lang === "ur" ? "en" : "ur")}
      aria-label={t("shell.langName")}
      title={t("shell.langName")}
    >
      <IconGlobe />
      <span>{t("shell.langName")}</span>
    </button>
  );
}

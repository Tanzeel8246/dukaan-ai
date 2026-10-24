"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "./LangProvider";
import { LANGS, type I18nKey, type Lang } from "@/lib/i18n";
import { localeIsDraft } from "@/lib/i18n/review";
import { IconCheck, IconGlobe } from "./ui";

/**
 * Language picker (Phase H design §4.2): a compact menu over the four
 * locales. Each option shows the language's OWN name (dictionary copy,
 * identical in every locale). A PS/FA locale that is not yet 100%
 * human-reviewed carries the "Draft preview" badge — derived from the
 * review manifest, never stored here — in the menu and, when it is the
 * active language, on the toggle itself. The badge is the whole honesty
 * mechanism: per-string markers were considered and rejected (§4.2).
 */
const LANG_LABEL_KEYS: Record<Lang, I18nKey> = {
  en: "settings.langEnglish",
  ur: "settings.langUrdu",
  ps: "settings.langPashto",
  fa: "settings.langFarsi",
};

const LANG_SCRIPT_CLASS: Record<Lang, string> = {
  en: "",
  ur: "ur",
  ps: "naskh",
  fa: "naskh",
};

export default function LangToggle({ className }: { className?: string }) {
  const { lang, setLang, t } = useLang();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on any pointer-down outside the picker (ThemeToggle's pattern).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open ]);

  const apply = (next: Lang) => {
    setLang(next);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const focusOption = (idx: number) => {
    const items = menuRef.current?.querySelectorAll<HTMLButtonElement>("[role='option']");
    if (!items || items.length === 0) return;
    items[((idx % items.length) + items.length) % items.length]?.focus();
  };

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    const items = menuRef.current?.querySelectorAll<HTMLButtonElement>("[role='option']");
    const current = items ? Array.from(items).indexOf(document.activeElement as HTMLButtonElement) : -1;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusOption(current + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusOption(current - 1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    }
  };

  const activeDraft = localeIsDraft(lang);

  return (
    <div className="lang-picker" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={className ?? "lang-toggle"}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("shell.langName")}
        title={t("shell.langName")}
      >
        <IconGlobe />
        <span className={LANG_SCRIPT_CLASS[lang]}>{t("shell.langName")}</span>
        {activeDraft && (
          <span className="lang-draft-badge">{t("settings.langDraftPreview")}</span>
        )}
      </button>
      {open && (
        <div
          className="lang-menu"
          role="listbox"
          aria-label={t("settings.languageTitle")}
          ref={menuRef}
          onKeyDown={onMenuKeyDown}
        >
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              role="option"
              aria-selected={lang === l}
              className="lang-option"
              onClick={() => apply(l)}
            >
              <span className={`lang-name ${LANG_SCRIPT_CLASS[l]}`}>
                {t(LANG_LABEL_KEYS[l])}
              </span>
              {localeIsDraft(l) && (
                <span className="lang-draft-badge">{t("settings.langDraftPreview")}</span>
              )}
              {lang === l && <IconCheck className="lang-check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

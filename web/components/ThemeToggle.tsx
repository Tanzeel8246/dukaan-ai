"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "./LangProvider";
import type { I18nKey } from "@/lib/i18n";
import { IconCheck, IconPalette } from "./ui";

/**
 * Theme picker (five-theme increment): the header toggle is now a
 * compact palette menu over the token system in globals.css. Five
 * calm themes — Emerald Calm (light, default), Midnight Slate
 * (dark), Ocean (light), Warm Sand (light), Dusk Violet (dark) —
 * applied instantly via [data-theme] on <html> and persisted in
 * localStorage under the same key the old light/dark toggle used;
 * legacy values migrate ("light" → emerald, "dark" → midnight),
 * mirroring the pre-paint script in app/layout.tsx.
 */
export type ThemeId = "emerald" | "midnight" | "ocean" | "sand" | "dusk";

const STORAGE_KEY = "dukaan-ai-theme";

const THEMES: { id: ThemeId; labelKey: I18nKey; swatches: [string, string, string] }[] = [
  { id: "emerald", labelKey: "shell.theme.emerald", swatches: ["#F7F5EF", "#FDFCFA", "#0E7A4B"] },
  { id: "midnight", labelKey: "shell.theme.midnight", swatches: ["#15181D", "#1E242C", "#43A97E"] },
  { id: "ocean", labelKey: "shell.theme.ocean", swatches: ["#EEF5F4", "#FBFDFC", "#0C6B6E"] },
  { id: "sand", labelKey: "shell.theme.sand", swatches: ["#F8F2E7", "#FEFCF7", "#0E7A4B"] },
  { id: "dusk", labelKey: "shell.theme.dusk", swatches: ["#1A1921", "#262430", "#9D8BD0"] },
];

function resolveTheme(raw: string | undefined | null): ThemeId {
  if (raw === "dark" || raw === "midnight") return "midnight";
  if (raw === "ocean" || raw === "sand" || raw === "dusk") return raw;
  return "emerald"; // "light", unset, or anything unknown
}

export default function ThemeToggle() {
  const { t } = useLang();
  // Default theme for Dukaan AI is Emerald Calm (light).
  const [theme, setTheme] = useState<ThemeId>("emerald");
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // The pre-paint script in layout already set data-theme; just sync state.
    setTheme(resolveTheme(document.documentElement.dataset.theme));
    setReady(true);
  }, []);

  // Close on any pointer-down outside the picker.
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

  const apply = (next: ThemeId) => {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
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

  return (
    <div className="theme-picker" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="theme-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("shell.chooseTheme")}
        title={t("shell.chooseTheme")}
        style={ready ? undefined : { visibility: "hidden" }}
      >
        <IconPalette />
      </button>
      {open && (
        <div
          className="theme-menu"
          role="listbox"
          aria-label={t("shell.chooseTheme")}
          ref={menuRef}
          onKeyDown={onMenuKeyDown}
        >
          <div className="theme-menu-label">{t("shell.chooseTheme")}</div>
          {THEMES.map((th) => (
            <button
              key={th.id}
              type="button"
              role="option"
              aria-selected={theme === th.id}
              className="theme-option"
              onClick={() => apply(th.id)}
            >
              <span className="theme-swatches" aria-hidden="true">
                {th.swatches.map((c) => (
                  <span key={c} style={{ background: c }} />
                ))}
              </span>
              <span className="theme-name">{t(th.labelKey)}</span>
              {theme === th.id && <IconCheck className="theme-check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

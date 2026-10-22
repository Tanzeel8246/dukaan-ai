"use client";

import { useEffect, useState } from "react";
import { useLang } from "./LangProvider";
import { IconMoon, IconSun } from "./ui";

type Theme = "dark" | "light";

const STORAGE_KEY = "dukaan-ai-theme";

export default function ThemeToggle() {
  const { t } = useLang();
  // Default theme for Dukaan AI is LIGHT.
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // The pre-paint script in layout already set data-theme; just sync state.
    const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    setTheme(current);
    setReady(true);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={t("shell.toggleTheme")}
      title={t("shell.toggleTheme")}
      style={ready ? undefined : { visibility: "hidden" }}
    >
      {theme === "dark" ? <IconSun /> : <IconMoon />}
    </button>
  );
}

"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  LANG_STORAGE_KEY,
  isRtlLang,
  translate,
  type I18nKey,
  type Lang,
  type TParams,
} from "@/lib/i18n";
import { setFormatLang } from "@/lib/format";

interface LangValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: I18nKey, params?: TParams) => string;
}

const LangContext = createContext<LangValue | null>(null);

function applyLang(l: Lang) {
  document.documentElement.lang = l;
  document.documentElement.dir = isRtlLang(l) ? "rtl" : "ltr";
  setFormatLang(l);
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  // Default language is Urdu; the pre-paint lang-init script in layout.tsx
  // has already set <html lang/dir> from the same default, so first paint
  // and hydration agree.
  const [lang, setLangState] = useState<Lang>("ur");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === "ur" || saved === "en" || saved === "ps" || saved === "fa")
        setLangState(saved);
    } catch {
      /* keep default */
    }
  }, []);

  useEffect(() => {
    applyLang(lang);
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    applyLang(l);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  };

  const value = useMemo<LangValue>(
    () => ({
      lang,
      setLang,
      t: (key, params) => translate(lang, key, params),
    }),
    [lang]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangValue {
  const ctx = useContext(LangContext);
  if (!ctx)
    return {
      lang: "ur",
      setLang: () => undefined,
      t: (key: I18nKey, params?: TParams) => translate("ur", key, params),
    };
  return ctx;
}

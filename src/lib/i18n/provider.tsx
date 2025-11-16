"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { dictionaries, getFromDictionary, Locale } from "./dictionaries";

type I18nContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const STORAGE_KEY = "app_locale";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const fromStorage = (typeof window !== "undefined" && (localStorage.getItem(STORAGE_KEY) as Locale | null)) || null;
    if (fromStorage && (fromStorage === "en" || fromStorage === "zh")) {
      setLocaleState(fromStorage);
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale === "zh" ? "zh" : "en";
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, locale);
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => setLocaleState(next), []);

  const t = useCallback((key: string) => {
    const value = getFromDictionary(dictionaries[locale], key);
    if (!value) {
      const fallback = getFromDictionary(dictionaries.en, key);
      return fallback ?? key;
    }
    return value;
  }, [locale]);

  const value: I18nContextValue = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}



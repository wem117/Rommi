"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { type Locale, translate } from "@/lib/i18n";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem("roommate-kz:locale");
    if (saved === "en" || saved === "ru" || saved === "kz") {
      setLocaleState(saved);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "kz" ? "kk" : locale;
  }, [locale]);

  function setLocale(locale: Locale) {
    setLocaleState(locale);
    window.localStorage.setItem("roommate-kz:locale", locale);
  }

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: (key: string) => translate(locale, key)
    }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used within LocaleProvider");
  return context;
}

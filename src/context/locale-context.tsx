"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { getPublicSettings } from "@/lib/data/public-settings";
import { type Locale, translate } from "@/lib/i18n";

function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "ru" || value === "kz";
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem("roomi:locale");
    if (isLocale(saved)) {
      setLocaleState(saved);
      return;
    }

    // No saved preference yet: use the admin-configured default language.
    void getPublicSettings().then((settings) => {
      if (isLocale(settings.platform.defaultLanguage) && !window.localStorage.getItem("roomi:locale")) {
        setLocaleState(settings.platform.defaultLanguage);
      }
    });
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "kz" ? "kk" : locale;
  }, [locale]);

  function setLocale(locale: Locale) {
    setLocaleState(locale);
    window.localStorage.setItem("roomi:locale", locale);
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

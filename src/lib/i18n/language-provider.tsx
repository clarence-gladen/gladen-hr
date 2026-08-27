"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import en from "./dictionaries/en";
import zh from "./dictionaries/zh";

export type Locale = "en" | "zh";

const dictionaries = { en, zh };
const STORAGE_KEY = "gladen-hr-locale";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getByPath(obj: unknown, path: string): string | undefined {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj) as string | undefined;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "zh") {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  // `vars` fills {name} placeholders, so a string whose word order differs
  // between languages ("{n} on site now" / "{n} 人在场") stays one translatable
  // unit instead of being concatenated in the component.
  const t = (path: string, vars?: Record<string, string | number>): string => {
    const translated = getByPath(dictionaries[locale], path);
    const value = translated ?? getByPath(dictionaries.en, path) ?? path;
    if (!vars) return value;
    return value.replace(/\{(\w+)\}/g, (match, key) =>
      key in vars ? String(vars[key]) : match
    );
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}

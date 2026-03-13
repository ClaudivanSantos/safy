"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type Language = "en" | "pt-BR";

type LanguageContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined,
);

const STORAGE_KEY = "safy-language";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    try {
      const stored =
        (globalThis as unknown as {
          localStorage?: {
            getItem: (k: string) => string | null;
          };
        }).localStorage?.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "pt-BR") {
        setLanguageState(stored);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    try {
      (globalThis as unknown as {
        document?: {
          documentElement: { setAttribute: (k: string, v: string) => void };
        };
      }).document?.documentElement.setAttribute("lang", language);
      (globalThis as unknown as {
        localStorage?: {
          getItem: (k: string) => string | null;
          setItem: (k: string, v: string) => void;
        };
      }).localStorage?.setItem(STORAGE_KEY, language);
    } catch {
      // ignore
    }
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
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


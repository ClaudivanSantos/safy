"use client";

import { useCallback } from "react";
import { useLanguage } from "../contexts/language-context";
import { translations, getTranslation } from "../i18n/translations";

export function useTranslation(namespace?: string) {
  const { language } = useLanguage();

  const t = useCallback(
    (key: string) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      const value = getTranslation(translations[language], fullKey);
      return value ?? fullKey;
    },
    [language, namespace],
  );

  return { t, language };
}


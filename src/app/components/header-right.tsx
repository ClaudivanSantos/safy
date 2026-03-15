"use client";

import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "@/app/contexts/language-context";
import { UserMenu } from "./user-menu";
import { DonationModal } from "./donation-modal";
import { useTranslation } from "@/app/hooks/use-translation";

type HeaderRightProps = {
  session: boolean;
  userName: string | null;
};

export function HeaderRight({ session, userName }: HeaderRightProps) {
  const [donationOpen, setDonationOpen] = useState(false);
  const { t } = useTranslation("common");
  const { language, setLanguage } = useLanguage();

  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);

  return (
    <>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={() => setDonationOpen(true)}
          className="rounded-md p-1.5 font-medium text-foreground/90 transition-colors hover:bg-muted hover:text-primary sm:px-2 sm:py-1.5 sm:text-xs animate-[coffee-glow_2.5s_ease-in-out_infinite]"
          title={t("donateTitle")}
        >
          <span className="sm:hidden">{t("donateShort")}</span>
          <span className="hidden sm:inline">{t("donateLong")}</span>
        </button>
        <div className="relative flex">
          <button
            type="button"
            onClick={() => setLanguageMenuOpen((open) => !open)}
            className="flex h-8 items-center gap-1 rounded-full border border-border bg-muted/40 px-2 text-xs text-foreground hover:bg-muted"
            aria-haspopup="menu"
            aria-expanded={languageMenuOpen}
            aria-label={language === "en" ? "Switch language" : "Mudar idioma"}
          >
            <span aria-hidden>{language === "en" ? "🇺🇸" : "🇧🇷"}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              {languageMenuOpen ? (
                <path d="M5 12.5L10 7.5L15 12.5" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M5 7.5L10 12.5L15 7.5" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </button>
          {languageMenuOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-28 rounded-md border border-border bg-background py-1 text-xs shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setLanguage("en");
                  setLanguageMenuOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left ${
                  language === "en"
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <span aria-hidden>🇺🇸</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLanguage("pt-BR");
                  setLanguageMenuOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left ${
                  language === "pt-BR"
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <span aria-hidden>🇧🇷</span>
              </button>
            </div>
          )}
        </div>
        {session ? (
          <UserMenu userName={userName} />
        ) : (
          <Link
            href="/login"
            className="rounded bg-primary px-2 py-1.5 text-xs font-medium text-black hover:bg-primary-hover sm:px-3 sm:py-2 sm:text-sm"
          >
            {t("login")}
          </Link>
        )}
      </div>
      <DonationModal open={donationOpen} onClose={() => setDonationOpen(false)} />
    </>
  );
}

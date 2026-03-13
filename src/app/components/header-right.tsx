"use client";

import Link from "next/link";
import { useState } from "react";
import { useWallet, shortAddress } from "@/app/contexts/wallet-context";
import { useLanguage } from "@/app/contexts/language-context";
import { UserMenu } from "./user-menu";
import { DonationModal } from "./donation-modal";
import { useTranslation } from "@/app/hooks/use-translation";

function WalletIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </svg>
  );
}

type HeaderRightProps = {
  session: boolean;
  userName: string | null;
};

export function HeaderRight({ session, userName }: HeaderRightProps) {
  const [donationOpen, setDonationOpen] = useState(false);
  const { address, connecting, connectWallet, disconnectWallet } = useWallet();
  const { t } = useTranslation("common");
  const { language, setLanguage } = useLanguage();

  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
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
        <div className="relative hidden md:flex">
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
        {address ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setWalletMenuOpen((open) => !open)}
              className="flex items-center gap-1 rounded border border-border bg-muted/50 px-1.5 py-1 text-[10px] font-medium text-foreground hover:bg-muted sm:gap-1.5 sm:px-3 sm:py-2 sm:text-sm"
              aria-haspopup="menu"
              aria-expanded={walletMenuOpen}
              title={address}
            >
              <WalletIcon className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
              <span className="max-w-[56px] truncate font-mono sm:max-w-[100px]">
                {shortAddress(address)}
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                {walletMenuOpen ? (
                  <path d="M5 12.5L10 7.5L15 12.5" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <path d="M5 7.5L10 12.5L15 7.5" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </svg>
            </button>
            {walletMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-md border border-border bg-background py-1 text-xs shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    disconnectWallet();
                    setWalletMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-red-400 hover:bg-red-500/10"
                >
                  {t("disconnectLong")}
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={connectWallet}
            disabled={connecting}
            className="flex items-center gap-1.5 rounded border border-border bg-muted/50 px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 sm:px-3 sm:py-2 sm:text-sm"
            title={t("connectTitle")}
          >
            <WalletIcon className="h-4 w-4 shrink-0 sm:h-4 sm:w-4" />
            {connecting ? "…" : <span>{t("connect")}</span>}
          </button>
        )}
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

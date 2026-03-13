"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslation } from "@/app/hooks/use-translation";
import { useLanguage } from "@/app/contexts/language-context";

type UserMenuProps = {
  userName: string | null;
};

export function UserMenu({ userName }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation("common");
  const { language, setLanguage } = useLanguage();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const el = menuRef.current as unknown as { contains(node: unknown): boolean } | null;
      if (el && !el.contains(e.target)) {
        setOpen(false);
      }
    }
    const doc =
      typeof globalThis !== "undefined"
        ? (globalThis as unknown as { document?: { addEventListener: (t: string, h: (e: MouseEvent) => void) => void; removeEventListener: (t: string, h: (e: MouseEvent) => void) => void } }).document ?? null
        : null;
    if (open && doc) {
      doc.addEventListener("click", handleClickOutside);
      return () => doc.removeEventListener("click", handleClickOutside);
    }
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted/50 text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary sm:h-9 sm:w-9"
        aria-label={t("userMenuAria") ?? "User menu"}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="h-4 w-4 sm:h-5 sm:w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </button>

      {open && mounted && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-border bg-background py-2 shadow-lg"
          role="menu"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="text-xs font-medium text-foreground/60">
              {t("loggedInAs") ?? "Logged in as"}
            </p>
            <p className="truncate font-medium text-foreground">
              {userName || t("userFallback") || "User"}
            </p>
          </div>
          <div className="border-t border-border pt-1">
            <div className="px-4 pb-2 pt-1 md:hidden">
              <p className="mb-1 text-xs font-medium text-foreground/60">
                {t("langToggleTitle")}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-xs ${
                    language === "en"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/40 text-foreground hover:bg-muted"
                  }`}
                >
                  <span aria-hidden>🇺🇸</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("pt-BR")}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-xs ${
                    language === "pt-BR"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/40 text-foreground hover:bg-muted"
                  }`}
                >
                  <span aria-hidden>🇧🇷</span>
                </button>
              </div>
            </div>
            <div className="my-1 border-t border-border" />
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10"
                role="menuitem"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" x2="9" y1="12" y2="12" />
                </svg>
                {t("disconnectShort")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

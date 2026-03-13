"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const LINKS = [
  { href: "/dashboard", label: "Dashbaord" },
  { href: "/preco-medio", label: "Preço Médio" },
  { href: "/pools-liquidez", label: "Pools" },
  { href: "/saude-defi", label: "Saúde DeFi (Aave)" },
  // { href: "/premium", label: "Premium" },
];

export function HeaderNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const g = typeof globalThis !== "undefined" ? globalThis : null;
    const doc = g ? (g as unknown as { document?: { addEventListener: (t: string, h: (e: { key: string }) => void) => void; removeEventListener: (t: string, h: (e: { key: string }) => void) => void; body: { style: { overflow: string } } } }).document ?? null : null;
    const handleEscape = (e: { key: string }) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    if (mobileOpen && doc) {
      doc.addEventListener("keydown", handleEscape);
      doc.body.style.overflow = "hidden";
    }
    return () => {
      if (doc) {
        doc.removeEventListener("keydown", handleEscape);
        doc.body.style.overflow = "";
      }
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Desktop nav */}
      <nav className="order-2 hidden shrink-0 items-center gap-0.5 md:flex md:gap-1">
        {LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="rounded-md px-2 py-1.5 text-xs font-medium text-foreground/90 transition-colors hover:bg-muted hover:text-primary md:px-2.5 md:py-2 md:text-sm"
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Mobile hamburger */}
      <div className="order-1 flex shrink-0 md:order-2 md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="rounded-md p-2 text-foreground/90 hover:bg-muted hover:text-primary"
          aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile overlay menu */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 top-12 z-40 bg-black/60 md:hidden"
            aria-hidden
            onClick={() => setMobileOpen(false)}
          />
          <nav
            className="fixed left-0 right-0 top-12 z-50 flex flex-col gap-0 border-b border-border bg-background/98 p-2 backdrop-blur md:hidden"
            role="dialog"
            aria-label="Menu de navegação"
          >
            {LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground/90 transition-colors hover:bg-muted hover:text-primary"
              >
                {label}
              </Link>
            ))}
          </nav>
        </>
      )}
    </>
  );
}

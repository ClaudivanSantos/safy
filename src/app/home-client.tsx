"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DonationModal } from "./components/donation-modal";
import { Footer } from "./components/footer";
import Image from "next/image";
import { useTranslation } from "./hooks/use-translation";

const STORAGE_KEY = "safy-donation-modal-seen";

const FEATURES = [
  {
    key: "dashboard" as const,
    href: "/dashboard",
    icon: "📊",
  },
  {
    key: "averagePrice" as const,
    href: "/preco-medio",
    icon: "🧮",
  },
  {
    key: "pools" as const,
    href: "/pools-liquidez",
    icon: "💧",
  },
  {
    key: "defiHealth" as const,
    href: "/saude-defi",
    icon: "❤️",
  },
];

function ProtocolLogo({ name, color }: { name: string; color: string }) {
  const initial = name.slice(0, 1);
  return (
    <div
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-md transition hover:scale-105"
      style={{ backgroundColor: color }}
      title={name}
    >
      {initial}
    </div>
  );
}

export function HomeClient() {
  const [donationOpen, setDonationOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation("home");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const timer = setTimeout(() => {
      try {
        const seen = (globalThis as unknown as { localStorage?: { getItem: (k: string) => string | null } }).localStorage?.getItem(STORAGE_KEY);
        if (!seen) setDonationOpen(true);
      } catch {
        // localStorage indisponível (ex: modo privado)
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [mounted]);

  const handleCloseModal = () => {
    setDonationOpen(false);
    try {
      (globalThis as unknown as { localStorage?: { setItem: (k: string, v: string) => void } }).localStorage?.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  };

  return (
    <>
      <div className="flex min-h-full flex-col">
        <main
          className="flex flex-1 flex-col px-4 py-10 pb-6"
          suppressHydrationWarning
        >
          <div className="mx-auto max-w-5xl space-y-14">
            {/* Hero */}
            <header className="relative overflow-hidden rounded-2xl border border-border bg-linear-to-br from-primary/15 via-background to-accent/10 p-8 text-center md:p-12">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--color-primary)_0%,transparent_50%)] opacity-30" />
              <div className="relative flex flex-col items-center gap-6">
                <div className="relative">
                  <Image
                    src="/logo.png"
                    alt="Safy"
                    width={160}
                    height={160}
                    className="rounded-2xl shadow-lg"
                  />
                  <div className="absolute -inset-1 -z-10 rounded-2xl bg-linear-to-r from-primary/30 to-accent/30 opacity-50 blur-xl" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                    Safy
                  </h1>
                  <p className="mt-2 text-lg font-medium text-foreground/90 md:text-xl">
                    {t("subtitle")}
                  </p>
                  <p className="mt-4 max-w-2xl text-sm text-foreground/70 md:text-base">
                    {t("description")}
                  </p>
                </div>
                {/* Decorative animated gradient */}
                <div
                  className="h-1 w-32 rounded-full bg-linear-to-r from-primary via-accent to-primary bg-size-[200%_100%]"
                  style={{ animation: "shimmer 3s ease-in-out infinite" }}
                  aria-hidden
                />
              </div>
            </header>

            {/* Funcionalidades */}
            <section>
              <h2 className="mb-6 text-center text-xl font-semibold text-foreground md:text-2xl">
                {t("featuresTitle")}
              </h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {FEATURES.map((f) => {
                  const titleKey =
                    f.key === "dashboard"
                      ? "featureDashboardTitle"
                      : f.key === "averagePrice"
                      ? "featureAveragePriceTitle"
                      : f.key === "pools"
                      ? "featurePoolsTitle"
                      : "featureDefiHealthTitle";
                  const descriptionKey =
                    f.key === "dashboard"
                      ? "featureDashboardDescription"
                      : f.key === "averagePrice"
                      ? "featureAveragePriceDescription"
                      : f.key === "pools"
                      ? "featurePoolsDescription"
                      : "featureDefiHealthDescription";
                  return (
                    <Link
                      key={f.href}
                      href={f.href}
                      className="group relative overflow-hidden rounded-xl border border-border bg-muted/20 p-6 transition hover:border-accent/40 hover:bg-muted/30"
                    >
                      <h3 className="font-semibold text-foreground group-hover:text-primary">
                        {t(titleKey)}
                      </h3>
                      <p className="mt-1 text-sm text-foreground/70">
                        {t(descriptionKey)}
                      </p>
                      <span className="mt-3 inline-flex items-center text-xs font-medium text-primary">
                        {t("access")}
                        <svg className="ml-1 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* CTA */}
            <section className="rounded-xl border border-border bg-muted/20 p-6 text-center">
              <p className="text-sm text-foreground/80">
                {t("cta")}
              </p>
            </section>


          </div>
        </main>
        <Footer onDonateClick={() => setDonationOpen(true)} />
      </div>
      <DonationModal open={donationOpen} onClose={handleCloseModal} />
    </>
  );
}

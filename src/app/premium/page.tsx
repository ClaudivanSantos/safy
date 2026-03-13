"use client";

import { PremiumVerification } from "@/app/components/premium-verification";
import { useTranslation } from "@/app/hooks/use-translation";

export default function PremiumPage() {
  const { t } = useTranslation("premium");

  return (
    <div className="min-h-screen px-4 py-8 pb-24">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 lg:flex-row">
        <header className="flex-1 rounded-2xl border border-border bg-linear-to-br from-primary/15 via-background to-accent/10 p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {t("heroBadge")}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {t("heroTitle")}
          </h1>
          <p className="mt-3 text-sm text-foreground/70 md:text-base">
            {t("heroDescription")}
          </p>

          <div className="mt-6 grid gap-4 text-sm md:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {t("freePlanTitle")}
              </p>
              <ul className="mt-2 space-y-1.5 text-foreground/70">
                <li>{t("freePlanItem1")}</li>
                <li>{t("freePlanItem2")}</li>
                <li>{t("freePlanItem3")}</li>
              </ul>
            </div>
            <div className="rounded-xl border border-primary/60 bg-primary/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {t("paidPlanTitle")}
              </p>
              <ul className="mt-2 space-y-1.5 text-foreground">
                <li>{t("paidPlanItem1")}</li>
                <li>{t("paidPlanItem2")}</li>
                <li>{t("paidPlanItem3")}</li>
                <li>{t("paidPlanItem4")}</li>
              </ul>
            </div>
          </div>

          <p className="mt-4 text-xs text-foreground/60">
            {t("heroFooter")}
          </p>
        </header>

        <div className="flex-1">
          <PremiumVerification />
        </div>
      </div>
    </div>
  );
}

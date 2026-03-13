import { useTranslation } from "@/app/hooks/use-translation";

export function Footer({ onDonateClick }: { onDonateClick?: () => void }) {
  const { t } = useTranslation("footer");
  return (
    <footer className="shrink-0 border-t border-border bg-background/80 py-8">
      <div className="mx-auto max-w-4xl px-4 text-center text-sm text-foreground/70">
        <p className="font-medium text-foreground/90">
          {t("builtBy")}
        </p>
        <p className="mt-2">
          {t("intro")}
          {onDonateClick ? (
            <button
              type="button"
              onClick={onDonateClick}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {t("donateWithHandler")}
            </button>
          ) : (
            t("donateWithoutHandler")
          )}
        </p>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { useTranslation } from "@/app/hooks/use-translation";

export default function OfflinePage() {
  const { t } = useTranslation("offline");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <main className="flex max-w-md flex-col items-center gap-6 px-8 text-center">
        <h1 className="text-2xl font-bold text-primary">{t("title")}</h1>
        <p className="text-foreground/80">
          {t("description")}
        </p>
        <Link
          href="/"
          className="rounded-lg bg-primary px-6 py-3 font-medium text-black transition-colors hover:bg-primary-hover"
        >
          {t("retry")}
        </Link>
      </main>
    </div>
  );
}

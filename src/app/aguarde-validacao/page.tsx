import Link from "next/link";
import { useTranslation } from "@/app/hooks/use-translation";

export default function AguardeValidacaoPage() {
  const { t } = useTranslation("validationPage");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <main className="max-w-md space-y-6 text-center">
        <h1 className="text-2xl font-bold text-primary">{t("title")}</h1>
        <p className="text-foreground/80">
          {t("description")}
        </p>
        <p className="text-sm text-foreground/60">
          {t("hint")}
        </p>
        <form action="/auth/logout" method="POST">
          <button
            type="submit"
            className="rounded-lg border border-border bg-muted px-4 py-2 text-sm text-foreground hover:bg-muted/80"
          >
            {t("logout")}
          </button>
        </form>
        <Link
          href="/login"
          className="inline-block text-sm text-primary hover:underline"
        >
          {t("goToLogin")}
        </Link>
      </main>
    </div>
  );
}

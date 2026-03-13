import { PremiumVerification } from "@/app/components/premium-verification";

export default function PremiumPage() {
  return (
    <div className="min-h-screen px-4 py-8 pb-24">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Premium SafyApp
          </h1>
          <p className="mt-2 text-foreground/70">
            Ative o plano premium para receber alertas no Telegram: saúde da Aave,
            risco de liquidação e relatório diário.
          </p>
        </header>
        <PremiumVerification />
      </div>
    </div>
  );
}

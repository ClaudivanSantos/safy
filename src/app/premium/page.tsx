import { PremiumVerification } from "@/app/components/premium-verification";

export default function PremiumPage() {
  return (
    <div className="min-h-screen px-4 py-8 pb-24">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 lg:flex-row">
        <header className="flex-1 rounded-2xl border border-border bg-linear-to-br from-primary/15 via-background to-accent/10 p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Plano premium • US$ 2/mês
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Alertas inteligentes para proteger sua carteira DeFi.
          </h1>
          <p className="mt-3 text-sm text-foreground/70 md:text-base">
            Por apenas <strong className="text-primary">US$ 2</strong> você recebe alertas no Telegram
            sobre saúde da Aave, risco de liquidação e um relatório diário resumindo sua posição.
          </p>

          <div className="mt-6 grid gap-4 text-sm md:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Plano gratuito
              </p>
              <ul className="mt-2 space-y-1.5 text-foreground/70">
                <li>- Acesso ao painel básico</li>
                <li>- Consulta manual de pools e saúde da Aave</li>
                <li>- Sem alertas automáticos</li>
              </ul>
            </div>
            <div className="rounded-xl border border-primary/60 bg-primary/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Premium SafyApp · US$ 2
              </p>
              <ul className="mt-2 space-y-1.5 text-foreground">
                <li>✓ Alertas de saúde da Aave no Telegram</li>
                <li>✓ Avisos de risco de liquidação</li>
                <li>✓ Relatório diário automático</li>
                <li>✓ Suporte prioritário para novidades</li>
              </ul>
            </div>
          </div>

          <p className="mt-4 text-xs text-foreground/60">
            Você pode cancelar a qualquer momento. O valor é cobrado em stablecoin (USDT) em redes de baixo custo.
          </p>
        </header>

        <div className="flex-1">
          <PremiumVerification />
        </div>
      </div>
    </div>
  );
}

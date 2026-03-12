"use client";

import { useState } from "react";
import { useWallet } from "@/app/contexts/wallet-context";

type ApiResponse =
  | { success: true; premiumExpiresAt: string }
  | { success?: false; error?: string };

export function PremiumVerification() {
  const { address, connecting, connectWallet } = useWallet();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleVerify = async () => {
    setMessage(null);

    if (!address) {
      setMessage("Conecte sua carteira no topo da página para verificar o pagamento.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/verify-premium-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ wallet_address: address }),
      });

      const data = (await res.json().catch(() => ({}))) as ApiResponse;

      if (!res.ok) {
        const errorMsg =
          (data as { error?: string }).error ??
          "Falha ao verificar pagamento. Tente novamente.";
        setMessage(errorMsg);
        return;
      }

      if ("success" in data && data.success) {
        const date = new Date(data.premiumExpiresAt);
        const formatted = new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(date);
        setMessage(`Pagamento confirmado. Premium ativo até ${formatted}.`);
      } else {
        const errorMsg =
          (data as { error?: string }).error ??
          "Não foi possível confirmar o pagamento.";
        setMessage(errorMsg);
      }
    } catch {
      setMessage("Erro de rede ao verificar pagamento. Tente novamente em instantes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-muted/20 p-6">
      <h2 className="mb-2 text-lg font-semibold text-foreground">
        Premium SafyApp
      </h2>
      <p className="mb-4 text-sm text-foreground/60">
        Após realizar o pagamento de 5 USDT na BNB Chain para o endereço indicado,
        clique abaixo para validar a transação e ativar seu plano premium.
      </p>
      {message && (
        <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {message}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {!address ? (
          <button
            type="button"
            onClick={connectWallet}
            disabled={connecting}
            className="rounded-lg border border-border bg-muted/40 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
          >
            {connecting ? "Conectando carteira…" : "Conectar carteira"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleVerify}
          disabled={loading}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-black hover:bg-primary-hover disabled:opacity-60"
        >
          {loading ? "Verificando pagamento…" : "Verificar pagamento"}
        </button>
      </div>
      <p className="mt-2 text-xs text-foreground/60">
        É necessário estar logado na SafyApp e usar a mesma carteira utilizada no
        pagamento para validação on-chain.
      </p>
    </section>
  );
}


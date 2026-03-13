"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { encodeFunctionData, parseAbiItem } from "viem";
import { SiBinance, SiPolygon, SiEthereum, SiTelegram } from "react-icons/si";
import { useWallet } from "@/app/contexts/wallet-context";
import type { PremiumNetworkId } from "@/lib/premium-networks";

type NetworkOption = {
  id: PremiumNetworkId;
  name: string;
  chainIdHex: string;
  usdtContract: string;
  decimals: number;
  chainParams: {
    chainId: string;
    chainName: string;
    nativeCurrency: { name: string; symbol: string; decimals: number };
    rpcUrls: string[];
    blockExplorerUrls: string[];
  };
};

type PaymentInfo = {
  paymentAddress: string;
  amount: string;
  currency: string;
  networks: NetworkOption[];
  premiumExpiresAt?: string | null;
};

function WalletIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </svg>
  );
}

export function PremiumVerification() {
  const { address, connecting, connectWallet } = useWallet();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [selectedNetworkId, setSelectedNetworkId] = useState<PremiumNetworkId>("bsc");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [payingLoading, setPayingLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSeePremium = loggedIn === true;
  const isBlocked = !canSeePremium;
  const selectedNetwork = paymentInfo?.networks?.find((n) => n.id === selectedNetworkId) ?? paymentInfo?.networks?.[0];
  const canOpenWallet = canSeePremium && !!address && !!paymentInfo?.paymentAddress && !!selectedNetwork;

  const premiumExpiresAt = paymentInfo?.premiumExpiresAt
    ? new Date(paymentInfo.premiumExpiresAt)
    : null;
  const isPremiumActive =
    premiumExpiresAt != null && premiumExpiresAt.getTime() > Date.now();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session", { credentials: "include" })
      .then((res) => res.json())
      .then((data: { loggedIn?: boolean }) => {
        if (!cancelled) setLoggedIn(!!data.loggedIn);
      })
      .catch(() => {
        if (!cancelled) setLoggedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loggedIn) {
      setPaymentInfo(null);
      return;
    }
    let cancelled = false;
    fetch("/api/premium-payment-info", { credentials: "include" })
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data: PaymentInfo | null) => {
        if (!cancelled && data?.paymentAddress && data?.networks?.length)
          setPaymentInfo(data);
      })
      .catch(() => {
        if (!cancelled) setPaymentInfo(null);
      });
    return () => {
      cancelled = true;
    };
  }, [loggedIn]);

  const ensureChain = async (
    eth: { request: (p: { method: string; params?: unknown[] }) => Promise<unknown> },
    chainIdHex: string,
    chainParams: NetworkOption["chainParams"]
  ): Promise<boolean> => {
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }],
      });
      return true;
    } catch (switchErr: unknown) {
      const code = (switchErr as { code?: number })?.code;
      if (code === 4902) {
        try {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [chainParams],
          });
          return true;
        } catch {
          setError("Adicione a rede na sua carteira e tente novamente.");
          return false;
        }
      }
      setError("Altere a rede na sua carteira e tente novamente.");
      return false;
    }
  };

  const handlePayWithWallet = async () => {
    if (!address || !paymentInfo?.paymentAddress || !selectedNetwork) {
      setError("Dados de pagamento indisponíveis. Recarregue a página.");
      return;
    }
    setMessage(null);
    setError(null);
    setPayingLoading(true);
    const g = typeof globalThis !== "undefined" ? globalThis : null;
    const win = g && "window" in g ? (g as unknown as { window: { ethereum?: unknown } }).window : null;
    const eth = win
      ? (win as unknown as { ethereum?: { request: (p: { method: string; params?: unknown[] }) => Promise<unknown> } })
          .ethereum
      : undefined;
    if (!eth) {
      setError("Nenhuma carteira encontrada. Instale MetaMask ou outra wallet compatível.");
      setPayingLoading(false);
      return;
    }
    const net = selectedNetwork;
    const priceUsd = billingPeriod === "annual" ? 18 : 2;
    const amountWei = BigInt(priceUsd) * BigInt(10) ** BigInt(net.decimals);
    try {
      const okChain = await ensureChain(eth, net.chainIdHex, net.chainParams);
      if (!okChain) {
        setPayingLoading(false);
        return;
      }
      const data = encodeFunctionData({
        abi: [parseAbiItem("function transfer(address to, uint256 value) returns (bool)")],
        functionName: "transfer",
        args: [paymentInfo.paymentAddress as `0x${string}`, amountWei],
      });
      const txHash = (await eth.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: address,
            to: net.usdtContract,
            data,
            chainId: net.chainIdHex,
          },
        ],
      })) as string | undefined;
      if (!txHash || typeof txHash !== "string") {
        setError("Transação não enviada. Tente novamente.");
        setPayingLoading(false);
        return;
      }
      setMessage(`Transação enviada. Aguardando confirmação na ${net.name}…`);
      const maxAttempts = 40;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const rres = await fetch(
          `/api/tx-receipt?hash=${encodeURIComponent(txHash)}&chain=${net.id}&wallet=${encodeURIComponent(address)}`,
          { credentials: "include" }
        ).then((r) => r.json());
        const payload = rres as {
          receipt?: { blockNumber?: string; status?: string };
          premiumExpiresAt?: string;
        };
        const res = payload?.receipt;
        if (res?.blockNumber && res?.status === "0x1") {
          if (payload.premiumExpiresAt) {
            const date = new Date(payload.premiumExpiresAt);
            const formatted = new Intl.DateTimeFormat("pt-BR", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(date);
            setMessage(`Pagamento confirmado. Premium ativo até ${formatted}.`);
          } else {
            setMessage("Pagamento confirmado. Premium ativado.");
          }
          setPayingLoading(false);
          return;
        }
      }
      setMessage("Confirmação está demorando. O premium será ativado em breve.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao enviar transação.";
      const lower = msg.toLowerCase();
      if (lower.includes("reject") || lower.includes("denied") || lower.includes("user denied")) {
        setError("Transação recusada na carteira.");
      } else {
        setError(msg || "Erro ao abrir a carteira. Tente novamente.");
      }
    } finally {
      setPayingLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-muted/20 p-6">
      <h2 className="mb-2 text-lg font-semibold text-foreground">
        Premium SafyApp
      </h2>

      {canSeePremium && isPremiumActive && premiumExpiresAt && (
        <div className="mb-6 rounded-2xl border border-primary/40 bg-linear-to-r from-primary/15 via-primary/10 to-sky-500/10 p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary">
              <span className="text-lg">⭐</span>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary/90">
                Plano premium ativo
              </p>
              <p className="text-sm text-foreground/80">
                Obrigado por apoiar o SafyApp.
              </p>
            </div>
          </div>
          <p className="mb-4 text-sm text-foreground/90">
            Seu plano está válido até{" "}
            <strong>
              {new Intl.DateTimeFormat("pt-BR", {
                dateStyle: "long",
                timeStyle: "short",
              }).format(premiumExpiresAt)}
            </strong>
            .
          </p>
          <a
            href="https://t.me/safyapp_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[#229ED9] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#1b8ac0]"
          >
            <SiTelegram className="h-4 w-4" />
            Falar com o bot no Telegram
          </a>
        </div>
      )}

      {!isPremiumActive && isBlocked && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="mb-3 text-sm text-amber-100">
            Para ativar o premium, faça login e conecte a carteira que usará para
            pagar.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {!loggedIn && (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-black hover:bg-primary-hover"
              >
                Entrar
              </Link>
            )}
            {!address && (
              <button
                type="button"
                onClick={connectWallet}
                disabled={connecting}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
              >
                <WalletIcon className="h-4 w-4 shrink-0" />
                {connecting ? "Conectando…" : "Conectar"}
              </button>
            )}
          </div>
        </div>
      )}

      {!isPremiumActive && canSeePremium && !address && (
        <div className="mb-4">
          <p className="mb-2 text-sm text-foreground/70">
            Conecte sua carteira para pagar e ativar o premium.
          </p>
          <button
            type="button"
            onClick={connectWallet}
            disabled={connecting}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
          >
            <WalletIcon className="h-4 w-4 shrink-0" />
            {connecting ? "Conectando…" : "Conectar"}
          </button>
        </div>
      )}

      {!isPremiumActive && canSeePremium && paymentInfo && (
        <>
          <p className="mb-3 text-sm font-medium text-foreground">
            Qual plano você deseja?
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setBillingPeriod("monthly")}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                billingPeriod === "monthly"
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border bg-muted/30 text-foreground hover:border-primary/50 hover:bg-muted/50"
              }`}
            >
              <span>Mensal · US$ 2</span>
            </button>
            <button
              type="button"
              onClick={() => setBillingPeriod("annual")}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                billingPeriod === "annual"
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border bg-muted/30 text-foreground hover:border-primary/50 hover:bg-muted/50"
              }`}
            >
              <span>Anual · US$ 18 (US$ 1,50/mês)</span>
            </button>
          </div>
          <p className="mb-3 text-sm font-medium text-foreground">
            Em qual rede deseja pagar?
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            {paymentInfo.networks.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setSelectedNetworkId(n.id)}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  selectedNetworkId === n.id
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-border bg-muted/30 text-foreground hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                {n.id === "bsc" && <SiBinance className="h-4 w-4" />}
                {n.id === "polygon" && <SiPolygon className="h-4 w-4" />}
                {n.id === "arbitrum" && <SiEthereum className="h-4 w-4" />}
                <span>
                  {n.id === "bsc" ? "BNB" : n.id === "polygon" ? "POL" : "ARB"}
                </span>
              </button>
            ))}
          </div>
          <p className="mb-2 text-xs text-foreground/60">
            A carteira será aberta na rede <strong>{selectedNetwork?.name ?? selectedNetworkId}</strong>{" "}
            com {billingPeriod === "annual" ? "18 USDT (plano anual)" : "2 USDT (1 mês)"} preenchidos.
          </p>
          {canOpenWallet && (
            <div className="mb-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handlePayWithWallet}
                disabled={payingLoading}
                className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-black hover:bg-primary-hover disabled:opacity-60"
              >
                {payingLoading
                  ? "Aguardando confirmação…"
                  : `Abrir carteira e pagar ${
                      billingPeriod === "annual" ? "18 USDT (anual)" : "2 USDT (mensal)"
                    } (${selectedNetworkId.toUpperCase()})`}
              </button>
            </div>
          )}
        </>
      )}

      {message && (
        <div className="mb-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {!isPremiumActive && (
        <p className="mt-3 text-xs text-foreground/60">
          É necessário estar logado e conectar a carteira. Ao confirmar o pagamento na carteira, o premium é ativado automaticamente.
        </p>
      )}
    </section>
  );
}

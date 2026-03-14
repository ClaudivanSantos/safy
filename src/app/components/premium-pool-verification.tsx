"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { encodeFunctionData, parseAbiItem } from "viem";
import { SiBinance, SiPolygon, SiEthereum, SiTelegram } from "react-icons/si";
import { useWallet } from "@/app/contexts/wallet-context";
import { useTranslation } from "@/app/hooks/use-translation";
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
  networks: NetworkOption[];
  poolPremiumExpiresAt?: string | null;
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

export function PremiumPoolVerification() {
  const { address, connecting, connectWallet } = useWallet();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [selectedNetworkId, setSelectedNetworkId] = useState<PremiumNetworkId>("bsc");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("annual");
  const [payingLoading, setPayingLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation("premium");

  const canSeePremium = loggedIn === true;
  const selectedNetwork = paymentInfo?.networks?.find((n) => n.id === selectedNetworkId) ?? paymentInfo?.networks?.[0];
  const canOpenWallet = canSeePremium && !!address && !!paymentInfo?.paymentAddress && !!selectedNetwork;

  const poolPremiumExpiresAt = paymentInfo?.poolPremiumExpiresAt
    ? new Date(paymentInfo.poolPremiumExpiresAt)
    : null;
  const isPoolPremiumActive =
    poolPremiumExpiresAt != null && poolPremiumExpiresAt.getTime() > Date.now();

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
      .then((res) => (res.ok ? res.json() : null))
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
          setError(t("addNetworkError"));
          return false;
        }
      }
      setError(t("switchNetworkError"));
      return false;
    }
  };

  const handlePayWithWallet = async () => {
    if (!address || !paymentInfo?.paymentAddress || !selectedNetwork) {
      setError(t("paymentDataError"));
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
      setError(t("noWalletError"));
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
        setError(t("txNotSentError"));
        setPayingLoading(false);
        return;
      }
      setMessage(t("txSentWaiting").replace("{network}", net.name));
      const maxAttempts = 40;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const rres = await fetch(
          `/api/tx-receipt?hash=${encodeURIComponent(txHash)}&chain=${net.id}&wallet=${encodeURIComponent(address)}&product=pool&paymentAddress=${encodeURIComponent(paymentInfo.paymentAddress)}`,
          { credentials: "include" }
        ).then((r) => r.json());
        const payload = rres as {
          receipt?: { blockNumber?: string; status?: string };
        };
        const res = payload?.receipt;
        if (res?.blockNumber && res?.status === "0x1") {
          const activateRes = await fetch("/api/pool-premium-activate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              txHash,
              chain: net.id,
              wallet: address,
              paymentAddress: paymentInfo.paymentAddress,
              billingPeriod,
            }),
          });
          const activateData = (await activateRes.json().catch(() => null)) as {
            poolPremiumExpiresAt?: string;
            error?: string;
          } | null;
          if (!activateRes.ok) {
            setError(activateData?.error ?? t("txSendError"));
            setPayingLoading(false);
            return;
          }
          if (activateData?.poolPremiumExpiresAt) {
            const date = new Date(activateData.poolPremiumExpiresAt);
            const formatted = new Intl.DateTimeFormat("pt-BR", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(date);
            setMessage(t("poolPaymentConfirmedUntil").replace("{date}", formatted));
          } else {
            setMessage(t("poolPaymentConfirmed"));
          }
          setPayingLoading(false);
          fetch("/api/premium-payment-info", { credentials: "include" })
            .then((r) => (r.ok ? r.json() : null))
            .then((data: PaymentInfo | null) => {
              if (data?.paymentAddress && data?.networks?.length) setPaymentInfo(data);
            })
            .catch(() => {});
          return;
        }
      }
      setMessage(t("poolConfirmationSlow"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("txSendError");
      const lower = msg.toLowerCase();
      if (lower.includes("reject") || lower.includes("denied") || lower.includes("user denied")) {
        setError(t("txRejected"));
      } else {
        setError(msg || t("openWalletError"));
      }
    } finally {
      setPayingLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-muted/20 p-6">
      <h2 className="mb-2 text-lg font-semibold text-foreground">
        {t("poolPremiumHeading")}
      </h2>
      <p className="mb-4 text-sm text-foreground/80">
        {t("poolPremiumDescription")}
      </p>

      {canSeePremium && isPoolPremiumActive && poolPremiumExpiresAt && (
        <div className="mb-6 rounded-2xl border border-primary/40 bg-linear-to-r from-primary/15 via-primary/10 to-sky-500/10 p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary">
              <span className="text-lg">⭐</span>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary/90">
                {t("poolPremiumActiveBadge")}
              </p>
              <p className="text-sm text-foreground/80">
                {t("premiumThanks")}
              </p>
            </div>
          </div>
          <p className="mb-4 text-sm text-foreground/90">
            {t("poolPremiumValidUntil")}
            <strong>
              {new Intl.DateTimeFormat("pt-BR", {
                dateStyle: "long",
                timeStyle: "short",
              }).format(poolPremiumExpiresAt)}
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
            {t("telegramCta")}
          </a>
        </div>
      )}

      {!isPoolPremiumActive && !loggedIn && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="mb-3 text-sm text-amber-100">{t("poolLoginAndConnectWallet")}</p>
          <Link
            href="/login"
            className="inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-black hover:bg-primary-hover"
          >
            {t("login")}
          </Link>
        </div>
      )}

      {!isPoolPremiumActive && canSeePremium && !address && (
        <div className="mb-4">
          <p className="mb-2 text-sm text-foreground/70">{t("poolConnectWalletToPay")}</p>
          <button
            type="button"
            onClick={connectWallet}
            disabled={connecting}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
          >
            <WalletIcon className="h-4 w-4 shrink-0" />
            {connecting ? t("connecting") : t("connect")}
          </button>
        </div>
      )}

      {!isPoolPremiumActive && canSeePremium && paymentInfo && paymentInfo.paymentAddress && (
        <>
          <p className="mb-3 text-sm font-medium text-foreground">
            {t("whichPlan")}
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
              <span>{t("monthly")}</span>
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
              <span>{t("annual")}</span>
            </button>
          </div>
          <p className="mb-3 text-sm font-medium text-foreground">{t("whichNetwork")}</p>
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
                {(n.id === "arbitrum" || n.id === "ethereum") && <SiEthereum className="h-4 w-4" />}
                <span>
                  {n.id === "bsc" ? "BNB" : n.id === "polygon" ? "POL" : n.id === "arbitrum" ? "ARB" : "ETH"}
                </span>
              </button>
            ))}
          </div>
          <p className="mb-2 text-xs text-foreground/60">
            {t("walletWillOpen")
              .replace("{network}", selectedNetwork?.name ?? selectedNetworkId)
              .replace(
                "{amount}",
                billingPeriod === "annual"
                  ? "18 USDT (annual plan)"
                  : "2 USDT (1 month)",
              )}
          </p>
          {canOpenWallet && (
            <button
              type="button"
              onClick={handlePayWithWallet}
              disabled={payingLoading}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-black hover:bg-primary-hover disabled:opacity-60"
            >
              {payingLoading
                ? t("waitingConfirmation")
                : t("openWalletAndPay")
                    .replace(
                      "{amount}",
                      billingPeriod === "annual"
                        ? "18 USDT (annual)"
                        : "2 USDT (monthly)",
                    )
                    .replace("{network}", selectedNetworkId.toUpperCase())}
            </button>
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
    </section>
  );
}

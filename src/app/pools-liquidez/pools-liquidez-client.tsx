"use client";

import Link from "next/link";
import { useState, useCallback, useEffect } from "react";
import { isAddress } from "viem";
import { SiEthereum, SiBinance, SiPolygon } from "react-icons/si";
import { useWallet } from "@/app/contexts/wallet-context";
import { useTranslation } from "@/app/hooks/use-translation";
import {
  POOL_NETWORKS,
  POOL_NETWORK_IDS,
  POOLS_API,
  type PoolNetworkId,
  getKrystalLiquidityUrl,
} from "./pools-config";

/** Item de pool retornado pela API interna /api/pools (posições da carteira). */
type ApiPoolRow = {
  source: "api";
  id: string;
  chain: string;
  protocol: string;
  pair: string;
  priceUsd: number;
  liquidityUsd: number;
  volume24h: number;
  apy: number | null;
  valueUsd: number;
};

function formatUsd(value: number | string | null): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (value == null || num == null || Number.isNaN(num)) return "—";
  const n = Number(num);
  if (!Number.isFinite(n)) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatApy(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(2)}%`;
}

export default function PoolsLiquidezClient({ initialAddress }: { initialAddress?: string } = {}) {
  const { address: contextAddress } = useWallet();
  const connectedAddress = contextAddress ?? (initialAddress && isAddress(initialAddress) ? initialAddress : null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Se o usuário tem premium de pools ativo, não mostramos o banner ★ Premium ★ */
  const [isPoolPremiumActive, setIsPoolPremiumActive] = useState(false);
  /** Por rede: lista de pools da carteira. null = ainda não consultado. */
  const [resultsByChain, setResultsByChain] = useState<Record<PoolNetworkId, ApiPoolRow[] | null>>({
    ethereum: null,
    bsc: null,
    polygon: null,
    arbitrum: null,
    base: null,
  });

  const { t } = useTranslation("pools");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/premium-payment-info", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { poolPremiumExpiresAt?: string } | null) => {
        if (cancelled || !data?.poolPremiumExpiresAt) return;
        const expiresAt = new Date(data.poolPremiumExpiresAt);
        if (expiresAt.getTime() > Date.now()) setIsPoolPremiumActive(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleVerificar = async () => {
    setError(null);
    if (!connectedAddress) {
      setError(t("connectHeader"));
      return;
    }

    setLoading(true);
    const next: Record<PoolNetworkId, ApiPoolRow[] | null> = {
      ethereum: null,
      bsc: null,
      polygon: null,
      arbitrum: null,
      base: null,
    };
    await Promise.all(
      POOL_NETWORK_IDS.map(async (chainId) => {
        try {
          const res = await fetch(
            `${POOLS_API}?wallet=${encodeURIComponent(connectedAddress)}&chain=${encodeURIComponent(chainId)}`
          );
          if (!res.ok) {
            const err = (await res.json().catch(() => ({}))) as { error?: string };
            throw new Error(err.error ?? t("errorLoading"));
          }
          const data = (await res.json()) as Array<{
            chain: string;
            protocol: string;
            pair: string;
            priceUsd: number;
            liquidityUsd: number;
            volume24h: number;
            apy: number | null;
            valueUsd: number;
          }>;
          next[chainId] = Array.isArray(data)
            ? data.map((p, i) => ({
                source: "api" as const,
                id: `${p.chain}-${p.pair}-${i}`,
                chain: p.chain,
                protocol: p.protocol,
                pair: p.pair,
                priceUsd: p.priceUsd,
                liquidityUsd: p.liquidityUsd,
                volume24h: p.volume24h,
                apy: p.apy,
                valueUsd: p.valueUsd,
              }))
            : [];
        } catch {
          next[chainId] = [];
        }
      })
    );
    setResultsByChain(next);
    setLoading(false);
  };

  useEffect(() => {
    const addr = (initialAddress ?? "").trim();
    if (!addr || !isAddress(addr)) return;
    setLoading(true);
    setError(null);
    const next: Record<PoolNetworkId, ApiPoolRow[] | null> = {
      ethereum: null,
      bsc: null,
      polygon: null,
      arbitrum: null,
      base: null,
    };
    Promise.all(
      POOL_NETWORK_IDS.map(async (chainId) => {
        try {
          const res = await fetch(
            `${POOLS_API}?wallet=${encodeURIComponent(addr)}&chain=${encodeURIComponent(chainId)}`
          );
          if (!res.ok) return;
          const data = (await res.json()) as Array<{
            chain: string;
            protocol: string;
            pair: string;
            priceUsd: number;
            liquidityUsd: number;
            volume24h: number;
            apy: number | null;
            valueUsd: number;
          }>;
          next[chainId] = Array.isArray(data)
            ? data.map((p, i) => ({
                source: "api" as const,
                id: `${p.chain}-${p.pair}-${i}`,
                chain: p.chain,
                protocol: p.protocol,
                pair: p.pair,
                priceUsd: p.priceUsd,
                liquidityUsd: p.liquidityUsd,
                volume24h: p.volume24h,
                apy: p.apy,
                valueUsd: p.valueUsd,
              }))
            : [];
        } catch {
          next[chainId] = [];
        }
      })
    ).then(() => {
      setResultsByChain(next);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAddress]);

  return (
    <div className="min-h-screen px-4 py-8 pb-24">
      <div className="mx-auto max-w-5xl space-y-10">
        {/* Premium em destaque no topo — só para quem não é premium */}
        {!isPoolPremiumActive && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-primary/40 bg-primary/15 px-4 py-4 text-center sm:flex-row sm:gap-4 sm:py-3">
            <span className="text-base font-semibold text-primary">
              ★ {t("subscribePremium")} ★
            </span>
            <p className="text-sm text-foreground/80">
              {t("subscribePremiumTeaser")}
            </p>
            <Link
              href="/premium-pools"
              className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-black transition hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            >
              {t("premiumLearnMore")}
            </Link>
          </div>
        )}

        {/* Hero */}
        <header className="relative overflow-hidden rounded-2xl border border-border bg-linear-to-br from-primary/15 via-background to-accent/10 p-8 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--color-primary)_0%,transparent_50%)] opacity-30" />
          <h1 className="relative text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {t("headerTitle")}
          </h1>
          <p className="relative mt-2 text-foreground/70">
            {t("headerDescription")}
          </p>
        </header>

        <section className="rounded-xl border border-border bg-muted/20 p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            {t("myPositions")}
          </h2>
          {error && (
            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {error}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-4">
            {connectedAddress ? (
              <>
                <span
                  className="rounded-lg border border-border bg-muted/50 px-3 py-2.5 font-mono text-sm text-foreground"
                  title={connectedAddress}
                >
                  {connectedAddress.slice(0, 6)}…{connectedAddress.slice(-4)}
                </span>
                <button
                  type="button"
                  onClick={handleVerificar}
                  disabled={loading}
                  className="rounded-lg bg-primary px-4 py-2.5 font-medium text-black hover:bg-primary-hover disabled:opacity-50"
                >
                  {loading ? t("loadingAllNetworks") : t("viewAllNetworks")}
                </button>
              </>
            ) : (
              <p className="text-sm text-foreground/60">
                {t("connectHeader")}
              </p>
            )}
          </div>
        </section>

        {/* Resultados por rede */}
        {POOL_NETWORK_IDS.map((chainId) => {
          const pools = resultsByChain[chainId];
          const network = POOL_NETWORKS[chainId];
          if (pools === null) return null;
          return (
            <section key={chainId} className="rounded-xl border border-border bg-muted/20 p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted/70 text-base">
                  {chainId === "ethereum" && <SiEthereum className="h-4 w-4" />}
                  {chainId === "bsc" && <SiBinance className="h-4 w-4" />}
                  {chainId === "polygon" && <SiPolygon className="h-4 w-4" />}
                  {chainId === "arbitrum" && <SiEthereum className="h-4 w-4" />}
                  {chainId === "base" && <span className="text-xs font-bold">B</span>}
                </span>
                <span>
                  {network.name}
                  {pools.length > 0 && ` (${pools.length})`}
                </span>
              </h2>
              {pools.length === 0 ? (
                <p className="py-4 text-center text-sm text-foreground/50">
                  {t("noPositionThisNetwork")}
                </p>
              ) : (
                <ul className="space-y-4">
                  {pools.map((pool) => (
                    <li
                      key={pool.id}
                      className="rounded-xl border border-border bg-background/50 p-4 transition hover:border-accent/40 hover:bg-muted/20"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-semibold text-foreground">
                          {pool.pair.replace("-", " / ")}
                        </h3>
                        <span className="text-xs text-foreground/60">{pool.protocol}</span>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        <div className="rounded border border-border/50 bg-muted/20 p-2">
                          <span className="text-foreground/60">{t("price")}</span>
                          <p className="font-medium text-foreground">
                            ${Number(pool.priceUsd).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                          </p>
                        </div>
                        <div className="rounded border border-border/50 bg-muted/20 p-2">
                          <span className="text-foreground/60">{t("liquidity")}</span>
                          <p className="font-medium text-foreground">{formatUsd(pool.liquidityUsd)}</p>
                        </div>
                        <div className="rounded border border-border/50 bg-muted/20 p-2">
                          <span className="text-foreground/60">{t("volume24h")}</span>
                          <p className="font-medium text-foreground">{formatUsd(pool.volume24h)}</p>
                        </div>
                        <div className="rounded border border-border/50 bg-muted/20 p-2">
                          <span className="text-foreground/60">{t("apy")}</span>
                          <p className="font-medium text-foreground">{formatApy(pool.apy)}</p>
                        </div>
                        <div className="rounded border border-border/50 bg-muted/20 p-2 sm:col-span-2">
                          <span className="text-foreground/60">{t("positionValue")}</span>
                          <p className="font-medium text-primary">
                            {formatUsd(pool.valueUsd)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a
                          href={getKrystalLiquidityUrl(chainId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                        >
                          {t("openInKrystal")}
                          <ExternalLinkIcon />
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}

        <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
          <p className="text-sm font-medium text-amber-200/90">
            {t("multiNetworkTitle")}
          </p>
          <p className="mt-1 text-xs text-amber-200/80">
            {t("multiNetworkDescription")}
          </p>
        </section>
      </div>
    </div>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" x2="21" y1="14" y2="3" />
    </svg>
  );
}

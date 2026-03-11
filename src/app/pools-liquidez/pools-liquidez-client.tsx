"use client";

import { useState, useCallback, useEffect } from "react";
import { isAddress } from "viem";
import { useWallet } from "@/app/contexts/wallet-context";
import {
  POOL_NETWORKS,
  POOL_NETWORK_IDS,
  POOL_PROTOCOL_IDS,
  POOLS_SUBGRAPH_API,
  POOLS_API,
  LLAMA_YIELDS_POOLS_API,
  type PoolNetworkId,
  type PoolProtocolVersion,
  getProtocolLabel,
  getKrystalLiquidityUrl,
  getDexLiquidityUrl,
} from "./pools-config";

/** Item de pool retornado pela API Llama yields.llama.fi/pools */
type LlamaPoolItem = {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number | null;
  apy: number | null;
  apyBase: number | null;
  apyReward: number | null;
  pool: string;
  ilRisk?: string | null;
  poolMeta?: string | null;
};

/** Linha de pool quando a lista vem da API interna (posições da carteira). */
type SubgraphPoolRow = {
  source: "subgraph";
  id: string;
  protocol: PoolProtocolVersion;
  pairAddress: string;
  token0Symbol: string;
  token1Symbol: string;
  valorDepositadoUsd: string | null;
  plEstimado: string | null;
  ilAproximado: string | null;
  feesEstimadas: string | null;
  share: number;
};

/** Linha de pool quando a lista vem da Llama (catálogo global). */
type LlamaPoolRow = {
  source: "llama";
  id: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number | null;
  apy: number | null;
  apyBase: number | null;
  apyReward: number | null;
  ilRisk: string | null;
  poolMeta: string | null;
};

/** Linha de pool quando a lista vem da API multi-chain GET /api/pools. */
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

type PoolRow = SubgraphPoolRow | LlamaPoolRow | ApiPoolRow;

/** Nome da chain na API Llama. */
const NETWORK_TO_LLAMA_CHAIN: Record<PoolNetworkId, string> = {
  ethereum: "Ethereum",
  bsc: "BSC",
  polygon: "Polygon",
  arbitrum: "Arbitrum",
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

  const [selectedNetworkId, setSelectedNetworkId] = useState<PoolNetworkId>("ethereum");
  const [selectedProtocol, setSelectedProtocol] = useState<PoolProtocolVersion>("v3");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pools, setPools] = useState<PoolRow[]>([]);
  const [poolsSource, setPoolsSource] = useState<"subgraph" | "llama" | "api" | null>(null);

  const network = POOL_NETWORKS[selectedNetworkId];
  const networkEnabled = network.subgraphEnabled;

  /** Multi-chain: GET /api/pools?wallet=&chain= (Dexscreener + DefiLlama + RPC). */
  const fetchByApiPools = useCallback(
    async (userAddress: string) => {
      const res = await fetch(
        `${POOLS_API}?wallet=${encodeURIComponent(userAddress)}&chain=${encodeURIComponent(selectedNetworkId)}`
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `Erro ${res.status}`);
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
      const rows: ApiPoolRow[] = Array.isArray(data)
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
      setPools(rows);
      setPoolsSource("api");
    },
    [selectedNetworkId]
  );

  const fetchByWallet = useCallback(
    async (userAddress: string) => {
      if (!networkEnabled) {
        throw new Error("Para filtrar por carteira, use a rede Ethereum (única com suporte no momento).");
      }
      const res = await fetch(POOLS_SUBGRAPH_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          networkId: selectedNetworkId,
          protocolVersion: selectedProtocol,
          address: userAddress.toLowerCase(),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        pools?: SubgraphPoolRow[];
        errors?: { message: string }[];
      };
      if (!res.ok || json.errors?.length) {
        const msg = json.errors?.[0]?.message ?? `Erro ${res.status}`;
        throw new Error(msg);
      }
      const rows = (json.pools ?? []).map((p) => ({ ...p, source: "subgraph" as const }));
      setPools(rows);
      setPoolsSource("subgraph");
    },
    [selectedNetworkId, selectedProtocol, networkEnabled]
  );

  const fetchByLlama = useCallback(async () => {
    const res = await fetch(LLAMA_YIELDS_POOLS_API);
    const json = (await res.json().catch(() => ({}))) as {
      status?: string;
      data?: LlamaPoolItem[];
    };
    if (!res.ok || json.status !== "success" || !Array.isArray(json.data)) {
      throw new Error("Resposta inválida da API Llama.");
    }
    const chainName = NETWORK_TO_LLAMA_CHAIN[selectedNetworkId];
    const rows: LlamaPoolRow[] = json.data
      .filter((p) => p.chain === chainName)
      .slice(0, 100)
      .map((p) => ({
        source: "llama" as const,
        id: p.pool,
        chain: p.chain,
        project: p.project,
        symbol: p.symbol,
        tvlUsd: p.tvlUsd ?? null,
        apy: p.apy ?? null,
        apyBase: p.apyBase ?? null,
        apyReward: p.apyReward ?? null,
        ilRisk: p.ilRisk ?? null,
        poolMeta: p.poolMeta ?? null,
      }));
    setPools(rows);
    setPoolsSource("llama");
  }, [selectedNetworkId]);

  const handleVerificar = async () => {
    setError(null);

    if (connectedAddress) {
      setLoading(true);
      try {
        await fetchByApiPools(connectedAddress);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao buscar posições.");
        setPools([]);
        setPoolsSource(null);
      } finally {
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      await fetchByLlama();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar pools.");
      setPools([]);
      setPoolsSource(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const addr = (initialAddress ?? "").trim();
    if (!addr || !isAddress(addr)) return;
    setLoading(true);
    setError(null);
    fetchByApiPools(addr)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Erro ao buscar posições.");
        setPools([]);
        setPoolsSource(null);
      })
      .finally(() => setLoading(false));
    // Só dispara quando a página carrega com endereço na URL
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAddress]);

  return (
    <div className="min-h-screen px-4 py-8 pb-24">
      <div className="mx-auto max-w-5xl space-y-10">
        {/* Hero */}
        <header className="relative overflow-hidden rounded-2xl border border-border bg-linear-to-br from-primary/15 via-background to-accent/10 p-8 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--color-primary)_0%,transparent_50%)] opacity-30" />
          <h1 className="relative text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Pools de Liquidez
          </h1>
          <p className="relative mt-2 text-foreground/70">
            Conecte a carteira no header para ver suas posições LP em Ethereum, BNB Chain, Polygon ou Arbitrum. Selecione a rede abaixo para listar pools ou carregar dados da Aave via Llama.
          </p>
        </header>

        <section className="rounded-xl border border-border bg-muted/20 p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Filtros
          </h2>
          {error && (
            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {error}
            </div>
          )}
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground/70">
                Rede
              </label>
              <select
                value={selectedNetworkId}
                onChange={(e) => {
                  const value = (e.target as { value?: string }).value;
                  if (value) setSelectedNetworkId(value as PoolNetworkId);
                  setError(null);
                  setPools([]);
                  setPoolsSource(null);
                }}
                className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {POOL_NETWORK_IDS.map((id) => (
                  <option key={id} value={id}>
                    {POOL_NETWORKS[id].name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground/70">
                Protocolo
              </label>
              <select
                value={selectedProtocol}
                onChange={(e) => {
                  const value = (e.target as { value?: string }).value;
                  if (value) setSelectedProtocol(value as PoolProtocolVersion);
                  setError(null);
                  setPools([]);
                  setPoolsSource(null);
                }}
                className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {POOL_PROTOCOL_IDS.map((protocol) => (
                  <option key={protocol} value={protocol}>
                    {getProtocolLabel(protocol)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {connectedAddress ? (
                <span
                  className="rounded-lg border border-border bg-muted/50 px-3 py-2.5 font-mono text-sm text-foreground"
                  title={connectedAddress}
                >
                  {connectedAddress.slice(0, 6)}…{connectedAddress.slice(-4)}
                </span>
              ) : (
                <p className="text-sm text-foreground/60">
                  Conecte a carteira no header para ver suas posições.
                </p>
              )}
              <button
                type="button"
                onClick={handleVerificar}
                disabled={loading}
                className="rounded-lg bg-primary px-4 py-2.5 font-medium text-black hover:bg-primary-hover disabled:opacity-50"
              >
                {connectedAddress
                  ? (loading ? "Buscando…" : "Ver minhas posições")
                  : (loading ? "Buscando…" : "Carregar pools da rede")}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-muted/20 p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            {poolsSource === "subgraph"
              ? "Minhas posições"
              : poolsSource === "api"
                ? "Minhas posições"
                : poolsSource === "llama"
                  ? "Pools da rede"
                  : "Pools"}
            {pools.length > 0 && ` (${pools.length})`}
          </h2>
          {pools.length === 0 && !loading && (
            <p className="py-6 text-center text-sm text-foreground/50">
              {connectedAddress
                ? "Clique em \"Ver minhas posições\" para buscar suas posições LP nesta rede."
                : "Conecte a carteira no header para ver suas posições ou clique em \"Carregar pools da rede\" para listar pools via Llama."}
            </p>
          )}
          <ul className="space-y-4">
          {pools.map((pool) =>
            pool.source === "api" ? (
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
                      <span className="text-foreground/60">Preço</span>
                      <p className="font-medium text-foreground">
                        ${Number(pool.priceUsd).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                      </p>
                    </div>
                    <div className="rounded border border-border/50 bg-muted/20 p-2">
                      <span className="text-foreground/60">Liquidez</span>
                      <p className="font-medium text-foreground">{formatUsd(pool.liquidityUsd)}</p>
                    </div>
                    <div className="rounded border border-border/50 bg-muted/20 p-2">
                      <span className="text-foreground/60">Volume 24h</span>
                      <p className="font-medium text-foreground">{formatUsd(pool.volume24h)}</p>
                    </div>
                    <div className="rounded border border-border/50 bg-muted/20 p-2">
                      <span className="text-foreground/60">APY</span>
                      <p className="font-medium text-foreground">{formatApy(pool.apy)}</p>
                    </div>
                    <div className="rounded border border-border/50 bg-muted/20 p-2 sm:col-span-2">
                      <span className="text-foreground/60">Valor da posição</span>
                      <p className="font-medium text-primary">
                        {formatUsd(pool.valueUsd)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={getKrystalLiquidityUrl(selectedNetworkId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                    >
                      Abrir na Krystal
                      <ExternalLinkIcon />
                    </a>
                  </div>
                </li>
              ) : pool.source === "subgraph" ? (
                <li
                  key={pool.id}
                  className="rounded-xl border border-border bg-background/50 p-4 transition hover:border-accent/40 hover:bg-muted/20"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-foreground">
                      {pool.token0Symbol} / {pool.token1Symbol}
                    </h3>
                    <span className="text-xs text-foreground/60">
                      {getProtocolLabel(pool.protocol)}
                      {pool.protocol === "v2"
                        ? ` - ${(pool.share * 100).toFixed(4)}% do pool`
                        : ""}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <div className="rounded border border-border/50 bg-muted/20 p-2">
                      <span className="text-foreground/60">Valor depositado</span>
                      <p className="font-medium text-foreground">
                        {pool.valorDepositadoUsd ? `$${formatUsd(pool.valorDepositadoUsd)}` : "—"}
                      </p>
                    </div>
                    <div className="rounded border border-border/50 bg-muted/20 p-2">
                      <span className="text-foreground/60">P/L estimado</span>
                      <p className="font-medium text-foreground">{pool.plEstimado ?? "—"}</p>
                    </div>
                    <div className="rounded border border-border/50 bg-muted/20 p-2">
                      <span className="text-foreground/60">IL aproximado</span>
                      <p className="font-medium text-foreground">{pool.ilAproximado ?? "—"}</p>
                    </div>
                    <div className="rounded border border-border/50 bg-muted/20 p-2">
                      <span className="text-foreground/60">Fees estimadas</span>
                      <p className="font-medium text-foreground">{pool.feesEstimadas ?? "—"}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={getKrystalLiquidityUrl(selectedNetworkId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                    >
                      Abrir na Krystal
                      <ExternalLinkIcon />
                    </a>
                    <a
                      href={getDexLiquidityUrl(selectedNetworkId, pool.protocol, pool.pairAddress)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-black hover:bg-primary-hover"
                    >
                      Abrir no DEX original
                      <ExternalLinkIcon />
                    </a>
                  </div>
                </li>
              ) : (
                <li
                  key={pool.id}
                  className="rounded-xl border border-border bg-background/50 p-4 transition hover:border-accent/40 hover:bg-muted/20"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-foreground">{pool.symbol}</h3>
                    <span className="text-xs text-foreground/60">
                      {pool.project}
                      {pool.poolMeta ? ` · ${pool.poolMeta}` : ""}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <div className="rounded border border-border/50 bg-muted/20 p-2">
                      <span className="text-foreground/60">TVL</span>
                      <p className="font-medium text-foreground">{formatUsd(pool.tvlUsd)}</p>
                    </div>
                    <div className="rounded border border-border/50 bg-muted/20 p-2">
                      <span className="text-foreground/60">APY</span>
                      <p className="font-medium text-foreground">{formatApy(pool.apy)}</p>
                    </div>
                    <div className="rounded border border-border/50 bg-muted/20 p-2">
                      <span className="text-foreground/60">APY base</span>
                      <p className="font-medium text-foreground">{formatApy(pool.apyBase)}</p>
                    </div>
                    <div className="rounded border border-border/50 bg-muted/20 p-2">
                      <span className="text-foreground/60">APY recompensa</span>
                      <p className="font-medium text-foreground">{formatApy(pool.apyReward)}</p>
                    </div>
                    <div className="rounded border border-border/50 bg-muted/20 p-2">
                      <span className="text-foreground/60">Risco IL</span>
                      <p className="font-medium text-foreground">{pool.ilRisk ?? "—"}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href="https://yields.llama.fi"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                    >
                      Ver no Llama Yield
                      <ExternalLinkIcon />
                    </a>
                    <a
                      href={getKrystalLiquidityUrl(selectedNetworkId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-black hover:bg-primary-hover"
                    >
                      Abrir na Krystal
                      <ExternalLinkIcon />
                    </a>
                  </div>
                </li>
              )
            )}
          </ul>
        </section>

        <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
          <p className="text-sm font-medium text-amber-200/90">
            Múltiplas redes (APIs públicas)
          </p>
          <p className="mt-1 text-xs text-amber-200/80">
            Selecione a rede acima para listar pools ou ver suas posições. Conecte a carteira no header para ver suas posições LP (RPC + Dexscreener + DefiLlama). Sem conectar: lista de pools via yields.llama.fi/pools.
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

"use client";

import { useState, useCallback, useEffect } from "react";
import { isAddress } from "viem";
import {
  POOL_NETWORKS,
  POOL_NETWORK_IDS,
  POOL_PROTOCOL_IDS,
  POOLS_SUBGRAPH_API,
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

type PoolRow = SubgraphPoolRow | LlamaPoolRow;

/** Nome da chain na API Llama. */
const NETWORK_TO_LLAMA_CHAIN: Record<PoolNetworkId, string> = {
  ethereum: "Ethereum",
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
  const [selectedNetworkId, setSelectedNetworkId] = useState<PoolNetworkId>("ethereum");
  const [selectedProtocol, setSelectedProtocol] = useState<PoolProtocolVersion>("v3");
  const [address, setAddress] = useState(initialAddress ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pools, setPools] = useState<PoolRow[]>([]);
  const [poolsSource, setPoolsSource] = useState<"subgraph" | "llama" | null>(null);

  const network = POOL_NETWORKS[selectedNetworkId];
  const networkEnabled = network.subgraphEnabled;

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
    const trimmed = address.trim();

    if (trimmed) {
      if (!isAddress(trimmed)) {
        setError("Endereço inválido.");
        return;
      }
      if (!networkEnabled) {
        setError("Para ver suas posições, selecione a rede Ethereum e protocolo V3 ou V4.");
        return;
      }
      setLoading(true);
      try {
        await fetchByWallet(trimmed);
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
    setAddress(addr);
    if (!networkEnabled) return;
    setLoading(true);
    setError(null);
    fetchByWallet(addr)
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
      <div className="mx-auto max-w-3xl space-y-8">
        <header>
          <h1 className="text-2xl font-bold text-primary">
            Pools de Liquidez
          </h1>
          <p className="mt-1 text-sm text-foreground/70">
            Informe o endereço da carteira para ver suas posições (Ethereum V3/V4) ou deixe em branco para listar pools da rede via Llama.
          </p>
        </header>

        <section className="rounded-xl border border-border bg-muted/30 p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground/90">
            Filtros
          </h2>
          {error && (
            <p className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-end gap-3">
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
            <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground/70">
                Endereço da carteira (opcional)
              </label>
              <input
                type="text"
                placeholder="0x... — deixe vazio para listar todos"
                value={address}
                onChange={(e) => {
                  setAddress((e.target as { value?: string }).value ?? "");
                  setError(null);
                }}
                className="rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              type="button"
              onClick={handleVerificar}
              disabled={loading}
              className="rounded-lg bg-primary px-4 py-2.5 font-medium text-black hover:bg-primary-hover disabled:opacity-50"
            >
              {loading ? "Buscando…" : address.trim() ? "Ver minhas posições" : "Carregar pools"}
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-muted/30 p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground/90">
            {poolsSource === "subgraph" ? "Minhas posições" : poolsSource === "llama" ? "Pools da rede" : "Pools"}
            {pools.length > 0 && ` (${pools.length})`}
          </h2>
          {pools.length === 0 && !loading && (
            <p className="py-6 text-center text-sm text-foreground/50">
              {address.trim()
                ? "Informe um endereço válido e use Ethereum + V3 ou V4 para ver posições, ou deixe o endereço em branco para listar pools da rede."
                : "Selecione a rede e clique em \"Carregar pools\" para listar até 100 pools da API Llama."}
            </p>
          )}
          <ul className="space-y-4">
            {pools.map((pool) =>
              pool.source === "subgraph" ? (
                <li
                  key={pool.id}
                  className="rounded-lg border border-border bg-background/50 p-4"
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
                  className="rounded-lg border border-border bg-background/50 p-4"
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

        <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-amber-200/90">
            Duas fontes (sem token)
          </p>
          <p className="mt-1 text-xs text-amber-200/80">
            Com endereço: suas posições vêm da nossa API (leitura on-chain, Ethereum V3/V4). Sem endereço: lista de pools da rede via API pública yields.llama.fi/pools.
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

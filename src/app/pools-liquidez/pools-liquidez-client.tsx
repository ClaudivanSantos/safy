"use client";

import { useState, useCallback } from "react";
import { isAddress } from "viem";
import {
  POOL_NETWORKS,
  POOL_NETWORK_IDS,
  POOLS_SUBGRAPH_API,
  type PoolNetworkId,
  getKrystalLiquidityUrl,
  getDexLiquidityUrl,
} from "./pools-config";

type PairToken = {
  symbol: string;
  decimals: string;
};

type PairData = {
  id: string;
  reserve0: string;
  reserve1: string;
  reserveUSD: string;
  totalSupply: string;
  token0: PairToken;
  token1: PairToken;
};

type LiquidityPosition = {
  id: string;
  liquidityTokenBalance: string;
  pair: PairData;
};

type PoolRow = {
  id: string;
  pairAddress: string;
  token0Symbol: string;
  token1Symbol: string;
  /** Valor depositado em USD (participação no pool) */
  valorDepositadoUsd: string;
  /** P/L estimado — sem base de custo não calculamos */
  plEstimado: string | null;
  /** IL aproximado — sem histórico de entrada não calculamos */
  ilAproximado: string | null;
  /** Fees estimadas — sem histórico de volume por LP não calculamos */
  feesEstimadas: string | null;
  /** Participação no pool (0-1) */
  share: number;
};

function formatUsd(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(num)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function parsePositionToRow(lp: LiquidityPosition): PoolRow {
  const pair = lp.pair;
  const balance = parseFloat(lp.liquidityTokenBalance);
  const totalSupply = parseFloat(pair.totalSupply);
  const reserveUsd = parseFloat(pair.reserveUSD);
  const share = totalSupply > 0 ? balance / totalSupply : 0;
  const valorDepositadoUsd = share * reserveUsd;

  return {
    id: lp.id,
    pairAddress: pair.id,
    token0Symbol: pair.token0.symbol,
    token1Symbol: pair.token1.symbol,
    valorDepositadoUsd: valorDepositadoUsd.toFixed(2),
    plEstimado: null,
    ilAproximado: null,
    feesEstimadas: null,
    share,
  };
}

const UNISWAP_V2_LIQUIDITY_POSITIONS_QUERY = `
  query LiquidityPositions($user: ID!) {
    liquidityPositions(
      where: { user: $user, liquidityTokenBalance_gt: "0" }
      first: 100
    ) {
      id
      liquidityTokenBalance
      pair {
        id
        reserve0
        reserve1
        reserveUSD
        totalSupply
        token0 { symbol decimals }
        token1 { symbol decimals }
      }
    }
  }
`;

/** Alternativa: buscar pelo entity User (id = endereço em minúsculo). */
const UNISWAP_V2_USER_POSITIONS_QUERY = `
  query UserLiquidityPositions($id: ID!) {
    user(id: $id) {
      id
      liquidityPositions(where: { liquidityTokenBalance_gt: "0" }, first: 100) {
        id
        liquidityTokenBalance
        pair {
          id
          reserve0
          reserve1
          reserveUSD
          totalSupply
          token0 { symbol decimals }
          token1 { symbol decimals }
        }
      }
    }
  }
`;

export default function PoolsLiquidezClient() {
  const [selectedNetworkId, setSelectedNetworkId] = useState<PoolNetworkId>("ethereum");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pools, setPools] = useState<PoolRow[]>([]);

  const network = POOL_NETWORKS[selectedNetworkId];
  const subgraphEnabled = network.subgraphEnabled;

  const fetchPools = useCallback(
    async (userAddress: string) => {
      if (!network.subgraphEnabled) {
        throw new Error("Serviço indisponível para esta rede no momento.");
      }
      const id = userAddress.toLowerCase();
      const variablesDirect = { user: id };
      const variablesUser = { id };

      const tryQuery = async (
        query: string,
        variables: { user?: string; id?: string }
      ): Promise<LiquidityPosition[]> => {
        const res = await fetch(POOLS_SUBGRAPH_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            networkId: selectedNetworkId,
            query,
            variables,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const msg = err?.errors?.[0]?.message ?? `Erro ${res.status}`;
          throw new Error(msg);
        }
        const json = (await res.json()) as {
          data?: {
            liquidityPositions?: LiquidityPosition[];
            user?: { liquidityPositions?: LiquidityPosition[] } | null;
          };
          errors?: { message: string }[];
        };
        if (json.errors?.length) {
          throw new Error(json.errors.map((e) => e.message).join("; "));
        }
        const list = json.data?.liquidityPositions ?? [];
        if (list.length > 0) return list;
        const fromUser = json.data?.user?.liquidityPositions ?? [];
        return fromUser;
      };

      let list: LiquidityPosition[];
      try {
        list = await tryQuery(
          UNISWAP_V2_LIQUIDITY_POSITIONS_QUERY,
          variablesDirect
        );
      } catch {
        list = await tryQuery(UNISWAP_V2_USER_POSITIONS_QUERY, variablesUser);
      }
      setPools(list.map(parsePositionToRow));
    },
    [selectedNetworkId, network.subgraphEnabled]
  );

  const handleVerificar = async () => {
    setError(null);
    const trimmed = address.trim();
    if (!trimmed) {
      setError("Informe um endereço (0x...).");
      return;
    }
    if (!isAddress(trimmed)) {
      setError("Endereço inválido.");
      return;
    }
    if (!subgraphEnabled) {
      setError(
        "Esta rede não está disponível no momento. Tente outra rede."
      );
      return;
    }
    setLoading(true);
    try {
      await fetchPools(trimmed);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao buscar pools.";
      setError(msg);
      setPools([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 pb-24">
      <div className="mx-auto max-w-3xl space-y-8">
        <header>
          <h1 className="text-2xl font-bold text-primary">
            Pools de Liquidez
          </h1>
          <p className="mt-1 text-sm text-foreground/70">
            Análise em apenas leitura. Selecione a rede e a carteira para listar os pools detectados.
          </p>
        </header>

        {/* Entrada */}
        <section className="rounded-xl border border-border bg-muted/30 p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground/90">
            Entrada
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
                  setSelectedNetworkId(e.currentTarget.value as PoolNetworkId);
                  setError(null);
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
            <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground/70">
                Endereço da carteira
              </label>
              <input
                type="text"
                placeholder="0x..."
                value={address}
                onChange={(e) => {
                  setAddress(e.currentTarget.value ?? "");
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
              {loading ? "Buscando…" : "Verificar"}
            </button>
          </div>
          <p className="mt-2 text-xs text-foreground/60">
            Dados via subgraph (leitura). Nenhuma transação é enviada.
          </p>
        </section>

        {/* Lista de pools */}
        <section className="rounded-xl border border-border bg-muted/30 p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground/90">
            Pools detectados
          </h2>
          {pools.length === 0 && !loading && (
            <p className="py-6 text-center text-sm text-foreground/50">
              Nenhum pool encontrado. Verifique a rede e o endereço ou configure o subgraph.
            </p>
          )}
          <ul className="space-y-4">
            {pools.map((pool) => (
              <li
                key={pool.id}
                className="rounded-lg border border-border bg-background/50 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-foreground">
                    {pool.token0Symbol} / {pool.token1Symbol}
                  </h3>
                  <span className="text-xs text-foreground/60">
                    {(pool.share * 100).toFixed(4)}% do pool
                  </span>
                </div>

                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div className="rounded border border-border/50 bg-muted/20 p-2">
                    <span className="text-foreground/60">Valor depositado</span>
                    <p className="font-medium text-foreground">
                      ${formatUsd(pool.valorDepositadoUsd)}
                    </p>
                  </div>
                  <div className="rounded border border-border/50 bg-muted/20 p-2">
                    <span className="text-foreground/60">P/L estimado</span>
                    <p className="font-medium text-foreground">
                      {pool.plEstimado ?? "—"}
                    </p>
                  </div>
                  <div className="rounded border border-border/50 bg-muted/20 p-2">
                    <span className="text-foreground/60">IL aproximado</span>
                    <p className="font-medium text-foreground">
                      {pool.ilAproximado ?? "—"}
                    </p>
                  </div>
                  <div className="rounded border border-border/50 bg-muted/20 p-2">
                    <span className="text-foreground/60">Fees estimadas</span>
                    <p className="font-medium text-foreground">
                      {pool.feesEstimadas ?? "—"}
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
                  </a>
                  <a
                    href={getDexLiquidityUrl(selectedNetworkId, pool.pairAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-black hover:bg-primary-hover"
                  >
                    Abrir no DEX original
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
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Aviso apenas leitura */}
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-amber-200/90">
            Apenas leitura
          </p>
          <p className="mt-1 text-xs text-amber-200/80">
            Esta tela apenas consulta posições nos pools. Para adicionar/remover liquidez ou reclamar fees, use os botões acima (Krystal ou DEX original).
          </p>
        </section>
      </div>
    </div>
  );
}

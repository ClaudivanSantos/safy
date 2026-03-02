"use client";

import { useState, useCallback } from "react";
import { isAddress } from "viem";
import {
  POOL_NETWORKS,
  POOL_NETWORK_IDS,
  POOL_PROTOCOL_IDS,
  POOLS_SUBGRAPH_API,
  type PoolNetworkId,
  type PoolProtocolVersion,
  getProtocolLabel,
  getKrystalLiquidityUrl,
  getDexLiquidityUrl,
} from "./pools-config";

type PoolRow = {
  id: string;
  protocol: PoolProtocolVersion;
  pairAddress: string;
  token0Symbol: string;
  token1Symbol: string;
  /** Valor depositado em USD (participação no pool) */
  valorDepositadoUsd: string | null;
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

export default function PoolsLiquidezClient() {
  const [selectedNetworkId, setSelectedNetworkId] = useState<PoolNetworkId>("ethereum");
  const [selectedProtocol, setSelectedProtocol] = useState<PoolProtocolVersion>("v3");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pools, setPools] = useState<PoolRow[]>([]);

  const network = POOL_NETWORKS[selectedNetworkId];
  const networkEnabled = network.subgraphEnabled;

  const fetchPools = useCallback(
    async (userAddress: string) => {
      if (!networkEnabled) {
        throw new Error("Serviço indisponível para esta rede no momento.");
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
        pools?: PoolRow[];
        errors?: { message: string }[];
      };
      if (!res.ok || json.errors?.length) {
        const msg = json.errors?.[0]?.message ?? `Erro ${res.status}`;
        throw new Error(msg);
      }
      setPools(json.pools ?? []);
    },
    [selectedNetworkId, selectedProtocol, networkEnabled]
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
    if (!networkEnabled) {
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
                  const value = (e.target as { value?: string }).value;
                  if (value) setSelectedNetworkId(value as PoolNetworkId);
                  setError(null);
                  setPools([]);
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
                Endereço da carteira
              </label>
              <input
                type="text"
                placeholder="0x..."
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
              {loading ? "Buscando…" : "Verificar"}
            </button>
          </div>
        </section>

        {/* Lista de pools */}
        <section className="rounded-xl border border-border bg-muted/30 p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground/90">
            Pools detectados
          </h2>
          {pools.length === 0 && !loading && (
            <p className="py-6 text-center text-sm text-foreground/50">
              Nenhum pool encontrado para este protocolo. Verifique rede/endereco e se a carteira tem posicoes ativas.
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
                    href={getDexLiquidityUrl(selectedNetworkId, pool.protocol, pool.pairAddress)}
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

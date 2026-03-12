"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  getProtocolsOverview,
  getChainsOverview,
  type ProtocolOverview,
  type ChainOverview,
} from "@/lib/llama-overview";
import { PremiumVerification } from "@/app/components/premium-verification";

function formatTvl(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

const CHAIN_NAMES: Record<string, string> = {
  Ethereum: "Ethereum",
  BSC: "BNB Chain",
  "BNB Chain": "BNB Chain",
  Arbitrum: "Arbitrum",
  Polygon: "Polygon",
};

const CHART_COLORS = ["#22c55e", "#a855f7", "#3b82f6", "#f59e0b", "#ec4899", "#14b8a6", "#eab308", "#6366f1"];

export default function InicioClient() {
  const [protocols, setProtocols] = useState<ProtocolOverview[]>([]);
  const [chains, setChains] = useState<ChainOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([getProtocolsOverview(), getChainsOverview()])
      .then(([p, c]) => {
        if (cancelled) return;
        setProtocols(p);
        setChains(c);
      })
      .catch(() => {
        if (!cancelled) setError("Falha ao carregar dados do dashboard.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalTvl = chains.reduce((sum, c) => sum + c.tvl, 0);
  const topChainsForChart = chains.slice(0, 10).map((c) => ({
    name: CHAIN_NAMES[c.name] ?? c.name,
    tvl: c.tvl,
    tvlFormatted: formatTvl(c.tvl),
  }));
  const pieData = chains.slice(0, 8).map((c) => ({
    name: CHAIN_NAMES[c.name] ?? c.name,
    value: c.tvl,
  }));
  const mainChains = chains.filter(
    (c) =>
      c.name === "Ethereum" ||
      c.name === "BSC" ||
      c.name === "Arbitrum" ||
      c.name === "Polygon"
  );
  const displayChains =
    mainChains.length >= 4
      ? mainChains
      : [
          { name: "Ethereum", tvl: 56e9 },
          { name: "BNB Chain", tvl: 5e9 },
          { name: "Arbitrum", tvl: 3e9 },
          { name: "Polygon", tvl: 1.5e9 },
        ];
  const topProtocols = protocols.slice(0, 15);

  return (
    <div className="min-h-screen px-4 py-8 pb-24">
      <div className="mx-auto max-w-5xl space-y-10">
        {/* Hero */}
        <header className="relative overflow-hidden rounded-2xl border border-border bg-linear-to-br from-primary/15 via-background to-accent/10 p-8 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--color-primary)_0%,transparent_50%)] opacity-30" />
          <h1 className="relative text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Dashboard DeFi
          </h1>
          <p className="relative mt-2 text-foreground/70">
            Visão geral do ecossistema — TVL total, chains, protocolos e distribuição.
          </p>
        </header>

        {error && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {error}
          </div>
        )}

        {/* Preços das principais moedas — TradingView + CoinGecko */}
        <section className="rounded-xl border border-border bg-muted/20 p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Preços das principais moedas
          </h2>
          <p className="mb-4 text-sm text-foreground/60">
            Cotações em tempo real (TradingView). Dados de terceiros.
          </p>
          <div className="space-y-6">
            {/* TradingView Ticker Tape */}
            <div className="overflow-hidden rounded-lg border border-border">
              <iframe
                title="TradingView Ticker Tape — criptomoedas"
                src={
                  "https://s.tradingview.com/embed-widget/ticker-tape/?locale=pt#" +
                  encodeURIComponent(
                    JSON.stringify({
                      symbols: [
                        { description: "Bitcoin", proName: "BINANCE:BTCUSDT" },
                        { description: "Ethereum", proName: "BINANCE:ETHUSDT" },
                        { description: "BNB", proName: "BINANCE:BNBUSDT" },
                        { description: "Solana", proName: "BINANCE:SOLUSDT" },
                        { description: "XRP", proName: "BINANCE:XRPUSDT" },
                        { description: "Cardano", proName: "BINANCE:ADAUSDT" },
                        { description: "Dogecoin", proName: "BINANCE:DOGEUSDT" },
                        { description: "Avalanche", proName: "BINANCE:AVAXUSDT" },
                        { description: "Polygon", proName: "BINANCE:MATICUSDT" },
                        { description: "Uniswap", proName: "BINANCE:UNIUSDT" },
                        { description: "Chainlink", proName: "BINANCE:LINKUSDT" },
                      ],
                      showSymbolLogo: true,
                      colorTheme: "dark",
                      isTransparent: true,
                      displayMode: "adaptive",
                      largeChartUrl: "",
                    })
                  )
                }
                style={{ height: 46, width: "100%" }}
                className="block border-0"
              />
            </div>
          </div>
        </section>

        {/* Total Value Locked in DeFi */}
        <section className="rounded-xl border border-border bg-muted/20 p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Total Value Locked in DeFi
          </h2>
          {loading ? (
            <div className="h-8 w-48 animate-pulse rounded bg-muted/40" />
          ) : (
            <p className="text-3xl font-bold text-primary md:text-4xl">
              {formatTvl(totalTvl)}
            </p>
          )}
          <p className="mt-1 text-sm text-foreground/60">
            Soma do TVL em todas as chains.
          </p>
          {!loading && topChainsForChart.length > 0 && (
            <div className="mt-6 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topChainsForChart}
                  margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis
                    dataKey="name"
                    stroke="#a1a1aa"
                    tick={{ fill: "#e5e5e5", fontSize: 11 }}
                  />
                  <YAxis
                    stroke="#a1a1aa"
                    tick={{ fill: "#e5e5e5", fontSize: 11 }}
                    tickFormatter={(v) => (v >= 1e9 ? `${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : String(v))}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#27272a",
                      border: "1px solid #3f3f46",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => [formatTvl(Number(value ?? 0)), "TVL"]}
                    labelFormatter={(label) => label}
                  />
                  <Bar dataKey="tvl" fill="#22c55e" radius={[4, 4, 0, 0]} name="TVL" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* TVL por chain (cards) */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            TVL por chain
          </h2>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-xl border border-border bg-muted/30"
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {displayChains.map((c) => (
                <div
                  key={c.name}
                  className="rounded-xl border border-border bg-muted/20 p-4 transition hover:border-accent/40 hover:bg-muted/30"
                >
                  <p className="text-sm font-medium text-foreground/80">
                    {CHAIN_NAMES[c.name] ?? c.name}
                  </p>
                  <p className="mt-1 text-xl font-semibold text-foreground">
                    {formatTvl(c.tvl)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Protocol Rankings */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Protocol Rankings
          </h2>
          {loading ? (
            <div className="h-80 animate-pulse rounded-xl border border-border bg-muted/30" />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-foreground/70">
                      <th className="px-4 py-3 font-medium">#</th>
                      <th className="px-4 py-3 font-medium">Protocolo</th>
                      <th className="px-4 py-3 font-medium text-right">TVL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProtocols.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-foreground/50">
                          Nenhum protocolo disponível no momento.
                        </td>
                      </tr>
                    )}
                    {topProtocols.map((p, i) => (
                      <tr
                        key={p.name}
                        className="border-b border-border/50 transition hover:bg-muted/20"
                      >
                        <td className="px-4 py-3 font-medium text-foreground/70">
                          {i + 1}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {p.name}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-primary">
                          {formatTvl(p.tvl)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Premium SafyApp */}
        <PremiumVerification />

        {/* Footer do dashboard */}
        <p className="text-center text-xs text-foreground/50">
          Dados de TVL via{" "}
          <a
            href="https://defillama.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            DefiLlama
          </a>
          . Atualizados periodicamente.
        </p>
      </div>
    </div>
  );
}

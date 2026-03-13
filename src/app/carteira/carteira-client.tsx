"use client";

import { useState } from "react";
import { createPublicClient, formatUnits, http, type Chain } from "viem";
import { useWallet, shortAddress } from "@/app/contexts/wallet-context";
import { SiBinance, SiEthereum, SiPolygon } from "react-icons/si";
import {
  PREMIUM_NETWORKS,
  type PremiumNetworkId,
} from "@/lib/premium-networks";

type UiTokenBalance = {
  id: string;
  chainId: PremiumNetworkId;
  chainName: string;
  symbol: string;
  name: string;
  balanceFormatted: string;
  contractAddress?: string;
  isNative: boolean;
};

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; items: UiTokenBalance[] };

const PREMIUM_CHAIN_ORDER: PremiumNetworkId[] = ["bsc", "polygon", "arbitrum"];

const TOKENS_BY_CHAIN: Record<
  PremiumNetworkId,
  { symbol: "USDT" | "USDC"; contract: `0x${string}`; decimals: number }[]
> = {
  bsc: [
    {
      symbol: "USDT",
      contract: "0x55d398326f99059fF775485246999027B3197955",
      decimals: 18,
    },
    {
      symbol: "USDC",
      contract: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
      decimals: 18,
    },
  ],
  polygon: [
    {
      symbol: "USDT",
      contract: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      decimals: 6,
    },
    {
      symbol: "USDC",
      contract: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
      decimals: 6,
    },
  ],
  arbitrum: [
    {
      symbol: "USDT",
      contract: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      decimals: 6,
    },
    {
      symbol: "USDC",
      contract: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
      decimals: 6,
    },
  ],
};

export default function CarteiraClient() {
  const { address, connecting, connectWallet } = useWallet();
  const [state, setState] = useState<State>({ status: "idle" });

  const hasAddress = !!address;

  async function fetchBalances() {
    if (!address) {
      setState({
        status: "error",
        message: "Conecte a carteira no topo da tela para ver os tokens.",
      });
      return;
    }
    setState({ status: "loading" });
    try {
      const items: UiTokenBalance[] = [];

      for (const netId of PREMIUM_CHAIN_ORDER) {
        const net = PREMIUM_NETWORKS.find((n) => n.id === netId);
        if (!net) continue;

        const chain: Chain = {
          id: net.chainId,
          name: net.name,
          nativeCurrency: net.chainParams.nativeCurrency,
          rpcUrls: { default: { http: [net.rpcUrl] } },
        };
        const client = createPublicClient({
          chain,
          transport: http(net.rpcUrl),
        });

        // Native balance
        try {
          const nativeBal = await client.getBalance({ address: address as `0x${string}` });
          if (nativeBal > 0n) {
            items.push({
              id: `${net.id}-native`,
              chainId: net.id,
              chainName: net.name,
              symbol: net.chainParams.nativeCurrency.symbol,
              name: `${net.chainParams.nativeCurrency.name} (nativo)`,
              balanceFormatted: formatUnits(
                nativeBal,
                net.chainParams.nativeCurrency.decimals
              ),
              isNative: true,
            });
          }
        } catch {
          // ignorar falha de RPC da moeda nativa
        }

        // ERC20 tokens configurados (USDT / USDC)
        for (const token of TOKENS_BY_CHAIN[net.id] ?? []) {
          try {
            const balance = await client.readContract({
              address: token.contract,
              abi: [
                {
                  type: "function",
                  name: "balanceOf",
                  stateMutability: "view",
                  inputs: [{ name: "account", type: "address" }],
                  outputs: [{ name: "", type: "uint256" }],
                },
              ] as const,
              functionName: "balanceOf",
              args: [address as `0x${string}`],
            });
            const bal = balance as bigint;
            if (bal <= 0n) continue;
            items.push({
              id: `${net.id}-${token.symbol}`,
              chainId: net.id,
              chainName: net.name,
              symbol: token.symbol,
              name:
                token.symbol === "USDT"
                  ? "Tether USD"
                  : token.symbol === "USDC"
                    ? "USD Coin"
                    : token.symbol,
              balanceFormatted: formatUnits(bal, token.decimals),
              contractAddress: token.contract,
              isNative: false,
            });
          } catch {
            // ignorar token que falhou
          }
        }
      }

      if (!items.length) {
        setState({
          status: "error",
          message:
            "Nenhum saldo encontrado nas redes suportadas (BNB Chain, Polygon, Arbitrum) para os tokens nativos, USDT ou USDC.",
        });
      } else {
        // ordenar por rede e depois por símbolo
        items.sort((a, b) => {
          if (a.chainId === b.chainId) {
            return a.symbol.localeCompare(b.symbol);
          }
          return PREMIUM_CHAIN_ORDER.indexOf(a.chainId) -
            PREMIUM_CHAIN_ORDER.indexOf(b.chainId);
        });
        setState({ status: "loaded", items });
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erro ao buscar tokens da carteira.";
      setState({
        status: "error",
        message: msg || "Erro ao buscar tokens da carteira.",
      });
    }
  }

  return (
    <div className="min-h-screen px-4 py-8 pb-24">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Hero */}
        <header className="relative overflow-hidden rounded-2xl border border-border bg-linear-to-br from-primary/15 via-background to-accent/10 p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--color-primary)_0%,transparent_55%)] opacity-30" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Carteira
              </h1>
              <p className="mt-2 max-w-xl text-sm text-foreground/70 md:text-base">
                Veja rapidamente os principais tokens da sua carteira nas redes
                suportadas (nativo, USDT e USDC em BNB Chain, Polygon e Arbitrum).
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              {hasAddress ? (
                <>
                  <span className="rounded-lg border border-border bg-background/60 px-3 py-2 font-mono text-xs text-foreground md:text-sm">
                    {shortAddress(address)}
                  </span>
                  <button
                    type="button"
                    onClick={fetchBalances}
                    disabled={state.status === "loading"}
                    className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-black hover:bg-primary-hover disabled:opacity-60"
                  >
                    {state.status === "loading"
                      ? "Atualizando saldos…"
                      : "Atualizar saldos"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={connectWallet}
                  disabled={connecting}
                  className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-black hover:bg-primary-hover disabled:opacity-60"
                >
                  {connecting ? "Conectando carteira…" : "Conectar carteira"}
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Estado / mensagens */}
        {!hasAddress && (
          <section className="rounded-xl border border-border bg-muted/20 p-6">
            <p className="text-sm text-foreground/70">
              Conecte sua carteira no topo da tela para listar automaticamente
              os tokens suportados.
            </p>
          </section>
        )}

        {hasAddress && state.status === "idle" && (
          <section className="rounded-xl border border-border bg-muted/20 p-6">
            <p className="text-sm text-foreground/70">
              Clique em{" "}
              <span className="font-semibold text-foreground">
                Atualizar saldos
              </span>{" "}
              para consultar os tokens presentes na sua carteira.
            </p>
          </section>
        )}

        {hasAddress && state.status === "error" && (
          <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
            <p className="text-sm font-medium text-amber-100">
              {state.message}
            </p>
          </section>
        )}

        {hasAddress && state.status === "loaded" && (
          <section className="space-y-4">
            {PREMIUM_CHAIN_ORDER.map((chainId) => {
              const byChain = state.items.filter((i) => i.chainId === chainId);
              if (!byChain.length) return null;
              const chainName =
                PREMIUM_NETWORKS.find((n) => n.id === chainId)?.name ??
                chainId.toUpperCase();
              return (
                <div
                  key={chainId}
                  className="rounded-xl border border-border bg-muted/20 p-6"
                >
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground/70">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted/60 text-base">
                      {chainId === "bsc" && (
                        <SiBinance className="h-4 w-4" />
                      )}
                      {chainId === "polygon" && (
                        <SiPolygon className="h-4 w-4" />
                      )}
                      {chainId === "arbitrum" && (
                        <SiEthereum className="h-4 w-4" />
                      )}
                    </span>
                    <span>{chainName}</span>
                  </h2>
                  <ul className="divide-y divide-border/60">
                    {byChain.map((token) => (
                      <li
                        key={token.id}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {token.symbol}
                            <span className="ml-2 text-xs font-normal text-foreground/60">
                              {token.name}
                            </span>
                          </p>
                          {token.contractAddress && (
                            <p className="mt-0.5 text-[11px] text-foreground/50">
                              {token.contractAddress.slice(0, 8)}…
                              {token.contractAddress.slice(-4)}
                            </p>
                          )}
                        </div>
                        <p className="font-mono text-sm text-primary">
                          {token.balanceFormatted}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}


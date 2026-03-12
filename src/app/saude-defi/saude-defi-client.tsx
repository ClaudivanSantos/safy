"use client";

import { useState, useCallback, useEffect } from "react";
import { createPublicClient, http, fallback, formatUnits, isAddress, encodeFunctionData, decodeAbiParameters, type Chain } from "viem";
import { mainnet, polygon, arbitrum } from "viem/chains";
import { useWallet, shortAddress } from "@/app/contexts/wallet-context";
import {
  AAVE_NETWORKS,
  AAVE_NETWORK_IDS,
  type AaveNetworkId,
  type AaveNetworkConfig,
  POOL_ABI,
  UI_POOL_DATA_PROVIDER_ABI,
} from "./aave-config";

const RAY = BigInt(10) ** BigInt(27);
const WAD = BigInt(10) ** BigInt(18);
const BASE_CURRENCY_DECIMALS = 8;
const HF_INFINITY_THRESHOLD = BigInt(1000) * WAD; // HF >= 1000 (escala wad)

const CHAINS_BY_NETWORK: Record<AaveNetworkId, Chain> = {
  ethereum: mainnet,
  polygon,
  arbitrum,
};

type UserAccountData = {
  totalCollateralBase: bigint;
  totalDebtBase: bigint;
  availableBorrowsBase: bigint;
  currentLiquidationThreshold: bigint;
  ltv: bigint;
  healthFactor: bigint;
};

type UserReserveItem = {
  underlyingAsset: `0x${string}`;
  scaledATokenBalance: bigint;
  usageAsCollateralEnabledOnUser: boolean;
  scaledVariableDebt: bigint;
};

type ReserveInfo = {
  underlyingAsset: `0x${string}`;
  symbol: string;
  decimals: number;
  liquidityIndex: bigint;
  variableBorrowIndex: bigint;
};

type CollateralRow = {
  asset: string;
  symbol: string;
  balance: string;
  valueUsd: string;
};

type DebtRow = {
  asset: string;
  symbol: string;
  debt: string;
  rate: string;
};

function formatHealthFactor(
  hf: bigint,
  totalDebtBase: bigint
): string {
  if (totalDebtBase === BigInt(0)) return "Infinito";
  if (hf === BigInt(0)) return "0.00";
  if (hf >= HF_INFINITY_THRESHOLD) return "Infinito";
  /* Na Aave, health factor vem em wad (1e18). Evitar Number(hf) direto por precisão. */
  const hfScaled = (hf * BigInt(100)) / WAD;
  const hfNum = Number(hfScaled) / 100;
  if (!Number.isFinite(hfNum) || hfNum >= 1e10) return "Infinito";
  return hfNum.toFixed(2);
}

function formatBaseCurrency(value: bigint): string {
  if (value === BigInt(0)) return "0";
  return formatUnits(value, BASE_CURRENCY_DECIMALS);
}

/** Formata valor em USD com separador de milhar e 2 decimais */
function formatUsd(value: string): string {
  const num = parseFloat(value);
  if (Number.isNaN(num)) return value;
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/** Formata saldo/dívida de ativo com separador de milhar e decimais limitados */
function formatTokenAmount(value: string, maxDecimals = 6): string {
  const num = parseFloat(value);
  if (Number.isNaN(num)) return value;
  if (num === 0) return "0";
  if (Math.abs(num) >= 1e9) {
    return new Intl.NumberFormat("pt-BR", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(num);
  }
  if (Math.abs(num) >= 1) {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxDecimals,
    }).format(num);
  }
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.min(maxDecimals, 8),
  }).format(num);
}

/** Formata saldo/dívida com exatamente 2 casas decimais (para tabela) */
function formatTokenAmount2Decimals(value: string): string {
  const num = parseFloat(value);
  if (Number.isNaN(num)) return value;
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Calcula dados de liquidação: valor do colateral quando HF = 1 e queda % até liquidação.
 * Liquidação quando: colateral * (LT/100) = dívida  =>  colateral_liq = dívida / (LT/100).
 * LT no contrato está em centésimos de % (ex.: 8500 = 85%).
 */
function getLiquidationData(account: UserAccountData) {
  const totalDebt = account.totalDebtBase;
  const totalCollateral = account.totalCollateralBase;
  const lt = account.currentLiquidationThreshold; // base points, e.g. 8500 = 85%

  if (totalDebt === BigInt(0)) {
    return { liquidationCollateralBase: BigInt(0), dropPercent: 0 };
  }

  // Valor do colateral no momento da liquidação (em base currency 8 decimais)
  const liquidationCollateralBase = (totalDebt * BigInt(10000)) / lt;

  // Queda % até liquidação: (1 - 1/HF) * 100. HF em wad.
  const hfScaled = (account.healthFactor * BigInt(100)) / WAD;
  const hfNum = Number(hfScaled) / 100;
  const dropPercent = hfNum >= 1 ? (1 - 1 / hfNum) * 100 : 0;

  return { liquidationCollateralBase, dropPercent };
}

export default function SaudeDefiClient({ initialAddress }: { initialAddress?: string } = {}) {
  const { address: contextAddress } = useWallet();
  const connectedAddress = contextAddress ?? (initialAddress && isAddress(initialAddress) ? initialAddress : null);

  const [selectedNetworkId, setSelectedNetworkId] =
    useState<AaveNetworkId>("ethereum");
  const [liquidationMode, setLiquidationMode] = useState<"coupled" | "single-asset">("coupled");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Por rede: dados da Aave ou erro. null = ainda não consultado. */
  const [resultsByNetwork, setResultsByNetwork] = useState<
    Record<AaveNetworkId, { accountData: UserAccountData; collaterals: CollateralRow[]; debts: DebtRow[] } | { error: string } | null>
  >({ ethereum: null, polygon: null, arbitrum: null });

  /** Busca dados da Aave para uma rede e retorna (não seta estado). Em falha de UiPoolDataProvider, retorna accountData com colaterais/dívidas vazios (comportamento tipo tela de pools). */
  const fetchAaveDataForNetwork = useCallback(
    async (
      network: AaveNetworkConfig,
      userAddress: `0x${string}`
    ): Promise<{ accountData: UserAccountData; collaterals: CollateralRow[]; debts: DebtRow[] }> => {
      const chain = CHAINS_BY_NETWORK[network.id];
      const transport = fallback(
        network.rpcUrls.map((url) => http(url, { timeout: 15_000 }))
      );
      const client = createPublicClient({
        chain,
        transport,
      });

      // 1) Sempre buscar accountData no Pool (única fonte de verdade para totais e HF).
      const accountDataResult = await (async () => {
        const data = encodeFunctionData({
          abi: POOL_ABI,
          functionName: "getUserAccountData",
          args: [userAddress],
        });
        const { data: returnData } = await client.call({
          to: network.poolAddress,
          data,
        });
        if (!returnData) throw new Error("Sem retorno do Pool");
        const decoded = decodeAbiParameters(
          [
            { type: "uint256" },
            { type: "uint256" },
            { type: "uint256" },
            { type: "uint256" },
            { type: "uint256" },
            { type: "uint256" },
          ],
          returnData
        );
        return {
          totalCollateralBase: decoded[0]!,
          totalDebtBase: decoded[1]!,
          availableBorrowsBase: decoded[2]!,
          currentLiquidationThreshold: decoded[3]!,
          ltv: decoded[4]!,
          healthFactor: decoded[5]!,
        };
      })();

      const account = accountDataResult as {
        totalCollateralBase: bigint;
        totalDebtBase: bigint;
        availableBorrowsBase: bigint;
        currentLiquidationThreshold: bigint;
        ltv: bigint;
        healthFactor: bigint;
      };
      const totalCollateralBase = account.totalCollateralBase;
      const totalDebtBase = account.totalDebtBase;
      const availableBorrowsBase = account.availableBorrowsBase;
      const currentLiquidationThreshold = account.currentLiquidationThreshold;
      const ltv = account.ltv;
      const healthFactor = account.healthFactor;

      // 2) Buscar detalhes de reservas/usuário no UiPoolDataProvider; em falha usar listas vazias (como pools).
      let userReservesRaw: UserReserveItem[] = [];
      let reservesDataRaw: { underlyingAsset: `0x${string}`; symbol: string; decimals: bigint; liquidityIndex: bigint; variableBorrowIndex: bigint }[] = [];

      try {
        const [userReservesResult, reservesDataResult] = await Promise.all([
          client.readContract({
            address: network.uiPoolDataProvider,
            abi: UI_POOL_DATA_PROVIDER_ABI,
            functionName: "getUserReservesData",
            args: [network.poolAddressesProvider, userAddress],
          }),
          client.readContract({
            address: network.uiPoolDataProvider,
            abi: UI_POOL_DATA_PROVIDER_ABI,
            functionName: "getReservesData",
            args: [network.poolAddressesProvider],
          }),
        ]);
        const [uRaw] = userReservesResult;
        const [rRaw] = reservesDataResult;
        userReservesRaw = (Array.isArray(uRaw) ? uRaw : []) as UserReserveItem[];
        reservesDataRaw = (Array.isArray(rRaw) ? rRaw : []) as typeof reservesDataRaw;
      } catch {
        // Falha de contrato (ex.: getReservesData "0x", ABI incompatível): exibir apenas totais, sem tabelas.
      }

      const reserveMap = new Map<string, ReserveInfo>();
      for (const r of reservesDataRaw) {
        reserveMap.set(r.underlyingAsset.toLowerCase(), {
          underlyingAsset: r.underlyingAsset,
          symbol: r.symbol,
          decimals: Number(r.decimals),
          liquidityIndex: r.liquidityIndex,
          variableBorrowIndex: r.variableBorrowIndex,
        });
      }

      const collateralsRows: CollateralRow[] = [];
      const debtsRows: DebtRow[] = [];

      for (const u of userReservesRaw) {
        const key = u.underlyingAsset.toLowerCase();
        const reserve = reserveMap.get(key);
        const symbol = reserve?.symbol ?? `${u.underlyingAsset.slice(0, 6)}…`;

        if (u.scaledATokenBalance > BigInt(0) && reserve) {
          const balanceRay =
            (u.scaledATokenBalance * reserve.liquidityIndex) / RAY;
          const balance = formatUnits(balanceRay, reserve.decimals);
          collateralsRows.push({
            asset: u.underlyingAsset,
            symbol,
            balance: formatTokenAmount2Decimals(balance),
            valueUsd: "—",
          });
        }
        if (u.scaledVariableDebt > BigInt(0) && reserve) {
          const debtRay =
            (u.scaledVariableDebt * reserve.variableBorrowIndex) / RAY;
          const debt = formatUnits(debtRay, reserve.decimals);
          debtsRows.push({
            asset: u.underlyingAsset,
            symbol,
            debt: formatTokenAmount2Decimals(debt),
            rate: "—",
          });
        }
      }

      return {
        accountData: {
          totalCollateralBase,
          totalDebtBase,
          availableBorrowsBase,
          currentLiquidationThreshold,
          ltv,
          healthFactor,
        },
        collaterals: collateralsRows,
        debts: debtsRows,
      };
    },
    []
  );

  const handleVerificar = async () => {
    setError(null);
    if (!connectedAddress) {
      setError("Conecte a carteira no header para verificar sua posição na Aave.");
      return;
    }
    if (!isAddress(connectedAddress)) {
      setError("Endereço inválido.");
      return;
    }

    setLoading(true);
    const next: typeof resultsByNetwork = { ethereum: null, polygon: null, arbitrum: null };
    const addr = connectedAddress as `0x${string}`;

    await Promise.all(
      AAVE_NETWORK_IDS.map(async (networkId) => {
        const network = AAVE_NETWORKS[networkId];
        try {
          const data = await fetchAaveDataForNetwork(network, addr);
          next[networkId] = data;
        } catch (err) {
          next[networkId] = {
            error: err instanceof Error ? err.message : "Erro ao buscar dados na Aave.",
          };
        }
      })
    );
    setResultsByNetwork(next);
    setLoading(false);
  };

  useEffect(() => {
    const addr = (initialAddress ?? "").trim();
    if (!addr || !isAddress(addr)) return;
    setLoading(true);
    setError(null);
    const next: typeof resultsByNetwork = { ethereum: null, polygon: null, arbitrum: null };
    (async () => {
      await Promise.all(
        AAVE_NETWORK_IDS.map(async (networkId) => {
          const network = AAVE_NETWORKS[networkId];
          try {
            const data = await fetchAaveDataForNetwork(network, addr as `0x${string}`);
            next[networkId] = data;
          } catch (err) {
            next[networkId] = {
              error: err instanceof Error ? err.message : "Erro ao buscar dados na Aave.",
            };
          }
        })
      );
      setResultsByNetwork(next);
      setLoading(false);
    })();
    // Só dispara quando a página carrega com endereço na URL
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAddress]);

  const hasFetched = AAVE_NETWORK_IDS.some((id) => resultsByNetwork[id] !== null);

  return (
    <div className="min-h-screen px-4 py-8 pb-24">
      <div className="mx-auto max-w-5xl space-y-10">
        {/* Hero */}
        <header className="relative overflow-hidden rounded-2xl border border-border bg-linear-to-br from-primary/15 via-background to-accent/10 p-8 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--color-primary)_0%,transparent_50%)] opacity-30" />
          <h1 className="relative text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Saúde DeFi — Aave
          </h1>
          <p className="relative mt-2 text-foreground/70">
            Verifique sua posição na Aave V3 em todas as redes: health factor, colateral, dívida e preço de liquidação. Conecte a carteira no header e clique em Verificar.
          </p>
        </header>

        {/* Entrada */}
        <section className="rounded-xl border border-border bg-muted/20 p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Verificar posição
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
                  {shortAddress(connectedAddress)}
                </span>
                <button
                  type="button"
                  onClick={handleVerificar}
                  disabled={loading}
                  className="rounded-lg bg-primary px-4 py-2.5 font-medium text-black hover:bg-primary-hover disabled:opacity-50"
                >
                  {loading ? "Buscando em todas as redes…" : "Verificar posição em todas as redes"}
                </button>
              </>
            ) : (
              <p className="text-sm text-foreground/60">
                Conecte a carteira no header para verificar sua posição na Aave.
              </p>
            )}
          </div>
          <p className="mt-2 text-xs text-foreground/60">
            Os dados são buscados via RPC em Ethereum, Polygon e Arbitrum. Redes sem posição exibem &quot;Nenhuma posição nesta rede&quot;.
          </p>
        </section>

        {/* Resultados por rede */}
        {hasFetched && (
          <section className="space-y-8">
            {AAVE_NETWORK_IDS.map((networkId) => {
              const result = resultsByNetwork[networkId];
              const network = AAVE_NETWORKS[networkId];
              if (result === null) return null;
              const isError = "error" in result;
              const data = isError ? null : result;
              const hasPosition = data && (
                data.accountData.totalCollateralBase > BigInt(0) ||
                data.accountData.totalDebtBase > BigInt(0)
              );
              return (
                <div
                  key={networkId}
                  className="rounded-xl border border-border bg-muted/20 p-6"
                >
                  <h2 className="mb-4 text-lg font-semibold text-foreground">
                    {network.name}
                  </h2>
                  {isError && (
                    <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                      {result.error}
                    </p>
                  )}
                  {!isError && !hasPosition && (
                    <p className="text-sm text-foreground/60">
                      Nenhuma posição na Aave nesta rede.
                    </p>
                  )}
                  {!isError && hasPosition && data && (
                    <AaveNetworkBlock
                      accountData={data.accountData}
                      collaterals={data.collaterals}
                      debts={data.debts}
                      networkId={networkId}
                      networkName={network.name}
                      liquidationMode={liquidationMode}
                      setLiquidationMode={setLiquidationMode}
                      formatHealthFactor={formatHealthFactor}
                      formatBaseCurrency={formatBaseCurrency}
                      formatUsd={formatUsd}
                      getLiquidationData={getLiquidationData}
                    />
                  )}
                </div>
              );
            })}
          </section>
        )}

        {/* Links */}
        <section className="rounded-xl border border-border bg-muted/20 p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Links
          </h2>
          <a
            href="https://app.aave.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-black hover:bg-primary-hover"
          >
            Abrir posição na Aave
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
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
        </section>
      </div>
    </div>
  );
}

/** Bloco de exibição de dados Aave para uma rede (métricas, tabelas, liquidação). */
function AaveNetworkBlock({
  accountData,
  collaterals,
  debts,
  networkId: _networkId,
  networkName: _networkName,
  liquidationMode,
  setLiquidationMode,
  formatHealthFactor,
  formatBaseCurrency,
  formatUsd,
  getLiquidationData,
}: {
  accountData: UserAccountData;
  collaterals: CollateralRow[];
  debts: DebtRow[];
  networkId: AaveNetworkId;
  networkName: string;
  liquidationMode: "coupled" | "single-asset";
  setLiquidationMode: (m: "coupled" | "single-asset") => void;
  formatHealthFactor: (hf: bigint, totalDebtBase: bigint) => string;
  formatBaseCurrency: (value: bigint) => string;
  formatUsd: (value: string) => string;
  getLiquidationData: (account: UserAccountData) => { liquidationCollateralBase: bigint; dropPercent: number };
}) {
  const hasPosition = accountData.totalCollateralBase > BigInt(0) || accountData.totalDebtBase > BigInt(0);
  return (
    <div className="mt-4 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-background/50 p-4 transition hover:border-accent/40">
          <p className="text-xs text-foreground/60">Health Factor</p>
          <p className="text-lg font-semibold text-primary">
            {formatHealthFactor(accountData.healthFactor, accountData.totalDebtBase)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-background/50 p-4 transition hover:border-accent/40">
          <p className="text-xs text-foreground/60">Total colateral</p>
          <p className="text-lg font-semibold text-foreground">
            ${formatUsd(formatBaseCurrency(accountData.totalCollateralBase))}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-background/50 p-4 transition hover:border-accent/40">
          <p className="text-xs text-foreground/60">Total dívida</p>
          <p className="text-lg font-semibold text-foreground">
            ${formatUsd(formatBaseCurrency(accountData.totalDebtBase))}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-background/50 p-4 transition hover:border-accent/40">
          <p className="text-xs text-foreground/60">LTV / LT</p>
          <p className="text-lg font-semibold text-foreground">
            {(Number(accountData.ltv) / 100).toFixed(0)}% / {(Number(accountData.currentLiquidationThreshold) / 100).toFixed(0)}%
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <h3 className="mb-2 text-sm font-medium text-foreground/90">Colaterais</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-foreground/70">
                  <th className="pb-2 pr-4 font-medium">Ativo</th>
                  <th className="pb-2 pr-4 font-medium">Saldo</th>
                  <th className="pb-2 font-medium">Valor</th>
                </tr>
              </thead>
              <tbody className="text-foreground/80">
                {collaterals.length === 0 && (
                  <tr><td colSpan={3} className="py-3 text-center text-foreground/50">—</td></tr>
                )}
                {collaterals.map((c) => (
                  <tr key={c.asset} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-medium">{c.symbol}</td>
                    <td className="py-2 pr-4">{c.balance}</td>
                    <td className="py-2">{c.valueUsd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <h3 className="mb-2 text-sm font-medium text-foreground/90">Empréstimos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-foreground/70">
                  <th className="pb-2 pr-4 font-medium">Ativo</th>
                  <th className="pb-2 pr-4 font-medium">Dívida</th>
                  <th className="pb-2 font-medium">Taxa</th>
                </tr>
              </thead>
              <tbody className="text-foreground/80">
                {debts.length === 0 && (
                  <tr><td colSpan={3} className="py-3 text-center text-foreground/50">—</td></tr>
                )}
                {debts.map((d) => (
                  <tr key={d.asset} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-medium">{d.symbol}</td>
                    <td className="py-2 pr-4">{d.debt}</td>
                    <td className="py-2">{d.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {hasPosition && accountData.totalDebtBase > BigInt(0) && accountData.totalCollateralBase > BigInt(0) && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setLiquidationMode("coupled")}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                liquidationMode === "coupled" ? "border-primary bg-primary/20 text-primary" : "border-border bg-background text-foreground/80 hover:bg-muted/50"
              }`}
            >
              Coupled
            </button>
            <button
              type="button"
              onClick={() => setLiquidationMode("single-asset")}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                liquidationMode === "single-asset" ? "border-primary bg-primary/20 text-primary" : "border-border bg-background text-foreground/80 hover:bg-muted/50"
              }`}
            >
              Single-asset
            </button>
          </div>
          {(() => {
            const { liquidationCollateralBase, dropPercent } = getLiquidationData(accountData);
            const liquidationValueUsd = formatUsd(formatBaseCurrency(liquidationCollateralBase));
            return (
              <>
                <div className="rounded-lg border border-border bg-background/50 p-3">
                  <p className="text-xs text-foreground/60">Preço de liquidação (estimado)</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">${liquidationValueUsd}</p>
                </div>
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="text-xs font-medium text-amber-200/90">Queda até liquidação</p>
                  <p className="mt-1 text-lg font-semibold text-amber-200">{dropPercent.toFixed(1)}%</p>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

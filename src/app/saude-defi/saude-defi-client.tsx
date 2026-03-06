"use client";

import { useState, useCallback, useEffect } from "react";
import { createPublicClient, http, fallback, formatUnits, isAddress, encodeFunctionData, decodeAbiParameters, type Chain } from "viem";
import { mainnet, polygon, arbitrum } from "viem/chains";
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
  const [selectedNetworkId, setSelectedNetworkId] =
    useState<AaveNetworkId>("ethereum");
  const [address, setAddress] = useState(initialAddress ?? "");
  const [liquidationMode, setLiquidationMode] = useState<"coupled" | "single-asset">("coupled");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountData, setAccountData] = useState<UserAccountData | null>(null);
  const [collaterals, setCollaterals] = useState<CollateralRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);

  const fetchAaveData = useCallback(
    async (network: AaveNetworkConfig, userAddress: `0x${string}`) => {
      const chain = CHAINS_BY_NETWORK[network.id];
      const transport = fallback(
        network.rpcUrls.map((url) => http(url, { timeout: 15_000 }))
      );
      const client = createPublicClient({
        chain,
        transport,
      });

      const [accountDataResult, userReservesResult, reservesDataResult] =
        await Promise.all([
          (async () => {
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
          })(),
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

    const [userReservesRaw] = userReservesResult;
    const [reservesDataRaw] = reservesDataResult;

    const reserveMap = new Map<string, ReserveInfo>();
    type ReserveRow = { underlyingAsset: `0x${string}`; symbol: string; decimals: bigint; liquidityIndex: bigint; variableBorrowIndex: bigint };
    const reservesList = reservesDataRaw as unknown as ReserveRow[];
    for (const r of reservesList) {
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

    for (const u of userReservesRaw as UserReserveItem[]) {
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

    setAccountData({
      totalCollateralBase,
      totalDebtBase,
      availableBorrowsBase,
      currentLiquidationThreshold,
      ltv,
      healthFactor,
    });
    setCollaterals(collateralsRows);
    setDebts(debtsRows);
  }, []);

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

    const network = AAVE_NETWORKS[selectedNetworkId];
    setLoading(true);
    try {
      await fetchAaveData(network, trimmed as `0x${string}`);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erro ao buscar dados na Aave.";
      setError(msg);
      setAccountData(null);
      setCollaterals([]);
      setDebts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const addr = (initialAddress ?? "").trim();
    if (!addr || !isAddress(addr)) return;
    setAddress(addr);
    const network = AAVE_NETWORKS[selectedNetworkId];
    setLoading(true);
    setError(null);
    fetchAaveData(network, addr as `0x${string}`)
      .catch((err) => {
        const msg =
          err instanceof Error ? err.message : "Erro ao buscar dados na Aave.";
        setError(msg);
        setAccountData(null);
        setCollaterals([]);
        setDebts([]);
      })
      .finally(() => setLoading(false));
    // Só dispara quando a página carrega com endereço na URL
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAddress]);

  const hasPosition =
    accountData &&
    (accountData.totalCollateralBase > BigInt(0) ||
      accountData.totalDebtBase > BigInt(0));

  return (
    <div className="min-h-screen px-4 py-8 pb-24">
      <div className="mx-auto max-w-3xl space-y-8">
        <header>
          <h1 className="text-2xl font-bold text-primary">
            Saúde DeFi — Aave
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
                  setSelectedNetworkId(
                    (e.currentTarget as unknown as { value: AaveNetworkId })
                      .value
                  );
                  setError(null);
                }}
                className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {AAVE_NETWORK_IDS.map((id) => (
                  <option key={id} value={id}>
                    {AAVE_NETWORKS[id].name}
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
                  setAddress(
                    (e.currentTarget as unknown as { value: string }).value ?? ""
                  );
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
            Selecione a rede e informe o endereço. Os dados serão buscados na
            Aave V3 dessa rede (sem conectar carteira).
          </p>
        </section>

        {/* Dados */}
        <section className="rounded-xl border border-border bg-muted/30 p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground/90">
            Dados
          </h2>
          <ul className="space-y-2 text-sm text-foreground/80">
            <li className="flex items-center gap-2">
              <span className="text-foreground/50">•</span>
              Aave V3 — {AAVE_NETWORKS[selectedNetworkId].name}
            </li>
            <li className="flex items-center gap-2">
              <span className="text-foreground/50">•</span>
              RPC público (leitura)
            </li>
          </ul>
        </section>

        {/* Exibição */}
        <section className="rounded-xl border border-border bg-muted/30 p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground/90">
            Exibição
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border bg-background/50 p-3">
              <p className="text-xs text-foreground/60">Health Factor</p>
              <p className="text-lg font-semibold text-primary">
                {accountData
                  ? formatHealthFactor(
                      accountData.healthFactor,
                      accountData.totalDebtBase
                    )
                  : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background/50 p-3">
              <p className="text-xs text-foreground/60">Total colateral</p>
              <p className="text-lg font-semibold text-foreground">
                {accountData
                  ? `$${formatUsd(
                      formatBaseCurrency(accountData.totalCollateralBase)
                    )}`
                  : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background/50 p-3">
              <p className="text-xs text-foreground/60">Total dívida</p>
              <p className="text-lg font-semibold text-foreground">
                {accountData
                  ? `$${formatUsd(
                      formatBaseCurrency(accountData.totalDebtBase)
                    )}`
                  : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background/50 p-3">
              <p className="text-xs text-foreground/60">LTV / LT</p>
              <p className="text-lg font-semibold text-foreground">
                {accountData
                  ? `${(Number(accountData.ltv) / 100).toFixed(0)}% / ${(Number(accountData.currentLiquidationThreshold) / 100).toFixed(0)}%`
                  : "—"}
              </p>
            </div>
          </div>
        </section>

        {/* Tabelas */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground/90">Tabelas</h2>

          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <h3 className="mb-2 text-xs font-medium text-foreground/70">
              Colaterais
            </h3>
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
                  {!hasPosition && (
                    <tr className="border-b border-border/50">
                      <td
                        colSpan={3}
                        className="py-4 text-center text-foreground/50"
                      >
                        Nenhum colateral. Verifique um endereço.
                      </td>
                    </tr>
                  )}
                  {collaterals.map((c) => (
                    <tr
                      key={c.asset}
                      className="border-b border-border/50"
                    >
                      <td className="py-2 pr-4 font-medium">{c.symbol}</td>
                      <td className="py-2 pr-4">{c.balance}</td>
                      <td className="py-2">{c.valueUsd}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <h3 className="mb-2 text-xs font-medium text-foreground/70">
              Empréstimos
            </h3>
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
                  {!hasPosition && (
                    <tr className="border-b border-border/50">
                      <td
                        colSpan={3}
                        className="py-4 text-center text-foreground/50"
                      >
                        Nenhum empréstimo. Verifique um endereço.
                      </td>
                    </tr>
                  )}
                  {debts.map((d) => (
                    <tr
                      key={d.asset}
                      className="border-b border-border/50"
                    >
                      <td className="py-2 pr-4 font-medium">{d.symbol}</td>
                      <td className="py-2 pr-4">{d.debt}</td>
                      <td className="py-2">{d.rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Análise de Liquidação */}
        <section className="rounded-xl border border-border bg-muted/30 p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground/90">
            Análise de Liquidação
          </h2>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLiquidationMode("coupled")}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    liquidationMode === "coupled"
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border bg-background text-foreground/80 hover:bg-muted/50"
                  }`}
                >
                  Coupled
                </button>
                <button
                  type="button"
                  onClick={() => setLiquidationMode("single-asset")}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    liquidationMode === "single-asset"
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border bg-background text-foreground/80 hover:bg-muted/50"
                  }`}
                >
                  Single-asset
                </button>
              </div>
              <span
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-foreground/40 bg-foreground/10 text-xs font-medium text-foreground/70"
                title="Coupled: liquidação considera toda a posição. Single-asset: preço de liquidação por ativo isolado."
              >
                i
              </span>
            </div>

            {accountData &&
            accountData.totalDebtBase > BigInt(0) &&
            accountData.totalCollateralBase > BigInt(0) ? (
              (() => {
                const { liquidationCollateralBase, dropPercent } =
                  getLiquidationData(accountData);
                const liquidationValueUsd = formatUsd(
                  formatBaseCurrency(liquidationCollateralBase)
                );
                return (
                  <>
                    <div className="rounded-lg border border-border bg-background/50 p-3">
                      <p className="flex items-center gap-2 text-xs text-foreground/60">
                        Preço de liquidação (estimado)
                        <span
                          className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-foreground/30 text-[10px] text-foreground/50"
                          title="Valor total do colateral no qual a posição seria liquidada (HF = 1)."
                        >
                          i
                        </span>
                      </p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        ${liquidationValueUsd}
                      </p>
                      <p className="mt-1 text-xs text-foreground/60">
                        {liquidationMode === "coupled"
                          ? "Valor do colateral quando a posição atinge HF = 1 (considerando toda a carteira)."
                          : "Valor total do colateral no momento da liquidação. Single-asset considera a posição agregada."}
                      </p>
                    </div>
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                      <p className="text-xs font-medium text-amber-200/90">
                        Queda até liquidação
                      </p>
                      <p className="mt-1 text-lg font-semibold text-amber-200">
                        {dropPercent.toFixed(1)}%
                      </p>
                      <p className="mt-1 text-xs text-amber-200/80">
                        Se o valor total do colateral cair{" "}
                        {dropPercent.toFixed(1)}% em relação ao atual, a
                        posição atingirá o limite de liquidação (HF = 1).
                      </p>
                    </div>
                  </>
                );
              })()
            ) : (
              <div className="rounded-lg border border-border bg-background/50 p-3">
                <p className="flex items-center gap-2 text-xs text-foreground/60">
                  Preço de liquidação (estimado)
                  <span
                    className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-foreground/30 text-[10px] text-foreground/50"
                    title="Preço aproximado no qual a posição pode ser liquidada."
                  >
                    i
                  </span>
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">—</p>
                <p className="mt-1 text-xs text-foreground/60">
                  Verifique um endereço com colateral e dívida para ver o preço
                  de liquidação.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Links */}
        <section className="rounded-xl border border-border bg-muted/30 p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground/90">
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

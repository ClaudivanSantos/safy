/**
 * Aave V3 - redes suportadas (conectar carteira, RPC público igual à tela de Pools)
 * https://aave.com/docs/aave-v3/smart-contracts/view-contracts
 */

import { CHAINS } from "@/lib/chains";

export type AaveNetworkId = "ethereum" | "polygon" | "arbitrum";

export type AaveNetworkConfig = {
  id: AaveNetworkId;
  name: string;
  chainId: number;
  /** RPCs: mesmo de lib/chains + fallbacks */
  rpcUrls: string[];
  poolAddress: `0x${string}`;
  poolAddressesProvider: `0x${string}`;
  uiPoolDataProvider: `0x${string}`;
};

/** Redes Aave V3 — RPC alinhado a lib/chains (Pools) */
export const AAVE_NETWORKS: Record<AaveNetworkId, AaveNetworkConfig> = {
  ethereum: {
    id: "ethereum",
    name: "Ethereum",
    chainId: 1,
    rpcUrls: [
      CHAINS.ethereum.rpc,
      "https://cloudflare-eth.com",
      "https://ethereum.publicnode.com",
      "https://eth.llamarpc.com",
    ],
    poolAddress: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
    poolAddressesProvider: "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e",
    uiPoolDataProvider: "0x3F78BBD206e4D3c504Eb854232EdA7e47E9Fd8FC",
  },
  polygon: {
    id: "polygon",
    name: "Polygon",
    chainId: 137,
    rpcUrls: [
      CHAINS.polygon.rpc,
      "https://polygon-bor-rpc.publicnode.com",
      "https://rpc.ankr.com/polygon",
      "https://polygon.llamarpc.com",
    ],
    poolAddress: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    poolAddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    uiPoolDataProvider: "0x8f1a406D28230F9436ffDA325dA797F431f7107c",
  },
  arbitrum: {
    id: "arbitrum",
    name: "Arbitrum One",
    chainId: 42161,
    rpcUrls: [
      CHAINS.arbitrum.rpc,
      "https://rpc.ankr.com/arbitrum",
      "https://arbitrum-one-rpc.publicnode.com",
    ],
    poolAddress: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    poolAddressesProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    uiPoolDataProvider: "0x145dE30c929a065582da84Cf96F88460dB9745A7",
  },
};

export const AAVE_NETWORK_IDS = Object.keys(AAVE_NETWORKS) as AaveNetworkId[];

/** ABI mínima: Pool.getUserAccountData - nomes iguais ao contrato para viem mapear corretamente. */
export const POOL_ABI = [
  {
    name: "getUserAccountData",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "totalCollateralBase", type: "uint256" },
      { name: "totalDebtBase", type: "uint256" },
      { name: "availableBorrowsBase", type: "uint256" },
      { name: "currentLiquidationThreshold", type: "uint256" },
      { name: "ltv", type: "uint256" },
      { name: "healthFactor", type: "uint256" },
    ],
  },
] as const;

/** ABI: UiPoolDataProvider.getUserReservesData */
export const UI_POOL_DATA_PROVIDER_ABI = [
  {
    name: "getUserReservesData",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "provider", type: "address" },
      { name: "user", type: "address" },
    ],
    outputs: [
      {
        name: "userReservesData",
        type: "tuple[]",
        components: [
          { name: "underlyingAsset", type: "address" },
          { name: "scaledATokenBalance", type: "uint256" },
          { name: "usageAsCollateralEnabledOnUser", type: "bool" },
          { name: "scaledVariableDebt", type: "uint256" },
        ],
      },
      { name: "userEmodeCategoryId", type: "uint8" },
    ],
  },
  {
    name: "getReservesData",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "provider", type: "address" }],
    outputs: [
      {
        name: "reservesData",
        type: "tuple[]",
        components: [
          { name: "underlyingAsset", type: "address" },
          { name: "name", type: "string" },
          { name: "symbol", type: "string" },
          { name: "decimals", type: "uint256" },
          { name: "baseLTVasCollateral", type: "uint256" },
          { name: "reserveLiquidationThreshold", type: "uint256" },
          { name: "reserveLiquidationBonus", type: "uint256" },
          { name: "reserveFactor", type: "uint256" },
          { name: "usageAsCollateralEnabled", type: "bool" },
          { name: "borrowingEnabled", type: "bool" },
          { name: "isActive", type: "bool" },
          { name: "isFrozen", type: "bool" },
          { name: "liquidityIndex", type: "uint128" },
          { name: "variableBorrowIndex", type: "uint128" },
          { name: "liquidityRate", type: "uint128" },
          { name: "variableBorrowRate", type: "uint128" },
          { name: "lastUpdateTimestamp", type: "uint40" },
          { name: "aTokenAddress", type: "address" },
          { name: "variableDebtTokenAddress", type: "address" },
          { name: "interestRateStrategyAddress", type: "address" },
          { name: "availableLiquidity", type: "uint256" },
          { name: "totalScaledVariableDebt", type: "uint256" },
          { name: "priceInMarketReferenceCurrency", type: "uint256" },
          { name: "priceOracle", type: "address" },
          { name: "variableRateSlope1", type: "uint256" },
          { name: "variableRateSlope2", type: "uint256" },
          { name: "baseVariableBorrowRate", type: "uint256" },
          { name: "optimalUsageRatio", type: "uint256" },
          { name: "isPaused", type: "bool" },
          { name: "isSiloedBorrowing", type: "bool" },
          { name: "accruedToTreasury", type: "uint128" },
          { name: "unbacked", type: "uint128" },
          { name: "isolationModeTotalDebt", type: "uint128" },
          { name: "flashLoanEnabled", type: "bool" },
          { name: "debtCeiling", type: "uint256" },
          { name: "debtCeilingDecimals", type: "uint256" },
          { name: "eModeCategoryId", type: "uint8" },
          { name: "borrowCap", type: "uint256" },
          { name: "supplyCap", type: "uint256" },
          { name: "borrowableInIsolation", type: "bool" },
        ],
      },
      {
        name: "baseCurrencyInfo",
        type: "tuple",
        components: [
          { name: "marketReferenceCurrencyUnit", type: "uint256" },
          { name: "marketReferenceCurrencyPriceInUsd", type: "int256" },
          { name: "networkBaseTokenPriceInUsd", type: "int256" },
          { name: "networkBaseTokenPriceDecimals", type: "uint8" },
        ],
      },
    ],
  },
] as const;

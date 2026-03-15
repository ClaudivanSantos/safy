/**
 * Liquidity pools network config (read-only).
 * Ethereum uses internal /api/pools-subgraph; multi-chain uses /api/pools with RPC + Dexscreener + DefiLlama.
 */

export type PoolNetworkId = "ethereum" | "bsc" | "polygon" | "arbitrum" | "base";
export type PoolProtocolVersion = "v2" | "v3" | "v4";

export type PoolNetworkConfig = {
  id: PoolNetworkId;
  name: string;
  chainId: number;
  dexName: string;
  dexAppUrl: string;
  subgraphEnabled: boolean;
};

export const POOL_NETWORKS: Record<PoolNetworkId, PoolNetworkConfig> = {
  ethereum: {
    id: "ethereum",
    name: "Ethereum",
    chainId: 1,
    dexName: "Uniswap",
    dexAppUrl: "https://app.uniswap.org/liquidity",
    subgraphEnabled: true,
  },
  bsc: {
    id: "bsc",
    name: "BNB Chain",
    chainId: 56,
    dexName: "PancakeSwap",
    dexAppUrl: "https://pancakeswap.finance/liquidity",
    subgraphEnabled: false,
  },
  polygon: {
    id: "polygon",
    name: "Polygon",
    chainId: 137,
    dexName: "Uniswap V2",
    dexAppUrl: "https://app.uniswap.org/liquidity",
    subgraphEnabled: false,
  },
  arbitrum: {
    id: "arbitrum",
    name: "Arbitrum One",
    chainId: 42161,
    dexName: "Uniswap V2",
    dexAppUrl: "https://app.uniswap.org/liquidity",
    subgraphEnabled: false,
  },
  base: {
    id: "base",
    name: "Base",
    chainId: 8453,
    dexName: "Uniswap V2",
    dexAppUrl: "https://app.uniswap.org/liquidity",
    subgraphEnabled: false,
  },
};

export const POOL_NETWORK_IDS = Object.keys(POOL_NETWORKS) as PoolNetworkId[];
export const POOL_PROTOCOL_IDS: PoolProtocolVersion[] = ["v2", "v3", "v4"];

export const POOLS_SUBGRAPH_API = "/api/pools-subgraph";
export const POOLS_API = "/api/pools";
export const LLAMA_YIELDS_POOLS_API = "https://yields.llama.fi/pools";

export function getProtocolLabel(protocol: PoolProtocolVersion): string {
  if (protocol === "v2") return "Uniswap V2";
  if (protocol === "v3") return "Uniswap V3";
  return "Uniswap V4";
}

export function getKrystalLiquidityUrl(networkId: PoolNetworkId): string {
  const networkParam =
    networkId === "ethereum"
      ? "ethereum"
      : networkId === "bsc"
        ? "bsc"
        : networkId === "polygon"
          ? "polygon"
          : networkId === "arbitrum"
            ? "arbitrum"
            : "base";
  return `https://defi.krystal.app/liquidity?network=${networkParam}`;
}

export function getDexLiquidityUrl(
  networkId: PoolNetworkId,
  protocol: PoolProtocolVersion,
  poolAddress?: string
): string {
  const config = POOL_NETWORKS[networkId];
  if (protocol === "v2" && poolAddress) {
    return `https://app.uniswap.org/liquidity/positions/v2/${poolAddress}`;
  }
  if (protocol === "v3") return "https://app.uniswap.org/positions/v3";
  if (protocol === "v4") return "https://app.uniswap.org/positions/v4";
  return config.dexAppUrl;
}

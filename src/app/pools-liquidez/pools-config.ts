/**
 * Configuração de redes e subgraphs para Pools de Liquidez (apenas leitura).
 * Ethereum usa a API interna /api/pools-subgraph (servidor usa GRAPH_API_KEY).
 */

export type PoolNetworkId = "ethereum" | "polygon" | "arbitrum";

export type PoolNetworkConfig = {
  id: PoolNetworkId;
  name: string;
  chainId: number;
  dexName: string;
  dexAppUrl: string;
  /** Se true, a rede tem subgraph disponível (via API interna). */
  subgraphEnabled: boolean;
};

export const POOL_NETWORKS: Record<PoolNetworkId, PoolNetworkConfig> = {
  ethereum: {
    id: "ethereum",
    name: "Ethereum",
    chainId: 1,
    dexName: "Uniswap V2",
    dexAppUrl: "https://app.uniswap.org/liquidity",
    subgraphEnabled: true,
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
};

export const POOL_NETWORK_IDS = Object.keys(POOL_NETWORKS) as PoolNetworkId[];

/** URL da API interna que faz proxy para o subgraph (usa GRAPH_API_KEY no servidor). */
export const POOLS_SUBGRAPH_API = "/api/pools-subgraph";

export function getKrystalLiquidityUrl(networkId: PoolNetworkId): string {
  const networkParam =
    networkId === "ethereum" ? "ethereum" : networkId === "polygon" ? "polygon" : "arbitrum";
  return `https://defi.krystal.app/liquidity?network=${networkParam}`;
}

export function getDexLiquidityUrl(networkId: PoolNetworkId, poolAddress?: string): string {
  const config = POOL_NETWORKS[networkId];
  if (poolAddress)
    return `https://app.uniswap.org/liquidity?pool=${poolAddress}`;
  return config.dexAppUrl;
}

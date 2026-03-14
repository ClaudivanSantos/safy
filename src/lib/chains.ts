/**
 * Multi-chain configuration for DeFi pools (public RPC only).
 */

export type ChainId = keyof typeof CHAINS;

export const CHAINS = {
  ethereum: {
    name: "Ethereum",
    rpc: "https://rpc.ankr.com/eth",
    chainId: 1,
    /** Dexscreener chainId */
    dexscreenerId: "ethereum",
  },
  bsc: {
    name: "BNB Chain",
    rpc: "https://bsc-dataseed.binance.org",
    chainId: 56,
    dexscreenerId: "bsc",
  },
  polygon: {
    name: "Polygon",
    rpc: "https://polygon-bor.publicnode.com",
    chainId: 137,
    dexscreenerId: "polygon",
  },
  arbitrum: {
    name: "Arbitrum",
    rpc: "https://arb1.arbitrum.io/rpc",
    chainId: 42161,
    dexscreenerId: "arbitrum",
  },
  base: {
    name: "Base",
    rpc: "https://mainnet.base.org",
    chainId: 8453,
    dexscreenerId: "base",
  },
} as const;

export const CHAIN_IDS = Object.keys(CHAINS) as ChainId[];

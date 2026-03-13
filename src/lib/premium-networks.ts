/**
 * Redes aceitas para pagamento premium (2 USDT).
 * PAYMENT_ADDRESS é o mesmo em todas (endereço EVM).
 */

export type PremiumNetworkId = "bsc" | "polygon" | "arbitrum";

export type PremiumNetwork = {
  id: PremiumNetworkId;
  name: string;
  chainId: number;
  chainIdHex: string;
  usdtContract: `0x${string}`;
  decimals: number;
  rpcUrl: string;
  chainParams: {
    chainId: string;
    chainName: string;
    nativeCurrency: { name: string; symbol: string; decimals: number };
    rpcUrls: string[];
    blockExplorerUrls: string[];
  };
};

const BNB_RPC = process.env.BNB_RPC_URL ?? "https://bsc-dataseed.binance.org";
const POL_RPC =
  process.env.POL_RPC_URL ?? "https://polygon-bor.publicnode.com";
const ARB_RPC = process.env.ARB_RPC_URL ?? "https://arb1.arbitrum.io/rpc";

export const PREMIUM_NETWORKS: PremiumNetwork[] = [
  {
    id: "bsc",
    name: "BNB Chain",
    chainId: 56,
    chainIdHex: "0x38",
    usdtContract: "0x55d398326f99059fF775485246999027B3197955",
    decimals: 18,
    rpcUrl: BNB_RPC,
    chainParams: {
      chainId: "0x38",
      chainName: "BNB Chain",
      nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
      rpcUrls: ["https://bsc-dataseed.binance.org"],
      blockExplorerUrls: ["https://bscscan.com"],
    },
  },
  {
    id: "polygon",
    name: "Polygon",
    chainId: 137,
    chainIdHex: "0x89",
    usdtContract: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    decimals: 6,
    rpcUrl: POL_RPC,
    chainParams: {
      chainId: "0x89",
      chainName: "Polygon",
      nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
      rpcUrls: [POL_RPC],
      blockExplorerUrls: ["https://polygonscan.com"],
    },
  },
  {
    id: "arbitrum",
    name: "Arbitrum",
    chainId: 42161,
    chainIdHex: "0xa4b1",
    usdtContract: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    decimals: 6,
    rpcUrl: ARB_RPC,
    chainParams: {
      chainId: "0xa4b1",
      chainName: "Arbitrum One",
      nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
      rpcUrls: ["https://arb1.arbitrum.io/rpc"],
      blockExplorerUrls: ["https://arbiscan.io"],
    },
  },
];

export function getPremiumNetwork(id: PremiumNetworkId): PremiumNetwork | undefined {
  return PREMIUM_NETWORKS.find((n) => n.id === id);
}

export function getRpcUrl(chainId: PremiumNetworkId): string {
  return getPremiumNetwork(chainId)?.rpcUrl ?? "";
}

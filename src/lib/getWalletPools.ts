import { Contract, getAddress } from "ethers";
import type { ChainId } from "./chains";
import { getProvider } from "./provider";

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

const LP_ABI = [
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function totalSupply() view returns (uint256)",
];

export type WalletPoolRaw = {
  chain: ChainId;
  poolAddress: string;
  token0: string;
  token1: string;
  reserve0: bigint;
  reserve1: bigint;
  totalSupply: bigint;
  userLpBalance: bigint;
};

/**
 * Detect LP tokens in wallet by:
 * 1. Getting ERC20 balances (we use a list of known LP tokens per chain or scan - for a generic approach we try each token that has balance and check LP interface).
 * 2. For each token with balance > 0, check if it has token0(), token1(), getReserves(), totalSupply().
 *
 * Since we don't have an index of LP tokens, we get all token transfers to the wallet (or use a predefined list). The spec says "read wallet ERC20 balances" then "detect LP tokens". So we need to know which contracts to check. Common approach: use existing LP registries or subgraphs. For a minimal implementation we can use a small list of known LP factory events or just try tokens the wallet holds.
 *
 * Alternative: get Transfer events to the wallet for ERC20s, collect unique token addresses, then for each call token0/token1/getReserves/totalSupply - if they don't revert, treat as LP and read reserves.
 */
export async function getWalletPools(
  walletAddress: string,
  chain: ChainId
): Promise<WalletPoolRaw[]> {
  const provider = getProvider(chain);
  const normalizedWallet = getAddress(walletAddress);

  // Get all token contracts we need to check. We use the provider to get logs for ERC20 Transfer(to=wallet) to find tokens the wallet received. Then we check balance and LP interface.
  const erc20TransferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  // Transfer(address,address,uint256) - to is indexed (second param): pad to 32 bytes
  const toTopic = "0x" + normalizedWallet.slice(2).toLowerCase().padStart(64, "0");

  let fromBlock: number;
  try {
    const block = await provider.getBlockNumber();
    // Last ~2M blocks to avoid too many requests (Ethereum ~10k blocks per chain scan)
    const range = chain === "ethereum" ? 2_000_000 : 500_000;
    fromBlock = Math.max(0, block - range);
  } catch {
    fromBlock = 0;
  }

  const tokenAddresses = new Set<string>();

  try {
    const logs = await provider.getLogs({
      fromBlock,
      toBlock: "latest",
      topics: [erc20TransferTopic, null, toTopic],
    });
    for (const log of logs) {
      if (log.address && log.address.length === 42) {
        tokenAddresses.add(getAddress(log.address));
      }
    }
  } catch {
    // If getLogs fails (e.g. range too large), return empty and rely on API to handle
    return [];
  }

  const results: WalletPoolRaw[] = [];

  for (const tokenAddress of tokenAddresses) {
    try {
      const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);
      const balance = (await tokenContract.balanceOf(normalizedWallet)) as bigint;
      if (balance === BigInt(0)) continue;

      const lpContract = new Contract(tokenAddress, LP_ABI, provider);
      const [token0, token1, reserves, totalSupply] = await Promise.all([
        lpContract.token0() as Promise<string>,
        lpContract.token1() as Promise<string>,
        lpContract.getReserves() as Promise<[bigint, bigint, number]>,
        lpContract.totalSupply() as Promise<bigint>,
      ]);
      if (!token0 || !token1 || totalSupply === BigInt(0)) continue;

      const [reserve0, reserve1] = reserves;
      results.push({
        chain,
        poolAddress: getAddress(tokenAddress),
        token0: getAddress(token0),
        token1: getAddress(token1),
        reserve0,
        reserve1,
        totalSupply,
        userLpBalance: balance,
      });
    } catch {
      // Not an LP token or RPC error, skip
    }
  }

  return results;
}

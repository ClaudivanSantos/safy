import { JsonRpcProvider } from "ethers";
import { CHAINS, type ChainId } from "./chains";

/**
 * Returns an ethers JsonRpcProvider for the given chain using the RPC from chains config.
 */
export function getProvider(chain: ChainId): JsonRpcProvider {
  const config = CHAINS[chain];
  if (!config) {
    throw new Error(`Unknown chain: ${chain}`);
  }
  return new JsonRpcProvider(config.rpc);
}

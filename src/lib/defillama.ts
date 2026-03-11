const DEFILLAMA_POOLS_URL = "https://yields.llama.fi/pools";
const CACHE_MS = 60 * 60 * 1000; // 1 hour

let cache: { data: DefiLlamaPool[]; expires: number } | null = null;

export type DefiLlamaPool = {
  chain: string;
  project: string;
  symbol: string;
  apy: number | null;
  apyBase: number | null;
  apyReward: number | null;
  tvlUsd: number | null;
  pool: string;
  underlyingTokens?: string[];
};

type LlamaPoolRaw = {
  chain?: string;
  project?: string;
  symbol?: string;
  apy?: number | null;
  apyBase?: number | null;
  apyReward?: number | null;
  tvlUsd?: number | null;
  pool?: string;
  underlyingTokens?: string[];
};

async function fetchAllPools(): Promise<DefiLlamaPool[]> {
  if (cache && cache.expires > Date.now()) {
    return cache.data;
  }
  try {
    const res = await fetch(DEFILLAMA_POOLS_URL, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: LlamaPoolRaw[]; status?: string };
    if (json.status !== "success" || !Array.isArray(json.data)) return [];
    const data = json.data.map((p) => ({
      chain: p.chain ?? "",
      project: p.project ?? "",
      symbol: p.symbol ?? "",
      apy: p.apy ?? null,
      apyBase: p.apyBase ?? null,
      apyReward: p.apyReward ?? null,
      tvlUsd: p.tvlUsd ?? null,
      pool: p.pool ?? "",
      underlyingTokens: p.underlyingTokens,
    }));
    cache = { data, expires: Date.now() + CACHE_MS };
    return data;
  } catch {
    return [];
  }
}

const CHAIN_TO_LLAMA: Record<string, string> = {
  ethereum: "Ethereum",
  bsc: "BSC",
  polygon: "Polygon",
  arbitrum: "Arbitrum",
};

/**
 * Match pools by pair symbols and chain. poolAddress from our side is the LP token address; Llama returns pool id which can be "address-chain". We match by normalizing pair symbols (e.g. "BNB-USDT" or "USDT-BNB") and chain name.
 */
export async function getApysFromDefiLlama(
  chain: string,
  pairSymbol: string,
  _poolAddress?: string
): Promise<{ apy: number | null; tvlUsd: number | null }> {
  const pools = await fetchAllPools();
  const chainName = CHAIN_TO_LLAMA[chain.toLowerCase()] ?? chain;
  const partsPair = pairSymbol.split("-").map((s) => s.trim().toUpperCase()).filter(Boolean);
  if (partsPair.length < 2) return { apy: null, tvlUsd: null };
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toUpperCase();

  for (const p of pools) {
    if (p.chain !== chainName) continue;
    const sym = norm(p.symbol ?? "");
    if (!sym) continue;
    const parts = sym.split(/[-/]/).map((s) => s.trim().toUpperCase()).filter(Boolean);
    const hasFirst = parts.includes(partsPair[0]);
    const hasSecond = parts.includes(partsPair[1]);
    if (hasFirst && hasSecond) {
      return { apy: p.apy ?? null, tvlUsd: p.tvlUsd ?? null };
    }
  }
  return { apy: null, tvlUsd: null };
}

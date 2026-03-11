import { CHAINS, type ChainId } from "./chains";

const DEXSCREENER_BASE = "https://api.dexscreener.com/latest/dex/pairs";
const CACHE_MS = 5 * 60 * 1000; // 5 minutes

const cache = new Map<string, { data: DexscreenerResult; expires: number }>();

export type DexscreenerResult = {
  dex: string;
  pair: string;
  priceUsd: number;
  liquidityUsd: number;
  volume24h: number;
};

type DexscreenerPair = {
  dexId?: string;
  baseToken?: { symbol?: string };
  quoteToken?: { symbol?: string };
  priceUsd?: string;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
};

function getCacheKey(chain: ChainId, pairAddress: string): string {
  const id = CHAINS[chain]?.dexscreenerId ?? chain;
  return `dexscreener:${id}:${pairAddress.toLowerCase()}`;
}

export async function fetchPoolFromDexscreener(
  chain: ChainId,
  pairAddress: string
): Promise<DexscreenerResult | null> {
  const key = getCacheKey(chain, pairAddress);
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) {
    return hit.data;
  }

  const chainId = CHAINS[chain]?.dexscreenerId ?? chain;
  const url = `${DEXSCREENER_BASE}/${chainId}/${pairAddress}`;

  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json = (await res.json()) as { pairs?: DexscreenerPair[]; pair?: DexscreenerPair };
    const raw = Array.isArray(json.pairs) && json.pairs.length > 0 ? json.pairs[0] : json.pair;
    if (!raw) return null;

    const base = raw.baseToken?.symbol ?? "";
    const quote = raw.quoteToken?.symbol ?? "";
    const pair = [base, quote].filter(Boolean).join("-") || "—";
    const data: DexscreenerResult = {
      dex: raw.dexId ?? "—",
      pair,
      priceUsd: parseFloat(String(raw.priceUsd ?? 0)) || 0,
      liquidityUsd: Number(raw.liquidity?.usd ?? 0) || 0,
      volume24h: Number(raw.volume?.h24 ?? 0) || 0,
    };
    cache.set(key, { data, expires: Date.now() + CACHE_MS });
    return data;
  } catch {
    return null;
  }
}

/**
 * DefiLlama APIs para dashboard (TVL protocolos, chains).
 * Todas as APIs são públicas, sem API key.
 */

const PROTOCOLS_URL = process.env.LLAMA_PROTOCOLS_URL ?? "https://api.llama.fi/protocols";
const CHAINS_URL = process.env.LLAMA_CHAINS_URL ?? "https://api.llama.fi/v2/chains";

export type ProtocolOverview = {
  name: string;
  tvl: number;
  slug?: string;
  chainTvls?: Record<string, number>;
};

export type ChainOverview = {
  name: string;
  tvl: number;
  chainId?: number;
};

const CACHE_MS = 5 * 60 * 1000; // 5 min
let protocolsCache: { data: ProtocolOverview[]; expires: number } | null = null;
let chainsCache: { data: ChainOverview[]; expires: number } | null = null;

export async function getProtocolsOverview(): Promise<ProtocolOverview[]> {
  if (protocolsCache && protocolsCache.expires > Date.now()) return protocolsCache.data;
  try {
    const res = await fetch(PROTOCOLS_URL, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const raw = (await res.json()) as Array<{ name?: string; tvl?: number; slug?: string; chainTvls?: Record<string, number> }>;
    const data = (Array.isArray(raw) ? raw : [])
      .filter((p) => p.name && typeof p.tvl === "number")
      .map((p) => ({
        name: p.name!,
        tvl: p.tvl!,
        slug: p.slug,
        chainTvls: p.chainTvls,
      }))
      .sort((a, b) => b.tvl - a.tvl);
    protocolsCache = { data, expires: Date.now() + CACHE_MS };
    return data;
  } catch {
    return [];
  }
}

export async function getChainsOverview(): Promise<ChainOverview[]> {
  if (chainsCache && chainsCache.expires > Date.now()) return chainsCache.data;
  try {
    const res = await fetch(CHAINS_URL, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const raw = (await res.json()) as Array<{ name?: string; tvl?: number; chainId?: number }>;
    const data = (Array.isArray(raw) ? raw : [])
      .filter((c) => c.name && typeof c.tvl === "number")
      .map((c) => ({
        name: c.name!,
        tvl: c.tvl!,
        chainId: c.chainId,
      }))
      .sort((a, b) => b.tvl - a.tvl);
    chainsCache = { data, expires: Date.now() + CACHE_MS };
    return data;
  } catch {
    return [];
  }
}

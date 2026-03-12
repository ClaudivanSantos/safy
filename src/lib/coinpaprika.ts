const COINPAPRIKA_TICKERS_URL = process.env.COINPAPRIKA_TICKERS_URL ?? "https://api.coinpaprika.com/v1/tickers";
const CACHE_MS = 10 * 60 * 1000; // 10 minutes

let cache: { data: Record<string, number>; expires: number } | null = null;

type TickerRaw = {
  symbol?: string;
  quotes?: { USD?: { price?: number } };
};

/**
 * Returns a mapping of symbol -> USD price. Cached for 10 minutes.
 */
export async function getTokenPricesFromCoinPaprika(): Promise<Record<string, number>> {
  if (cache && cache.expires > Date.now()) {
    return cache.data;
  }
  try {
    const res = await fetch(COINPAPRIKA_TICKERS_URL, { next: { revalidate: 600 } });
    if (!res.ok) return {};
    const json = (await res.json()) as TickerRaw[];
    if (!Array.isArray(json)) return {};
    const data: Record<string, number> = {};
    for (const t of json) {
      const symbol = t.symbol?.toUpperCase?.();
      const price = t.quotes?.USD?.price;
      if (symbol && typeof price === "number" && Number.isFinite(price)) {
        data[symbol] = price;
      }
    }
    cache = { data, expires: Date.now() + CACHE_MS };
    return data;
  } catch {
    return {};
  }
}

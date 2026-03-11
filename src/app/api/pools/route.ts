import { NextRequest, NextResponse } from "next/server";
import { getAddress } from "ethers";
import { CHAIN_IDS, type ChainId } from "@/lib/chains";
import { getWalletPools } from "@/lib/getWalletPools";
import { fetchPoolFromDexscreener } from "@/lib/dexscreener";
import { getApysFromDefiLlama } from "@/lib/defillama";
import { getTokenPricesFromCoinPaprika } from "@/lib/coinpaprika";

export type PoolApiRow = {
  chain: string;
  protocol: string;
  pair: string;
  priceUsd: number;
  liquidityUsd: number;
  volume24h: number;
  apy: number | null;
  valueUsd: number;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get("wallet")?.trim();
    const chainParam = searchParams.get("chain")?.toLowerCase()?.trim();

    if (!wallet) {
      return NextResponse.json(
        { error: "Missing wallet parameter." },
        { status: 400 }
      );
    }

    if (!chainParam || !CHAIN_IDS.includes(chainParam as ChainId)) {
      return NextResponse.json(
        { error: "Invalid or missing chain. Use: ethereum, bsc, polygon, arbitrum." },
        { status: 400 }
      );
    }

    const chain = chainParam as ChainId;
    let normalizedWallet: string;
    try {
      normalizedWallet = getAddress(wallet);
    } catch {
      return NextResponse.json(
        { error: "Invalid wallet address." },
        { status: 400 }
      );
    }

    const rawPools = await getWalletPools(normalizedWallet, chain).catch(() => []);
    if (rawPools.length === 0) {
      return NextResponse.json([] as PoolApiRow[]);
    }

    await getTokenPricesFromCoinPaprika();

    const results: PoolApiRow[] = [];

    for (const pool of rawPools) {
      try {
        const dexData = await fetchPoolFromDexscreener(chain, pool.poolAddress);
        if (!dexData) {
          results.push({
            chain,
            protocol: "—",
            pair: `${pool.token0.slice(0, 8)}… / ${pool.token1.slice(0, 8)}…`,
            priceUsd: 0,
            liquidityUsd: 0,
            volume24h: 0,
            apy: null,
            valueUsd: 0,
          });
          continue;
        }

        const { apy } = await getApysFromDefiLlama(
          chain,
          dexData.pair,
          pool.poolAddress
        );

        const totalSupply = pool.totalSupply > BigInt(0) ? Number(pool.totalSupply) : 1;
        const share = Number(pool.userLpBalance) / totalSupply;
        const valueUsd = dexData.liquidityUsd * share;

        const protocolName =
          dexData.dex === "—"
            ? "—"
            : dexData.dex.charAt(0).toUpperCase() + dexData.dex.slice(1);

        results.push({
          chain,
          protocol: protocolName,
          pair: dexData.pair,
          priceUsd: dexData.priceUsd,
          liquidityUsd: dexData.liquidityUsd,
          volume24h: dexData.volume24h,
          apy,
          valueUsd: Math.round(valueUsd * 100) / 100,
        });
      } catch {
        results.push({
          chain,
          protocol: "—",
          pair: "—",
          priceUsd: 0,
          liquidityUsd: 0,
          volume24h: 0,
          apy: null,
          valueUsd: 0,
        });
      }
    }

    return NextResponse.json(results);
  } catch (_e) {
    return NextResponse.json([] as PoolApiRow[]);
  }
}

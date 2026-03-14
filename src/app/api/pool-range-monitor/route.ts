import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendTelegramMessage } from "@/services/telegram";
import { createPublicClient, fallback, getAddress, http } from "viem";
import { mainnet } from "viem/chains";

const RPC_URLS = [
  "https://eth.llamarpc.com",
  "https://ethereum.publicnode.com",
  "https://cloudflare-eth.com",
];

const V3_POSITION_MANAGER = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";
const V3_FACTORY = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
const MAX_POSITIONS = 50;

const v3PositionManagerAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "tokenOfOwnerByIndex",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "positions",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "nonce", type: "uint96" },
      { name: "operator", type: "address" },
      { name: "token0", type: "address" },
      { name: "token1", type: "address" },
      { name: "fee", type: "uint24" },
      { name: "tickLower", type: "int24" },
      { name: "tickUpper", type: "int24" },
      { name: "liquidity", type: "uint128" },
      { name: "feeGrowthInside0LastX128", type: "uint256" },
      { name: "feeGrowthInside1LastX128", type: "uint256" },
      { name: "tokensOwed0", type: "uint128" },
      { name: "tokensOwed1", type: "uint128" },
    ],
  },
] as const;

const v3FactoryAbi = [
  {
    type: "function",
    name: "getPool",
    stateMutability: "view",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "fee", type: "uint24" },
    ],
    outputs: [{ name: "pool", type: "address" }],
  },
] as const;

const v3PoolSlot0Abi = [
  {
    type: "function",
    name: "slot0",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "tick", type: "int24" },
      { name: "observationIndex", type: "uint16" },
      { name: "observationCardinality", type: "uint16" },
      { name: "observationCardinalityNext", type: "uint16" },
      { name: "feeProtocol", type: "uint8" },
      { name: "unlocked", type: "bool" },
    ],
  },
] as const;

function tickToPrice(tick: number): number {
  return Math.pow(1.0001, tick);
}

export type OutOfRangePosition = {
  pair: string;
  tickLower: number;
  tickUpper: number;
  currentTick: number;
  rangeMinPrice: string;
  rangeMaxPrice: string;
  currentPrice: string;
};

function isPoolPremiumActive(expiresAt: Date | string | null | undefined): boolean {
  if (!expiresAt) return false;
  const d = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  return d.getTime() > Date.now();
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const secret = url.searchParams.get("secret");
    const auth = request.headers.get("authorization");
    const expected = process.env.CRON_SECRET;
    if (expected && secret !== expected && auth !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      where: {
        telegram_chat_id: { not: null },
        wallet_address: { not: null },
      },
      select: {
        id: true,
        wallet_address: true,
        telegram_chat_id: true,
        pool_premium_expires_at: true,
      },
    });

    const client = createPublicClient({
      chain: mainnet,
      transport: fallback(RPC_URLS.map((url) => http(url, { timeout: 15_000 }))),
    });

    const now = Date.now();

    for (const user of users) {
      const chatId = user.telegram_chat_id;
      if (!chatId || !isPoolPremiumActive(user.pool_premium_expires_at)) continue;

      const addr = user.wallet_address?.trim();
      if (!addr || !addr.startsWith("0x") || addr.length !== 42) continue;

      const owner = getAddress(addr);

      let balance: bigint;
      try {
        balance = await client.readContract({
          address: V3_POSITION_MANAGER,
          abi: v3PositionManagerAbi,
          functionName: "balanceOf",
          args: [owner],
        });
      } catch {
        continue;
      }

      const count = Number(balance > BigInt(MAX_POSITIONS) ? BigInt(MAX_POSITIONS) : balance);
      const outOfRangeList: OutOfRangePosition[] = [];

      for (let i = 0; i < count; i++) {
        try {
          const tokenId = await client.readContract({
            address: V3_POSITION_MANAGER,
            abi: v3PositionManagerAbi,
            functionName: "tokenOfOwnerByIndex",
            args: [owner, BigInt(i)],
          });

          const position = await client.readContract({
            address: V3_POSITION_MANAGER,
            abi: v3PositionManagerAbi,
            functionName: "positions",
            args: [tokenId],
          });

          const token0 = position[2];
          const token1 = position[3];
          const fee = position[4];
          const tickLower = Number(position[5]);
          const tickUpper = Number(position[6]);
          const liquidity = position[7];
          if (liquidity <= BigInt(0)) continue;

          const poolAddress = await client.readContract({
            address: V3_FACTORY,
            abi: v3FactoryAbi,
            functionName: "getPool",
            args: [token0, token1, fee],
          });

          const slot0 = await client.readContract({
            address: poolAddress as `0x${string}`,
            abi: v3PoolSlot0Abi,
            functionName: "slot0",
          });
          const currentTick = Number(slot0[1]);

          const inRange = currentTick >= tickLower && currentTick <= tickUpper;
          if (inRange) continue;

          const rangeMinPrice = tickToPrice(tickLower).toFixed(6);
          const rangeMaxPrice = tickToPrice(tickUpper).toFixed(6);
          const currentPrice = tickToPrice(currentTick).toFixed(6);
          outOfRangeList.push({
            pair: `${token0.slice(0, 6)}…/${token1.slice(0, 6)}…`,
            tickLower,
            tickUpper,
            currentTick,
            rangeMinPrice,
            rangeMaxPrice,
            currentPrice,
          });
        } catch {
          continue;
        }
      }

      if (outOfRangeList.length === 0) continue;

      const lines = outOfRangeList.map(
        (p) =>
          `• ${p.pair}\n  Range: ${p.rangeMinPrice} — ${p.rangeMaxPrice}\n  Posição atual: ${p.currentPrice} (tick ${p.currentTick})`
      );
      const message =
        "⚠️ Pool fora do range (Uniswap V3)\n\n" +
        "Uma ou mais posições estão fora do range de preço configurado:\n\n" +
        lines.join("\n\n") +
        "\n\nAjuste o range na Uniswap para voltar a gerar fees ou reduza o risco de impermanent loss.";

      await sendTelegramMessage(chatId, message);
    }

    return NextResponse.json({
      ok: true,
      checkedUsers: users.length,
      timestamp: new Date(now).toISOString(),
    });
  } catch (err) {
    console.error("Erro no cron /api/pool-range-monitor:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendTelegramMessage } from "@/services/telegram";
import { AAVE_NETWORKS, AAVE_NETWORK_IDS, POOL_ABI } from "@/app/saude-defi/aave-config";
import {
  createPublicClient,
  http,
  encodeFunctionData,
  decodeAbiParameters,
} from "viem";
import { fallback } from "viem";
import { getTokenPricesFromCoinPaprika } from "@/lib/coinpaprika";

const WAD = BigInt(10) ** BigInt(18);
const BASE_CURRENCY_DECIMALS = 8;

type UserAccountData = {
  totalCollateralBase: bigint;
  totalDebtBase: bigint;
  availableBorrowsBase: bigint;
  currentLiquidationThreshold: bigint;
  ltv: bigint;
  healthFactor: bigint;
};

function toUsdString(valueBase: bigint): string {
  if (valueBase === BigInt(0)) return "0";
  const asNumber = Number(valueBase) / 10 ** BASE_CURRENCY_DECIMALS;
  if (!Number.isFinite(asNumber)) return "0";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(asNumber);
}

function formatHealthFactor(hf: bigint, totalDebtBase: bigint): string {
  if (totalDebtBase === BigInt(0)) return "Infinito";
  if (hf === BigInt(0)) return "0.00";
  const hfScaled = (hf * BigInt(100)) / WAD;
  const hfNum = Number(hfScaled) / 100;
  if (!Number.isFinite(hfNum) || hfNum >= 1e10) return "Infinito";
  return hfNum.toFixed(2);
}

function getLiquidationValueUsd(account: UserAccountData): string {
  if (account.totalDebtBase === BigInt(0)) return "0";
  const lt = account.currentLiquidationThreshold;
  if (lt === BigInt(0)) return "0";
  const liquidationCollateralBase = (account.totalDebtBase * BigInt(10000)) / lt;
  return toUsdString(liquidationCollateralBase);
}

function isPremiumActive(premium_expires_at: Date | string | null | undefined): boolean {
  if (!premium_expires_at) return false;
  const d = typeof premium_expires_at === "string" ? new Date(premium_expires_at) : premium_expires_at;
  return d.getTime() > Date.now();
}

async function fetchAaveAccountDataAllNetworks(userAddress: `0x${string}`): Promise<UserAccountData | null> {
  let totalCollateralBase = BigInt(0);
  let totalDebtBase = BigInt(0);
  let availableBorrowsBase = BigInt(0);
  let currentLiquidationThreshold = BigInt(0);
  let ltv = BigInt(0);
  let healthFactor = BigInt(0);

  let anySuccess = false;

  for (const id of AAVE_NETWORK_IDS) {
    const network = AAVE_NETWORKS[id];
    const transport = fallback(
      network.rpcUrls.map((url) => http(url, { timeout: 15_000 }))
    );
    const client = createPublicClient({
      chain: {
        id: network.chainId,
        name: network.name,
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: { default: { http: network.rpcUrls } },
      },
      transport,
    });

    try {
      const data = encodeFunctionData({
        abi: POOL_ABI,
        functionName: "getUserAccountData",
        args: [userAddress],
      });
      const { data: returnData } = await client.call({
        to: network.poolAddress,
        data,
      });
      if (!returnData) continue;
      const decoded = decodeAbiParameters(
        [
          { type: "uint256" },
          { type: "uint256" },
          { type: "uint256" },
          { type: "uint256" },
          { type: "uint256" },
          { type: "uint256" },
        ],
        returnData
      );

      totalCollateralBase += decoded[0]!;
      totalDebtBase += decoded[1]!;
      availableBorrowsBase += decoded[2]!;
      currentLiquidationThreshold += decoded[3]!;
      ltv += decoded[4]!;
      healthFactor += decoded[5]!;

      anySuccess = true;
    } catch (err) {
      console.error(`Erro ao buscar dados da Aave (daily-report, rede ${network.id}):`, err);
      continue;
    }
  }

  if (!anySuccess) {
    return null;
  }

  return {
    totalCollateralBase,
    totalDebtBase,
    availableBorrowsBase,
    currentLiquidationThreshold,
    ltv,
    healthFactor,
  };
}

async function fetchFearGreedIndex(): Promise<string> {
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=1&format=json", {
      // pequena cache para evitar bater demais na API
      next: { revalidate: 60 * 10 },
    } as RequestInit);
    if (!res.ok) {
      return "Indisponível";
    }
    const data = (await res.json()) as {
      data?: { value?: string; value_classification?: string }[];
    };
    const item = data.data?.[0];
    if (!item?.value) return "Indisponível";
    const classification = item.value_classification ?? "";
    return classification ? `${item.value} (${classification})` : item.value;
  } catch {
    return "Indisponível";
  }
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
      },
      select: {
        id: true,
        wallet_address: true,
        telegram_chat_id: true,
        premium_expires_at: true,
      },
    });

    const now = Date.now();

    const prices = await getTokenPricesFromCoinPaprika();
    const btcPrice = prices["BTC"] ?? prices["XBT"] ?? null;
    const btcPriceStr = btcPrice
      ? new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 2,
        }).format(btcPrice)
      : "Indisponível";

    const fearGreedStr = await fetchFearGreedIndex();

    let reportsSent = 0;

    for (const user of users) {
      const chatId = user.telegram_chat_id;
      if (!chatId) continue;

      const premiumAtivo = isPremiumActive(user.premium_expires_at);

      if (!premiumAtivo) {
        continue;
      }

      const addr = user.wallet_address;
      if (!addr || !addr.startsWith("0x") || addr.length !== 42) continue;

      const accountData = await fetchAaveAccountDataAllNetworks(addr as `0x${string}`);
      if (!accountData) continue;

      const totalCollateralUsd = toUsdString(accountData.totalCollateralBase);
      const totalDebtUsd = toUsdString(accountData.totalDebtBase);
      const hfStr = formatHealthFactor(accountData.healthFactor, accountData.totalDebtBase);
      const liquidationValueUsd = getLiquidationValueUsd(accountData);

      // Usamos os totais de colateral e dívida como proxy de "saldo da carteira DeFi na Aave".
      const message =
        "📊 Relatório diário SafyApp\n\n" +
        `Saldo total da carteira DeFi (Aave, todas as redes): US$ ${totalCollateralUsd}\n` +
        `Dívida Aave (todas as redes): US$ ${totalDebtUsd}\n` +
        `Health factor: ${hfStr}\n` +
        `Preço estimado de liquidação (valor do colateral na liquidação): US$ ${liquidationValueUsd}\n` +
        `Índice Fear & Greed (crypto): ${fearGreedStr}\n` +
        `Preço do Bitcoin: ${btcPriceStr}\n\n` +
        "Dica: mantenha o health factor confortável para reduzir o risco de liquidação." +
        (() => {
          const expiresAt = user.premium_expires_at;
          if (!expiresAt) return "";
          const d =
            typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
          const diffMs = d.getTime() - now;
          if (diffMs <= 0) return "";
          const MS_PER_DAY = 24 * 60 * 60 * 1000;
          const daysLeft = Math.ceil(diffMs / MS_PER_DAY);
          if (daysLeft > 5) return "";
          const plural = daysLeft > 1 ? "dias" : "dia";
          return `\n\n⚠️ Seu plano premium do SafyApp expira em ${daysLeft} ${plural}. Renove para continuar recebendo alertas automáticos.`;
        })();

      await sendTelegramMessage(chatId, message);
      reportsSent += 1;
    }

    return NextResponse.json({
      ok: true,
      usersChecked: users.length,
      reportsSent,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Erro no cron /api/daily-report:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}


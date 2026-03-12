import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendTelegramMessage } from "@/services/telegram";
import { AAVE_NETWORKS, POOL_ABI } from "@/app/saude-defi/aave-config";
import {
  createPublicClient,
  http,
  encodeFunctionData,
  decodeAbiParameters,
} from "viem";
import { fallback } from "viem";

const RAY = BigInt(10) ** BigInt(27);
const WAD = BigInt(10) ** BigInt(18);
const BASE_CURRENCY_DECIMALS = 8;

const HF_ALERT_THRESHOLD = 1.2; // alerta quando HF < 1.2

type UserAccountData = {
  totalCollateralBase: bigint;
  totalDebtBase: bigint;
  availableBorrowsBase: bigint;
  currentLiquidationThreshold: bigint;
  ltv: bigint;
  healthFactor: bigint;
};

function formatHealthFactor(hf: bigint, totalDebtBase: bigint): string {
  if (totalDebtBase === BigInt(0)) return "Infinito";
  if (hf === BigInt(0)) return "0.00";
  const hfScaled = (hf * BigInt(100)) / WAD;
  const hfNum = Number(hfScaled) / 100;
  if (!Number.isFinite(hfNum) || hfNum >= 1e10) return "Infinito";
  return hfNum.toFixed(2);
}

function getLiquidationDropPercent(account: UserAccountData): number {
  if (account.totalDebtBase === BigInt(0)) return 0;
  const hfScaled = (account.healthFactor * BigInt(100)) / WAD;
  const hfNum = Number(hfScaled) / 100;
  if (!Number.isFinite(hfNum) || hfNum <= 0) return 0;
  return (1 - 1 / hfNum) * 100;
}

function isPremiumActive(premium_expires_at: Date | string | null | undefined): boolean {
  if (!premium_expires_at) return false;
  const d = typeof premium_expires_at === "string" ? new Date(premium_expires_at) : premium_expires_at;
  return d.getTime() > Date.now();
}

async function fetchAaveAccountDataEthereum(userAddress: `0x${string}`): Promise<UserAccountData | null> {
  const network = AAVE_NETWORKS.ethereum;
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
    if (!returnData) return null;
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
    return {
      totalCollateralBase: decoded[0]!,
      totalDebtBase: decoded[1]!,
      availableBorrowsBase: decoded[2]!,
      currentLiquidationThreshold: decoded[3]!,
      ltv: decoded[4]!,
      healthFactor: decoded[5]!,
    };
  } catch (err) {
    console.error("Erro ao buscar dados da Aave (monitor):", err);
    return null;
  }
}

export async function GET() {
  try {
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

    for (const user of users) {
      const chatId = user.telegram_chat_id;
      if (!chatId) continue;

      const premiumAtivo = isPremiumActive(user.premium_expires_at);

      if (!premiumAtivo) {
        await sendTelegramMessage(
          chatId,
          "Seu plano premium do SafyApp expirou.\n\nRenove para continuar recebendo alertas automáticos."
        );
        continue;
      }

      const addr = user.wallet_address;
      if (!addr || !addr.startsWith("0x") || addr.length !== 42) continue;

      const accountData = await fetchAaveAccountDataEthereum(addr as `0x${string}`);
      if (!accountData) continue;

      if (accountData.totalDebtBase === BigInt(0)) continue;

      const hfStr = formatHealthFactor(accountData.healthFactor, accountData.totalDebtBase);
      const hfScaled = (accountData.healthFactor * BigInt(100)) / WAD;
      const hfNum = Number(hfScaled) / 100;

      if (!Number.isFinite(hfNum) || hfNum >= HF_ALERT_THRESHOLD) {
        continue;
      }

      const dropPercent = getLiquidationDropPercent(accountData);

      const message =
        "⚠️ Alerta de risco Aave\n\n" +
        `Health factor atual (Ethereum): ${hfStr}\n` +
        `Queda estimada até liquidação: ${dropPercent.toFixed(1)}%\n\n` +
        "Reveja seu colateral e dívida na Aave para reduzir o risco de liquidação.";

      await sendTelegramMessage(chatId, message);
    }

    return NextResponse.json({ ok: true, checkedUsers: users.length, timestamp: new Date(now).toISOString() });
  } catch (err) {
    console.error("Erro no cron /api/aave-monitor:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}


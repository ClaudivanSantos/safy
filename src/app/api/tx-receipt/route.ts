import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getRpcUrl,
  getPremiumNetwork,
  type PremiumNetworkId,
} from "@/lib/premium-networks";
import { isAddress, getAddress } from "viem";

const PAYMENT_ADDRESS_ENV =
  process.env.PAYMENT_ADDRESS || process.env.NEXT_PUBLIC_PAYMENT_ADDRESS;

/** Transfer(address,address,uint256) */
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function parseReceiptLogsForTransfer(
  receipt: { logs?: Array<{ address?: string; topics?: string[]; data?: string }> },
  usdtContract: string,
  paymentAddress: string,
  minAmountWei: bigint
): bigint | null {
  const toTopic = "0x" + getAddress(paymentAddress).slice(2).toLowerCase().padStart(64, "0");
  const usdt = usdtContract.toLowerCase();
  if (!receipt.logs?.length) return null;
  for (const log of receipt.logs) {
    const addr = (log.address ?? "").toLowerCase();
    const topics = log.topics ?? [];
    if (addr !== usdt || topics[0] !== TRANSFER_TOPIC || topics[2] !== toTopic)
      continue;
    const data = log.data ?? "0x0";
    const value = BigInt(data);
    if (value >= minAmountWei) return value;
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hash = searchParams.get("hash");
  const chain = (searchParams.get("chain") ?? "bsc") as PremiumNetworkId;
  const walletParam = searchParams.get("wallet");
  const product = searchParams.get("product") === "pool" ? "pool" : "aave";
  const paymentAddressParam = searchParams.get("paymentAddress");
  const paymentAddress = PAYMENT_ADDRESS_ENV || paymentAddressParam;
  if (!hash || !/^0x[a-fA-F0-9]{64}$/.test(hash)) {
    return NextResponse.json({ error: "Hash inválido." }, { status: 400 });
  }
  const rpc = getRpcUrl(chain);
  const net = getPremiumNetwork(chain);
  if (!rpc || !net) {
    return NextResponse.json({ error: "Rede inválida." }, { status: 400 });
  }
  try {
    const res = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getTransactionReceipt",
        params: [hash],
      }),
    });
    const data = await res.json();
    const result = data?.result ?? null;
    const receipt = result as {
      blockNumber?: string;
      status?: string;
      logs?: Array<{ address?: string; topics?: string[]; data?: string }>;
    } | null;

    const out: { receipt: typeof result; premiumExpiresAt?: string; poolPremiumExpiresAt?: string } = {
      receipt: result,
    };

    if (
      receipt?.blockNumber &&
      receipt?.status === "0x1" &&
      paymentAddress &&
      isAddress(paymentAddress) &&
      walletParam &&
      isAddress(walletParam)
    ) {
      const session = await getSession();
      if (session?.sub) {
        const monthlyMinWei = BigInt(2) * BigInt(10) ** BigInt(net.decimals);
        const annualMinWei = BigInt(18) * BigInt(10) ** BigInt(net.decimals);
        const now = Date.now();
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

        const paidAmount = parseReceiptLogsForTransfer(
          receipt,
          net.usdtContract,
          getAddress(paymentAddress),
          monthlyMinWei
        );

        if (paidAmount && paidAmount >= monthlyMinWei) {
          const isPool = product === "pool";
          if (!isPool) {
            const isAnnual = paidAmount >= annualMinWei;
            const expiresAt = new Date(
              now + (isAnnual ? ONE_YEAR_MS : THIRTY_DAYS_MS)
            );
            await prisma.user.update({
              where: { id: session.sub },
              data: {
                wallet_address: getAddress(walletParam),
                premium_expires_at: expiresAt,
              },
            });
            out.premiumExpiresAt = expiresAt.toISOString();
          }
          // Para product=pool, o campo pool_premium_expires_at é atualizado pela API POST /api/pool-premium-activate
        }
      }
    }

    return NextResponse.json(out);
  } catch (err) {
    console.error("tx-receipt error:", err);
    return NextResponse.json(
      { error: "Erro ao buscar receipt." },
      { status: 500 }
    );
  }
}

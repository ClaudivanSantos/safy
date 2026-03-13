import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getRpcUrl,
  getPremiumNetwork,
  type PremiumNetworkId,
} from "@/lib/premium-networks";
import { isAddress, getAddress } from "viem";

const PAYMENT_ADDRESS_ENV = process.env.PAYMENT_ADDRESS;

/** Transfer(address,address,uint256) */
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function parseReceiptLogsForTransfer(
  receipt: { logs?: Array<{ address?: string; topics?: string[]; data?: string }> },
  usdtContract: string,
  paymentAddress: string,
  minAmountWei: bigint
): boolean {
  const toTopic = "0x" + getAddress(paymentAddress).slice(2).toLowerCase().padStart(64, "0");
  const usdt = usdtContract.toLowerCase();
  if (!receipt.logs?.length) return false;
  for (const log of receipt.logs) {
    const addr = (log.address ?? "").toLowerCase();
    const topics = log.topics ?? [];
    if (addr !== usdt || topics[0] !== TRANSFER_TOPIC || topics[2] !== toTopic)
      continue;
    const data = log.data ?? "0x0";
    const value = BigInt(data);
    if (value >= minAmountWei) return true;
  }
  return false;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hash = searchParams.get("hash");
  const chain = (searchParams.get("chain") ?? "bsc") as PremiumNetworkId;
  const walletParam = searchParams.get("wallet");
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

    const out: { receipt: typeof result; premiumExpiresAt?: string } = {
      receipt: result,
    };

    if (
      receipt?.blockNumber &&
      receipt?.status === "0x1" &&
      PAYMENT_ADDRESS_ENV &&
      isAddress(PAYMENT_ADDRESS_ENV) &&
      walletParam &&
      isAddress(walletParam)
    ) {
      const session = await getSession();
      if (session?.sub) {
        const paymentAddress = getAddress(PAYMENT_ADDRESS_ENV);
        const minAmountWei =
          BigInt(2) * BigInt(10) ** BigInt(net.decimals);
        const valid = parseReceiptLogsForTransfer(
          receipt,
          net.usdtContract,
          paymentAddress,
          minAmountWei
        );
        if (valid) {
          const now = Date.now();
          const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
          const expiresAt = new Date(now + THIRTY_DAYS_MS);
          await prisma.user.update({
            where: { id: session.sub },
            data: {
              wallet_address: getAddress(walletParam),
              premium_expires_at: expiresAt,
            },
          });
          out.premiumExpiresAt = expiresAt.toISOString();
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

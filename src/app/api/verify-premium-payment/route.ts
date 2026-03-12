import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  createPublicClient,
  http,
  isAddress,
  getAddress,
  parseUnits,
  parseAbiItem,
} from "viem";
import { bsc } from "viem/chains";

const USDT_CONTRACT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955" as const;
const MIN_USDT_DECIMALS = 18;
const MIN_USDT_AMOUNT = parseUnits("5", MIN_USDT_DECIMALS);

const PAYMENT_ADDRESS_ENV = process.env.PAYMENT_ADDRESS;
const BNB_RPC_URL = process.env.BNB_RPC_URL ?? "https://bsc-dataseed.binance.org";

const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.sub) {
      return NextResponse.json(
        { error: "Autenticação necessária." },
        { status: 401 }
      );
    }

    if (!PAYMENT_ADDRESS_ENV || !isAddress(PAYMENT_ADDRESS_ENV)) {
      console.error("PAYMENT_ADDRESS inválido ou não configurado.");
      return NextResponse.json(
        { error: "Configuração de pagamento indisponível." },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const walletFromBody: string | undefined =
      body.wallet_address ?? body.walletAddress;

    const dbUser = await prisma.user.findUnique({
      where: { id: session.sub },
      select: {
        wallet_address: true,
        premium_expires_at: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    const rawWallet = (walletFromBody ?? dbUser.wallet_address)?.trim();
    if (!rawWallet || !isAddress(rawWallet)) {
      return NextResponse.json(
        { error: "wallet_address inválido ou não informado." },
        { status: 400 }
      );
    }

    const userWallet = getAddress(rawWallet);
    const paymentAddress = getAddress(PAYMENT_ADDRESS_ENV);

    const client = createPublicClient({
      chain: bsc,
      transport: http(BNB_RPC_URL),
    });

    const latestBlock = await client.getBlockNumber();
    // Procura pagamentos nos últimos ~200k blocos (~alguns dias na BNB Chain).
    const blocksBack = BigInt(200_000);
    const fromBlock =
      latestBlock > blocksBack ? latestBlock - blocksBack : BigInt(1);

    const logs = await client.getLogs({
      address: getAddress(USDT_CONTRACT_ADDRESS),
      event: TRANSFER_EVENT,
      args: {
        from: userWallet,
        to: paymentAddress,
      },
      fromBlock,
      toBlock: latestBlock,
    });

    const validLog = logs
      .map((log) => ({
        value: log.args.value as bigint,
        blockNumber: log.blockNumber ?? BigInt(0),
      }))
      .filter((item) => item.value >= MIN_USDT_AMOUNT)
      .sort((a, b) =>
        a.blockNumber === b.blockNumber
          ? 0
          : a.blockNumber < b.blockNumber
          ? 1
          : -1
      )[0];

    if (!validLog) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Nenhuma transação de pagamento mínima encontrada. Verifique se enviou ao endereço correto com o valor de 5 USDT ou mais na BNB Chain.",
        },
        { status: 400 }
      );
    }

    const now = Date.now();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(now + THIRTY_DAYS_MS);

    await prisma.user.update({
      where: { id: session.sub },
      data: {
        wallet_address: userWallet,
        premium_expires_at: expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      premiumExpiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error("Erro ao verificar pagamento premium:", err);
    return NextResponse.json(
      { error: "Erro ao verificar pagamento. Tente novamente em alguns minutos." },
      { status: 500 }
    );
  }
}


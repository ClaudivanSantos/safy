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
import {
  getPremiumNetwork,
  type PremiumNetworkId,
} from "@/lib/premium-networks";

const PAYMENT_ADDRESS_ENV = process.env.PAYMENT_ADDRESS;

const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);

const BLOCKS_BACK = BigInt(500_000);

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
    const networkId = (body.chain_id ?? body.network ?? "bsc") as PremiumNetworkId;
    const net = getPremiumNetwork(networkId);
    if (!net) {
      return NextResponse.json(
        { error: "Rede inválida. Use bsc, polygon ou arbitrum." },
        { status: 400 }
      );
    }

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

    const rawWallet = (walletFromBody?.trim() || dbUser.wallet_address?.trim())?.trim();
    if (!rawWallet || !isAddress(rawWallet)) {
      return NextResponse.json(
        {
          error:
            "Endereço da carteira inválido ou não informado. Conecte a carteira.",
        },
        { status: 400 }
      );
    }

    const userWallet = getAddress(rawWallet);
    const paymentAddress = getAddress(PAYMENT_ADDRESS_ENV);
    const monthlyMin = parseUnits("2", net.decimals);
    const annualMin = parseUnits("18", net.decimals);

    const client = createPublicClient({
      chain: {
        id: net.chainId,
        name: net.name,
        nativeCurrency: net.chainParams.nativeCurrency,
        rpcUrls: { default: { http: [net.rpcUrl] } },
      },
      transport: http(net.rpcUrl),
    });

    const latestBlock = await client.getBlockNumber();
    const fromBlock =
      latestBlock > BLOCKS_BACK ? latestBlock - BLOCKS_BACK : BigInt(1);

    const logs = await client.getLogs({
      address: net.usdtContract,
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
      .filter((item) => item.value >= monthlyMin)
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
          error: `Nenhuma transação de 2 USDT ou mais encontrada na ${net.name}. Verifique o endereço e a rede.`,
        },
        { status: 400 }
      );
    }

    const now = Date.now();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
    const isAnnual = validLog.value >= annualMin;
    const expiresAt = new Date(now + (isAnnual ? ONE_YEAR_MS : THIRTY_DAYS_MS));

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
      {
        error:
          "Erro ao verificar pagamento. Tente novamente em alguns minutos.",
      },
      { status: 500 }
    );
  }
}

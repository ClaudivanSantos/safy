import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PREMIUM_NETWORKS } from "@/lib/premium-networks";

export async function GET() {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const paymentAddress = process.env.PAYMENT_ADDRESS;
  if (!paymentAddress) {
    return NextResponse.json(
      { error: "Configuração de pagamento indisponível." },
      { status: 503 }
    );
  }
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { premium_expires_at: true },
  });
  const premiumExpiresAt = user?.premium_expires_at?.toISOString() ?? null;
  const networks = PREMIUM_NETWORKS.map((n) => ({
    id: n.id,
    name: n.name,
    chainId: n.chainId,
    chainIdHex: n.chainIdHex,
    usdtContract: n.usdtContract,
    decimals: n.decimals,
    chainParams: n.chainParams,
  }));
  return NextResponse.json({
    paymentAddress,
    amount: "2",
    currency: "USDT",
    networks,
    premiumExpiresAt,
  });
}

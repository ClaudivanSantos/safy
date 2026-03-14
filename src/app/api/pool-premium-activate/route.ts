import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAddress, getAddress } from "viem";

/**
 * Ativa o premium de pools para o usuário logado.
 * Chamado pelo frontend quando o pagamento foi confirmado na carteira (receipt status 0x1).
 * Não valida nada na blockchain: confia na confirmação feita pelo cliente.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let body: { txHash?: string; chain?: string; wallet?: string; paymentAddress?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const txHash = body.txHash;
  const walletParam = body.wallet;

  if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return NextResponse.json({ error: "Hash inválido." }, { status: 400 });
  }
  if (!walletParam || !isAddress(walletParam)) {
    return NextResponse.json({ error: "Carteira inválida." }, { status: 400 });
  }

  const now = Date.now();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(now + THIRTY_DAYS_MS);

  let walletNormalized: string;
  try {
    walletNormalized = getAddress(walletParam);
  } catch {
    return NextResponse.json({ error: "Carteira inválida." }, { status: 400 });
  }

  try {
    await prisma.user.update({
      where: { id: session.sub },
      data: {
        wallet_address: walletNormalized,
        pool_premium_expires_at: expiresAt,
      },
    });

    return NextResponse.json({
      poolPremiumExpiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : null;
    console.error("pool-premium-activate error:", err);
    // P2025 = Record to update not found
    if (code === "P2025") {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? `Erro ao ativar premium de pools: ${message}`
            : "Erro ao ativar premium de pools.",
      },
      { status: 500 }
    );
  }
}

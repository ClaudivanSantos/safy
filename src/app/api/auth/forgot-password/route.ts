import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashRecoveryToken } from "@/lib/recovery-token";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = (body.token as string)?.trim()?.replace(/\s+/g, "");

    if (!token) {
      return NextResponse.json(
        { error: "Informe o token de recuperação." },
        { status: 400 }
      );
    }

    const keyHash = hashRecoveryToken(token);
    const user = await prisma.user.findUnique({
      where: { key_hash: keyHash },
      select: { nome: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Token de recuperação inválido." },
        { status: 401 }
      );
    }

    return NextResponse.json({ nome: user.nome });
  } catch (e) {
    console.error("Forgot password error:", e);
    const message = e instanceof Error ? e.message : "Erro ao validar token.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

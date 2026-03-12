import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashRecoveryToken } from "@/lib/recovery-token";
import { hashPassword } from "@/lib/password";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = (body.token as string)?.trim()?.replace(/\s+/g, "");
    const newPassword = (body.newPassword as string) ?? (body.senha as string) ?? "";

    if (!token) {
      return NextResponse.json(
        { error: "Informe o token de recuperação." },
        { status: 400 }
      );
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "A nova senha deve ter no mínimo 6 caracteres." },
        { status: 400 }
      );
    }

    const keyHash = hashRecoveryToken(token);
    const user = await prisma.user.findUnique({
      where: { key_hash: keyHash },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Token de recuperação inválido." },
        { status: 401 }
      );
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash: passwordHash },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Reset password error:", e);
    const message = e instanceof Error ? e.message : "Erro ao redefinir senha.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

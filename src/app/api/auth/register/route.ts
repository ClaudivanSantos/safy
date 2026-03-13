import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, COOKIE_NAME, COOKIE_OPTIONS } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { hashRecoveryToken } from "@/lib/recovery-token";
import { randomBytes } from "node:crypto";

function generateRecoveryToken(): string {
  const bytes = randomBytes(32);
  const hex = bytes.toString("hex");
  return hex.match(/.{1,8}/g)!.join("-");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nome = (body.nome as string)?.trim();
    const senha = (body.senha as string) ?? (body.password as string) ?? "";

    if (!nome || nome.length < 2) {
      return NextResponse.json(
        { error: "Informe seu nome de usuário (mínimo 2 caracteres)." },
        { status: 400 }
      );
    }

    if (!senha || senha.length < 6) {
      return NextResponse.json(
        { error: "Informe uma senha com no mínimo 6 caracteres." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { nome: nome.trim() },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Já existe um usuário com esse nome. Escolha outro." },
        { status: 409 }
      );
    }

    const MAX_USERS = 100;
    const totalUsers = await prisma.user.count();
    if (totalUsers >= MAX_USERS) {
      return NextResponse.json(
        {
          error:
            "Capacidade máxima de 100 usuários atingida. No momento não é possível criar novas contas.",
        },
        { status: 403 }
      );
    }

    const willReachCapacity = totalUsers + 1 >= MAX_USERS;

    const recoveryToken = generateRecoveryToken();
    const keyHash = hashRecoveryToken(recoveryToken);
    const passwordHash = await hashPassword(senha);

    const user = await prisma.user.create({
      data: {
        nome: nome.trim(),
        password_hash: passwordHash,
        key_hash: keyHash,
        validado: true,
      },
      select: { id: true },
    });

    const token = await createSession(user.id);
    const res = NextResponse.json(
      willReachCapacity
        ? {
            ok: true,
            recoveryToken: recoveryToken,
            redirect: "/",
            capacityReached: true,
          }
        : {
            ok: true,
            recoveryToken: recoveryToken,
            redirect: "/",
          }
    );
    res.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
    return res;
  } catch (e) {
    console.error("Register error:", e);
    const message = e instanceof Error ? e.message : "Erro ao criar conta.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

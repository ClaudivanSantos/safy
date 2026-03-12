import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, COOKIE_NAME, COOKIE_OPTIONS } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nome = (body.nome as string)?.trim();
    const senha = (body.senha as string) ?? (body.password as string) ?? "";

    if (!nome) {
      return NextResponse.json(
        { error: "Informe seu nome de usuário." },
        { status: 400 }
      );
    }

    if (!senha) {
      return NextResponse.json(
        { error: "Informe sua senha." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { nome },
      select: { id: true, password_hash: true },
    });

    if (!user || !user.password_hash) {
      return NextResponse.json(
        { error: "Nome de usuário ou senha incorretos." },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(senha, user.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: "Nome de usuário ou senha incorretos." },
        { status: 401 }
      );
    }

    const token = await createSession(user.id);
    const res = NextResponse.json({ ok: true, redirect: "/" });
    res.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
    return res;
  } catch (e) {
    console.error("Login error:", e);
    const message = e instanceof Error ? e.message : "Erro ao entrar.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

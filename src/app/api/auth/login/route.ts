import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, COOKIE_NAME, COOKIE_OPTIONS } from "@/lib/auth";
import { createHash } from "node:crypto";

function hashKey(key: string): string {
  const normalized = key.trim().replace(/\s+/g, "").replace(/-/g, "").toLowerCase();
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const key = (body.key as string)?.trim();
    if (!key) {
      return NextResponse.json(
        { error: "Informe sua chave de acesso." },
        { status: 400 }
      );
    }

    const keyHash = hashKey(key);
    const user = await prisma.user.findUnique({
      where: { key_hash: keyHash },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Chave inválida. Verifique e tente novamente." },
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

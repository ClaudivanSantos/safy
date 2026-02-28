import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, COOKIE_NAME, COOKIE_OPTIONS } from "@/lib/auth";
import { createHash, randomBytes } from "node:crypto";

function hashKey(key: string): string {
  const normalized = key.trim().replace(/\s+/g, "").replace(/-/g, "").toLowerCase();
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

function generateKey(): string {
  const bytes = randomBytes(32);
  const hex = bytes.toString("hex");
  return hex.match(/.{1,8}/g)!.join("-");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nome = (body.nome as string)?.trim();
    if (!nome || nome.length < 2) {
      return NextResponse.json(
        { error: "Informe seu nome (mínimo 2 caracteres)." },
        { status: 400 }
      );
    }

    const key = generateKey();
    const keyHash = hashKey(key);

    const user = await prisma.user.create({
      data: {
        nome,
        key_hash: keyHash,
        validado: true,
      },
      select: { id: true },
    });

    const token = await createSession(user.id);
    const res = NextResponse.json({
      ok: true,
      key,
      redirect: "/",
    });
    res.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
    return res;
  } catch (e) {
    console.error("Register error:", e);
    const message = e instanceof Error ? e.message : "Erro ao criar conta.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

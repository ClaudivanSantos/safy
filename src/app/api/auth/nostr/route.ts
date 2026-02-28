import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, COOKIE_NAME, COOKIE_OPTIONS } from "@/lib/auth";
import { verifyEvent } from "nostr-tools/pure";

const AUTH_KIND = 27235; // NIP-35 client auth

export async function GET() {
  const challenge = crypto.randomUUID();
  return NextResponse.json({ challenge });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const event = body.event as {
      kind: number;
      content: string;
      pubkey: string;
      id: string;
      sig: string;
      created_at: number;
      tags: string[][];
    };

    if (!event?.pubkey || !event?.sig || !event?.content) {
      return NextResponse.json(
        { error: "Evento inválido." },
        { status: 400 }
      );
    }

    if (event.kind !== AUTH_KIND) {
      return NextResponse.json(
        { error: "Tipo de evento inválido. Use kind 27235." },
        { status: 400 }
      );
    }

    const rawEvent = {
      kind: event.kind,
      content: event.content,
      pubkey: event.pubkey,
      id: event.id,
      sig: event.sig,
      created_at: event.created_at,
      tags: event.tags ?? [],
    };

    if (!verifyEvent(rawEvent)) {
      return NextResponse.json(
        { error: "Assinatura inválida." },
        { status: 401 }
      );
    }

    const challenge = event.content.trim();
    if (!challenge || challenge.length > 100) {
      return NextResponse.json(
        { error: "Challenge inválido." },
        { status: 400 }
      );
    }

    const user = await prisma.user.upsert({
      where: { nostr_pubkey: event.pubkey },
      create: {
        nostr_pubkey: event.pubkey,
        nome: "",
        validado: true,
      },
      update: {},
    });

    const token = await createSession(user.id, event.pubkey);

    const res = NextResponse.json({ ok: true, redirect: "/" });
    res.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
    return res;
  } catch (e) {
    console.error("Nostr login error:", e);
    const message = e instanceof Error ? e.message : "Erro ao fazer login.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

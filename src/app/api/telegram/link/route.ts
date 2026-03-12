import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.sub) {
      return NextResponse.json(
        { error: "Autenticação necessária." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const chatIdRaw = body.chat_id ?? body.chatId;

    if (!chatIdRaw) {
      return NextResponse.json(
        { error: "chat_id é obrigatório." },
        { status: 400 }
      );
    }

    const chatIdStr = String(chatIdRaw).trim();
    if (!/^-?\d+$/.test(chatIdStr)) {
      return NextResponse.json(
        { error: "chat_id inválido." },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: session.sub },
      data: {
        telegram_chat_id: chatIdStr,
      },
    });

    return NextResponse.json({
      message: "Telegram conectado com sucesso.",
    });
  } catch (err) {
    console.error("Erro ao conectar Telegram:", err);
    return NextResponse.json(
      { error: "Erro interno ao conectar Telegram." },
      { status: 500 }
    );
  }
}


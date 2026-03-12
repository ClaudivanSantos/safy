import { NextResponse } from "next/server";
import { sendTelegramMessage } from "@/services/telegram";

type TelegramChat = {
  id: number;
};

type TelegramMessage = {
  message_id: number;
  text?: string;
  chat: TelegramChat;
};

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
};

export async function POST(request: Request) {
  try {
    const update = (await request.json()) as TelegramUpdate;

    const message = update.message;
    const text = message?.text?.trim();
    const chatId = message?.chat?.id;

    if (!text || typeof chatId !== "number") {
      // Apenas acknowledge para evitar retries do Telegram
      return NextResponse.json({ ok: true });
    }

    if (text === "/start") {
      const link = `https://www.safyapp.xyz/connect-telegram?chat_id=${encodeURIComponent(
        String(chatId)
      )}`;
      const reply =
        "Bem-vindo ao SafyApp 🚀\n\n" +
        "Este bot envia alertas automáticos sobre sua carteira, saúde da AAVE e risco de liquidação.\n\n" +
        "Para conectar sua conta clique no link abaixo:\n\n" +
        link;

      await sendTelegramMessage(chatId, reply);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro no webhook do Telegram:", err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}


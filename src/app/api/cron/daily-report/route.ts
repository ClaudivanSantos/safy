import { NextResponse } from "next/server";
import { sendTelegramMessage } from "@/services/telegram";

const ALERT_CHAT_ID = process.env.CRON_ALERT_TELEGRAM_CHAT_ID;

async function notifyCronError(message: string) {
  if (!ALERT_CHAT_ID) return;
  await sendTelegramMessage(ALERT_CHAT_ID, message);
}

/**
 * Cron que dispara o relatório diário (mensagens no Telegram).
 * Valida CRON_SECRET e chama o endpoint interno que envia as mensagens.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const base =
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const res = await fetch(`${base}/api/daily-report`, {
      method: "GET",
      headers: auth ? { authorization: auth } : {},
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg =
        (data as { error?: string }).error ?? "Falha no daily-report";
      console.error("Cron /api/cron/daily-report retornou erro:", {
        status: res.status,
        errMsg,
      });
      await notifyCronError(
        `❌ Cron daily-report falhou (HTTP ${res.status}).\n\n${errMsg}`
      );
      return NextResponse.json(
        { error: errMsg },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("Erro ao chamar daily-report no cron:", err);
    await notifyCronError(
      `❌ Cron daily-report falhou (exception).\n\n${String(
        err instanceof Error ? err.message : err
      )}`
    );
    return NextResponse.json(
      { error: "Erro ao disparar daily-report" },
      { status: 500 }
    );
  }
}

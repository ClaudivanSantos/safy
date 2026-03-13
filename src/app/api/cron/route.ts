import { NextResponse } from "next/server";

/**
 * Rota de cron conforme documentação Vercel.
 * Valida CRON_SECRET no header Authorization e retorna ok.
 * Para disparar os jobs de mensagem, use /api/cron/aave-monitor e /api/cron/daily-report.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  return NextResponse.json({ ok: true });
}

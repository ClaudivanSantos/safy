const TELEGRAM_API_BASE = "https://api.telegram.org";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN && process.env.NODE_ENV === "production") {
  // Em desenvolvimento podemos rodar sem o token, mas em produção é obrigatório.
  console.warn("TELEGRAM_BOT_TOKEN não definido. Integração com Telegram ficará inativa.");
}

export async function sendTelegramMessage(chatId: string | number, message: string): Promise<void> {
  if (!BOT_TOKEN) return;

  const url = `${TELEGRAM_API_BASE}/bot${BOT_TOKEN}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
      }),
    });

    if (!res.ok) {
      console.error("Falha ao enviar mensagem para o Telegram:", await res.text());
    }
  } catch (err) {
    console.error("Erro ao enviar mensagem para o Telegram:", err);
  }
}

/**
 * Registra o webhook do bot no Telegram.
 * Exemplo de uso em script/manual:
 * await registerTelegramWebhook("https://www.safyapp.xyz");
 */
export async function registerTelegramWebhook(baseUrl: string): Promise<void> {
  if (!BOT_TOKEN) {
    console.warn("TELEGRAM_BOT_TOKEN não definido. Não é possível registrar webhook.");
    return;
  }

  const webhookUrl = `${baseUrl.replace(/\/+$/, "")}/api/telegram/webhook`;
  const url = `${TELEGRAM_API_BASE}/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;

  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      console.error("Falha ao registrar webhook no Telegram:", await res.text());
    } else {
      const data = await res.json().catch(() => null);
      console.log("Webhook Telegram registrado:", data ?? (await res.text()));
    }
  } catch (err) {
    console.error("Erro ao registrar webhook no Telegram:", err);
  }
}


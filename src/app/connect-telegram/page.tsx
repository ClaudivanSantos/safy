"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type ConnectTelegramPageProps = {
  searchParams: { chat_id?: string };
};

type ApiResponse = { message?: string; error?: string };

export default function ConnectTelegramPage({
  searchParams,
}: ConnectTelegramPageProps) {
  const chatId = (searchParams.chat_id ?? "").trim();
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chatId) {
      setError("chat_id ausente na URL. Abra o link diretamente a partir da conversa com o bot.");
      setStatus("done");
      return;
    }

    let cancelled = false;
    async function linkTelegram() {
      setStatus("loading");
      setError(null);
      setMessage(null);
      try {
        const res = await fetch("/api/telegram/link", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ chat_id: chatId }),
          credentials: "include",
        });

        const data = (await res.json().catch(() => ({}))) as ApiResponse;

        if (cancelled) return;

        if (!res.ok) {
          const msg =
            data.error ??
            (res.status === 401
              ? "Você precisa estar logado na SafyApp para conectar o Telegram."
              : "Falha ao conectar Telegram. Tente novamente.");
          setError(msg);
        } else {
          setMessage(data.message ?? "Telegram conectado com sucesso.");
        }
      } catch {
        if (cancelled) return;
        setError("Erro de rede ao conectar Telegram. Tente novamente em instantes.");
      } finally {
        if (!cancelled) setStatus("done");
      }
    }

    void linkTelegram();

    return () => {
      cancelled = true;
    };
  }, [chatId]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <main className="w-full max-w-sm space-y-6 text-center">
        <Image
          src="/logo.png"
          alt="Safy"
          width={120}
          height={120}
          className="mx-auto block rounded"
        />
        <h1 className="text-xl font-semibold text-foreground">
          Conectar Telegram
        </h1>
        {status === "loading" && (
          <p className="text-sm text-foreground/70">
            Conectando seu Telegram à sua conta SafyApp…
          </p>
        )}
        {message && (
          <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
        {!message && !error && status === "done" && (
          <p className="text-sm text-foreground/70">
            Nada para fazer no momento. Acesse o link diretamente do bot no Telegram para conectar sua conta.
          </p>
        )}
        <p className="mt-2 text-xs text-foreground/60">
          Dica: se você ainda não estiver logado na SafyApp, faça login em outra
          aba e volte para este link.
        </p>
      </main>
    </div>
  );
}


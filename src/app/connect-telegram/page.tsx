"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "@/app/hooks/use-translation";

type ApiResponse = { message?: string; error?: string };

export default function ConnectTelegramPage() {
  const searchParams = useSearchParams();
  const chatId = (searchParams.get("chat_id") ?? "").trim();
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation("telegram");

  useEffect(() => {
    if (!chatId) {
      setError(t("missingChatId"));
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
              ? t("mustBeLogged")
              : t("failedConnect"));
          setError(msg);
        } else {
          setMessage(data.message ?? t("success"));
        }
      } catch {
        if (cancelled) return;
        setError(t("networkError"));
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
          {t("title")}
        </h1>
        {status === "loading" && (
          <p className="text-sm text-foreground/70">
            {t("connecting")}
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
            {t("nothingToDo")}
          </p>
        )}
        <p className="mt-2 text-xs text-foreground/60">
          {t("hint")}
        </p>
      </main>
    </div>
  );
}


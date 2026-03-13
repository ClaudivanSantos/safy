"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "../hooks/use-translation";
import Link from "next/link";

type Mode = "choose" | "create" | "enter";

const TOKEN_REVEAL_DELAY_MS = 2200;
const inputClass =
  "w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground placeholder:text-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";
const btnPrimary =
  "rounded-lg bg-primary py-3 font-medium text-black hover:bg-primary-hover disabled:opacity-50";
const btnSecondary = "rounded-lg border border-border bg-muted px-4 py-3 text-foreground hover:bg-muted/80";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("choose");
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [tokenRevealed, setTokenRevealed] = useState(false);
  const [capacityReached, setCapacityReached] = useState(false);
  const { t } = useTranslation("authLogin");

  useEffect(() => {
    if (!createdToken) return;
    const t = setTimeout(() => setTokenRevealed(true), TOKEN_REVEAL_DELAY_MS);
    return () => clearTimeout(t);
  }, [createdToken]);

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim(), senha }),
      });
      const data = (await res.json()) as {
        error?: string;
        recoveryToken?: string;
        capacityReached?: boolean;
      };
      if (!res.ok) {
        setError(data.error ?? t("errorCreate"));
        setLoading(false);
        return;
      }
      setCreatedToken(data.recoveryToken ?? null);
      setCapacityReached(Boolean(data.capacityReached));
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorCreate"));
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim(), senha }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("errorLogin"));
        setLoading(false);
        return;
      }
      const loc = (globalThis as { location?: { href: string } }).location;
      if (loc) loc.href = data.redirect ?? "/";
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorLogin"));
      setLoading(false);
    }
  }

  if (createdToken) {
    const copyToken = () => {
      (navigator as { clipboard?: { writeText: (t: string) => Promise<void> } }).clipboard?.writeText(createdToken);
    };
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-primary/40 bg-primary/10 p-4">
          <p className="mb-2 text-sm font-medium text-primary">
            {tokenRevealed ? t("tokenTitle") : t("tokenPreparing")}
          </p>
          {tokenRevealed ? (
            <>
              <p className="break-all font-mono text-sm text-foreground">{createdToken}</p>
              <p className="mt-3 text-xs text-foreground/70">{t("tokenHelp")}</p>
              {capacityReached && (
                <p className="mt-2 text-xs font-medium text-amber-300">
                  {t("tokenCapacityWarning")}
                </p>
              )}
              <button
                type="button"
                onClick={copyToken}
                className="mt-2 rounded border border-primary/50 bg-primary/20 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/30"
              >
                {t("copyToken")}
              </button>
            </>
          ) : (
            <p className="text-sm text-foreground/70">{t("tokenSoon")}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            const loc = (globalThis as { location?: { href: string } }).location;
            if (loc) loc.href = "/";
          }}
          className={`w-full ${btnPrimary}`}
        >
          {t("goToApp")}
        </button>
      </div>
    );
  }

  if (mode === "create") {
    return (
      <form onSubmit={handleCreateAccount} className="space-y-4">
        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
        )}
        <label className="block text-sm font-medium text-foreground/90">
          {t("usernameLabel")}
        </label>
        <input
          type="text"
          required
          minLength={2}
          placeholder={t("usernamePlaceholderCreate")}
          value={nome}
          onChange={(e) => setNome((e.target as unknown as { value: string }).value)}
          className={inputClass}
        />
        <label className="block text-sm font-medium text-foreground/90">
          {t("passwordLabel")}
        </label>
        <input
          type="password"
          required
          minLength={6}
          placeholder={t("passwordPlaceholder")}
          value={senha}
          onChange={(e) => setSenha((e.target as unknown as { value: string }).value)}
          className={inputClass}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setMode("choose");
              setError(null);
              setNome("");
              setSenha("");
            }}
            className={btnSecondary}
          >
            {t("back")}
          </button>
          <button type="submit" disabled={loading} className={`flex-1 ${btnPrimary}`}>
            {loading ? t("creating") : t("create")}
          </button>
        </div>
      </form>
    );
  }

  if (mode === "enter") {
    return (
      <form onSubmit={handleLogin} className="space-y-4">
        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
        )}
        <label className="block text-sm font-medium text-foreground/90">
          {t("usernameLabel")}
        </label>
        <input
          type="text"
          required
          placeholder={t("usernamePlaceholderLogin")}
          value={nome}
          onChange={(e) => setNome((e.target as unknown as { value: string }).value)}
          className={inputClass}
        />
        <label className="block text-sm font-medium text-foreground/90">
          {t("passwordLabel")}
        </label>
        <input
          type="password"
          required
          placeholder={t("passwordPlaceholderLogin")}
          value={senha}
          onChange={(e) => setSenha((e.target as unknown as { value: string }).value)}
          className={inputClass}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setMode("choose");
              setError(null);
              setNome("");
              setSenha("");
            }}
            className={btnSecondary}
          >
            {t("back")}
          </button>
          <button type="submit" disabled={loading} className={`flex-1 ${btnPrimary}`}>
            {loading ? t("entering") : t("enter")}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      )}
      <button
        type="button"
        onClick={() => setMode("create")}
        className={`w-full ${btnPrimary} px-4`}
      >
        {t("createOption")}
      </button>
      <button type="button" onClick={() => setMode("enter")} className={`w-full ${btnSecondary} px-4`}>
        {t("alreadyHaveAccount")}
      </button>
      <Link
        href="/esqueci-senha"
        className="block w-full rounded-lg border border-border/60 px-4 py-3 text-center text-sm text-foreground/70 hover:bg-muted/50"
      >
        {t("forgotPassword")}
      </Link>
    </div>
  );
}

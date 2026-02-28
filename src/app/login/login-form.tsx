"use client";

import { useState, useEffect } from "react";

type Mode = "choose" | "create" | "enter";

const KEY_REVEAL_DELAY_MS = 2200;

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("choose");
  const [nome, setNome] = useState("");
  const [key, setKey] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [keyRevealed, setKeyRevealed] = useState(false);

  useEffect(() => {
    if (!createdKey) return;
    const t = setTimeout(() => setKeyRevealed(true), KEY_REVEAL_DELAY_MS);
    return () => clearTimeout(t);
  }, [createdKey]);

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao criar conta.");
        setLoading(false);
        return;
      }
      setCreatedKey(data.key);
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar conta.");
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
        body: JSON.stringify({ key: key.trim().replace(/\s+/g, "") }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Chave inválida.");
        setLoading(false);
        return;
      }
      const loc = (globalThis as { location?: { href: string } }).location;
      if (loc) loc.href = data.redirect ?? "/";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao entrar.");
      setLoading(false);
    }
  }

  if (createdKey) {
    const copyKey = () => {
      navigator.clipboard.writeText(createdKey);
    };
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-primary/40 bg-primary/10 p-4">
          <p className="mb-2 text-sm font-medium text-primary">
            {keyRevealed
              ? "Sua chave de acesso (guarde em lugar seguro):"
              : "Conta criada. Sua chave está sendo preparada…"}
          </p>
          {keyRevealed ? (
            <>
              <p className="break-all font-mono text-sm text-foreground">
                {createdKey}
              </p>
              <p className="mt-3 text-xs text-foreground/70">
                Você precisará desta chave para entrar no app. Ela não será
                exibida novamente.
              </p>
              <button
                type="button"
                onClick={copyKey}
                className="mt-2 rounded border border-primary/50 bg-primary/20 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/30"
              >
                Copiar chave
              </button>
            </>
          ) : (
            <p className="text-sm text-foreground/70">
              Em instantes sua chave aparecerá aqui. Guarde-a em lugar seguro.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            const loc = (globalThis as { location?: { href: string } }).location;
            if (loc) loc.href = "/";
          }}
          className="w-full rounded-lg bg-primary py-3 font-medium text-black hover:bg-primary-hover"
        >
          Ir para o app
        </button>
      </div>
    );
  }

  if (mode === "create") {
    return (
      <form onSubmit={handleCreateAccount} className="space-y-4">
        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}
        <label className="block text-sm font-medium text-foreground/90">
          Seu nome
        </label>
        <input
          type="text"
          required
          minLength={2}
          placeholder="Como quer ser chamado"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground placeholder:text-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setMode("choose"); setError(null); setNome(""); }}
            className="rounded-lg border border-border bg-muted px-4 py-3 text-foreground hover:bg-muted/80"
          >
            Voltar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-lg bg-primary py-3 font-medium text-black hover:bg-primary-hover disabled:opacity-50"
          >
            {loading ? "Criando..." : "Criar conta"}
          </button>
        </div>
      </form>
    );
  }

  if (mode === "enter") {
    return (
      <form onSubmit={handleLogin} className="space-y-4">
        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}
        <label className="block text-sm font-medium text-foreground/90">
          Chave de acesso
        </label>
        <input
          type="password"
          required
          placeholder="Cole sua chave aqui"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="w-full rounded-lg border border-border bg-muted px-4 py-3 font-mono text-foreground placeholder:text-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setMode("choose"); setError(null); setKey(""); }}
            className="rounded-lg border border-border bg-muted px-4 py-3 text-foreground hover:bg-muted/80"
          >
            Voltar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-lg bg-primary py-3 font-medium text-black hover:bg-primary-hover disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={() => setMode("create")}
        className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-black hover:bg-primary-hover"
      >
        Criar conta (só precisa do seu nome)
      </button>
      <button
        type="button"
        onClick={() => setMode("enter")}
        className="w-full rounded-lg border border-border bg-muted px-4 py-3 font-medium text-foreground hover:bg-muted/80"
      >
        Já tenho conta — entrar com minha chave
      </button>
    </div>
  );
}

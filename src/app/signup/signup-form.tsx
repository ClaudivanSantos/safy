"use client";

import { useState } from "react";

export function SignupForm() {
  const [state, setState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState(null);
    setLoading(true);
    const trimmedNome = nome.trim();
    const trimmedPassword = password.trim();

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: trimmedNome,
          senha: trimmedPassword,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        redirect?: string;
      };

      if (!res.ok) {
        setState(data.error ?? "Erro ao criar conta.");
        return;
      }

      const loc = (globalThis as { location?: { href: string } }).location;
      if (loc) loc.href = data.redirect ?? "/";
    } catch (error) {
      setState(error instanceof Error ? error.message : "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="nome"
          className="mb-1 block text-sm font-medium text-foreground"
        >
          Nome de usuário
        </label>
        <input
          id="nome"
          name="nome"
          type="text"
          required
          autoComplete="username"
          minLength={2}
          placeholder="Seu nome de usuário"
          value={nome}
          onChange={(e) =>
            setNome((e.target as unknown as { value: string }).value)
          }
          className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground placeholder:text-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="mb-1 block text-sm font-medium text-foreground"
        >
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={6}
          placeholder="Mínimo 6 caracteres"
          value={password}
          onChange={(e) =>
            setPassword((e.target as unknown as { value: string }).value)
          }
          className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground placeholder:text-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {state && (
        <p className="text-sm text-red-400">{state}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-black transition-colors hover:bg-primary-hover"
      >
        {loading ? "Criando..." : "Criar conta"}
      </button>
    </form>
  );
}

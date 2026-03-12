"use client";

import { useState } from "react";
import Link from "next/link";

type ForgotStep = "token" | "newPassword" | "done";

const inputClass =
  "w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground placeholder:text-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";
const btnPrimary =
  "rounded-lg bg-primary py-3 font-medium text-black hover:bg-primary-hover disabled:opacity-50";
const btnSecondary = "rounded-lg border border-border bg-muted px-4 py-3 text-foreground hover:bg-muted/80";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>("token");
  const [recoveryToken, setRecoveryToken] = useState("");
  const [recoveredNome, setRecoveredNome] = useState("");
  const [newSenha, setNewSenha] = useState("");

  async function handleForgotToken(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: recoveryToken.trim().replace(/\s+/g, "") }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Token inválido.");
        setLoading(false);
        return;
      }
      setRecoveredNome(data.nome ?? "");
      setForgotStep("newPassword");
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao validar token.");
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: recoveryToken.trim().replace(/\s+/g, ""), newPassword: newSenha }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao redefinir senha.");
        setLoading(false);
        return;
      }
      setLoading(false);
      setForgotStep("done");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao redefinir senha.");
      setLoading(false);
    }
  }

  if (forgotStep === "done") {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          Senha alterada com sucesso. Entre com sua nova senha.
        </p>
        <Link href="/login" className={`block w-full text-center ${btnPrimary}`}>
          Ir para entrar
        </Link>
      </div>
    );
  }

  if (forgotStep === "newPassword") {
    return (
      <form onSubmit={handleResetPassword} className="space-y-4">
        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
        )}
        <p className="text-sm text-foreground/90">
          Usuário: <strong>{recoveredNome}</strong>
        </p>
        <label className="block text-sm font-medium text-foreground/90">Nova senha</label>
        <input
          type="password"
          required
          minLength={6}
          placeholder="Mínimo 6 caracteres"
          value={newSenha}
          onChange={(e) => setNewSenha((e.target as unknown as { value: string }).value)}
          className={inputClass}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setForgotStep("token");
              setRecoveredNome("");
              setNewSenha("");
              setError(null);
            }}
            className={btnSecondary}
          >
            Voltar
          </button>
          <button type="submit" disabled={loading} className={`flex-1 ${btnPrimary}`}>
            {loading ? "Salvando..." : "Definir nova senha"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleForgotToken} className="space-y-4">
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      )}
      <p className="text-sm text-foreground/80">
        Informe o token de recuperação que você recebeu ao criar a conta. Em seguida você poderá definir uma nova senha.
      </p>
      <label className="block text-sm font-medium text-foreground/90">Token de recuperação</label>
      <input
        type="password"
        required
        placeholder="Cole seu token aqui"
        value={recoveryToken}
        onChange={(e) => setRecoveryToken((e.target as unknown as { value: string }).value)}
        className={`${inputClass} font-mono`}
      />
      <div className="flex gap-2">
        <Link href="/login" className={btnSecondary}>
          Voltar
        </Link>
        <button type="submit" disabled={loading} className={`flex-1 ${btnPrimary}`}>
          {loading ? "Validando..." : "Continuar"}
        </button>
      </div>
    </form>
  );
}

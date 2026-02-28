"use client";

import { useActionState } from "react";
import { signup } from "../login/actions";

export function SignupForm() {
  const [state, formAction] = useActionState(
    async (_: unknown, formData: FormData) => {
      const result = await signup(formData);
      return result?.error ?? null;
    },
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="nome"
          className="mb-1 block text-sm font-medium text-foreground"
        >
          Nome
        </label>
        <input
          id="nome"
          name="nome"
          type="text"
          required
          autoComplete="name"
          placeholder="Seu nome"
          className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground placeholder:text-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-sm font-medium text-foreground"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="seu@email.com"
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
          className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-foreground placeholder:text-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {state && (
        <p className="text-sm text-red-400">{state}</p>
      )}

      <button
        type="submit"
        className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-black transition-colors hover:bg-primary-hover"
      >
        Criar conta
      </button>
    </form>
  );
}

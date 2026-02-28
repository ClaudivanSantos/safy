import Link from "next/link";

export default function AguardeValidacaoPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <main className="max-w-md space-y-6 text-center">
        <h1 className="text-2xl font-bold text-primary">Conta em validação</h1>
        <p className="text-foreground/80">
          Sua conta ainda não foi validada. Acesse o link que enviamos para o
          seu email para ativar e poder entrar no app.
        </p>
        <p className="text-sm text-foreground/60">
          Se já confirmou o email, faça logout e entre novamente com seu email
          e senha.
        </p>
        <form action="/auth/logout" method="POST">
          <button
            type="submit"
            className="rounded-lg border border-border bg-muted px-4 py-2 text-sm text-foreground hover:bg-muted/80"
          >
            Sair
          </button>
        </form>
        <Link
          href="/login"
          className="inline-block text-sm text-primary hover:underline"
        >
          Ir para o login
        </Link>
      </main>
    </div>
  );
}

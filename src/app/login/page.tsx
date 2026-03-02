import Image from "next/image";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <main className="w-full max-w-sm space-y-8">
        <div className="text-center">
        <Image src="/logo.png" alt="Safy" width={300} height={300} className="mx-auto block rounded" />
          <p className="mt-2 text-sm text-foreground/70">
            Crie sua conta com seu nome e guarde a chave para entrar.
          </p>
        </div>

        {params.message && (
          <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
            {params.message}
          </div>
        )}

        {params.error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {params.error}
          </div>
        )}

        <LoginForm />
      </main>
    </div>
  );
}

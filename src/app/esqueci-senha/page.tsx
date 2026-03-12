import Image from "next/image";
import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function EsqueciSenhaPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <main className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Link href="/login" className="inline-block">
            <Image src="/logo.png" alt="Safy" width={120} height={120} className="mx-auto block rounded" />
          </Link>
          <h1 className="mt-4 text-xl font-semibold text-foreground">Esqueci minha senha</h1>
          <p className="mt-2 text-sm text-foreground/70">
            Informe o token de recuperação e defina uma nova senha.
          </p>
        </div>

        <ForgotPasswordForm />
      </main>
    </div>
  );
}

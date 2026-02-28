import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <main className="flex max-w-md flex-col items-center gap-6 px-8 text-center">
        <h1 className="text-2xl font-bold text-primary">Você está offline</h1>
        <p className="text-foreground/80">
          Conecte-se à internet para continuar usando o Safy App.
        </p>
        <Link
          href="/"
          className="rounded-lg bg-primary px-6 py-3 font-medium text-black transition-colors hover:bg-primary-hover"
        >
          Tentar novamente
        </Link>
      </main>
    </div>
  );
}

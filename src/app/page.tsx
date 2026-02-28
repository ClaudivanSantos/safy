import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center font-sans">
      <main className="flex max-w-3xl flex-col items-center gap-12 px-8 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary md:text-5xl">
          Safy App
        </h1>
        <p className="max-w-md text-lg text-foreground/80">
          PWA com Next.js, TypeScript e Tailwind CSS. Tema dark com verde e roxo.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/preco-medio"
            className="rounded-lg bg-primary px-6 py-3 font-medium text-black transition-colors hover:bg-primary-hover"
          >
            Preço Médio
          </Link>
          <Link
            href="/api/health"
            className="rounded-lg border border-border bg-muted px-6 py-3 font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            Testar API
          </Link>
          <Link
            href="https://nextjs.org/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-border bg-muted px-6 py-3 font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            Documentação
          </Link>
        </div>
      </main>
    </div>
  );
}

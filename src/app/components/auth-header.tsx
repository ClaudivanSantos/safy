import Link from "next/link";
import Image from "next/image";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserMenu } from "./user-menu";

export async function AuthHeader() {
  const session = await getSession();
  let userName: string | null = null;
  if (session?.sub) {
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
    });
    userName = (user as { nome?: string } | null)?.nome ?? null;
  }

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex shrink-0 items-center">
          <Image src="/logo.png" alt="Safy" width={120} height={100} className="rounded" />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/preco-medio"
            className="rounded-md px-3 py-2 text-sm font-medium text-foreground/90 transition-colors hover:bg-muted hover:text-primary"
          >
            Preço Médio
          </Link>
          <Link
            href="/pools-liquidez"
            className="rounded-md px-3 py-2 text-sm font-medium text-foreground/90 transition-colors hover:bg-muted hover:text-primary"
          >
            Pools
          </Link>
          <Link
            href="/saude-defi"
            className="rounded-md px-3 py-2 text-sm font-medium text-foreground/90 transition-colors hover:bg-muted hover:text-primary"
          >
            Saúde DeFi (Aave)
          </Link>
        </nav>
        <div className="flex shrink-0 items-center">
          {session ? (
            <UserMenu userName={userName} />
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium text-primary hover:text-primary-hover"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

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
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-primary">
          <Image src="/logo.png" alt="Safy" width={100} height={100}/>
        </Link>
        <nav className="flex items-center gap-4">
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
        </nav>
      </div>
    </header>
  );
}

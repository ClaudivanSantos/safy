import Link from "next/link";
import Image from "next/image";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { HeaderNav } from "./header-nav";
import { HeaderRight } from "./header-right";

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
    <header className="fixed left-0 right-0 top-0 z-50 h-12 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-full max-w-4xl items-center justify-between gap-2 px-3 sm:px-4">
        <Link href="/" className="flex shrink-0 items-center">
          <Image
            src="/logo.png"
            alt="Safy"
            width={72}
            height={28}
            className="h-7 w-auto rounded object-contain sm:h-8 sm:w-20"
          />
        </Link>
        <HeaderNav />
        <HeaderRight session={!!session} userName={userName} />
      </div>
    </header>
  );
}

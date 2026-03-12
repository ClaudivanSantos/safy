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
      <div className="mx-auto flex h-full max-w-4xl flex-nowrap items-center justify-between gap-0 pl-0 pr-3 sm:gap-2 sm:px-4">
        <HeaderNav />
        <Link href="/" className="order-2 flex shrink-0 items-center md:order-1">
          <Image
            src="/logo.png"
            alt="Safy"
            width={120}
            height={120}
            className="h-10 w-auto rounded object-contain sm:h-11 sm:w-28"
          />
        </Link>
        <div className="order-3 ml-2 shrink-0 sm:ml-0">
          <HeaderRight session={!!session} userName={userName} />
        </div>
      </div>
    </header>
  );
}

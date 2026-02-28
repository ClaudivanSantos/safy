import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export async function ValidacaoGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (pathname === "/aguarde-validacao") return <>{children}</>;

  const session = await getSession();
  if (!session?.sub) return <>{children}</>;

  const dbUser = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { validado: true },
  });
  if (dbUser && !dbUser.validado) {
    redirect("/aguarde-validacao");
  }

  return <>{children}</>;
}

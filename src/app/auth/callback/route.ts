import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=Erro ao confirmar email`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  if (!data.user) {
    return NextResponse.redirect(`${origin}/login?error=Erro ao confirmar email`);
  }

  const { id: authId, email } = data.user;
  const nomeMeta = (data.user.user_metadata?.nome as string) ?? "";

  try {
    await prisma.user.upsert({
      where: { auth_id: authId },
      create: {
        auth_id: authId,
        email: email ?? undefined,
        nome: nomeMeta || (email?.split("@")[0] ?? ""),
        validado: true,
      },
      update: {
        email: email ?? undefined,
        nome: nomeMeta || undefined,
        validado: true,
      },
    });
  } catch {
    // Sessão foi criada; usuário não foi salvo no banco. Redireciona para login
    // para que, ao entrar, o usuário seja criado/atualizado.
    const msg = encodeURIComponent(
      "Conta confirmada. Entre com seu email e senha para continuar."
    );
    return NextResponse.redirect(`${origin}/login?message=${msg}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}

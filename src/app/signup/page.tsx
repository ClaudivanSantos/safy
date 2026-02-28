import { redirect } from "next/navigation";

export default function SignupPage() {
  redirect("/login?message=" + encodeURIComponent("Use o botão abaixo para entrar com Nostr. Não é necessário criar conta."));
}

import { getSession } from "@/lib/auth";
import { getPurchases } from "./actions";
import PrecoMedioClient from "./preco-medio-client";

export default async function PrecoMedioPage() {
  const [session, { data: initialPurchases }] = await Promise.all([
    getSession(),
    getPurchases(),
  ]);
  const isLoggedIn = !!session?.sub;
  return (
    <PrecoMedioClient
      initialPurchases={initialPurchases}
      isLoggedIn={isLoggedIn}
    />
  );
}

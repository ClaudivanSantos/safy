import { getPurchases } from "./actions";
import PrecoMedioClient from "./preco-medio-client";

export default async function PrecoMedioPage() {
  const { data: initialPurchases } = await getPurchases();
  return <PrecoMedioClient initialPurchases={initialPurchases} />;
}

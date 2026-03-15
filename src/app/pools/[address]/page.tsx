import PoolsClient from "../pools-client";

type Props = {
  params: Promise<{ address: string }>;
};

export default async function PoolsAddressPage({ params }: Props) {
  const { address } = await params;
  const decoded = decodeURIComponent(address);
  return <PoolsClient initialAddress={decoded} />;
}

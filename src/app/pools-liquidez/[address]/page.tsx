import PoolsLiquidezClient from "../pools-liquidez-client";

type Props = {
  params: Promise<{ address: string }>;
};

export default async function PoolsLiquidezAddressPage({ params }: Props) {
  const { address } = await params;
  const decoded = decodeURIComponent(address);
  return <PoolsLiquidezClient initialAddress={decoded} />;
}

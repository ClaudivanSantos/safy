import AaveClient from "../aave-client";

type Props = {
  params: Promise<{ address: string }>;
};

export default async function AaveAddressPage({ params }: Props) {
  const { address } = await params;
  const decoded = decodeURIComponent(address);
  return <AaveClient initialAddress={decoded} />;
}

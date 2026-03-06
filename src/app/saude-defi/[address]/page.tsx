import SaudeDefiClient from "../saude-defi-client";

type Props = {
  params: Promise<{ address: string }>;
};

export default async function SaudeDefiAddressPage({ params }: Props) {
  const { address } = await params;
  const decoded = decodeURIComponent(address);
  return <SaudeDefiClient initialAddress={decoded} />;
}

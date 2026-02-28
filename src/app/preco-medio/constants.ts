// Apenas criptomoedas mais populares
export const MOEDAS = [
  { value: "BTC", label: "Bitcoin (BTC)" },
  { value: "ETH", label: "Ethereum (ETH)" },
  { value: "SOL", label: "Solana (SOL)" },
  { value: "BNB", label: "BNB (BNB)" },
  { value: "XRP", label: "XRP (XRP)" },
  { value: "ADA", label: "Cardano (ADA)" },
  { value: "DOGE", label: "Dogecoin (DOGE)" },
  { value: "AVAX", label: "Avalanche (AVAX)" },
] as const;

export type MoedaCode = (typeof MOEDAS)[number]["value"];

export interface PurchaseRow {
  id: string;
  currency: string;
  preco: number;
  quantidade: number;
  created_at: Date;
}

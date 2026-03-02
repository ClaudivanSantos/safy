"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DonationModal } from "./components/donation-modal";
import { Footer } from "./components/footer";
import Image from "next/image";

const STORAGE_KEY = "safy-donation-modal-seen";

export function HomeClient() {
  const [donationOpen, setDonationOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const timer = setTimeout(() => {
      try {
        const seen = (globalThis as unknown as { localStorage?: { getItem: (k: string) => string | null } }).localStorage?.getItem(STORAGE_KEY);
        if (!seen) setDonationOpen(true);
      } catch {
        // localStorage indisponível (ex: modo privado)
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [mounted]);

  const handleCloseModal = () => {
    setDonationOpen(false);
    try {
      (globalThis as unknown as { localStorage?: { setItem: (k: string, v: string) => void } }).localStorage?.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  };

  return (
    <>
      <div className="flex min-h-full flex-col">
        <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          <div className="mx-auto max-w-2xl text-center">
          <Image src="/logo.png" alt="Safy" width={300} height={300} className="mx-auto block rounded" />
            <p className="mt-4 text-lg font-medium text-foreground md:text-xl">
              Ferramenta gratuita para decisões mais seguras em DeFi.
            </p>
            <p className="mt-6 text-foreground/80">
              Calculadora de preço médio, análise de pools de liquidez e
              monitoramento de saúde em protocolos Aave — tudo em um só lugar
              para você tomar decisões informadas.
            </p>
            
          </div>
        </main>
        <Footer onDonateClick={() => setDonationOpen(true)} />
      </div>
      <DonationModal open={donationOpen} onClose={handleCloseModal} />
    </>
  );
}

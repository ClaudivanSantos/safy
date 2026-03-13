"use client";

import Link from "next/link";
import { useState } from "react";
import { useWallet, shortAddress } from "@/app/contexts/wallet-context";
import { UserMenu } from "./user-menu";
import { DonationModal } from "./donation-modal";

function WalletIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </svg>
  );
}

type HeaderRightProps = {
  session: boolean;
  userName: string | null;
};

export function HeaderRight({ session, userName }: HeaderRightProps) {
  const [donationOpen, setDonationOpen] = useState(false);
  const { address, connecting, connectWallet, disconnectWallet } = useWallet();

  return (
    <>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={() => setDonationOpen(true)}
          className="rounded-md p-1.5 font-medium text-foreground/90 transition-colors hover:bg-muted hover:text-primary sm:px-2 sm:py-1.5 sm:text-xs animate-[coffee-glow_2.5s_ease-in-out_infinite]"
          title="Apoiar o projeto"
        >
          <span className="sm:hidden">☕</span>
          <span className="hidden sm:inline">☕ Doar</span>
        </button>
        {address ? (
          <div className="flex items-center gap-1 sm:gap-2">
            <span
              className="max-w-[72px] truncate rounded border border-border bg-muted/50 px-1.5 py-1 font-mono text-[10px] text-foreground sm:max-w-none sm:px-2 sm:py-1.5 sm:text-xs"
              title={address}
            >
              {shortAddress(address)}
            </span>
            <button
              type="button"
              onClick={disconnectWallet}
              className="rounded border border-border bg-muted/50 px-1.5 py-1 text-[10px] font-medium text-foreground hover:bg-muted sm:px-2 sm:py-1.5 sm:text-xs"
            >
              <span className="sm:hidden">Sair</span>
              <span className="hidden sm:inline">Desconectar</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={connectWallet}
            disabled={connecting}
            className="flex items-center gap-1.5 rounded border border-border bg-muted/50 px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 sm:px-3 sm:py-2 sm:text-sm"
            title="Conectar carteira"
          >
            <WalletIcon className="h-4 w-4 shrink-0 sm:h-4 sm:w-4" />
            {connecting ? "…" : <span>Conectar</span>}
          </button>
        )}
        {session ? (
          <UserMenu userName={userName} />
        ) : (
          <Link
            href="/login"
            className="rounded bg-primary px-2 py-1.5 text-xs font-medium text-black hover:bg-primary-hover sm:px-3 sm:py-2 sm:text-sm"
          >
            Entrar
          </Link>
        )}
      </div>
      <DonationModal open={donationOpen} onClose={() => setDonationOpen(false)} />
    </>
  );
}

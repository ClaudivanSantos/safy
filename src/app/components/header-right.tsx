"use client";

import Link from "next/link";
import { useState } from "react";
import { useWallet, shortAddress } from "@/app/contexts/wallet-context";
import { UserMenu } from "./user-menu";
import { DonationModal } from "./donation-modal";

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
          className="rounded-md p-1.5 font-medium text-foreground/90 transition-colors hover:bg-muted hover:text-primary sm:px-2.5 sm:py-2 sm:text-sm animate-[coffee-glow_2.5s_ease-in-out_infinite]"
          title="Apoiar o projeto"
        >
          <span className="sm:hidden">☕</span>
          <span className="hidden sm:inline">☕ Buy me a coffee</span>
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
            className="rounded border border-border bg-muted/50 px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 sm:px-3 sm:py-2 sm:text-sm"
          >
            {connecting ? "…" : <><span className="sm:hidden">Carteira</span><span className="hidden sm:inline">Conectar carteira</span></>}
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

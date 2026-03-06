"use client";

import { useEffect, useCallback, useState } from "react";

type Doc = {
  addEventListener: (type: string, handler: EventListener) => void;
  removeEventListener: (type: string, handler: EventListener) => void;
  body: { style: { overflow: string } };
};

const DONATION_ADDRESSES = {
  lightning:
    process.env.NEXT_PUBLIC_DONATION_LIGHTNING || "safy@getalby.com",
  btc:
    process.env.NEXT_PUBLIC_DONATION_BTC ||
    "bc1qxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  evm:
    process.env.NEXT_PUBLIC_DONATION_EVM ||
    "0x0000000000000000000000000000000000000000",
};

export function DonationModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      const nav = navigator as { clipboard?: { writeText: (t: string) => Promise<void> } };
      if (nav.clipboard) {
        await nav.clipboard.writeText(text);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const doc: Doc | null =
      typeof globalThis !== "undefined"
        ? (globalThis as unknown as { document?: Doc }).document ?? null
        : null;
    const handleEscape = (e: { key: string }) => {
      if (e.key === "Escape") onClose();
    };
    if (open && doc) {
      doc.addEventListener("keydown", handleEscape as unknown as EventListener);
      doc.body.style.overflow = "hidden";
    }
    return () => {
      if (doc) {
        doc.removeEventListener("keydown", handleEscape as unknown as EventListener);
        doc.body.style.overflow = "";
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="donation-modal-title"
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="donation-modal-title" className="text-lg font-semibold text-foreground">
            Apoiar o Safy
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-foreground/70 hover:bg-muted hover:text-foreground"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <p className="mb-4 text-sm text-foreground/80">
          Escolha como deseja contribuir:
        </p>
        <div className="space-y-4">
          <DonationOption
            label="Lightning (BTC)"
            description="Rede Lightning — instantâneo e com taxas baixas"
            value={DONATION_ADDRESSES.lightning}
            onCopy={copyToClipboard}
          />
          <DonationOption
            label="Bitcoin (on-chain)"
            description="Endereço BTC nativo"
            value={DONATION_ADDRESSES.btc}
            onCopy={copyToClipboard}
          />
          <DonationOption
            label="EVM (ETH, MATIC, etc.)"
            description="Ethereum, Polygon e outras redes compatíveis"
            value={DONATION_ADDRESSES.evm}
            onCopy={copyToClipboard}
          />
        </div>
      </div>
    </div>
  );
}

function DonationOption({
  label,
  description,
  value,
  onCopy,
}: {
  label: string;
  description: string;
  value: string;
  onCopy: (text: string) => Promise<boolean>;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await onCopy(value);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-muted/50 p-3">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="mb-2 text-xs text-foreground/60">{description}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded bg-background px-2 py-1.5 text-xs text-foreground/90">
          {value}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded bg-primary px-3 py-1.5 text-xs font-medium text-black hover:bg-primary-hover"
        >
          {copied ? "Copiado!" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

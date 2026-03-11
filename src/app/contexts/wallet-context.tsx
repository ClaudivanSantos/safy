"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { isAddress } from "viem";
import { BrowserProvider } from "ethers";

const WALLET_STORAGE_KEY = "safy-wallet";

function getStoredWallet(): string | null {
  if (typeof globalThis === "undefined") return null;
  try {
    const g = globalThis as unknown as { sessionStorage?: { getItem(key: string): string | null } };
    const s = g.sessionStorage?.getItem(WALLET_STORAGE_KEY);
    return s && isAddress(s) ? s : null;
  } catch {
    return null;
  }
}

function setStoredWallet(address: string | null): void {
  try {
    const g = globalThis as unknown as { sessionStorage?: { setItem(key: string, v: string): void; removeItem(key: string): void } };
    if (address) g.sessionStorage?.setItem(WALLET_STORAGE_KEY, address);
    else g.sessionStorage?.removeItem(WALLET_STORAGE_KEY);
  } catch {
    // ignore
  }
}

type WalletContextValue = {
  address: string | null;
  connecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const connectWallet = useCallback(async () => {
    const g = typeof globalThis !== "undefined" ? (globalThis as unknown as { ethereum?: unknown }) : undefined;
    const eth = g?.ethereum as
      | { request: (args: { method: string }) => Promise<string[]> }
      | undefined;
    if (!eth) return;
    setConnecting(true);
    try {
      const provider = new BrowserProvider(eth);
      const accounts = await provider.send("eth_requestAccounts", []);
      const account = accounts?.[0];
      if (account && isAddress(account)) {
        setAddress(account);
        setStoredWallet(account);
      }
    } catch {
      // Não exibir erro ao usuário
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setAddress(null);
    setStoredWallet(null);
  }, []);

  useEffect(() => {
    setAddress(getStoredWallet());
  }, []);

  return (
    <WalletContext.Provider
      value={{ address, connecting, connectWallet, disconnectWallet }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    return {
      address: null,
      connecting: false,
      connectWallet: async () => {},
      disconnectWallet: () => {},
    };
  }
  return ctx;
}

export function shortAddress(addr: string): string {
  if (addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

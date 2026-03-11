import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SerwistProvider } from "./serwist";
import { AuthHeader } from "./components/auth-header";
import { ValidacaoGuard } from "./components/validacao-guard";
import { WalletProvider } from "./contexts/wallet-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Safy",
  description: "Ferramenta gratuita para decisões mais seguras em DeFi.",
  applicationName: "Safy",
  icons: {
    icon: "/logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Safy",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        <SerwistProvider swUrl="/serwist/sw.js">
          <WalletProvider>
            <AuthHeader />
            <ValidacaoGuard>
              <div className="flex h-screen flex-col overflow-hidden pt-12">
                <main className="min-h-0 flex-1 overflow-auto">{children}</main>
              </div>
            </ValidacaoGuard>
          </WalletProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}

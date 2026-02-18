import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import "@/app/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Ledgera",
  description: "Gestione spese familiare",
};

// Evita pre-render statico: le pagine usano Supabase e le env vars sono lette a runtime
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className={`${inter.className} antialiased`}>
        <AppShell>{children}</AppShell>
        <Toaster />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Next-Gen ERP | Gestão Empresarial",
  description: "ERP revolucionário para Portugal e Angola. Faturação, contabilidade e gestão de stock num só lugar.",
  keywords: ["ERP", "Faturação", "Contabilidade", "Portugal", "Angola", "Gestão Empresarial"],
  authors: [{ name: "Next-Gen ERP Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Next-Gen ERP",
    description: "ERP revolucionário para Portugal e Angola",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}

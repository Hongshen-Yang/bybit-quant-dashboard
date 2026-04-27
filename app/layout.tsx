import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AutoRefresh } from "./components/AutoRefresh";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bybit Quant Dashboard",
  description: "Track Bybit portfolio, orders, and trading activity at a glance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AutoRefresh />
        {children}
      </body>
    </html>
  );
}

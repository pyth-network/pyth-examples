// src/app/layout.tsx
import type { Metadata } from "next";
import "@/styles/globals.css";
import { BackgroundCanvas } from "@/components/bg/BackgroundCanvas";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Entropy Arcade – Home",
  description:
    "Provably-random arcade modes powered by on-chain entropy (Pyth) for fair staking and high replayability.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="js-anim">
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=eudoxus-sans@400,500,600,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="overflow-x-hidden">
        {/* Starry background */}
        <BackgroundCanvas />

        {/* Web3 + React Query providers wrap the app */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

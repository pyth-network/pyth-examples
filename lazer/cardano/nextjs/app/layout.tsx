import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Iron Pig · Rule-based savings on Cardano",
  description:
    "Lock ADA until your USD goal is met. Oracle-priced on Pyth, enforced on-chain — no exceptions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600&family=DM+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-cream font-body antialiased">
        {children}
      </body>
    </html>
  );
}

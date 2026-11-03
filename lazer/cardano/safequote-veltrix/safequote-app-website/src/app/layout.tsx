import type { Metadata } from "next";
import "./globals.scss";

export const metadata: Metadata = {
  metadataBase: new URL("https://safequote.local"),
  title: {
    default: "SafeQuote",
    template: "%s | SafeQuote",
  },
  description:
    "USD invoicing with ADA payments and on-chain price verification powered by Pyth Network.",
  applicationName: "SafeQuote",
  keywords: ["Cardano", "Aiken", "Pyth", "ADA", "Invoices", "MeshJS"],
  authors: [{ name: "Veltrix Team" }],
  creator: "Veltrix Team",
  publisher: "Veltrix Team",
  appleWebApp: {
    title: "SafeQuote",
  },
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
  openGraph: {
    title: "SafeQuote",
    description:
      "Get paid in ADA while invoicing in USD with on-chain verified pricing from Pyth.",
    url: "https://safequote.local",
    siteName: "SafeQuote",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SafeQuote",
    description:
      "Get paid in ADA while invoicing in USD with on-chain verified pricing from Pyth.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}


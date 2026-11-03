import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GUARDS | Treasury Autopilot",
  description:
    "Oracle-aware treasury policy enforcement. Protect your DAO treasury with automated risk management.",
  icons: {
    icon: "/guards-icon.svg",
    shortcut: "/guards-icon.svg",
    apple: "/guards-icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}

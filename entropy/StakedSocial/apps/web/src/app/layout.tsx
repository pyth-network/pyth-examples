import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

import { TopBar } from '@/components/topbar';
import Providers from "@/components/providers"

// Suppress XMTP logs
if (typeof window !== 'undefined') {
  const originalWarn = console.warn;
  const originalLog = console.log;
  const originalInfo = console.info;

  console.warn = (...args: any[]) => {
    const msg = args[0]?.toString?.() || '';
    if (!msg.includes('xmtp') && !msg.includes('INFO') && !msg.includes('sync')) {
      originalWarn(...args);
    }
  };

  console.log = (...args: any[]) => {
    const msg = args[0]?.toString?.() || '';
    if (!msg.includes('xmtp') && !msg.includes('INFO') && !msg.includes('sync')) {
      originalLog(...args);
    }
  };

  console.info = (...args: any[]) => {
    const msg = args[0]?.toString?.() || '';
    if (!msg.includes('xmtp') && !msg.includes('INFO') && !msg.includes('sync')) {
      originalInfo(...args);
    }
  };
}

const inter = Inter({ subsets: ['latin'] });

const appUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

// Embed metadata for Farcaster sharing
const frame = {
  version: "1",
  imageUrl: `${appUrl}/opengraph-image.png`,
  button: {
    title: "Launch my-celo-app",
    action: {
      type: "launch_frame",
      name: "my-celo-app",
      url: appUrl,
      splashImageUrl: `${appUrl}/icon.png`,
      splashBackgroundColor: "#ffffff",
    },
  },
};

export const metadata: Metadata = {
  title: 'my-celo-app',
  description: 'A new Celo blockchain project',
  openGraph: {
    title: 'my-celo-app',
    description: 'A new Celo blockchain project',
    images: [`${appUrl}/opengraph-image.png`],
  },
  other: {
    "fc:frame": JSON.stringify(frame),
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* TopBar is included on all pages */}
        <div className="relative flex min-h-screen flex-col">
          <Providers>
            <TopBar />
            <main className="flex-1">
              {children}
            </main>
          </Providers>
        </div>
      </body>
    </html>
  );
}

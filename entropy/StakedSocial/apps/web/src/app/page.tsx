"use client";
import { useMiniApp } from "@/contexts/miniapp-context";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAccount, useConnect } from "wagmi";

export default function Home() {
  const router = useRouter();
  const { context, isMiniAppReady } = useMiniApp();
  const [isAddingMiniApp, setIsAddingMiniApp] = useState(false);
  const [addMiniAppMessage, setAddMiniAppMessage] = useState<string | null>(null);

  // Wallet connection hooks
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors } = useConnect();

  // Auto-connect wallet when miniapp is ready
  useEffect(() => {
    if (isMiniAppReady && !isConnected && !isConnecting && connectors.length > 0) {
      const farcasterConnector = connectors.find(c => c.id === 'farcaster');
      if (farcasterConnector) {
        connect({ connector: farcasterConnector });
      }
    }
  }, [isMiniAppReady, isConnected, isConnecting, connectors, connect]);

  // Extract user data from context
  const user = context?.user;
  // Use connected wallet address if available, otherwise fall back to user custody/verification
  const walletAddress = address || user?.custody || user?.verifications?.[0] || "0x1e4B...605B";
  const displayName = user?.displayName || user?.username || "User";
  const username = user?.username || "@user";
  const pfpUrl = user?.pfpUrl;
  console.log(walletAddress)

  // Format wallet address to show first 6 and last 4 characters
  const formatAddress = (address: string) => {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Redirect to chats page when ready
  useEffect(() => {
    if (isMiniAppReady) {
      router.push('/chats');
    }
  }, [isMiniAppReady, router]);

  // Loading state
  return (
    <main className="flex-1">
      <section className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-full max-w-md mx-auto p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </section>
    </main>
  );
}

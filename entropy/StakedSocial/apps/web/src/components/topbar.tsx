"use client";

import { useMiniApp } from "@/contexts/miniapp-context";
import { useAccount } from "wagmi";
import { usePathname } from "next/navigation";

export function TopBar() {
  const { context, isMiniAppReady } = useMiniApp();
  const { address, isConnected, isConnecting } = useAccount();
  const pathname = usePathname();

  // Extract user data from context
  const user = context?.user;
  const walletAddress = address || user?.custody || user?.verifications?.[0] || "0x1e4B...605B";
  const displayName = user?.displayName || user?.username || "User";
  const pfpUrl = user?.pfpUrl;

  // Format wallet address to show last 3 digits
  const formatAddressShort = (address: string) => {
    if (!address || address.length < 4) return address;
    return address.slice(-3);
  };

  // Get connection status color
  const getStatusColor = () => {
    if (isConnected) return "bg-green-500";
    if (isConnecting) return "bg-yellow-500";
    return "bg-gray-400";
  };

  if (!isMiniAppReady) {
    return null;
  }

  // Hide TopBar when inside a chat (but show on the chats list page)
  const isInChat = pathname.startsWith('/chats/') && pathname !== '/chats';
  if (isInChat) {
    return null;
  }

  return (
    <div className="fixed top-0 right-0 z-50 p-4">
      <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-3">
        {/* Status Indicator Dot */}
        <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor()} animate-pulse`}></div>

        {/* User Name */}
        <span className="text-sm font-medium text-white hidden sm:inline">
          {displayName}
        </span>

        {/* Wallet Address Last 3 Digits */}
        <span className="text-xs font-mono text-gray-300">
          {formatAddressShort(walletAddress)}
        </span>

        {/* Profile Picture */}
        <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center border border-white/30">
          {pfpUrl ? (
            <img
              src={pfpUrl}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useMiniApp } from "@/contexts/miniapp-context";

export default function ProfilePage() {
  const { context, isMiniAppReady } = useMiniApp();
  const [walletAddress, setWalletAddress] = useState("");

  // Extract user data from context
  const user = context?.user;
  const username = user?.username || "@user";
  const pfp = user?.pfpUrl || "";

  // Fetch wallet address
  useEffect(() => {
    const fetchUserData = async () => {
      if (!username) return;

      try {
        const response = await fetch(`https://maia-api.ngrok-free.dev/user?username=${username.replace('@', '')}`);
        const userData = await response.json();
        if (userData?.wallet_address) {
          setWalletAddress(userData.wallet_address);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    if (isMiniAppReady && username) {
      fetchUserData();
    }
  }, [isMiniAppReady, username]);

  if (!isMiniAppReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pt-20 pb-24">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Profile</h1>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header Background */}
          <div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-600"></div>

          {/* Profile Info */}
          <div className="relative px-6 pb-6">
            {/* Avatar */}
            <div className="absolute -top-16 left-6">
              {pfp ? (
                <img
                  src={pfp}
                  alt={username}
                  className="w-32 h-32 rounded-2xl border-4 border-white object-cover shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 rounded-2xl border-4 border-white bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                  {username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="pt-20">
              <h2 className="text-xl font-bold text-gray-900 mb-1">{username}</h2>

              <div className="space-y-4 mt-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Wallet Address</p>
                  <p className="text-sm font-mono text-gray-900 break-all">
                    {walletAddress || "Loading..."}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Username</p>
                  <p className="text-sm text-gray-900">{username}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

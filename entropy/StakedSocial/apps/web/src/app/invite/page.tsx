"use client";

import { useMiniApp } from "@/contexts/miniapp-context";
import { InviteFriends } from "@/components/invite-friends";

export default function InvitePage() {
  const { context, isMiniAppReady } = useMiniApp();
  const user = context?.user;
  const username = user?.username || "@user";

  if (!isMiniAppReady) {
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

  return <InviteFriends username={username} context={context} />;
}

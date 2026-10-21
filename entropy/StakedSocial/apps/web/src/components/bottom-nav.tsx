"use client";

import { usePathname, useRouter } from "next/navigation";
import { MessageCircle, TrendingUp, User } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  // Hide bottom nav inside individual chats
  if (pathname.startsWith("/chats/") && pathname !== "/chats") {
    return null;
  }

  const isActive = (path: string) => {
    if (path === "/chats") {
      return pathname === "/chats" || pathname.startsWith("/chats/");
    }
    return pathname === path;
  };

  const navItems = [
    {
      label: "Chats",
      path: "/chats",
      icon: MessageCircle,
    },
    {
      label: "Bets",
      path: "/bets",
      icon: TrendingUp,
    },
    {
      label: "Profile",
      path: "/profile",
      icon: User,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-100 shadow-2xl">
      <div className="flex items-center justify-around max-w-2xl mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`relative flex flex-col items-center gap-1.5 py-3 px-6 transition-all duration-300 group ${
                active ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {/* Active indicator bar */}
              {active && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-t-full"></div>
              )}

              {/* Icon with background */}
              <div
                className={`p-2 rounded-xl transition-all duration-300 ${
                  active
                    ? "bg-blue-100"
                    : "bg-transparent group-hover:bg-gray-100"
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-all duration-300 ${
                    active ? "text-blue-600 scale-110" : "text-gray-400 group-hover:text-gray-600"
                  }`}
                />
              </div>

              {/* Label */}
              <span
                className={`text-xs font-semibold transition-all duration-300 ${
                  active ? "text-blue-600" : "text-gray-500 group-hover:text-gray-600"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

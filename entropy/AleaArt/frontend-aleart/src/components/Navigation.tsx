'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (!session) {
    return null;
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '🎨' },
    { href: '/profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <nav className="bg-white/10 backdrop-blur-sm border-b border-white/20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/dashboard" className="text-2xl font-bold text-white">
            🎨 AleaArt
          </Link>
          
          <div className="flex items-center space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  pathname === item.href
                    ? 'bg-white/20 text-white'
                    : 'text-blue-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}


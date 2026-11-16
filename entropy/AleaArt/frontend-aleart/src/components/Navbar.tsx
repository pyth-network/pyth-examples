'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';

export default function Navbar() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [userAddress, setUserAddress] = useState<string>('');

  const checkWalletConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setUserAddress(address);
        setWalletConnected(true);
      } catch (error) {
        console.log('Wallet not connected');
      }
    }
  };

  useEffect(() => {
    setTimeout(() => {
      checkWalletConnection();
    }, 0);
  }, []);

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask!');
      return;
    }

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x66eee' }],
      });
      
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setUserAddress(address);
      setWalletConnected(true);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet. Please make sure you\'re on Arbitrum Sepolia network.');
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <nav className="bg-black/90 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-6">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-white" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800 }}>
            AleaArt
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-12">
            <Link 
              href="/dashboard" 
              className={`px-4 py-2 rounded-lg transition-colors ${
                pathname === '/dashboard' 
                  ? 'bg-yellow-400 text-black' 
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
              style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
            >
              Dashboard
            </Link>
            <Link 
              href="/marketplace" 
              className={`px-4 py-2 rounded-lg transition-colors ${
                pathname === '/marketplace' 
                  ? 'bg-yellow-400 text-black' 
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
              style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
            >
              Marketplace
            </Link>
            
            <div className="flex items-center space-x-4">
              {/* Wallet Connection */}
              {!walletConnected ? (
                <button
                  onClick={connectWallet}
                  className="border border-yellow-400 text-yellow-400 px-4 py-2 rounded hover:bg-yellow-400 hover:text-black transition-colors"
                  style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
                >
                  Connect Wallet
                </button>
              ) : (
                <div className="bg-gray-800 rounded-lg px-4 py-2 border border-gray-600">
                  <p className="text-white text-sm" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
                    {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
                  </p>
                </div>
              )}

              {/* User Authentication */}
              {session ? (
                <>
                  <span className="text-gray-300" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
                    Welcome, {session.user?.name}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="border border-gray-600 text-gray-300 px-4 py-2 rounded hover:border-yellow-400 hover:text-yellow-400 transition-colors"
                    style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    href="/login"
                    className="text-gray-300 hover:text-white transition-colors"
                    style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
                  >
                    Login
                  </Link>
                  <Link 
                    href="/signup"
                    className="border border-yellow-400 text-yellow-400 px-4 py-2 rounded hover:bg-yellow-400 hover:text-black transition-colors"
                    style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-6 border-t border-gray-800">
            <div className="flex flex-col space-y-6">
              <Link 
                href="/dashboard" 
                className={`px-4 py-3 rounded-lg transition-colors ${
                  pathname === '/dashboard' 
                    ? 'bg-yellow-400 text-black' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
                style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link 
                href="/marketplace" 
                className={`px-4 py-3 rounded-lg transition-colors ${
                  pathname === '/marketplace' 
                    ? 'bg-yellow-400 text-black' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
                style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
                onClick={() => setIsMenuOpen(false)}
              >
                Marketplace
              </Link>
              
              {session ? (
                <div className="flex flex-col space-y-2">
                  <span className="text-gray-300" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
                    Welcome, {session.user?.name}
                  </span>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setIsMenuOpen(false);
                    }}
                    className="border border-yellow-400 text-yellow-400 px-4 py-2 rounded hover:bg-yellow-400 hover:text-black transition-colors text-left"
                    style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex flex-col space-y-2">
                  <Link 
                    href="/login"
                    className="text-gray-300 hover:text-white transition-colors"
                    style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link 
                    href="/signup"
                    className="border border-yellow-400 text-yellow-400 px-4 py-2 rounded hover:bg-yellow-400 hover:text-black transition-colors text-left"
                    style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

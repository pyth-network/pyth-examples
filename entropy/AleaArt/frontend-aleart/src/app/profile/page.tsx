'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArtToken } from '@/types';

interface ProfileArtTokenCardProps {
  token: ArtToken;
}

function ProfileArtTokenCard({ token }: ProfileArtTokenCardProps) {
  const [parameters, setParameters] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadParameters = async () => {
    if (parameters) return; // Already loaded
    
    setLoading(true);
    
    try {
      // This would need to be implemented similar to dashboard
      // For now, we'll just show the token ID
      setParameters({ loaded: true });
    } catch (err) {
      console.error('Failed to load parameters');
    } finally {
      setLoading(false);
    }
  };

  return (
    <tr className="border-b border-white/10">
      <td className="py-3 px-4 font-medium">#{token.tokenId}</td>
      <td className="py-3 px-4">
        {!parameters ? (
          <button
            onClick={loadParameters}
            disabled={loading}
            className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
          >
            {loading ? 'Loading...' : 'Load'}
          </button>
        ) : (
          'Loaded'
        )}
      </td>
      <td className="py-3 px-4">-</td>
      <td className="py-3 px-4">-</td>
      <td className="py-3 px-4">-</td>
      <td className="py-3 px-4">-</td>
      <td className="py-3 px-4">-</td>
      <td className="py-3 px-4 text-blue-200">
        {new Date(token.createdAt).toLocaleDateString()}
      </td>
    </tr>
  );
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [artTokens, setArtTokens] = useState<ArtToken[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchArtTokens();
    }
  }, [session]);

  const fetchArtTokens = async () => {
    try {
      const response = await fetch('/api/art-tokens');
      if (response.ok) {
        const data = await response.json();
        setArtTokens(data.artTokens || []);
      }
    } catch (error) {
      console.error('Failed to fetch art tokens:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-800">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">👤 Profile</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => signOut()}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* User Info */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h2 className="text-2xl font-semibold text-white mb-4">👤 User Information</h2>
            <div className="space-y-3">
              <div>
                <span className="text-blue-200">Name:</span>
                <p className="text-white font-medium">{session?.user?.name}</p>
              </div>
              <div>
                <span className="text-blue-200">Email:</span>
                <p className="text-white font-medium">{session?.user?.email}</p>
              </div>
              <div>
                <span className="text-blue-200">Wallet:</span>
                <p className="text-white font-medium break-all">
                  {session?.user?.walletAddress || 'Not connected'}
                </p>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h2 className="text-2xl font-semibold text-white mb-4">📊 Statistics</h2>
            <div className="space-y-3">
              <div>
                <span className="text-blue-200">Total Art Tokens:</span>
                <p className="text-white font-medium text-2xl">{artTokens.length}</p>
              </div>
              <div>
                <span className="text-blue-200">First Generation:</span>
                <p className="text-white font-medium">
                  {artTokens.length > 0 
                    ? new Date(artTokens[artTokens.length - 1].createdAt).toLocaleDateString()
                    : 'None'
                  }
                </p>
              </div>
              <div>
                <span className="text-blue-200">Latest Generation:</span>
                <p className="text-white font-medium">
                  {artTokens.length > 0 
                    ? new Date(artTokens[0].createdAt).toLocaleDateString()
                    : 'None'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h2 className="text-2xl font-semibold text-white mb-4">⚡ Quick Actions</h2>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full bg-purple-500 text-white py-2 rounded-lg hover:bg-purple-600 transition-colors"
              >
                Generate New Art
              </button>
              <button
                onClick={() => window.open('https://sepolia.arbiscan.io/', '_blank')}
                className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                View on Arbiscan
              </button>
            </div>
          </div>
        </div>

        {/* Art Tokens History */}
        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-white mb-6">🎨 Art Tokens History</h2>
          {artTokens.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 text-center">
              <p className="text-blue-200 text-lg">No art tokens generated yet</p>
              <p className="text-blue-300 text-sm mt-2">Visit the dashboard to generate your first art parameters!</p>
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-white">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-3 px-4">Token ID</th>
                      <th className="text-left py-3 px-4">Prompt</th>
                      <th className="text-left py-3 px-4">Style</th>
                      <th className="text-left py-3 px-4">Sampler</th>
                      <th className="text-left py-3 px-4">Steps</th>
                      <th className="text-left py-3 px-4">CFG</th>
                      <th className="text-left py-3 px-4">Palette</th>
                      <th className="text-left py-3 px-4">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {artTokens.map((token, index) => (
                      <ProfileArtTokenCard key={index} token={token} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      {/* Paint-like background elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Large colorful splashes */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full opacity-20 blur-xl transform rotate-12"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full opacity-25 blur-lg transform -rotate-12"></div>
        <div className="absolute bottom-32 left-1/4 w-28 h-28 bg-gradient-to-br from-green-400 to-blue-500 rounded-full opacity-20 blur-xl transform rotate-45"></div>
        <div className="absolute bottom-20 right-1/3 w-20 h-20 bg-gradient-to-br from-red-400 to-pink-500 rounded-full opacity-30 blur-lg transform -rotate-45"></div>
        
        {/* Medium splashes */}
        <div className="absolute top-1/3 left-1/2 w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full opacity-25 blur-md transform rotate-30"></div>
        <div className="absolute top-2/3 right-1/4 w-18 h-18 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full opacity-20 blur-lg transform -rotate-30"></div>
        
        {/* Small accent splashes */}
        <div className="absolute top-16 right-1/2 w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full opacity-30 blur-sm transform rotate-60"></div>
        <div className="absolute bottom-40 left-1/3 w-14 h-14 bg-gradient-to-br from-green-300 to-teal-400 rounded-full opacity-25 blur-md transform -rotate-60"></div>
        
        {/* Paint drips effect */}
        <div className="absolute top-0 left-1/4 w-2 h-40 bg-gradient-to-b from-yellow-400 to-transparent opacity-20 transform rotate-12"></div>
        <div className="absolute top-0 right-1/3 w-2 h-32 bg-gradient-to-b from-pink-400 to-transparent opacity-25 transform -rotate-12"></div>
      </div>

      <div className="bg-black/80 backdrop-blur-sm rounded-3xl p-12 w-full max-w-lg relative z-10 border border-gray-800">
        <div className="text-center mb-10">
          <h1 className="text-6xl font-bold text-white mb-4" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, letterSpacing: '0.05em' }}>AleaArt</h1>
          <p className="text-2xl text-gray-300" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label htmlFor="email" className="block text-lg font-medium text-white mb-3" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-6 py-4 rounded-lg bg-white/10 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-lg"
              style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-lg font-medium text-white mb-3" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-6 py-4 rounded-lg bg-white/10 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-lg"
              style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
              placeholder="Enter your password"
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 px-6 py-4 rounded-lg text-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full border border-yellow-400 text-yellow-400 py-4 rounded-lg font-semibold hover:bg-yellow-400 hover:text-black transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-xl"
            style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
          >
            {loading ? 'Signing in...' : 'SIGN IN'}
          </button>
        </form>

        <div className="text-center mt-8">
          <p className="text-lg text-gray-300" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-yellow-400 font-semibold hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}


import Link from 'next/link';
import Image from 'next/image';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  
  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-black text-white font-['Inter',sans-serif]">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex justify-end items-center">
          <div className="flex gap-4">
            <Link 
              href="/login"
              className="border border-yellow-400 text-yellow-400 px-6 py-2 rounded hover:bg-yellow-400 hover:text-black transition-colors"
              style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
            >
              LOGIN
            </Link>
            <Link 
              href="/signup"
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded hover:from-purple-600 hover:to-pink-600 transition-all"
              style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
            >
              SIGN UP
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="h-screen flex items-center justify-center relative overflow-hidden">
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
        
        <div className="text-center relative z-10">
          <h1 className="text-8xl font-extrabold mb-8 text-white animate-fade-in-up" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, letterSpacing: '0.05em' }}>AleaArt</h1>
          <p className="text-4xl text-gray-300 mb-12 animate-fade-in-up animation-delay-200" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400, letterSpacing: '0.02em' }}>Art that flows from blockchain randomness</p>
          <Link 
            href="/signup"
            className="border border-yellow-400 text-yellow-400 px-12 py-4 rounded text-xl hover:bg-yellow-400 hover:text-black transition-all duration-300 transform hover:scale-105 animate-fade-in-up animation-delay-400 inline-block"
            style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400, letterSpacing: '0.03em' }}
          >
            TRY FOR FREE
          </Link>
        </div>
      </section>

      {/* Feature Section 1 */}
      <section className="bg-gray-100 h-screen flex items-center">
        <div className="container mx-auto px-4">
          <div className="bg-black rounded-3xl p-16 h-4/5 flex items-center transform transition-all duration-1000 hover:scale-105">
            <div className="grid lg:grid-cols-2 gap-20 items-center w-full">
              <div className="animate-slide-in-left">
                <h2 className="text-7xl font-bold leading-tight text-white" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800 }}>
                  Art doesn&apos;t<br />
                  have to feel<br />
                  like a different<br />
                  language
                </h2>
              </div>
              <div className="flex flex-col items-start animate-slide-in-right">
                <div className="mb-12">
                  <div className="w-80 h-20 bg-gradient-to-r from-green-400 via-yellow-400 via-orange-400 via-pink-400 to-purple-400 rounded-full flex items-center justify-center p-1 transform transition-all duration-500 hover:scale-110 hover:rotate-2">
                    <div className="w-full h-full bg-black rounded-full flex items-center justify-center">
                      <svg width="60" height="20" viewBox="0 0 60 20" className="text-white transform transition-transform duration-300 hover:translate-x-2">
                        <path d="M5 10 L50 10 M40 5 L50 10 L40 15" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="mb-8 max-w-lg">
                  <p className="text-lg text-gray-300 leading-relaxed" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}>
                    We built AleaArt to provide artists with blockchain-powered randomness that makes art creation easier, 
                    so you can focus on creativity more.
                  </p>
                </div>
                <Link 
                  href="/signup"
                  className="bg-white text-black px-8 py-4 rounded-lg hover:bg-gray-200 transition-all duration-300 transform hover:scale-105 hover:shadow-lg inline-block font-medium"
                  style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
                >
                  LEARN MORE
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="bg-black h-screen flex flex-col justify-center relative overflow-hidden">
        {/* Paint-like background elements */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Large colorful splashes */}
          <div className="absolute top-16 left-16 w-28 h-28 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full opacity-20 blur-xl transform rotate-15"></div>
          <div className="absolute top-32 right-24 w-24 h-24 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full opacity-25 blur-lg transform -rotate-20"></div>
          <div className="absolute bottom-28 left-1/3 w-32 h-32 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full opacity-20 blur-xl transform rotate-35"></div>
          <div className="absolute bottom-16 right-1/4 w-20 h-20 bg-gradient-to-br from-green-400 to-teal-500 rounded-full opacity-30 blur-lg transform -rotate-40"></div>
          
          {/* Medium splashes */}
          <div className="absolute top-1/4 left-1/2 w-18 h-18 bg-gradient-to-br from-red-400 to-pink-500 rounded-full opacity-25 blur-md transform rotate-25"></div>
          <div className="absolute top-3/4 right-1/3 w-16 h-16 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full opacity-20 blur-lg transform -rotate-25"></div>
          
          {/* Small accent splashes */}
          <div className="absolute top-12 right-1/2 w-14 h-14 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-full opacity-30 blur-sm transform rotate-50"></div>
          <div className="absolute bottom-32 left-1/4 w-12 h-12 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full opacity-25 blur-md transform -rotate-50"></div>
          
          {/* Paint drips effect */}
          <div className="absolute top-0 left-1/3 w-2 h-36 bg-gradient-to-b from-purple-400 to-transparent opacity-20 transform rotate-8"></div>
          <div className="absolute top-0 right-1/4 w-2 h-28 bg-gradient-to-b from-cyan-400 to-transparent opacity-25 transform -rotate-8"></div>
        </div>
        
        <div className="container mx-auto px-4 w-full relative z-10">
          <div className="grid md:grid-cols-3 gap-0 mb-16">
            {/* Feature 1 */}
            <div className="flex flex-col justify-center items-center text-center px-6 py-12 relative">
              <h3 className="text-4xl font-bold mb-6 text-white" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800 }}>
                Random Art Generation
              </h3>
              <p className="text-base text-gray-300 max-w-sm" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}>
                Generate unique art parameters using Pyth Entropy V2 for verifiable blockchain randomness.
              </p>
              {/* Right border line */}
              <div className="absolute right-0 top-0 bottom-0 w-px bg-white"></div>
            </div>
            
            {/* Feature 2 */}
            <div className="flex flex-col justify-center items-center text-center px-6 py-12 relative">
              <h3 className="text-4xl font-bold mb-6 text-white" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800 }}>
                NFT Minting
              </h3>
              <p className="text-base text-gray-300 max-w-sm" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}>
                Convert your generated art into tradeable NFTs on Arbitrum Sepolia blockchain.
              </p>
              {/* Right border line */}
              <div className="absolute right-0 top-0 bottom-0 w-px bg-white"></div>
            </div>
            
            {/* Feature 3 */}
            <div className="flex flex-col justify-center items-center text-center px-6 py-12">
              <h3 className="text-4xl font-bold mb-6 text-white" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800 }}>
                Decentralized Marketplace
              </h3>
              <p className="text-base text-gray-300 max-w-sm" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}>
                Buy and sell NFTs directly peer-to-peer with no platform fees.
              </p>
            </div>
          </div>
          
          <div className="text-center">
            <Link 
              href="/marketplace"
              className="border border-yellow-400 text-yellow-400 px-12 py-4 rounded text-xl hover:bg-yellow-400 hover:text-black transition-all duration-300 transform hover:scale-105 inline-block"
              style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
            >
              EXPLORE
            </Link>
          </div>
        </div>
      </section>

      {/* Innovation Section */}
      <section className="bg-white text-black h-screen flex items-center">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Side - Heading and Image */}
            <div className="flex flex-col items-center">
              <h2 className="text-6xl font-bold mb-12 leading-tight text-center" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800 }}>
                Innovation<br />
                that flows
              </h2>
              <div className="w-full max-w-md">
                <Image
                  src="/landing-vector.png"
                  alt="Art Innovation"
                  width={400}
                  height={400}
                  className="w-full h-auto"
                  priority
                />
              </div>
            </div>
            
            {/* Right Side - Text */}
            <div>
              
              <div className="space-y-8">
                <div className="border-b border-gray-300 pb-6">
                  <h3 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800 }}>
                    Seamless blockchain integration
                  </h3>
                  <p className="text-lg text-gray-600 leading-relaxed" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}>
                    Our platform integrates seamlessly with Arbitrum Sepolia, providing fast and cost-effective 
                    blockchain interactions for art generation and NFT trading.
                  </p>
                </div>
                
                <div className="border-b border-gray-300 pb-6">
                  <h3 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800 }}>
                    Intuitive art creation
                  </h3>
                  <p className="text-lg text-gray-600 leading-relaxed" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}>
                    Generate unique art parameters with just a few clicks. Our AI-powered system creates 
                    deterministic parameters that ensure each piece is truly unique.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800 }}>
                    Excellent user experience
                  </h3>
                  <p className="text-lg text-gray-600 leading-relaxed" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}>
                    From wallet connection to NFT minting, we&apos;ve designed every step to be simple and intuitive 
                    for both artists and collectors.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Footer CTA */}
      <footer className="bg-black py-16 relative overflow-hidden">
        {/* Paint-like background elements */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Large colorful splashes */}
          <div className="absolute top-8 left-12 w-24 h-24 bg-gradient-to-br from-pink-400 to-red-500 rounded-full opacity-20 blur-xl transform rotate-18"></div>
          <div className="absolute top-20 right-16 w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full opacity-25 blur-lg transform -rotate-22"></div>
          <div className="absolute bottom-12 left-1/4 w-26 h-26 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-full opacity-20 blur-xl transform rotate-42"></div>
          <div className="absolute bottom-8 right-1/3 w-18 h-18 bg-gradient-to-br from-teal-400 to-green-500 rounded-full opacity-30 blur-lg transform -rotate-38"></div>
          
          {/* Medium splashes */}
          <div className="absolute top-1/3 left-1/2 w-16 h-16 bg-gradient-to-br from-violet-400 to-pink-500 rounded-full opacity-25 blur-md transform rotate-28"></div>
          <div className="absolute top-2/3 right-1/4 w-14 h-14 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-full opacity-20 blur-lg transform -rotate-32"></div>
          
          {/* Small accent splashes */}
          <div className="absolute top-6 right-1/2 w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full opacity-30 blur-sm transform rotate-55"></div>
          <div className="absolute bottom-20 left-1/3 w-12 h-12 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full opacity-25 blur-md transform -rotate-55"></div>
          
          {/* Paint drips effect */}
          <div className="absolute top-0 left-1/4 w-2 h-32 bg-gradient-to-b from-pink-400 to-transparent opacity-20 transform rotate-10"></div>
          <div className="absolute top-0 right-1/3 w-2 h-24 bg-gradient-to-b from-blue-400 to-transparent opacity-25 transform -rotate-10"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800 }}>Create with us</h2>
            <p className="text-gray-400 mb-6" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}>
              Generate unique art parameters and mint NFTs with blockchain-powered randomness 
              on Arbitrum Sepolia.
            </p>
            <Link 
              href="/signup"
              className="border border-yellow-400 text-yellow-400 px-8 py-3 rounded hover:bg-yellow-400 hover:text-black transition-colors inline-block"
              style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
            >
              START TODAY
            </Link>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8">
            <div className="text-center">
              <div className="text-gray-400" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}>
                © 2025 AleaArt. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
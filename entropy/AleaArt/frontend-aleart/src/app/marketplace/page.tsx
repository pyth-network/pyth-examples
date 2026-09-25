'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { BrowserProvider, ethers } from 'ethers';
import Navbar from '@/components/Navbar';

interface NFTData {
  tokenId: number;
  owner: string;
  ipfsHash: string;
  prompt: string;
  price: string;
  isForSale: boolean;
  creator: string;
  createdAt: number;
}

interface SpotlightData {
  tokenId: number;
  owner: string;
  ipfsHash: string;
  prompt: string;
  price: string;
  isForSale: boolean;
  creator: string;
  createdAt: number;
  spotlightStartTime: number;
  spotlightDuration: number;
  isActive: boolean;
  spotlightEndTime: number;
  timeRemaining: number;
}

export default function Marketplace() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [nfts, setNfts] = useState<NFTData[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingNFT, setBuyingNFT] = useState<number | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [userAddress, setUserAddress] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [spotlight, setSpotlight] = useState<SpotlightData | null>(null);
  const [loadingSpotlight, setLoadingSpotlight] = useState(true);
  const [requestingSpotlight, setRequestingSpotlight] = useState(false);
  const [canRequestSpotlight, setCanRequestSpotlight] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    
    fetchNFTs();
    checkWalletConnection();
  }, [session, status, router]);

  // Fetch spotlight when wallet connection changes
  useEffect(() => {
    fetchSpotlight();
  }, [walletConnected, userAddress]);

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

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask!');
      return;
    }

    try {
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Switch to Arbitrum Sepolia network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x66eee' }], // Arbitrum Sepolia chain ID
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

  const fetchNFTs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/marketplace');
      const data = await response.json();
      
      if (data.success) {
        setNfts(data.nfts);
      }
    } catch (error) {
      console.error('Error fetching NFTs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSpotlight = async () => {
    try {
      setLoadingSpotlight(true);
      const headers: HeadersInit = {};
      
      // Add wallet address to headers if connected
      if (walletConnected && userAddress) {
        headers['x-wallet-address'] = userAddress;
      }
      
      const response = await fetch('/api/spotlight', { headers });
      const data = await response.json();
      
      if (data.success) {
        setSpotlight(data.spotlight);
        setCanRequestSpotlight(data.canRequestSpotlight || false);
      }
    } catch (error) {
      console.error('Error fetching spotlight:', error);
    } finally {
      setLoadingSpotlight(false);
    }
  };

  const requestSpotlight = async () => {
    if (!walletConnected) {
      alert('Please connect your wallet first!');
      return;
    }

    try {
      setRequestingSpotlight(true);
      
      const response = await fetch('/api/request-spotlight', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: userAddress,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Create contract instance with user's signer
        const provider = new BrowserProvider(window.ethereum!);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(data.contractAddress, data.contractABI, signer);
        
        // Call the requestSpotlight function with ETH value
        const tx = await contract.requestSpotlight({ value: data.value });
        
        console.log('Spotlight request transaction sent:', tx.hash);
        
        // Wait for transaction confirmation
        const receipt = await tx.wait();
        
        console.log('Transaction confirmed:', receipt);
        
        alert(`Spotlight request submitted! Transaction: ${tx.hash}\nA random NFT will be selected and featured for 24 hours.`);
        
        // Refresh spotlight after a delay to allow for processing
        setTimeout(() => {
          fetchSpotlight();
        }, 10000);
        
      } else {
        alert(`Failed to request spotlight: ${data.error}`);
      }
    } catch (error) {
      console.error('Error requesting spotlight:', error);
      alert('Error requesting spotlight. Please try again.');
    } finally {
      setRequestingSpotlight(false);
    }
  };

  const buyNFT = async (nft: NFTData) => {
    if (!walletConnected) {
      alert('Please connect your wallet first!');
      return;
    }

    try {
      setBuyingNFT(nft.tokenId);
      
      const response = await fetch('/api/buy-nft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenId: nft.tokenId,
          price: nft.price,
          userAddress: userAddress,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Create contract instance with user's signer
        const provider = new BrowserProvider(window.ethereum!);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(data.contractAddress, data.contractABI, signer);
        
        // Call the buyNFT function with ETH value
        const tx = await contract.buyNFT(data.tokenId, { value: data.value });
        
        console.log('Buy transaction sent:', tx.hash);
        
        // Wait for transaction confirmation
        const receipt = await tx.wait();
        
        console.log('Transaction confirmed:', receipt);
        
        alert(`NFT purchased successfully! Transaction: ${tx.hash}`);
        
        // Refresh the list after a delay to allow for processing
        setTimeout(() => {
          fetchNFTs();
          fetchSpotlight();
        }, 5000);
      } else {
        alert(`Failed to buy NFT: ${data.error}`);
      }
    } catch (error) {
      console.error('Error buying NFT:', error);
      alert('Error buying NFT. Please try again.');
    } finally {
      setBuyingNFT(null);
    }
  };

  const formatPrice = (price: string) => {
    const priceInEth = parseFloat(price) / 1e18;
    return priceInEth.toFixed(4);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  // Pagination logic
  const totalPages = Math.ceil(nfts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentNFTs = nfts.slice(startIndex, endIndex);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-2xl" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>Loading marketplace...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <div className="container mx-auto px-4 py-16">
        {/* Welcome Section */}
        <div className="text-center mb-24">
          <h1 className="text-6xl text-white mb-6" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400, letterSpacing: '0.05em' }}>
            Welcome to AleaArt Marketplace
          </h1>
          <p className="text-2xl text-gray-300 mb-8" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
            Discover and collect unique AI-generated art NFTs
          </p>
        </div>

        {/* Spotlight Section */}
        <div className="mb-20">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-semibold text-white" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>Spotlight</h2>
            {canRequestSpotlight && (
              <button
                onClick={requestSpotlight}
                disabled={!walletConnected || requestingSpotlight}
                className="border border-yellow-400 text-yellow-400 px-6 py-3 rounded-lg hover:bg-yellow-400 hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
              >
                {requestingSpotlight ? 'Requesting...' : 'Request New Spotlight'}
              </button>
            )}
          </div>
          
          {loadingSpotlight ? (
            <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
              <div className="text-white text-xl" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>Loading spotlight...</div>
            </div>
          ) : spotlight ? (
            <div className="bg-gradient-to-r from-yellow-400/20 to-orange-400/20 rounded-xl p-6 border border-yellow-400/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-yellow-400 text-black px-3 py-1 rounded-full text-sm font-bold" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
                    FEATURED
                  </div>
                  <div className="text-yellow-400 text-sm" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
                    {Math.floor(spotlight.timeRemaining / 3600)}h {Math.floor((spotlight.timeRemaining % 3600) / 60)}m remaining
                  </div>
                </div>
                <div className="text-gray-300 text-sm" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
                  Token #{spotlight.tokenId}
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="aspect-square max-w-md mx-auto">
                  <img
                    src={`https://gateway.pinata.cloud/ipfs/${spotlight.ipfsHash}`}
                    alt={`Spotlight NFT #${spotlight.tokenId}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                
                <div className="flex flex-col justify-center">
                  <h3 className="text-white text-xl font-bold mb-3" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
                    Featured Artwork
                  </h3>
                  
                  <p className="text-gray-300 text-base mb-4 leading-relaxed" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
                    {spotlight.prompt}
                  </p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>Owner:</span>
                      <span className="text-white text-sm" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
                        {spotlight.owner.slice(0, 6)}...{spotlight.owner.slice(-4)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>Creator:</span>
                      <span className="text-white text-sm" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
                        {spotlight.creator.slice(0, 6)}...{spotlight.creator.slice(-4)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>Price:</span>
                      <span className="text-white font-semibold text-sm" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
                        {spotlight.isForSale ? `${formatPrice(spotlight.price)} ETH` : 'Not for sale'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>Created:</span>
                      <span className="text-white text-sm" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
                        {formatDate(spotlight.createdAt)}
                      </span>
                    </div>
                  </div>
                  
                  {spotlight.isForSale && (
                    <button
                      onClick={() => buyNFT(spotlight)}
                      disabled={buyingNFT === spotlight.tokenId || spotlight.owner.toLowerCase() === userAddress.toLowerCase()}
                      className="w-full border border-yellow-400 text-yellow-400 py-2 px-4 rounded-lg hover:bg-yellow-400 hover:text-black transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
                    >
                      {buyingNFT === spotlight.tokenId ? 'Buying...' : 
                       spotlight.owner.toLowerCase() === userAddress.toLowerCase() ? 'Your NFT' : 'Buy NFT'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
              <div className="text-gray-300 text-xl mb-4" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>No spotlight active</div>
              <p className="text-gray-400 text-lg" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
                Request a new spotlight to feature a random NFT for 24 hours
              </p>
            </div>
          )}
        </div>

        {/* NFT Grid */}
        {nfts.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-white text-3xl mb-6" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>No NFTs available yet</div>
            <p className="text-gray-400 text-xl" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>Be the first to mint an NFT!</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12 mb-16">
              {currentNFTs.map((nft) => (
                <div key={nft.tokenId} className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-yellow-400 transition-all duration-300 hover:scale-105">
                  {/* NFT Image */}
                  <div className="aspect-square">
                    <img
                      src={`https://gateway.pinata.cloud/ipfs/${nft.ipfsHash}`}
                      alt={`NFT #${nft.tokenId}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* NFT Info */}
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-white font-semibold text-lg" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>#{nft.tokenId}</h3>
                      {nft.isForSale && (
                        <span className="bg-green-500 text-white text-sm px-3 py-1 rounded-full">
                          For Sale
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-300 text-sm mb-4 line-clamp-2" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
                      {nft.prompt}
                    </p>
                    
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <p className="text-gray-400 text-sm" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>Price</p>
                        <p className="text-white font-semibold text-lg" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
                          {nft.isForSale ? `${formatPrice(nft.price)} ETH` : 'Not for sale'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 text-sm" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>Created</p>
                        <p className="text-white text-sm" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>{formatDate(nft.createdAt)}</p>
                      </div>
                    </div>
                    
                    {/* Action Button */}
                    {nft.isForSale ? (
                      <button
                        onClick={() => buyNFT(nft)}
                        disabled={buyingNFT === nft.tokenId || nft.owner.toLowerCase() === userAddress.toLowerCase()}
                        className="w-full border border-yellow-400 text-yellow-400 py-3 px-4 rounded-lg hover:bg-yellow-400 hover:text-black transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
                      >
                        {buyingNFT === nft.tokenId ? 'Buying...' : 
                         nft.owner.toLowerCase() === userAddress.toLowerCase() ? 'Your NFT' : 'Buy NFT'}
                      </button>
                    ) : (
                      <div className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg text-center font-medium" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
                        Not for Sale
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-4">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="border border-gray-600 text-gray-300 px-4 py-2 rounded-lg hover:border-yellow-400 hover:text-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
                >
                  Previous
                </button>
                
                <div className="flex space-x-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        currentPage === page
                          ? 'bg-yellow-400 text-black'
                          : 'border border-gray-600 text-gray-300 hover:border-yellow-400 hover:text-yellow-400'
                      }`}
                      style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="border border-gray-600 text-gray-300 px-4 py-2 rounded-lg hover:border-yellow-400 hover:text-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

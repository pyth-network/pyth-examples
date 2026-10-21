'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { BrowserProvider, Contract, parseEther, ethers } from 'ethers';
import { ArtToken } from '@/types';
import Navbar from '@/components/Navbar';

// Extend Window interface to include ethereum
interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  send: (method: string, params?: unknown[]) => Promise<unknown>;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

interface ArtTokenCardProps {
  token: ArtToken;
  fetchTokenParameters: (tokenId: number) => Promise<{
    tokenId: number;
    seed: string;
    parameters: {
      promptIndex: number;
      styleIndex: number;
      samplerIndex: number;
      aspectIndex: number;
      steps: number;
      cfg: number;
      latentSeed: number;
      paletteId: number;
    };
  } | null>;
}

function ArtTokenCard({ token, fetchTokenParameters }: ArtTokenCardProps) {
  const [parameters, setParameters] = useState<{
    tokenId: number;
    seed: string;
    parameters: {
      promptIndex: number;
      styleIndex: number;
      samplerIndex: number;
      aspectIndex: number;
      steps: number;
      cfg: number;
      latentSeed: number;
      paletteId: number;
    };
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const loadParameters = async () => {
    if (parameters) return; // Already loaded
    
    setLoading(true);
    setError('');
    
    try {
      const params = await fetchTokenParameters(token.tokenId);
      if (params) {
        setParameters(params);
      } else {
        setError('Failed to load parameters');
      }
    } catch {
      setError('Failed to load parameters');
    } finally {
      setLoading(false);
    }
  };

  const generateImage = async () => {
    if (!parameters) return;
    
    setGeneratingImage(true);
    setError('');
    
    try {
      const response = await fetch('/api/generate-image-async', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parameters: parameters.parameters,
          tokenId: token.tokenId
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Show success message
        alert('Image generation started! Your art will be ready in a few minutes. You can check the status by refreshing the page.');
        
        // Start polling for status updates
        pollImageStatus();
      } else {
        setError('Failed to start image generation');
      }
    } catch {
      setError('Failed to start image generation');
    } finally {
      setGeneratingImage(false);
    }
  };

  const pollImageStatus = async () => {
    const maxAttempts = 30; // Poll for up to 5 minutes (10 seconds * 30)
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/images?tokenId=${token.tokenId}`);
        if (response.ok) {
          const result = await response.json();
          
          if (result.status === 'completed') {
            // Image is ready, update the UI
            setGeneratedImage(result.imageData);
            setGeneratingImage(false);
            return;
          } else if (result.status === 'failed') {
            setError('Image generation failed');
            setGeneratingImage(false);
            return;
          }
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000); // Poll every 10 seconds
        } else {
          setError('Image generation timed out');
          setGeneratingImage(false);
        }
      } catch (error) {
        console.error('Error polling image status:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000);
        } else {
          setError('Failed to check image status');
          setGeneratingImage(false);
        }
      }
    };

    poll();
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-white" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>Token #{token.tokenId}</h3>
        <span className="text-green-400 text-sm" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>Ready</span>
      </div>
      
      {!parameters ? (
        <div className="text-center">
          <button
            onClick={loadParameters}
            disabled={loading}
            className="border border-yellow-400 text-yellow-400 px-4 py-2 rounded-lg hover:bg-yellow-400 hover:text-black transition-colors disabled:opacity-50"
            style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
          >
            {loading ? 'Loading...' : 'Load Parameters'}
          </button>
          {error && <p className="text-red-400 text-sm mt-2" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>{error}</p>}
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <div className="text-gray-300" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
              <span className="text-white font-medium">Prompt:</span> {parameters.parameters.promptIndex}/12
            </div>
            <div className="text-gray-300" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
              <span className="text-white font-medium">Style:</span> {parameters.parameters.styleIndex}/10
            </div>
            <div className="text-gray-300" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
              <span className="text-white font-medium">Sampler:</span> {parameters.parameters.samplerIndex}/6
            </div>
            <div className="text-gray-300" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
              <span className="text-white font-medium">Aspect:</span> {parameters.parameters.aspectIndex}/5
            </div>
            <div className="text-gray-300" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
              <span className="text-white font-medium">Steps:</span> {parameters.parameters.steps}
            </div>
            <div className="text-gray-300" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
              <span className="text-white font-medium">CFG:</span> {(parameters.parameters.cfg / 10).toFixed(1)}
            </div>
            <div className="text-gray-300" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
              <span className="text-white font-medium">Palette:</span> {parameters.parameters.paletteId}/24
            </div>
            <div className="text-gray-300" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
              <span className="text-white font-medium">Seed:</span> {parameters.parameters.latentSeed}
            </div>
          </div>
          
          <div className="text-center">
            <button
              onClick={generateImage}
              disabled={generatingImage}
              className="border border-yellow-400 text-yellow-400 px-6 py-2 rounded-lg hover:bg-yellow-400 hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
            >
              {generatingImage ? 'Generating... (2-3 min)' : 'Generate Image'}
            </button>
          </div>
          
          {generatedImage && (
            <div className="mt-4">
              <h4 className="text-white font-medium mb-2" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>Generated Image:</h4>
              <img 
                src={generatedImage} 
                alt={`Generated art for token ${token.tokenId}`}
                className="w-full rounded-lg border border-gray-600"
              />
            </div>
          )}
        </div>
      )}
      
      <div className="mt-4 text-xs text-gray-400" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
        Generated: {new Date(token.createdAt).toLocaleString()}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [artTokens, setArtTokens] = useState<ArtToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generatedImages, setGeneratedImages] = useState<{
    tokenId: number;
    imageData: string;
    prompt: string;
    createdAt: string;
    ipfsHash?: string;
    ipfsUrl?: string;
  }[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [mintingNFT, setMintingNFT] = useState<number | null>(null);
  const [showPriceInput, setShowPriceInput] = useState<number | null>(null);
  const [nftPrice, setNftPrice] = useState<string>('0');

  const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x420D121aE08007Ef0A66E67D5D7BfFdC98AbECF0';
  const CONTRACT_ABI = [
    "function requestArtParams() external payable returns (uint256 tokenId, uint64 requestId)",
    "function viewRenderParams(uint256 tokenId) external view returns (tuple(uint8 promptIndex, uint8 styleIndex, uint8 samplerIndex, uint8 aspectIndex, uint16 steps, uint16 cfg, uint32 latentSeed, uint16 paletteId))",
    "function tokenSeed(uint256 tokenId) external view returns (bytes32)",
    "function nextTokenId() external view returns (uint256)",
    "event EntropyRequested(uint256 indexed tokenId, uint64 indexed requestId, uint256 feePaid)",
    "event EntropyFulfilled(uint256 indexed tokenId, bytes32 seed)"
  ];

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchArtTokens();
      checkWalletConnection();
      fetchGeneratedImages();
    }
  }, [session]);

  const checkWalletConnection = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const provider = new BrowserProvider(window.ethereum!);
        const accounts = await provider.send('eth_accounts', []);
        
        if (accounts.length > 0) {
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          setWalletAddress(address);
          setWalletConnected(true);
          console.log('Wallet already connected:', address);
        }
      }
    } catch {
      console.log('No wallet connected');
    }
  };

  const fetchTokenParameters = async (tokenId: number) => {
    try {
      const provider = new BrowserProvider(window.ethereum!);
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      const params = await contract.viewRenderParams(tokenId);
      const seed = await contract.tokenSeed(tokenId);
      
      return {
        tokenId,
        seed: seed,
        parameters: {
          promptIndex: Number(params.promptIndex),
          styleIndex: Number(params.styleIndex),
          samplerIndex: Number(params.samplerIndex),
          aspectIndex: Number(params.aspectIndex),
          steps: Number(params.steps),
          cfg: Number(params.cfg),
          latentSeed: Number(params.latentSeed),
          paletteId: Number(params.paletteId),
        }
      };
    } catch (error) {
      console.error(`Failed to fetch parameters for token ${tokenId}:`, error);
      return null;
    }
  };

  const fetchArtTokens = async () => {
    try {
      const response = await fetch('/api/art-tokens');
      if (response.ok) {
        const data = await response.json();
        setArtTokens(data.artTokens || []);
      }
    } catch (error) {
      console.error('Failed to fetch art tokens:', error);
    }
  };

  const fetchGeneratedImages = async () => {
    try {
      setLoadingImages(true);
      const response = await fetch('/api/user-images');
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched images data:', data);
        setGeneratedImages(data.images || []);
      }
    } catch (error) {
      console.error('Error fetching generated images:', error);
    } finally {
      setLoadingImages(false);
    }
  };

  const showPriceInputForNFT = (tokenId: number) => {
    setShowPriceInput(tokenId);
    setNftPrice('0');
  };

  const mintNFT = async (image: {
    tokenId: number;
    ipfsHash?: string;
    prompt: string;
  }) => {
    try {
      setMintingNFT(image.tokenId);
      
      // Get user's wallet address
      if (!window.ethereum) {
        alert('Please install MetaMask!');
        return;
      }

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      // Use the price from state
      const priceInWei = parseFloat(nftPrice) * 1e18;

      // Get transaction data from API
      const response = await fetch('/api/mint-nft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenId: image.tokenId,
          ipfsHash: image.ipfsHash,
          prompt: image.prompt,
          price: priceInWei.toString(),
          userAddress: userAddress,
        }),
      });

      const data = await response.json();
      
      if (!data.success) {
        alert(`Failed to prepare mint transaction: ${data.error}`);
        return;
      }

      // Create contract instance with user's signer
      const contract = new ethers.Contract(data.contractAddress, data.contractABI, signer);
      
      // Call the mintNFT function directly with user's wallet
      const tx = await contract.mintNFT(...data.functionArgs);
      
      console.log('Minting transaction sent:', tx.hash);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      console.log('Transaction confirmed:', receipt);
      
      // Get the token ID from the transaction logs
      const mintEvent = receipt.logs.find((log: ethers.Log) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === 'NFTMinted';
        } catch {
          return false;
        }
      });
      
      let mintedTokenId = image.tokenId; // fallback
      
      if (mintEvent) {
        const parsed = contract.interface.parseLog(mintEvent);
        if (parsed) {
          mintedTokenId = parsed.args.tokenId.toString();
        }
      }

      alert(`NFT minted successfully! Token ID: ${mintedTokenId}\nTransaction: ${tx.hash}`);
      
    } catch (error) {
      console.error('Error minting NFT:', error);
      alert('Error minting NFT. Please try again.');
    } finally {
      setMintingNFT(null);
    }
  };

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum === 'undefined') {
        setError('MetaMask not detected. Please install MetaMask.');
        return;
      }

      console.log('Connecting to MetaMask...');
      
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Switch to Arbitrum Sepolia network
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x66eee' }], // Arbitrum Sepolia chain ID
        });
      } catch {
        // If the network doesn't exist, add it
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x66eee',
            chainName: 'Arbitrum Sepolia',
            rpcUrls: ['https://arbitrum-sepolia-rpc.publicnode.com'],
            nativeCurrency: {
              name: 'ETH',
              symbol: 'ETH',
              decimals: 18,
            },
            blockExplorerUrls: ['https://sepolia.arbiscan.io/'],
          }],
        });
      }
      
      const provider = new BrowserProvider(window.ethereum!);
      const accounts = await provider.send('eth_requestAccounts', []);
      console.log('Accounts:', accounts);
      
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      console.log('Connected address:', address);
      
      setWalletAddress(address);
      setWalletConnected(true);

      // Save wallet address to user profile
      const response = await fetch('/api/wallet/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      });

      if (response.ok) {
        setSuccess('Wallet connected successfully!');
      } else {
        console.error('Failed to save wallet address to profile');
        setSuccess('Wallet connected! (Profile update failed)');
      }
    } catch (error: unknown) {
      console.error('Wallet connection error:', error);
      setError(`Failed to connect wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const requestArtParams = async () => {
    if (!walletConnected) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const provider = new BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const totalValue = parseEther("0.001");
      const tx = await contract.requestArtParams({ value: totalValue });
      
      setSuccess(`Transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      const event = receipt.logs.find((log: ethers.Log) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === 'EntropyRequested';
        } catch {
          return false;
        }
      });
      
      if (event) {
        const parsed = contract.interface.parseLog(event);
        const tokenId = parsed?.args.tokenId.toString();
        // const requestId = parsed?.args.requestId.toString();
        
        setSuccess(`Art parameters requested! Token ID: ${tokenId}`);
        
        // Poll for completion
        pollForArtParams(tokenId);
      }
    } catch (error: unknown) {
      setError(`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const pollForArtParams = async (tokenId: string) => {
    const maxAttempts = 30;
    let attempts = 0;

    const poll = async () => {
      try {
        // const provider = new BrowserProvider(window.ethereum);
        // const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        
        // const params = await contract.viewRenderParams(tokenId);
        // const seed = await contract.tokenSeed(tokenId);
        
        // Save only token ID to database
        await fetch('/api/art-tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokenId: parseInt(tokenId),
            requestId: tokenId,
          }),
        });

        setSuccess(`Art parameters generated for Token #${tokenId}!`);
        fetchArtTokens(); // Refresh the list
        return;
      } catch {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000); // Poll every 2 seconds
        } else {
          setError('Art parameters generation timed out');
        }
      }
    };

    poll();
  };




  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-24">
          <h1 className="text-6xl text-white mb-12" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400, letterSpacing: '0.05em' }}>
            Generate unique art with blockchain randomness
          </h1>
          
          {/* Steps Guide */}
          <div className="flex items-center justify-center space-x-8 mb-12">
            <div className="flex items-center">
              <div className="bg-yellow-400 text-black w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
                1
              </div>
              <div className="ml-4 text-left">
                <div className="text-white text-lg font-semibold" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>Request Parameters</div>
                <div className="text-gray-400 text-sm" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>Generate random art parameters</div>
              </div>
            </div>
            
            <div className="flex items-center">
              <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            
            <div className="flex items-center">
              <div className="bg-yellow-400 text-black w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
                2
              </div>
              <div className="ml-4 text-left">
                <div className="text-white text-lg font-semibold" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>Generate Image</div>
                <div className="text-gray-400 text-sm" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>Create AI art from parameters</div>
              </div>
            </div>
            
            <div className="flex items-center">
              <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            
            <div className="flex items-center">
              <div className="bg-yellow-400 text-black w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
                3
              </div>
              <div className="ml-4 text-left">
                <div className="text-white text-lg font-semibold" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>Mint as NFT</div>
                <div className="text-gray-400 text-sm" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>Turn your art into blockchain NFT</div>
              </div>
            </div>
          </div>
        </div>

        {/* Art Generation */}
        <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 mb-16">
          <h2 className="text-3xl font-semibold text-white mb-6" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>Generate Art Parameters</h2>
          <div className="text-center">
            <button
              onClick={requestArtParams}
              disabled={loading}
              className="border border-yellow-400 text-yellow-400 px-8 py-4 rounded-lg hover:bg-yellow-400 hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xl"
              style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
            >
              {loading ? 'Generating...' : 'Request Art Parameters'}
            </button>
            <p className="text-gray-300 text-lg mt-4" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
              Estimated cost: ~0.0004 ETH + gas
            </p>
          </div>
        </div>


        {/* Status Messages */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-6 py-4 rounded-lg mt-12" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500/20 border border-green-500 text-green-200 px-6 py-4 rounded-lg mt-12" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
            {success}
          </div>
        )}

        {/* Generated Images */}
        <div className="mt-20">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-semibold text-white" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>Generated Images</h2>
            <button
              onClick={fetchGeneratedImages}
              disabled={loadingImages}
              className="border border-yellow-400 text-yellow-400 px-6 py-3 rounded-lg hover:bg-yellow-400 hover:text-black transition-colors disabled:opacity-50"
              style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
            >
              {loadingImages ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          
          {generatedImages.length === 0 ? (
            <div className="text-gray-400 text-center py-12" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
              No generated images yet. Generate some art from your tokens above!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {generatedImages.map((image, index) => (
                <div key={index} className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-yellow-400 transition-all duration-300">
                  <div className="aspect-square mb-4">
                    <img
                      src={image.ipfsUrl || (image.imageData?.startsWith('data:') ? image.imageData : `data:image/png;base64,${image.imageData}`)}
                      alt={`Generated art for token ${image.tokenId}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                  <div className="text-white">
                    <div className="font-semibold text-lg mb-2" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>Token #{image.tokenId}</div>
                    <div className="text-gray-400 text-sm mb-2" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
                      {new Date(image.createdAt).toLocaleDateString()}
                    </div>
                    <div className="text-gray-400 text-sm mb-4 truncate" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
                      {image.prompt}
                    </div>
                    
                    {showPriceInput === image.tokenId ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-white text-sm mb-2" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
                            Price in ETH (0 for not for sale):
                          </label>
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            value={nftPrice}
                            onChange={(e) => setNftPrice(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
                            placeholder="0"
                          />
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => mintNFT(image)}
                            disabled={mintingNFT === image.tokenId}
                            className="flex-1 border border-yellow-400 text-yellow-400 px-4 py-2 rounded-lg hover:bg-yellow-400 hover:text-black transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
                          >
                            {mintingNFT === image.tokenId ? 'Minting...' : 'Mint Now'}
                          </button>
                          <button
                            onClick={() => setShowPriceInput(null)}
                            className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:border-gray-500 hover:text-white transition-colors"
                            style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => showPriceInputForNFT(image.tokenId)}
                        className="w-full border border-yellow-400 text-yellow-400 px-4 py-3 rounded-lg hover:bg-yellow-400 hover:text-black transition-all duration-300 font-medium"
                        style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
                      >
                        Mint as NFT
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Art Tokens */}
        <div className="mt-20">
          <h2 className="text-3xl font-semibold text-white mb-12" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>Your Art Tokens</h2>
          {artTokens.length === 0 ? (
            <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
              <p className="text-gray-300 text-xl mb-4" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>No art tokens generated yet</p>
              <p className="text-gray-400 text-lg" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>Connect your wallet and generate your first art parameters!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {artTokens.map((token, index) => (
                <ArtTokenCard key={index} token={token} fetchTokenParameters={fetchTokenParameters} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

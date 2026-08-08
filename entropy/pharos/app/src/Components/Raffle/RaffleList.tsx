"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ethers, Log } from 'ethers';
import Button from '@/Components/UI/Button';
import pyusd from "@/app/assets/pyusd.png";
import { FaArrowRight } from 'react-icons/fa6';
import { FcAlarmClock } from 'react-icons/fc';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import RaffleListSkeleton from '../SkeletonLoader/RaffleListSkeleton';

// Contract addresses
const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "0x0000000000000000000000000000000000000000";

// Admin wallet addresses from environment variables
const ADMIN_ADDRESSES = process.env.NEXT_PUBLIC_ADMIN_ADDRESSES
  ? process.env.NEXT_PUBLIC_ADMIN_ADDRESSES.split(',').map(addr => addr.trim())
  : [];

// Time remaining interface
interface TimeRemaining {
  hours: string;
  minutes: string;
  seconds: string;
  expired: boolean;
  notStarted: boolean;
}

// MongoDB raffle interface
interface MongoRaffle {
  contractAddress: string;
  imageUrl: string;
}

// Raffle interface
interface RaffleData {
  address: string;
  title: string;
  description: string;
  pricePerTicket: string;
  totalTickets: number;
  ticketsSold: number;
  endTime: number;
  startTime: number;
  isClosed: boolean;
  winner: string;
  maxTicketsPerUser: number;
  houseFeePercentage: number;
  prizeAmount: string;
  imageUrl?: string; // Add image URL field
}

const RaffleList: React.FC = () => {
  const [raffles, setRaffles] = useState<RaffleData[]>([]);
  const [timeRemainingList, setTimeRemainingList] = useState<{[key: string]: TimeRemaining}>({});
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [closingRaffles, setClosingRaffles] = useState<Set<string>>(new Set());
  const [closeRaffleError, setCloseRaffleError] = useState<string | null>(null);
  const [closeRaffleSuccess, setCloseRaffleSuccess] = useState<string | null>(null);
  const [distributingRaffles, setDistributingRaffles] = useState<Set<string>>(new Set());
  const [distributeError, setDistributeError] = useState<string | null>(null);
  const [distributeSuccess, setDistributeSuccess] = useState<string | null>(null);

  // Calculate time remaining for a raffle
  const calculateTimeRemaining = (startTime: number, endTime: number) => {
    const now = Math.floor(Date.now() / 1000);
    
    // If raffle hasn't started yet
    if (now < startTime) {
      const timeUntilStart = startTime - now;
      const hours = Math.floor(timeUntilStart / 3600);
      const minutes = Math.floor((timeUntilStart % 3600) / 60);
      const seconds = timeUntilStart % 60;
      
      return {
        hours: hours.toString().padStart(2, '0'),
        minutes: minutes.toString().padStart(2, '0'),
        seconds: seconds.toString().padStart(2, '0'),
        expired: false,
        notStarted: true
      };
    }
    
    // If raffle has ended
    if (now >= endTime) {
      return { hours: '00', minutes: '00', seconds: '00', expired: true, notStarted: false };
    }
    
    // Raffle is active
    const timeLeft = endTime - now;
    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const seconds = timeLeft % 60;
    
    return {
      hours: hours.toString().padStart(2, '0'),
      minutes: minutes.toString().padStart(2, '0'),
      seconds: seconds.toString().padStart(2, '0'),
      expired: false,
      notStarted: false
    };
  };

  // Get provider - always use direct RPC for now to avoid network issues
  const getProvider = () => {
    // Always use direct RPC to ensure we're on the correct network
    return new ethers.JsonRpcProvider('https://sepolia-rollup.arbitrum.io/rpc');
  };

  // Check if current user is admin
  const checkAdminStatus = async () => {
    try {
      // Check if MetaMask/wallet is connected
      if (typeof window === 'undefined' || !window.ethereum) {
        console.log('MetaMask not found');
        setIsAdmin(false);
        return;
      }
      
      // Get user's MetaMask address
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      
      console.log('Checking admin status for:', userAddress);
      
      // First check: Environment variable admin list
      const isEnvAdmin = ADMIN_ADDRESSES.some(
        addr => addr.toLowerCase() === userAddress.toLowerCase()
      );
      
      console.log('Environment admin check:', isEnvAdmin, 'ADMIN_ADDRESSES:', ADMIN_ADDRESSES);
      
      if (isEnvAdmin) {
        console.log('✅ User is admin (environment check)');
        setIsAdmin(true);
        return;
      }
      
      // Second check: Smart contract validation (if factory has admin functions)
      try {
        const factoryAbi = [
          "function isAdmin(address account) external view returns (bool)"
        ];
        const factoryContract = new ethers.Contract(FACTORY_ADDRESS, factoryAbi, signer);
        const isContractAdmin = await factoryContract.isAdmin(userAddress);
        
        console.log('Contract admin check:', isContractAdmin);
        setIsAdmin(isContractAdmin);
      } catch (contractError) {
        // If contract doesn't have isAdmin function, fall back to env check only
        console.log('Contract admin check not available, using env check only', contractError);
        setIsAdmin(false);
      }
      
    } catch (error) {
      console.log('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  // Close raffle function
  const closeRaffle = async (raffleAddress: string) => {
    try {
      setClosingRaffles(prev => new Set(prev).add(raffleAddress));
      setCloseRaffleError(null);
      setCloseRaffleSuccess(null);
      
      // Check if MetaMask is available
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('Please connect MetaMask to close raffles');
      }
      
      // Use MetaMask provider for signing transactions
      const writeProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await writeProvider.getSigner();
      
      // Use direct RPC for reading contract data
      const readProvider = getProvider();
      
      // Raffle ABI for closing
      const raffleAbi = [
        "function closeIfReady() external",
        "function owner() external view returns (address)"
      ];
      
      const raffleRead = new ethers.Contract(raffleAddress, raffleAbi, readProvider);
      const raffleWrite = new ethers.Contract(raffleAddress, raffleAbi, signer);
      
      // Check if user is the owner (required for admin-only close) using read provider
      const owner = await raffleRead.owner();
      const userAddress = await signer.getAddress();
      
      if (owner.toLowerCase() !== userAddress.toLowerCase()) {
        throw new Error('Only the raffle owner can close this raffle');
      }
      
      console.log("🔒 Auto-closing raffle...");
      
      const tx = await raffleWrite.closeIfReady();
      console.log("Transaction hash:", tx.hash);
      
      const receipt = await tx.wait();
      
      console.log("Transaction receipt:", {
        status: receipt?.status,
        logsCount: receipt?.logs?.length || 0,
        gasUsed: receipt?.gasUsed?.toString()
      });
      
      // Try to find the RaffleClosed event
      let sequenceNumber = null;
      if (receipt?.logs && receipt.logs.length > 0) {
        // Look for the RaffleClosed event
        const raffleClosedTopic = ethers.id("RaffleClosed(uint64)");
        const raffleClosedLog = receipt.logs.find((log: Log) => log.topics[0] === raffleClosedTopic);
        
        if (raffleClosedLog) {
          // Decode the event data using the correct ABI
          const eventAbi = ["event RaffleClosed(uint64 sequenceNumber)"];
          const iface = new ethers.Interface(eventAbi);
          try {
            const decoded = iface.parseLog({
              topics: raffleClosedLog.topics,
              data: raffleClosedLog.data
            });
            sequenceNumber = decoded?.args?.[0];
          } catch (e) {
            console.log('Failed to parse RaffleClosed event:', e);
            // Fallback: extract from topics directly
            if (raffleClosedLog.topics.length > 1) {
              sequenceNumber = BigInt(raffleClosedLog.topics[1]);
            }
          }
        }
      }
      
      if (sequenceNumber) {
        console.log("✅ Raffle closed successfully!");
        console.log("📊 Sequence number:", sequenceNumber);
        
        setCloseRaffleSuccess(`Raffle closed successfully! Sequence: ${sequenceNumber}`);
        
        // Refresh raffles data
        await fetchRaffles();
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setCloseRaffleSuccess(null);
        }, 5000);
        
      } else {
        throw new Error('Could not find sequence number in transaction logs');
      }
      
    } catch (error: unknown) {
      console.error('Error closing raffle:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setCloseRaffleError(errorMessage);
      
      // Clear error message after 10 seconds
      setTimeout(() => {
        setCloseRaffleError(null);
      }, 10000);
    } finally {
      setClosingRaffles(prev => {
        const newSet = new Set(prev);
        newSet.delete(raffleAddress);
        return newSet;
      });
    }
  };

  // Distribute prize function (admin only)
  const distributePrize = async (raffleAddress: string) => {
    try {
      setDistributingRaffles(prev => new Set(prev).add(raffleAddress));
      setDistributeError(null);
      setDistributeSuccess(null);

      // Check if MetaMask is available
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('Please connect MetaMask to distribute prizes');
      }

      // Use MetaMask provider for signing transactions
      const writeProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await writeProvider.getSigner();

      // Use direct RPC for reading contract data
      const readProvider = getProvider();

      const raffleAbi = [
        "function distributePrize() external",
        "function owner() external view returns (address)",
        "function isClosed() external view returns (bool)",
        "function winner() external view returns (address)"
      ];

      const raffleRead = new ethers.Contract(raffleAddress, raffleAbi, readProvider);
      const raffleWrite = new ethers.Contract(raffleAddress, raffleAbi, signer);

      // Owner check using read provider
      const owner = await raffleRead.owner();
      const userAddress = await signer.getAddress();
      if (owner.toLowerCase() !== userAddress.toLowerCase()) {
        throw new Error('Only the raffle owner can distribute the prize');
      }

      // Basic preconditions using read provider
      const isClosed = await raffleRead.isClosed();
      const winner = await raffleRead.winner();
      if (!isClosed) {
        throw new Error('Raffle must be closed before distributing the prize');
      }
      if (winner === '0x0000000000000000000000000000000000000000') {
        throw new Error('No winner set for this raffle');
      }

      const tx = await raffleWrite.distributePrize();
      const receipt = await tx.wait();
      if (receipt?.status !== 1) {
        throw new Error('Prize distribution transaction failed');
      }

      setDistributeSuccess('✅ Prize distributed successfully');
      await fetchRaffles();

      setTimeout(() => setDistributeSuccess(null), 8000);
    } catch (error: unknown) {
      console.error('Error distributing prize:', error);
      const msg = error instanceof Error ? error.message : 'Unknown error occurred';
      setDistributeError(msg);
      setTimeout(() => setDistributeError(null), 10000);
    } finally {
      setDistributingRaffles(prev => {
        const newSet = new Set(prev);
        newSet.delete(raffleAddress);
        return newSet;
      });
    }
  };

  // Fetch raffles from smart contracts and merge images from MongoDB
  const fetchRaffles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔄 Fetching raffles from smart contracts...');
      
      // Always fetch from smart contracts for real-time data
      const rafflesData = await fetchRafflesFromSmartContract() || [];
      
      // Try to get images from MongoDB
      try {
        console.log('🖼️ Fetching images from MongoDB...');
        const response = await fetch('/api/raffles');
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.raffles) {
            console.log('📊 Found MongoDB raffles:', data.raffles.length);

            // Create a map of contract addresses to image URLs
            const imageMap = new Map<string, string>();
            data.raffles.forEach((raffle: MongoRaffle) => {
              if (raffle.contractAddress && raffle.imageUrl) {
                imageMap.set(raffle.contractAddress.toLowerCase(), raffle.imageUrl);
                console.log(`🖼️ Found image for ${raffle.contractAddress}: ${raffle.imageUrl}`);
              }
            });
            
            // Merge images into raffle data
            const rafflesWithImages = rafflesData.map(raffle => ({
              ...raffle,
              imageUrl: imageMap.get(raffle.address.toLowerCase()) || undefined
            }));
            
            setRaffles(rafflesWithImages);
            console.log('✅ Loaded raffles with images:', rafflesWithImages.length);
            return;
          }
        }
      } catch (mongoError) {
        console.log('⚠️ Could not fetch images from MongoDB:', mongoError);
      }
      
      // If MongoDB fails, just use smart contract data without images
      setRaffles(rafflesData);
      console.log('✅ Loaded raffles from smart contracts only:', rafflesData.length);

    } catch (error) {
      console.error('Error fetching raffles:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch raffles';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback: Fetch raffles from smart contracts
  const fetchRafflesFromSmartContract = async () => {
    try {
      const provider = getProvider();
      
      // RaffleFactory ABI
      const factoryAbi = [
        "function getRaffles() external view returns (address[] memory)"
      ];
      
      // Raffle ABI
      const raffleAbi = [
        "function prizeDescription() external view returns (string memory)",
        "function ticketPrice() external view returns (uint256)",
        "function maxTickets() external view returns (uint256)",
        "function totalTicketsSold() external view returns (uint256)",
        "function endTime() external view returns (uint256)",
        "function startTime() external view returns (uint256)",
        "function isClosed() external view returns (bool)",
        "function winner() external view returns (address)",
        "function maxTicketsPerUser() external view returns (uint256)",
        "function houseFeePercentage() external view returns (uint256)",
        "function prizeAmount() external view returns (uint256)"
      ];
      
      const factory = new ethers.Contract(FACTORY_ADDRESS, factoryAbi, provider);
      
      // Get all raffle addresses with better error handling
      let raffleAddresses: string[] = [];
      try {
        // First check if contract exists
        const code = await provider.getCode(FACTORY_ADDRESS);
        if (code === '0x') {
          throw new Error(`No contract deployed at address ${FACTORY_ADDRESS}`);
        }
        
        raffleAddresses = await factory.getRaffles();
        console.log('Found raffles from smart contract:', raffleAddresses.length);
      } catch (error) {
        console.error('Error calling getRaffles():', error);
        
        // Check if it's a decoding error (empty result)
        if (error instanceof Error && error.message.includes('could not decode result data') && error.message.includes('value="0x"')) {
          console.log('ℹ️ Factory contract returned empty data - this might be a network/RPC issue');
          console.log('ℹ️ Try switching MetaMask to Arbitrum Sepolia network or refresh the page');
          raffleAddresses = []; // Empty array
        } else {
          throw error; // Re-throw other errors
        }
      }
      
      // If no raffles, return empty list
      if (raffleAddresses.length === 0) {
        console.log('No raffles found, returning empty raffle list');
        setRaffles([]);
        setIsLoading(false);
        return;
      }
      
      const rafflesData: RaffleData[] = [];
      
      // Fetch data for each raffle
      for (const address of raffleAddresses) {
        try {
          console.log(`Fetching data for raffle: ${address}`);
          const raffle = new ethers.Contract(address, raffleAbi, provider);
          
          // Retry logic for RPC calls
          const retryRpcCall = async (fn: () => Promise<any>, retries = 3): Promise<any> => {
            for (let i = 0; i < retries; i++) {
              try {
                return await Promise.race([
                  fn(),
                  new Promise<never>((_, reject) => 
                    setTimeout(() => reject(new Error('Request timeout')), 10000)
                  )
                ]);
              } catch (error) {
                if (i === retries - 1) throw error;
                console.log(`Retry ${i + 1}/${retries} for ${address}`);
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
              }
            }
            throw new Error('Max retries reached');
          };
          
          const [
            title,
            ticketPrice,
            maxTickets,
            ticketsSold,
            endTime,
            startTime,
            isClosed,
            winner,
            maxTicketsPerUser,
            houseFeePercentage,
            prizeAmount
          ] = await Promise.all([
            retryRpcCall(() => raffle.prizeDescription()).catch(() => 'Unknown Prize'),
            retryRpcCall(() => raffle.ticketPrice()).catch(() => 0),
            retryRpcCall(() => raffle.maxTickets()).catch(() => 0),
            retryRpcCall(() => raffle.totalTicketsSold()).catch(() => 0),
            retryRpcCall(() => raffle.endTime()).catch(() => 0),
            retryRpcCall(() => raffle.startTime()).catch(() => 0),
            retryRpcCall(() => raffle.isClosed()).catch(() => false),
            retryRpcCall(() => raffle.winner()).catch(() => '0x0000000000000000000000000000000000000000'),
            retryRpcCall(() => raffle.maxTicketsPerUser()).catch(() => 0),
            retryRpcCall(() => raffle.houseFeePercentage()).catch(() => 0),
            retryRpcCall(() => raffle.prizeAmount()).catch(() => 0)
          ]);
          
          console.log(`✅ Successfully fetched raffle ${address}:`, {
            title,
            ticketsSold: Number(ticketsSold),
            totalTickets: Number(maxTickets),
            isClosed
          });
          
          rafflesData.push({
            address,
            title,
            description: title, // Using title as description for now
            pricePerTicket: ethers.formatEther(ticketPrice),
            totalTickets: Number(maxTickets),
            ticketsSold: Number(ticketsSold),
            endTime: Number(endTime),
            startTime: Number(startTime),
            isClosed,
            winner,
            maxTicketsPerUser: Number(maxTicketsPerUser),
            houseFeePercentage: Number(houseFeePercentage),
            prizeAmount: ethers.formatEther(prizeAmount),
            imageUrl: undefined // No image URL from smart contract
          });
        } catch (error) {
          console.error(`❌ Error fetching raffle ${address} after retries:`, error);
          // Add raffle with minimal data on complete failure
          rafflesData.push({
            address,
            title: 'Loading...',
            description: 'Loading...',
            pricePerTicket: '0',
            totalTickets: 0,
            ticketsSold: 0,
            endTime: 0,
            startTime: 0,
            isClosed: false,
            winner: '0x0000000000000000000000000000000000000000',
            maxTicketsPerUser: 0,
            houseFeePercentage: 0,
            prizeAmount: '0',
            imageUrl: undefined
          });
        }
      }
      
      console.log('✅ Loaded raffles from smart contract:', rafflesData.length);
      return rafflesData;

    } catch (error) {
      console.error('Error fetching raffles from smart contract:', error);
      throw error;
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchRaffles();
    
    // Check admin status on mount
    checkAdminStatus();
    
    // Re-check admin status when wallet changes
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', checkAdminStatus);
      window.ethereum.on('chainChanged', checkAdminStatus);
      
      return () => {
        window.ethereum.removeListener('accountsChanged', checkAdminStatus);
        window.ethereum.removeListener('chainChanged', checkAdminStatus);
      };
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (raffles.length > 0) {
      // Update countdown every second
      const countdownInterval = setInterval(() => {
        const newTimeRemaining: {[key: string]: TimeRemaining} = {};
        raffles.forEach(raffle => {
          newTimeRemaining[raffle.address] = calculateTimeRemaining(raffle.startTime, raffle.endTime);
        });
        setTimeRemainingList(newTimeRemaining);
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [raffles]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-pharos-yellow/20 to-pharos-orange/10 py-12 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-rubik font-black uppercase text-black mb-4 drop-shadow-[4px_4px_0px_rgba(243,162,15,0.3)]">
              All Raffles
            </h1>
            <p className="text-lg md:text-xl font-rubik font-semibold text-gray-700">
              Browse all available raffles and find your next win!
            </p>
          </div>

          <RaffleListSkeleton />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-pharos-yellow/20 to-pharos-orange/10 py-12 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,0.8)] rounded-xl p-8 max-w-md mx-auto text-center">
              <p className="text-xl font-rubik font-black text-red-600 mb-4">
                Error Loading Raffles
              </p>
              <p className="text-base font-rubik text-gray-600 mb-4">
                {error}
              </p>
              <button
                onClick={fetchRaffles}
                className="bg-pharos-orange border-4 border-black px-6 py-3 font-black text-white uppercase tracking-tight
                  shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000]
                  hover:translate-x-[2px] hover:translate-y-[2px]
                  active:shadow-none active:translate-x-[4px] active:translate-y-[4px]
                  transition-all duration-100"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-pharos-yellow/20 to-pharos-orange/10 py-12 px-4 md:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div
          className={`text-center mb-12 transition-all duration-700 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
          }`}
        >
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-rubik font-black uppercase text-black mb-4 drop-shadow-[4px_4px_0px_rgba(243,162,15,0.3)]">
            All Raffles
          </h1>
          <p className="text-lg md:text-xl font-rubik font-semibold text-gray-700">
            Browse all available raffles and find your next win!
          </p>
        </div>

        {/* Success Message */}
        {closeRaffleSuccess && (
          <div className="mb-6 bg-green-500 text-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-6">
            <p className="text-xl font-rubik font-black uppercase mb-2">🎉 Success!</p>
            <p className="text-base font-rubik font-bold">{closeRaffleSuccess}</p>
          </div>
        )}

        {distributeSuccess && (
          <div className="mb-6 bg-green-500 text-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-6">
            <p className="text-xl font-rubik font-black uppercase mb-2">🎉 Success!</p>
            <p className="text-base font-rubik font-bold">{distributeSuccess}</p>
          </div>
        )}

        {/* Error Message */}
        {closeRaffleError && (
          <div className="mb-6 bg-red-500 text-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-6">
            <p className="text-xl font-rubik font-black uppercase mb-2">❌ Error</p>
            <p className="text-base font-rubik font-bold">{closeRaffleError}</p>
          </div>
        )}

        {distributeError && (
          <div className="mb-6 bg-red-500 text-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-6">
            <p className="text-xl font-rubik font-black uppercase mb-2">❌ Error</p>
            <p className="text-base font-rubik font-bold">{distributeError}</p>
          </div>
        )}

        {/* Admin Notice */}
        {isAdmin && (
          <div className="mb-6 bg-blue-500 text-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-4">
            <p className="text-lg font-rubik font-black uppercase text-center">
              👑 Admin Mode - You can close raffles that have ended or sold out
            </p>
          </div>
        )}

        {/* Raffle Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 xl:gap-6 2xl:gap-8">
          {raffles.map((raffle, index) => {
            const availableTickets = raffle.totalTickets - raffle.ticketsSold;
            const timeRemaining = timeRemainingList[raffle.address];
            const completionPercentage = raffle.totalTickets > 0 ? Math.round((raffle.ticketsSold / raffle.totalTickets) * 100) : 0;
            const isExpired = timeRemaining?.expired || raffle.isClosed;

            return (
              <div
                key={raffle.address}
                className={`transition-all duration-700 h-full ${
                  mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="h-full bg-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl overflow-hidden hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_rgba(0,0,0,0.8)] transition-all duration-300 group">
                  {/* Image Section */}
                  <div className="relative aspect-square overflow-hidden bg-gray-100">
                    {/* Browser-style top bar */}
                    <div className="absolute top-0 left-0 w-full h-8 bg-gray-200 border-b-4 border-black flex items-center px-3 space-x-2 z-10">
                      <span className="w-3 h-3 bg-red-500 rounded-full border-2 border-gray-700"></span>
                      <span className="w-3 h-3 bg-yellow-500 rounded-full border-2 border-gray-700"></span>
                      <span className="w-3 h-3 bg-green-500 rounded-full border-2 border-gray-700"></span>
                    </div>

                    {/* Raffle Image */}
                    <div className="relative w-full h-full pt-8">
                      {raffle.imageUrl ? (
                        <Image
                          src={raffle.imageUrl}
                          alt={raffle.title}
                          fill
                          className="object-cover"
                          onError={(e) => {
                            console.log('Image failed to load:', raffle.imageUrl);
                            // Hide the image and show placeholder
                            e.currentTarget.style.display = 'none';
                            const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                            if (placeholder) {
                              placeholder.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      
                      {/* Placeholder Image (always present, shown when no imageUrl or image fails) */}
                      <div 
                        className={`relative w-full h-full flex items-center justify-center bg-linear-to-br from-pharos-orange/20 to-pharos-yellow/20 ${
                          raffle.imageUrl ? 'absolute inset-0 hidden' : ''
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-6xl mb-4">🎫</div>
                          <p className="text-lg font-rubik font-black text-gray-700">PYUSD Raffle</p>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="absolute top-10 right-3 bg-pharos-orange text-black px-3 py-1 border-3 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] font-rubik font-black text-sm rounded">
                      {isExpired ? 'CLOSED' : `${completionPercentage}%`}
                    </div>

                    {/* Winner Badge */}
                    {raffle.winner !== '0x0000000000000000000000000000000000000000' && (
                      <div className="absolute top-10 left-3 bg-green-500 text-white px-3 py-1 border-3 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] font-rubik font-black text-sm rounded">
                        WINNER!
                      </div>
                    )}
                  </div>

                  {/* Content Section */}
                  <div className="p-6">
                    {/* Title */}
                    <h3 className="text-2xl md:text-3xl font-rubik font-black uppercase text-black mb-4 leading-tight">
                      {raffle.title}
                    </h3>

                    {/* Contract Address */}
                    <div className="mb-4 p-2 bg-gray-100 border-2 border-gray-300 rounded">
                      <p className="text-xs font-rubik font-bold text-gray-600 uppercase mb-1">Contract Address</p>
                      <p className="text-xs font-mono text-gray-700 break-all">{raffle.address}</p>
                    </div>

                    {/* Countdown Timer */}
                    {!isExpired && (
                      <div className="mb-4">
                        <p className="text-xs flex gap-2 items-center font-rubik font-bold text-gray-600 uppercase mb-2 tracking-wide">
                          <FcAlarmClock/> 
                          {timeRemaining?.notStarted ? 'Starts In' : 
                           timeRemaining?.expired ? 'Ended' : 
                           'Time Remaining'}
                        </p>
                        <div className="flex items-center justify-between gap-2">
                          {/* Hours */}
                          <div className="flex-1 flex flex-col items-center">
                            <div className="w-full bg-pharos-orange text-white border-3 border-black rounded-lg py-2 text-2xl font-black shadow-[3px_3px_0px_#000] text-center font-rubik bg-[#f3a20f]">
                              {timeRemaining?.hours || '00'}
                            </div>
                            <span className="text-xs font-bold text-black uppercase mt-1 font-rubik">Hours</span>
                          </div>

                          <div className="text-xl font-bold text-pharos-orange">:</div>

                          {/* Minutes */}
                          <div className="flex-1 flex flex-col items-center">
                            <div className="w-full bg-pharos-orange text-white border-3 border-black rounded-lg py-2 text-2xl font-black shadow-[3px_3px_0px_#000] text-center font-rubik bg-[#f3a20f]">
                              {timeRemaining?.minutes || '00'}
                            </div>
                            <span className="text-xs font-bold text-black uppercase mt-1 font-rubik">Minutes</span>
                          </div>

                          <div className="text-xl font-bold text-pharos-orange">:</div>

                          {/* Seconds */}
                          <div className="flex-1 flex flex-col items-center">
                            <div className="w-full bg-pharos-orange text-white border-3 border-black rounded-lg py-2 text-2xl font-black shadow-[3px_3px_0px_#000] text-center font-rubik bg-[#f3a20f]">
                              {timeRemaining?.seconds || '00'}
                            </div>
                            <span className="text-xs font-bold text-black uppercase mt-1 font-rubik">Seconds</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Expired Message */}
                    {isExpired && (
                      <div className="mb-4 p-3 bg-red-100 border-2 border-red-400 rounded">
                        <p className="text-red-800 font-rubik font-bold text-center">
                          {raffle.winner !== '0x0000000000000000000000000000000000000000' ? '🎉 Raffle Completed!' : '⏰ Raffle Ended'}
                        </p>
                      </div>
                    )}

                    {/* Price Per Ticket */}
                    <div className="bg-pharos-orange/10 border-l-4 border-pharos-orange px-4 py-3 mb-4 rounded">
                      <p className="text-xs font-rubik font-semibold text-gray-600 uppercase mb-1">
                        Price Per Ticket
                      </p>
                      <div className="flex items-center gap-2">
                        <Image src={pyusd} alt="PYUSD" width={24} height={24} className="object-contain" />
                        <p className="text-xl font-rubik font-black text-pharos-orange">
                          {raffle.pricePerTicket}
                        </p>
                      </div>
                    </div>

                    {/* Tickets Available */}
                    <div className="bg-gray-50 border-2 border-black rounded-lg px-4 py-3 mb-4">
                      <p className="text-xs font-rubik font-semibold text-gray-600 uppercase mb-1">
                        Tickets Available
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-2xl font-rubik font-black text-black">
                          {availableTickets.toLocaleString()}
                        </p>
                        <p className="text-xs font-rubik text-gray-500">
                          of {raffle.totalTickets.toLocaleString()}
                        </p>
                      </div>
                      {/* Mini Progress Bar */}
                      <div className="mt-2 w-full h-2 bg-gray-200 border-2 border-black rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#f97028] transition-all duration-300"
                          style={{ width: `${completionPercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="mb-4 p-3 bg-blue-50 border-2 border-blue-300 rounded">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="font-bold text-gray-600">Max per User:</span>
                          <span className="ml-1 font-bold text-black">{raffle.maxTicketsPerUser}</span>
                        </div>
                        <div>
                          <span className="font-bold text-gray-600">House Fee:</span>
                          <span className="ml-1 font-bold text-black">{raffle.houseFeePercentage / 100}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      {/* View Button */}
                      <Link href={timeRemaining?.notStarted ? '#' : `/raffle/${raffle.address}`}>
                        <Button
                          color="pharos-orange"
                          shape="medium-rounded"
                          className={`w-full flex items-center gap-2 justify-center text-lg py-3 px-6 uppercase ${
                            timeRemaining?.notStarted ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          disabled={timeRemaining?.notStarted}
                        >
                          {timeRemaining?.notStarted ? 'Not Started Yet' : 
                           isExpired ? 'View Results' : 
                           'Buy Tickets'} <FaArrowRight />
                        </Button>
                      </Link>

                      {/* Close Raffle Button (Admin Only) */}
                      {isAdmin && !raffle.isClosed && (isExpired || raffle.ticketsSold >= raffle.totalTickets) && (
                        <Button
                          color="pharos-orange"
                          shape="medium-rounded"
                          className="w-full flex items-center gap-2 justify-center text-lg py-3 px-6 uppercase disabled:opacity-50 disabled:cursor-not-allowed bg-red-500 hover:bg-red-600 text-white border-4 border-black shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all duration-100"
                          onClick={() => closeRaffle(raffle.address)}
                          disabled={closingRaffles.has(raffle.address)}
                        >
                          {closingRaffles.has(raffle.address) ? (
                            <>
                              <AiOutlineLoading3Quarters className="animate-spin" />
                              Closing...
                            </>
                          ) : (
                            <>
                              🔒 Close Raffle
                            </>
                          )}
                        </Button>
                      )}

                      {/* Distribute Prize Button (Admin Only) */}
                      {isAdmin && raffle.isClosed && raffle.winner !== '0x0000000000000000000000000000000000000000' && (
                        <Button
                          color="pharos-orange"
                          shape="medium-rounded"
                          className="w-full flex items-center gap-2 justify-center text-lg py-3 px-6 uppercase disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 hover:bg-green-700 text-white border-4 border-black shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all duration-100"
                          onClick={() => distributePrize(raffle.address)}
                          disabled={distributingRaffles.has(raffle.address)}
                        >
                          {distributingRaffles.has(raffle.address) ? (
                            <>
                              <AiOutlineLoading3Quarters className="animate-spin" />
                              Distributing...
                            </>
                          ) : (
                            <>
                              💸 Distribute Prize
                            </>
                          )}
                        </Button>
                      )}

                      {/* Admin Info */}
                      {isAdmin && raffle.isClosed && (
                        <div className="bg-green-100 border-2 border-green-400 rounded p-2">
                          <p className="text-green-800 font-rubik font-bold text-center text-sm">
                            ✅ Raffle Closed
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* No Raffles Message */}
        {raffles.length === 0 && (
          <div className="text-center py-20">
            <div className="bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,0.8)] rounded-xl p-12 max-w-md mx-auto">
              <p className="text-2xl font-rubik font-black text-gray-700 mb-4">
                No raffles available at the moment
              </p>
              <p className="text-base font-rubik text-gray-600">
                Check back soon for new raffles!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RaffleList;

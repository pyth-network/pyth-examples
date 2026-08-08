"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { ethers } from 'ethers';
import Button from '@/Components/UI/Button';
import pyusd from "@/app/assets/pyusd.png";
import { FaCheckCircle } from 'react-icons/fa';
import { FcAlarmClock } from 'react-icons/fc';
import { BiSolidLock } from 'react-icons/bi';
import { FaCopy } from 'react-icons/fa6';
import { IoTicketSharp } from 'react-icons/io5';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import IndividualRaffleSkeleton from '../SkeletonLoader/IndividualRaffleSkeleton';

// Contract addresses
const PYUSD_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_PYUSD_TOKEN_ADDRESS || "0x79Bd6F9E7B7B25B343C762AE5a35b20353b2CCb8";

// MongoDB raffle interface
interface MongoRaffle {
  contractAddress: string;
  imageUrl: string;
}

// Error with code property
interface EthereumError extends Error {
  code?: number | string;
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
  isClosed: boolean;
  winner: string;
  maxTicketsPerUser: number;
  houseFeePercentage: number;
  prizeAmount: string;
  participants: number;
  imageUrl?: string; // Add image URL field
}

interface IndividualRaffleProps {
  raffleAddress: string;
}

const IndividualRaffle: React.FC<IndividualRaffleProps> = ({ raffleAddress }) => {
  const [raffle, setRaffle] = useState<RaffleData | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<{
    days: string;
    hours: string;
    minutes: string;
    seconds: string;
    expired: boolean;
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBuyingTickets, setIsBuyingTickets] = useState(false);
  const [buyTicketsError, setBuyTicketsError] = useState<string | null>(null);
  const [buyTicketsSuccess, setBuyTicketsSuccess] = useState<string | null>(null);
  // const [currentNetwork, setCurrentNetwork] = useState<string | null>(null);

  // Calculate time remaining for a raffle
  const calculateTimeRemaining = (endTime: number) => {
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = endTime - now;
    
    if (timeLeft <= 0) {
      return { 
        days: '00', 
        hours: '00', 
        minutes: '00', 
        seconds: '00', 
        expired: true 
      };
    }
    
    const days = Math.floor(timeLeft / 86400);
    const hours = Math.floor((timeLeft % 86400) / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const seconds = timeLeft % 60;
    
    return {
      days: days.toString().padStart(2, '0'),
      hours: hours.toString().padStart(2, '0'),
      minutes: minutes.toString().padStart(2, '0'),
      seconds: seconds.toString().padStart(2, '0'),
      expired: false
    };
  };

  // Get provider - always use direct RPC to ensure we're on the correct network
  const getProvider = () => {
    // Always use direct RPC to ensure we're on the correct network
    return new ethers.JsonRpcProvider('https://sepolia-rollup.arbitrum.io/rpc');
  };

  // Get provider for MetaMask (for transactions only)
  const getMetaMaskProvider = () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      return new ethers.BrowserProvider(window.ethereum);
    }
    throw new Error('MetaMask not found');
  };

  // Switch to Arbitrum Sepolia network
  const switchToArbitrumSepolia = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x66eee' }], // 421614 in hex
      });
    } catch (switchError) {
      const error = switchError as EthereumError;
      // If the network doesn't exist, add it
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x66eee', // 421614 in hex
              chainName: 'Arbitrum Sepolia',
              rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18,
              },
              blockExplorerUrls: ['https://sepolia.arbiscan.io/'],
            }],
          });
        } catch (addError) {
          console.log(addError,"error");
          throw new Error('Failed to add Arbitrum Sepolia network');
        }
      } else {
        throw new Error('Failed to switch to Arbitrum Sepolia network');
      }
    }
  };

  // Fetch raffle data from smart contract and merge images from MongoDB
  const fetchRaffleData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔄 Fetching raffle data from smart contract...');
      
      const provider = getProvider();
      
      // Raffle ABI
      const raffleAbi = [
        "function prizeDescription() external view returns (string memory)",
        "function ticketPrice() external view returns (uint256)",
        "function maxTickets() external view returns (uint256)",
        "function totalTicketsSold() external view returns (uint256)",
        "function endTime() external view returns (uint256)",
        "function isClosed() external view returns (bool)",
        "function winner() external view returns (address)",
        "function maxTicketsPerUser() external view returns (uint256)",
        "function houseFeePercentage() external view returns (uint256)",
        "function prizeAmount() external view returns (uint256)",
        "function entrants(uint256) external view returns (address)"
      ];
      
      const raffleContract = new ethers.Contract(raffleAddress, raffleAbi, provider);
      
      const [
        title,
        ticketPrice,
        maxTickets,
        ticketsSold,
        endTime,
        isClosed,
        winner,
        maxTicketsPerUser,
        houseFeePercentage,
        prizeAmount
      ] = await Promise.all([
        raffleContract.prizeDescription(),
        raffleContract.ticketPrice(),
        raffleContract.maxTickets(),
        raffleContract.totalTicketsSold(),
        raffleContract.endTime(),
        raffleContract.isClosed(),
        raffleContract.winner(),
        raffleContract.maxTicketsPerUser(),
        raffleContract.houseFeePercentage(),
        raffleContract.prizeAmount()
      ]);
      
      // Get participant count by checking entrants array
      let participants = 0;
      try {
        console.log('🔍 Getting participant count...');
        
        // Use a more efficient approach - try common array lengths first
        const commonLengths = [0, 1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 300, 500, 1000];
        let maxValidIndex = -1;
        
        // First, try to find the approximate range
        for (const length of commonLengths) {
          try {
            await raffleContract.entrants(length);
            maxValidIndex = length;
          } catch (error) {
            console.log(error,"error");
            break;
          }
        }
        
        // If we found a valid index, do a binary search to find the exact length
        if (maxValidIndex >= 0) {
          let left = maxValidIndex;
          let right = maxValidIndex * 2; // Start searching from the last known valid index
          
          // Binary search to find the exact length
          while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            try {
              await raffleContract.entrants(mid);
              left = mid + 1;
            } catch (error) {
              right = mid - 1;
            }
          }
          participants = left;
        } else {
          participants = 0;
        }
        
        console.log(`📊 Found ${participants} participants`);
      } catch (error) {
        console.warn('⚠️ Could not get participant count:', error);
        // Fallback: estimate participants based on tickets sold
        // This is not accurate but better than showing 0
        participants = Math.max(1, Math.floor(Number(ticketsSold) / 2));
        console.log(`📊 Estimated ${participants} participants (fallback)`);
      }
      
      const raffleData: RaffleData = {
        address: raffleAddress,
        title,
        description: title, // Using title as description for now
        pricePerTicket: ethers.formatEther(ticketPrice),
        totalTickets: Number(maxTickets),
        ticketsSold: Number(ticketsSold),
        endTime: Number(endTime),
        isClosed,
        winner,
        maxTicketsPerUser: Number(maxTicketsPerUser),
        houseFeePercentage: Number(houseFeePercentage),
        prizeAmount: ethers.formatEther(prizeAmount),
        participants: participants,
        imageUrl: undefined // Will be updated from MongoDB if available
      };
      
      // Try to get image from MongoDB
      try {
        console.log('🖼️ Fetching image from MongoDB...');
        const response = await fetch('/api/raffles');
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.raffles) {
            // Find the raffle with matching contract address
            const matchingRaffle = data.raffles.find((r: MongoRaffle) =>
              r.contractAddress.toLowerCase() === raffleAddress.toLowerCase()
            );
            
            if (matchingRaffle && matchingRaffle.imageUrl) {
              raffleData.imageUrl = matchingRaffle.imageUrl;
              console.log('✅ Found image for raffle:', matchingRaffle.imageUrl);
            } else {
              console.log('ℹ️ No image found in MongoDB for this raffle');
            }
          }
        }
      } catch (mongoError) {
        console.log('⚠️ Could not fetch image from MongoDB:', mongoError);
      }
      
      setRaffle(raffleData);
      console.log('✅ Loaded raffle data:', raffleData);
      
    } catch (error: unknown) {
      console.error('Error fetching raffle data:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Buy tickets function
  const buyTickets = async (numTickets: number = 1) => {
    if (!raffle) return;
    
    try {
      setIsBuyingTickets(true);
      setBuyTicketsError(null);
      setBuyTicketsSuccess(null);
      
      const provider = getMetaMaskProvider();
      const signer = await provider.getSigner();
      
      // Check if user is on the correct network (Arbitrum Sepolia)
      const network = await provider.getNetwork();
      console.log('Current network:', network);
      
      if (network.chainId !== BigInt(421614)) {
        console.log('🔄 Wrong network detected, attempting to switch...');
        await switchToArbitrumSepolia();
        
        // Check network again after switching
        const newNetwork = await provider.getNetwork();
        if (newNetwork.chainId !== BigInt(421614)) {
          throw new Error(`Please switch to Arbitrum Sepolia (Chain ID: 421614). Current network: ${newNetwork.name} (Chain ID: ${newNetwork.chainId})`);
        }
        console.log('✅ Successfully switched to Arbitrum Sepolia');
      }
      
      console.log('✅ Connected to correct network: Arbitrum Sepolia');
      
      // Use direct RPC for reading contract data to avoid network issues
      const readProvider = getProvider();
      
      // Raffle ABI for buying tickets
      const raffleAbi = [
        "function buyTicket(uint256 numTickets) external",
        "function ticketPrice() external view returns (uint256)",
        "function totalTicketsSold() external view returns (uint256)",
        "function maxTickets() external view returns (uint256)",
        "function entrantTickets(address) external view returns (uint256)",
        "function maxTicketsPerUser() external view returns (uint256)"
      ];
      
      // ERC20 ABI for PYUSD token
      const erc20Abi = [
        "function balanceOf(address owner) view returns (uint256)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)"
      ];
      
      // Use readProvider for reading data, signer for transactions
      const raffleContractRead = new ethers.Contract(raffle.address, raffleAbi, readProvider);
      const raffleContractWrite = new ethers.Contract(raffle.address, raffleAbi, signer);
      const pyusdTokenRead = new ethers.Contract(PYUSD_TOKEN_ADDRESS, erc20Abi, readProvider);
      const pyusdTokenWrite = new ethers.Contract(PYUSD_TOKEN_ADDRESS, erc20Abi, signer);
      
      // Get ticket price and calculate total cost using read provider
      const ticketPrice = await raffleContractRead.ticketPrice();
      const totalCost = ticketPrice * BigInt(numTickets);
      
      console.log(`🎫 Buying ${numTickets} tickets...`);
      console.log(`💰 Cost: ${ethers.formatEther(totalCost)} PYUSD per ticket`);
      console.log(`💵 Total Cost: ${ethers.formatEther(totalCost)} PYUSD`);
      
      // Check PYUSD balance using read provider
      const balance = await pyusdTokenRead.balanceOf(signer.address);
      console.log(`💳 Your PYUSD Balance: ${ethers.formatEther(balance)} PYUSD`);
      
      if (balance < totalCost) {
        throw new Error(`Insufficient PYUSD balance. Need ${ethers.formatEther(totalCost)} PYUSD, have ${ethers.formatEther(balance)} PYUSD`);
      }
      
      // Check allowance using read provider
      const allowance = await pyusdTokenRead.allowance(signer.address, raffle.address);
      console.log(`🔓 Current Allowance: ${ethers.formatEther(allowance)} PYUSD`);
      
      if (allowance < totalCost) {
        console.log("🔐 Approving PYUSD spending...");
        const approveTx = await pyusdTokenWrite.approve(raffle.address, totalCost);
        await approveTx.wait();
        console.log("✅ PYUSD approved!");
      }
      
      // Buy tickets
      console.log("🎫 Purchasing tickets...");
      const tx = await raffleContractWrite.buyTicket(numTickets);
      await tx.wait();
      console.log("✅ Tickets bought successfully!");
      
      // Update raffle data
      await fetchRaffleData();
      
      setBuyTicketsSuccess(`Successfully bought ${numTickets} ticket${numTickets > 1 ? 's' : ''}!`);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setBuyTicketsSuccess(null);
      }, 5000);
      
    } catch (error: unknown) {
      console.error('Error buying tickets:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setBuyTicketsError(errorMessage);
      
      // Clear error message after 10 seconds
      setTimeout(() => {
        setBuyTicketsError(null);
      }, 10000);
    } finally {
      setIsBuyingTickets(false);
    }
  };

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => {
        setCopied(false);
      }, 2000); // Hide after 2 seconds
      return () => clearTimeout(timer);
    }
  }, [copied]);

  // Check current network
  const checkNetwork = async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
          const network = await provider.getNetwork();
        // setCurrentNetwork(`${network.name} (Chain ID: ${network.chainId})`);
      }
    } catch (error) {
      console.log('Could not check network:', error);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchRaffleData();
    checkNetwork();
  }, [raffleAddress]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (raffle) {
      // Update countdown every second
      const countdownInterval = setInterval(() => {
        setTimeRemaining(calculateTimeRemaining(raffle.endTime));
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [raffle]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen font-rubik bg-linear-to-br from-[#f3a20f]/20 to-[#f97028]/10 py-12 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <IndividualRaffleSkeleton />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen font-rubik bg-linear-to-br from-[#f3a20f]/20 to-[#f97028]/10 py-12 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,0.8)] rounded-xl p-8 max-w-md mx-auto text-center">
              <p className="text-xl font-rubik font-black text-red-600 mb-4">
                Error Loading Raffle
              </p>
              <p className="text-base font-rubik text-gray-600 mb-4">
                {error}
              </p>
              <button
                onClick={fetchRaffleData}
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

  // No raffle data
  if (!raffle) {
    return (
      <div className="min-h-screen font-rubik bg-linear-to-br from-[#f3a20f]/20 to-[#f97028]/10 py-12 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,0.8)] rounded-xl p-8 max-w-md mx-auto text-center">
              <p className="text-xl font-rubik font-black text-gray-700 mb-4">
                Raffle not found
              </p>
              <p className="text-base font-rubik text-gray-600">
                The raffle you&apos;re looking for doesn&apos;t exist or has been removed.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate available tickets
  const availableTickets = raffle.totalTickets - raffle.ticketsSold;
  const completionPercentage = raffle.totalTickets > 0 ? Math.round((raffle.ticketsSold / raffle.totalTickets) * 100) : 0;
  const isExpired = timeRemaining?.expired || raffle.isClosed;

  // Format end date
  const endDate = new Date(raffle.endTime * 1000);
  const formattedEndDate = endDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedEndTime = endDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const handleCopyClick = () => {
    navigator.clipboard.writeText(raffle.address);
    setCopied(true);
  };

  return (
    <div className="min-h-screen font-rubik bg-linear-to-br from-[#f3a20f]/20 to-[#f97028]/10 py-12 px-4 md:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Raffle ID Badge - Top */}
        <div
          className={`inline-block mb-6 transition-all duration-700 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
          }`}
        >
          <div className="bg-black text-white px-6 py-3 border-4 border-black shadow-[6px_6px_0px_rgba(243,162,15,1)] font-rubik font-black text-lg uppercase">
            Contract: {raffle.address.slice(0, 6)}...{raffle.address.slice(-4)}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Side - Image */}
          <div
            className={`transition-all duration-700 delay-100 ${
              mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
            }`}
          >
            <div className="sticky top-8">
              <div className="relative bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden aspect-square group">
                {/* Browser-style top bar */}
                <div className="absolute top-0 left-0 w-full h-10 bg-gray-200 border-b-4 border-black flex items-center px-3 space-x-2 z-10">
                  <span className="w-4 h-4 bg-red-500 rounded-full border-2 border-gray-700"></span>
                  <span className="w-4 h-4 bg-yellow-500 rounded-full border-2 border-gray-700"></span>
                  <span className="w-4 h-4 bg-green-500 rounded-full border-2 border-gray-700"></span>
                  <div className="flex-1 bg-white border-2 border-gray-400 rounded-md h-6 ml-4"></div>
                </div>

                {/* Raffle Image */}
                <div className="relative w-full h-full pt-10">
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
                      <div className="text-8xl mb-4">🎫</div>
                      <p className="text-2xl font-rubik font-black text-gray-700">PYUSD Raffle</p>
                      <p className="text-lg font-rubik font-bold text-gray-600 mt-2">{raffle.title}</p>
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="absolute bottom-6 right-6 bg-[#f97028] text-black px-6 py-3 border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] font-rubik font-black text-2xl rounded-lg">
                  {isExpired ? 'CLOSED' : `${completionPercentage}%`}
                </div>

                {/* Winner Badge */}
                {raffle.winner !== '0x0000000000000000000000000000000000000000' && (
                  <div className="absolute bottom-6 left-6 bg-green-500 text-white px-6 py-3 border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] font-rubik font-black text-xl rounded-lg">
                    WINNER!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Details */}
          <div
            className={`transition-all duration-700 delay-200 ${
              mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
            }`}
          >
            {/* Title */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-rubik font-black uppercase text-black mb-6 drop-shadow-[4px_4px_0px_rgba(243,162,15,0.3)] leading-tight">
              {raffle.title}
            </h1>

            {/* Description */}
            <div className="bg-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-6 mb-6 font-rubik">
              <h3 className="text-xl font-rubik font-black text-black mb-3">Prize Description</h3>
              <p className="text-gray-700">{raffle.description}</p>
            </div>

            {/* Progress Bar */}
            <div className="bg-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-6 mb-6">
              <div className="flex justify-between items-center mb-3">
                <span className="font-rubik font-bold text-gray-700 uppercase text-sm">Raffle Progress</span>
                <span className="font-rubik font-black text-[#f97028] text-xl">{completionPercentage}%</span>
              </div>
              <div className="relative w-full h-6 bg-gray-200 border-4 border-black rounded-lg overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-[#f97028] transition-all duration-1000 ease-out flex items-center justify-end pr-2"
                  style={{ width: `${completionPercentage}%` }}
                >
                  {completionPercentage > 10 && (
                    <span className="font-rubik font-black text-white text-xs drop-shadow-[2px_2px_0px_rgba(0,0,0,0.3)]">
                      {raffle.ticketsSold}/{raffle.totalTickets}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Tickets Available */}
              <div className="bg-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-5 hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_rgba(0,0,0,0.8)] transition-all duration-200">
                <p className="text-sm font-rubik font-bold text-gray-600 uppercase mb-2">Tickets Available</p>
                <p className="text-3xl font-rubik font-black text-black">{availableTickets.toLocaleString()}</p>
                <p className="text-xs font-rubik text-gray-500 mt-1">of {raffle.totalTickets.toLocaleString()} total</p>
              </div>

              {/* Participants */}
              <div className="bg-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-5 hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_rgba(0,0,0,0.8)] transition-all duration-200">
                <p className="text-sm font-rubik font-bold text-gray-600 uppercase mb-2">Participants</p>
                <p className="text-3xl font-rubik font-black text-black">{raffle.participants.toLocaleString()}</p>
                <p className="text-xs font-rubik text-gray-500 mt-1">unique entries</p>
              </div>
              {/* Max Tickets Per User */}
              <div className="bg-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-5 hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_rgba(0,0,0,0.8)] transition-all duration-200">
                <p className="text-sm font-rubik font-bold text-gray-600 uppercase mb-2">Max Per User</p>
                <p className="text-3xl font-rubik font-black text-black">{raffle.maxTicketsPerUser}</p>
                <p className="text-xs font-rubik text-gray-500 mt-1">tickets maximum</p>
              </div>

              {/* Price Per Ticket */}
              <div className="bg-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-5 hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_rgba(0,0,0,0.8)] transition-all duration-200">
                <p className="text-sm font-rubik font-bold text-black uppercase mb-2">Price Per Ticket</p>
                <div className="flex items-center gap-2">
                  <Image src={pyusd} alt="PYUSD" width={32} height={32} className="object-contain" />
                  <p className="text-3xl font-rubik font-black text-black">{raffle.pricePerTicket}</p>
                </div>
              </div>

              {/* Total Prize Pool */}
              <div className="bg-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-5 hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_rgba(0,0,0,0.8)] transition-all duration-200">
                <p className="text-sm font-rubik font-bold text-gray-600 uppercase mb-2">Total Prize Pool</p>
                <div className="flex items-center gap-2">
                  <Image src={pyusd} alt="PYUSD" width={32} height={32} className="object-contain" />
                  <p className="text-3xl font-rubik font-black text-black">{raffle.prizeAmount}</p>
                </div>
              </div>

              {/* House Fee */}
              <div className="bg-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-5 hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_rgba(0,0,0,0.8)] transition-all duration-200">
                <p className="text-sm font-rubik font-bold text-gray-600 uppercase mb-2">House Fee</p>
                <p className="text-3xl font-rubik font-black text-black">{(raffle.houseFeePercentage / 100).toFixed(2)}%</p>
                <p className="text-xs font-rubik text-gray-500 mt-1">platform fee</p>
              </div>
            </div>

            {/* Countdown Timer */}
            <div className="bg-linear-to-br from-white to-gray-50 border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-6 mb-6">
              <p className="text-base flex items-center gap-2 font-rubik font-bold text-gray-700 uppercase mb-4 tracking-wide">
                <FcAlarmClock /> {isExpired ? 'Raffle Ended' : 'Time Remaining'}
              </p>
              
              {!isExpired && timeRemaining ? (
                <div className="flex items-center justify-between gap-3 mb-4">
                  {/* Days */}
                  <div className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-[#f3a20f] text-black border-4 border-black rounded-lg py-4 text-4xl font-black shadow-[4px_4px_0px_#000] text-center font-rubik">
                      {timeRemaining.days}
                    </div>
                    <span className="text-xs md:text-sm font-bold text-black uppercase mt-2 font-rubik">Days</span>
                  </div>

                  <div className="text-3xl font-bold text-black">:</div>

                  {/* Hours */}
                  <div className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-[#f3a20f] text-black border-4 border-black rounded-lg py-4 text-4xl font-black shadow-[4px_4px_0px_#000] text-center font-rubik">
                      {timeRemaining.hours}
                    </div>
                    <span className="text-xs md:text-sm font-bold text-black uppercase mt-2 font-rubik">Hours</span>
                  </div>

                  <div className="text-3xl font-bold text-black">:</div>

                  {/* Minutes */}
                  <div className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-[#f3a20f] text-black border-4 border-black rounded-lg py-4 text-4xl font-black shadow-[4px_4px_0px_#000] text-center font-rubik">
                      {timeRemaining.minutes}
                    </div>
                    <span className="text-xs md:text-sm font-bold text-black uppercase mt-2 font-rubik">Minutes</span>
                  </div>

                  <div className="text-3xl font-bold text-black">:</div>

                  {/* Seconds */}
                  <div className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-[#f3a20f] text-black border-4 border-black rounded-lg py-4 text-4xl font-black shadow-[4px_4px_0px_#000] text-center font-rubik">
                      {timeRemaining.seconds}
                    </div>
                    <span className="text-xs md:text-sm font-bold text-black uppercase mt-2 font-rubik">Seconds</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">⏰</div>
                  <p className="text-2xl font-rubik font-black text-gray-700">Raffle Closed</p>
                  {raffle.winner !== '0x0000000000000000000000000000000000000000' && (
                    <p className="text-lg font-rubik font-bold text-green-600 mt-2">Winner Selected!</p>
                  )}
                </div>
              )}

              {/* End Date Display */}
              <div className="bg-[#f3a20f]/20 border-l-4 border-[#f97028] px-4 py-3 rounded">
                <p className="text-sm font-rubik font-semibold text-gray-700 mb-1">
                  {isExpired ? 'Raffle Ended On' : 'Raffle Ends On'}
                </p>
                <p className="text-lg font-rubik font-black text-black">{formattedEndDate}</p>
                <p className="text-base font-rubik font-bold text-[#f97028]">{formattedEndTime}</p>
              </div>
            </div>

            {/* Smart Contract Address */}
            <div className="bg-black text-white border-4 border-black shadow-[6px_6px_0px_rgba(243,162,15,1)] rounded-xl p-6 mb-6 hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_rgba(243,162,15,1)] transition-all duration-200">
              <p className="text-sm flex items-center gap-2 font-rubik font-bold uppercase mb-3 text-[#f3a20f]"><BiSolidLock/> Smart Contract</p>
              <div className="bg-gray-900 border-2 border-pharos-orange rounded-lg px-4 py-3 font-mono text-xs md:text-sm break-all">
                {raffle.address}
              </div>
              <button
                onClick={handleCopyClick}
                className="cursor-pointer mt-3 flex items-center gap-2 text-[#f3a20f] hover:text-pharos-orange font-rubik font-bold text-sm uppercase transition-colors duration-200"
              >
                {copied ? (
                  <span className="text-green-500 flex items-center gap-1">
                    Copied! <FaCheckCircle />
                  </span>
                ) : (
                  <>
                    <FaCopy/> Copy Address
                  </>
                )}
              </button>
            </div>

            {/* Winner Display */}
            {raffle.winner !== '0x0000000000000000000000000000000000000000' && (
              <div className="bg-green-500 text-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-6 mb-6">
                <p className="text-lg font-rubik font-black uppercase mb-2">🎉 Winner!</p>
                <div className="bg-green-600 border-2 border-white rounded-lg px-4 py-3 font-mono text-sm break-all">
                  {raffle.winner}
                </div>
              </div>
            )}

            {/* Success Message */}
            {buyTicketsSuccess && (
              <div className="bg-green-500 text-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-6 mb-6">
                <p className="text-xl font-rubik font-black uppercase mb-2">🎉 Success!</p>
                <p className="text-base font-rubik font-bold">{buyTicketsSuccess}</p>
              </div>
            )}

            {/* Error Message */}
            {buyTicketsError && (
              <div className="bg-red-500 text-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-6 mb-6">
                <p className="text-xl font-rubik font-black uppercase mb-2">❌ Error</p>
                <p className="text-base font-rubik font-bold">{buyTicketsError}</p>
              </div>
            )}

            {/* Buy Tickets Button */}
            {!isExpired ? (
              <div className="space-y-4">
                <Button
                  color="pharos-orange"
                  shape="medium-rounded"
                  className="text-xl flex gap-2 items-center justify-center md:text-2xl py-6 px-8 w-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => buyTickets(1)}
                  disabled={isBuyingTickets}
                >
                  {isBuyingTickets ? (
                    <>
                      <AiOutlineLoading3Quarters className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <IoTicketSharp /> Buy 1 Ticket
                    </>
                  )}
                </Button>
                
                {/* Additional ticket options */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    color="pharos-orange"
                    shape="medium-rounded"
                    className="text-lg flex gap-2 items-center justify-center py-4 px-6 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => buyTickets(2)}
                    disabled={isBuyingTickets}
                  >
                    {isBuyingTickets ? (
                      <AiOutlineLoading3Quarters className="animate-spin" />
                    ) : (
                      <>
                        <IoTicketSharp /> Buy 2 Tickets
                      </>
                    )}
                  </Button>
                  
                  <Button
                    color="pharos-orange"
                    shape="medium-rounded"
                    className="text-lg flex gap-2 items-center justify-center py-4 px-6 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => buyTickets(5)}
                    disabled={isBuyingTickets}
                  >
                    {isBuyingTickets ? (
                      <AiOutlineLoading3Quarters className="animate-spin" />
                    ) : (
                      <>
                        <IoTicketSharp /> Buy 5 Tickets
                      </>
                    )}
                  </Button>
                </div>
                
                {/* Transaction Info */}
                {isBuyingTickets && (
                  <div className="bg-blue-500 text-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-4">
                    <p className="text-base font-rubik font-bold text-center">
                      🔄 Transaction in progress... Please confirm in MetaMask
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-500 text-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-6 text-center">
                <p className="text-xl font-rubik font-black uppercase">Raffle Closed</p>
                <p className="text-base font-rubik font-bold mt-2">
                  {raffle.winner !== '0x0000000000000000000000000000000000000000' ? 'Winner has been selected!' : 'No winner yet'}
                </p>
              </div>
            )}

            {/* Additional Info */}
            <div className="mt-6 bg-white/50 border-2 border-black rounded-lg p-4">
              <p className="text-xs font-rubik text-gray-600 text-center">
                ⚡ Powered by PYUSD • Fair & transparent draw • Instant payout • Max {raffle.maxTicketsPerUser} tickets per user
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndividualRaffle;

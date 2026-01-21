"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Button from '@/Components/UI/Button';
import Link from 'next/link';
import { ethers } from 'ethers';
import pyusd from "@/app/assets/pyusd.png";
import { FaArrowRight } from 'react-icons/fa6';
import RaffleSliderSkeleton from '../SkeletonLoader/RaffleSliderSkeleton';

// Contract addresses
const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "0x1234567890123456789012345678901234567890";

// MongoDB raffle interface
interface MongoRaffle {
  contractAddress: string;
  imageUrl: string;
}

// Live raffle interface
interface LiveRaffle {
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
  participants: number;
  imageUrl?: string;
}

const RaffleSlider: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [liveRaffles, setLiveRaffles] = useState<LiveRaffle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate time remaining for each raffle dynamically
  const [timeRemainingState, setTimeRemainingState] = useState<{
    days: string;
    hours: string;
    minutes: string;
    seconds: string;
  }[]>([]);

  // Helper function to calculate time remaining
  const calculateTimeRemaining = (endTime: number) => {
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = endTime - now;
    
    if (timeLeft <= 0) {
      return { days: '00', hours: '00', minutes: '00', seconds: '00' };
    }
    
    const days = Math.floor(timeLeft / 86400);
    const hours = Math.floor((timeLeft % 86400) / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const seconds = timeLeft % 60;
    
    return {
      days: days.toString().padStart(2, '0'),
      hours: hours.toString().padStart(2, '0'),
      minutes: minutes.toString().padStart(2, '0'),
      seconds: seconds.toString().padStart(2, '0')
    };
  };

  // Get provider with fallback endpoints
  const getProvider = () => {
    // Try multiple RPC endpoints for better reliability
    const rpcEndpoints = [
      'https://sepolia-rollup.arbitrum.io/rpc',
      'https://arbitrum-sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', // Infura fallback
      'https://sepolia-rollup.arbitrum.io/rpc' // Alchemy fallback (you can add your own)
    ];
    
    // For now, use the first endpoint but we'll add retry logic
    return new ethers.JsonRpcProvider(rpcEndpoints[0], undefined, {
      staticNetwork: true,
      batchMaxCount: 1, // Reduce batch size to avoid timeouts
    });
  };

  // Helper function to get participant count efficiently
  const getParticipantCount = async (raffleContract: ethers.Contract): Promise<number> => {
    try {
      // Use a more efficient approach - try common array lengths first
      const commonLengths = [0, 1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 300, 500, 1000];
      let maxValidIndex = -1;
      
      // First, try to find the approximate range
      for (const length of commonLengths) {
        try {
          await raffleContract.entrants(length);
          maxValidIndex = length;
        } catch (error) {
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
        return left;
      } else {
        return 0;
      }
        } catch {
          console.warn('⚠️ Could not get participant count');
          return 0;
        }
  };

  // Helper function to retry RPC calls with timeout
  const retryRpcCall = async (
    operation: () => Promise<unknown>,
    maxRetries: number = 3,
    delay: number = 1000,
    timeout: number = 10000
  ): Promise<unknown> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Add timeout to the operation
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), timeout);
        });
        
        return await Promise.race([operation(), timeoutPromise]);
      } catch (error) {
        console.warn(`⚠️ RPC call attempt ${attempt} failed`);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
      }
    }
    throw new Error('Max retries exceeded');
  };

  // Fetch live raffles from smart contracts and merge images from MongoDB
  const fetchLiveRaffles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔄 Fetching live raffles from smart contracts...');
      
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
        "function prizeAmount() external view returns (uint256)",
        "function entrants(uint256) external view returns (address)"
      ];
      
      const factory = new ethers.Contract(FACTORY_ADDRESS, factoryAbi, provider);
      
      // Get all raffle addresses with retry logic
      let raffleAddresses: string[] = [];
      try {
        // Check if contract exists with retry
        const code = await retryRpcCall(() => provider.getCode(FACTORY_ADDRESS));
        if (code === '0x') {
          console.log('⚠️ Factory contract not found at address:', FACTORY_ADDRESS);
          setLiveRaffles([]);
          return;
        }
        
        // Get raffle addresses with retry
        raffleAddresses = await retryRpcCall(() => factory.getRaffles()) as string[];
        console.log('📋 Found raffle addresses:', raffleAddresses.length);
      } catch (error) {
        console.error('❌ Error fetching raffle addresses after retries:', error);
        setError('Failed to connect to blockchain. Please check your network connection and try again.');
        setLiveRaffles([]);
        return;
      }
      
      // Filter for active raffles only
      const activeRaffles: LiveRaffle[] = [];
      
      for (const address of raffleAddresses as string[]) {
        try {
          const raffleContract = new ethers.Contract(address, raffleAbi, provider);
          
          // Fetch raffle data with retry logic
          const raffleData = await retryRpcCall(() => Promise.all([
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
          ])) as [string, bigint, bigint, bigint, bigint, boolean, string, bigint, bigint, bigint];
          
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
          ] = raffleData;
          
          // Get participant count
          const participants = await getParticipantCount(raffleContract);
          
          // Only include active raffles (not closed and not expired)
          const now = Math.floor(Date.now() / 1000);
          if (!isClosed && endTime > now) {
            activeRaffles.push({
              address,
              title,
              description: title, // Use title as description for now
              pricePerTicket: ethers.formatEther(ticketPrice),
              totalTickets: Number(maxTickets),
              ticketsSold: Number(ticketsSold),
              endTime: Number(endTime),
              startTime: Number(endTime) - (7 * 24 * 60 * 60), // Assume 7 days duration
              isClosed,
              winner: winner === '0x0000000000000000000000000000000000000000' ? '' : winner,
              maxTicketsPerUser: Number(maxTicketsPerUser),
              houseFeePercentage: Number(houseFeePercentage),
              prizeAmount: ethers.formatEther(prizeAmount),
              participants: participants
            });
          }
        } catch (error) {
          console.error(`❌ Error fetching raffle ${address} after retries:`, error);
          // Continue with other raffles even if one fails
        }
      }
      
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
              }
            });
            
            // Merge images into raffle data
            const rafflesWithImages = activeRaffles.map(raffle => ({
              ...raffle,
              imageUrl: imageMap.get(raffle.address.toLowerCase()) || undefined
            }));
            
            setLiveRaffles(rafflesWithImages);
            console.log('✅ Loaded live raffles with images:', rafflesWithImages.length);
            return;
          }
        }
      } catch (mongoError) {
        console.log('⚠️ Could not fetch images from MongoDB:', mongoError);
      }
      
      // If MongoDB fails, just use smart contract data without images
      setLiveRaffles(activeRaffles);
      console.log('✅ Loaded live raffles from smart contracts only:', activeRaffles.length);

    } catch (error) {
      console.error('Error fetching live raffles:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch live raffles';
      
      // If it's a network/RPC error, show a more user-friendly message
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('timeout') || errorMessage.includes('network')) {
        setError('Unable to connect to the blockchain. This might be due to network issues or the blockchain being temporarily unavailable. Please try again later.');
      } else {
        setError(errorMessage);
      }
      
      // Set empty array so the component shows the "no raffles" state
      setLiveRaffles([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch live raffles on component mount
    fetchLiveRaffles();
  }, []); // Only run on mount

  useEffect(() => {
    // Set up intervals for slide rotation and countdown updates
    const slideInterval = setInterval(() => {
      if (liveRaffles.length > 0) {
        setCurrentSlide((prevSlide) => (prevSlide + 1) % liveRaffles.length);
      }
    }, 5000); // Change slide every 5 seconds

    // Update countdown every second based on actual end times
    const countdownInterval = setInterval(() => {
      if (liveRaffles.length > 0) {
      setTimeRemainingState(
          liveRaffles.map(raffle => calculateTimeRemaining(raffle.endTime))
      );
      }
    }, 1000);

    return () => {
      clearInterval(slideInterval);
      clearInterval(countdownInterval);
    };
  }, [liveRaffles.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="relative w-full overflow-hidden border-b-4 border-black bg-white py-14 xs:py-24">
        <h2 className="text-4xl xs:text-5xl xl:text-6xl font-rubik font-black uppercase text-center text-black mb-28 drop-shadow-[4px_4px_0px_rgba(0,0,0,0.2)]">
          Live Raffles
        </h2>
        <RaffleSliderSkeleton/>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="relative w-full overflow-hidden border-b-4 border-black bg-white py-14 xs:py-24">
        <h2 className="text-4xl xs:text-5xl xl:text-6xl font-rubik font-black uppercase text-center text-black mb-28 drop-shadow-[4px_4px_0px_rgba(0,0,0,0.2)]">
          Live Raffles
        </h2>
        <div className="flex justify-center items-center px-3 xs:px-4 bp-xs:px-6 md:px-8 lg:px-12">
          <div className="flex flex-col items-center justify-center py-20 max-w-2xl text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <span className="text-xl font-rubik font-semibold text-red-600 mb-4">Unable to Load Live Raffles</span>
            <p className="text-gray-600 text-center mb-6 leading-relaxed">{error}</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                color="pharos-orange"
                shape="medium-rounded"
                className="px-6 py-3 font-black uppercase"
                onClick={fetchLiveRaffles}
              >
                Try Again
              </Button>
              <Button
                color="pharos-yellow"
                shape="medium-rounded"
                className="px-6 py-3 font-black uppercase"
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show no raffles state
  if (liveRaffles.length === 0) {
    return (
      <div className="relative w-full overflow-hidden border-b-4 border-black bg-white py-14 xs:py-24">
        <h2 className="text-4xl xs:text-5xl xl:text-6xl font-rubik font-black uppercase text-center text-black mb-28 drop-shadow-[4px_4px_0px_rgba(0,0,0,0.2)]">
          Live Raffles
        </h2>
        <div className="flex justify-center items-center px-3 xs:px-4 bp-xs:px-6 md:px-8 lg:px-12">
          <div className="flex flex-col items-center justify-center py-20">
            <span className="text-xl font-rubik font-semibold text-gray-600 mb-4">No active raffles at the moment</span>
            <p className="text-gray-500 text-center">Check back later for new raffles!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden border-b-4 border-black bg-white py-14 xs:py-24">
      <h2 className="text-4xl xs:text-5xl xl:text-6xl font-rubik font-black uppercase text-center text-black mb-28 drop-shadow-[4px_4px_0px_rgba(0,0,0,0.2)]">
        Live Raffles
      </h2>
      <div className="flex justify-center items-center px-3 xs:px-4 bp-xs:px-6 md:px-8 lg:px-12">
        <div
          className="flex gap-4 transition-transform duration-500 ease-in-out w-[90%] lg:w-full"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {liveRaffles.map((raffle, index) => (
            <div key={raffle.address} className="w-full shrink-0 flex justify-center">
              <div className="relative bg-gradient-to-br from-white to-gray-50 border-2 xs:border-3 md:border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,0.8)] xs:shadow-[6px_6px_0px_rgba(0,0,0,0.8)] md:shadow-[8px_8px_0px_rgba(0,0,0,0.8)] rounded-lg xs:rounded-xl overflow-hidden w-full max-w-6xl">
                <Link href={`/raffle/${raffle.address}`} className="block group">
                  <div className="flex flex-col md:flex-row gap-3 xs:gap-4 bp-xs:gap-5 md:gap-8 p-3 xs:p-4 bp-xs:p-5 md:p-10">
                    {/* Left Content Section - Takes majority of space */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-xl xs:text-2xl bp-xs:text-3xl md:text-4xl lg:text-5xl font-rubik font-black uppercase text-black mb-3 xs:mb-4 bp-xs:mb-5 md:mb-6 leading-tight drop-shadow-[2px_2px_0px_rgba(0,0,0,0.1)] md:drop-shadow-[3px_3px_0px_rgba(0,0,0,0.1)]">
                          {raffle.title}
                        </h3>

                        <div className="bg-pharos-orange/10 border-l-2 xs:border-l-3 md:border-l-4 border-pharos-orange px-2 xs:px-3 bp-xs:px-4 py-2 xs:py-2.5 bp-xs:py-3 mb-3 xs:mb-4 bp-xs:mb-5 md:mb-6 rounded">
                          <p className="text-xs xs:text-sm bp-xs:text-base md:text-lg font-semibold text-gray-700 mb-0.5 xs:mb-1 font-rubik">
                            Ticket Price
                          </p>
                          <div className='flex items-center gap-1'>
                          <Image src={pyusd} alt="PYUSD" width={40} height={40} className='size-5 xs:size-6 bp-xs:size-7 md:size-8 object-contain'/>
                          <p className="text-lg xs:text-xl bp-xs:text-2xl md:text-3xl font-black text-pharos-orange font-rubik">
                            {raffle.pricePerTicket} PYUSD
                          </p>
                          </div>
                        </div>

                        {/* Countdown Timer */}
                        <div className="mb-3 xs:mb-4 bp-xs:mb-5 md:mb-6">
                          <p className="text-xs bp-xs:text-sm md:text-base font-bold text-gray-600 uppercase mb-2 xs:mb-2.5 bp-xs:mb-3 tracking-wide font-rubik">
                            Time Remaining
                          </p>
                          <div className="flex items-center space-x-1.5 xs:space-x-2 bp-xs:space-x-3 md:space-x-4 font-rubik">
                            {/* Days */}
                            <div className="flex flex-col items-center">
                              <div className="bg-[#f3a20f] text-white border border-black xs:border-2 rounded-md xs:rounded-lg px-1.5 xs:px-2 bp-xs:px-3 md:px-4 py-1.5 xs:py-2 bp-xs:py-2.5 md:py-3 text-lg xs:text-xl bp-xs:text-2xl md:text-3xl lg:text-4xl font-bold shadow-[2px_2px_0px_#000] xs:shadow-[3px_3px_0px_#000] md:shadow-[4px_4px_0px_#000] min-w-[45px] xs:min-w-[50px] bp-xs:min-w-[60px] md:min-w-[70px] text-center">
                                {timeRemainingState[index]?.days || '00'}
                              </div>
                              <span className="text-[10px] xs:text-xs md:text-sm font-bold text-black uppercase mt-1 xs:mt-1.5 md:mt-2">Days</span>
                            </div>

                            <div className="text-lg xs:text-xl bp-xs:text-2xl md:text-3xl lg:text-4xl font-bold text-pharos-orange">:</div>

                            {/* Hours */}
                            <div className="flex flex-col items-center">
                            <div className="bg-[#f3a20f] text-white border border-black xs:border-2 rounded-md xs:rounded-lg px-1.5 xs:px-2 bp-xs:px-3 md:px-4 py-1.5 xs:py-2 bp-xs:py-2.5 md:py-3 text-lg xs:text-xl bp-xs:text-2xl md:text-3xl lg:text-4xl font-bold shadow-[2px_2px_0px_#000] xs:shadow-[3px_3px_0px_#000] md:shadow-[4px_4px_0px_#000] min-w-[45px] xs:min-w-[50px] bp-xs:min-w-[60px] md:min-w-[70px] text-center">
                                {timeRemainingState[index]?.hours || '00'}
                              </div>
                              <span className="text-[10px] xs:text-xs md:text-sm font-bold text-black uppercase mt-1 xs:mt-1.5 md:mt-2">Hours</span>
                            </div>

                            <div className="text-lg xs:text-xl bp-xs:text-2xl md:text-3xl lg:text-4xl font-bold text-pharos-orange">:</div>

                            {/* Minutes */}
                            <div className="flex flex-col items-center">
                            <div className="bg-[#f3a20f] text-white border border-black xs:border-2 rounded-md xs:rounded-lg px-1.5 xs:px-2 bp-xs:px-3 md:px-4 py-1.5 xs:py-2 bp-xs:py-2.5 md:py-3 text-lg xs:text-xl bp-xs:text-2xl md:text-3xl lg:text-4xl font-bold shadow-[2px_2px_0px_#000] xs:shadow-[3px_3px_0px_#000] md:shadow-[4px_4px_0px_#000] min-w-[45px] xs:min-w-[50px] bp-xs:min-w-[60px] md:min-w-[70px] text-center">
                                {timeRemainingState[index]?.minutes || '00'}
                              </div>
                              <span className="text-[10px] xs:text-xs md:text-sm font-bold text-black uppercase mt-1 xs:mt-1.5 md:mt-2">Mins</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Button
                        color="pharos-orange"
                        shape="medium-rounded"
                        className="w-full flex gap-2 items-center justify-center md:w-auto text-sm xs:text-base bp-xs:text-lg md:text-xl py-2.5 xs:py-3 bp-xs:py-3.5 md:py-4 px-4 xs:px-5 bp-xs:px-6 md:px-8 mt-3 xs:mt-4 bp-xs:mt-5 md:mt-6 font-black uppercase"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent Link from triggering twice
                        }}
                      >
                        View Raffle <FaArrowRight />
                      </Button>
                    </div>

                    {/* Right Image Section - Compact size with 1:1 ratio */}
                    <div className="relative w-full xs:max-w-[200px] bp-xs:max-w-[240px] md:w-[280px] lg:w-[320px] aspect-square h-fit shrink-0 rounded-lg xs:rounded-xl overflow-hidden border-2 xs:border-3 md:border-4 border-black bg-white shadow-[4px_4px_0px_rgba(0,0,0,0.8)] xs:shadow-[6px_6px_0px_rgba(0,0,0,0.8)] md:shadow-[8px_8px_0px_rgba(0,0,0,0.8)] mx-auto md:mx-0">
                      {raffle.imageUrl ? (
                      <Image
                          src={raffle.imageUrl}
                          alt={`Raffle ${raffle.title}`}
                          fill
                          className="transition-transform duration-300 group-hover:scale-110 group-hover:rotate-2 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pharos-orange/20 to-pharos-yellow/20">
                          <div className="text-center">
                            <div className="text-4xl mb-2">🎟️</div>
                            <p className="text-sm font-rubik font-bold text-gray-700">No Image</p>
                          </div>
                        </div>
                      )}
                      {/* Browser-style top bar */}
                      <div className="absolute top-0 left-0 w-full h-5 xs:h-6 bp-xs:h-7 md:h-8 bg-gray-200 border-b border-black xs:border-b-2 flex items-center px-1.5 xs:px-2 space-x-1 xs:space-x-1.5 bp-xs:space-x-2">
                        <span className="w-2 h-2 xs:w-2.5 xs:h-2.5 bp-xs:w-3 bp-xs:h-3 bg-red-500 rounded-full border border-gray-600"></span>
                        <span className="w-2 h-2 xs:w-2.5 xs:h-2.5 bp-xs:w-3 bp-xs:h-3 bg-yellow-500 rounded-full border border-gray-600"></span>
                        <span className="w-2 h-2 xs:w-2.5 xs:h-2.5 bp-xs:w-3 bp-xs:h-3 bg-green-500 rounded-full border border-gray-600"></span>
                        <div className="flex-1 bg-white border border-gray-400 rounded-sm xs:rounded-md h-3 xs:h-4 bp-xs:h-5 ml-2 xs:ml-3 bp-xs:ml-4"></div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Dots */}
      <div className="flex justify-center mt-8 space-x-3">
        {liveRaffles.map((_, index) => (
          <button
            key={index}
            className={`w-4 h-4 rounded-full border-2 border-black transition-all duration-300
                        ${index === currentSlide ? 'bg-pharos-orange shadow-[2px_2px_0px_#000]' : 'bg-gray-300 hover:bg-pharos-yellow'}`}
            onClick={() => goToSlide(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default RaffleSlider;
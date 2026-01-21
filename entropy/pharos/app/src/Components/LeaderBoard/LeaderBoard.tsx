"use client";
import React, { useState, useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import { FaTrophy, FaMedal, FaTicketAlt, FaArrowRight } from 'react-icons/fa';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import Image, { StaticImageData } from 'next/image';
import Link from 'next/link';

import { ethers } from 'ethers';
import user1 from "@/app/assets/Leaderboard/user1.svg";
import user2 from "@/app/assets/Leaderboard/user2.svg";
import user3 from "@/app/assets/Leaderboard/user3.svg";
import LeaderBoardSkeleton from '../SkeletonLoader/LeaderBoardSkeleton';

// Contract addresses
const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "0x0000000000000000000000000000000000000000";
console.log(FACTORY_ADDRESS);
// Interface for real leaderboard user
interface LeaderboardUser {
  id: string;
  name?: string;
  address: string;
  profileImage: StaticImageData; // StaticImageData
  rafflesJoined: number;
  rafflesWon: number;
  totalSpent: string; // In PYUSD
  winRate: number; // Percentage
  rank: number;
}

const LeaderBoard = () => {
  const [mounted, setMounted] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [leaderboardUsers, setLeaderboardUsers] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    fetchLeaderboardData();
  }, []);

  const getProvider = () => {
    // Always use direct RPC to ensure we're on the correct network
    return new ethers.JsonRpcProvider('https://sepolia-rollup.arbitrum.io/rpc');
  };

  const fetchLeaderboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
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
        "function isClosed() external view returns (bool)",
        "function winner() external view returns (address)",
        "function entrants(uint256) external view returns (address)",
        "function entrantTickets(address) external view returns (uint256)"
      ];
      
      const factory = new ethers.Contract(FACTORY_ADDRESS, factoryAbi, provider);
      
      // Get all raffle addresses with better error handling
      let raffleAddresses: string[] = [];
      try {
        raffleAddresses = await factory.getRaffles();
        console.log('Found raffles for leaderboard:', raffleAddresses.length);
      } catch (error) {
        console.error('Error calling getRaffles():', error);
        
        // Check if it's a decoding error (empty result)
        if (error instanceof Error && error.message.includes('could not decode result data') && error.message.includes('value="0x"')) {
          console.log('ℹ️ Factory contract returned empty data - no raffles exist yet');
          raffleAddresses = []; // Empty array
        } else {
          throw error; // Re-throw other errors
        }
      }
      
      // If no raffles, return empty leaderboard
      if (raffleAddresses.length === 0) {
        console.log('No raffles found, returning empty leaderboard');
        setLeaderboardUsers([]);
        setIsLoading(false);
        return;
      }
      
      // Track user statistics
      const userStats = new Map<string, {
        address: string;
        rafflesJoined: number;
        rafflesWon: number;
        totalSpent: bigint;
        totalTickets: number;
      }>();
      
      // Process each raffle
      for (const raffleAddress of raffleAddresses) {
        try {
          console.log(`Processing raffle: ${raffleAddress}`);
          const raffleContract = new ethers.Contract(raffleAddress, raffleAbi, provider);
          
          const [
            ticketPrice,
            totalTicketsSold,
            isClosed,
            winner
          ] = await Promise.all([
            raffleContract.ticketPrice().catch(() => 0),
            raffleContract.totalTicketsSold().catch(() => 0),
            raffleContract.isClosed().catch(() => false),
            raffleContract.winner().catch(() => "0x0000000000000000000000000000000000000000")
          ]);
          
          console.log(`Raffle ${raffleAddress} data:`, {
            ticketPrice: ticketPrice.toString(),
            totalTicketsSold: totalTicketsSold.toString(),
            isClosed,
            winner
          });
          
          // Get entrants by trying to access them until we get an error
          const entrants: string[] = [];
          let i = 0;
          while (true) {
            try {
              const entrantAddress = await raffleContract.entrants(i);
              entrants.push(entrantAddress);
              i++;
            } catch (error) {
              // Reached end of array or error occurred
              break;
            }
          }
          
          console.log(`Found ${entrants.length} entrants in raffle ${raffleAddress}:`, entrants);
          
          // Process each entrant
          for (const entrantAddress of entrants) {
            try {
              const userTickets = await raffleContract.entrantTickets(entrantAddress);
              
              console.log(`Entrant ${entrantAddress}: tickets: ${userTickets.toString()}`);
              
              if (userTickets > 0) {
                const address = entrantAddress.toLowerCase();
                const spent = ticketPrice * userTickets;
                const isWinner = winner.toLowerCase() === address;
                
                console.log(`Processing participant: ${address}, spent: ${spent.toString()}, isWinner: ${isWinner}`);
                
                if (!userStats.has(address)) {
                  userStats.set(address, {
                    address,
                    rafflesJoined: 0,
                    rafflesWon: 0,
                    totalSpent: BigInt(0),
                    totalTickets: 0
                  });
                }
                
                const stats = userStats.get(address)!;
                stats.rafflesJoined += 1;
                stats.totalSpent += BigInt(spent);
                stats.totalTickets += Number(userTickets);
                
                if (isWinner) {
                  stats.rafflesWon += 1;
                }
                
                console.log(`Updated stats for ${address}:`, stats);
              }
            } catch (entrantError) {
              console.log(`Error fetching tickets for entrant ${entrantAddress}:`, entrantError);
            }
          }
          
          if (entrants.length === 0 && Number(totalTicketsSold) > 0) {
            console.log(`Raffle has ${totalTicketsSold} tickets sold but no entrants found - this might be a contract issue`);
          }
        } catch (raffleError) {
          console.error(`Error fetching raffle ${raffleAddress}:`, raffleError);
        }
      }
      
      console.log('Final userStats Map:', Array.from(userStats.entries()));
      
      // Convert to leaderboard format
      const leaderboardData: LeaderboardUser[] = Array.from(userStats.values())
        .map((stats, index) => {
          const winRate = stats.rafflesJoined > 0 ? (stats.rafflesWon / stats.rafflesJoined) * 100 : 0;
          
          // Assign profile images based on index
          const profileImages = [user1, user2, user3];
          const profileImage = profileImages[index % profileImages.length];
          
          return {
            id: stats.address,
            address: `${stats.address.slice(0, 6)}...${stats.address.slice(-4)}`,
            profileImage,
            rafflesJoined: stats.rafflesJoined,
            rafflesWon: stats.rafflesWon,
            totalSpent: `${ethers.formatEther(stats.totalSpent)} PYUSD`,
            winRate,
            rank: index + 1
          };
        })
        .sort((a, b) => {
          // Sort by raffles won first, then by win rate
          if (b.rafflesWon !== a.rafflesWon) {
            return b.rafflesWon - a.rafflesWon;
          }
          return b.winRate - a.winRate;
        })
        .map((user, index) => ({ ...user, rank: index + 1 }));
      
      console.log('Leaderboard data:', leaderboardData);
      setLeaderboardUsers(leaderboardData);
      
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
      setError('Failed to load leaderboard data');
    } finally {
      setIsLoading(false);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 12,
      },
    },
  };

  // const getRankColor = (rank: number) => {
  //   if (rank === 1) return '#f3a20f'; // Gold - pharos yellow
  //   if (rank === 2) return '#94a3b8'; // Silver
  //   if (rank === 3) return '#cd7f32'; // Bronze
  //   return '#f97028'; // pharos orange for others
  // };

  // const getRankIcon = (rank: number) => {
  //   if (rank === 1) return <FaTrophy className="text-2xl" />;
  //   if (rank === 2) return <FaMedal className="text-2xl" />;
  //   if (rank === 3) return <FaMedal className="text-2xl" />;
  //   return <span className="text-xl font-black">#{rank}</span>;
  // };

  const getDisplayName = (user: LeaderboardUser) => {
    return user.name || user.address;
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-[#f3a20f]/20 via-white to-[#f97028]/10 py-12 px-4 md:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-rubik font-black uppercase text-black mb-4 drop-shadow-[6px_6px_0px_rgba(243,162,15,0.3)]">
            Leaderboard
          </h1>
          <p className="text-lg md:text-xl font-rubik font-semibold text-gray-700 max-w-2xl mx-auto">
            Top performers in the Pharos raffle ecosystem. The more you participate, the higher you climb!
          </p>
        </motion.div>

        {/* Loading State */}
        {isLoading && <LeaderBoardSkeleton />}

        {/* Error State */}
        {error && (
          <div className="text-center py-16">
            <div className="bg-red-100 border-4 border-red-500 shadow-[6px_6px_0px_rgba(0,0,0,1)] rounded-xl p-8 max-w-md mx-auto">
              <p className="text-xl font-rubik font-bold text-red-700 mb-4">Error Loading Leaderboard</p>
              <p className="text-lg font-rubik text-red-600 mb-6">{error}</p>
              <button
                onClick={fetchLeaderboardData}
                className="bg-[#f97028] border-4 border-black px-6 py-3 font-black text-white uppercase tracking-tight
                  shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000]
                  hover:translate-x-[2px] hover:translate-y-[2px]
                  active:shadow-none active:translate-x-[4px] active:translate-y-[4px]
                  transition-all duration-100"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && leaderboardUsers.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] rounded-xl p-8 max-w-md mx-auto">
              <p className="text-2xl font-rubik font-bold text-gray-700 mb-4">No Participants Yet</p>
              <p className="text-lg font-rubik text-gray-500 mb-6">Be the first to join a raffle and appear on the leaderboard!</p>
              <Link
                href="/raffle"
                className="flex w-fit mx-auto items-center justify-center gap-2 cursor-pointer font-bold uppercase tracking-wide transition-all duration-200 ease-in-out bg-[#f97028] text-white border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] rounded-lg px-8 py-3 font-rubik hover:shadow-[3px_3px_0px_#000] hover:translate-x-[3px] hover:translate-y-[3px]"
              >
                Browse Raffles <FaArrowRight />
              </Link>
            </div>
          </div>
        )}

        {/* Leaderboard Content */}
        {!isLoading && !error && leaderboardUsers.length > 0 && (
          <>
            {/* Top 3 Podium - Desktop Only */}
            <div className="hidden lg:block mb-16">
              <div className="flex items-end justify-center gap-4 max-w-4xl mx-auto">
                {/* 2nd Place */}
                {leaderboardUsers[1] && (
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="w-52"
                  >
                    <motion.div
                      whileHover={{ translateY: -4, boxShadow: '10px 10px 0px rgba(0,0,0,1)' }}
                      transition={{ type: 'spring', stiffness: 300 }}
                      className="bg-[#f3a20f] border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,1)] rounded-xl overflow-hidden"
                    >
                      {/* Profile Image Section */}
                      <div className="bg-white border-b-6 border-black p-6 flex justify-center">
                        <div className="size-20 rounded-full border-4 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] overflow-hidden bg-white flex items-center justify-center">
                          <Image src={leaderboardUsers[1].profileImage} alt="" className='w-full h-full object-cover'/>
                        </div>
                      </div>

                      {/* Name Section */}
                      <div className="p-6 pb-8">
                        <h3 className="text-2xl font-rubik font-black text-white text-center mb-4 truncate">
                          {getDisplayName(leaderboardUsers[1])}
                        </h3>

                        {/* Rank Number at Bottom */}
                        <div className="flex justify-center">
                          <div className="size-12 bg-white border-3 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] rounded-full flex items-center justify-center">
                            <span className="text-2xl font-bold text-black">2</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}

                {/* 1st Place - Taller */}
                {leaderboardUsers[0] && (
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="w-56"
                  >
                    <motion.div
                      whileHover={{ translateY: -4, boxShadow: '12px 12px 0px rgba(0,0,0,1)' }}
                      transition={{ type: 'spring', stiffness: 300 }}
                      className="bg-[#f97028] border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] rounded-xl relative"
                    >
                      {/* Crown decoration */}
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-5xl z-10">👑</div>

                      {/* Profile Image Section */}
                      <div className="bg-white rounded-t-lg border-b-4 border-black p-8 flex justify-center">
                        <div className="size-24 rounded-full border-6 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] overflow-hidden bg-white flex items-center justify-center">
                          <Image src={leaderboardUsers[0].profileImage} alt="" className='w-full h-full object-cover'/>
                        </div>
                      </div>

                      {/* Name Section */}
                      <div className="p-6 pb-10">
                        <h3 className="text-3xl font-rubik font-black text-white text-center mb-6 truncate">
                          {getDisplayName(leaderboardUsers[0])}
                        </h3>

                        {/* Rank Number at Bottom */}
                        <div className="flex justify-center">
                          <div className="size-16 bg-white border-3 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] rounded-full flex items-center justify-center">
                            <span className="text-4xl font-bold text-black">1</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}

                {/* 3rd Place */}
                {leaderboardUsers[2] && (
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="w-48"
                  >
                    <motion.div
                      whileHover={{ translateY: -4, boxShadow: '10px 10px 0px rgba(0,0,0,1)' }}
                      transition={{ type: 'spring', stiffness: 300 }}
                      className="bg-[#8b5cf6] border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] rounded-xl overflow-hidden"
                    >
                      {/* Profile Image Section */}
                      <div className="bg-white border-b-4 border-black p-6 flex justify-center">
                        <div className="size-20 rounded-full border-6 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] overflow-hidden bg-white flex items-center justify-center">
                          <Image src={leaderboardUsers[2].profileImage} alt="" className='w-full h-full object-cover'/>
                        </div>
                      </div>

                      {/* Name Section */}
                      <div className="p-6 pb-8">
                        <h3 className="text-xl font-rubik font-black text-white text-center mb-4 truncate">
                          {getDisplayName(leaderboardUsers[2])}
                        </h3>

                        {/* Rank Number at Bottom */}
                        <div className="flex justify-center">
                          <div className="size-12 bg-white border-3 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] rounded-full flex items-center justify-center">
                            <span className="text-2xl font-bold text-black">3</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Leaderboard List */}
            <div className="bg-white border-6 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] rounded-xl overflow-hidden">
              {/* Table Header - Desktop */}
              <div className="hidden md:block bg-black text-white border-b-6 border-black p-6">
                <div className="grid grid-cols-12 gap-4 font-rubik font-black uppercase text-sm">
                  <div className="col-span-1 text-center">Rank</div>
                  <div className="col-span-4">Player</div>
                  <div className="col-span-2 text-center">Raffles Joined</div>
                  <div className="col-span-2 text-center">Raffles Won</div>
                  <div className="col-span-3 text-center">Win Rate</div>
                </div>
              </div>

              {/* User Rows */}
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate={mounted ? 'visible' : 'hidden'}
              >
                {leaderboardUsers.map((user) => (
                  <motion.div
                    key={user.id}
                    variants={itemVariants}
                    onHoverStart={() => setHoveredId(user.id)}
                    onHoverEnd={() => setHoveredId(null)}
                    className={`border-b-4 border-black last:border-b-0 transition-all duration-300 ${
                      hoveredId !== user.id ? 'bg-linear-to-br from-[#f97028]/10 via-white to-[#f3a20f]/20' : 'bg-white'
                    }`}
                  >
                    {/* Desktop Layout */}
                    <div className="hidden md:block p-6">
                      <div className="grid grid-cols-12 gap-4 items-center">
                        {/* Rank */}
                        <div className="col-span-1 flex justify-center">
                          <div className="text-3xl font-rubik font-black text-black">
                            {user.rank}
                          </div>
                        </div>

                        {/* Player Info */}
                        <div className="col-span-4 flex items-center gap-4">
                          <div className="w-16 h-16 rounded-full border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] overflow-hidden">
                            <Image src={user.profileImage} alt="" className='w-full h-full object-cover'/>
                          </div>
                          <div>
                            <h3 className="text-xl font-rubik font-black text-black">
                              {getDisplayName(user)}
                            </h3>
                            {user.name && (
                              <p className="text-sm font-rubik font-medium text-gray-600">
                                {user.address}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Raffles Joined */}
                        <div className="col-span-2 flex items-center justify-center gap-2">
                          <span className="text-3xl font-rubik font-black text-black">
                            {user.rafflesJoined}
                          </span>
                        </div>

                        {/* Raffles Won */}
                        <div className="col-span-2 flex items-center justify-center gap-2">
                          <span className="text-3xl font-rubik font-black text-black">
                            {user.rafflesWon}
                          </span>
                        </div>

                        {/* Win Rate */}
                        <div className="col-span-3 flex justify-center">
                          <div className="bg-[#f97028] border-3 border-black rounded-lg px-6 py-2 shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                            <span className="text-3xl font-rubik font-black text-white">
                              {user.winRate.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Layout */}
                    <div className="md:hidden p-6 space-y-4">
                      {/* Rank and Player */}
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-rubik font-black text-black shrink-0">
                          #{user.rank}
                        </div>
                        <div className="w-14 h-14 rounded-full border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] overflow-hidden shrink-0">
                          <Image src={user.profileImage} alt="" className="w-full h-full object-cover"/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-rubik font-black text-black truncate">
                            {getDisplayName(user)}
                          </h3>
                          {user.name && (
                            <p className="text-xs font-rubik font-medium text-gray-600 truncate">
                              {user.address}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-linear-to-r from-[#f3a20f]/20 to-[#f97028]/20 border-3 border-black px-3 py-2 rounded-lg text-center">
                          <FaTicketAlt className="text-[#f97028] mx-auto mb-1" />
                          <div className="text-xl font-rubik font-black text-black">
                            {user.rafflesJoined}
                          </div>
                          <div className="text-xs font-rubik font-bold text-gray-600">Joined</div>
                        </div>
                        <div className="bg-linear-to-r from-green-100 to-emerald-100 border-3 border-black px-3 py-2 rounded-lg text-center">
                          <FaTrophy className="text-green-600 mx-auto mb-1" />
                          <div className="text-xl font-rubik font-black text-black">
                            {user.rafflesWon}
                          </div>
                          <div className="text-xs font-rubik font-bold text-gray-600">Won</div>
                        </div>
                        <div className="bg-[#f97028] border-3 border-black px-3 py-2 rounded-lg text-center shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                          <div className="text-xl font-rubik font-black text-white">
                            {user.winRate.toFixed(1)}%
                          </div>
                          <div className="text-xs font-rubik font-bold text-white/80">Rate</div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Bottom CTA */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="mt-16 text-center"
            >
              <div className="bg-white text-black border-6 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] rounded-xl p-8 max-w-2xl mx-auto">
                <h3 className="text-3xl font-rubik font-black uppercase mb-4">
                  Want to climb the ranks?
                </h3>
                <p className="text-lg font-rubik font-semibold mb-6">
                  Join more raffles and increase your chances of winning to move up the leaderboard!
                </p>
                <Link
                  href="/raffle"
                  className="flex w-fit mx-auto items-center justify-center gap-2 cursor-pointer font-bold uppercase tracking-wide transition-all duration-200 ease-in-out bg-[#f97028] text-white border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] rounded-lg px-8 py-3 font-rubik hover:shadow-[3px_3px_0px_#000] hover:translate-x-[3px] hover:translate-y-[3px]"
                >
                  Browse Raffles <FaArrowRight />
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

export default LeaderBoard;
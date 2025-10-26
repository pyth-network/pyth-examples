"use client";
import React, { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
// import { useRouter } from 'next/navigation'
import Image from "next/image";
import user1 from "@/app/assets/Leaderboard/user1.svg";
import { IoCopy } from "react-icons/io5";
import { MdVerified } from "react-icons/md";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { ethers } from "ethers";
import ProfileRafflesSkeleton from "../SkeletonLoader/ProfileRafflesSkeleton";

// Contract addresses
const FACTORY_ADDRESS =
  process.env.NEXT_PUBLIC_FACTORY_ADDRESS ||
  "0xa35c500A2F835a28ecd1590E7b3B8a801c151272";
// const PYUSD_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_PYUSD_TOKEN_ADDRESS || "0x79Bd6F9E7B7B25B343C762AE5a35b20353b2CCb8";

// MongoDB raffle interface
interface MongoRaffle {
  contractAddress: string;
  imageUrl: string;
}

// Interface for user raffle participation
interface UserRaffleParticipation {
  address: string;
  title: string;
  image: string;
  imageUrl?: string; // Add MongoDB image URL field
  entryDate: string;
  tickets: number;
  status: "ongoing" | "ended" | "closed";
  prizeValue: string;
  isWinner: boolean;
  prizeClaimed?: boolean;
  endTime: number;
}

const ProfilePage = () => {
  const { authenticated, user, login } = usePrivy();
  // const router = useRouter()
  const [copySuccess, setCopySuccess] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [participatedRaffles, setParticipatedRaffles] = useState<
    UserRaffleParticipation[]
  >([]);
  const [wonRaffles, setWonRaffles] = useState<UserRaffleParticipation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authenticated) {
      setShowWalletModal(true);
    } else {
      setShowWalletModal(false);
      if (user?.wallet?.address) {
        fetchUserRaffleData();
      }
    }
  }, [authenticated, user]);

  const getProvider = () => {
    // Always use direct RPC to ensure we're on the correct network
    return new ethers.JsonRpcProvider("https://sepolia-rollup.arbitrum.io/rpc");
  };

  const fetchUserRaffleData = async () => {
    if (!user?.wallet?.address) return;

    try {
      setIsLoading(true);
      setError(null);

      const provider = getProvider();
      const userAddress = user.wallet.address.toLowerCase();

      // RaffleFactory ABI
      const factoryAbi = [
        "function getRaffles() external view returns (address[] memory)",
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
        "function maxTicketsPerUser() external view returns (uint256)",
        "function houseFeePercentage() external view returns (uint256)",
        "function prizeAmount() external view returns (uint256)",
        "function entrantTickets(address) external view returns (uint256)",
        "function prizeClaimed() external view returns (bool)",
      ];

      const factory = new ethers.Contract(
        FACTORY_ADDRESS,
        factoryAbi,
        provider
      );

      // Get all raffle addresses with better error handling
      let raffleAddresses: string[] = [];
      try {
        raffleAddresses = await factory.getRaffles();
        console.log("Found raffles:", raffleAddresses.length);
      } catch (error) {
        console.error("Error calling getRaffles():", error);

        // Check if it's a decoding error (empty result)
        if (
          error instanceof Error &&
          error.message.includes("could not decode result data") &&
          error.message.includes('value="0x"')
        ) {
          console.log(
            "ℹ️ Factory contract returned empty data - no raffles exist yet"
          );
          raffleAddresses = []; // Empty array
        } else {
          throw error; // Re-throw other errors
        }
      }

      // If no raffles, return empty data
      if (raffleAddresses.length === 0) {
        console.log("No raffles found, returning empty user data");
        setParticipatedRaffles([]);
        setWonRaffles([]);
        setIsLoading(false);
        return;
      }

      // Try to get images from MongoDB
      const imageMap = new Map<string, string>();
      try {
        console.log("🖼️ Fetching images from MongoDB...");
        const response = await fetch("/api/raffles");

        if (response.ok) {
          const data = await response.json();

          if (data.success && data.raffles) {
            console.log("📊 Found MongoDB raffles:", data.raffles.length);

            // Create a map of contract addresses to image URLs
            data.raffles.forEach((raffle: MongoRaffle) => {
              if (raffle.contractAddress && raffle.imageUrl) {
                imageMap.set(
                  raffle.contractAddress.toLowerCase(),
                  raffle.imageUrl
                );
                console.log(
                  `🖼️ Found image for ${raffle.contractAddress}: ${raffle.imageUrl}`
                );
              }
            });
          }
        }
      } catch (mongoError) {
        console.log("⚠️ Could not fetch images from MongoDB:", mongoError);
      }

      const userParticipations: UserRaffleParticipation[] = [];
      const userWins: UserRaffleParticipation[] = [];

      // Check each raffle for user participation
      for (const raffleAddress of raffleAddresses) {
        try {
          console.log(`Checking raffle: ${raffleAddress}`);
          const raffleContract = new ethers.Contract(
            raffleAddress,
            raffleAbi,
            provider
          );

          // Get raffle data first to check if user is a winner
          const [
            title,
            endTime,
            isClosed,
            winner,
            prizeAmount,
            prizeClaimed,
          ] = await Promise.all([
            raffleContract.prizeDescription().catch(() => "Unknown Prize"),
            raffleContract.endTime().catch(() => 0),
            raffleContract.isClosed().catch(() => false),
            raffleContract
              .winner()
              .catch(() => "0x0000000000000000000000000000000000000000"),
            raffleContract.prizeAmount().catch(() => 0),
            raffleContract.prizeClaimed().catch(() => false),
          ]);

          // Check if user is a winner
          const winnerAddress = typeof winner === 'string' ? winner : String(winner);
          const isWinner = winnerAddress.toLowerCase() === userAddress.toLowerCase();
          
          // Debug logging
          console.log(`Checking winner for raffle ${raffleAddress}:`, {
            winnerAddress,
            userAddress,
            isWinner,
            addressesMatch: winnerAddress.toLowerCase() === userAddress.toLowerCase()
          });

          // Get user's ticket count
          let userTickets = 0;
          try {
            userTickets = await raffleContract.entrantTickets(userAddress);
            console.log(`User tickets in ${raffleAddress}: ${userTickets}`);
          } catch (ticketError) {
            console.log(
              `No tickets found for user in ${raffleAddress}:`,
              ticketError
            );
            // Don't continue - still need to process if user is a winner
          }

          // Process raffle if user has tickets OR is a winner
          if (userTickets > 0 || isWinner) {
            const currentTime = Math.floor(Date.now() / 1000);
            const hasEnded = currentTime >= Number(endTime);
            
            // Format prize amount properly
            const formattedPrizeAmount = prizeAmount ? ethers.formatEther(BigInt(prizeAmount)) : "0";

            console.log(`Raffle ${raffleAddress} data:`, {
              title,
              userTickets,
              isWinner,
              hasEnded,
              isClosed,
              winner: winnerAddress,
              userAddress,
              prizeAmount: formattedPrizeAmount
            });

            // Determine status
            let status: "ongoing" | "ended" | "closed" = "ongoing";
            if (isClosed) {
              status = "closed";
            } else if (hasEnded) {
              status = "ended";
            }

            // Get image URL from MongoDB if available
            const imageUrl = imageMap.get(raffleAddress.toLowerCase());
            if (imageUrl) {
              console.log(
                `✅ Found image for raffle ${raffleAddress}: ${imageUrl}`
              );
            }

            const participation: UserRaffleParticipation = {
              address: raffleAddress,
              title,
              image: "/api/placeholder/300/200", // Default placeholder
              imageUrl: imageUrl || undefined, // MongoDB image URL
              entryDate: new Date().toISOString().split("T")[0], // Current date as placeholder
              tickets: Number(userTickets),
              status,
              prizeValue: `${formattedPrizeAmount} PYUSD`,
              isWinner,
              prizeClaimed: isWinner ? prizeClaimed : undefined,
              endTime: Number(endTime),
            };

            // Add to participated raffles if user has tickets OR is a winner
            if (userTickets > 0 || isWinner) {
              userParticipations.push(participation);
            }

            // Add to won raffles if user is the winner
            if (isWinner) {
              userWins.push(participation);
            }
          }
        } catch (raffleError) {
          console.error(`Error fetching raffle ${raffleAddress}:`, raffleError);
        }
      }

      // Sort by end time (most recent first)
      userParticipations.sort((a, b) => b.endTime - a.endTime);
      userWins.sort((a, b) => b.endTime - a.endTime);

      console.log("Final data:", {
        participatedRaffles: userParticipations.length,
        wonRaffles: userWins.length,
        participatedData: userParticipations,
        wonData: userWins,
      });

      setParticipatedRaffles(userParticipations);
      setWonRaffles(userWins);
    } catch (error) {
      console.error("Error fetching user raffle data:", error);
      setError("Failed to load raffle data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyAddress = async () => {
    if (user?.wallet?.address) {
      await navigator.clipboard.writeText(user.wallet.address);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const handleConnectWallet = () => {
    login();
  };

  // Show wallet connection modal
  if (showWalletModal) {
    return (
      <div className="font-rubik min-h-screen flex items-center justify-center p-4 bg-linear-to-br from-purple-50 to-blue-50">
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] p-8 max-w-md w-full">
          <div className="text-center">
            <div className="mb-6">
              <svg
                className="w-20 h-20 mx-auto text-[#f97028]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-black mb-4 uppercase">
              Wallet Connection Required
            </h2>
            <p className="text-gray-600 mb-6 text-lg">
              You need to connect your wallet to view your profile page
            </p>
            <button
              onClick={handleConnectWallet}
              className="bg-[#f97028] border-4 border-black px-8 py-3 font-black text-white uppercase tracking-tight
                shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000]
                hover:translate-x-[2px] hover:translate-y-[2px]
                active:shadow-none active:translate-x-[4px] active:translate-y-[4px]
                transition-all duration-100 w-full"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="font-rubik min-h-screen bg-linear-to-br from-purple-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Profile Header */}
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Profile Image */}
            <div className="relative">
              <div className="w-32 h-32 md:w-40 md:h-40 border-4 rounded-full border-black shadow-[4px_4px_0px_#000] overflow-hidden">
                <Image
                  src={user1}
                  alt="Profile"
                  width={160}
                  height={160}
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-[#f97028] border-4 border-black rounded-full p-2">
                <MdVerified className="text-white text-2xl" />
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-black mb-2 uppercase">
                {user?.wallet?.address ? "Crypto Enthusiast" : "Anonymous User"}
              </h1>

              {/* Wallet Address */}
              {user?.wallet?.address && (
                <div className="mb-4">
                  <div className="flex items-center justify-center md:justify-start gap-2 bg-gray-100 border-2 border-black px-4 py-2">
                    <span className="font-mono font-bold text-sm md:text-base">
                      {formatAddress(user.wallet.address)}
                    </span>
                    <button
                      onClick={handleCopyAddress}
                      className="text-[#f97028] hover:text-[#d85f20] transition-colors"
                      title="Copy address"
                    >
                      <IoCopy className="text-xl" />
                    </button>
                  </div>
                  {copySuccess && (
                    <p className="text-green-600 text-sm mt-1 font-bold">
                      Address copied!
                    </p>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="bg-[#f489a3] border-4 border-black p-4 shadow-[4px_4px_0px_#000]">
                  <div className="text-3xl font-black">
                    {participatedRaffles.length}
                  </div>
                  <div className="text-sm font-bold uppercase">
                    Participated
                  </div>
                </div>
                <div className="bg-[#f0bb0d] border-4 border-black p-4 shadow-[4px_4px_0px_#000]">
                  <div className="text-3xl font-black">{wonRaffles.length}</div>
                  <div className="text-sm font-bold uppercase">Won</div>
                </div>
                <div className="bg-[#8b5cf6] border-4 border-black p-4 shadow-[4px_4px_0px_#000]">
                  <div className="text-3xl font-black text-white">
                    {participatedRaffles.reduce((sum, r) => sum + r.tickets, 0)}
                  </div>
                  <div className="text-sm font-bold uppercase text-white">
                    Total Tickets
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Won Raffles Section */}
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] p-6 md:p-8 mb-8">
          <h2 className="text-2xl md:text-3xl font-black mb-6 uppercase flex items-center gap-2">
            <span className="bg-[#f0bb0d] border-4 border-black px-4 py-2 shadow-[4px_4px_0px_#000]">
              Won Raffles
            </span>
          </h2>

          {isLoading ? (
            <ProfileRafflesSkeleton />
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              <p className="text-xl font-bold">Error loading data</p>
              <p className="mt-2">{error}</p>
              <button
                onClick={fetchUserRaffleData}
                className="mt-4 bg-[#f97028] border-4 border-black px-6 py-2 font-black text-white uppercase tracking-tight
                  shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000]
                  hover:translate-x-[2px] hover:translate-y-[2px]
                  active:shadow-none active:translate-x-[4px] active:translate-y-[4px]
                  transition-all duration-100"
              >
                Retry
              </button>
            </div>
          ) : wonRaffles.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-xl font-bold">No raffles won yet</p>
              <p className="mt-2">Keep participating to win prizes!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {wonRaffles.map((raffle) => (
                <div
                  key={raffle.address}
                  className="bg-linear-to-br from-pink-50 to-purple-50 border-4 border-black shadow-[6px_6px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-100"
                >
                  <div className="p-4">
                    <div className="bg-white border-2 border-black h-52 mb-4 flex items-center justify-center relative overflow-hidden">
                      {raffle.imageUrl ? (
                        <Image
                          src={raffle.imageUrl}
                          alt={raffle.title}
                          fill
                          className="object-cover"
                          onError={(e) => {
                            console.log(
                              "Image failed to load:",
                              raffle.imageUrl
                            );
                            // Hide the image and show emoji fallback
                            e.currentTarget.style.display = "none";
                            const emojiFallback = e.currentTarget
                              .nextElementSibling as HTMLElement;
                            if (emojiFallback) {
                              emojiFallback.style.display = "flex";
                            }
                          }}
                        />
                      ) : null}

                      {/* Emoji fallback (always present, shown when no imageUrl or image fails) */}
                      <div
                        className={`w-full h-full flex items-center justify-center bg-linear-to-br from-yellow-100 to-orange-100 ${
                          raffle.imageUrl ? "absolute inset-0 hidden" : ""
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-6xl mb-2">🏆</div>
                          <p className="text-sm font-bold text-gray-600">
                            Prize
                          </p>
                        </div>
                      </div>
                    </div>
                    <h3 className="font-black text-lg mb-2 uppercase">
                      {raffle.title}
                    </h3>
                    <div className="space-y-1 text-sm">
                      <p className="font-bold">
                        Won:{" "}
                        {new Date(raffle.endTime * 1000).toLocaleDateString()}
                      </p>
                      <p className="font-bold text-[#f97028]">
                        Prize: {raffle.prizeValue}
                      </p>
                      <span
                        className={`inline-block text-white px-3 py-1 border-2 border-black font-bold uppercase text-xs ${
                          raffle.prizeClaimed ? "bg-green-500" : "bg-yellow-500"
                        }`}
                      >
                        {raffle.prizeClaimed ? "claimed" : "pending"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Participated Raffles Section */}
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-black mb-6 uppercase flex items-center gap-2">
            <span className="bg-[#f489a3] border-4 border-black px-4 py-2 shadow-[4px_4px_0px_#000]">
              Participated Raffles
            </span>
          </h2>

          {isLoading ? (
            <ProfileRafflesSkeleton />
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              <p className="text-xl font-bold">Error loading data</p>
              <p className="mt-2">{error}</p>
              <button
                onClick={fetchUserRaffleData}
                className="mt-4 bg-[#f97028] border-4 border-black px-6 py-2 font-black text-white uppercase tracking-tight
                  shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000]
                  hover:translate-x-[2px] hover:translate-y-[2px]
                  active:shadow-none active:translate-x-[4px] active:translate-y-[4px]
                  transition-all duration-100"
              >
                Retry
              </button>
            </div>
          ) : participatedRaffles.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-xl font-bold">No raffles participated yet</p>
              <p className="mt-2">Start participating in raffles now!</p>
              <p className="mt-2 text-sm">
                Debug: Found {participatedRaffles.length} participated raffles
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {participatedRaffles.map((raffle) => (
                <div
                  key={raffle.address}
                  className="bg-linear-to-br from-pink-50 to-purple-50 border-4 border-black shadow-[6px_6px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-100"
                >
                  <div className="p-4">
                    <div className="bg-white border-2 border-black h-52 mb-4 flex items-center justify-center relative overflow-hidden">
                      {raffle.imageUrl ? (
                        <Image
                          src={raffle.imageUrl}
                          alt={raffle.title}
                          fill
                          className="object-cover"
                          onError={(e) => {
                            console.log(
                              "Image failed to load:",
                              raffle.imageUrl
                            );
                            // Hide the image and show emoji fallback
                            e.currentTarget.style.display = "none";
                            const emojiFallback = e.currentTarget
                              .nextElementSibling as HTMLElement;
                            if (emojiFallback) {
                              emojiFallback.style.display = "flex";
                            }
                          }}
                        />
                      ) : null}

                      {/* Emoji fallback (always present, shown when no imageUrl or image fails) */}
                      <div
                        className={`w-full h-full flex items-center justify-center bg-linear-to-br from-blue-100 to-purple-100 ${
                          raffle.imageUrl ? "absolute inset-0 hidden" : ""
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-6xl mb-2">🎫</div>
                          <p className="text-sm font-bold text-gray-600">
                            Raffle
                          </p>
                        </div>
                      </div>
                    </div>
                    <h3 className="font-black text-lg mb-2 uppercase">
                      {raffle.title}
                    </h3>
                    <div className="space-y-1 text-sm">
                      <p className="font-bold">Entered: {raffle.entryDate}</p>
                      <p className="font-bold">Tickets: {raffle.tickets}</p>
                      {/* <p className="font-bold text-[#f97028]">
                        Prize: {raffle.prizeValue}
                      </p> */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block text-white px-3 py-1 border-2 border-black font-bold uppercase text-xs ${
                            raffle.status === "ongoing"
                              ? "bg-blue-500"
                              : raffle.status === "ended"
                              ? "bg-yellow-500"
                              : "bg-gray-500"
                          }`}
                        >
                          {raffle.status}
                        </span>
                        {raffle.isWinner && (
                          <span className="inline-block bg-green-500 text-white px-3 py-1 border-2 border-black font-bold uppercase text-xs">
                            🏆 Winner!
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

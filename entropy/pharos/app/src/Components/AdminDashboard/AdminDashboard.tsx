"use client";
import React, { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { MdAdminPanelSettings, MdImage, MdUpload } from "react-icons/md";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { ethers, Log } from "ethers";
import { uploadImage } from "@/lib/imageUpload";
import AdminDashboardSkeleton from "../SkeletonLoader/AdminDashboardSkeleton";

// Contract addresses
const FACTORY_ADDRESS =
  process.env.NEXT_PUBLIC_FACTORY_ADDRESS ||
  "0x0000000000000000000000000000000000000000";
const PYUSD_TOKEN_ADDRESS =
  process.env.NEXT_PUBLIC_PYUSD_TOKEN_ADDRESS ||
  "0x79Bd6F9E7B7B25B343C762AE5a35b20353b2CCb8";

// Admin wallet addresses from environment variables
const ADMIN_ADDRESSES = process.env.NEXT_PUBLIC_ADMIN_ADDRESSES
  ? process.env.NEXT_PUBLIC_ADMIN_ADDRESSES.split(",").map((addr) =>
      addr.trim()
    )
  : [];

interface RaffleFormData {
  image: File | null;
  imagePreview: string;
  imageUrl: string; // Pinata IPFS URL
  title: string;
  description: string;
  pricePerTicket: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  availableTickets: string;
  maxTicketsPerUser: string;
  totalPrizePool: string;
  category: string;
  houseFeePercentage: string;
}

const AdminDashboard = () => {
  const { authenticated, user, login } = usePrivy();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [imageError, setImageError] = useState("");
  const [raffleAddress, setRaffleAddress] = useState("");
  const [txHash, setTxHash] = useState("");
  const [createRaffleError, setCreateRaffleError] = useState<string | null>(
    null
  );

  const [formData, setFormData] = useState<RaffleFormData>({
    image: null,
    imagePreview: "",
    imageUrl: "",
    title: "",
    description: "",
    pricePerTicket: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    availableTickets: "",
    maxTicketsPerUser: "5",
    totalPrizePool: "",
    category: "General",
    houseFeePercentage: "3",
  });

  useEffect(() => {
    // Check if user is authenticated and is an admin
    if (!authenticated) {
      setIsLoading(false);
      return;
    }

    const userAddress = user?.wallet?.address?.toLowerCase();
    const isUserAdmin = ADMIN_ADDRESSES.some(
      (addr) => addr.toLowerCase() === userAddress
    );

    setIsAdmin(isUserAdmin);
    setIsLoading(false);
  }, [authenticated, user]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Reset error
      setImageError("");

      // Validate image is square
      const img = new window.Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = async () => {
        if (img.width === img.height) {
          // Image is square, proceed with upload to Pinata
          try {
            setFormData((prev) => ({
              ...prev,
              image: file,
              imagePreview: objectUrl,
            }));

            // Upload to Pinata
            const uploadResult = await uploadImage(file);

            if (uploadResult.success && uploadResult.url) {
              setFormData((prev) => ({
                ...prev,
                imageUrl: uploadResult.url!,
              }));
              console.log("✅ Image uploaded to Pinata:", uploadResult.url);
            } else {
              setImageError(uploadResult.error || "Failed to upload image");
            }
          } catch (error) {
            console.error("Error uploading image:", error);
            setImageError("Failed to upload image to Pinata");
          }
        } else {
          // Image is not square
          setImageError(
            `Image must be square (1:1 aspect ratio). Current dimensions: ${img.width}x${img.height}`
          );
          URL.revokeObjectURL(objectUrl);
          // Reset file input
          e.target.value = "";
        }
      };

      img.onerror = () => {
        setImageError("Failed to load image. Please try another file.");
        URL.revokeObjectURL(objectUrl);
        e.target.value = "";
      };

      img.src = objectUrl;
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Smart contract interaction functions
  const getProvider = () => {
    if (typeof window !== "undefined" && window.ethereum) {
      return new ethers.BrowserProvider(window.ethereum);
    }
    throw new Error("MetaMask not found");
  };

  const getReadOnlyProvider = () => {
    // Use direct RPC for read-only operations to avoid network issues
    return new ethers.JsonRpcProvider("https://sepolia-rollup.arbitrum.io/rpc");
  };

  const createRaffleContract = async () => {
    try {
      const provider = getProvider();
      const signer = await provider.getSigner();

      // RaffleFactory ABI (compatible with old factory)
      const factoryAbi = [
        "function createRaffle(uint8 _prizeType, uint256 _prizeAmount, string _prizeDescription, uint256 _ticketPrice, uint256 _maxTickets, uint256 _maxTicketsPerUser, uint256 _startTime, uint256 _endTime, uint256 _houseFeePercentage) external returns (address)",
        "function fundingAmount() external view returns (uint256)",
      ];

      const factory = new ethers.Contract(FACTORY_ADDRESS, factoryAbi, signer);

      console.log(
        "Using factory contract (compatible with current deployment)"
      );

      // Check factory ETH balance (only if function exists)
      try {
        const factoryBalance = await factory.getFactoryBalance();
        console.log(
          "Factory ETH Balance:",
          ethers.formatEther(factoryBalance),
          "ETH"
        );
      } catch (e) {
        console.log("getFactoryBalance not available in current factory");
      }

      try {
        const entropyReserve = await factory.getEntropyFeeReserve();
        console.log(
          "Entropy Fee Reserve:",
          ethers.formatEther(entropyReserve),
          "ETH"
        );
      } catch (e) {
        console.log("getEntropyFeeReserve not available in current factory", e);
      }

      // Convert form data to contract parameters
      const prizeType = 0; // 0=Crypto, 1=Physical, 2=Digital
      const prizeAmount = ethers.parseEther(formData.totalPrizePool);
      const prizeDescription = formData.title;
      const ticketPrice = ethers.parseEther(formData.pricePerTicket);
      const maxTickets = parseInt(formData.availableTickets);
      const maxTicketsPerUser = parseInt(formData.maxTicketsPerUser);

      // Convert date and time to Unix timestamp
      const startDateTime = new Date(
        `${formData.startDate}T${formData.startTime}`
      );
      const startTime = Math.floor(startDateTime.getTime() / 1000);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
      const endTime = Math.floor(endDateTime.getTime() / 1000);

      // Validate timing
      if (startTime >= endTime) {
        throw new Error("Start time must be before end time");
      }
      if (startTime <= Math.floor(Date.now() / 1000)) {
        throw new Error("Start time must be in the future");
      }

      const houseFeePercentage = parseInt(formData.houseFeePercentage) * 100; // Convert to basis points (3% = 300)

      console.log("Creating raffle with parameters:", {
        prizeType,
        prizeAmount: ethers.formatEther(prizeAmount),
        prizeDescription,
        ticketPrice: ethers.formatEther(ticketPrice),
        maxTickets,
        maxTicketsPerUser,
        startTime: new Date(startTime * 1000).toLocaleString(),
        endTime: new Date(endTime * 1000).toLocaleString(),
        houseFeePercentage,
      });

      // Try to call without ETH first, if it fails, try with ETH
      let tx;
      try {
        tx = await factory.createRaffle(
          prizeType,
          prizeAmount,
          prizeDescription,
          ticketPrice,
          maxTickets,
          maxTicketsPerUser,
          startTime,
          endTime,
          houseFeePercentage
        );
      } catch (error) {
        console.log("No ETH payment failed, trying with ETH payment...");
        const fundingAmount = await factory.fundingAmount();
        tx = await factory.createRaffle(
          prizeType,
          prizeAmount,
          prizeDescription,
          ticketPrice,
          maxTickets,
          maxTicketsPerUser,
          startTime,
          endTime,
          houseFeePercentage,
          { value: fundingAmount }
        );
      }

      console.log("Transaction hash:", tx.hash);

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);

      // Extract raffle address from events using Interface decoding
      let raffleAddress = null;
      if (receipt?.logs && receipt.logs.length > 0) {
        const eventTopic = ethers.id("RaffleCreated(address,string,uint256)");
        const raffleCreatedLog = receipt.logs.find(
          (log: Log) => log.topics[0] === eventTopic
        );

        if (raffleCreatedLog) {
          const iface = new ethers.Interface([
            "event RaffleCreated(address raffleAddress, string prizeDescription, uint256 fundingAmount)",
          ]);
          try {
            const decoded = iface.parseLog({
              topics: raffleCreatedLog.topics,
              data: raffleCreatedLog.data,
            });
            raffleAddress = decoded?.args?.[0];
            if (raffleAddress) {
              raffleAddress = ethers.getAddress(raffleAddress);
              console.log("Found raffle address from event:", raffleAddress);
            }
          } catch (e) {
            console.log(
              "Failed to parse RaffleCreated event, will fallback to getRaffles()",
              e
            );
          }
        }
      }

      // Fallback: get the latest raffle from factory
      if (!raffleAddress) {
        try {
          const factoryAbiWithGetRaffles = [
            "function createRaffle(uint8 _prizeType, uint256 _prizeAmount, string memory _prizeDescription, uint256 _ticketPrice, uint256 _maxTickets, uint256 _maxTicketsPerUser, uint256 _endTime, uint256 _houseFeePercentage) external returns (address)",
            "function getRaffles() external view returns (address[] memory)",
          ];
          const factoryWithGetRaffles = new ethers.Contract(
            FACTORY_ADDRESS,
            factoryAbiWithGetRaffles,
            signer
          );
          const raffles = await factoryWithGetRaffles.getRaffles();
          raffleAddress = raffles[raffles.length - 1];
          console.log("Got raffle address from getRaffles():", raffleAddress);
        } catch (error) {
          console.log("Could not get raffle address from getRaffles():", error);
        }
      }

      return { success: true, raffleAddress, txHash: tx.hash };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Error creating raffle:", error);
      return { success: false, error: errorMessage };
    }
  };

  // Function to check and fund raffle with ETH if needed
  const checkAndFundRaffle = async (raffleAddress: string) => {
    try {
      const provider = getProvider();
      const signer = await provider.getSigner();

      // Check current ETH balance of raffle
      const raffleBalance = await provider.getBalance(raffleAddress);
      console.log(
        "Current raffle ETH balance:",
        ethers.formatEther(raffleBalance),
        "ETH"
      );

      // Get required entropy fee from the entropy contract directly
      const entropyAbi = [
        "function getFee(address provider) external view returns (uint128)",
      ];

      // Arbitrum Sepolia entropy contract address
      const ENTROPY_ADDRESS = "0x6CC14824Ea2918f5De5C2f75A9Da968ad4BD6344";
      const PROVIDER_ADDRESS = "0x177615c07d0c89f553cAB585C4b5dAf4bA7B2676";

      let requiredFee = ethers.parseEther("0.01"); // Default fallback

      try {
        const entropy = new ethers.Contract(
          ENTROPY_ADDRESS,
          entropyAbi,
          provider
        );
        const checksummedProvider = ethers.getAddress(PROVIDER_ADDRESS);
        requiredFee = await entropy.getFee(checksummedProvider);
        console.log(
          "Required entropy fee:",
          ethers.formatEther(requiredFee),
          "ETH"
        );
      } catch (error) {
        console.log(
          "Could not get entropy fee, using default:",
          ethers.formatEther(requiredFee),
          "ETH",
          error
        );
      }

      // Check if funding is needed (add small buffer for safety)
      const bufferAmount = ethers.parseEther("0.001"); // 0.001 ETH buffer
      const totalRequired = requiredFee + bufferAmount;

      if (raffleBalance < totalRequired) {
        const fundingAmount = totalRequired - raffleBalance;
        console.log(
          "Funding needed:",
          ethers.formatEther(fundingAmount),
          "ETH"
        );
        console.log("Required fee:", ethers.formatEther(requiredFee), "ETH");
        console.log("Buffer amount:", ethers.formatEther(bufferAmount), "ETH");

        // Check user's ETH balance
        const userBalance = await provider.getBalance(signer.address);
        console.log(
          "Your ETH balance:",
          ethers.formatEther(userBalance),
          "ETH"
        );

        if (userBalance < fundingAmount) {
          throw new Error(
            `Insufficient ETH balance. Need ${ethers.formatEther(
              fundingAmount
            )} ETH, have ${ethers.formatEther(userBalance)} ETH`
          );
        }

        // Send ETH to raffle with higher gas settings
        console.log("Sending ETH to raffle...");
        console.log(
          "Funding amount:",
          ethers.formatEther(fundingAmount),
          "ETH"
        );

        const tx = await signer.sendTransaction({
          to: raffleAddress,
          value: fundingAmount,
          gasLimit: 100000, // Higher gas limit
          gasPrice: ethers.parseUnits("2", "gwei"), // Higher gas price for Arbitrum Sepolia
        });

        console.log("Funding transaction hash:", tx.hash);
        console.log("Waiting for confirmation...");

        const receipt = await tx.wait();
        console.log(
          "Funding transaction confirmed:",
          receipt?.status === 1 ? "Success" : "Failed"
        );

        // Verify new balance
        const newBalance = await provider.getBalance(raffleAddress);
        console.log(
          "New raffle ETH balance:",
          ethers.formatEther(newBalance),
          "ETH"
        );

        // Double-check that we have enough ETH now
        if (newBalance < totalRequired) {
          throw new Error(
            `Funding failed. Still insufficient ETH. Have ${ethers.formatEther(
              newBalance
            )}, need ${ethers.formatEther(totalRequired)}`
          );
        }

        return { funded: true, amount: ethers.formatEther(fundingAmount) };
      } else {
        console.log("Raffle already has sufficient ETH");
        return { funded: false, amount: "0" };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Error funding raffle:", error);
      throw new Error(`Failed to fund raffle: ${errorMessage}`);
    }
  };

  // Function to close raffle with automatic funding
  // const closeRaffleWithFunding = async (raffleAddress: string) => {
  //   try {
  //     console.log('🔒 Starting raffle closure process...')

  //     // Step 1: Check and fund if needed
  //     console.log('💰 Checking ETH balance and funding if needed...')
  //     const fundingResult = await checkAndFundRaffle(raffleAddress)

  //     if (fundingResult.funded) {
  //       console.log(`✅ Funded raffle with ${fundingResult.amount} ETH`)
  //     }

  //     // Step 2: Close the raffle using auto-close function
  //     console.log('🔒 Auto-closing raffle...')
  //     const provider = getProvider()
  //     const signer = await provider.getSigner()

  //     // Use direct RPC for reading contract data
  //     const readProvider = getReadOnlyProvider()

  //     const raffleAbi = [
  //       "function closeIfReady() external",
  //       "function owner() external view returns (address)"
  //     ]

  //     const raffleRead = new ethers.Contract(raffleAddress, raffleAbi, readProvider)
  //     const raffleWrite = new ethers.Contract(raffleAddress, raffleAbi, signer)

  //     // Check if user is the owner (required for admin-only close) using read provider
  //     const owner = await raffleRead.owner()
  //     const userAddress = await signer.getAddress()

  //     if (owner.toLowerCase() !== userAddress.toLowerCase()) {
  //       throw new Error('Only the raffle owner can close this raffle')
  //     }

  //     console.log('Auto-closing raffle...')

  //     const tx = await raffleWrite.closeIfReady()
  //     console.log('Close transaction hash:', tx.hash)

  //     const receipt = await tx.wait()

  //     console.log('Close transaction receipt:', {
  //       status: receipt?.status,
  //       logsCount: receipt?.logs?.length || 0,
  //       gasUsed: receipt?.gasUsed?.toString()
  //     })

  //     // Try to find the RaffleClosed event
  //     let sequenceNumber = null
  //     if (receipt?.logs && receipt.logs.length > 0) {
  //       const raffleClosedTopic = ethers.id("RaffleClosed(uint64)")
  //       const raffleClosedLog = receipt.logs.find((log: Log) => log.topics[0] === raffleClosedTopic)

  //       if (raffleClosedLog) {
  //         // Decode the event data using the correct ABI
  //         const eventAbi = ["event RaffleClosed(uint64 sequenceNumber)"]
  //         const iface = new ethers.Interface(eventAbi)
  //         try {
  //           const decoded = iface.parseLog({
  //             topics: raffleClosedLog.topics,
  //             data: raffleClosedLog.data
  //           })
  //           sequenceNumber = decoded?.args?.[0]
  //         } catch (e) {
  //           console.log('Failed to parse RaffleClosed event:', e)
  //           // Fallback: extract from topics directly
  //           if (raffleClosedLog.topics.length > 1) {
  //             sequenceNumber = BigInt(raffleClosedLog.topics[1])
  //           }
  //         }
  //       }
  //     }

  //     if (sequenceNumber) {
  //       console.log('✅ Raffle closed successfully!')
  //       console.log('📊 Sequence number:', sequenceNumber)

  //       return {
  //         success: true,
  //         sequenceNumber: sequenceNumber.toString(),
  //         funded: fundingResult.funded,
  //         fundingAmount: fundingResult.amount
  //       }
  //     } else {
  //       throw new Error('Could not find sequence number in transaction logs')
  //     }

  //   } catch (error) {
  //     const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
  //     console.error('Error closing raffle:', error)
  //     throw new Error(`Failed to close raffle: ${errorMessage}`)
  //   }
  // }

  // Function to save raffle data to MongoDB
  const saveRaffleToMongoDB = async (
    contractAddress: string,
    txHash: string
  ) => {
    try {
      const raffleData = {
        contractAddress,
        title: formData.title,
        description: formData.description,
        imageUrl: formData.imageUrl,
        pricePerTicket: formData.pricePerTicket,
        totalTickets: parseInt(formData.availableTickets),
        ticketsSold: 0,
        startTime: Math.floor(
          new Date(`${formData.startDate}T${formData.startTime}`).getTime() /
            1000
        ),
        endTime: Math.floor(
          new Date(`${formData.endDate}T${formData.endTime}`).getTime() / 1000
        ),
        isClosed: false,
        maxTicketsPerUser: parseInt(formData.maxTicketsPerUser),
        houseFeePercentage: parseInt(formData.houseFeePercentage),
        prizeAmount: formData.totalPrizePool,
        category: formData.category,
        txHash,
        createdBy: user?.wallet?.address || "",
      };

      const response = await fetch("/api/raffles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(raffleData),
      });

      if (!response.ok) {
        throw new Error("Failed to save raffle to database");
      }

      const result = await response.json();
      console.log("✅ Raffle saved to MongoDB:", result);
      return result;
    } catch (error) {
      console.error("Error saving raffle to MongoDB:", error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setCreateRaffleError(null); // Clear previous errors

    try {
      // Create raffle on blockchain
      const result = await createRaffleContract();

      if (result.success && result.raffleAddress && result.txHash) {
        console.log("✅ Raffle created successfully!");
        console.log("Raffle Address:", result.raffleAddress);
        console.log("Transaction Hash:", result.txHash);

        // Save to MongoDB
        try {
          await saveRaffleToMongoDB(result.raffleAddress, result.txHash);
          console.log("✅ Raffle data saved to MongoDB");
        } catch (dbError) {
          console.error(
            "⚠️ Failed to save to MongoDB, but blockchain transaction succeeded:",
            dbError
          );
          // Don't fail the entire process if MongoDB fails
        }

        setRaffleAddress(result.raffleAddress);
        setTxHash(result.txHash);
        setShowSuccess(true);

        // Reset form after 5 seconds
        setTimeout(() => {
          setFormData({
            image: null,
            imagePreview: "",
            imageUrl: "",
            title: "",
            description: "",
            pricePerTicket: "",
            startDate: "",
            startTime: "",
            endDate: "",
            endTime: "",
            availableTickets: "",
            maxTicketsPerUser: "5",
            totalPrizePool: "",
            category: "General",
            houseFeePercentage: "3",
          });
          setShowSuccess(false);
          setRaffleAddress("");
          setTxHash("");
        }, 5000);
      } else {
        setCreateRaffleError(result.error || "Unknown error occurred");
        // Clear error after 10 seconds
        setTimeout(() => {
          setCreateRaffleError(null);
        }, 10000);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      console.error("Error:", error);
      setCreateRaffleError(errorMessage);
      // Clear error after 10 seconds
      setTimeout(() => {
        setCreateRaffleError(null);
      }, 10000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return <AdminDashboardSkeleton />;
  }

  // Not authenticated
  if (!authenticated) {
    return (
      <div className="font-rubik min-h-screen flex items-center justify-center p-4 bg-linear-to-br from-purple-50 to-blue-50">
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] p-8 max-w-md w-full">
          <div className="text-center">
            <MdAdminPanelSettings className="text-6xl text-[#f97028] mx-auto mb-4" />
            <h2 className="text-3xl font-black mb-4 uppercase">
              Admin Access Required
            </h2>
            <p className="text-gray-600 mb-6 text-lg">
              You need to connect your wallet to access the admin dashboard
            </p>
            <button
              onClick={() => login()}
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

  // Not admin
  if (!isAdmin) {
    return (
      <div className="font-rubik min-h-screen flex items-center justify-center p-4 bg-linear-to-br from-purple-50 to-blue-50">
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] p-8 max-w-md w-full">
          <div className="text-center">
            <div className="mb-6">
              <svg
                className="w-20 h-20 mx-auto text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-black mb-4 uppercase text-red-600">
              Access Denied
            </h2>
            <p className="text-gray-600 mb-6 text-lg">
              You don&apos;t have permission to access this page
            </p>
            <button
              onClick={() => router.push("/")}
              className="bg-[#8b5cf6] border-4 border-black px-8 py-3 font-black text-white uppercase tracking-tight
                shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000]
                hover:translate-x-[2px] hover:translate-y-[2px]
                active:shadow-none active:translate-x-[4px] active:translate-y-[4px]
                transition-all duration-100 w-full"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Admin dashboard
  return (
    <div className="font-rubik min-h-screen bg-linear-to-br from-purple-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] p-6 mb-8">
          <div className="flex items-center gap-4">
            <MdAdminPanelSettings className="text-5xl text-[#8b5cf6]" />
            <div>
              <h1 className="text-3xl md:text-4xl font-black uppercase">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 font-bold">
                Create and manage PYUSD raffles
              </p>
            </div>
          </div>

          {/* Contract Info */}
          <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-400">
            <p className="text-blue-800 font-bold text-sm mb-2">
              📋 Contract Information:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="font-bold">Factory:</span>
                <span className="font-mono ml-2">{FACTORY_ADDRESS}</span>
              </div>
              <div>
                <span className="font-bold">PYUSD Token:</span>
                <span className="font-mono ml-2">{PYUSD_TOKEN_ADDRESS}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="bg-green-500 text-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-6 md:p-8 mb-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="text-4xl">🎉</div>
              <div className="flex-1">
                <p className="text-2xl font-rubik font-black uppercase mb-2">
                  Raffle Created Successfully!
                </p>
                <p className="text-base font-rubik font-bold">
                  Your raffle has been deployed to the blockchain.
                </p>
              </div>
            </div>

            {raffleAddress && (
              <div className="bg-white border-3 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] rounded-lg p-4 mb-4">
                <p className="text-black font-rubik font-black text-sm uppercase mb-3 flex items-center gap-2">
                  <span className="bg-green-500 text-white px-2 py-1 border-2 border-black text-xs">Contract</span>
                  Raffle Address
                </p>
                <div className="bg-gray-100 border-2 border-gray-300 rounded px-3 py-2">
                  <p className="text-black font-mono text-xs md:text-sm break-all">
                    {raffleAddress}
                  </p>
                </div>
              </div>
            )}

            {txHash && (
              <div className="bg-white border-3 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] rounded-lg p-4">
                <p className="text-black font-rubik font-black text-sm uppercase mb-3 flex items-center gap-2">
                  <span className="bg-blue-500 text-white px-2 py-1 border-2 border-black text-xs">TX</span>
                  Transaction Hash
                </p>
                <div className="bg-gray-100 border-2 border-gray-300 rounded px-3 py-2">
                  <p className="text-black font-mono text-xs md:text-sm break-all">
                    {txHash}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {createRaffleError && (
          <div className="bg-red-500 text-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-6 md:p-8 mb-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="text-4xl">❌</div>
              <div className="flex-1">
                <p className="text-2xl font-rubik font-black uppercase mb-2">
                  Error Creating Raffle
                </p>
                <p className="text-base font-rubik font-bold">
                  Something went wrong during raffle creation.
                </p>
              </div>
            </div>

            <div className="bg-white border-3 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] rounded-lg p-4 mb-4">
              <p className="text-red-700 font-rubik font-black text-sm uppercase mb-3">
                Error Details:
              </p>
              <div className="bg-red-50 border-2 border-red-200 rounded px-3 py-2">
                <p className="text-red-700 font-rubik text-sm">
                  {createRaffleError}
                </p>
              </div>
            </div>

            <div className="bg-green-100 border-3 border-green-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">💡</div>
                <div className="flex-1">
                  <p className="text-green-800 font-rubik font-black text-sm uppercase mb-1">
                    Note
                  </p>
                  <p className="text-green-700 font-rubik font-bold text-sm">
                    Factory automatically funds raffles from its ETH reserve. No manual ETH payment needed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Raffle Creation Form */}
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] p-6 md:p-8">
          <h2 className="text-2xl font-black mb-6 uppercase flex items-center gap-2">
            <span className="bg-[#f97028] border-4 border-black px-4 py-2 shadow-[4px_4px_0px_#000]">
              Create New Raffle
            </span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload */}
            <div>
              <label className="block font-black text-lg mb-2 uppercase">
                Raffle Image (Square - 1:1 Ratio) - Optional
              </label>
              <div
                className={`border-4 ${
                  imageError ? "border-red-500" : "border-black"
                } p-4 bg-gray-50`}
              >
                {formData.imagePreview ? (
                  <div className="relative">
                    <div className="w-full max-w-md mx-auto">
                      <Image
                        src={formData.imagePreview}
                        alt="Preview"
                        width={400}
                        height={400}
                        className="w-full aspect-square object-cover border-2 border-black"
                      />
                      <div className="mt-2 p-2 bg-green-100 border-2 border-green-600">
                        <p className="text-green-800 font-bold text-sm text-center">
                          ✓ Square image uploaded successfully
                        </p>
                        {formData.imageUrl && (
                          <p className="text-green-700 text-xs text-center mt-1">
                            📡 Stored on IPFS: {formData.imageUrl.slice(0, 50)}
                            ...
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          image: null,
                          imagePreview: "",
                          imageUrl: "",
                        }));
                        setImageError("");
                      }}
                      className="mt-4 bg-red-500 border-4 border-black px-4 py-2 font-black text-white uppercase
                        shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000]
                        hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-100 w-full"
                    >
                      Remove Image
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center justify-center h-64 border-2 border-dashed border-black bg-white hover:bg-gray-100 transition-colors">
                    <div className="w-24 h-24 border-4 border-gray-300 mb-4 flex items-center justify-center">
                      <MdImage className="text-5xl text-gray-400" />
                    </div>
                    <span className="font-black text-gray-700 text-lg">
                      Click to upload SQUARE image (Optional)
                    </span>
                    <span className="text-sm text-gray-600 mt-2 font-bold">
                      Recommended: 1:1 aspect ratio (e.g., 500x500, 1000x1000)
                    </span>
                    <span className="text-sm text-gray-500 mt-1">
                      PNG, JPG up to 10MB
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Error Message */}
              {imageError && (
                <div className="mt-3 p-4 bg-red-100 border-4 border-red-500">
                  <p className="text-red-700 font-bold flex items-center gap-2">
                    <span className="text-2xl">⚠</span>
                    {imageError}
                  </p>
                  <p className="text-red-600 text-sm mt-2 font-bold">
                    Please upload a square image with equal width and height
                    (e.g., 500x500px, 800x800px, 1000x1000px)
                  </p>
                </div>
              )}

              {/* Info Message */}
              {!formData.imagePreview && !imageError && (
                <div className="mt-3 p-3 bg-blue-50 border-2 border-blue-400">
                  <p className="text-blue-800 text-sm font-bold">
                    💡 Tip: Image upload is optional. Use square images (1:1
                    ratio) for best display. Examples: 500x500px, 800x800px, or
                    1000x1000px
                  </p>
                </div>
              )}
            </div>

            {/* Raffle Title */}
            <div>
              <label className="block font-black text-lg mb-2 uppercase">
                Raffle Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter raffle title"
                required
                className="w-full border-4 border-black px-4 py-3 font-bold text-lg focus:outline-none focus:ring-4 focus:ring-[#f97028]"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block font-black text-lg mb-2 uppercase">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter raffle description"
                rows={4}
                required
                className="w-full border-4 border-black px-4 py-3 font-bold resize-none focus:outline-none focus:ring-4 focus:ring-[#f97028]"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block font-black text-lg mb-2 uppercase">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
                className="w-full border-4 border-black px-4 py-3 font-bold text-lg focus:outline-none focus:ring-4 focus:ring-[#f97028]"
              >
                <option value="General">General</option>
                <option value="Fashion">Fashion</option>
                <option value="Electronics">Electronics</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Luxury">Luxury</option>
                <option value="Crypto">Crypto</option>
              </select>
            </div>

            {/* Grid Layout for smaller fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Price Per Ticket */}
              <div>
                <label className="block font-black text-lg mb-2 uppercase">
                  Price Per Ticket (PYUSD) *
                </label>
                <input
                  type="number"
                  name="pricePerTicket"
                  value={formData.pricePerTicket}
                  onChange={handleInputChange}
                  placeholder="10.00"
                  step="0.01"
                  min="0"
                  required
                  className="w-full border-4 border-black px-4 py-3 font-bold text-lg focus:outline-none focus:ring-4 focus:ring-[#f97028]"
                />
              </div>

              {/* Available Tickets */}
              <div>
                <label className="block font-black text-lg mb-2 uppercase">
                  Available Tickets *
                </label>
                <input
                  type="number"
                  name="availableTickets"
                  value={formData.availableTickets}
                  onChange={handleInputChange}
                  placeholder="100"
                  min="1"
                  required
                  className="w-full border-4 border-black px-4 py-3 font-bold text-lg focus:outline-none focus:ring-4 focus:ring-[#f97028]"
                />
              </div>

              {/* Max Tickets Per User */}
              <div>
                <label className="block font-black text-lg mb-2 uppercase">
                  Max Tickets Per User *
                </label>
                <input
                  type="number"
                  name="maxTicketsPerUser"
                  value={formData.maxTicketsPerUser}
                  onChange={handleInputChange}
                  placeholder="5"
                  min="1"
                  required
                  className="w-full border-4 border-black px-4 py-3 font-bold text-lg focus:outline-none focus:ring-4 focus:ring-[#f97028]"
                />
                <p className="text-sm text-gray-600 mt-1 font-bold">
                  Prevents 51% attacks by limiting individual purchases
                </p>
              </div>

              {/* Total Prize Pool */}
              <div>
                <label className="block font-black text-lg mb-2 uppercase">
                  Total Prize Pool (PYUSD) *
                </label>
                <input
                  type="number"
                  name="totalPrizePool"
                  value={formData.totalPrizePool}
                  onChange={handleInputChange}
                  placeholder="1000.00"
                  step="0.01"
                  min="0"
                  required
                  className="w-full border-4 border-black px-4 py-3 font-bold text-lg focus:outline-none focus:ring-4 focus:ring-[#f97028]"
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="block font-black text-lg mb-2 uppercase">
                  Start Date *
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                  className="w-full border-4 border-black px-4 py-3 font-bold text-lg focus:outline-none focus:ring-4 focus:ring-[#f97028]"
                />
              </div>

              {/* Start Time */}
              <div>
                <label className="block font-black text-lg mb-2 uppercase">
                  Start Time *
                </label>
                <input
                  type="time"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  required
                  className="w-full border-4 border-black px-4 py-3 font-bold text-lg focus:outline-none focus:ring-4 focus:ring-[#f97028]"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block font-black text-lg mb-2 uppercase">
                  End Date *
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  required
                  className="w-full border-4 border-black px-4 py-3 font-bold text-lg focus:outline-none focus:ring-4 focus:ring-[#f97028]"
                />
              </div>

              {/* End Time */}
              <div>
                <label className="block font-black text-lg mb-2 uppercase">
                  End Time *
                </label>
                <input
                  type="time"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleInputChange}
                  required
                  className="w-full border-4 border-black px-4 py-3 font-bold text-lg focus:outline-none focus:ring-4 focus:ring-[#f97028]"
                />
              </div>

              {/* House Fee Percentage */}
              <div>
                <label className="block font-black text-lg mb-2 uppercase">
                  House Fee Percentage *
                </label>
                <input
                  type="number"
                  name="houseFeePercentage"
                  value={formData.houseFeePercentage}
                  onChange={handleInputChange}
                  placeholder="3"
                  min="0"
                  max="10"
                  required
                  className="w-full border-4 border-black px-4 py-3 font-bold text-lg focus:outline-none focus:ring-4 focus:ring-[#f97028]"
                />
                <p className="text-sm text-gray-600 mt-1 font-bold">
                  Platform fee percentage (e.g., 3 for 3%)
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#8b5cf6] border-4 border-black px-8 py-4 font-black text-white text-xl uppercase tracking-tight
                  shadow-[6px_6px_0px_#000] hover:shadow-[4px_4px_0px_#000]
                  hover:translate-x-[2px] hover:translate-y-[2px]
                  active:shadow-none active:translate-x-[6px] active:translate-y-[6px]
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-100 flex items-center justify-center gap-3"
              >
                {isSubmitting ? (
                  <>
                    <AiOutlineLoading3Quarters className="animate-spin text-2xl" />
                    Creating Raffle...
                  </>
                ) : (
                  <>
                    <MdUpload className="text-2xl" />
                    Create Raffle
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

"use client"

import { useState, useEffect, useRef } from "react"
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent, useChainId } from "wagmi"
import { CONTRACT_ADDRESSES, BASE_SEPOLIA_CHAIN_ID, NETWORK_CONFIG } from "@/config/contracts"
import { formatUSDC } from "@/lib/viem-client"
import { signPermit, checkPermitSupport } from "@/lib/permit"
import lotteryAbi from "@/abis/MegaYieldLottery.json"
import erc20Abi from "@/abis/ERC20.json"

// Extract ABI from Hardhat artifact (which has structure { abi: [...] })
const LOTTERY_ABI = (lotteryAbi as any).abi || lotteryAbi
const ERC20_ABI = (erc20Abi as any).abi || erc20Abi

// DayInfo interface removed - no longer using getCurrentDayInfo

export function useLottery() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { writeContract, data: hash, isPending: isBuying } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })
  const isPurchaseTxRef = useRef(false)
  const purchaseTxHashRef = useRef<string | null>(null)
  const [purchaseSuccess, setPurchaseSuccess] = useState(false)
  const pendingPurchaseRef = useRef<{ amount: number; referrer?: string } | null>(null)

  const lotteryAddress = CONTRACT_ADDRESSES.baseSepolia.lottery as `0x${string}`
  const usdcAddress = CONTRACT_ADDRESSES.baseSepolia.usdc as `0x${string}`

  // Read contract data
  const { data: ticketPriceData, error: ticketPriceError, isLoading: isLoadingTicketPrice } = useReadContract({
    address: lotteryAddress,
    abi: LOTTERY_ABI,
    functionName: "ticketPrice",
  })
  const ticketPrice = ticketPriceData as bigint | undefined
  
  // Log for debugging
  useEffect(() => {
    if (ticketPriceError) {
      console.error("Error loading ticket price:", ticketPriceError)
    }
    if (ticketPrice) {
      console.log("Ticket price loaded:", ticketPrice.toString())
    }
  }, [ticketPrice, ticketPriceError])

  const { data: usdcBalanceData } = useReadContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
  const usdcBalance = usdcBalanceData as bigint | undefined

  const { data: usdcAllowanceData } = useReadContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, lotteryAddress] : undefined,
    query: { enabled: !!address },
  })
  const usdcAllowance = usdcAllowanceData as bigint | undefined

  // Watch for ticket purchase events
  useWatchContractEvent({
    address: lotteryAddress,
    abi: LOTTERY_ABI,
    eventName: "TicketPurchased",
    onLogs() {
      // Mark purchase as successful when event is detected and we have a purchase tx hash
      if (isPurchaseTxRef.current && purchaseTxHashRef.current) {
        setPurchaseSuccess(true)
      }
    },
  })

  // Track purchase transaction hash when it's set
  useEffect(() => {
    if (hash && isPurchaseTxRef.current && purchaseTxHashRef.current !== hash) {
      // This is a purchase transaction, save the hash
      purchaseTxHashRef.current = hash
    } else if (hash && !isPurchaseTxRef.current) {
      // This is an approval transaction, clear purchase hash
      purchaseTxHashRef.current = null
    }
  }, [hash])

  // Refresh when transaction succeeds and handle automatic purchase after approval
  useEffect(() => {
    if (isSuccess && hash) {
      if (purchaseTxHashRef.current === hash) {
        // This was a purchase transaction
        setPurchaseSuccess(true)
        pendingPurchaseRef.current = null // Clear pending purchase
      } else {
        // This was an approval transaction
        
        // If we have a pending purchase, automatically execute it after approval
        if (pendingPurchaseRef.current && address) {
          const { amount, referrer } = pendingPurchaseRef.current
          const effectiveTicketPrice = ticketPrice || BigInt(1_000_000)
          const totalCost = effectiveTicketPrice * BigInt(amount)
          const referrerAddress = referrer && referrer.trim() 
            ? (referrer.trim() as `0x${string}`) 
            : "0x0000000000000000000000000000000000000000"
          
          // Small delay to ensure allowance is updated on-chain
          const timeoutId = setTimeout(() => {
            // Mark as purchase transaction
            isPurchaseTxRef.current = true
            setPurchaseSuccess(false)
            
            // Buy tickets automatically
            writeContract({
              address: lotteryAddress,
              abi: LOTTERY_ABI,
              functionName: "buyTicket",
              args: [BigInt(amount), referrerAddress],
            })
          }, 2000) // Wait 2 seconds for allowance to be updated on-chain
          
          // Cleanup timeout if component unmounts
          return () => clearTimeout(timeoutId)
        }
      }
    }
  }, [isSuccess, hash, ticketPrice, lotteryAddress, address, writeContract])

  const buyTickets = async (amount: number, referrer?: string) => {
    if (!address) {
      throw new Error("Wallet not connected")
    }
    
    // Use default ticket price if not loaded yet (1 USDC = 1000000 with 6 decimals)
    const effectiveTicketPrice = ticketPrice || BigInt(1_000_000)

    const totalCost = effectiveTicketPrice * BigInt(amount)
    const referrerAddress = referrer && referrer.trim() ? (referrer.trim() as `0x${string}`) : "0x0000000000000000000000000000000000000000"

    // Check if we need to approve
    if (!usdcAllowance || usdcAllowance < totalCost) {
      // Try to use permit first (single transaction)
      try {
        console.log("Checking permit support for USDC...")
        const permitSupported = await checkPermitSupport(usdcAddress, address)
        console.log("Permit supported:", permitSupported)
        
        if (permitSupported) {
          console.log("Using permit for single-transaction purchase")
          // Use permit for single-transaction purchase
          const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600) // 1 hour from now
          
          // Sign permit off-chain
          console.log("Signing permit...")
          let signature
          try {
            signature = await signPermit(
              usdcAddress,
              address,
              lotteryAddress,
              totalCost,
              deadline,
              chainId
            )
            console.log("Permit signed successfully", signature)
          } catch (signError: any) {
            console.error("Error signing permit:", signError)
            throw new Error(`Failed to sign permit: ${signError?.message || signError}`)
          }

          // Reset purchase success state and mark this as a purchase transaction
          setPurchaseSuccess(false)
          isPurchaseTxRef.current = true
          pendingPurchaseRef.current = null

          // Buy tickets with permit (single transaction)
          console.log("Calling buyTicketWithPermit with args:", {
            amount,
            referrer: referrerAddress,
            deadline: deadline.toString(),
            v: signature.v,
            r: signature.r,
            s: signature.s,
          })
          await writeContract({
            address: lotteryAddress,
            abi: LOTTERY_ABI,
            functionName: "buyTicketWithPermit",
            args: [
              BigInt(amount),
              referrerAddress,
              deadline,
              signature.v,
              signature.r,
              signature.s,
            ],
          })
          console.log("buyTicketWithPermit transaction sent")
          
          return // Success - single transaction completed
        } else {
          console.log("Permit not supported, will use traditional approve")
        }
      } catch (permitError: any) {
        // Permit failed, fall back to traditional approve
        console.warn("Permit failed, falling back to approve")
        console.error("Permit error:", permitError)
        console.error("Permit error message:", permitError?.message)
        console.error("Permit error stack:", permitError?.stack)
        // Continue to traditional approve flow
      }

      // Fallback: Traditional approve flow (two transactions)
      // Approve USDC - this is NOT a purchase transaction
      isPurchaseTxRef.current = false
      setPurchaseSuccess(false)
      
      // Store the purchase parameters to use after approval
      pendingPurchaseRef.current = { amount, referrer }
      
      // Approve maximum amount (type(uint256).max) so user doesn't need to approve again
      // This is safe because the contract only transfers what's needed for each purchase
      const maxApproval = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff") // type(uint256).max
      
      // Approve USDC
      try {
        await writeContract({
          address: usdcAddress,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [lotteryAddress, maxApproval],
        })
      } catch (error: any) {
        console.error("Approval error:", error)
        throw new Error(error?.message || "Failed to approve USDC")
      }
      
      // The useEffect will automatically call buyTicket after approval is confirmed
      return
    }

    // Reset purchase success state and mark this as a purchase transaction
    setPurchaseSuccess(false)
    isPurchaseTxRef.current = true
    pendingPurchaseRef.current = null // Clear any pending purchase

    // Buy tickets (already approved)
    try {
      await writeContract({
        address: lotteryAddress,
        abi: LOTTERY_ABI,
        functionName: "buyTicket",
        args: [BigInt(amount), referrerAddress],
      })
    } catch (error: any) {
      console.error("Buy tickets error:", error)
      throw new Error(error?.message || "Failed to buy tickets")
    }
  }

  // Get explorer URL for current chain
  const explorerUrl = NETWORK_CONFIG[chainId as keyof typeof NETWORK_CONFIG]?.explorerUrl || "https://basescan.org"

  return {
    ticketPrice: ticketPrice || null,
    usdcBalance: usdcBalance || null,
    usdcAllowance: usdcAllowance || null,
    isLoading: !ticketPrice,
    isBuying: isBuying || isConfirming,
    buyTickets,
    formattedBalance: usdcBalance ? formatUSDC(usdcBalance) : "0.00",
    // New fields for purchase success tracking
    purchaseTxHash: purchaseSuccess && purchaseTxHashRef.current ? purchaseTxHashRef.current : null,
    purchaseSuccess,
    explorerUrl,
    resetPurchaseSuccess: () => {
      setPurchaseSuccess(false)
      isPurchaseTxRef.current = false
      purchaseTxHashRef.current = null
    },
  }
}


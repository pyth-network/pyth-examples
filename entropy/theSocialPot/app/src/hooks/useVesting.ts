"use client"

import { useMemo, useEffect } from "react"
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent } from "wagmi"
import { CONTRACT_ADDRESSES, BASE_SEPOLIA_CHAIN_ID } from "@/config/contracts"
import { formatUSDC } from "@/lib/viem-client"
import vestingAbi from "@/abis/MegaYieldVesting.json"

const VESTING_ABI = vestingAbi as any

export interface VestingInfo {
  winner: `0x${string}`
  totalAmount: bigint
  monthlyAmount: bigint
  paymentsMade: bigint
  paymentsRemaining: bigint
  nextPaymentTime: bigint
}

export function useVesting() {
  const { address, isConnected } = useAccount()
  const { writeContract, data: hash, isPending: isClaimingPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const vestingAddress = CONTRACT_ADDRESSES.baseSepolia.vesting as `0x${string}`

  // Read contract data
  const { data: vestingInfoData, refetch: refetchVesting } = useReadContract({
    address: vestingAddress,
    abi: VESTING_ABI,
    functionName: "getVestingInfo",
  })

  const { data: canClaim } = useReadContract({
    address: vestingAddress,
    abi: VESTING_ABI,
    functionName: "canClaimNextPayment",
  })

  const { data: aaveBalance } = useReadContract({
    address: vestingAddress,
    abi: VESTING_ABI,
    functionName: "getAaveBalance",
  })

  // Watch for payment claimed events
  useWatchContractEvent({
    address: vestingAddress,
    abi: VESTING_ABI,
    eventName: "MonthlyPaymentClaimed",
    onLogs() {
      refetchVesting()
    },
  })

  // Refresh when transaction succeeds
  useEffect(() => {
    if (isSuccess) {
      refetchVesting()
    }
  }, [isSuccess, refetchVesting])

  const vestingInfo: VestingInfo | null = vestingInfoData && Array.isArray(vestingInfoData)
    ? {
        winner: vestingInfoData[0] as `0x${string}`,
        totalAmount: vestingInfoData[1] as bigint,
        monthlyAmount: vestingInfoData[2] as bigint,
        paymentsMade: vestingInfoData[3] as bigint,
        paymentsRemaining: vestingInfoData[4] as bigint,
        nextPaymentTime: vestingInfoData[5] as bigint,
      }
    : null

  const claimPayment = async () => {
    if (!address) {
      throw new Error("Wallet not connected")
    }

    writeContract({
      address: vestingAddress,
      abi: VESTING_ABI,
      functionName: "claimMonthlyPayment",
      args: [],
    })
  }

  const isWinner = useMemo(() => {
    return isConnected && address && vestingInfo && vestingInfo.winner.toLowerCase() === address.toLowerCase()
  }, [isConnected, address, vestingInfo])

  return {
    vestingInfo,
    canClaim: canClaim || false,
    aaveBalance: aaveBalance || null,
    isLoading: !vestingInfoData,
    isClaiming: isClaimingPending || isConfirming,
    isWinner,
    claimPayment,
    refreshData: refetchVesting,
    formattedMonthlyAmount: vestingInfo ? formatUSDC(vestingInfo.monthlyAmount) : "0.00",
    formattedTotalAmount: vestingInfo ? formatUSDC(vestingInfo.totalAmount) : "0.00",
    formattedAaveBalance: aaveBalance && typeof aaveBalance === "bigint" ? formatUSDC(aaveBalance) : "0.00",
  }
}


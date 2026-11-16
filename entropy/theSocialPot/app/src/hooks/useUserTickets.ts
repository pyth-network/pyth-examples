"use client"

import { useState, useEffect } from "react"
import { useAccount, usePublicClient, useReadContract, useChainId, useWatchContractEvent } from "wagmi"
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from "@/config/contracts"
import lotteryAbi from "@/abis/MegaYieldLottery.json"
import { formatUnits, decodeEventLog } from "viem"

// Extract ABI from Hardhat artifact (which has structure { abi: [...] })
const LOTTERY_ABI = (lotteryAbi as any).abi || lotteryAbi
const SECONDS_PER_DAY = BigInt(86400)

export interface UserTicket {
  id: string
  day: bigint
  amount: bigint
  txHash: string
  blockNumber: bigint
  timestamp: bigint
  status: "pending" | "won" | "not-won"
  drawDate: string
}

export function useUserTickets() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const [tickets, setTickets] = useState<UserTicket[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const lotteryAddress = CONTRACT_ADDRESSES.baseSepolia.lottery as `0x${string}`

  // Get current day info to check if tickets are pending
  const { data: currentDayInfo } = useReadContract({
    address: lotteryAddress,
    abi: LOTTERY_ABI,
    functionName: "getCurrentDayInfo",
  })

  const currentDay = currentDayInfo ? (currentDayInfo as any)[0] : null

  // Watch for new ticket purchases in real-time
  useWatchContractEvent({
    address: lotteryAddress,
    abi: LOTTERY_ABI,
    eventName: "TicketPurchased",
    onLogs(logs) {
      // Check if any of the new logs are for this user
      const userAddressLower = address?.toLowerCase()
      const hasUserTicket = logs.some((log) => {
        try {
          const decoded = decodeEventLog({
            abi: LOTTERY_ABI,
            eventName: "TicketPurchased",
            data: log.data,
            topics: log.topics,
          })
          const buyer = (decoded.args as any).buyer?.toLowerCase()
          return buyer === userAddressLower
        } catch {
          return false
        }
      })
      
      // If user bought a ticket, refresh the list
      if (hasUserTicket) {
        // Trigger a refetch by updating refreshTrigger
        setRefreshTrigger((prev) => prev + 1)
      }
    },
  })

  useEffect(() => {
    if (!isConnected || !address || !publicClient) {
      setTickets([])
      return
    }

    const fetchTickets = async () => {
      setIsLoading(true)
      try {
        // Get all TicketPurchased events and filter for this user
        // We get all events and filter manually to avoid issues with null referrer
        const ticketPurchasedEvent = LOTTERY_ABI.find(
          (item: any) => item.type === "event" && item.name === "TicketPurchased"
        )

        if (!ticketPurchasedEvent) {
          console.error("TicketPurchased event not found in ABI")
          setTickets([])
          setIsLoading(false)
          return
        }

        // Get the current block number to limit search range
        // Search last 100,000 blocks (approximately 2 weeks on Base)
        const currentBlock = await publicClient.getBlockNumber()
        const fromBlock = currentBlock > BigInt(100000) ? currentBlock - BigInt(100000) : BigInt(0)

        // Get all TicketPurchased events (without filtering by buyer)
        const allLogs = await publicClient.getLogs({
          address: lotteryAddress,
          event: ticketPurchasedEvent as any,
          fromBlock,
          toBlock: currentBlock,
        })
        
        console.log(`Found ${allLogs.length} total TicketPurchased events`)

        // Filter logs where buyer matches the user's address
        const userAddressLower = address.toLowerCase()
        const logs = allLogs.filter((log) => {
          // Decode the log to check the buyer
          try {
            const decoded = decodeEventLog({
              abi: LOTTERY_ABI,
              eventName: "TicketPurchased",
              data: log.data,
              topics: log.topics,
            })
            const buyer = (decoded.args as any).buyer?.toLowerCase()
            return buyer === userAddressLower
          } catch (error) {
            // If decoding fails, check topics directly
            // topics[1] should be the buyer address (padded to 32 bytes)
            if (log.topics[1]) {
              // Address in topic is padded: 0x000000000000000000000000<address>
              const buyerFromTopic = log.topics[1].toLowerCase()
              const addressInTopic = `0x${buyerFromTopic.slice(-40)}` // Last 40 chars = address
              return addressInTopic === userAddressLower
            }
            return false
          }
        })
        
        console.log(`Found ${logs.length} tickets for user ${address}`)

        // Process logs to get ticket information
        const ticketPromises = logs.map(async (log) => {
          const block = await publicClient.getBlock({ blockNumber: log.blockNumber })
          const timestamp = BigInt(block.timestamp)
          const day = timestamp / SECONDS_PER_DAY

          // Get the amount from the decoded event
          let amount: bigint = BigInt(1)
          try {
            const decoded = decodeEventLog({
              abi: LOTTERY_ABI,
              eventName: "TicketPurchased",
              data: log.data,
              topics: log.topics,
            })
            const args = decoded.args as any
            amount = BigInt(args.amount?.toString() || "1")
          } catch (error) {
            console.error("Error decoding event:", error)
          }

          // Check if day has been drawn and if user won
          let status: "pending" | "won" | "not-won" = "pending"
          if (currentDay && day < currentDay) {
            // Day is in the past, check if drawn
            try {
              const [dayDrawn, dayWinner] = await Promise.all([
                publicClient.readContract({
                  address: lotteryAddress,
                  abi: LOTTERY_ABI,
                  functionName: "dayDrawn",
                  args: [day],
                }),
                publicClient.readContract({
                  address: lotteryAddress,
                  abi: LOTTERY_ABI,
                  functionName: "dayWinners",
                  args: [day],
                }),
              ])

              if (dayDrawn) {
                const winner = (dayWinner as string).toLowerCase()
                status = winner === address.toLowerCase() ? "won" : "not-won"
              }
            } catch (error) {
              console.error("Error checking day status:", error)
            }
          } else if (currentDay && day === currentDay) {
            // Current day, still pending
            status = "pending"
          }

          // Format draw date
          const date = new Date(Number(timestamp) * 1000)
          const drawDate = formatDrawDate(date, day === currentDay)

          return {
            id: `${log.transactionHash}-${log.logIndex}`,
            day,
            amount,
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            timestamp,
            status,
            drawDate,
          } as UserTicket
        })

        const fetchedTickets = await Promise.all(ticketPromises)
        
        // Sort by timestamp (newest first)
        fetchedTickets.sort((a, b) => {
          if (b.timestamp > a.timestamp) return 1
          if (b.timestamp < a.timestamp) return -1
          return 0
        })

        setTickets(fetchedTickets)
      } catch (error) {
        console.error("Error fetching tickets:", error)
        setTickets([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchTickets()
  }, [isConnected, address, publicClient, lotteryAddress, currentDay, refreshTrigger])

  return {
    tickets,
    isLoading,
  }
}

function formatDrawDate(date: Date, isToday: boolean): string {
  if (isToday) {
    // Mostra l'ora reale della transazione
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    })
    return `Today, ${timeStr} UTC`
  }

  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  
  // Check if it's yesterday
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    })
    return `Yesterday, ${timeStr} UTC`
  }

  // Check if it's within the last week
  const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (daysDiff <= 7) {
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    })
    return `${daysDiff} day${daysDiff === 1 ? "" : "s"} ago, ${timeStr} UTC`
  }

  // For older dates, show full date and time
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  })
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  })
  return `${dateStr}, ${timeStr} UTC`
}


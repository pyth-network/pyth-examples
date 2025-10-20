"use client";

import { Button } from "@/components/ui/button";
import { lotteryAddress } from "@/contracts/addresses";
import { useLotteryGetTotalCost, useLotteryStatus, useWriteLotteryBuyTicket } from "@/contracts/generated";
import { useWaitForTransactionReceipt } from "wagmi";
import { formatEther } from "viem";
import { useState } from "react";

export function BuyTicket() {
  const [isPending, setIsPending] = useState(false);

  const { data: status } = useLotteryStatus({
    address: lotteryAddress,
  });

  const { data: totalCost } = useLotteryGetTotalCost({
    address: lotteryAddress,
  });

  const { writeContract, data: hash, isPending: isWritePending } = useWriteLotteryBuyTicket();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleBuyTicket = async () => {
    if (!totalCost) return;

    setIsPending(true);
    try {
      writeContract({
        address: lotteryAddress,
        value: totalCost,
      });
    } catch (error) {
      console.error("Error buying ticket:", error);
    } finally {
      setIsPending(false);
    }
  };

  const isLotteryActive = status === 0;

  if (!isLotteryActive) {
    return (
      <div className="text-center text-muted-foreground py-8">
        The lottery is not currently active. Please wait for a new round to begin.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <div className="text-2xl font-bold">
          {totalCost ? formatEther(totalCost) : "..."} ETH
        </div>
        <div className="text-sm text-muted-foreground">
          Ticket price + Entropy fee
        </div>
      </div>

      <Button
        onClick={handleBuyTicket}
        disabled={isPending || isWritePending || isConfirming}
        className="w-full"
        size="lg"
      >
        {isWritePending || isConfirming ? "Buying Ticket..." : "Buy Ticket"}
      </Button>

      {isSuccess && (
        <div className="text-sm text-green-600 text-center">
          Ticket purchased! Your random number will be revealed shortly.
        </div>
      )}
    </div>
  );
}

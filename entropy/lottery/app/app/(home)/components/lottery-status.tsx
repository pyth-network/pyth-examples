"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { lotteryAddress } from "@/contracts/addresses";
import {
  useLotteryPrizePool,
  useLotteryStatus,
  useLotteryTicketCount,
  useLotteryGetWinnerAddress,
  useLotteryPrizeClaimed,
  useWriteLotteryEndLottery,
  useWriteLotteryClaimPrize,
} from "@/contracts/generated";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { formatEther } from "viem";
import { Trophy, Users, Coins } from "lucide-react";

export function LotteryStatus() {
  const { address, isConnected } = useAccount();

  const { data: status } = useLotteryStatus({
    address: lotteryAddress,
  });

  const { data: prizePool } = useLotteryPrizePool({
    address: lotteryAddress,
  });

  const { data: ticketCount } = useLotteryTicketCount({
    address: lotteryAddress,
  });

  const { data: winnerAddress } = useLotteryGetWinnerAddress({
    address: lotteryAddress,
  });

  const { data: prizeClaimed } = useLotteryPrizeClaimed({
    address: lotteryAddress,
  });

  const { writeContract: endLottery, data: endHash, isPending: isEndPending } = useWriteLotteryEndLottery();
  const { isLoading: isEndConfirming } = useWaitForTransactionReceipt({
    hash: endHash,
  });

  const { writeContract: claimPrize, data: claimHash, isPending: isClaimPending } = useWriteLotteryClaimPrize();
  const { isLoading: isClaimConfirming } = useWaitForTransactionReceipt({
    hash: claimHash,
  });

  const statusText = status === 0 ? "Active" : status === 1 ? "Drawing" : "Ended";
  const statusColor = status === 0 ? "text-green-600" : status === 1 ? "text-yellow-600" : "text-blue-600";

  const isUserWinner = winnerAddress && address && winnerAddress.toLowerCase() === address.toLowerCase();

  const handleEndLottery = () => {
    endLottery({
      address: lotteryAddress,
    });
  };

  const handleClaimPrize = () => {
    claimPrize({
      address: lotteryAddress,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Lottery Status</span>
          <span className={`text-lg ${statusColor}`}>{statusText}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
              <Coins className="w-4 h-4" />
              <span className="text-sm">Prize Pool</span>
            </div>
            <div className="text-2xl font-bold">
              {prizePool ? formatEther(prizePool) : "0"} ETH
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
              <Users className="w-4 h-4" />
              <span className="text-sm">Tickets</span>
            </div>
            <div className="text-2xl font-bold">
              {ticketCount?.toString() || "0"}
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
              <Trophy className="w-4 h-4" />
              <span className="text-sm">Winner</span>
            </div>
            <div className="text-xs font-mono break-all">
              {winnerAddress && winnerAddress !== "0x0000000000000000000000000000000000000000"
                ? `${winnerAddress.slice(0, 6)}...${winnerAddress.slice(-4)}`
                : "TBD"}
            </div>
          </div>
        </div>

        {status === 2 && isUserWinner && !prizeClaimed && isConnected && (
          <Button
            onClick={handleClaimPrize}
            disabled={isClaimPending || isClaimConfirming}
            className="w-full"
            size="lg"
          >
            {isClaimPending || isClaimConfirming ? "Claiming Prize..." : "🎉 Claim Your Prize!"}
          </Button>
        )}

        {status === 2 && prizeClaimed && isUserWinner && (
          <div className="text-center text-green-600 font-semibold">
            Prize claimed! Congratulations! 🎉
          </div>
        )}
      </CardContent>
    </Card>
  );
}

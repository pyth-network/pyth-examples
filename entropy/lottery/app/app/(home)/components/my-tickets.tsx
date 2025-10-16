"use client";

import { Card } from "@/components/ui/card";
import { lotteryAddress } from "@/contracts/addresses";
import { useLotteryGetTicket, useLotteryGetUserTickets } from "@/contracts/generated";
import { useAccount } from "wagmi";
import { CheckCircle2, Clock, Trophy } from "lucide-react";
import { useLotteryWinnerAddress, useLotteryWinningTicketId } from "@/contracts/generated";

function TicketCard({ ticketId }: { ticketId: bigint }) {
  const { data: ticket } = useLotteryGetTicket({
    address: lotteryAddress,
    args: [ticketId],
  });

  const { data: winningTicketId } = useLotteryWinningTicketId({
    address: lotteryAddress,
  });

  const isWinner = winningTicketId !== undefined && winningTicketId === ticketId;

  if (!ticket) return null;

  const [buyer, sequenceNumber, randomNumber, fulfilled] = ticket;

  return (
    <Card className={`p-4 ${isWinner ? "border-yellow-500 border-2" : ""}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Ticket #{ticketId.toString()}</span>
            {isWinner && (
              <Trophy className="w-4 h-4 text-yellow-500" />
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            Sequence: {sequenceNumber.toString()}
          </div>
          {fulfilled ? (
            <div className="text-xs font-mono break-all">
              Random: {randomNumber}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Waiting for random number...
            </div>
          )}
        </div>
        <div className="ml-4">
          {fulfilled && (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          )}
        </div>
      </div>
      {isWinner && (
        <div className="mt-2 text-sm font-semibold text-yellow-600">
          🎉 Winner!
        </div>
      )}
    </Card>
  );
}

export function MyTickets() {
  const { address } = useAccount();

  const { data: ticketIds } = useLotteryGetUserTickets({
    address: lotteryAddress,
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  if (!address) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Connect your wallet to view your tickets
      </div>
    );
  }

  if (!ticketIds || ticketIds.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        You haven't purchased any tickets yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {ticketIds.map((ticketId) => (
        <TicketCard key={ticketId.toString()} ticketId={ticketId} />
      ))}
    </div>
  );
}

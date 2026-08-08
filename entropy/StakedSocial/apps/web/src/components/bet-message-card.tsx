"use client";

import { Calendar, TrendingUp } from "lucide-react";

interface BetMessageCardProps {
  question: string;
  creatorName: string;
  deadline: string; // ISO date string
  onPlaceBet?: () => void;
}

export default function BetMessageCard({
  question,
  creatorName,
  deadline,
  onPlaceBet,
}: BetMessageCardProps) {
  // Format deadline to human readable
  const formatDeadline = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Format the date
    const formatted = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });

    // Add time if within 24 hours
    const timeFormatted = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    if (diffDays === 0) {
      return `Today at ${timeFormatted}`;
    } else if (diffDays === 1) {
      return `Tomorrow at ${timeFormatted}`;
    } else if (diffDays > 0 && diffDays <= 7) {
      return `${diffDays} days • ${formatted}`;
    } else {
      return formatted;
    }
  };

  return (
    <div className="w-full flex justify-center my-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="max-w-[90%] w-full">
        {/* NEW BET Badge */}
        <div className="flex justify-center mb-2">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-md flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3" />
            NEW BET
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl p-5 shadow-lg border-2 border-blue-200 backdrop-blur-sm">
          {/* Question */}
          <div className="mb-4 text-center">
            <h3 className="text-base font-bold text-gray-900 leading-snug mb-2">
              {question}
            </h3>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
              <span className="font-medium">Created by {creatorName}</span>
            </div>
          </div>

          {/* Deadline */}
          <div className="flex items-center justify-center gap-1.5 mb-4 text-xs text-gray-600 bg-white/60 rounded-lg px-3 py-2 border border-blue-100">
            <Calendar className="h-3.5 w-3.5 text-blue-600" />
            <span className="font-medium">Ends {formatDeadline(deadline)}</span>
          </div>

          {/* Place Bet Button */}
          <button
            onClick={onPlaceBet}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 active:scale-98 transition-all shadow-md hover:shadow-xl flex items-center justify-center gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            Place Bet
          </button>
        </div>
      </div>
    </div>
  );
}

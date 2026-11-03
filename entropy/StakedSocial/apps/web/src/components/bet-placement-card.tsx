"use client";

interface BetPlacementCardProps {
  betterName: string;
  betterPfp?: string;
  questionText: string;
  timestamp: number; // milliseconds
}

export default function BetPlacementCard({
  betterName,
  betterPfp,
  questionText,
  timestamp,
}: BetPlacementCardProps) {
  const formatTime = (ts: number) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - ts;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="w-full flex justify-center my-2 animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="max-w-[95%] w-full">
        <div className="bg-white rounded-lg px-3 py-2 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-100 transition-all flex items-center gap-2.5">
          {/* Pfp */}
          <div className="flex-shrink-0">
            {betterPfp ? (
              <img
                src={betterPfp}
                alt={betterName}
                className="w-7 h-7 rounded-full object-cover ring-1 ring-gray-200"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                {betterName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-xs font-bold text-gray-900">
                {betterName}
              </span>
              <span className="text-xs text-gray-600">placed a bet on</span>
              <span className="text-xs font-semibold text-gray-800 italic truncate">
                "{questionText}"
              </span>
            </div>
          </div>

          {/* Timestamp */}
          <div className="flex-shrink-0">
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {formatTime(timestamp)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

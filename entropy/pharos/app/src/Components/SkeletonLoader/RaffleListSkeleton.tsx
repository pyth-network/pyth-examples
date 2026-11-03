import React from 'react';

const RaffleListSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 xl:gap-6 2xl:gap-8">
      {[1, 2, 3, 4, 5, 6].map((index) => (
        <div
          key={index}
          className="h-full bg-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl overflow-hidden animate-pulse"
        >
          {/* Image Section Skeleton */}
          <div className="relative aspect-square overflow-hidden bg-gray-200">
            {/* Browser-style top bar */}
            <div className="absolute top-0 left-0 w-full h-8 bg-gray-300 border-b-4 border-black flex items-center px-3 space-x-2 z-10">
              <span className="w-3 h-3 bg-gray-400 rounded-full border-2 border-gray-600"></span>
              <span className="w-3 h-3 bg-gray-400 rounded-full border-2 border-gray-600"></span>
              <span className="w-3 h-3 bg-gray-400 rounded-full border-2 border-gray-600"></span>
            </div>

            {/* Placeholder content */}
            <div className="relative w-full h-full pt-8 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4 text-gray-400">🎫</div>
                <p className="text-lg font-rubik font-black text-gray-400">Loading...</p>
              </div>
            </div>

            {/* Status Badge Skeleton */}
            <div className="absolute top-10 right-3 bg-gray-300 px-3 py-1 border-3 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] rounded w-16 h-6"></div>
          </div>

          {/* Content Section Skeleton */}
          <div className="p-6">
            {/* Title Skeleton */}
            <div className="bg-gray-300 h-8 rounded-lg mb-4 w-3/4"></div>

            {/* Contract Address Skeleton */}
            <div className="mb-4 p-2 bg-gray-100 border-2 border-gray-300 rounded">
              <div className="bg-gray-300 h-3 rounded w-32 mb-1"></div>
              <div className="bg-gray-300 h-3 rounded w-full"></div>
            </div>

            {/* Countdown Timer Skeleton */}
            <div className="mb-4">
              <div className="bg-gray-300 h-4 rounded w-28 mb-2"></div>
              <div className="flex items-center justify-between gap-2">
                {/* Hours */}
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-gray-300 border-3 border-black rounded-lg py-2 h-12 shadow-[3px_3px_0px_#000]"></div>
                  <div className="bg-gray-300 h-3 rounded w-12 mt-1"></div>
                </div>

                <div className="text-xl font-bold text-gray-300">:</div>

                {/* Minutes */}
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-gray-300 border-3 border-black rounded-lg py-2 h-12 shadow-[3px_3px_0px_#000]"></div>
                  <div className="bg-gray-300 h-3 rounded w-14 mt-1"></div>
                </div>

                <div className="text-xl font-bold text-gray-300">:</div>

                {/* Seconds */}
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-gray-300 border-3 border-black rounded-lg py-2 h-12 shadow-[3px_3px_0px_#000]"></div>
                  <div className="bg-gray-300 h-3 rounded w-14 mt-1"></div>
                </div>
              </div>
            </div>

            {/* Price Per Ticket Skeleton */}
            <div className="bg-pharos-orange/10 border-l-4 border-pharos-orange px-4 py-3 mb-4 rounded">
              <div className="bg-gray-300 h-3 rounded w-28 mb-1"></div>
              <div className="flex items-center gap-2">
                <div className="bg-gray-300 w-6 h-6 rounded-full"></div>
                <div className="bg-gray-300 h-6 rounded w-24"></div>
              </div>
            </div>

            {/* Tickets Available Skeleton */}
            <div className="bg-gray-50 border-2 border-black rounded-lg px-4 py-3 mb-4">
              <div className="bg-gray-300 h-3 rounded w-32 mb-1"></div>
              <div className="flex items-center justify-between mb-2">
                <div className="bg-gray-300 h-8 rounded w-20"></div>
                <div className="bg-gray-300 h-3 rounded w-16"></div>
              </div>
              {/* Mini Progress Bar Skeleton */}
              <div className="w-full h-2 bg-gray-200 border-2 border-black rounded-full overflow-hidden">
                <div className="h-full bg-gray-300 w-1/2"></div>
              </div>
            </div>

            {/* Additional Info Skeleton */}
            <div className="mb-4 p-3 bg-blue-50 border-2 border-blue-300 rounded">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-300 h-4 rounded"></div>
                <div className="bg-gray-300 h-4 rounded"></div>
              </div>
            </div>

            {/* Action Button Skeleton */}
            <div className="bg-gray-300 h-12 rounded-lg w-full"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RaffleListSkeleton;

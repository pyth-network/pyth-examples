import React from 'react';

const LeaderBoardSkeleton: React.FC = () => {
  return (
    <>
      {/* Top 3 Podium Skeleton - Desktop Only */}
      <div className="hidden lg:block mb-16 animate-pulse">
        <div className="flex items-end justify-center gap-4 max-w-4xl mx-auto">
          {/* 2nd Place Skeleton */}
          <div className="w-52">
            <div className="bg-gray-300 border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,1)] rounded-xl overflow-hidden">
              {/* Profile Image Section */}
              <div className="bg-white border-b-6 border-black p-6 flex justify-center">
                <div className="size-20 rounded-full border-4 border-black bg-gray-300"></div>
              </div>

              {/* Name Section */}
              <div className="p-6 pb-8">
                <div className="bg-gray-200 h-6 rounded mb-4 w-3/4 mx-auto"></div>

                {/* Rank Number */}
                <div className="flex justify-center">
                  <div className="size-12 bg-white border-3 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] rounded-full flex items-center justify-center">
                    <div className="bg-gray-300 w-6 h-6 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 1st Place Skeleton - Taller */}
          <div className="w-56">
            <div className="bg-gray-300 border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] rounded-xl relative">
              {/* Crown decoration */}
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-5xl">
                <div className="bg-gray-300 w-12 h-12 rounded-full"></div>
              </div>

              {/* Profile Image Section */}
              <div className="bg-white rounded-t-lg border-b-4 border-black p-8 flex justify-center">
                <div className="size-24 rounded-full border-6 border-black bg-gray-300"></div>
              </div>

              {/* Name Section */}
              <div className="p-6 pb-10">
                <div className="bg-gray-200 h-8 rounded mb-6 w-3/4 mx-auto"></div>

                {/* Rank Number */}
                <div className="flex justify-center">
                  <div className="size-16 bg-white border-3 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] rounded-full flex items-center justify-center">
                    <div className="bg-gray-300 w-8 h-8 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3rd Place Skeleton */}
          <div className="w-48">
            <div className="bg-gray-300 border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] rounded-xl overflow-hidden">
              {/* Profile Image Section */}
              <div className="bg-white border-b-4 border-black p-6 flex justify-center">
                <div className="size-20 rounded-full border-6 border-black bg-gray-300"></div>
              </div>

              {/* Name Section */}
              <div className="p-6 pb-8">
                <div className="bg-gray-200 h-5 rounded mb-4 w-3/4 mx-auto"></div>

                {/* Rank Number */}
                <div className="flex justify-center">
                  <div className="size-12 bg-white border-3 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] rounded-full flex items-center justify-center">
                    <div className="bg-gray-300 w-6 h-6 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard List Skeleton */}
      <div className="bg-white border-6 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] rounded-xl overflow-hidden animate-pulse">
        {/* Table Header - Desktop */}
        <div className="hidden md:block bg-black text-white border-b-6 border-black p-6">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-1 bg-gray-700 h-4 rounded"></div>
            <div className="col-span-4 bg-gray-700 h-4 rounded"></div>
            <div className="col-span-2 bg-gray-700 h-4 rounded"></div>
            <div className="col-span-2 bg-gray-700 h-4 rounded"></div>
            <div className="col-span-3 bg-gray-700 h-4 rounded"></div>
          </div>
        </div>

        {/* User Rows Skeleton */}
        {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
          <div
            key={item}
            className="border-b-4 border-black last:border-b-0 bg-linear-to-br from-gray-100 via-white to-gray-50"
          >
            {/* Desktop Layout */}
            <div className="hidden md:block p-6">
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* Rank */}
                <div className="col-span-1 flex justify-center">
                  <div className="bg-gray-300 w-8 h-8 rounded"></div>
                </div>

                {/* Player Info */}
                <div className="col-span-4 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full border-4 border-black bg-gray-300"></div>
                  <div className="flex-1">
                    <div className="bg-gray-300 h-6 rounded w-32 mb-2"></div>
                    <div className="bg-gray-300 h-4 rounded w-24"></div>
                  </div>
                </div>

                {/* Raffles Joined */}
                <div className="col-span-2 flex justify-center">
                  <div className="bg-gray-300 w-12 h-8 rounded"></div>
                </div>

                {/* Raffles Won */}
                <div className="col-span-2 flex justify-center">
                  <div className="bg-gray-300 w-12 h-8 rounded"></div>
                </div>

                {/* Win Rate */}
                <div className="col-span-3 flex justify-center">
                  <div className="bg-gray-300 border-3 border-black rounded-lg px-6 py-2 w-28 h-12"></div>
                </div>
              </div>
            </div>

            {/* Mobile Layout */}
            <div className="md:hidden p-6 space-y-4">
              {/* Rank and Player */}
              <div className="flex items-center gap-4">
                <div className="bg-gray-300 w-8 h-8 rounded"></div>
                <div className="w-14 h-14 rounded-full border-4 border-black bg-gray-300"></div>
                <div className="flex-1">
                  <div className="bg-gray-300 h-5 rounded w-24 mb-2"></div>
                  <div className="bg-gray-300 h-3 rounded w-20"></div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-200 border-3 border-black px-3 py-2 rounded-lg h-20"></div>
                <div className="bg-gray-200 border-3 border-black px-3 py-2 rounded-lg h-20"></div>
                <div className="bg-gray-300 border-3 border-black px-3 py-2 rounded-lg h-20"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default LeaderBoardSkeleton;

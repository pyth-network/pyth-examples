import React from 'react';

const IndividualRaffleSkeleton: React.FC = () => {
  return (
    <>
      {/* Raffle ID Badge - Top */}
      <div className="inline-block mb-6 animate-pulse">
        <div className="bg-gray-300 px-6 py-3 border-4 border-black shadow-[6px_6px_0px_rgba(243,162,15,1)] rounded w-64 h-14"></div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Left Side - Image Skeleton */}
        <div className="animate-pulse">
          <div className="sticky top-8">
            <div className="relative bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden aspect-square">
              {/* Browser-style top bar */}
              <div className="absolute top-0 left-0 w-full h-10 bg-gray-300 border-b-4 border-black flex items-center px-3 space-x-2 z-10">
                <span className="w-4 h-4 bg-gray-400 rounded-full border-2 border-gray-600"></span>
                <span className="w-4 h-4 bg-gray-400 rounded-full border-2 border-gray-600"></span>
                <span className="w-4 h-4 bg-gray-400 rounded-full border-2 border-gray-600"></span>
                <div className="flex-1 bg-gray-400 border-2 border-gray-500 rounded-md h-6 ml-4"></div>
              </div>

              {/* Image Placeholder */}
              <div className="relative w-full h-full pt-10 bg-gray-200 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-8xl mb-4 text-gray-400">🎫</div>
                  <p className="text-2xl font-rubik font-black text-gray-400">Loading...</p>
                </div>
              </div>

              {/* Status Badge Skeleton */}
              <div className="absolute bottom-6 right-6 bg-gray-300 px-6 py-3 border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] rounded-lg w-24 h-16"></div>
            </div>
          </div>
        </div>

        {/* Right Side - Details Skeleton */}
        <div className="animate-pulse">
          {/* Title Skeleton */}
          <div className="bg-gray-300 h-12 md:h-16 lg:h-20 rounded-lg mb-6 w-3/4"></div>

          {/* Description Skeleton */}
          <div className="bg-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-6 mb-6">
            <div className="bg-gray-300 h-6 rounded w-48 mb-3"></div>
            <div className="bg-gray-300 h-4 rounded w-full mb-2"></div>
            <div className="bg-gray-300 h-4 rounded w-5/6"></div>
          </div>

          {/* Progress Bar Skeleton */}
          <div className="bg-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-6 mb-6">
            <div className="flex justify-between items-center mb-3">
              <div className="bg-gray-300 h-4 rounded w-32"></div>
              <div className="bg-gray-300 h-6 rounded w-16"></div>
            </div>
            <div className="relative w-full h-6 bg-gray-200 border-4 border-black rounded-lg overflow-hidden">
              <div className="absolute top-0 left-0 h-full bg-gray-300 w-1/2"></div>
            </div>
          </div>

          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="bg-white border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-5"
              >
                <div className="bg-gray-300 h-4 rounded w-28 mb-2"></div>
                <div className="bg-gray-300 h-8 rounded w-20 mb-1"></div>
                <div className="bg-gray-300 h-3 rounded w-24"></div>
              </div>
            ))}
          </div>

          {/* Countdown Timer Skeleton */}
          <div className="bg-linear-to-br from-white to-gray-50 border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-xl p-6 mb-6">
            <div className="bg-gray-300 h-6 rounded w-36 mb-4"></div>

            <div className="flex items-center justify-between gap-3 mb-4">
              {/* Days */}
              <div className="flex-1 flex flex-col items-center">
                <div className="w-full bg-gray-300 border-4 border-black rounded-lg py-4 h-20 shadow-[4px_4px_0px_#000]"></div>
                <div className="bg-gray-300 h-4 rounded w-12 mt-2"></div>
              </div>

              <div className="text-3xl font-bold text-gray-300">:</div>

              {/* Hours */}
              <div className="flex-1 flex flex-col items-center">
                <div className="w-full bg-gray-300 border-4 border-black rounded-lg py-4 h-20 shadow-[4px_4px_0px_#000]"></div>
                <div className="bg-gray-300 h-4 rounded w-12 mt-2"></div>
              </div>

              <div className="text-3xl font-bold text-gray-300">:</div>

              {/* Minutes */}
              <div className="flex-1 flex flex-col items-center">
                <div className="w-full bg-gray-300 border-4 border-black rounded-lg py-4 h-20 shadow-[4px_4px_0px_#000]"></div>
                <div className="bg-gray-300 h-4 rounded w-16 mt-2"></div>
              </div>

              <div className="text-3xl font-bold text-gray-300">:</div>

              {/* Seconds */}
              <div className="flex-1 flex flex-col items-center">
                <div className="w-full bg-gray-300 border-4 border-black rounded-lg py-4 h-20 shadow-[4px_4px_0px_#000]"></div>
                <div className="bg-gray-300 h-4 rounded w-16 mt-2"></div>
              </div>
            </div>

            {/* End Date Skeleton */}
            <div className="bg-pharos-orange/10 border-l-4 border-pharos-orange px-4 py-3 rounded">
              <div className="bg-gray-300 h-4 rounded w-32 mb-1"></div>
              <div className="bg-gray-300 h-6 rounded w-48 mb-1"></div>
              <div className="bg-gray-300 h-5 rounded w-40"></div>
            </div>
          </div>

          {/* Smart Contract Address Skeleton */}
          <div className="bg-black border-4 border-black shadow-[6px_6px_0px_rgba(243,162,15,1)] rounded-xl p-6 mb-6">
            <div className="bg-gray-700 h-5 rounded w-40 mb-3"></div>
            <div className="bg-gray-800 border-2 border-gray-600 rounded-lg px-4 py-3 h-12"></div>
            <div className="bg-gray-700 h-4 rounded w-32 mt-3"></div>
          </div>

          {/* Buy Tickets Button Skeleton */}
          <div className="space-y-4">
            <div className="bg-gray-300 border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-lg h-20 w-full"></div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-300 border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-lg h-16"></div>
              <div className="bg-gray-300 border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.8)] rounded-lg h-16"></div>
            </div>
          </div>

          {/* Additional Info Skeleton */}
          <div className="mt-6 bg-white/50 border-2 border-black rounded-lg p-4">
            <div className="bg-gray-300 h-3 rounded w-full"></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default IndividualRaffleSkeleton;

import React from 'react'

const RaffleSliderSkeleton = () => {
  return (
    <>
      <div className="flex justify-center items-center px-3 xs:px-4 bp-xs:px-6 md:px-8 lg:px-12">
          <div className="w-full flex justify-center">
            {/* Skeleton Card */}
            <div className="relative bg-linear-to-br from-white to-gray-50 border-2 xs:border-3 md:border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,0.8)] xs:shadow-[6px_6px_0px_rgba(0,0,0,0.8)] md:shadow-[8px_8px_0px_rgba(0,0,0,0.8)] rounded-lg xs:rounded-xl overflow-hidden w-full max-w-6xl animate-pulse">
              <div className="flex flex-col md:flex-row gap-3 xs:gap-4 bp-xs:gap-5 md:gap-8 p-3 xs:p-4 bp-xs:p-5 md:p-10">
                {/* Left Content Section */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    {/* Title Skeleton */}
                    <div className="bg-gray-300 h-8 xs:h-10 bp-xs:h-12 md:h-14 lg:h-16 rounded-lg mb-3 xs:mb-4 bp-xs:mb-5 md:mb-6 w-3/4"></div>

                    {/* Ticket Price Skeleton */}
                    <div className="bg-pharos-orange/10 border-l-2 xs:border-l-3 md:border-l-4 border-pharos-orange px-2 xs:px-3 bp-xs:px-4 py-2 xs:py-2.5 bp-xs:py-3 mb-3 xs:mb-4 bp-xs:mb-5 md:mb-6 rounded">
                      <div className="bg-gray-300 h-4 xs:h-5 bp-xs:h-6 md:h-7 rounded w-32 mb-2"></div>
                      <div className="flex items-center gap-1">
                        <div className="bg-gray-300 size-5 xs:size-6 bp-xs:size-7 md:size-8 rounded-full"></div>
                        <div className="bg-gray-300 h-6 xs:h-7 bp-xs:h-8 md:h-9 rounded w-40"></div>
                      </div>
                    </div>

                    {/* Countdown Timer Skeleton */}
                    <div className="mb-3 xs:mb-4 bp-xs:mb-5 md:mb-6">
                      <div className="bg-gray-300 h-4 xs:h-5 md:h-6 rounded w-36 mb-2 xs:mb-2.5 bp-xs:mb-3"></div>
                      <div className="flex items-center space-x-1.5 xs:space-x-2 bp-xs:space-x-3 md:space-x-4">
                        {/* Days */}
                        <div className="flex flex-col items-center">
                          <div className="bg-gray-300 border border-black xs:border-2 rounded-md xs:rounded-lg px-1.5 xs:px-2 bp-xs:px-3 md:px-4 py-1.5 xs:py-2 bp-xs:py-2.5 md:py-3 shadow-[2px_2px_0px_#000] xs:shadow-[3px_3px_0px_#000] md:shadow-[4px_4px_0px_#000] min-w-[45px] xs:min-w-[50px] bp-xs:min-w-[60px] md:min-w-[70px] h-12 xs:h-14 lg:h-16"></div>
                          <div className="bg-gray-300 h-3 xs:h-4 md:h-5 rounded w-10 mt-1 xs:mt-1.5 md:mt-2"></div>
                        </div>

                        <div className="text-lg xs:text-xl bp-xs:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-300">:</div>

                        {/* Hours */}
                        <div className="flex flex-col items-center">
                          <div className="bg-gray-300 border border-black xs:border-2 rounded-md xs:rounded-lg px-1.5 xs:px-2 bp-xs:px-3 md:px-4 py-1.5 xs:py-2 bp-xs:py-2.5 md:py-3 shadow-[2px_2px_0px_#000] xs:shadow-[3px_3px_0px_#000] md:shadow-[4px_4px_0px_#000] min-w-[45px] xs:min-w-[50px] bp-xs:min-w-[60px] md:min-w-[70px] h-12 xs:h-14 lg:h-16"></div>
                          <div className="bg-gray-300 h-3 xs:h-4 md:h-5 rounded w-12 mt-1 xs:mt-1.5 md:mt-2"></div>
                        </div>

                        <div className="text-lg xs:text-xl bp-xs:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-300">:</div>

                        {/* Minutes */}
                        <div className="flex flex-col items-center">
                          <div className="bg-gray-300 border border-black xs:border-2 rounded-md xs:rounded-lg px-1.5 xs:px-2 bp-xs:px-3 md:px-4 py-1.5 xs:py-2 bp-xs:py-2.5 md:py-3 shadow-[2px_2px_0px_#000] xs:shadow-[3px_3px_0px_#000] md:shadow-[4px_4px_0px_#000] min-w-[45px] xs:min-w-[50px] bp-xs:min-w-[60px] md:min-w-[70px] h-12 xs:h-14 lg:h-16"></div>
                          <div className="bg-gray-300 h-3 xs:h-4 md:h-5 rounded w-10 mt-1 xs:mt-1.5 md:mt-2"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Button Skeleton */}
                  <div className="bg-gray-300 h-12 xs:h-14 bp-xs:h-16 md:h-18 rounded-lg w-full md:w-48 mt-3 xs:mt-4 bp-xs:mt-5 md:mt-6"></div>
                </div>

                {/* Right Image Section Skeleton */}
                <div className="relative w-full xs:max-w-[200px] bp-xs:max-w-[240px] md:w-[280px] lg:w-[320px] aspect-square h-fit shrink-0 rounded-lg xs:rounded-xl overflow-hidden border-2 xs:border-3 md:border-4 border-black bg-gray-200 shadow-[4px_4px_0px_rgba(0,0,0,0.8)] xs:shadow-[6px_6px_0px_rgba(0,0,0,0.8)] md:shadow-[8px_8px_0px_rgba(0,0,0,0.8)] mx-auto md:mx-0">
                  {/* Browser-style top bar */}
                  <div className="absolute top-0 left-0 w-full h-5 xs:h-6 bp-xs:h-7 md:h-8 bg-gray-300 border-b border-black xs:border-b-2 flex items-center px-1.5 xs:px-2 space-x-1 xs:space-x-1.5 bp-xs:space-x-2">
                    <span className="w-2 h-2 xs:w-2.5 xs:h-2.5 bp-xs:w-3 bp-xs:h-3 bg-gray-400 rounded-full border border-gray-600"></span>
                    <span className="w-2 h-2 xs:w-2.5 xs:h-2.5 bp-xs:w-3 bp-xs:h-3 bg-gray-400 rounded-full border border-gray-600"></span>
                    <span className="w-2 h-2 xs:w-2.5 xs:h-2.5 bp-xs:w-3 bp-xs:h-3 bg-gray-400 rounded-full border border-gray-600"></span>
                    <div className="flex-1 bg-gray-400 border border-gray-500 rounded-sm xs:rounded-md h-3 xs:h-4 bp-xs:h-5 ml-2 xs:ml-3 bp-xs:ml-4"></div>
                  </div>
                  <div className="w-full h-full flex items-center justify-center pt-8 xs:pt-10 bp-xs:pt-12 md:pt-14">
                    <div className="text-center">
                      <div className="text-4xl mb-2 text-gray-400">🎟️</div>
                      <p className="text-sm font-rubik font-bold text-gray-400">Loading...</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Dots Skeleton */}
        <div className="flex justify-center mt-8 space-x-3">
          {[1, 2, 3].map((index) => (
            <div
              key={index}
              className="w-4 h-4 rounded-full border-2 border-black bg-gray-300 animate-pulse"
            />
          ))}
        </div>
    </>
  )
}

export default RaffleSliderSkeleton

import React from 'react';

const ProfileRafflesSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="bg-linear-to-br from-pink-50 to-purple-50 border-4 border-black shadow-[6px_6px_0px_#000]"
        >
          <div className="p-4">
            {/* Image Skeleton */}
            <div className="bg-gray-300 border-2 border-black h-52 mb-4 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-2 text-gray-400">🎫</div>
                <p className="text-sm font-bold text-gray-400">Loading...</p>
              </div>
            </div>

            {/* Title Skeleton */}
            <div className="bg-gray-300 h-6 rounded mb-2 w-3/4"></div>

            {/* Details Skeleton */}
            <div className="space-y-2">
              <div className="bg-gray-300 h-4 rounded w-1/2"></div>
              <div className="bg-gray-300 h-4 rounded w-1/3"></div>
              <div className="bg-gray-300 h-4 rounded w-2/3"></div>

              {/* Status Badge Skeleton */}
              <div className="bg-gray-300 border-2 border-black h-6 w-20 mt-2"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProfileRafflesSkeleton;

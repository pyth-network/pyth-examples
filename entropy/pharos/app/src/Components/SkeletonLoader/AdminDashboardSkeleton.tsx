import React from 'react';

const AdminDashboardSkeleton: React.FC = () => {
  return (
    <div className="font-rubik min-h-screen bg-linear-to-br from-purple-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto animate-pulse">
        {/* Header Skeleton */}
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] p-6 mb-8">
          <div className="flex items-center gap-4">
            {/* Icon Skeleton */}
            <div className="bg-gray-300 w-14 h-14 rounded-lg"></div>
            <div className="flex-1">
              {/* Title Skeleton */}
              <div className="bg-gray-300 h-10 rounded w-64 mb-2"></div>
              {/* Subtitle Skeleton */}
              <div className="bg-gray-300 h-5 rounded w-48"></div>
            </div>
          </div>

          {/* Contract Info Skeleton */}
          <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200">
            <div className="bg-gray-300 h-4 rounded w-40 mb-2"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="bg-gray-300 h-3 rounded"></div>
              <div className="bg-gray-300 h-3 rounded"></div>
            </div>
          </div>
        </div>

        {/* Form Skeleton */}
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] p-6 md:p-8">
          {/* Form Header Skeleton */}
          <div className="mb-6">
            <div className="bg-gray-300 border-4 border-black px-4 py-2 shadow-[4px_4px_0px_#000] w-64 h-12"></div>
          </div>

          <div className="space-y-6">
            {/* Image Upload Skeleton */}
            <div>
              <div className="bg-gray-300 h-6 rounded w-48 mb-2"></div>
              <div className="border-4 border-black p-4 bg-gray-50 h-64 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-2 text-gray-400">📷</div>
                  <p className="text-sm font-bold text-gray-400">Loading...</p>
                </div>
              </div>
            </div>

            {/* Prize Description Skeleton */}
            <div>
              <div className="bg-gray-300 h-6 rounded w-40 mb-2"></div>
              <div className="bg-gray-300 border-4 border-black h-12 rounded"></div>
            </div>

            {/* Two Column Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ticket Price Skeleton */}
              <div>
                <div className="bg-gray-300 h-6 rounded w-32 mb-2"></div>
                <div className="bg-gray-300 border-4 border-black h-12 rounded"></div>
              </div>

              {/* Max Tickets Skeleton */}
              <div>
                <div className="bg-gray-300 h-6 rounded w-32 mb-2"></div>
                <div className="bg-gray-300 border-4 border-black h-12 rounded"></div>
              </div>

              {/* Max Tickets Per User Skeleton */}
              <div>
                <div className="bg-gray-300 h-6 rounded w-40 mb-2"></div>
                <div className="bg-gray-300 border-4 border-black h-12 rounded"></div>
              </div>

              {/* Prize Amount Skeleton */}
              <div>
                <div className="bg-gray-300 h-6 rounded w-32 mb-2"></div>
                <div className="bg-gray-300 border-4 border-black h-12 rounded"></div>
              </div>

              {/* End Date Skeleton */}
              <div>
                <div className="bg-gray-300 h-6 rounded w-24 mb-2"></div>
                <div className="bg-gray-300 border-4 border-black h-12 rounded"></div>
              </div>

              {/* End Time Skeleton */}
              <div>
                <div className="bg-gray-300 h-6 rounded w-24 mb-2"></div>
                <div className="bg-gray-300 border-4 border-black h-12 rounded"></div>
              </div>
            </div>

            {/* House Fee Skeleton */}
            <div>
              <div className="bg-gray-300 h-6 rounded w-48 mb-2"></div>
              <div className="bg-gray-300 border-4 border-black h-12 rounded"></div>
            </div>

            {/* Submit Button Skeleton */}
            <div className="bg-gray-300 border-4 border-black shadow-[8px_8px_0px_#000] h-14 rounded w-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardSkeleton;

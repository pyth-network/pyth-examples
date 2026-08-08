export const LoadingState = () => {
  return (
    <div className="flex h-full bg-black text-white">
      <div className="w-80 bg-gray-900 p-6">
        <div className="animate-pulse bg-gray-800 h-6 w-24 rounded mb-4"></div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-gray-800 h-12 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="p-6 bg-gradient-to-b from-purple-900 to-black">
          <div className="animate-pulse bg-gray-800 h-8 w-48 rounded mb-2"></div>
          <div className="animate-pulse bg-gray-800 h-4 w-32 rounded"></div>
        </div>
        <div className="p-6 flex-1">
          <div className="flex items-center space-x-4 mb-6">
            <div className="animate-pulse bg-gray-800 w-12 h-12 rounded-full"></div>
            <div className="animate-pulse bg-gray-800 w-12 h-12 rounded-full"></div>
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-gray-800 h-16 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
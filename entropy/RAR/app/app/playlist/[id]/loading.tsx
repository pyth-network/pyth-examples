export default function Loading() {
  return (
    <div className="flex h-full bg-black text-white">
      <div className="w-64 bg-black p-6 flex flex-col">
        <div className="animate-pulse bg-gray-800 h-6 w-24 rounded mb-8"></div>
      </div>
      
      <div className="flex-1 flex flex-col">
        <div className="bg-gradient-to-b from-green-900 to-gray-900 p-6 flex items-end space-x-6">
          <div className="w-48 h-48 bg-gray-800 rounded animate-pulse"></div>
          <div className="flex-1 space-y-4">
            <div className="bg-gray-800 h-4 w-20 rounded animate-pulse"></div>
            <div className="bg-gray-800 h-12 w-64 rounded animate-pulse"></div>
            <div className="bg-gray-800 h-4 w-48 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
"use client";

export default function BetsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pt-20 pb-24">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Active Bets</h1>
            <p className="text-sm text-gray-600">Your active wagers</p>
          </div>
        </div>

        <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">No active bets yet</p>
        </div>
      </div>
    </div>
  );
}

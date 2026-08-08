"use client";

import { useState, useEffect } from "react";
import { X, Plus, Minus, TrendingUp, AlertCircle } from "lucide-react";
import { MarketMetadata, getUserMarketShares } from "@/lib/market-service";

interface PlaceBetModalProps {
  isOpen: boolean;
  onClose: () => void;
  market: MarketMetadata;
  userAddress: string;
  username: string;
  onPlaceBet: (outcomeIndex: number, sharesAmount: string) => Promise<void>;
}

const ETH_PRICE_USD = 2877;
const ETH_TO_WEI = "1000000000000000000"; // 1e18

// Convert Wei to USD cents
const weiToCents = (wei: string): number => {
  if (!wei || wei === "0") return 0;
  const eth = parseFloat(wei) / parseFloat(ETH_TO_WEI);
  const cents = eth * (ETH_PRICE_USD * 100);
  return Math.round(cents * 100) / 100;
};

// Convert shares to Wei
const sharesToWei = (shares: number, shareSizeWei: string): string => {
  const shareSizeBN = BigInt(shareSizeWei);
  const totalWei = shareSizeBN * BigInt(shares);
  return totalWei.toString();
};

export default function PlaceBetModal({
  isOpen,
  onClose,
  market,
  userAddress,
  username,
  onPlaceBet,
}: PlaceBetModalProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null);
  const [shares, setShares] = useState<number>(1);
  const [isPlacing, setIsPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userShares, setUserShares] = useState<Record<number, string>>({});

  // Load user's current positions
  useEffect(() => {
    if (isOpen && market) {
      const shares = getUserMarketShares(market.onchain.marketId, userAddress);
      setUserShares(shares);
    }
  }, [isOpen, market, userAddress]);

  if (!isOpen || !market) return null;

  const shareSize = market.onchain.shareSizeWei;
  const totalCost = weiToCents(sharesToWei(shares, shareSize));
  const totalCostUSD = (totalCost / 100).toFixed(2);

  const handlePlaceBet = async () => {
    if (selectedOutcome === null) {
      setError("Please select an outcome");
      return;
    }

    if (shares < 1) {
      setError("Please select at least 1 share");
      return;
    }

    setError(null);
    setIsPlacing(true);

    try {
      const weiAmount = sharesToWei(shares, shareSize);
      await onPlaceBet(selectedOutcome, weiAmount);

      // Reset and close on success
      setSelectedOutcome(null);
      setShares(1);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to place bet. Please try again.");
    } finally {
      setIsPlacing(false);
    }
  };

  const handleOutcomeSelect = (index: number) => {
    setSelectedOutcome(index);
    setError(null);
  };

  const incrementShares = () => {
    setShares(prev => prev + 1);
  };

  const decrementShares = () => {
    if (shares > 1) {
      setShares(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end z-50 animate-in fade-in duration-300">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between rounded-t-3xl backdrop-blur-sm bg-white/95">
          <h2 className="text-lg font-bold text-gray-900">Place a Bet</h2>
          <button
            onClick={onClose}
            disabled={isPlacing}
            className="p-1.5 hover:bg-gray-100 active:scale-95 rounded-full transition-all disabled:opacity-50"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-4 space-y-4 pb-20">
          {/* Question Display */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-900 mb-1">Question</p>
            <p className="text-sm font-medium text-blue-950">{market.static.question}</p>
          </div>

          {/* Current Position */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-700 mb-2">Your Current Position</p>
            <div className="space-y-1">
              {market.static.outcomes.map((outcome, index) => {
                const shares = userShares[index] ? BigInt(userShares[index]) / BigInt(market.onchain.shareSizeWei) : 0n;
                return (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">{outcome}</span>
                    <span className={`text-xs font-medium ${shares > 0n ? 'text-blue-600 font-bold' : 'text-gray-900'}`}>
                      {shares.toString()} share{shares !== 1n ? 's' : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Outcomes Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Select Outcome *
            </label>
            <div className="space-y-2">
              {market.static.outcomes.map((outcome, index) => (
                <button
                  key={index}
                  onClick={() => handleOutcomeSelect(index)}
                  disabled={isPlacing}
                  className={`w-full p-3 text-left rounded-lg border-2 transition-all flex items-center justify-between group ${
                    selectedOutcome === index
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50"
                  } ${isPlacing ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{outcome}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedOutcome === index
                      ? "border-blue-600 bg-blue-600"
                      : "border-gray-300 bg-white group-hover:border-blue-400"
                  }`}>
                    {selectedOutcome === index && (
                      <div className="w-2.5 h-2.5 rounded-full bg-white" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Share Counter */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Number of Shares *
            </label>
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-2">
              <button
                onClick={decrementShares}
                disabled={shares <= 1 || isPlacing}
                className="p-2 hover:bg-gray-200 active:scale-95 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Minus className="h-4 w-4 text-gray-600" />
              </button>
              <input
                type="number"
                value={shares}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  if (val >= 1) setShares(val);
                }}
                min="1"
                className="flex-1 text-center bg-white border border-gray-200 rounded px-2 py-1 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isPlacing}
              />
              <button
                onClick={incrementShares}
                disabled={isPlacing}
                className="p-2 hover:bg-gray-200 active:scale-95 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4 text-gray-600" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {shares} share{shares > 1 ? 's' : ''} × {(weiToCents(shareSize) / 100).toFixed(2)} USD/share
            </p>
          </div>

          {/* Cost Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">Total Cost</span>
              <span className="text-lg font-bold text-blue-600">${totalCostUSD}</span>
            </div>
            <p className="text-xs text-gray-600">
              ≈ {(parseFloat(sharesToWei(shares, shareSize)) / parseFloat(ETH_TO_WEI)).toFixed(6)} ETH
            </p>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              1 ETH = ${ETH_PRICE_USD.toLocaleString()} USD
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* Place Bet Button */}
          <div className="pt-2">
            <button
              onClick={handlePlaceBet}
              disabled={isPlacing || selectedOutcome === null}
              className="w-full bg-blue-600 text-white font-medium py-3 text-sm rounded-lg hover:bg-blue-700 active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              {isPlacing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Placing Bet...
                </>
              ) : (
                "Place Bet"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Placing Overlay */}
      {isPlacing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60] animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl px-6 py-8 flex flex-col items-center gap-3 shadow-2xl animate-in scale-95 fade-in zoom-in duration-300">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm font-medium text-gray-900">Placing bet...</p>
          </div>
        </div>
      )}
    </div>
  );
}

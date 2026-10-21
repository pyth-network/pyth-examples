"use client";

import { useState, useRef, useEffect } from "react";
import { X, Plus, Trash2, Search, Zap } from "lucide-react";

enum DegenMode {
  STANDARD = 0,
  RANDOM_RANGE = 1,
  CASCADING_ODDS = 2,
  VOLATILITY_BOOST = 3,
}

const DEGEN_MODE_LABELS = {
  [DegenMode.STANDARD]: "Standard Betting",
  [DegenMode.RANDOM_RANGE]: "🎲 RNG Above/Below",
  [DegenMode.CASCADING_ODDS]: "🌊 Cascading Odds",
  [DegenMode.VOLATILITY_BOOST]: "⚡ Volatility Surge",
};

const DEGEN_MODE_DESCRIPTIONS = {
  [DegenMode.STANDARD]: "Traditional binary outcome betting",
  [DegenMode.RANDOM_RANGE]: "Outcomes determined by Pyth Entropy RNG threshold",
  [DegenMode.CASCADING_ODDS]: "Multi-tier RNG with entropy-cascading logic",
  [DegenMode.VOLATILITY_BOOST]: "4-tier RNG with time-decay volatility multiplier",
};

interface Outcome {
  id: string;
  text: string;
}

interface TargetUser {
  username: string;
  wallet: string;
  pfp?: string;
}

interface BetFormData {
  question: string;
  description: string;
  outcomes: Outcome[];
  deadline: string;
  shareSize: string; // in Wei
  targets: TargetUser[];
  degenMode?: DegenMode;
  rngThreshold?: number; // 0-10000 for 0-100.00
}

interface BetModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupMembers: TargetUser[];
  onCreateBet: (data: BetFormData) => Promise<void>;
}

// Exchange rate: 1 ETH = $2877 USD = 287,700 cents
const ETH_PRICE_USD = 2877;
const ETH_TO_WEI = "1000000000000000000"; // 1e18

// Convert cents to Wei
const centsToWei = (cents: number): string => {
  if (cents <= 0) return "0";
  const eth = cents / (ETH_PRICE_USD * 100);
  const weiAmount = eth * parseFloat(ETH_TO_WEI);
  return Math.floor(weiAmount).toString();
};

// Convert Wei to cents
const weiToCents = (wei: string): number => {
  if (!wei || wei === "0") return 0;
  const eth = parseFloat(wei) / parseFloat(ETH_TO_WEI);
  const cents = eth * (ETH_PRICE_USD * 100);
  return Math.round(cents * 100) / 100; // Round to 2 decimals
};

// Convert USD dollars to cents
const dollarsToCents = (dollars: number): number => {
  return dollars * 100;
};

// Convert cents to USD dollars
const centsToDollars = (cents: number): number => {
  return cents / 100;
};

export default function BetModal({
  isOpen,
  onClose,
  groupMembers,
  onCreateBet,
}: BetModalProps) {
  const [formData, setFormData] = useState<BetFormData>({
    question: "",
    description: "",
    outcomes: [{ id: "1", text: "" }, { id: "2", text: "" }],
    deadline: "",
    shareSize: centsToWei(100), // Default 1 USD = 100 cents
    targets: [],
    degenMode: DegenMode.STANDARD,
    rngThreshold: 5000, // Default 50.00
  });

  const [currency, setCurrency] = useState<"usd" | "cents">("usd");
  const [displayValue, setDisplayValue] = useState("1");

  const [isCreating, setIsCreating] = useState(false);
  const [showTargetSearch, setShowTargetSearch] = useState(false);
  const [targetSearchInput, setTargetSearchInput] = useState("");
  const [filteredMembers, setFilteredMembers] = useState<TargetUser[]>([]);
  const targetSearchRef = useRef<HTMLDivElement>(null);
  const [selectedDegenMode, setSelectedDegenMode] = useState<DegenMode>(DegenMode.STANDARD);
  const [rngThresholdDisplay, setRngThresholdDisplay] = useState("50.00");

  // Filter members based on search input
  useEffect(() => {
    if (!targetSearchInput.trim()) {
      setFilteredMembers(
        groupMembers.filter(
          (member) =>
            !formData.targets.some((t) => t.wallet === member.wallet)
        )
      );
      return;
    }

    const searchLower = targetSearchInput.toLowerCase();
    const filtered = groupMembers.filter(
      (member) =>
        !formData.targets.some((t) => t.wallet === member.wallet) &&
        (member.username.toLowerCase().includes(searchLower) ||
          member.wallet.toLowerCase().includes(searchLower))
    );
    setFilteredMembers(filtered);
  }, [targetSearchInput, groupMembers, formData.targets]);

  // Close target search on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        targetSearchRef.current &&
        !targetSearchRef.current.contains(event.target as Node)
      ) {
        setShowTargetSearch(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const addOutcome = () => {
    const newId = Math.max(
      ...formData.outcomes.map((o) => parseInt(o.id)),
      0
    ).toString();
    setFormData((prev) => ({
      ...prev,
      outcomes: [...prev.outcomes, { id: (parseInt(newId) + 1).toString(), text: "" }],
    }));
  };

  const removeOutcome = (id: string) => {
    if (formData.outcomes.length > 2) {
      setFormData((prev) => ({
        ...prev,
        outcomes: prev.outcomes.filter((o) => o.id !== id),
      }));
    }
  };

  const updateOutcome = (id: string, text: string) => {
    setFormData((prev) => ({
      ...prev,
      outcomes: prev.outcomes.map((o) => (o.id === id ? { ...o, text } : o)),
    }));
  };

  const addTarget = (member: TargetUser) => {
    setFormData((prev) => ({
      ...prev,
      targets: [...prev.targets, member],
    }));
    setTargetSearchInput("");
    setShowTargetSearch(false);
  };

  const removeTarget = (wallet: string) => {
    setFormData((prev) => ({
      ...prev,
      targets: prev.targets.filter((t) => t.wallet !== wallet),
    }));
  };

  const handleCreateBet = async () => {
    // Validation
    if (!formData.question.trim()) {
      alert("Please enter a question");
      return;
    }

    if (formData.outcomes.some((o) => !o.text.trim())) {
      alert("All outcomes must have text");
      return;
    }

    if (formData.outcomes.length < 2) {
      alert("At least 2 outcomes are required");
      return;
    }

    if (!formData.deadline) {
      alert("Please select a deadline");
      return;
    }


    setIsCreating(true);
    try {
      await onCreateBet(formData);
      // Reset form and close
      setFormData({
        question: "",
        description: "",
        outcomes: [{ id: "1", text: "" }, { id: "2", text: "" }],
        deadline: "",
        shareSize: centsToWei(100),
        targets: [],
      });
      setCurrency("usd");
      setDisplayValue("1");
      onClose();
    } catch (error) {
      console.error("Error creating bet:", error);
      alert("Failed to create bet. Please try again.");
      setIsCreating(false);
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
          <h2 className="text-lg font-bold text-gray-900">Create a Bet</h2>
          <button
            onClick={onClose}
            disabled={isCreating}
            className="p-1.5 hover:bg-gray-100 active:scale-95 rounded-full transition-all disabled:opacity-50"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Form Content */}
        <div className="px-4 py-4 space-y-4 pb-20">
          {/* Question */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              The Question / Bet *
            </label>
            <input
              type="text"
              value={formData.question}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, question: e.target.value }))
              }
              placeholder="e.g., Will Nevan get a girlfriend by Dec 31st?"
              className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all"
              disabled={isCreating}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Description & Rules
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Provide details about the bet, any special rules, or conditions..."
              rows={3}
              className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all resize-none"
              disabled={isCreating}
            />
          </div>

          {/* Degen Mode Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Betting Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(DEGEN_MODE_LABELS).map(([modeId, label]) => {
                const mode = parseInt(modeId) as DegenMode;
                return (
                  <button
                    key={mode}
                    onClick={() => {
                      setSelectedDegenMode(mode);
                      setFormData((prev) => ({ ...prev, degenMode: mode }));
                    }}
                    className={`p-3 rounded-lg text-xs font-medium text-left transition-all ${
                      selectedDegenMode === mode
                        ? "bg-amber-100 border-2 border-amber-500 text-amber-900"
                        : "bg-gray-100 border-2 border-transparent text-gray-700 hover:bg-gray-200"
                    }`}
                    disabled={isCreating}
                  >
                    <div className="font-semibold">{label}</div>
                    <div className="text-xs opacity-75 mt-0.5">{DEGEN_MODE_DESCRIPTIONS[mode as DegenMode]}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RNG Threshold (only show for degen modes) */}
          {selectedDegenMode !== DegenMode.STANDARD && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                RNG Threshold (0.00 - 100.00)
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.01"
                  value={rngThresholdDisplay}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setRngThresholdDisplay(val.toFixed(2));
                    setFormData((prev) => ({
                      ...prev,
                      rngThreshold: Math.floor(val * 100), // Convert to 0-10000 scale
                    }));
                  }}
                  className="flex-1 h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer"
                  disabled={isCreating}
                />
                <span className="text-sm font-mono font-semibold text-amber-700 min-w-[60px] text-right">
                  {rngThresholdDisplay}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Bets on "Below": 0.00 - {rngThresholdDisplay} | "Above": {rngThresholdDisplay} - 100.00
              </p>
            </div>
          )}

          {/* Outcomes */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Possible Outcomes {selectedDegenMode === DegenMode.STANDARD ? "*" : "(Auto for Degen)"}
            </label>
            <div className="space-y-2">
              {formData.outcomes.map((outcome) => (
                <div key={outcome.id} className="flex gap-2">
                  <input
                    type="text"
                    value={outcome.text}
                    onChange={(e) => updateOutcome(outcome.id, e.target.value)}
                    placeholder={`Outcome ${formData.outcomes.indexOf(outcome) + 1}`}
                    className="flex-1 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all"
                    disabled={isCreating}
                  />
                  {formData.outcomes.length > 2 && (
                    <button
                      onClick={() => removeOutcome(outcome.id)}
                      disabled={isCreating}
                      className="p-2 hover:bg-red-50 active:scale-95 rounded-lg transition-all disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addOutcome}
                disabled={isCreating}
                className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 active:scale-95 rounded-lg transition-all disabled:opacity-50 font-medium"
              >
                <Plus className="h-4 w-4" />
                Add Outcome
              </button>
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Deadline *
            </label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, deadline: e.target.value }))
              }
              min={new Date().toISOString().split("T")[0]}
              className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all"
              disabled={isCreating}
            />
            <p className="text-xs text-gray-500 mt-1">
              Markets unresolved at this time will return the pool to players
            </p>
          </div>

          {/* Share Size */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Share Size *
            </label>

            {/* Currency Toggle */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => {
                  setCurrency("usd");
                  const cents = weiToCents(formData.shareSize);
                  const dollars = centsToDollars(cents);
                  setDisplayValue(dollars.toString());
                }}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  currency === "usd"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                disabled={isCreating}
              >
                USD ($)
              </button>
              <button
                onClick={() => {
                  setCurrency("cents");
                  const cents = weiToCents(formData.shareSize);
                  setDisplayValue(cents.toString());
                }}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  currency === "cents"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                disabled={isCreating}
              >
                Cents (¢)
              </button>
            </div>

            {/* Input Field */}
            <div className="relative">
              <span className={`absolute left-3 top-2.5 text-sm font-medium pointer-events-none ${
                currency === "usd" ? "text-gray-600" : "text-gray-500"
              }`}>
                {currency === "usd" ? "$" : "¢"}
              </span>
              <input
                type="number"
                value={displayValue}
                onChange={(e) => {
                  const val = e.target.value;
                  setDisplayValue(val);

                  if (!val || parseFloat(val) <= 0) {
                    setFormData((prev) => ({
                      ...prev,
                      shareSize: "0",
                    }));
                    return;
                  }

                  const numVal = parseFloat(val);
                  let cents;

                  if (currency === "usd") {
                    cents = dollarsToCents(numVal);
                  } else {
                    cents = numVal;
                  }

                  const wei = centsToWei(cents);
                  setFormData((prev) => ({
                    ...prev,
                    shareSize: wei,
                  }));
                }}
                placeholder="0"
                step="0.01"
                min="0"
                className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all"
                disabled={isCreating}
              />
            </div>

            {/* Exchange Info */}
            <p className="text-xs text-gray-500 mt-2">
              1 ETH ≈ ${ETH_PRICE_USD.toLocaleString()} USD
            </p>
            <p className="text-xs text-gray-400 mt-1">
              ≈ {(parseFloat(formData.shareSize) / parseFloat(ETH_TO_WEI)).toFixed(6)} ETH
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Prize pool is split evenly among all players
            </p>
          </div>

          {/* Targets */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Target Players (Optional)
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Targeted players cannot see or vote on bets that involve them
            </p>
            {/* Selected Targets */}
            {formData.targets.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {formData.targets.map((target) => (
                  <div
                    key={target.wallet}
                    className="bg-blue-50 border border-blue-200 rounded-full px-3 py-1 flex items-center gap-2 group"
                  >
                    {target.pfp && (
                      <img
                        src={target.pfp}
                        alt={target.username}
                        className="w-5 h-5 rounded-full"
                      />
                    )}
                    <span className="text-xs font-medium text-blue-900">
                      {target.username}
                    </span>
                    <button
                      onClick={() => removeTarget(target.wallet)}
                      disabled={isCreating}
                      className="ml-1 text-blue-600 hover:text-blue-700 disabled:opacity-50"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search Input */}
            <div className="relative" ref={targetSearchRef}>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={targetSearchInput}
                  onChange={(e) => setTargetSearchInput(e.target.value)}
                  onFocus={() => setShowTargetSearch(true)}
                  placeholder="Search group members..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all"
                  disabled={isCreating}
                />
              </div>

              {/* Dropdown */}
              {showTargetSearch && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {filteredMembers.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-gray-500 text-center">
                      {groupMembers.length === formData.targets.length
                        ? "All members selected"
                        : "No matches found"}
                    </div>
                  ) : (
                    filteredMembers.map((member) => (
                      <button
                        key={member.wallet}
                        onClick={() => addTarget(member)}
                        disabled={isCreating}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 active:bg-gray-100 transition-all flex items-center gap-2 disabled:opacity-50 border-b border-gray-100 last:border-b-0"
                      >
                        {member.pfp && (
                          <img
                            src={member.pfp}
                            alt={member.username}
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {member.username}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {member.wallet}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Create Button */}
          <div className="pt-2">
            <button
              onClick={handleCreateBet}
              disabled={isCreating}
              className="w-full bg-blue-600 text-white font-medium py-3 text-sm rounded-lg hover:bg-blue-700 active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Market...
                </>
              ) : (
                "Create Bet"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Creating Overlay - only show during creation */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60] animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl px-6 py-8 flex flex-col items-center gap-3 shadow-2xl animate-in scale-95 fade-in zoom-in duration-300">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm font-medium text-gray-900">Creating market...</p>
          </div>
        </div>
      )}
    </div>
  );
}

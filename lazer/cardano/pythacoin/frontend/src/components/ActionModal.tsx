import { useState } from "react";

interface Props {
  title: string;
  description: string;
  amountLabel?: string;
  confirmLabel: string;
  confirmColor: "red" | "purple" | "green";
  loading: boolean;
  error: string | null;
  onConfirm: (amount?: number) => void;
  onCancel: () => void;
}

export function ActionModal({
  title,
  description,
  amountLabel,
  confirmLabel,
  confirmColor,
  loading,
  error,
  onConfirm,
  onCancel,
}: Props) {
  const [amount, setAmount] = useState("");

  const colorClasses = {
    red: "bg-red-600 hover:bg-red-500",
    purple: "bg-pyth-purple hover:opacity-90",
    green: "bg-green-600 hover:bg-green-500",
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-pyth-card border border-pyth-border rounded-xl p-6 w-full max-w-sm mx-4">
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-sm text-gray-400 mb-4">{description}</p>
        {amountLabel && (
          <div className="mb-4">
            <label className="text-sm text-gray-400 block mb-1">
              {amountLabel}
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-pyth-dark border border-pyth-border rounded px-3 py-2 text-sm"
              autoFocus
              required
            />
          </div>
        )}
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 bg-gray-700 py-2 rounded text-sm hover:bg-gray-600 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onConfirm(amountLabel ? parseFloat(amount) : undefined)
            }
            disabled={loading || (!!amountLabel && !amount)}
            className={`flex-1 py-2 rounded text-sm font-semibold transition disabled:opacity-50 ${colorClasses[confirmColor]}`}
          >
            {loading ? "Building tx..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

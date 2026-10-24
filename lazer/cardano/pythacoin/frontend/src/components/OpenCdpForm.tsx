import { useState } from "react";
import { api } from "../api/client";
import { LtvBadge } from "./LtvBadge";

interface Props {
  address: string;
  adaUsd: number | null;
  balanceLovelace: number | null;
  onSuccess: () => void;
  signAndSubmit: (txHex: string) => Promise<string>;
}

export function OpenCdpForm({ address, adaUsd, balanceLovelace, onSuccess, signAndSubmit }: Props) {
  const [collateral, setCollateral] = useState("");
  const [borrow, setBorrow] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const borrowNum = parseFloat(borrow) || 0;
  const collateralNum = parseFloat(collateral) || 0;
  const collateralUsd = adaUsd && adaUsd > 0 ? collateralNum * adaUsd : 0;
  const ltv = collateralUsd > 0 ? (borrowNum / collateralUsd) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const req = {
        collateralAda: parseFloat(collateral),
        borrowPusd: parseFloat(borrow),
        ownerAddress: address,
      };
      console.log("[OpenCDP] Building tx with:", req);
      const resp = await api.openCdp(req);
      console.log("[OpenCDP] Got unsigned tx, CBOR length:", resp.txCborHex.length);
      console.log("[OpenCDP] Requesting wallet signature...");
      const txHash = await signAndSubmit(resp.txCborHex);
      console.log("[OpenCDP] Submitted! txHash:", txHash);
      setCollateral("");
      setBorrow("");
      onSuccess();
    } catch (err) {
      console.error("[OpenCDP] Error:", err);
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">Open CDP</h2>
        {(borrowNum > 0 || collateralNum > 0) && <LtvBadge ltv={ltv} />}
      </div>

      {/* Borrow amount card */}
      <div className="bg-pyth-card border border-pyth-border rounded-xl p-5">
        <label className="text-sm text-pyth-purple font-medium block mb-3">
          Borrow Amount
        </label>
        <div className="flex items-end justify-between gap-4">
          <input
            type="number"
            step="0.01"
            value={borrow}
            onChange={(e) => {
              setBorrow(e.target.value);
              const b = parseFloat(e.target.value);
              if (b > 0 && adaUsd && adaUsd > 0) {
                setCollateral((2 * b / adaUsd).toFixed(2));
              }
            }}
            className="bg-transparent text-3xl font-semibold w-full outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="0"
            required
          />
          <span className="text-lg font-semibold shrink-0">PUSD</span>
        </div>
      </div>

      {/* Collateral amount card */}
      <div className="bg-pyth-card border border-pyth-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm text-gray-400 font-medium">
            Collateral Amount
          </label>
          {balanceLovelace != null && (
            <span className="text-sm text-gray-500">
              {(balanceLovelace / 1_000_000).toFixed(2)} ADA available
            </span>
          )}
        </div>
        <div className="flex items-end justify-between gap-4">
          <input
            type="number"
            step="0.01"
            value={collateral}
            onChange={(e) => setCollateral(e.target.value)}
            className="bg-transparent text-3xl font-semibold w-full outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="0"
            required
          />
          <span className="text-lg font-semibold shrink-0">ADA</span>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-pyth-purple py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
      >
        {loading ? "Building tx..." : "Open CDP"}
      </button>
    </form>
  );
}

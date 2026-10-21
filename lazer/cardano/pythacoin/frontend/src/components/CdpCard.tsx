import type { CdpInfo } from "../api/types";
import { LtvBadge } from "./LtvBadge";

interface Props {
  cdp: CdpInfo;
  adaUsd: number | null;
  isOwner: boolean;
  onBorrow?: () => void;
  onRepay?: () => void;
  onClose?: () => void;
  onLiquidate?: () => void;
}

function lovelaceToAda(l: number): string {
  return (l / 1_000_000).toFixed(2);
}

function pusdToDisplay(p: number): string {
  return (p / 1_000_000).toFixed(2);
}

function hexToUtf8(hex: string): string {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return new TextDecoder().decode(bytes);
}

function computeLtv(cdp: CdpInfo, adaUsd: number | null): number {
  if (!adaUsd || adaUsd <= 0) return 0;
  const debtUsd = cdp.debtPusd / 1_000_000;
  const collateralUsd = (cdp.collateralLovelace / 1_000_000) * adaUsd;
  if (collateralUsd <= 0) return 0;
  return (debtUsd / collateralUsd) * 100;
}

export function CdpCard({
  cdp,
  adaUsd,
  isOwner,
  onBorrow,
  onRepay,
  onClose,
  onLiquidate,
}: Props) {
  const ltv = computeLtv(cdp, adaUsd);
  return (
    <div className="bg-pyth-card border border-pyth-border rounded-xl p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="font-mono text-sm text-gray-400 truncate min-w-0">{hexToUtf8(cdp.nftName)}</span>
        <LtvBadge ltv={ltv} />
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
        <div>
          <div className="text-gray-500">Collateral</div>
          <div className="font-semibold">
            {lovelaceToAda(cdp.collateralLovelace)} ADA
          </div>
        </div>
        <div>
          <div className="text-gray-500">Debt</div>
          <div className="font-semibold">{pusdToDisplay(cdp.debtPusd)} PUSD</div>
        </div>
      </div>
      <div className="flex gap-2">
        {isOwner && (
          <>
            <button
              onClick={onBorrow}
              className="flex-1 bg-pyth-purple/20 border border-pyth-purple text-pyth-purple text-xs py-1.5 rounded hover:bg-pyth-purple/30 transition"
            >
              Borrow
            </button>
            <button
              onClick={onRepay}
              className="flex-1 bg-green-900/30 border border-green-600 text-green-400 text-xs py-1.5 rounded hover:bg-green-900/50 transition"
            >
              Repay
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-red-900/30 border border-red-600 text-red-400 text-xs py-1.5 rounded hover:bg-red-900/50 transition"
            >
              Close
            </button>
          </>
        )}
        {!isOwner && ltv > 90 && (
          <button
            onClick={onLiquidate}
            className="flex-1 bg-red-700 text-white text-xs py-1.5 rounded hover:bg-red-600 transition"
          >
            Liquidate
          </button>
        )}
      </div>
    </div>
  );
}

import type { CdpInfo } from "../api/types";
import { CdpCard } from "./CdpCard";

interface Props {
  cdps: CdpInfo[];
  adaUsd: number | null;
  ownerAddress: string | null;
  onAction?: (cdp: CdpInfo, action: "borrow" | "repay" | "close" | "liquidate") => void;
}

/** Extract payment key hash (28 bytes = 56 hex chars) from CIP-30 hex address. */
function extractPkh(address: string): string {
  // Shelley base address: [1 header byte][28 payment hash][28 stake hash]
  return address.slice(2, 58);
}

export function AllCdpsTable({ cdps, adaUsd, ownerAddress, onAction }: Props) {
  if (cdps.length === 0) {
    return (
      <div className="text-center text-gray-500 py-12">
        No CDPs found. Open the first one!
      </div>
    );
  }

  const myPkh = ownerAddress ? extractPkh(ownerAddress) : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cdps.map((cdp) => (
        <CdpCard
          key={cdp.nftName}
          cdp={cdp}
          adaUsd={adaUsd}
          isOwner={myPkh === cdp.owner}
          onBorrow={() => onAction?.(cdp, "borrow")}
          onRepay={() => onAction?.(cdp, "repay")}
          onClose={() => onAction?.(cdp, "close")}
          onLiquidate={() => onAction?.(cdp, "liquidate")}
        />
      ))}
    </div>
  );
}

import type { Fill, PositionSummary } from "@/types/market"
import { TuiPanel } from "./TuiPanel"
import { FillRow } from "./FillRow"

interface PositionsProps {
  fills: Fill[]
  summary: PositionSummary
}

export function Positions({ fills, summary }: PositionsProps) {
  return (
    <TuiPanel title="MARKET CONTRACT — POSITIONS">
      <div className="mb-1 flex gap-4 border-b border-border pb-1 font-mono text-xs">
        <span>
          <span className="text-green-400">UP</span>
          {": "}
          <span>{summary.upContracts}</span>
          {" @ "}
          <span>{summary.upAvgPrice.toFixed(4)}</span>
        </span>
        <span className="text-muted-foreground">│</span>
        <span>
          <span className="text-red-400">DOWN</span>
          {": "}
          <span>{summary.downContracts}</span>
          {" @ "}
          <span>{summary.downAvgPrice.toFixed(4)}</span>
        </span>
      </div>
      <div className="grid grid-cols-[9ch_4ch_5ch_6ch_8ch] gap-x-2 border-b border-border px-2 py-0.5 font-mono text-xs text-muted-foreground">
        <span>TIME</span>
        <span>SIDE</span>
        <span className="text-right">QTY</span>
        <span>PRICE</span>
        <span>OWNER</span>
      </div>
      <div className="tui-scroll max-h-[160px] overflow-y-auto">
        {fills.map((fill) => (
          <FillRow key={fill.id} fill={fill} />
        ))}
      </div>
    </TuiPanel>
  )
}

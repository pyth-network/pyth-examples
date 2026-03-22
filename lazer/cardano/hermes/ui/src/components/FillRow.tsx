import { memo } from "react"
import type { Fill } from "@/types/market"

interface FillRowProps {
  fill: Fill
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-GB")
}

export const FillRow = memo(function FillRow({ fill }: FillRowProps) {
  const isUp = fill.side === "UP"

  return (
    <div className="grid grid-cols-[9ch_4ch_5ch_6ch_8ch] gap-x-2 px-2 py-0.5 font-mono text-xs">
      <span className="text-muted-foreground">
        {formatTime(fill.timestamp)}
      </span>
      <span className={isUp ? "text-green-400" : "text-red-400"}>
        {fill.side}
      </span>
      <span className="text-right">{fill.quantity}</span>
      <span>{fill.price.toFixed(4)}</span>
      <span className="text-muted-foreground">{fill.ownerAddress}</span>
    </div>
  )
})

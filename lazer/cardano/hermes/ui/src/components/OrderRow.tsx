import { memo } from "react"
import type { Order } from "@/types/market"

interface OrderRowProps {
  order: Order
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-GB")
}

export const OrderRow = memo(function OrderRow({ order }: OrderRowProps) {
  const isBuy = order.action === "BUY"
  const isUp = order.side === "UP"

  return (
    <div
      className={`grid grid-cols-[9ch_4ch_5ch_6ch_5ch_8ch] gap-x-2 px-2 py-0.5 font-mono text-xs ${
        isBuy ? "text-green-400/90" : "text-red-400/90"
      }`}
    >
      <span className="text-muted-foreground">
        {formatTime(order.timestamp)}
      </span>
      <span className={isUp ? "text-green-400" : "text-red-400"}>
        {order.side}
      </span>
      <span>{order.action}</span>
      <span>{order.price.toFixed(4)}</span>
      <span className="text-right">{order.quantity}</span>
      <span className="text-muted-foreground">{order.ownerAddress}</span>
    </div>
  )
})

import type { Order } from "@/types/market"
import { TuiPanel } from "./TuiPanel"
import { OrderRow } from "./OrderRow"

interface OrderBookProps {
  orders: Order[]
  strikePrice: number | undefined
}

export function OrderBook({ orders, strikePrice }: OrderBookProps) {
  return (
    <TuiPanel
      title={`ORDERBOOK CONTRACT — BTC > ${strikePrice !== undefined ? `$${strikePrice.toLocaleString()}` : "—"}`}
    >
      <div className="grid grid-cols-[9ch_4ch_5ch_6ch_5ch_8ch] gap-x-2 border-b border-border px-2 py-0.5 font-mono text-xs text-muted-foreground">
        <span>TIME</span>
        <span>SIDE</span>
        <span>TYPE</span>
        <span>PRICE</span>
        <span className="text-right">QTY</span>
        <span>OWNER</span>
      </div>
      <div className="tui-scroll max-h-[200px] overflow-y-auto">
        {orders.map((order) => (
          <OrderRow key={order.id} order={order} />
        ))}
      </div>
    </TuiPanel>
  )
}

import { Link } from "react-router-dom"
import { useMarketStream } from "@/hooks/useMarketStream"
import { PriceChart } from "./PriceChart"
import { OrderBook } from "./OrderBook"
import { Positions } from "./Positions"
import { TradeForm } from "./TradeForm"

const STATUS_LABEL = {
  connecting: "○ CONNECTING",
  live: "● LIVE",
  disconnected: "○ DISCONNECTED",
} as const

const STATUS_CLASS = {
  connecting: "text-yellow-400",
  live: "text-green-400",
  disconnected: "text-muted-foreground",
} as const

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-GB")
}

function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, "0")
  const s = (secs % 60).toString().padStart(2, "0")
  return `${m}:${s}`
}

function countdownClass(secs: number): string {
  if (secs > 60) return "text-green-400"
  if (secs > 10) return "text-yellow-400"
  return "text-red-400"
}

export function MarketDashboard() {
  const {
    market,
    secondsRemaining,
    priceTicks,
    currentBtcPriceStr,
    orders,
    fills,
    positionSummary,
    rollingAverages,
    status,
    placeOrder,
  } = useMarketStream()

  const strikePrice = market?.strikePrice

  return (
    <div className="min-h-screen bg-background font-mono text-xs text-foreground">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-3 py-1.5">
        <span className="text-sm font-semibold tracking-widest">
          BTC/USD PREDICTION MARKET
        </span>

        <span className="text-muted-foreground">│</span>
        <span className={STATUS_CLASS[status]}>{STATUS_LABEL[status]}</span>

        <span className="ml-auto">
          <Link
            to="/history"
            className="text-muted-foreground hover:text-foreground"
          >
            HISTORY →
          </Link>
        </span>

        {market && (
          <>
            <span className="text-muted-foreground">│</span>
            <span className="text-muted-foreground">
              START{" "}
              <span className="text-foreground">
                {formatTime(market.startTime)}
              </span>
            </span>

            <span className="text-muted-foreground">│</span>
            <span className="text-muted-foreground">
              END{" "}
              <span className="text-foreground">
                {formatTime(market.endTime)}
              </span>
            </span>

            <span className="text-muted-foreground">│</span>
            <span className="text-muted-foreground">
              ENDS IN{" "}
              <span className={countdownClass(secondsRemaining)}>
                {formatCountdown(secondsRemaining)}
              </span>
            </span>
          </>
        )}
      </header>

      <div className="grid grid-cols-3 gap-2 p-2">
        <div className="col-span-2 flex flex-col gap-2">
          <PriceChart
            ticks={priceTicks}
            strikePrice={strikePrice}
            currentPrice={currentBtcPriceStr}
          />
          <OrderBook orders={orders} strikePrice={strikePrice} />
          <Positions fills={fills} summary={positionSummary} />
        </div>
        <div className="col-span-1">
          <TradeForm
            averages={rollingAverages}
            strikePrice={strikePrice}
            onPlaceOrder={placeOrder}
          />
        </div>
      </div>
    </div>
  )
}

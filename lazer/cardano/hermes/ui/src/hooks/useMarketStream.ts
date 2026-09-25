import { useCallback, useEffect, useRef, useState } from "react"
import type {
  ClientMessage,
  Fill,
  Market,
  Order,
  PlaceOrderPayload,
  PositionSummary,
  PriceTick,
  RollingAverages,
  ServerMessage,
} from "@/types/market"

// The WS URL can be overridden via environment variable for production deploys.
// In development the Vite proxy forwards /ws → ws://localhost:8080 (see vite.config.ts).
const WS_URL =
  (import.meta.env.VITE_WS_URL as string | undefined) ??
  "ws://localhost:8080/ws"

const MAX_TICKS = 120
const MAX_ORDERS = 50
const MAX_FILLS = 30

export type ConnectionStatus = "connecting" | "live" | "disconnected"

const DEFAULT_AVG: RollingAverages = {
  upBuyAvg: 0.5,
  upSellAvg: 0.5,
  downBuyAvg: 0.5,
  downSellAvg: 0.5,
}

const DEFAULT_SUMMARY: PositionSummary = {
  upContracts: 0,
  upAvgPrice: 0,
  downContracts: 0,
  downAvgPrice: 0,
}

export interface MarketStreamData {
  market: Market | null
  secondsRemaining: number
  priceTicks: PriceTick[]
  currentBtcPriceStr: string
  orders: Order[]
  fills: Fill[]
  positionSummary: PositionSummary
  rollingAverages: RollingAverages
  status: ConnectionStatus
  placeOrder: (payload: PlaceOrderPayload) => void
}

export function useMarketStream(): MarketStreamData {
  const [market, setMarket] = useState<Market | null>(null)
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const [priceTicks, setPriceTicks] = useState<PriceTick[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [fills, setFills] = useState<Fill[]>([])
  const [positionSummary, setPositionSummary] =
    useState<PositionSummary>(DEFAULT_SUMMARY)
  const [rollingAverages, setRollingAverages] =
    useState<RollingAverages>(DEFAULT_AVG)
  const [status, setStatus] = useState<ConnectionStatus>("connecting")

  const wsRef = useRef<WebSocket | null>(null)

  // ── WebSocket connection ────────────────────────────────────────────────────

  useEffect(() => {
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => setStatus("live")
    ws.onclose = () => setStatus("disconnected")
    ws.onerror = () => setStatus("disconnected")

    ws.onmessage = (event: MessageEvent<string>) => {
      const msg = JSON.parse(event.data) as ServerMessage

      switch (msg.type) {
        case "connected":
          setMarket(msg.data.market)
          break

        case "market_started":
          setMarket(msg.data.market)
          // Reset all market-scoped state for the new market
          setPriceTicks([])
          setOrders([])
          setFills([])
          setPositionSummary(DEFAULT_SUMMARY)
          setRollingAverages(DEFAULT_AVG)
          break

        case "price_tick":
          setPriceTicks((prev) => [...prev.slice(-(MAX_TICKS - 1)), msg.data])
          break

        case "order":
          setOrders((prev) => [msg.data, ...prev].slice(0, MAX_ORDERS))
          break

        case "fill":
          setFills((prev) => [msg.data, ...prev].slice(0, MAX_FILLS))
          break

        case "position_summary":
          setPositionSummary(msg.data)
          break

        case "rolling_averages":
          setRollingAverages(msg.data)
          break
      }
    }

    return () => ws.close()
  }, [])

  // ── Countdown timer ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!market) return
    // Tick immediately, then every second
    setSecondsRemaining(
      Math.max(0, Math.round((market.endTime - Date.now()) / 1000))
    )
    const id = setInterval(() => {
      setSecondsRemaining(
        Math.max(0, Math.round((market.endTime - Date.now()) / 1000))
      )
    }, 1_000)
    return () => clearInterval(id)
  }, [market])

  // ── placeOrder ──────────────────────────────────────────────────────────────

  const placeOrder = useCallback((payload: PlaceOrderPayload) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    const msg: ClientMessage = { type: "place_order", data: payload }
    ws.send(JSON.stringify(msg))
  }, [])

  const currentBtcPriceStr =
    priceTicks.length > 0 ? priceTicks[priceTicks.length - 1].btcPriceStr : ""

  return {
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
  }
}

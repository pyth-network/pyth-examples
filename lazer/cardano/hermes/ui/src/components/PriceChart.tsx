import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { PriceTick } from "@/types/market"
import { TuiPanel } from "./TuiPanel"

interface PriceChartProps {
  ticks: PriceTick[]
  strikePrice: number | undefined
  currentPrice: string
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-GB")
}

function formatUsd(v: number): string {
  return `$${Math.round(v).toLocaleString()}`
}

export function PriceChart({
  ticks,
  strikePrice,
  currentPrice,
}: PriceChartProps) {
  return (
    <TuiPanel title={`BTC/USD  ${currentPrice ? `$${currentPrice}` : "—"}`}>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={ticks}
            margin={{ top: 4, right: 8, bottom: 0, left: 8 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.07)"
              vertical={false}
            />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatTime}
              interval="preserveStartEnd"
              minTickGap={80}
              tick={{ fill: "#6b7280", fontSize: 10, fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatUsd}
              domain={["auto", "auto"]}
              tick={{ fill: "#6b7280", fontSize: 10, fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
              width={76}
            />
            <Tooltip
              contentStyle={{
                fontFamily: "monospace",
                fontSize: 11,
                background: "#111",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 0,
              }}
              labelFormatter={(v) => formatTime(v as number)}
              formatter={(v) => [formatUsd(Number(v)), "BTC/USD"]}
            />
            {strikePrice !== undefined && (
              <ReferenceLine
                y={strikePrice}
                stroke="#4b5563"
                strokeDasharray="4 4"
                label={{
                  value: `STRIKE $${strikePrice.toLocaleString()}`,
                  position: "insideTopRight",
                  fill: "#6b7280",
                  fontSize: 10,
                  fontFamily: "monospace",
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey={(tick: unknown) =>
                parseFloat((tick as PriceTick).btcPriceStr)
              }
              stroke="#facc15"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </TuiPanel>
  )
}

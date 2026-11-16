import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { PriceDataPoint } from "../App";

interface PriceChartProps {
  data: PriceDataPoint[];
  threshold: number;
  isTriggered: boolean;
}

export default function PriceChart({ data, threshold, isTriggered }: PriceChartProps) {
  const chartColor = isTriggered ? "var(--error)" : "var(--primary)";
  const areaColor  = isTriggered ? "var(--error-container)" : "var(--primary-container)";

  return (
    <div className="curator-card" style={{ height: "450px", display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 className="text-editorial" style={{ fontSize: "1.25rem", color: "var(--on-background)" }}>
          ADA Evolution <span className="text-muted" style={{ fontWeight: 400, marginLeft: "0.5rem" }}>— 400ms interval</span>
        </h3>
        <div style={{ display: "flex", gap: "1rem" }}>
          <span style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary)" }}></span>
            Market Price
          </span>
          <span style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--error)" }}></span>
            Target Protection
          </span>
        </div>
      </div>

      <div style={{ flex: 1, width: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.15} />
                <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--surface-container)" />
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--outline)", fontSize: 10, fontFamily: "var(--font-body)" }}
              interval="preserveStartEnd"
              minTickGap={30}
            />
            <YAxis
              domain={["auto", "auto"]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--outline)", fontSize: 10, fontFamily: "var(--font-body)" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--surface-container-lowest)",
                border: "none",
                borderRadius: "12px",
                boxShadow: "0 10px 30px rgba(101, 73, 192, 0.12)",
                fontFamily: "var(--font-body)",
                fontSize: "12px",
              }}
              itemStyle={{ color: "var(--primary)", fontWeight: 700 }}
              labelStyle={{ color: "var(--outline)", marginBottom: "4px" }}
            />
            <ReferenceLine
              y={threshold}
              stroke="var(--error)"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{
                value: "Protection Target",
                position: "right",
                fill: "var(--error)",
                fontSize: 9,
                fontWeight: 700,
                offset: 10,
              }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={chartColor}
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorPrice)"
              animationDuration={300}
              isAnimationActive={false} // Performance optimize for 400ms updates
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

import { useState } from "react"
import { Link } from "react-router-dom"
import type { MarketHistoryEntry } from "@/types/market"
import { TuiPanel } from "@/components/TuiPanel"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

// In development, Vite proxies /api → http://localhost:8080 (see vite.config.ts).
// Override with VITE_API_URL for production.
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ""

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-GB")
}

function formatUsd(v: number): string {
  return `$${Math.round(v).toLocaleString()}`
}

function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) + "…" : id
}

export function HistoryPage() {
  const [address, setAddress] = useState("")
  const [entries, setEntries] = useState<MarketHistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const params = address ? `?address=${encodeURIComponent(address)}` : ""
      const res = await fetch(`${API_BASE}/api/markets/history${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as MarketHistoryEntry[]
      setEntries(data)
      setLoaded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "fetch failed")
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") void load()
  }

  return (
    <div className="min-h-screen bg-background font-mono text-xs text-foreground">
      <header className="flex items-center gap-3 border-b border-border px-3 py-1.5">
        <Link to="/" className="text-muted-foreground hover:text-foreground">
          ← LIVE MARKET
        </Link>
        <span className="text-muted-foreground">│</span>
        <span className="text-sm font-semibold tracking-widest">
          PAST MARKETS
        </span>
      </header>

      <div className="p-2">
        <TuiPanel title="HISTORY">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-muted-foreground">address:</span>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="addr_1 … or leave empty"
              className="h-7 w-64 rounded-none border-border font-mono text-xs"
            />
            <Button
              onClick={() => void load()}
              disabled={loading}
              className="h-7 rounded-none font-mono text-xs"
              variant="outline"
            >
              {loading ? "LOADING…" : "LOAD"}
            </Button>
          </div>

          {error && <div className="mb-2 text-red-400">! {error}</div>}

          {loaded && (
            <>
              {/* Header row */}
              <div className="grid grid-cols-[10ch_9ch_9ch_8ch_8ch_7ch_12ch] gap-x-3 border-b border-border py-0.5 text-muted-foreground">
                <span>MARKET</span>
                <span>START</span>
                <span>END</span>
                <span>STRIKE</span>
                <span>FINAL</span>
                <span>OUTCOME</span>
                <span>YOU</span>
              </div>

              {entries.length === 0 && (
                <div className="py-2 text-muted-foreground">
                  no markets found
                </div>
              )}

              {entries.map((entry) => {
                const pos = entry.userPosition
                const isUp = entry.outcome === "UP"

                return (
                  <div
                    key={entry.marketId}
                    className="grid grid-cols-[10ch_9ch_9ch_8ch_8ch_7ch_12ch] gap-x-3 border-b border-border/40 py-0.5"
                  >
                    <span className="text-muted-foreground">
                      {shortId(entry.marketId)}
                    </span>
                    <span className="text-muted-foreground">
                      {formatTime(entry.startTime)}
                    </span>
                    <span className="text-muted-foreground">
                      {formatTime(entry.endTime)}
                    </span>
                    <span>{formatUsd(entry.strikePrice)}</span>
                    <span>{formatUsd(entry.finalBtcPrice)}</span>
                    <span className={isUp ? "text-green-400" : "text-red-400"}>
                      {entry.outcome} {isUp ? "▲" : "▼"}
                    </span>
                    {pos ? (
                      <span
                        className={
                          pos.result === "WON"
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      >
                        {pos.result} {pos.pnl >= 0 ? "+" : ""}
                        {pos.pnl.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </TuiPanel>
      </div>
    </div>
  )
}

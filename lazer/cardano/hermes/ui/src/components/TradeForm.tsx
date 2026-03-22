import { useEffect, useState } from "react"
import type { PlaceOrderPayload, RollingAverages } from "@/types/market"
import { TuiPanel } from "./TuiPanel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface TradeFormProps {
  averages: RollingAverages
  strikePrice: number | undefined
  onPlaceOrder: (payload: PlaceOrderPayload) => void
}

interface LastAction {
  verb: string
  qty: number
  side: string
  price: string
}

export function TradeForm({
  averages,
  strikePrice,
  onPlaceOrder,
}: TradeFormProps) {
  const [buyQty, setBuyQty] = useState("100")
  const [buyUpPrice, setBuyUpPrice] = useState("")
  const [buyDownPrice, setBuyDownPrice] = useState("")

  const [sellQty, setSellQty] = useState("100")
  const [sellUpPrice, setSellUpPrice] = useState("")
  const [sellDownPrice, setSellDownPrice] = useState("")

  const [lastAction, setLastAction] = useState<LastAction | null>(null)

  // Pre-fill price fields from rolling averages only when the field is empty
  // (i.e., the user hasn't typed a custom value yet)
  useEffect(() => {
    if (!buyUpPrice) setBuyUpPrice(averages.upBuyAvg.toFixed(4))
  }, [averages.upBuyAvg, buyUpPrice])

  useEffect(() => {
    if (!buyDownPrice) setBuyDownPrice(averages.downBuyAvg.toFixed(4))
  }, [averages.downBuyAvg, buyDownPrice])

  useEffect(() => {
    if (!sellUpPrice) setSellUpPrice(averages.upSellAvg.toFixed(4))
  }, [averages.upSellAvg, sellUpPrice])

  useEffect(() => {
    if (!sellDownPrice) setSellDownPrice(averages.downSellAvg.toFixed(4))
  }, [averages.downSellAvg, sellDownPrice])

  function validate(qty: string, price: string): boolean {
    const q = parseInt(qty, 10)
    const p = parseFloat(price)
    return !isNaN(q) && q > 0 && !isNaN(p) && p > 0 && p <= 1
  }

  function handleBuy(side: "UP" | "DOWN") {
    const price = side === "UP" ? buyUpPrice : buyDownPrice
    if (!validate(buyQty, price)) return
    const qty = parseInt(buyQty, 10)
    onPlaceOrder({
      side,
      action: "BUY",
      price: parseFloat(price),
      quantity: qty,
    })
    setLastAction({ verb: "BUY", qty, side, price })
  }

  function handleSell(side: "UP" | "DOWN") {
    const price = side === "UP" ? sellUpPrice : sellDownPrice
    if (!validate(sellQty, price)) return
    const qty = parseInt(sellQty, 10)
    onPlaceOrder({
      side,
      action: "SELL",
      price: parseFloat(price),
      quantity: qty,
    })
    setLastAction({ verb: "SELL", qty, side, price })
  }

  return (
    <TuiPanel
      title={`PLACE BET — BTC > ${strikePrice !== undefined ? `$${strikePrice.toLocaleString()}` : "—"}`}
      className="h-full"
    >
      <Tabs defaultValue="buy" className="font-mono text-xs">
        <TabsList className="mb-3 h-7 w-full rounded-none border border-border bg-transparent p-0">
          <TabsTrigger
            value="buy"
            className="h-full flex-1 rounded-none border-0 font-mono text-xs data-[state=active]:bg-green-400/10 data-[state=active]:text-green-400"
          >
            BUY
          </TabsTrigger>
          <TabsTrigger
            value="sell"
            className="h-full flex-1 rounded-none border-0 font-mono text-xs data-[state=active]:bg-red-400/10 data-[state=active]:text-red-400"
          >
            SELL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="buy" className="mt-0 space-y-3">
          <div className="space-y-1">
            <label className="text-muted-foreground">QTY</label>
            <Input
              value={buyQty}
              onChange={(e) => setBuyQty(e.target.value)}
              className="h-7 rounded-none border-border font-mono text-xs"
            />
          </div>

          <div className="space-y-2">
            <div className="space-y-1">
              <label className="text-muted-foreground">
                UP LIMIT PRICE{" "}
                <span className="text-muted-foreground/60">
                  avg {averages.upBuyAvg.toFixed(4)}
                </span>
              </label>
              <Input
                value={buyUpPrice}
                onChange={(e) => setBuyUpPrice(e.target.value)}
                className="h-7 rounded-none border-border font-mono text-xs"
              />
              <Button
                onClick={() => handleBuy("UP")}
                className="h-7 w-full rounded-none bg-green-400/10 font-mono text-xs text-green-400 hover:bg-green-400/20"
                variant="ghost"
              >
                BUY UP ▲
              </Button>
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground">
                DOWN LIMIT PRICE{" "}
                <span className="text-muted-foreground/60">
                  avg {averages.downBuyAvg.toFixed(4)}
                </span>
              </label>
              <Input
                value={buyDownPrice}
                onChange={(e) => setBuyDownPrice(e.target.value)}
                className="h-7 rounded-none border-border font-mono text-xs"
              />
              <Button
                onClick={() => handleBuy("DOWN")}
                className="h-7 w-full rounded-none bg-red-400/10 font-mono text-xs text-red-400 hover:bg-red-400/20"
                variant="ghost"
              >
                BUY DOWN ▼
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sell" className="mt-0 space-y-3">
          <div className="space-y-1">
            <label className="text-muted-foreground">QTY</label>
            <Input
              value={sellQty}
              onChange={(e) => setSellQty(e.target.value)}
              className="h-7 rounded-none border-border font-mono text-xs"
            />
          </div>

          <div className="space-y-2">
            <div className="space-y-1">
              <label className="text-muted-foreground">
                UP LIMIT PRICE{" "}
                <span className="text-muted-foreground/60">
                  avg {averages.upSellAvg.toFixed(4)}
                </span>
              </label>
              <Input
                value={sellUpPrice}
                onChange={(e) => setSellUpPrice(e.target.value)}
                className="h-7 rounded-none border-border font-mono text-xs"
              />
              <Button
                onClick={() => handleSell("UP")}
                className="h-7 w-full rounded-none bg-green-400/10 font-mono text-xs text-green-400 hover:bg-green-400/20"
                variant="ghost"
              >
                SELL UP ▲
              </Button>
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground">
                DOWN LIMIT PRICE{" "}
                <span className="text-muted-foreground/60">
                  avg {averages.downSellAvg.toFixed(4)}
                </span>
              </label>
              <Input
                value={sellDownPrice}
                onChange={(e) => setSellDownPrice(e.target.value)}
                className="h-7 rounded-none border-border font-mono text-xs"
              />
              <Button
                onClick={() => handleSell("DOWN")}
                className="h-7 w-full rounded-none bg-red-400/10 font-mono text-xs text-red-400 hover:bg-red-400/20"
                variant="ghost"
              >
                SELL DOWN ▼
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {lastAction && (
        <div className="mt-3 border-t border-border pt-2 font-mono text-xs text-muted-foreground">
          {">"}{" "}
          <span
            className={
              lastAction.verb === "BUY" ? "text-green-400" : "text-red-400"
            }
          >
            {lastAction.verb}
          </span>{" "}
          {lastAction.qty}{" "}
          <span
            className={
              lastAction.side === "UP" ? "text-green-400" : "text-red-400"
            }
          >
            {lastAction.side}
          </span>{" "}
          @ {lastAction.price}
        </div>
      )}
    </TuiPanel>
  )
}

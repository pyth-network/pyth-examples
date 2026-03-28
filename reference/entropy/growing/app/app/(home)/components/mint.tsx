"use client"

import { Button } from "@/components/ui/button"
import { useMint } from "../hooks/use-mint"

export const Mint = () => {
  const { mint, isLoading } = useMint()
  return (
    <Button
      className="w-full"
      disabled={isLoading}
      onClick={mint}
    >{`Mint${isLoading ? "ing..." : ""}`}</Button>
  )
}

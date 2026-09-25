"use client"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { useGrow } from "../hooks/use-grow"

export const Grow = () => {
  const {
    tokens,
    setTokenId,
    grow,
    isLoading,
    info,
    tokenId,
    isSuccess,
    growResult,
    reset,
  } = useGrow()

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      {isSuccess && growResult && (
        <>
          <div>{growResult.growResult}</div>
          <Button className="w-full" onClick={reset}>
            Continue
          </Button>
        </>
      )}
      {isSuccess && !growResult && <Loader2 className="animate-spin" />}
      {!isSuccess && !growResult && (
        <>
          <Select onValueChange={setTokenId}>
            <SelectTrigger disabled={isLoading} className="w-full">
              <SelectValue placeholder="Select NFT" />
            </SelectTrigger>
            <SelectContent>
              {tokens.map(({ label, value }, index) => {
                return (
                  <SelectItem key={`${index}_${label}`} value={value}>
                    {label}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          <Button className="w-full" disabled={isLoading} onClick={grow}>
            Grow
          </Button>
          {tokenId !== "" && (
            <div className="text-left">
              <div>Level: {info.level}</div>
              <div>Status: {info.status}</div>
            </div>
          )}
          {tokenId === "" && <div className="h-[40px]"></div>}
        </>
      )}
    </div>
  )
}

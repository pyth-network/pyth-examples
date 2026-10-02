"use client"

import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { Connector } from "wagmi"
interface WalletOptionParams {
  connector: Connector
  onClick: () => void
}

export const WalletOption = ({ connector, onClick }: WalletOptionParams) => {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    ;(async () => {
      const provider = await connector.getProvider()
      setReady(!!provider)
    })()
  }, [connector])

  return (
    <Button disabled={!ready} onClick={onClick}>
      {connector.name}
    </Button>
  )
}

"use client"

import { useConnect } from "wagmi"
import { WalletOption } from "./wallet-option"

// Gets connectors available and defined in wagmi.config.ts currently using multiInjectedProviderDiscovery for discovery.
// Add wallet connect to the config for mobile
export const WalletOptions = () => {
  const { connectors, connect } = useConnect()

  return (
    <div className="flex flex-col gap-5">
      {connectors.map((connector) => (
        <WalletOption
          key={connector.uid}
          connector={connector}
          onClick={() => connect({ connector })}
        />
      ))}
    </div>
  )
}

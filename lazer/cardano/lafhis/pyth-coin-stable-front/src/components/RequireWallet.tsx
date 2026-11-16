import { CardanoWallet, useWallet } from "@meshsdk/react";
import type { ReactNode } from "react";

type RequireWalletProps = {
  children: ReactNode;
  title?: string;
  description?: string;
};

export default function RequireWallet({
  children,
  title = "Connect Wallet",
  description = "You need to connect your wallet to continue.",
}: RequireWalletProps) {
  const { connected } = useWallet();

  if (!connected) {
    return (
      <section className="wallet-gate">
        <h1 className="wallet-gate-title">{title}</h1>
        <p className="wallet-gate-text">{description}</p>
        <div className="wallet-gate-control">
          <CardanoWallet persist />
        </div>
      </section>
    );
  }

  return <>{children}</>;
}

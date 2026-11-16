"use client";
import { Button, ArrowRightIcon } from "./ui/Button";
import { useAccount, useConnect, useChainId, useSwitchChain } from "wagmi";
import { baseSepolia } from "wagmi/chains";

function short(a?: string) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}

export function Hero() {
  const { isConnected, address } = useAccount();
  const { connectors, connectAsync, status: connectStatus } = useConnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  async function onClick() {
    if (!isConnected) {
      const cb = connectors.find((c) => c.id.includes("coinbase"));
      await connectAsync({ connector: cb ?? connectors[0] });
    }
  }

  const wrongChain = isConnected && chainId !== baseSepolia.id;

  return (
    <section id="home" className="sm:py-28 py-16 sm:pl-20 pl-8">
      <div className="mx-auto max-w-[100rem]">
        <div
          className="relative z-10 flex flex-col items-center justify-center text-center gap-6"
          data-animate
        >
          <h2 className="font-bold text-white text-[60px] sm:text-[88px] md:text-[110px] lg:text-[140px] leading-none">
            Entropy Arcade
          </h2>
          <h3 className="font-bold text-white text-[42px] sm:text-[60px] md:text-[78px] lg:text-[96px] leading-none">
            Stake Games
          </h3>
          <p className="max-w-4xl text-secondary-white text-lg sm:text-xl">
            Provably-random arcade modes powered by on-chain entropy (Pyth) for
            fair staking and high replayability.
          </p>

          <div className="mt-2 flex flex-col items-center gap-3">
            <Button
              icon={ArrowRightIcon}
              effect="expandIcon"
              className="px-6 py-3 text-base"
              onClick={onClick}
              disabled={isConnected && !wrongChain}
            >
              {isConnected
                ? wrongChain
                  ? "Connected — wrong network"
                  : "Wallet connected"
                : connectStatus === "connecting"
                  ? "Connecting…"
                  : "Connect wallet and start playing!"}
            </Button>

            {/* Small status line */}
            {isConnected ? (
              <div className="text-white/80 text-sm">
                Connected: <span className="font-mono">{short(address)}</span>{" "}
                {wrongChain ? (
                  <>
                    •{" "}
                    <span className="text-amber-300">
                      switch to Base Sepolia
                    </span>{" "}
                    <button
                      onClick={() => switchChain({ chainId: baseSepolia.id })}
                      className="ml-2 underline"
                    >
                      Switch
                    </button>
                  </>
                ) : (
                  "• Base Sepolia"
                )}
              </div>
            ) : (
              <div className="text-white/60 text-sm">No wallet connected</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

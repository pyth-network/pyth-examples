import Head from "next/head";
import Image from "next/image";
import { useWallet } from "@meshsdk/react";
import PriceTicker from "@/components/PriceTicker";
import DuelPreview from "@/components/DuelPreview";

const steps = [
  {
    title: "1. CONNECT WALLET",
    text: "Your identity is your Cardano wallet (CIP-30). No username or password needed.",
  },
  {
    title: "2. CHALLENGE LINK",
    text: "Choose an asset and stake amount (10, 25, or 50 ADA). Your rival picks a different asset.",
  },
  {
    title: "3. RACE WINDOW: 60s",
    text: "Both players deposit, the duel starts, and the UI shows live ticks.",
  },
  {
    title: "4. ON-CHAIN RESOLVE",
    text: "Highest percentage change wins. The pot settles automatically and verifiably.",
  },
];

export default function Home() {
  useWallet();

  return (
    <>
      <Head>
        <title>CoinStable | Web3 Race Arena</title>
        <meta
          name="description"
          content="Web3 landing for Traders Duel: asset racing on Cardano with Pyth signed prices."
        />
      </Head>

      <main className="landing-root text-slate-100">
        <section className="mx-auto max-w-6xl px-6 pb-10 pt-10 md:pt-12">
          <div className="rounded-3xl border border-violet-500/25 bg-slate-950/75 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.55)] md:p-10">
            <div className="flex items-center justify-between gap-6">
              <div>
                <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/40 bg-violet-500/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.24em] text-violet-300">
                  WEB3 RACE ARENA
                </p>
                <h1 className="max-w-4xl text-3xl leading-tight text-slate-100 md:text-5xl">
                  CoinStable
                  <span className="mt-2 block text-violet-400">Powered by Pyth</span>
                </h1>
              </div>
              <Image
                src="/img/biglogo.png"
                alt="CoinStable"
                width={500}
                height={250}
                className="hidden shrink-0 md:block -mr-16"
              />
            </div>

            <p className="mt-5 max-w-3xl text-sm text-violet-100/80 md:text-base">
              Two players, two assets, one ADA pot, and a time window.
              The winner is determined by percentage change using Pyth signed prices.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-[1.25fr_1fr]">
              <div className="race-track min-w-0 rounded-2xl border border-violet-500/25 bg-slate-900/70 p-4 md:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300">
                    Live Duel Track
                  </p>
                  <div className="pixel-duel">
                    <Image
                      className="duel-img"
                      src="/img/Screenshot_2026-03-22_at_3.21.42_PM-removebg-preview.png"
                      alt="ADA horse"
                      width={44}
                      height={44}
                    />
                    <span className="pixel-vs">VS</span>
                    <Image
                      className="duel-img"
                      src="/img/Screenshot_2026-03-22_at_3.21.30_PM-removebg-preview.png"
                      alt="Pyth horse"
                      width={44}
                      height={44}
                    />
                  </div>
                </div>

                <div className="track-lane mb-3">
                  <span className="lane-tag">Player A</span>
                  <span className="lane-asset">ADA/USD</span>
                  <span className="runner">
                    <Image
                      className="lane-horse"
                      src="/img/Screenshot_2026-03-22_at_3.21.42_PM-removebg-preview.png"
                      alt="ADA horse"
                      width={52}
                      height={52}
                    />
                  </span>
                </div>

                <div className="track-lane">
                  <span className="lane-tag">Player B</span>
                  <span className="lane-asset">BTC/USD</span>
                  <span className="runner delayed">
                    <Image
                      className="lane-horse"
                      src="/img/Screenshot_2026-03-22_at_3.21.30_PM-removebg-preview.png"
                      alt="Pyth horse"
                      width={52}
                      height={52}
                    />
                  </span>
                </div>

                <p className="mt-4 text-xs text-violet-100/70">
                  The winner is determined by <strong>% change</strong>.
                </p>
              </div>

              <div className="race-track flex min-w-0 flex-col rounded-2xl border border-violet-500/25 bg-slate-900/70 p-4 md:p-6">
                <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-violet-300">
                  How It Works
                </p>
                <DuelPreview />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pt-6 pb-2">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-violet-400">
                Powered by Pyth Network
              </p>
              <h2 className="mt-1 text-base text-slate-100 md:text-lg">
                Live Market Feeds
              </h2>
              <p className="mt-1 text-[11px] text-violet-100/55">
                Real-time crypto prices sourced directly from Pyth oracle — the same feeds used to settle every duel on-chain.
              </p>
            </div>
          </div>
          <PriceTicker />
        </section>

        <section className="mx-auto max-w-6xl px-6 py-8">
          <h2 className="mb-5 text-xl text-slate-100 md:text-2xl">GAME FLOW</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {steps.map((step) => (
              <article
                key={step.title}
                className="rounded-2xl border border-violet-500/20 bg-slate-900/60 p-5"
              >
                <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-violet-300">
                  {step.title}
                </h3>
                <p className="mt-3 text-xs text-violet-100/75">{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-14 pt-8">
          <div className="rounded-3xl border border-violet-500/25 bg-gradient-to-r from-violet-950/40 via-slate-950/90 to-cyan-950/30 p-6 md:p-8">
            <h2 className="text-xl text-slate-100 md:text-2xl">VERIFIABLE BY DESIGN</h2>
            <p className="mt-3 max-w-3xl text-xs text-violet-100/80 md:text-sm">
              We use Pyth to settle wagers with signed and verifiable prices.
              That makes duel outcomes reliable and transparent on Cardano.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}

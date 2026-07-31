"use client";

import { motion, useReducedMotion } from "framer-motion";
import { FadeUp } from "./animations";

const chains = [
  {
    name: "Cardano",
    src: "/chain-cardano.png",
    sizeClass: "h-12 md:h-14",
    width: 200,
    height: 56,
  },
  {
    name: "Solana",
    src: "/chain-solana.png",
    sizeClass: "h-12 md:h-14",
    width: 200,
    height: 56,
  },
  {
    name: "Ethereum",
    src: "/chain-ethereum.svg",
    sizeClass: "h-[5.625rem] md:h-[6.5rem]",
    width: 220,
    height: 72,
  },
];

// Duplicate for infinite scroll illusion
const marqueeChains = [...chains, ...chains, ...chains, ...chains];

export function MultichainSection() {
  const prefersReducedMotion = useReducedMotion();
  const displayedChains = prefersReducedMotion ? chains : marqueeChains;

  return (
    <section id="multichain" className="relative py-32 bg-[#070612] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <FadeUp>
          <div className="text-center mb-20">
            <p className="text-[#7c6ff7] text-sm font-mono font-medium tracking-widest uppercase mb-4">
              Multichain Native
            </p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium text-white leading-tight">
              One policy engine.
              <br />
              <span className="text-white/40">Every chain.</span>
            </h2>
          </div>
        </FadeUp>
      </div>

      {/* Logo Carousel */}
      <div className="relative">
        <div
          className="absolute left-0 top-0 bottom-0 w-40 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to right, #070612, transparent)" }}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-40 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to left, #070612, transparent)" }}
        />

        <motion.div
          className="flex items-center gap-28 py-8"
          animate={prefersReducedMotion ? undefined : { x: ["0%", "-50%"] }}
          transition={
            prefersReducedMotion
              ? undefined
              : {
                  x: {
                    repeat: Infinity,
                    repeatType: "loop",
                    duration: 35,
                    ease: "linear",
                  },
                }
          }
          style={{ width: "fit-content" }}
        >
          {displayedChains.map((chain, i) => (
            <div
              key={`${chain.name}-${i}`}
              className="flex-shrink-0 flex items-center justify-center h-20 px-6 opacity-40 hover:opacity-80 transition-opacity duration-300"
            >
              <img
                src={chain.src}
                alt={chain.name}
                width={chain.width}
                height={chain.height}
                className={`${chain.sizeClass} max-w-[260px] object-contain brightness-0 invert`}
                loading="lazy"
                decoding="async"
              />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

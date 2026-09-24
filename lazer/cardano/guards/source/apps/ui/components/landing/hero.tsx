"use client";

import { Sparkles, ArrowRight } from "lucide-react";
import { BlurIn, SplitText } from "./animations";
import { VideoBackground } from "./video-background";

export function Hero() {
  return (
    <section className="relative h-screen w-full overflow-hidden bg-[#070612]">
      {/* Video */}
      <VideoBackground />

      {/* Bottom gradient fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40 z-10"
        style={{
          background: "linear-gradient(to top, #070612, transparent)",
        }}
      />

      {/* Content */}
      <div className="relative z-20 h-full flex items-center">
        <div className="max-w-7xl mx-auto w-full px-6 lg:px-12">
          <div className="flex flex-col gap-12 max-w-2xl">
            {/* Badge + Heading + Subtitle */}
            <div className="flex flex-col gap-6">
              {/* Badge */}
              <BlurIn delay={0} duration={0.6}>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 backdrop-blur-sm px-4 py-2 w-fit">
                  <Sparkles className="w-3 h-3 text-white/80" />
                  <span className="text-sm font-medium text-white/80">
                    For DAO and protocol treasuries
                  </span>
                </div>
              </BlurIn>

              {/* Heading */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium leading-tight lg:leading-[1.2] text-white">
                <SplitText
                  text="Protect Your Treasury"
                  wordDelay={0.08}
                  duration={0.6}
                />
                <br />
                <SplitText
                  text="with Oracle-Driven"
                  wordDelay={0.08}
                  duration={0.6}
                />
                <br />
                <span className="inline-block">
                  <SplitText
                    text="Risk"
                    wordDelay={0.08}
                    duration={0.6}
                  />
                </span>{" "}
                <span className="font-serif italic text-[#7c6ff7]">
                  <SplitText
                    text="Intelligence."
                    wordDelay={0.08}
                    duration={0.6}
                  />
                </span>
              </h1>

              {/* Subtitle */}
              <BlurIn delay={0.4} duration={0.6}>
                <p className="text-white/80 text-lg font-normal leading-relaxed max-w-xl">
                  Guards automates treasury protection with Pyth-driven policy checks
                  and pre-approved execution bounds before a protected fiat or stable
                  floor is breached.
                </p>
              </BlurIn>
            </div>

            {/* CTA Buttons */}
            <BlurIn delay={0.6} duration={0.6}>
              <div className="flex items-center gap-4 flex-wrap">
                <a
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-full bg-white text-[#070612] px-5 py-3 text-sm font-semibold hover:bg-white/90 transition-all cursor-pointer"
                >
                  Open Demo
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </BlurIn>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";
import { Button, ArrowRightIcon } from "./ui/Button";

export function GoLive() {
  return (
    <section id="golive" className="relative px-8 sm:px-20 py-20" data-animate>
      <div className="mx-auto max-w-7xl lg:max-w-8xl border border-white/10 rounded-3xl p-10 sm:p-14 bg-white/5 flex flex-col sm:flex-row items-center justify-between gap-8">
        <div>
          <h3 className="font-bold text-3xl sm:text-4xl">Go Live</h3>
          <p className="text-secondary-white max-w-2xl mt-3">
            Spin up a hosted game room with configurable RTP, fees, and limits.
            (Details coming soon.)
          </p>
        </div>
        <Button icon={ArrowRightIcon} effect="expandIcon">
          Connect to Go Live
        </Button>
      </div>
    </section>
  );
}

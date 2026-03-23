export function Footer() {
  return (
    <footer className="bg-[#070612] border-t border-white/5 py-10">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <img
                src="/guards-logo.png"
                alt="Guards"
                width={144}
                height={32}
                decoding="async"
                className="h-8 w-auto"
              />
            </div>
            <p className="text-sm text-white/40 leading-relaxed max-w-md">
              Oracle-aware treasury control plane for policy-driven, bounded execution.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/45">
            <a href="#how-it-works" className="hover:text-white transition-colors">
              How it works
            </a>
            <a href="#multichain" className="hover:text-white transition-colors">
              Multichain
            </a>
            <a href="/dashboard" className="hover:text-white transition-colors">
              Demo dashboard
            </a>
          </div>
        </div>

        <div className="mt-8 pt-5 border-t border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-white/25">
          <span>Powered by Pyth price feeds. Cardano-first submission with multichain policy design.</span>
          <span className="font-mono">guards.one</span>
        </div>
      </div>
    </footer>
  );
}

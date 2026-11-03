"use client";
import { useEffect, useState } from "react";

export function Footer() {
  const [year, setYear] = useState<string>("");
  useEffect(() => {
    setYear(String(new Date().getFullYear()));
  }, []);
  return (
    <footer id="profile" className="relative px-8 sm:px-20 py-12" data-animate>
      <div className="relative mx-auto max-w-7xl lg:max-w-8xl flex flex-col gap-10">
        <div className="flex flex-col">
          <div className="mb-6 h-[2px] bg-white/10" />
          <div className="flex items-center justify-between flex-wrap gap-5">
            <h4 className="font-extrabold text-[24px]">ENTROPY ARCADE</h4>
            <p className="font-normal text-[14px] text-white/60">
              © {year} Entropy Arcade. All rights reserved.
            </p>
            <div className="flex items-center gap-3">
              <a className="nav-pill" href="#">
                Sign in
              </a>
              <a className="nav-pill" href="#">
                Profile
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

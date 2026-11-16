"use client";
import dynamic from "next/dynamic";

// Avoid SSR for WebGL/Canvas
const StarfieldCanvas = dynamic(
  () => import("./StarfieldWrapper").then((m) => m.StarfieldWrapper),
  { ssr: false },
);

export function BackgroundCanvas() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <StarfieldCanvas />
    </div>
  );
}

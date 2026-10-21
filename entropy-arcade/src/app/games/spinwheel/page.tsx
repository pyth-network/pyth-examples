// src/app/games/spinwheel/page.tsx
"use client";
import dynamic from "next/dynamic";

const SpinWheel = dynamic(() => import("@/components/games/SpinWheel"), {
  ssr: false,
});

export default function Page() {
  return <SpinWheel />;
}

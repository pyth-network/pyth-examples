// src/app/games/poker/page.tsx
"use client";
import dynamic from "next/dynamic";

const PokerGame = dynamic(() => import("@/components/games/PokerGame"), {
  ssr: false,
});

export default function Page() {
  return <PokerGame />;
}

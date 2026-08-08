// src/app/games/mines/page.tsx
"use client";
import dynamic from "next/dynamic";

const MinesGame = dynamic(() => import("@/components/games/MinesGame"), {
  ssr: false,
});

export default function Page() {
  return <MinesGame />;
}

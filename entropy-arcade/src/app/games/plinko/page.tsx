// app/games/plinko/page.tsx  (or src/app/games/plinko/page.tsx)
//
"use client";
import dynamic from "next/dynamic";
const Plinko = dynamic(() => import("@/components/games/Plinko"), {
  ssr: false,
});

export default function Page() {
  return <Plinko />;
}

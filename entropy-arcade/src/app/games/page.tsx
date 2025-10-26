// src/app/games/page.tsx
"use client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { GamesGrid } from "@/components/games/GamesGrid";
import { useReveal } from "@/components/useReveal";

export default function GamesPage() {
  useReveal();
  return (
    <>
      <Navbar />
      <main className="sm:p-24 px-8 py-16">
        <h1 className="text-3xl sm:text-5xl font-bold" data-animate>
          Games
        </h1>
        <p className="mt-3 text-secondary-white max-w-2xl" data-animate>
          Pick a mode—each game is backed by on-chain entropy (Pyth).
        </p>
      </main>
      <GamesGrid />
      <Footer />
    </>
  );
}

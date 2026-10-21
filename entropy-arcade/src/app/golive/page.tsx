// src/app/golive/page.tsx
"use client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { GoLive } from "@/components/GoLive";
import { useReveal } from "@/components/useReveal";

export default function GoLivePage() {
  useReveal();
  return (
    <>
      <Navbar />
      <main className="sm:p-24 px-8 py-16">
        <h1 className="text-3xl sm:text-5xl font-bold" data-animate>
          Go Live
        </h1>
        <p className="mt-3 text-secondary-white max-w-2xl" data-animate>
          Host a room with configurable RTP, fees, and limits.
        </p>
      </main>
      <GoLive />
      <Footer />
    </>
  );
}

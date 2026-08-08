"use client";
import { Navbar } from "../components/Navbar";
import { Hero } from "../components/Hero";
import { GamesGrid } from "../components/games/GamesGrid";
import { GoLive } from "../components/GoLive";
import { Footer } from "../components/Footer";
import { useReveal } from "../components/useReveal";

export default function HomePage() {
  useReveal();
  return (
    <>
      <Navbar />
      <Hero />
      <GamesGrid />
      <GoLive />
      <Footer />
    </>
  );
}

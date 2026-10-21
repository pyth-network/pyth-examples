"use client";

import Link from "next/link";

interface GameCardProps {
  href?: string;
  title: string;
  emoji?: string;
  description: string;
  cta: string;
  disabled?: boolean;
}

export function GameCard({
  href,
  title,
  emoji,
  description,
  cta,
  disabled,
}: GameCardProps) {
  const content = (
    <div
      className={`group relative h-56 sm:h-64 rounded-xl border border-white/10 p-5
      flex flex-col justify-end overflow-hidden transition-all duration-300
      ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-white/30 cursor-pointer"}`}
    >
      {/* Background image (just added, no logic change) */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-60 transition-opacity duration-300"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1600&auto=format&fit=crop')",
        }}
      />
      <div className="absolute inset-0 bg-black/40" />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center gap-2">
          {emoji && <span className="text-2xl">{emoji}</span>}
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <p className="mt-2 text-sm text-white/70 line-clamp-2">{description}</p>
        <span className="mt-4 text-sm font-medium text-white/90">{cta}</span>
      </div>
    </div>
  );

  if (disabled || !href) return content;

  return (
    <Link href={href} prefetch={false}>
      {content}
    </Link>
  );
}

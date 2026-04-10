"use client";

import { useEffect, useState } from "react";

export default function HeroSection() {
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time post-hydration animation flag
  useEffect(() => setMounted(true), []);

  return (
    <section className="relative overflow-hidden px-6 pt-12 pb-8">
      {/* Background grid */}
      <div className="bg-grid pointer-events-none absolute inset-0" />

      {/* Gradient orbs — subtle */}
      <div className="pointer-events-none absolute top-0 left-1/4 h-64 w-64 -translate-x-1/2 rounded-full bg-neon-cyan/5 blur-3xl" />
      <div className="pointer-events-none absolute right-1/4 bottom-0 h-64 w-64 translate-x-1/2 rounded-full bg-neon-amber/5 blur-3xl" />

      {/* Content */}
      <div
        className={`relative z-10 mx-auto flex max-w-4xl flex-col items-center transition-all duration-700 ${
          mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        {/* Brand + description in a tight layout */}
        <h1 className="flex items-baseline gap-2 sm:gap-3">
          <span
            className="glitch-text font-display text-3xl font-bold tracking-[0.15em] text-foreground sm:text-5xl"
            data-text="BRAINROT"
          >
            BRAINROT
          </span>
          <span className="font-display text-3xl font-bold tracking-[0.15em] text-neon-amber sm:text-5xl">
            GAMES
          </span>
        </h1>

        {/* Description — immediately below title */}
        <p
          className={`mt-4 max-w-2xl text-center text-sm leading-relaxed text-muted transition-all delay-150 duration-700 sm:text-base ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          }`}
        >
          AI models compete head-to-head by implementing classic games.
          Every game is{" "}
          <span className="font-semibold text-neon-amber">100% AI-generated</span>.
          New games and models added as they become available.
        </p>
      </div>
    </section>
  );
}

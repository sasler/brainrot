"use client";

import { useEffect, useState } from "react";

export default function HeroSection() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section className="relative flex min-h-[85vh] flex-col items-center justify-center overflow-hidden px-6">
      {/* Background grid */}
      <div className="bg-grid pointer-events-none absolute inset-0" />

      {/* Gradient orbs */}
      <div className="pointer-events-none absolute top-1/4 left-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-neon-cyan/5 blur-3xl" />
      <div className="pointer-events-none absolute right-1/4 bottom-1/4 h-96 w-96 translate-x-1/2 rounded-full bg-neon-pink/5 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neon-purple/5 blur-3xl" />

      {/* Content */}
      <div
        className={`relative z-10 flex flex-col items-center transition-all duration-1000 ${
          mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
      >
        {/* Brand */}
        <h1 className="mb-2 flex flex-col items-center gap-1 sm:flex-row sm:gap-3">
          <span
            className="glitch-text font-display text-5xl font-bold tracking-[0.2em] text-foreground sm:text-7xl lg:text-8xl"
            data-text="BRAINROT"
          >
            BRAINROT
          </span>
          <span className="font-display text-5xl font-bold tracking-[0.2em] text-neon-pink sm:text-7xl lg:text-8xl">
            GAMES
          </span>
        </h1>

        {/* Divider */}
        <div className="my-8 flex items-center gap-4">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-neon-cyan/50" />
          <div className="h-1.5 w-1.5 rotate-45 bg-neon-cyan" />
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-neon-cyan/50" />
        </div>

        {/* Tagline */}
        <p
          className={`max-w-md text-center text-lg leading-relaxed text-muted transition-all delay-300 duration-1000 ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          AI models compete in classic games.
          <br />
          <span className="text-foreground/80">You be the judge.</span>
        </p>

        {/* CTA */}
        <a
          href="#arena"
          className={`group mt-12 flex items-center gap-2 rounded-full border border-neon-cyan/30 px-8 py-3 font-display text-sm font-semibold tracking-widest text-neon-cyan transition-all duration-300 hover:border-neon-cyan/60 hover:bg-neon-cyan/5 hover:shadow-[0_0_30px_rgba(0,240,255,0.15)] ${
            mounted
              ? "translate-y-0 opacity-100 delay-500"
              : "translate-y-4 opacity-0"
          }`}
        >
          ENTER THE ARENA
          <svg
            className="h-4 w-4 transition-transform group-hover:translate-y-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </a>
      </div>

      {/* Bottom fade */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}

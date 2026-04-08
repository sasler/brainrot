"use client";

import { useCallback, useEffect, useState } from "react";
import type { TrashTalkQuote } from "@/lib/games";

interface TrashTalkTickerProps {
  quotes: TrashTalkQuote[];
}

export default function TrashTalkTicker({ quotes }: TrashTalkTickerProps) {
  const [pair, setPair] = useState<[TrashTalkQuote, TrashTalkQuote] | null>(
    null,
  );
  const [fading, setFading] = useState(false);

  const pickPair = useCallback(() => {
    if (quotes.length < 2) return null;
    const i = Math.floor(Math.random() * quotes.length);
    let j = Math.floor(Math.random() * (quotes.length - 1));
    if (j >= i) j++;
    return [quotes[i], quotes[j]] as [TrashTalkQuote, TrashTalkQuote];
  }, [quotes]);

  useEffect(() => {
    const initial = pickPair();
    if (!initial) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe: must randomize after hydration to avoid mismatch
    setPair(initial);

    let timeoutId: ReturnType<typeof setTimeout>;
    const interval = setInterval(() => {
      setFading(true);
      timeoutId = setTimeout(() => {
        setPair(pickPair());
        setFading(false);
      }, 500);
    }, 6000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeoutId);
    };
  }, [pickPair]);

  return (
    <section className="relative min-h-[180px] px-6 py-8">
      {/* Subtle divider glow */}
      <div className="mx-auto mb-6 h-px w-32 bg-gradient-to-r from-transparent via-neon-purple/40 to-transparent" />

      <div className="mx-auto max-w-5xl">
        {/* Mini header */}
        <div className="mb-5 text-center">
          <span className="font-mono text-[10px] tracking-[0.4em] text-neon-purple/60">
            ⚡ AI SMACK TALK ⚡
          </span>
        </div>

        {/* Rotating quote pair */}
        {pair && (
          <div
            className={`grid gap-6 transition-opacity duration-500 md:grid-cols-2 ${
              fading ? "opacity-0" : "opacity-100"
            }`}
          >
            {pair.map((quote, i) => (
              <div
                key={i}
                className="rounded-xl border border-border/30 bg-surface/50 px-5 py-4 text-center"
              >
                <p className="text-sm leading-relaxed text-foreground/60 italic">
                  &ldquo;{quote.text}&rdquo;
                </p>
                <p className="mt-2 font-mono text-[10px] text-muted">
                  —{" "}
                  <span className="text-neon-purple/80">{quote.from}</span> on{" "}
                  <span className="text-neon-amber/80">{quote.about}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

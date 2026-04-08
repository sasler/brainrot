"use client";

import { useEffect, useState } from "react";
import type { ModelReviewEntry } from "@/lib/games";

interface ModelReviewCardProps {
  entry: ModelReviewEntry;
  index: number;
}

const MODEL_COLORS: Record<string, string> = {
  "sonnet-4-6": "#cc8833",
  "gpt-5-4": "#10a37f",
  "gpt-5-4-mini": "#74aa9c",
  "opus-4-6": "#6366f1",
  "gemini-3-1-pro": "#4285f4",
};

export default function ModelReviewCard({ entry, index }: ModelReviewCardProps) {
  const modelColor = MODEL_COLORS[entry.modelId] || "#888";
  const [review, setReview] = useState<{ from: string; comment: string } | null>(null);

  useEffect(() => {
    if (!entry.reviews || entry.reviews.length === 0) return;
    const reviewer = entry.reviews[Math.floor(Math.random() * entry.reviews.length)];
    if (!reviewer.comments || reviewer.comments.length === 0) return;
    const comment = reviewer.comments[Math.floor(Math.random() * reviewer.comments.length)];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe: must randomize after hydration to avoid mismatch
    setReview({ from: reviewer.from, comment });
  }, [entry.reviews]);

  if (!review) return null;

  return (
    <div
      className="card-glow relative overflow-hidden rounded-2xl bg-card p-6 transition-all duration-300 hover:bg-card-hover"
      style={
        {
          "--glow-color": modelColor,
          animationDelay: `${index * 100}ms`,
        } as React.CSSProperties
      }
    >
      {/* Accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-px opacity-60"
        style={{ backgroundColor: modelColor }}
      />

      {/* Model name */}
      <div className="mb-3 flex items-center gap-2">
        <div
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: modelColor }}
        />
        <span
          className="font-display text-sm font-bold tracking-wide"
          style={{ color: modelColor }}
        >
          {entry.model}
        </span>
      </div>

      {/* Sarcastic quote */}
      <p className="text-sm italic leading-relaxed text-foreground/60">
        &ldquo;{review.comment}&rdquo;
      </p>
      <p className="mt-2 text-right font-mono text-[10px] text-muted">
        — {review.from}
      </p>
    </div>
  );
}

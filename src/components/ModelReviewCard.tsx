"use client";

import { useEffect, useState } from "react";
import { getModelInfo } from "@/lib/modelCatalog";
import type { ModelReviewEntry } from "@/lib/games";

interface ModelReviewCardProps {
  entry: ModelReviewEntry;
  index: number;
}

export default function ModelReviewCard({ entry, index }: ModelReviewCardProps) {
  const model = getModelInfo(entry.modelId, entry.model);
  const modelColor = model.color;
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
      data-model-id={entry.modelId}
      data-model-color={modelColor}
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
      <div className="mb-3 flex items-start gap-2.5">
        <div
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
          aria-hidden="true"
          style={{ backgroundColor: modelColor }}
        />
        <div>
          <span className="block font-mono text-[9px] tracking-[0.2em] text-muted uppercase">
            {model.family}
          </span>
          <span
            className="font-display text-sm font-bold tracking-wide"
            style={{ color: modelColor }}
          >
            {model.displayName}
          </span>
        </div>
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

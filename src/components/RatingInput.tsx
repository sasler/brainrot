"use client";

import { useState } from "react";
import { useVersionRating } from "./RatingsProvider";

interface RatingInputProps {
  gameId: string;
  modelId: string;
  accentColor?: string;
}

export default function RatingInput({
  gameId,
  modelId,
  accentColor = "var(--neon-amber)",
}: RatingInputProps) {
  const { rating, userVote, storage, loading, submitError, submit } = useVersionRating(
    gameId,
    modelId,
  );
  const [hovered, setHovered] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex h-10 items-center gap-2">
        <div className="h-4 w-24 animate-pulse rounded bg-foreground/5" />
      </div>
    );
  }

  const displayStars = hovered || userVote || 0;
  const ratingDisabled = submitting || (storage !== null && !storage.writable);

  async function handleClick(stars: number) {
    if (ratingDisabled) return;
    setSubmitting(true);
    await submit(stars);
    setSubmitting(false);
  }

  return (
    <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4">
      <div className="flex items-center gap-1">
        <span className="mr-2 font-mono text-xs text-muted">RATE:</span>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={ratingDisabled}
            className="cursor-pointer p-0.5 transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-60"
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => handleClick(star)}
            aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
          >
            <svg
              width={24}
              height={24}
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.49L10 14.26 5.06 16.7 6 11.21l-4-3.9 5.53-.8L10 1.5z"
                fill={star <= displayStars ? accentColor : "transparent"}
                stroke={
                  star <= displayStars
                    ? accentColor
                    : "rgba(255,255,255,0.2)"
                }
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ))}
        </div>

      {storage && !storage.writable ? (
        <span className="font-mono text-[11px] text-foreground/45">
          {storage.reason}
        </span>
      ) : rating ? (
        <span className="font-mono text-[11px] text-foreground/40">
          {rating.average.toFixed(1)} avg · {rating.count}{" "}
          {rating.count === 1 ? "vote" : "votes"}
          {userVote && (
            <span className="ml-1" style={{ color: accentColor }}>
              · You: {userVote}★
            </span>
          )}
        </span>
      ) : !rating && userVote ? (
        <span className="font-mono text-[11px]" style={{ color: accentColor }}>
          You rated: {userVote}★
        </span>
      ) : null}

      {submitError && (
        <span className="font-mono text-[11px] text-rose-300/90">
          {submitError}
        </span>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  FAILURE_CATEGORIES,
  FAILURE_CATEGORY_LABELS,
  leadingFailureCategories,
  type StarValue,
  type UserVerdict,
} from "@/lib/ratings-feedback";
import { useVersionFeedback } from "./RatingsProvider";

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
  const {
    feedback,
    rating,
    userVerdict,
    storage,
    loading,
    submitError,
    submit,
  } = useVersionFeedback(gameId, modelId);
  const [hovered, setHovered] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showFailureChoices, setShowFailureChoices] = useState(false);
  const [editingRating, setEditingRating] = useState(false);

  if (loading) {
    return (
      <div className="flex h-10 items-center gap-2" aria-label="Loading verdicts">
        <div className="h-4 w-32 animate-pulse rounded bg-foreground/5" />
      </div>
    );
  }

  const selectedStars =
    userVerdict?.type === "rating" ? userVerdict.stars : 0;
  const displayStars = hovered || selectedStars;
  const storageDisabled = storage !== null && !storage.writable;
  const starsDisabled =
    submitting || storageDisabled || (userVerdict?.type === "fail" && !editingRating);
  const failureDisabled = submitting || storageDisabled;
  const leadingCategories = feedback
    ? leadingFailureCategories(feedback)
    : [];

  async function submitVerdict(verdict: UserVerdict) {
    if (submitting || storageDisabled) return;
    setSubmitting(true);
    await submit(verdict);
    setSubmitting(false);
    setShowFailureChoices(false);
    setEditingRating(false);
  }

  function handleStar(stars: StarValue) {
    if (starsDisabled) return;
    void submitVerdict({ type: "rating", stars });
  }

  return (
    <div className="relative flex w-full max-w-5xl flex-col items-center gap-2">
      <div className="flex w-full flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
        <div className="flex items-center gap-1" role="group" aria-label="Star rating">
          <span className="mr-2 font-mono text-xs text-muted">RATE:</span>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              disabled={starsDisabled}
              className="cursor-pointer p-0.5 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-35"
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => handleStar(star as StarValue)}
              aria-pressed={selectedStars === star}
              aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
            >
              <svg
                width={24}
                height={24}
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
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

        <div className="hidden h-5 w-px bg-border sm:block" aria-hidden="true" />

        {userVerdict?.type === "fail" && !editingRating ? (
          <button
            type="button"
            className="font-mono text-[10px] tracking-wider text-neon-cyan underline decoration-neon-cyan/30 underline-offset-4 hover:text-foreground"
            onClick={() => setEditingRating(true)}
          >
            CHANGE TO A STAR RATING
          </button>
        ) : (
          <button
            type="button"
            disabled={failureDisabled}
            aria-expanded={showFailureChoices}
            aria-controls="failure-category-choices"
            onClick={() => setShowFailureChoices((visible) => !visible)}
            className={`rounded-full border px-4 py-1.5 font-mono text-[10px] font-semibold tracking-[0.14em] transition-all focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
              userVerdict?.type === "fail"
                ? "border-rose-400/60 bg-rose-400/15 text-rose-200"
                : "border-rose-400/25 bg-rose-400/5 text-rose-300/80 hover:border-rose-400/55 hover:bg-rose-400/10 hover:text-rose-200"
            }`}
          >
            {userVerdict?.type === "fail" ? "REPORTED FAILED" : "DOESN'T WORK"}
          </button>
        )}

        {storage && !storage.writable ? (
          <span className="font-mono text-[11px] text-foreground/45">
            {storage.reason}
          </span>
        ) : rating ? (
          <span className="font-mono text-[11px] text-foreground/40">
            {rating.average.toFixed(1)} avg · {rating.count}{" "}
            {rating.count === 1 ? "rating" : "ratings"}
          </span>
        ) : null}

        {feedback && feedback.failCount > 0 && (
          <span className="font-mono text-[11px] text-rose-300/70">
            {feedback.failCount} of {feedback.totalVerdicts} reported failure
            {feedback.failCount === 1 ? "" : "s"}
            {leadingCategories.length > 0 && (
              <> · {leadingCategories.map(({ category }) => FAILURE_CATEGORY_LABELS[category]).join(", ")}</>
            )}
          </span>
        )}
      </div>

      {showFailureChoices && (
        <div
          id="failure-category-choices"
          className="flex w-full flex-col gap-2 rounded-xl border border-rose-400/20 bg-[#160d13]/95 p-3 shadow-[0_-12px_35px_rgba(0,0,0,0.35)] sm:w-auto"
          aria-label="Optional failure category"
        >
          <div className="flex flex-wrap justify-center gap-1.5">
            {FAILURE_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                disabled={submitting || storageDisabled}
                onClick={() => void submitVerdict({ type: "fail", category })}
                className="rounded-full border border-rose-300/20 px-3 py-1 font-mono text-[10px] text-rose-100/75 transition-colors hover:border-rose-300/50 hover:bg-rose-300/10 hover:text-rose-100 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
              >
                {FAILURE_CATEGORY_LABELS[category]}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={submitting || storageDisabled}
            onClick={() => void submitVerdict({ type: "fail" })}
            className="self-center font-mono text-[9px] tracking-wider text-muted underline decoration-foreground/20 underline-offset-4 hover:text-foreground disabled:opacity-50"
          >
            REPORT WITHOUT DETAILS
          </button>
        </div>
      )}

      {submitError && (
        <span role="alert" className="font-mono text-[11px] text-rose-300/90">
          {submitError}
        </span>
      )}
    </div>
  );
}

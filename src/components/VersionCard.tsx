"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Game, GameVersion } from "@/lib/games";

interface VersionCardProps {
  game: Game;
  version: GameVersion;
  index: number;
}

const MODEL_COLORS: Record<string, string> = {
  "sonnet-4-6": "#cc8833",
  "gpt-5-4": "#10a37f",
  "gpt-5-4-mini": "#74aa9c",
  "opus-4-6": "#6366f1",
  "gemini-3-1-pro": "#4285f4",
};

const FEATURE_LABELS: Record<string, string> = {
  sound: "🔊 Sound",
  music: "🎵 Music",
  "3d": "🎮 3D",
  particles: "✨ Particles",
  powerups: "⚡ Power-ups",
};

const FEATURE_COLORS: Record<string, string> = {
  sound: "rgba(99, 102, 241, 0.25)",
  music: "rgba(168, 85, 247, 0.25)",
  "3d": "rgba(16, 185, 129, 0.25)",
  particles: "rgba(245, 158, 11, 0.25)",
  powerups: "rgba(239, 68, 68, 0.25)",
};

export default function VersionCard({ game, version, index }: VersionCardProps) {
  const modelColor = MODEL_COLORS[version.modelId] || game.accentColor;
  const [review, setReview] = useState<{ from: string; comment: string } | null>(null);

  useEffect(() => {
    if (!version.aiReviews || version.aiReviews.length === 0) return;
    const reviewer = version.aiReviews[Math.floor(Math.random() * version.aiReviews.length)];
    if (!reviewer.comments || reviewer.comments.length === 0) return;
    const comment = reviewer.comments[Math.floor(Math.random() * reviewer.comments.length)];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe: must randomize after hydration to avoid mismatch
    setReview({ from: reviewer.from, comment });
  }, [version.aiReviews]);

  return (
    <Link
      href={`/games/${game.id}/${version.modelId}`}
      className="card-glow group relative flex flex-col overflow-hidden rounded-2xl bg-card p-6 transition-all duration-300 hover:bg-card-hover hover:-translate-y-1"
      style={
        {
          "--glow-color": modelColor,
          animationDelay: `${index * 80}ms`,
        } as React.CSSProperties
      }
    >
      {/* Accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-px opacity-0 transition-opacity group-hover:opacity-100"
        style={{ backgroundColor: modelColor }}
      />

      {/* Model name */}
      <div className="mb-4 flex items-center gap-3">
        <div
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: modelColor }}
        />
        <h3 className="font-display text-lg font-bold tracking-wide text-foreground">
          {version.model}
        </h3>
      </div>

      {/* Stats grid */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <div className="font-mono text-xs text-muted">DATE</div>
          <div className="mt-1 font-mono text-sm text-foreground/80">
            {version.date}
          </div>
        </div>
        <div>
          <div className="font-mono text-xs text-muted">LINES</div>
          <div className="mt-1 font-mono text-sm text-foreground/80">
            {version.linesOfCode.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Feature badges */}
      {version.features && version.features.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {version.features.map((feature) => (
            <span
              key={feature}
              className="rounded-full px-2.5 py-0.5 font-mono text-[10px] text-foreground/90"
              style={{
                backgroundColor:
                  FEATURE_COLORS[feature] || "rgba(255,255,255,0.1)",
              }}
            >
              {FEATURE_LABELS[feature] || feature}
            </span>
          ))}
        </div>
      )}

      {/* AI review quote — randomly selected */}
      {review && (
        <div className="mb-4">
          <p className="text-xs italic leading-relaxed text-foreground/50">
            &ldquo;{review.comment}&rdquo;{" "}
            <span style={{ color: modelColor }}>
              — {review.from}
            </span>
          </p>
        </div>
      )}

      {/* Play button */}
      <div className="mt-auto flex items-center justify-between">
        <span className="font-mono text-xs text-muted">{version.modelId}</span>
        <span
          className="rounded-full border px-4 py-1.5 font-display text-xs font-semibold tracking-widest transition-all group-hover:shadow-[0_0_20px_rgba(0,0,0,0.3)]"
          style={{
            borderColor: `${modelColor}40`,
            color: modelColor,
          }}
        >
          PLAY
        </span>
      </div>
    </Link>
  );
}

import Link from "next/link";
import type { Game } from "@/lib/games";

interface GameCardProps {
  game: Game;
  index: number;
}

export default function GameCard({ game, index }: GameCardProps) {
  const versionCount = game.versions.length;

  return (
    <Link
      href={`/games/${game.id}`}
      className="card-glow group relative flex flex-col overflow-hidden rounded-2xl bg-card p-8 transition-all duration-300 hover:bg-card-hover hover:-translate-y-1"
      style={
        {
          "--glow-color": game.accentColor,
          animationDelay: `${index * 100}ms`,
        } as React.CSSProperties
      }
    >
      {/* Accent line at top */}
      <div
        className="absolute top-0 left-0 right-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ backgroundColor: game.accentColor }}
      />

      {/* Icon */}
      <div className="mb-6 text-5xl" role="img" aria-label={game.name}>
        {game.icon}
      </div>

      {/* Name */}
      <h3 className="font-display mb-3 text-xl font-bold tracking-wide text-foreground">
        {game.name}
      </h3>

      {/* Description */}
      <p className="mb-6 flex-1 text-sm leading-relaxed text-muted">
        {game.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-muted">
          {versionCount > 0 ? (
            <>
              <span
                className="font-semibold"
                style={{ color: game.accentColor }}
              >
                {versionCount}
              </span>{" "}
              {versionCount === 1 ? "version" : "versions"}
            </>
          ) : (
            "Coming soon"
          )}
        </span>
        <span
          className="text-xs font-medium tracking-wider opacity-0 transition-all duration-300 group-hover:opacity-100"
          style={{ color: game.accentColor }}
        >
          ENTER →
        </span>
      </div>
    </Link>
  );
}

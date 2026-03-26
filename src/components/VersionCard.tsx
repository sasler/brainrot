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
};

export default function VersionCard({ game, version, index }: VersionCardProps) {
  const modelColor = MODEL_COLORS[version.modelId] || game.accentColor;

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

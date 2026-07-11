import Link from "next/link";
import type { ModelGameContribution } from "@/lib/games";

interface ModelGameCardProps {
  contribution: ModelGameContribution;
  modelColor: string;
  index: number;
}

export default function ModelGameCard({ contribution: { game, version }, modelColor, index }: ModelGameCardProps) {
  return (
    <Link
      href={`/games/${game.id}/${version.modelId}`}
      className="card-glow group relative flex min-h-72 flex-col overflow-hidden rounded-2xl bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:bg-card-hover focus-visible:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4"
      style={{ "--glow-color": game.accentColor, animationDelay: `${index * 65}ms` } as React.CSSProperties}
      data-game-id={game.id}
    >
      <div className="absolute inset-x-0 top-0 h-px opacity-60" style={{ backgroundColor: game.accentColor }} />
      <div className="mb-6 flex items-start justify-between">
        <span className="text-5xl transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110" role="img" aria-label={game.name}>{game.icon}</span>
        <span className="rounded-full border border-border bg-surface/60 px-3 py-1 font-mono text-[9px] tracking-widest text-muted uppercase">{version.linesOfCode.toLocaleString()} lines</span>
      </div>
      <h2 className="font-display text-xl font-bold tracking-wide text-foreground">{game.name}</h2>
      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">{game.description}</p>
      <div className="mt-auto flex items-end justify-between pt-7">
        <div className="font-mono text-[10px] tracking-wider text-muted">BUILT {version.date}</div>
        <span
          className="rounded-full border px-4 py-2 font-display text-xs font-semibold tracking-[0.18em] transition-shadow group-hover:shadow-[0_0_20px_color-mix(in_srgb,var(--model-color)_25%,transparent)]"
          style={{ "--model-color": modelColor, borderColor: `${modelColor}55`, color: modelColor } as React.CSSProperties}
        >
          PLAY →
        </span>
      </div>
    </Link>
  );
}

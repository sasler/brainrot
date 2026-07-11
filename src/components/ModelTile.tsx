import Link from "next/link";
import type { ModelContribution } from "@/lib/games";

interface ModelTileProps {
  model: ModelContribution;
  index: number;
}

export default function ModelTile({ model, index }: ModelTileProps) {
  return (
    <Link
      href={`/models/${model.modelId}`}
      className="model-tile group relative isolate flex min-h-52 flex-col overflow-hidden rounded-2xl border border-border bg-card/80 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[color:var(--model-color)] focus-visible:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4"
      style={{ "--model-color": model.color, animationDelay: `${index * 55}ms` } as React.CSSProperties}
      data-model-id={model.modelId}
    >
      <div className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-[var(--model-color)] opacity-10 blur-3xl transition-opacity duration-500 group-hover:opacity-25" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--model-color)] to-transparent opacity-50" />
      <div className="mb-8 flex items-center justify-between">
        <span className="font-mono text-[10px] font-semibold tracking-[0.22em] uppercase" style={{ color: model.color }}>
          {model.modelId}
        </span>
        <span className="relative flex h-3 w-3 items-center justify-center">
          <span className="absolute h-full w-full animate-ping rounded-full bg-[var(--model-color)] opacity-20" />
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--model-color)] shadow-[0_0_12px_var(--model-color)]" />
        </span>
      </div>
      <h3 className="font-display max-w-64 text-xl leading-tight font-bold tracking-wide text-foreground">{model.displayName}</h3>
      <div className="mt-auto flex items-end justify-between pt-8">
        <div>
          <div className="font-display text-4xl font-bold text-foreground">{model.games.length.toString().padStart(2, "0")}</div>
          <div className="mt-1 font-mono text-[10px] tracking-[0.18em] text-muted uppercase">{model.games.length === 1 ? "game shipped" : "games shipped"}</div>
        </div>
        <span className="mb-1 translate-x-1 font-mono text-xs font-semibold tracking-widest opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" style={{ color: model.color }}>
          INSPECT →
        </span>
      </div>
    </Link>
  );
}

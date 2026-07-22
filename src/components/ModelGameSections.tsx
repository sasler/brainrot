"use client";

import type { ModelGameContribution } from "@/lib/games";
import { useRatings } from "./RatingsProvider";
import ModelGameCard from "./ModelGameCard";

interface ModelGameSectionsProps {
  games: ModelGameContribution[];
  modelColor: string;
}

export default function ModelGameSections({
  games,
  modelColor,
}: ModelGameSectionsProps) {
  const { feedback, loading, storage } = useRatings();

  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading game status">
        {games.map(({ game }) => (
          <div key={game.id} className="h-72 animate-pulse rounded-2xl border border-border bg-card/50" />
        ))}
      </div>
    );
  }

  const classificationAvailable = storage?.available !== false;
  const failed = classificationAvailable
    ? games.filter(
        ({ game, version }) =>
          feedback[`${game.id}:${version.modelId}`]?.failed,
      )
    : [];
  const failedIds = new Set(failed.map(({ game }) => game.id));
  const active = games.filter(({ game }) => !failedIds.has(game.id));

  const grid = (items: ModelGameContribution[]) => (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((contribution, index) => (
        <ModelGameCard
          key={contribution.game.id}
          contribution={contribution}
          modelColor={modelColor}
          index={index}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-14">
      <section aria-labelledby="active-model-games">
        <h3 id="active-model-games" className="sr-only">
          {classificationAvailable ? "Active games" : "Games"}
        </h3>
        {grid(active)}
      </section>
      {failed.length > 0 && (
        <section
          aria-labelledby="failed-model-games"
          className="rounded-3xl border border-rose-400/15 bg-rose-950/10 p-5 sm:p-7"
        >
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="mb-2 font-mono text-[9px] tracking-[0.22em] text-rose-300/60 uppercase">
                Community quarantine
              </div>
              <h3 id="failed-model-games" className="font-display text-2xl font-bold text-rose-100/90">
                Failed implementations
              </h3>
            </div>
            <span className="font-mono text-[10px] text-rose-200/45">
              STILL AVAILABLE TO VERIFY
            </span>
          </div>
          {grid(failed)}
        </section>
      )}
    </div>
  );
}

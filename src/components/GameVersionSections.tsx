"use client";

import type { Game } from "@/lib/games";
import { useRatings } from "./RatingsProvider";
import VersionCard from "./VersionCard";

function SectionHeading({
  children,
  failed = false,
}: {
  children: React.ReactNode;
  failed?: boolean;
}) {
  const color = failed ? "text-rose-300" : "text-neon-cyan";
  const gradient = failed ? "to-rose-400/50" : "to-neon-cyan/50";
  return (
    <div className="mb-8 flex items-center gap-4">
      <div className={`h-px w-8 bg-gradient-to-r from-transparent ${gradient}`} />
      <h2 className={`font-display text-sm font-semibold tracking-[0.3em] ${color}`}>
        {children}
      </h2>
      <div className={`h-px w-8 bg-gradient-to-l from-transparent ${gradient}`} />
    </div>
  );
}

export default function GameVersionSections({ game }: { game: Game }) {
  const { feedback, loading, storage } = useRatings();

  if (loading) {
    return (
      <div aria-label="Loading implementation status">
        <div className="mb-8 h-4 w-52 animate-pulse rounded bg-foreground/5" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {game.versions.map((version) => (
            <div
              key={version.modelId}
              className="h-80 animate-pulse rounded-2xl border border-border bg-card/50"
            />
          ))}
        </div>
      </div>
    );
  }

  const classificationAvailable = storage?.available !== false;
  const failedVersions = classificationAvailable
    ? game.versions.filter(
        (version) => feedback[`${game.id}:${version.modelId}`]?.failed,
      )
    : [];
  const failedIds = new Set(failedVersions.map((version) => version.modelId));
  const activeVersions = game.versions.filter(
    (version) => !failedIds.has(version.modelId),
  );

  return (
    <div className="space-y-14">
      <section aria-labelledby="active-implementations-heading">
        <div id="active-implementations-heading">
          <SectionHeading>
            {classificationAvailable ? "ACTIVE IMPLEMENTATIONS" : "AI IMPLEMENTATIONS"}
          </SectionHeading>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {activeVersions.map((version, index) => (
            <VersionCard
              key={version.modelId}
              game={game}
              version={version}
              index={index}
            />
          ))}
        </div>
      </section>

      {failedVersions.length > 0 && (
        <section
          aria-labelledby="failed-implementations-heading"
          className="rounded-3xl border border-rose-400/15 bg-rose-950/10 p-5 sm:p-7"
        >
          <div id="failed-implementations-heading">
            <SectionHeading failed>FAILED IMPLEMENTATIONS</SectionHeading>
          </div>
          <p className="-mt-4 mb-7 max-w-2xl text-sm leading-relaxed text-rose-100/45">
            Community verdicts indicate these versions are technically unusable.
            They remain available to open and verify.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {failedVersions.map((version, index) => (
              <VersionCard
                key={version.modelId}
                game={game}
                version={version}
                index={index}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

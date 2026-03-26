import { notFound } from "next/navigation";
import Link from "next/link";
import { getGame, getGames } from "@/lib/games";
import VersionCard from "@/components/VersionCard";
import type { Metadata } from "next";

interface GamePageProps {
  params: Promise<{ game: string }>;
}

export async function generateStaticParams() {
  return getGames().map((game) => ({ game: game.id }));
}

export async function generateMetadata({
  params,
}: GamePageProps): Promise<Metadata> {
  const { game: gameId } = await params;
  const game = getGame(gameId);
  if (!game) return { title: "Game Not Found" };
  return {
    title: `${game.name} — BrainRot Games`,
    description: game.description,
  };
}

export default async function GamePage({ params }: GamePageProps) {
  const { game: gameId } = await params;
  const game = getGame(gameId);

  if (!game) notFound();

  return (
    <div className="px-6 py-12">
      <div className="mx-auto max-w-6xl">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-sm text-muted">
          <Link href="/" className="transition-colors hover:text-foreground">
            Home
          </Link>
          <span>/</span>
          <span className="text-foreground">{game.name}</span>
        </nav>

        {/* Game header */}
        <div className="mb-16">
          <div className="mb-4 flex items-center gap-4">
            <span className="text-5xl" role="img" aria-label={game.name}>
              {game.icon}
            </span>
            <div>
              <h1 className="font-display text-4xl font-bold tracking-wide text-foreground">
                {game.name}
              </h1>
              <p className="mt-1 text-muted">{game.description}</p>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: game.accentColor }}
              />
              <span className="font-mono text-xs text-muted">
                {game.versions.length}{" "}
                {game.versions.length === 1 ? "version" : "versions"}
              </span>
            </div>
          </div>
        </div>

        {/* AI Versions */}
        {game.versions.length > 0 ? (
          <>
            <div className="mb-8 flex items-center gap-4">
              <div className="h-px w-8 bg-gradient-to-r from-transparent to-neon-cyan/50" />
              <h2 className="font-display text-sm font-semibold tracking-[0.3em] text-neon-cyan">
                AI IMPLEMENTATIONS
              </h2>
              <div className="h-px w-8 bg-gradient-to-l from-transparent to-neon-cyan/50" />
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {game.versions.map((version, index) => (
                <VersionCard
                  key={version.modelId}
                  game={game}
                  version={version}
                  index={index}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border py-20">
            <div className="mb-4 text-4xl opacity-30">🤖</div>
            <h3 className="font-display mb-2 text-lg font-semibold text-foreground/60">
              No AI Versions Yet
            </h3>
            <p className="max-w-sm text-center text-sm text-muted">
              AI models haven&apos;t competed on this game yet. Versions will
              appear here once they&apos;re implemented.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

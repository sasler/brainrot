import { notFound } from "next/navigation";
import Link from "next/link";
import { getGame, getGames, getGameVersion } from "@/lib/games";
import type { Metadata } from "next";

interface PlayPageProps {
  params: Promise<{ game: string; model: string }>;
}

export async function generateStaticParams() {
  const params: { game: string; model: string }[] = [];
  getGames().forEach((game) => {
    game.versions.forEach((version) => {
      params.push({ game: game.id, model: version.modelId });
    });
  });
  return params;
}

export async function generateMetadata({
  params,
}: PlayPageProps): Promise<Metadata> {
  const { game: gameId, model: modelId } = await params;
  const game = getGame(gameId);
  const version = game ? getGameVersion(gameId, modelId) : undefined;
  if (!game || !version) return { title: "Not Found" };
  return {
    title: `${game.name} by ${version.model} — BrainRot Games`,
    description: `Play ${game.name} implemented by ${version.model}`,
  };
}

export default async function PlayPage({ params }: PlayPageProps) {
  const { game: gameId, model: modelId } = await params;
  const game = getGame(gameId);
  const version = game ? getGameVersion(gameId, modelId) : undefined;

  if (!game || !version) notFound();

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
        <div className="flex items-center gap-4">
          <Link
            href={`/games/${game.id}`}
            className="flex items-center gap-2 text-sm text-muted transition-colors hover:text-foreground"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back
          </Link>
          <div className="h-4 w-px bg-border" />
          <span className="text-lg" role="img" aria-label={game.name}>
            {game.icon}
          </span>
          <span className="font-display text-sm font-semibold tracking-wide text-foreground">
            {game.name}
          </span>
          <span className="rounded-full border border-border bg-card px-3 py-0.5 font-mono text-xs text-muted">
            {version.model}
          </span>
        </div>
        <div className="flex items-center gap-6 font-mono text-xs text-muted">
          <span>
            <span className="text-foreground/60">{version.date}</span>
          </span>
          <span>
            <span className="text-neon-cyan">
              {version.tokens.toLocaleString()}
            </span>{" "}
            tokens
          </span>
          <span>
            <span className="text-neon-pink">
              {version.linesOfCode.toLocaleString()}
            </span>{" "}
            lines
          </span>
        </div>
      </div>

      {/* Game iframe */}
      <div className="relative flex-1 bg-black">
        <iframe
          src={version.path}
          sandbox="allow-scripts"
          title={`${game.name} by ${version.model}`}
          className="h-full w-full border-0"
        />
      </div>
    </div>
  );
}

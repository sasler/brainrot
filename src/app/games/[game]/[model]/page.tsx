import { notFound } from "next/navigation";
import Link from "next/link";
import { getGame, getGames, getGameVersion } from "@/lib/games";
import RatingsProvider from "@/components/RatingsProvider";
import RatingInput from "@/components/RatingInput";
import VersionFailureNotice from "@/components/VersionFailureNotice";
import { getModelInfo } from "@/lib/modelCatalog";
import { formatAssetSummary } from "@/lib/assetDisplay";
import type { Metadata } from "next";

interface PlayPageProps {
  params: Promise<{ game: string; model: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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

export default async function PlayPage({ params, searchParams }: PlayPageProps) {
  const { game: gameId, model: modelId } = await params;
  const query = await searchParams;
  const game = getGame(gameId);
  const version = game ? getGameVersion(gameId, modelId) : undefined;

  if (!game || !version) notFound();
  const model = getModelInfo(version.modelId, version.model);
  const assetSummary = formatAssetSummary(version.assets);
  const iframeSrc = query.test === "1" ? `${version.path}?test=1` : version.path;

  return (
    <RatingsProvider gameId={gameId} modelId={modelId}>
      <div className="fixed inset-0 top-16 flex flex-col bg-background">
      {/* Compact top bar */}
      <div
        className="flex shrink-0 items-center justify-between border-b border-border bg-surface/80 px-4 py-2"
        data-model-id={modelId}
        data-model-color={model.color}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/games/${game.id}`}
            className="flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-foreground"
          >
            <svg
              className="h-3.5 w-3.5"
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
          <div className="h-3 w-px bg-border" />
          <span className="text-sm" role="img" aria-label={game.name}>
            {game.icon}
          </span>
          <span className="hidden font-display text-xs font-semibold tracking-wide text-foreground sm:inline">
            {game.name}
          </span>
          <span
            className="truncate rounded-full border bg-card px-2 py-0.5 font-mono text-[10px]"
            style={{ borderColor: `${model.color}55`, color: model.color }}
          >
            {model.displayName}
          </span>
          <VersionFailureNotice gameId={gameId} modelId={modelId} />
        </div>
        <div className="hidden items-center gap-4 font-mono text-[10px] text-muted sm:flex">
          <span className="text-foreground/60">{version.date}</span>
          <span>
            <span className="text-neon-amber">
              {version.linesOfCode.toLocaleString()}
            </span>{" "}
            lines
          </span>
          {assetSummary && (
            <span data-asset-summary={assetSummary}>
              <span className="text-neon-cyan">{assetSummary}</span>
            </span>
          )}
        </div>
      </div>

      {/* Game iframe — takes all remaining space */}
      <div className="relative min-h-0 flex-1 bg-black">
        <iframe
          src={iframeSrc}
          sandbox="allow-scripts allow-pointer-lock"
          title={`${game.name} by ${model.displayName}`}
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>

      {/* Rating bar */}
        <div className="flex shrink-0 items-center justify-center border-t border-border bg-surface/80 px-4 py-2">
          <RatingInput
            gameId={gameId}
            modelId={modelId}
            accentColor={model.color}
          />
        </div>
      </div>
    </RatingsProvider>
  );
}

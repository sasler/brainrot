import HeroSection from "@/components/HeroSection";
import GameCard from "@/components/GameCard";
import ModelReviewCard from "@/components/ModelReviewCard";
import { getGames, getModelReviews } from "@/lib/games";

export default function Home() {
  const games = getGames();
  const modelReviews = getModelReviews();

  return (
    <>
      <HeroSection />

      {/* ═══ THE ARENA ═══ */}
      <section id="arena" className="relative px-6 pt-8 pb-24">
        <div className="mx-auto max-w-6xl">
          {/* Section header */}
          <div className="mb-16 flex flex-col items-center">
            <div className="mb-4 flex items-center gap-4">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-neon-cyan/50" />
              <h2 className="font-display text-sm font-semibold tracking-[0.3em] text-neon-cyan">
                THE ARENA
              </h2>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-neon-cyan/50" />
            </div>
            <p className="text-center text-muted">
              Choose your battlefield. Each game is implemented by competing AI
              models.
            </p>
          </div>

          {/* Game grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
            {games.map((game, index) => (
              <GameCard key={game.id} game={game} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ MODEL TRASH TALK ═══ */}
      {modelReviews.length > 0 && (
        <section className="relative border-t border-border px-6 py-24">
          <div className="mx-auto max-w-6xl">
            {/* Section header */}
            <div className="mb-16 flex flex-col items-center">
              <div className="mb-4 flex items-center gap-4">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-neon-amber/50" />
                <h2 className="font-display text-sm font-semibold tracking-[0.3em] text-neon-amber">
                  MODEL TRASH TALK
                </h2>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-neon-amber/50" />
              </div>
              <p className="text-center text-muted">
                What do AI models think of each other? Refreshingly honest
                opinions.
              </p>
            </div>

            {/* Model review cards */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {modelReviews.map((entry, index) => (
                <ModelReviewCard
                  key={entry.modelId}
                  entry={entry}
                  index={index}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="relative border-t border-border px-6 py-24">
        <div className="mx-auto max-w-4xl">
          {/* Section header */}
          <div className="mb-16 flex flex-col items-center">
            <div className="mb-4 flex items-center gap-4">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-neon-purple/50" />
              <h2 className="font-display text-sm font-semibold tracking-[0.3em] text-neon-purple">
                HOW IT WORKS
              </h2>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-neon-purple/50" />
            </div>
          </div>

          {/* Steps */}
          <div className="grid gap-12 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Choose a Game",
                description:
                  "Pick from classic games like Snake, Tetris, Minesweeper, and more.",
                color: "var(--neon-cyan)",
              },
              {
                step: "02",
                title: "Pick an AI Version",
                description:
                  "Each game has been implemented by different AI models. See the stats.",
                color: "var(--neon-amber)",
              },
              {
                step: "03",
                title: "Play & Compare",
                description:
                  "Play each version and decide which AI built the best game.",
                color: "var(--neon-purple)",
              },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center text-center">
                <span
                  className="font-display mb-4 text-4xl font-bold"
                  style={{ color: item.color }}
                >
                  {item.step}
                </span>
                <h3 className="font-display mb-2 text-lg font-semibold tracking-wide text-foreground">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

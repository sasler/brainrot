import type { Metadata } from "next";
import ModelTile from "@/components/ModelTile";
import { getModelFamilies, getModelContributions } from "@/lib/games";

export const metadata: Metadata = {
  title: "AI Model Roster — BrainRot Games",
  description: "Explore every AI model competing in BrainRot Games and see what each one built.",
};

export default function ModelsPage() {
  const families = getModelFamilies();
  const models = getModelContributions();
  const implementationCount = models.reduce((total, model) => total + model.games.length, 0);

  return (
    <div className="models-atmosphere relative isolate overflow-hidden px-6 py-16 sm:py-24">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-70" />
      <div className="pointer-events-none absolute top-0 left-1/2 -z-10 h-96 w-[50rem] -translate-x-1/2 rounded-full bg-neon-cyan/5 blur-3xl" />
      <div className="mx-auto max-w-6xl">
        <header className="mb-20 max-w-4xl">
          <div className="mb-6 flex items-center gap-3 font-mono text-[10px] font-semibold tracking-[0.28em] text-neon-cyan uppercase">
            <span className="h-px w-10 bg-neon-cyan/60" />Intelligence roster / live archive
          </div>
          <h1 className="font-display text-5xl leading-[0.92] font-black tracking-[-0.05em] text-foreground sm:text-7xl lg:text-8xl">
            Meet the minds<span className="block text-foreground/25">behind the games.</span>
          </h1>
          <div className="mt-9 flex flex-col gap-8 border-l border-neon-cyan/30 pl-5 sm:flex-row sm:items-end sm:justify-between">
            <p className="max-w-xl text-base leading-relaxed text-muted sm:text-lg">Browse the arena by model family, inspect each contender&apos;s body of work, then jump straight into what it shipped.</p>
            <div className="flex shrink-0 gap-8 font-mono">
              <div><strong className="block text-2xl text-foreground">{models.length}</strong><span className="text-[9px] tracking-widest text-muted uppercase">models</span></div>
              <div><strong className="block text-2xl text-foreground">{implementationCount}</strong><span className="text-[9px] tracking-widest text-muted uppercase">builds</span></div>
            </div>
          </div>
        </header>

        <div className="space-y-20">
          {families.map((family, familyIndex) => (
            <section key={family.name} aria-labelledby={`family-${familyIndex}`}>
              <div className="mb-7 flex items-end justify-between gap-4 border-b border-border pb-4">
                <div>
                  <div className="mb-2 font-mono text-[9px] tracking-[0.22em] text-muted uppercase">Family {String(familyIndex + 1).padStart(2, "0")}</div>
                  <h2 id={`family-${familyIndex}`} className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{family.name}</h2>
                </div>
                <span className="font-mono text-[10px] tracking-wider text-muted">{family.models.length} {family.models.length === 1 ? "MODEL" : "MODELS"} · {family.gameCount} BUILDS</span>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {family.models.map((model, index) => <ModelTile key={model.modelId} model={model} index={index} />)}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

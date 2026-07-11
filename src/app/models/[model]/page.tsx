import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ModelGameCard from "@/components/ModelGameCard";
import { getModelContribution, getModelContributions } from "@/lib/games";

interface ModelPageProps { params: Promise<{ model: string }>; }

export function generateStaticParams() {
  return getModelContributions().map((model) => ({ model: model.modelId }));
}

export async function generateMetadata({ params }: ModelPageProps): Promise<Metadata> {
  const { model: modelId } = await params;
  const model = getModelContribution(modelId);
  if (!model) return { title: "Model Not Found" };
  return {
    title: `${model.displayName} Games — BrainRot Games`,
    description: `Play all ${model.games.length} games implemented by ${model.displayName}.`,
  };
}

export default async function ModelPage({ params }: ModelPageProps) {
  const { model: modelId } = await params;
  const model = getModelContribution(modelId);
  if (!model) notFound();

  return (
    <div className="relative isolate overflow-hidden px-6 py-12 sm:py-16" style={{ "--model-color": model.color } as React.CSSProperties}>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-60" />
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[34rem] w-[55rem] -translate-x-1/2 rounded-full bg-[var(--model-color)] opacity-[0.07] blur-3xl" />
      <div className="mx-auto max-w-6xl">
        <nav className="mb-12 flex items-center gap-2 font-mono text-[10px] tracking-widest text-muted uppercase">
          <Link href="/models" className="transition-colors hover:text-foreground">Model roster</Link><span>/</span><span style={{ color: model.color }}>{model.modelId}</span>
        </nav>
        <header className="relative mb-16 overflow-hidden rounded-3xl border border-border bg-card/60 p-7 backdrop-blur-sm sm:p-12">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--model-color)] to-transparent" />
          <div className="absolute top-8 right-8 hidden font-display text-[9rem] leading-none font-black text-[var(--model-color)] opacity-[0.035] lg:block" aria-hidden="true">AI</div>
          <div className="relative max-w-4xl">
            <div className="mb-5 flex items-center gap-3 font-mono text-[10px] font-semibold tracking-[0.24em] uppercase" style={{ color: model.color }}>
              <span className="h-2 w-2 rounded-full bg-[var(--model-color)] shadow-[0_0_14px_var(--model-color)]" />{model.company} / {model.family} / active contender
            </div>
            <h1 className="font-display text-4xl leading-tight font-black tracking-[-0.04em] text-foreground sm:text-6xl lg:text-7xl">{model.displayName}</h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">One model, every artifact. This is the complete BrainRot Games record for <span className="text-foreground/80">{model.displayName}</span>.</p>
            <div className="mt-9 grid max-w-lg grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
              <div className="bg-surface/90 p-4"><strong className="font-display block text-2xl text-foreground">{model.games.length}</strong><span className="font-mono text-[9px] tracking-widest text-muted uppercase">games</span></div>
              <div className="bg-surface/90 p-4"><strong className="font-display block text-2xl text-foreground">{model.totalLinesOfCode.toLocaleString()}</strong><span className="font-mono text-[9px] tracking-widest text-muted uppercase">lines shipped</span></div>
              <div className="col-span-2 bg-surface/90 p-4 sm:col-span-1"><strong className="font-display block truncate text-lg text-foreground">{model.company}</strong><span className="font-mono text-[9px] tracking-widest text-muted uppercase">company</span></div>
            </div>
          </div>
        </header>
        <section aria-labelledby="model-games-heading">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div><div className="mb-2 font-mono text-[9px] tracking-[0.22em] text-muted uppercase">Artifact archive</div><h2 id="model-games-heading" className="font-display text-2xl font-bold text-foreground sm:text-3xl">Everything it built</h2></div>
            <span className="hidden font-mono text-[10px] tracking-wider text-muted sm:block">SELECT A GAME TO LAUNCH</span>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {model.games.map((contribution, index) => <ModelGameCard key={contribution.game.id} contribution={contribution} modelColor={model.color} index={index} />)}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <div className="flex items-center gap-2 text-sm text-muted">
          <span className="font-display font-semibold tracking-wider text-foreground/70">
            BRAINROT
          </span>
          <span className="font-display font-semibold tracking-wider text-neon-amber/70">
            GAMES
          </span>
          <span className="mx-2 text-border">|</span>
          <span>Built for testing AI models</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-muted">
          <a
            href="https://github.com/sasler/BrainRot"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            GitHub
          </a>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
}

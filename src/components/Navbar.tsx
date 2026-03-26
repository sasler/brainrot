"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const isPlayPage = /^\/games\/[^/]+\/[^/]+$/.test(pathname);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Brand */}
        <Link href="/" className="group flex items-center gap-1">
          <span className="font-display text-xl font-bold tracking-wider text-foreground transition-colors group-hover:text-neon-cyan">
            BRAINROT
          </span>
          <span className="font-display text-xl font-bold tracking-wider text-neon-amber">
            GAMES
          </span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-8">
          <Link
            href="/#arena"
            className="text-sm font-medium tracking-wide text-muted transition-colors hover:text-foreground"
          >
            Arena
          </Link>
          {isPlayPage && (
            <Link
              href={pathname.replace(/\/[^/]+$/, "")}
              className="text-sm font-medium tracking-wide text-muted transition-colors hover:text-foreground"
            >
              ← Back to Game
            </Link>
          )}
          <a
            href="https://github.com/sasler/BrainRot"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-medium tracking-wide text-muted transition-colors hover:text-foreground"
          >
            <svg
              viewBox="0 0 16 16"
              className="h-4 w-4 fill-current"
              aria-hidden="true"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            GitHub
          </a>
        </div>
      </div>
      {/* Gradient border bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/30 to-transparent" />
    </nav>
  );
}

import gamesData from "../../games-metadata.json";

export type FeatureId =
  | "sound"
  | "music"
  | "3d"
  | "particles"
  | "powerups";

export interface AiReview {
  from: string;
  comments: string[];
}

export interface ModelReview {
  from: string;
  comments: string[];
}

export interface ModelReviewEntry {
  model: string;
  modelId: string;
  reviews: ModelReview[];
}

export interface GameVersion {
  model: string;
  modelId: string;
  date: string;
  linesOfCode: number;
  path: string;
  features?: FeatureId[];
  aiReviews?: AiReview[];
}

export interface Game {
  id: string;
  name: string;
  description: string;
  icon: string;
  accentColor: string;
  versions: GameVersion[];
}

export interface GamesData {
  games: Game[];
  modelReviews?: ModelReviewEntry[];
}

// Normalize legacy `comment` (string) fields to `comments` (string[]) arrays
type LegacyReview = {
  from: string;
  comments?: string[];
  comment?: string;
};

function normalizeReview(review: LegacyReview): AiReview {
  return {
    from: review.from,
    comments:
      review.comments ?? (review.comment !== undefined ? [review.comment] : []),
  };
}

type RawGamesData = {
  games: Array<Omit<Game, "versions"> & {
    versions: Array<Omit<GameVersion, "aiReviews"> & {
      aiReviews?: LegacyReview[];
    }>;
  }>;
  modelReviews?: Array<Omit<ModelReviewEntry, "reviews"> & {
    reviews: LegacyReview[];
  }>;
};

function normalizeGamesData(data: RawGamesData): GamesData {
  return {
    games: data.games.map((game) => ({
      ...game,
      versions: game.versions.map((version) => ({
        ...version,
        aiReviews: version.aiReviews?.map(normalizeReview),
      })),
    })),
    modelReviews: data.modelReviews?.map((entry) => ({
      ...entry,
      reviews: entry.reviews.map(normalizeReview),
    })),
  };
}

const typedData = normalizeGamesData(gamesData as unknown as RawGamesData);

export function getGames(): Game[] {
  return typedData.games;
}

export function getGame(id: string): Game | undefined {
  return getGames().find((g) => g.id === id);
}

export function getGameVersion(
  gameId: string,
  modelId: string,
): GameVersion | undefined {
  const game = getGame(gameId);
  return game?.versions.find((v) => v.modelId === modelId);
}

export function getTotalVersions(): number {
  return getGames().reduce((sum, game) => sum + game.versions.length, 0);
}

export function getUniqueModels(): string[] {
  const models = new Set<string>();
  getGames().forEach((game) =>
    game.versions.forEach((v) => models.add(v.model)),
  );
  return Array.from(models);
}

export function getModelReviews(): ModelReviewEntry[] {
  return typedData.modelReviews ?? [];
}

export interface TrashTalkQuote {
  text: string;
  from: string;
  about: string;
}

export function getAllTrashTalk(): TrashTalkQuote[] {
  const quotes: TrashTalkQuote[] = [];

  for (const game of getGames()) {
    for (const version of game.versions) {
      if (!version.aiReviews) continue;
      for (const review of version.aiReviews) {
        for (const comment of review.comments) {
          quotes.push({
            text: comment,
            from: review.from,
            about: `${version.model}'s ${game.name}`,
          });
        }
      }
    }
  }

  for (const entry of getModelReviews()) {
    for (const review of entry.reviews) {
      for (const comment of review.comments) {
        quotes.push({
          text: comment,
          from: review.from,
          about: entry.model,
        });
      }
    }
  }

  // Return a random sample to keep the serialized page payload small.
  // Shuffle using Fisher-Yates and take the first 100.
  for (let i = quotes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [quotes[i], quotes[j]] = [quotes[j], quotes[i]];
  }
  return quotes.slice(0, 100);
}

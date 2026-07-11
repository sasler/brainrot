import gamesData from "../../games-metadata.json";
import {
  compareModels,
  getModelDisplayName,
  getModelInfo,
  resolveModelName,
} from "./modelCatalog";

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
    from: resolveModelName(review.from),
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
      versions: game.versions
        .map((version) => ({
          ...version,
          model: getModelDisplayName(version.modelId, version.model),
          aiReviews: version.aiReviews?.map(normalizeReview),
        }))
        .sort(compareModels),
    })),
    modelReviews: data.modelReviews
      ?.map((entry) => ({
        ...entry,
        model: getModelDisplayName(entry.modelId, entry.model),
        reviews: entry.reviews.map(normalizeReview),
      }))
      .sort(compareModels),
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

export interface ModelGameContribution {
  game: Game;
  version: GameVersion;
}

export interface ModelContribution {
  modelId: string;
  displayName: string;
  family: string;
  color: string;
  games: ModelGameContribution[];
  totalLinesOfCode: number;
}

export interface ModelFamily {
  name: string;
  models: ModelContribution[];
  gameCount: number;
}

const familyCollator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

export function getModelContributions(): ModelContribution[] {
  const contributions = new Map<string, ModelGameContribution[]>();

  for (const game of getGames()) {
    for (const version of game.versions) {
      const existing = contributions.get(version.modelId) ?? [];
      existing.push({ game, version });
      contributions.set(version.modelId, existing);
    }
  }

  return Array.from(contributions, ([modelId, games]) => {
    const model = getModelInfo(modelId, games[0]?.version.model);
    return {
      modelId,
      displayName: model.displayName,
      family: model.family,
      color: model.color,
      games,
      totalLinesOfCode: games.reduce(
        (total, contribution) => total + contribution.version.linesOfCode,
        0,
      ),
    };
  }).sort((a, b) => compareModels(a, b));
}

export function getModelContribution(modelId: string): ModelContribution | undefined {
  return getModelContributions().find((model) => model.modelId === modelId);
}

export function getModelFamilies(): ModelFamily[] {
  const families = new Map<string, ModelContribution[]>();

  for (const model of getModelContributions()) {
    const existing = families.get(model.family) ?? [];
    existing.push(model);
    families.set(model.family, existing);
  }

  return Array.from(families, ([name, models]) => ({
    name,
    models,
    gameCount: models.reduce((total, model) => total + model.games.length, 0),
  })).sort((a, b) => {
    if (a.name === "Other") return 1;
    if (b.name === "Other") return -1;
    return familyCollator.compare(a.name, b.name);
  });
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
            from: resolveModelName(review.from),
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
          from: resolveModelName(review.from),
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

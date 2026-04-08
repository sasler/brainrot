import gamesData from "../../games-metadata.json";

export type FeatureId =
  | "sound"
  | "music"
  | "3d"
  | "particles"
  | "powerups";

export interface AiReview {
  from: string;
  comment: string;
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
}

export function getGames(): Game[] {
  return (gamesData as GamesData).games;
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

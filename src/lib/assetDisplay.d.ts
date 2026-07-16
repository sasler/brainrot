export interface AssetDisplayData {
  files: number;
  bytes: number;
  kinds: Array<"model" | "image">;
}

export function formatAssetBytes(bytes: number): string;
export function formatAssetSummary(
  assets: AssetDisplayData | undefined,
): string | null;

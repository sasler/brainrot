export interface ModelInfo {
  displayName: string;
  family: string;
  color: string;
}

export const MODEL_CATALOG = {
  "gpt-5-4": { displayName: "OpenAI GPT 5.4", family: "OpenAI GPT", color: "#10A37F" },
  "gpt-5-4-mini": { displayName: "OpenAI GPT 5.4 Mini", family: "OpenAI GPT", color: "#74AA9C" },
  "gpt-5-5": { displayName: "OpenAI GPT 5.5", family: "OpenAI GPT", color: "#22C7A9" },
  "gpt-5-6-sol": { displayName: "OpenAI GPT 5.6 Sol", family: "OpenAI GPT", color: "#37F6E7" },
  "gpt-5-6-terra": { displayName: "OpenAI GPT 5.6 Terra", family: "OpenAI GPT", color: "#2DD4BF" },
  "fable-5": { displayName: "Claude Fable 5", family: "Claude", color: "#C96656" },
  "sonnet-4-6": { displayName: "Claude Sonnet 4.6", family: "Claude", color: "#D97757" },
  "opus-4-6": { displayName: "Claude Opus 4.6", family: "Claude", color: "#E58A65" },
  "opus-4-8": { displayName: "Claude Opus 4.8", family: "Claude", color: "#F2A07B" },
  "gemini-3-1-pro": { displayName: "Google Gemini 3.1 Pro", family: "Google Gemini", color: "#4285F4" },
  "gemma-4-12b": { displayName: "Google Gemma 4 12B", family: "Google Gemma", color: "#34A853" },
  "qwen-3-6-27b": { displayName: "Qwen3.6-27B", family: "Qwen", color: "#B86CFF" },
  "qwen3.6-35b-a3b": { displayName: "Qwen3.6-35B-A3B", family: "Qwen", color: "#D946EF" },
  "mai-code-1-flash": { displayName: "Microsoft MAI-Code-1-Flash", family: "Microsoft MAI", color: "#00A4EF" },
  "minimax-m2-7": { displayName: "MiniMax M2.7", family: "MiniMax", color: "#FF4D6D" },
  hy3: { displayName: "Tencent Hy3", family: "Tencent Hy", color: "#00B8A9" },
} as const satisfies Record<string, ModelInfo>;

export type KnownModelId = keyof typeof MODEL_CATALOG;

const FALLBACK_COLOR = "#8B8BA7";
const warnedModelIds = new Set<string>();
const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const MODEL_NAME_ALIASES = new Map<string, string>();

for (const [modelId, model] of Object.entries(MODEL_CATALOG)) {
  MODEL_NAME_ALIASES.set(modelId.toLowerCase(), model.displayName);
  MODEL_NAME_ALIASES.set(model.displayName.toLowerCase(), model.displayName);
}

for (const [alias, modelId] of Object.entries({
  "gpt 5.4": "gpt-5-4",
  "gpt 5.4 mini": "gpt-5-4-mini",
  "gpt 5.5": "gpt-5-5",
  "gpt 5.6 sol": "gpt-5-6-sol",
  "gpt 5.6 terra": "gpt-5-6-terra",
  "gemini 3.1 pro": "gemini-3-1-pro",
  "gemma 4 12b": "gemma-4-12b",
  hy3: "hy3",
  "mai-code-1-flash": "mai-code-1-flash",
  "minimax-m2-7": "minimax-m2-7",
  "minimax m2.7": "minimax-m2-7",
  "qwen3.6-27b": "qwen-3-6-27b",
  "qwen3.6 35b a3b": "qwen3.6-35b-a3b",
})) {
  MODEL_NAME_ALIASES.set(alias, MODEL_CATALOG[modelId as KnownModelId].displayName);
}

function fallbackDisplayName(modelId: string): string {
  return modelId
    .split("-")
    .map((part) => (part.length <= 3 ? part.toUpperCase() : `${part[0].toUpperCase()}${part.slice(1)}`))
    .join(" ");
}

export function isKnownModelId(modelId: string): modelId is KnownModelId {
  return Object.prototype.hasOwnProperty.call(MODEL_CATALOG, modelId);
}

export function getModelInfo(modelId: string, fallbackName?: string): ModelInfo {
  if (isKnownModelId(modelId)) return MODEL_CATALOG[modelId];

  if (process.env.NODE_ENV !== "production" && !warnedModelIds.has(modelId)) {
    warnedModelIds.add(modelId);
    console.warn(`[modelCatalog] Missing model identity for "${modelId}".`);
  }

  return {
    displayName: fallbackName || fallbackDisplayName(modelId),
    family: "Other",
    color: FALLBACK_COLOR,
  };
}

export function getModelDisplayName(modelId: string, fallbackName?: string): string {
  return getModelInfo(modelId, fallbackName).displayName;
}

export function getModelColor(modelId: string): string {
  return getModelInfo(modelId).color;
}

export function resolveModelName(name: string): string {
  return MODEL_NAME_ALIASES.get(name.trim().toLowerCase()) ?? name;
}

export function compareModelIds(a: string, b: string): number {
  return collator.compare(getModelDisplayName(a), getModelDisplayName(b)) || a.localeCompare(b);
}

export function compareModels(a: { modelId: string }, b: { modelId: string }): number {
  return compareModelIds(a.modelId, b.modelId);
}

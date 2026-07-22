export const FAILURE_CATEGORIES = [
  "wont-load",
  "wont-start",
  "controls-broken",
  "crash-freeze",
  "game-breaking-bug",
  "other",
] as const;

export type FailureCategory = (typeof FAILURE_CATEGORIES)[number];

export const FAILURE_CATEGORY_LABELS: Record<FailureCategory, string> = {
  "wont-load": "Won't load",
  "wont-start": "Won't start",
  "controls-broken": "Controls broken",
  "crash-freeze": "Crash or freeze",
  "game-breaking-bug": "Game-breaking bug",
  other: "Other",
};

export type StarValue = 1 | 2 | 3 | 4 | 5;

export type UserVerdict =
  | { type: "rating"; stars: StarValue }
  | { type: "fail"; category?: FailureCategory };

export interface VersionFeedback {
  average: number | null;
  starCount: number;
  failCount: number;
  totalVerdicts: number;
  failRatio: number;
  failed: boolean;
  failureCategories: Partial<Record<FailureCategory, number>>;
}

export interface FeedbackAggregate {
  totalStars?: number;
  voteCount?: number;
  failCount?: number;
  [key: string]: unknown;
}

export function isFailureCategory(value: unknown): value is FailureCategory {
  return (
    typeof value === "string" &&
    (FAILURE_CATEGORIES as readonly string[]).includes(value)
  );
}

export function normalizeVerdict(value: unknown): UserVerdict | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5) {
    return { type: "rating", stars: value as StarValue };
  }

  if (typeof value !== "string") return null;
  const numeric = Number(value);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 5) {
    return { type: "rating", stars: numeric as StarValue };
  }
  if (value === "fail") return { type: "fail" };
  if (value.startsWith("fail:")) {
    const category = value.slice(5);
    if (isFailureCategory(category)) {
      return { type: "fail", category };
    }
  }
  return null;
}

export function encodeVerdict(verdict: UserVerdict): string {
  return verdict.type === "rating"
    ? String(verdict.stars)
    : verdict.category
      ? `fail:${verdict.category}`
      : "fail";
}

export function parseSubmittedVerdict(
  body: Record<string, unknown>,
): UserVerdict | null {
  const verdict = body.verdict;
  if (verdict && typeof verdict === "object") {
    const candidate = verdict as Record<string, unknown>;
    if (
      candidate.type === "rating" &&
      Number.isInteger(candidate.stars) &&
      Number(candidate.stars) >= 1 &&
      Number(candidate.stars) <= 5
    ) {
      return {
        type: "rating",
        stars: Number(candidate.stars) as StarValue,
      };
    }
    if (candidate.type === "fail") {
      if (candidate.category === undefined) return { type: "fail" };
      if (isFailureCategory(candidate.category)) {
        return { type: "fail", category: candidate.category };
      }
    }
    return null;
  }

  if (
    Number.isInteger(body.stars) &&
    Number(body.stars) >= 1 &&
    Number(body.stars) <= 5
  ) {
    return { type: "rating", stars: Number(body.stars) as StarValue };
  }
  return null;
}

function asNonNegativeInteger(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0;
}

export function buildVersionFeedback(
  aggregate: FeedbackAggregate | null | undefined,
): VersionFeedback | null {
  if (!aggregate) return null;

  const starCount = asNonNegativeInteger(aggregate.voteCount);
  const failCount = asNonNegativeInteger(aggregate.failCount);
  const totalStars = Number(aggregate.totalStars ?? 0);
  const totalVerdicts = starCount + failCount;
  if (totalVerdicts === 0) return null;

  const failureCategories: Partial<Record<FailureCategory, number>> = {};
  for (const category of FAILURE_CATEGORIES) {
    const count = asNonNegativeInteger(aggregate[`failCategory:${category}`]);
    if (count > 0) failureCategories[category] = count;
  }

  return {
    average:
      starCount > 0 && Number.isFinite(totalStars)
        ? Math.round((totalStars / starCount) * 10) / 10
        : null,
    starCount,
    failCount,
    totalVerdicts,
    failRatio: failCount / totalVerdicts,
    failed: failCount * 2 >= totalVerdicts,
    failureCategories,
  };
}

export function ratingFromFeedback(feedback: VersionFeedback | null) {
  return feedback?.average !== null && feedback?.average !== undefined
    ? { average: feedback.average, count: feedback.starCount }
    : null;
}

export function leadingFailureCategories(feedback: VersionFeedback, limit = 2) {
  return FAILURE_CATEGORIES.map((category) => ({
    category,
    count: feedback.failureCategories[category] ?? 0,
  }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function transitionVersionFeedback(
  current: VersionFeedback | null,
  previousVerdict: UserVerdict | undefined,
  nextVerdict: UserVerdict,
) {
  const categories: Partial<Record<FailureCategory, number>> = {
    ...(current?.failureCategories ?? {}),
  };
  let starCount = current?.starCount ?? 0;
  let failCount = current?.failCount ?? 0;
  let totalStars = (current?.average ?? 0) * starCount;

  if (previousVerdict?.type === "rating") {
    starCount = Math.max(0, starCount - 1);
    totalStars = Math.max(0, totalStars - previousVerdict.stars);
  } else if (previousVerdict?.type === "fail") {
    failCount = Math.max(0, failCount - 1);
    if (previousVerdict.category) {
      categories[previousVerdict.category] = Math.max(
        0,
        (categories[previousVerdict.category] ?? 0) - 1,
      );
    }
  }

  if (nextVerdict.type === "rating") {
    starCount += 1;
    totalStars += nextVerdict.stars;
  } else {
    failCount += 1;
    if (nextVerdict.category) {
      categories[nextVerdict.category] =
        (categories[nextVerdict.category] ?? 0) + 1;
    }
  }

  const aggregate: Record<string, number> = {
    totalStars: Math.round(totalStars * 10) / 10,
    voteCount: starCount,
    failCount,
  };
  for (const [category, count] of Object.entries(categories)) {
    aggregate[`failCategory:${category}`] = count ?? 0;
  }
  return buildVersionFeedback(aggregate);
}

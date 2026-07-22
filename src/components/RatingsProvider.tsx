"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { RatingsStorageState } from "@/lib/ratings-types";
import {
  ratingFromFeedback,
  transitionVersionFeedback,
  type StarValue,
  type UserVerdict,
  type VersionFeedback,
} from "@/lib/ratings-feedback";

export interface RatingData {
  average: number;
  count: number;
}

const unavailableStorage: RatingsStorageState = {
  available: false,
  writable: false,
  reason: "Ratings API is unavailable right now.",
  missingEnvVars: [],
};

interface RatingsContextValue {
  feedback: Record<string, VersionFeedback>;
  userVerdicts: Record<string, UserVerdict>;
  storage: RatingsStorageState | null;
  loading: boolean;
  submitError: string | null;
  submitVerdict: (
    gameId: string,
    modelId: string,
    verdict: UserVerdict,
  ) => Promise<void>;
}

const RatingsContext = createContext<RatingsContextValue>({
  feedback: {},
  userVerdicts: {},
  storage: null,
  loading: true,
  submitError: null,
  submitVerdict: async () => {},
});

export function useRatings() {
  return useContext(RatingsContext);
}

export function useVersionFeedback(gameId: string, modelId: string) {
  const context = useRatings();
  const key = `${gameId}:${modelId}`;
  const versionFeedback = context.feedback[key] ?? null;
  return {
    feedback: versionFeedback,
    rating: ratingFromFeedback(versionFeedback),
    userVerdict: context.userVerdicts[key] ?? null,
    storage: context.storage,
    loading: context.loading,
    submitError: context.submitError,
    submit: (verdict: UserVerdict) =>
      context.submitVerdict(gameId, modelId, verdict),
  };
}

export function useVersionRating(gameId: string, modelId: string) {
  const result = useVersionFeedback(gameId, modelId);
  return {
    ...result,
    userVote:
      result.userVerdict?.type === "rating"
        ? result.userVerdict.stars
        : null,
    submit: (stars: number) =>
      result.submit({ type: "rating", stars: stars as StarValue }),
  };
}

export function useBestRating(gameId: string, modelIds: string[]) {
  const { feedback } = useRatings();
  let best: (RatingData & { modelId: string }) | null = null;
  for (const modelId of modelIds) {
    const entry = feedback[`${gameId}:${modelId}`];
    if (!entry || entry.failed || entry.average === null) continue;
    if (!best || entry.average > best.average) {
      best = {
        average: entry.average,
        count: entry.starCount,
        modelId,
      };
    }
  }
  return best;
}

export function useGameFeedbackSummary(gameId: string, modelIds: string[]) {
  const { feedback, loading, storage } = useRatings();
  const failedCount = modelIds.filter(
    (modelId) => feedback[`${gameId}:${modelId}`]?.failed,
  ).length;
  return {
    activeCount: modelIds.length - failedCount,
    failedCount,
    loading,
    storage,
  };
}

interface RatingsProviderProps {
  children: ReactNode;
  gameId?: string;
  modelId?: string;
}

function legacyFeedback(
  ratings: Record<string, RatingData> | undefined,
): Record<string, VersionFeedback> {
  if (!ratings) return {};
  return Object.fromEntries(
    Object.entries(ratings).map(([key, rating]) => [
      key,
      {
        average: rating.average,
        starCount: rating.count,
        failCount: 0,
        totalVerdicts: rating.count,
        failRatio: 0,
        failed: false,
        failureCategories: {},
      },
    ]),
  );
}

function legacyVerdicts(votes: Record<string, number> | undefined) {
  if (!votes) return {};
  return Object.fromEntries(
    Object.entries(votes).map(([key, stars]) => [
      key,
      { type: "rating", stars: stars as StarValue } satisfies UserVerdict,
    ]),
  );
}

export default function RatingsProvider({
  children,
  gameId,
  modelId,
}: RatingsProviderProps) {
  const scopeKey = `${gameId ?? "__all__"}:${modelId ?? "__all__"}`;
  const [feedback, setFeedback] = useState<Record<string, VersionFeedback>>({});
  const [userVerdicts, setUserVerdicts] = useState<
    Record<string, UserVerdict>
  >({});
  const [storage, setStorage] = useState<RatingsStorageState | null>(null);
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const loading = loadedScope !== scopeKey;

  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;
    const params = new URLSearchParams();
    if (gameId) params.set("gameId", gameId);
    if (modelId) params.set("modelId", modelId);
    const qs = params.size > 0 ? `?${params.toString()}` : "";

    void Promise.all([
      fetch(`/api/ratings${qs}`, { signal: controller.signal })
        .then((response) => response.json())
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            return null;
          }
          return { feedback: {}, storage: unavailableStorage };
        }),
      fetch(`/api/ratings/user${qs}`, { signal: controller.signal })
        .then((response) => response.json())
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            return null;
          }
          return { verdicts: {}, storage: unavailableStorage };
        }),
    ]).then(([feedbackResponse, verdictResponse]) => {
      if (ignore || !feedbackResponse || !verdictResponse) return;
      setFeedback(
        feedbackResponse.feedback ?? legacyFeedback(feedbackResponse.ratings),
      );
      setUserVerdicts(
        verdictResponse.verdicts ?? legacyVerdicts(verdictResponse.votes),
      );
      setStorage(
        feedbackResponse.storage ?? verdictResponse.storage ?? unavailableStorage,
      );
      setSubmitError(null);
      setLoadedScope(scopeKey);
    });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [gameId, modelId, scopeKey]);

  const submitVerdict = useCallback(
    async (gId: string, versionModelId: string, verdict: UserVerdict) => {
      const key = `${gId}:${versionModelId}`;
      setSubmitError(null);
      if (storage && !storage.writable) {
        setSubmitError(storage.reason ?? "Ratings are unavailable right now.");
        return;
      }

      const previousVerdict = userVerdicts[key];
      const previousFeedback = feedback[key];
      setUserVerdicts((current) => ({ ...current, [key]: verdict }));
      setFeedback((current) => {
        const next = transitionVersionFeedback(
          current[key] ?? null,
          previousVerdict,
          verdict,
        );
        return next ? { ...current, [key]: next } : current;
      });

      try {
        const response = await fetch("/api/ratings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: gId,
            modelId: versionModelId,
            verdict,
          }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.feedback) {
          throw new Error(data?.error ?? "Failed to submit verdict.");
        }
        setFeedback((current) => ({ ...current, [key]: data.feedback }));
        setUserVerdicts((current) => ({
          ...current,
          [key]: data.userVerdict ?? verdict,
        }));
        setStorage(data.storage ?? storage);
      } catch (error) {
        setSubmitError(
          error instanceof Error ? error.message : "Failed to submit verdict.",
        );
        setUserVerdicts((current) => {
          const next = { ...current };
          if (previousVerdict) next[key] = previousVerdict;
          else delete next[key];
          return next;
        });
        setFeedback((current) => {
          const next = { ...current };
          if (previousFeedback) next[key] = previousFeedback;
          else delete next[key];
          return next;
        });
      }
    },
    [feedback, storage, userVerdicts],
  );

  const value = useMemo(
    () => ({
      feedback,
      userVerdicts,
      storage,
      loading,
      submitError,
      submitVerdict,
    }),
    [feedback, loading, storage, submitError, submitVerdict, userVerdicts],
  );

  return <RatingsContext value={value}>{children}</RatingsContext>;
}

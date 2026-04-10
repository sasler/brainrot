"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { RatingsStorageState } from "@/lib/ratings-types";

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
  ratings: Record<string, RatingData>;
  userVotes: Record<string, number>;
  storage: RatingsStorageState | null;
  loading: boolean;
  submitError: string | null;
  submitRating: (
    gameId: string,
    modelId: string,
    stars: number,
  ) => Promise<void>;
}

const RatingsContext = createContext<RatingsContextValue>({
  ratings: {},
  userVotes: {},
  storage: null,
  loading: true,
  submitError: null,
  submitRating: async () => {},
});

export function useRatings() {
  return useContext(RatingsContext);
}

export function useVersionRating(gameId: string, modelId: string) {
  const { ratings, userVotes, storage, loading, submitError, submitRating } =
    useRatings();
  const key = `${gameId}:${modelId}`;
  return {
    rating: ratings[key] ?? null,
    userVote: userVotes[key] ?? null,
    storage,
    loading,
    submitError,
    submit: (stars: number) => submitRating(gameId, modelId, stars),
  };
}

export function useBestRating(gameId: string, modelIds: string[]) {
  const { ratings } = useRatings();
  let best: (RatingData & { modelId: string }) | null = null;
  for (const modelId of modelIds) {
    const r = ratings[`${gameId}:${modelId}`];
    if (r && (!best || r.average > best.average)) {
      best = { ...r, modelId };
    }
  }
  return best;
}

interface RatingsProviderProps {
  children: ReactNode;
  gameId?: string;
}

export default function RatingsProvider({
  children,
  gameId,
}: RatingsProviderProps) {
  const scopeKey = gameId ?? "__all__";
  const [ratings, setRatings] = useState<Record<string, RatingData>>({});
  const [userVotes, setUserVotes] = useState<Record<string, number>>({});
  const [storage, setStorage] = useState<RatingsStorageState | null>(null);
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const loading = loadedScope !== scopeKey;

  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;
    const qs = gameId ? `?gameId=${encodeURIComponent(gameId)}` : "";

    void Promise.all([
      fetch(`/api/ratings${qs}`, { signal: controller.signal })
        .then((r) => r.json())
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            return null;
          }

          return {
            ratings: {},
            storage: unavailableStorage,
          } as {
            ratings: Record<string, RatingData>;
            storage: RatingsStorageState;
          };
        }),
      fetch(`/api/ratings/user${qs}`, { signal: controller.signal })
        .then((r) => r.json())
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            return null;
          }

          return {
            votes: {},
            storage: unavailableStorage,
          } as {
            votes: Record<string, number>;
            storage: RatingsStorageState;
          };
        }),
    ]).then(([ratingsRes, votesRes]) => {
      if (ignore || !ratingsRes || !votesRes) {
        return;
      }

      setRatings(ratingsRes.ratings ?? {});
      setUserVotes(votesRes.votes ?? {});
      setStorage(ratingsRes.storage ?? votesRes.storage ?? null);
      setSubmitError(null);
      setLoadedScope(scopeKey);
    });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [gameId, scopeKey]);

  const submitRating = useCallback(
    async (gId: string, modelId: string, stars: number) => {
      const key = `${gId}:${modelId}`;
      setSubmitError(null);

      if (storage && !storage.writable) {
        setSubmitError(storage.reason ?? "Ratings are unavailable right now.");
        return;
      }

      // Snapshot previous state for rollback
      const prevVote = userVotes[key];
      const prevRating = ratings[key];

      // Optimistic update
      setUserVotes((prev) => ({ ...prev, [key]: stars }));
      setRatings((prev) => {
        const existing = prev[key];
        if (existing) {
          const oldTotal = existing.average * existing.count;
          const delta = stars - (prevVote ?? 0);
          const newCount = prevVote !== undefined ? existing.count : existing.count + 1;
          return {
            ...prev,
            [key]: {
              average: Math.round(((oldTotal + delta) / newCount) * 10) / 10,
              count: newCount,
            },
          };
        }
        return {
          ...prev,
          [key]: { average: stars, count: 1 },
        };
      });

      try {
        const res = await fetch("/api/ratings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId: gId, modelId, stars }),
        });
        if (res.ok) {
          const data = await res.json();
          setRatings((prev) => ({
            ...prev,
            [key]: data.rating,
          }));
          setStorage(data.storage ?? storage);
        } else {
          const data = (await res.json().catch(() => null)) as
            | { error?: string; storage?: RatingsStorageState }
            | null;
          setStorage(data?.storage ?? storage);
          setSubmitError(data?.error ?? "Failed to submit rating.");
          // Revert optimistic update on server error
          setUserVotes((prev) => {
            const next = { ...prev };
            if (prevVote !== undefined) next[key] = prevVote;
            else delete next[key];
            return next;
          });
          if (prevRating) {
            setRatings((prev) => ({ ...prev, [key]: prevRating }));
          } else {
            setRatings((prev) => {
              const next = { ...prev };
              delete next[key];
              return next;
            });
          }
        }
      } catch {
        setSubmitError("Failed to submit rating.");
        // Revert on network failure
        setUserVotes((prev) => {
          const next = { ...prev };
          if (prevVote !== undefined) next[key] = prevVote;
          else delete next[key];
          return next;
        });
        if (prevRating) {
          setRatings((prev) => ({ ...prev, [key]: prevRating }));
        } else {
          setRatings((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        }
      }
    },
    [ratings, storage, userVotes],
  );

  return (
    <RatingsContext
      value={{
        ratings,
        userVotes,
        storage,
        loading,
        submitError,
        submitRating,
      }}
    >
      {children}
    </RatingsContext>
  );
}

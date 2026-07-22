import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getGame, getGames } from "@/lib/games";
import {
  getRatingsRedisClient,
  getRatingsStorageState,
  withRatingsStorageFailure,
} from "@/lib/ratings";
import type { RatingsStorageState } from "@/lib/ratings-types";
import {
  buildVersionFeedback,
  encodeVerdict,
  parseSubmittedVerdict,
  ratingFromFeedback,
  type FeedbackAggregate,
  type VersionFeedback,
} from "@/lib/ratings-feedback";

async function getOrCreateVoterId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get("brainrot_voter");
  if (existing) return existing.value;

  const id = crypto.randomUUID();
  cookieStore.set("brainrot_voter", id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return id;
}

export async function GET(request: NextRequest) {
  const storage: RatingsStorageState = getRatingsStorageState();
  const redis = await getRatingsRedisClient("read");
  if (!redis) {
    return NextResponse.json({
      feedback: {},
      ratings: {},
      storage: withRatingsStorageFailure(
        storage,
        "Ratings storage is temporarily unavailable.",
      ),
    });
  }

  try {
    const { searchParams } = request.nextUrl;
    const gameId = searchParams.get("gameId");
    const modelId = searchParams.get("modelId");

    const games = gameId
      ? [getGame(gameId)].filter(Boolean)
      : getGames();

    const keys: string[] = [];
    const keyMap: string[] = [];

    for (const game of games) {
      if (!game) continue;
      for (const version of game.versions) {
        if (modelId && version.modelId !== modelId) continue;
        const k = `rating:${game.id}:${version.modelId}`;
        keys.push(k);
        keyMap.push(`${game.id}:${version.modelId}`);
      }
    }

    if (keys.length === 0) {
      return NextResponse.json({ feedback: {}, ratings: {}, storage });
    }

    const results = await redis.hgetallMany<FeedbackAggregate>(keys);

    const ratings: Record<string, { average: number; count: number }> = {};
    const feedback: Record<string, VersionFeedback> = {};
    for (let i = 0; i < keys.length; i++) {
      const versionFeedback = buildVersionFeedback(results[i]);
      if (!versionFeedback) continue;
      feedback[keyMap[i]] = versionFeedback;
      const rating = ratingFromFeedback(versionFeedback);
      if (rating) ratings[keyMap[i]] = rating;
    }

    return NextResponse.json({ feedback, ratings, storage });
  } catch {
    return NextResponse.json(
      {
        feedback: {},
        ratings: {},
        storage: withRatingsStorageFailure(
          storage,
          "Failed to load ratings from storage.",
        ),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const storage: RatingsStorageState = getRatingsStorageState();
  const redis = await getRatingsRedisClient("write");
  if (!redis) {
    return NextResponse.json(
      {
        error:
          storage.reason ?? "Ratings storage is temporarily unavailable.",
        storage: withRatingsStorageFailure(
          storage,
          "Ratings storage is temporarily unavailable.",
        ),
      },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { gameId, modelId } = body;

    if (typeof gameId !== "string" || typeof modelId !== "string") {
      return NextResponse.json(
        { error: "Missing fields", storage },
        { status: 400 },
      );
    }
    const verdict = parseSubmittedVerdict(body);
    if (!verdict) {
      return NextResponse.json(
        { error: "Invalid rating or failure verdict", storage },
        { status: 400 },
      );
    }

    const game = getGame(gameId);
    if (!game || !game.versions.find((v) => v.modelId === modelId)) {
      return NextResponse.json(
        { error: "Invalid game or model", storage },
        { status: 400 },
      );
    }

    const voterId = await getOrCreateVoterId();
    const voteKey = `vote:${voterId}:${gameId}:${modelId}`;
    const ratingKey = `rating:${gameId}:${modelId}`;

    const data = await redis.applyVerdict(
      voteKey,
      ratingKey,
      encodeVerdict(verdict),
    );
    const feedback = buildVersionFeedback(data);
    if (!feedback) throw new Error("Verdict update returned no aggregate");

    return NextResponse.json({
      feedback,
      rating: ratingFromFeedback(feedback),
      userVerdict: verdict,
      userVote: verdict.type === "rating" ? verdict.stars : null,
      storage,
    });
  } catch {
    return NextResponse.json(
      {
        error: "Failed to submit verdict",
        storage: withRatingsStorageFailure(storage, "Failed to submit verdict."),
      },
      { status: 500 },
    );
  }
}

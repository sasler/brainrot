import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getGame, getGames } from "@/lib/games";
import {
  getRatingsRedisClient,
  getRatingsStorageState,
  withRatingsStorageFailure,
} from "@/lib/ratings";
import type { RatingsStorageState } from "@/lib/ratings-types";

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

    const games = gameId
      ? [getGame(gameId)].filter(Boolean)
      : getGames();

    const keys: string[] = [];
    const keyMap: string[] = [];

    for (const game of games) {
      if (!game) continue;
      for (const version of game.versions) {
        const k = `rating:${game.id}:${version.modelId}`;
        keys.push(k);
        keyMap.push(`${game.id}:${version.modelId}`);
      }
    }

    if (keys.length === 0) return NextResponse.json({ ratings: {}, storage });

    const results = await redis.hgetallMany<{
      totalStars?: number;
      voteCount?: number;
    }>(keys);

    const ratings: Record<string, { average: number; count: number }> = {};
    for (let i = 0; i < keys.length; i++) {
      const data = results[i];
      if (data && data.voteCount && data.voteCount > 0) {
        ratings[keyMap[i]] = {
          average:
            Math.round((data.totalStars! / data.voteCount) * 10) / 10,
          count: data.voteCount,
        };
      }
    }

    return NextResponse.json({ ratings, storage });
  } catch {
    return NextResponse.json(
      {
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
    const body = await request.json();
    const { gameId, modelId, stars } = body;

    if (!gameId || !modelId || stars === undefined) {
      return NextResponse.json(
        { error: "Missing fields", storage },
        { status: 400 },
      );
    }
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      return NextResponse.json(
        { error: "Stars must be integer 1-5", storage },
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

    const existingStars = await redis.get(voteKey);

    if (existingStars !== null) {
      const delta = stars - existingStars;
      if (delta !== 0) {
        await redis.hincrby(ratingKey, "totalStars", delta);
      }
      await redis.set(voteKey, stars);
    } else {
      await redis.hincrby(ratingKey, "totalStars", stars);
      await redis.hincrby(ratingKey, "voteCount", 1);
      await redis.set(voteKey, stars);
    }

    const data = await redis.hgetall<{
      totalStars: number;
      voteCount: number;
    }>(ratingKey);
    const average =
      data && data.voteCount > 0
        ? Math.round((data.totalStars / data.voteCount) * 10) / 10
        : 0;

    return NextResponse.json({
      rating: { average, count: data?.voteCount ?? 0 },
      userVote: stars,
      storage,
    });
  } catch {
    return NextResponse.json(
      {
        error: "Failed to submit rating",
        storage: withRatingsStorageFailure(storage, "Failed to submit rating."),
      },
      { status: 500 },
    );
  }
}

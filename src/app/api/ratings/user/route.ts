import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getGame, getGames } from "@/lib/games";
import {
  getRatingsRedisClient,
  getRatingsStorageState,
  withRatingsStorageFailure,
} from "@/lib/ratings";
import type { RatingsStorageState } from "@/lib/ratings-types";

export async function GET(request: NextRequest) {
  const storage: RatingsStorageState = getRatingsStorageState();
  const redis = await getRatingsRedisClient("read");
  if (!redis) {
    return NextResponse.json({
      votes: {},
      storage: withRatingsStorageFailure(
        storage,
        "Ratings storage is temporarily unavailable.",
      ),
    });
  }

  try {
    const cookieStore = await cookies();
    const voterCookie = cookieStore.get("brainrot_voter");
    if (!voterCookie) return NextResponse.json({ votes: {}, storage });

    const voterId = voterCookie.value;
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
        const k = `vote:${voterId}:${game.id}:${version.modelId}`;
        keys.push(k);
        keyMap.push(`${game.id}:${version.modelId}`);
      }
    }

    if (keys.length === 0) return NextResponse.json({ votes: {}, storage });

    const results = await redis.getMany(keys);

    const votes: Record<string, number> = {};
    for (let i = 0; i < keys.length; i++) {
      const stars = results[i];
      if (stars !== null) {
        votes[keyMap[i]] = stars;
      }
    }

    return NextResponse.json({ votes, storage });
  } catch {
    return NextResponse.json(
      {
        votes: {},
        storage: withRatingsStorageFailure(
          storage,
          "Failed to load user votes from storage.",
        ),
      },
      { status: 500 },
    );
  }
}

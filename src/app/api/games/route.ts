import { NextResponse } from "next/server";
import { getGames } from "@/lib/games";

export async function GET() {
  const games = getGames();
  return NextResponse.json({ games });
}

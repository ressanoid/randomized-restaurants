import { NextResponse } from "next/server";
import { getQlooClient } from "@/lib/qloo/config";
import { toMovieOption } from "@/lib/qloo/query";

/** GET /api/movies?query=inception — movie search for the preference picker. */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("query")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ movies: [] });

  try {
    const entities = await getQlooClient().searchMovies(query);
    return NextResponse.json({ movies: entities.map(toMovieOption) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Movie search failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

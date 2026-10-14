import { NextResponse } from "next/server";
import { getQlooClient } from "@/lib/qloo/config";
import { isFoodPlace, rankRestaurants, toRestaurant } from "@/lib/qloo/query";
import type { RestaurantQuery } from "@/lib/qloo/types";

interface RestaurantRequest {
  location?: string;
  movieIds?: string[];
  tagIds?: string[];
}

const MAX_MOVIES = 10;
const POOL_SIZE = 20;

const parseRequest = (body: RestaurantRequest): RestaurantQuery => ({
  location: (body.location ?? "").trim(),
  movieIds: (body.movieIds ?? []).filter(Boolean).slice(0, MAX_MOVIES),
  tagIds: (body.tagIds ?? []).filter(Boolean),
  take: POOL_SIZE,
});

/**
 * POST /api/restaurants
 * Body: { location, movieIds[], tagIds[] }
 * Returns a pool of restaurants whose taste profile matches the user's movies.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as RestaurantRequest;
  const query = parseRequest(body);

  if (!query.location && query.movieIds.length === 0) {
    return NextResponse.json(
      { error: "Provide a location or pick at least one movie." },
      { status: 400 },
    );
  }

  try {
    const entities = await getQlooClient().restaurantInsights(query);
    const restaurants = rankRestaurants(entities.filter(isFoodPlace).map(toRestaurant));
    return NextResponse.json({ restaurants });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Restaurant search failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

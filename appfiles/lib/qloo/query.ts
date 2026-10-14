import type { MovieOption, QlooEntity, QlooLabel, Restaurant, RestaurantQuery } from "./types";

const MOVIE_TYPE = "urn:entity:movie";
const PLACE_TYPE = "urn:entity:place";
const PLACE_GENRE_TYPE = "urn:tag:genre:place";
const RESTAURANT_TAG = "urn:tag:genre:place:restaurant";

/** Genre keywords that mark a place as food-serving. */
const FOOD_GENRE =
  /restaurant|cafe|coffee|bakery|bistro|brasserie|deli|diner|eatery|grill|kitchen|pizzer|pizza|ramen|sushi|soba|udon|noodle|tea house|dessert|ice cream|creamery|food|pub|steakhouse|taqueria|trattoria|izakaya|buffet|juice|bar\b/i;

const PRICE_SYMBOLS: Record<number, string> = { 1: "$", 2: "$$", 3: "$$$", 4: "$$$$" };

/** Normalise a Qloo field that may be a string or a tag-like object. */
export const toLabel = (value: QlooLabel | number | null | undefined): string | undefined => {
  if (value == null) return undefined;
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number") return PRICE_SYMBOLS[value];
  return value.name?.trim() || undefined;
};

const placeGenres = (entity: QlooEntity): string[] =>
  (entity.tags ?? []).filter((tag) => tag.type === PLACE_GENRE_TYPE).map((tag) => tag.name);

/**
 * Keep only places that actually serve food. `primary_genre` is the venue's main
 * type ("Cafe", "Hotel", "Museum"), so it drives the decision; genre tags are a
 * fallback when it is absent.
 */
export const isFoodPlace = (entity: QlooEntity): boolean => {
  const primary = toLabel(entity.properties?.primary_genre);
  if (primary) return FOOD_GENRE.test(primary);
  return placeGenres(entity).some((name) => FOOD_GENRE.test(name));
};

/** Build query params for `GET /search` targeting movies. */
export const buildSearchParams = (query: string, take = 8): URLSearchParams =>
  new URLSearchParams({ query, types: MOVIE_TYPE, take: String(take) });

/**
 * Build query params for `GET /v2/insights`:
 * restaurant recommendations anchored on the user's movie taste, optionally
 * narrowed to a location.
 *
 * Uses `filter.location.query` (not `signal.location.query`) — the latter times
 * out on the hackathon server when combined with tag filters.
 */
export const buildInsightsParams = (query: RestaurantQuery): URLSearchParams => {
  const params = new URLSearchParams({
    "filter.type": PLACE_TYPE,
    "filter.tags": RESTAURANT_TAG,
    "operator.filter.tags": "intersection",
    take: String(query.take ?? 20),
  });

  const location = query.location.trim();
  if (location) params.set("filter.location.query", location);
  query.movieIds.forEach((id) => params.append("signal.interests.entities", id));
  query.tagIds?.forEach((tag) => params.append("filter.tags", tag));

  return params;
};

/** Map a Qloo place entity to the app's Restaurant view model. */
export const toRestaurant = (entity: QlooEntity): Restaurant => {
  const properties = entity.properties ?? {};
  const locality = properties.locality ?? {};

  return {
    id: entity.entity_id,
    name: entity.name,
    imageUrl: properties.image?.url ?? properties.images?.[0]?.url,
    description:
      properties.description ??
      properties.short_description ??
      toLabel(properties.cuisine_description),
    address: properties.address,
    neighborhood: locality.neighborhood?.name ?? properties.neighborhood,
    city: locality.city?.name,
    cuisine: toLabel(properties.primary_genre),
    priceLevel: toLabel(properties.price_level),
    rating: properties.business_rating,
    latitude: entity.location?.lat,
    longitude: entity.location?.lon,
  };
};

/** Map a Qloo movie entity to the app's MovieOption view model. */
export const toMovieOption = (entity: QlooEntity): MovieOption => ({
  id: entity.entity_id,
  name: entity.name,
  year: entity.properties?.release_year,
  imageUrl: entity.properties?.image?.url ?? entity.properties?.images?.[0]?.url,
});

/** Deterministically pick one item; `rng` is injectable for tests. */
export const pick = <T>(items: readonly T[], rng: () => number = Math.random): T | undefined => {
  if (items.length === 0) return undefined;
  const index = Math.floor(rng() * items.length);
  return items[index];
};

/** Prefer results with imagery and stronger ratings for a nicer reveal. */
export const rankRestaurants = (restaurants: readonly Restaurant[]): Restaurant[] =>
  [...restaurants].sort(
    (a, b) =>
      Number(Boolean(b.imageUrl)) - Number(Boolean(a.imageUrl)) ||
      (b.rating ?? 0) - (a.rating ?? 0),
  );

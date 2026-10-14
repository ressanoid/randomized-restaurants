import type { QlooEntity, RestaurantQuery } from "./types";
import { buildInsightsParams, buildSearchParams } from "./query";

interface SearchResponse {
  results?: QlooEntity[];
}

interface InsightsResponse {
  results?: { entities?: QlooEntity[] };
}

export interface QlooClient {
  searchMovies(query: string): Promise<QlooEntity[]>;
  restaurantInsights(query: RestaurantQuery): Promise<QlooEntity[]>;
}

interface HttpError extends Error {
  status: number;
}

const toHttpError = (status: number, body: string): HttpError =>
  Object.assign(
    new Error(`Qloo request failed (${status})${body ? `: ${body.slice(0, 200)}` : ""}`),
    { status },
  );

const withParams = (baseUrl: string, path: string, params: URLSearchParams): string =>
  `${baseUrl.replace(/\/+$/, "")}${path}?${params.toString()}`;

/** The hackathon server can hang on pathological param combos — fail fast instead. */
const REQUEST_TIMEOUT_MS = 20_000;

/** Create a Qloo client bound to a base URL and API key (explicit dependencies). */
export const createQlooClient = (baseUrl: string, apiKey: string): QlooClient => {
  const get = async <T>(url: string): Promise<T> => {
    const response = await fetch(url, {
      headers: { "X-Api-Key": apiKey },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }).catch((error: unknown) => {
      const detail = error instanceof Error ? error.message : "unknown error";
      throw toHttpError(504, `Qloo did not respond in time (${detail})`);
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw toHttpError(response.status, body);
    }

    return (await response.json()) as T;
  };

  return {
    searchMovies: async (query: string) => {
      const data = await get<SearchResponse>(withParams(baseUrl, "/search", buildSearchParams(query)));
      return data.results ?? [];
    },
    restaurantInsights: async (query: RestaurantQuery) => {
      const data = await get<InsightsResponse>(
        withParams(baseUrl, "/v2/insights", buildInsightsParams(query)),
      );
      return data.results?.entities ?? [];
    },
  };
};

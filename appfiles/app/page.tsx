"use client";

import { useState } from "react";
import { PreferencePicker } from "@/components/PreferencePicker";
import { RestaurantCard } from "@/components/RestaurantCard";
import { Spinner3D, SPINNER_MAX_ITEMS } from "@/components/Spinner3D";
import { useFavorites } from "@/lib/firebase/use-favorites";
import type { MovieOption, Restaurant } from "@/lib/qloo/types";

const POOL_LIMIT = SPINNER_MAX_ITEMS;
type Phase = "idle" | "loading" | "spinning" | "revealed";

const randomIndex = (length: number, current = -1): number => {
  if (length <= 1) return 0;
  const candidate = Math.floor(Math.random() * length);
  return candidate === current ? (candidate + 1) % length : candidate;
};

const postRestaurants = async (
  location: string,
  movieIds: string[],
): Promise<Restaurant[]> => {
  const response = await fetch("/api/restaurants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ location, movieIds }),
  });

  const data = (await response.json()) as { restaurants?: Restaurant[]; error?: string };
  if (!response.ok || !data.restaurants?.length) {
    throw new Error(data.error ?? "No restaurants matched your taste yet.");
  }

  return data.restaurants.slice(0, POOL_LIMIT);
};

export default function Home() {
  const [location, setLocation] = useState("");
  const [movies, setMovies] = useState<MovieOption[]>([]);
  const [pool, setPool] = useState<Restaurant[]>([]);
  const [targetIndex, setTargetIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  const favorites = useFavorites();
  const picked = phase === "revealed" ? pool[targetIndex] : undefined;

  const spin = async () => {
    setError(null);
    setPhase("loading");

    try {
      const restaurants = await postRestaurants(location, movies.map((movie) => movie.id));
      setPool(restaurants);
      setTargetIndex(randomIndex(restaurants.length));
      setPhase("spinning");
    } catch (spinError) {
      setError(spinError instanceof Error ? spinError.message : "Something went wrong.");
      setPhase("idle");
    }
  };

  const rollAgain = () => {
    if (pool.length === 0) return spin();
    setError(null);
    setTargetIndex((current) => randomIndex(pool.length, current));
    setPhase("spinning");
  };

  const showSpinner = pool.length > 0 && phase !== "revealed";
  const statusMessage =
    phase === "loading"
      ? "Reading your taste profile…"
      : phase === "spinning"
        ? "Spinning…"
        : "Spin to match a restaurant to your movie taste";

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
          🎬 Random Restaurant
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm opacity-70">
          Your favorite movies shape your taste graph. We spin the Qloo Taste API to land
          on a restaurant you&apos;ll actually like.
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-[360px_1fr]">
        <PreferencePicker
          location={location}
          onLocationChange={setLocation}
          movies={movies}
          onMoviesChange={setMovies}
          onSubmit={spin}
          busy={phase === "loading"}
        />

        <section className="flex flex-col gap-5">
          <div className="rounded-2xl border border-black/10 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5">
            <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide opacity-60">
              {statusMessage}
            </p>

            <div className="h-[210px] sm:h-[250px]">
              {showSpinner ? (
                <Spinner3D
                  items={pool}
                  targetIndex={targetIndex}
                  spinning={phase === "spinning"}
                  onSettled={() => setPhase("revealed")}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm opacity-60">
                  <span className="text-4xl">🎰</span>
                  <p className="max-w-xs">
                    Add a location, pick a few movies you love, then spin the wheel.
                  </p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
          )}

          {picked && (
            <RestaurantCard
              restaurant={picked}
              isFavorite={favorites.isFavorite(picked.id)}
              favoritesEnabled={favorites.enabled}
              onToggleFavorite={favorites.toggle}
              onRollAgain={rollAgain}
            />
          )}

          {favorites.enabled && favorites.favorites.length > 0 && (
            <div className="rounded-2xl border border-black/10 p-5 text-sm dark:border-white/10">
              <h2 className="mb-2 font-semibold">
                ★ Your saved restaurants ({favorites.favorites.length})
              </h2>
              <ul className="space-y-1 opacity-80">
                {favorites.favorites.map((favorite) => (
                  <li key={favorite.id}>
                    {favorite.name}
                    {favorite.neighborhood ? ` — ${favorite.neighborhood}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

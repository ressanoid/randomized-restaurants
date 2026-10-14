"use client";

import { useEffect, useState } from "react";
import type { MovieOption } from "@/lib/qloo/types";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;
const MAX_MOVIES = 10;

interface PreferencePickerProps {
  location: string;
  onLocationChange: (value: string) => void;
  movies: MovieOption[];
  onMoviesChange: (movies: MovieOption[]) => void;
  onSubmit: () => void;
  busy: boolean;
}

/** Collects a location plus the movies that shape the user's taste profile. */
export function PreferencePicker({
  location,
  onLocationChange,
  movies,
  onMoviesChange,
  onSubmit,
  busy,
}: PreferencePickerProps) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<MovieOption[]>([]);
  const [searching, setSearching] = useState(false);
  const selectedIds = new Set(movies.map((movie) => movie.id));

  // A query shorter than the minimum has no results by definition, so that case
  // is derived at render time rather than written into state from the effect.
  const query = term.trim();
  const visibleResults = query.length < MIN_QUERY_LENGTH ? [] : results;

  useEffect(() => {
    if (query.length < MIN_QUERY_LENGTH) return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      fetch(`/api/movies?query=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((response) => response.json())
        .then((data: { movies?: MovieOption[] }) => setResults(data.movies ?? []))
        .catch(() => undefined)
        .finally(() => setSearching(false));
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const addMovie = (movie: MovieOption) => {
    if (selectedIds.has(movie.id) || movies.length >= MAX_MOVIES) return;
    onMoviesChange([...movies, movie]);
    setTerm("");
    setResults([]);
  };

  const removeMovie = (id: string) =>
    onMoviesChange(movies.filter((movie) => movie.id !== id));

  const canSubmit = !busy && (location.trim().length > 0 || movies.length > 0);

  return (
    <section className="w-full rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
      <div className="space-y-4">
        <div>
          <label htmlFor="location" className="mb-1.5 block text-sm font-medium">
            Where are you eating?
          </label>
          <input
            id="location"
            value={location}
            onChange={(event) => onLocationChange(event.target.value)}
            placeholder="New York, London, Tokyo…"
            className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-500 dark:border-white/15 dark:bg-black/30"
          />
        </div>

        <div>
          <label htmlFor="movie-search" className="mb-1.5 block text-sm font-medium">
            Movies that match your taste
          </label>
          <input
            id="movie-search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search a movie you love…"
            className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-500 dark:border-white/15 dark:bg-black/30"
          />

          {searching && <p className="mt-1 text-xs opacity-60">Searching…</p>}

          {visibleResults.length > 0 && (
            <ul className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-black/10 dark:border-white/10">
              {visibleResults.map((movie) => (
                <li key={movie.id}>
                  <button
                    type="button"
                    onClick={() => addMovie(movie)}
                    disabled={selectedIds.has(movie.id)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-amber-500/10 disabled:opacity-40"
                  >
                    <span>{movie.name}</span>
                    <span className="text-xs opacity-60">{movie.year ?? ""}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {movies.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {movies.map((movie) => (
              <button
                key={movie.id}
                type="button"
                onClick={() => removeMovie(movie.id)}
                className="group inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-800 dark:text-amber-200"
                title="Remove"
              >
                {movie.name}
                <span className="opacity-60 group-hover:opacity-100">×</span>
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Finding your match…" : "🎲 Spin for a restaurant"}
        </button>
      </div>
    </section>
  );
}

"use client";

import { useState, useSyncExternalStore } from "react";
import { detectNavPlatform, navigationUrl, type NavPlatform } from "@/lib/maps/link";
import type { Restaurant } from "@/lib/qloo/types";

interface RestaurantCardProps {
  restaurant: Restaurant;
  isFavorite: boolean;
  favoritesEnabled: boolean;
  onToggleFavorite: (restaurant: Restaurant) => void;
  onRollAgain: () => void;
}

const formatCoordinate = (value: number): string => value.toFixed(5);

// The platform cannot change mid-session, so there is nothing to subscribe to.
// It is read through useSyncExternalStore purely so the server and client agree
// on first paint — the server has no user agent to inspect.
const subscribeToPlatform = () => () => {};
const readPlatform = (): NavPlatform => detectNavPlatform(navigator.userAgent);
const readServerPlatform = (): NavPlatform => "web";

/** Reveal card for the chosen restaurant — coordinates only, no maps. */
export function RestaurantCard({
  restaurant,
  isFavorite,
  favoritesEnabled,
  onToggleFavorite,
  onRollAgain,
}: RestaurantCardProps) {
  const [copied, setCopied] = useState(false);
  const platform = useSyncExternalStore(subscribeToPlatform, readPlatform, readServerPlatform);

  const hasCoordinates = restaurant.latitude != null && restaurant.longitude != null;
  const coordinates = hasCoordinates
    ? `${formatCoordinate(restaurant.latitude as number)}, ${formatCoordinate(restaurant.longitude as number)}`
    : null;

  const copyCoordinates = async () => {
    if (!coordinates) return;
    await navigator.clipboard.writeText(coordinates).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-black/10 bg-white/80 shadow-md backdrop-blur dark:border-white/10 dark:bg-white/5">
      {restaurant.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={restaurant.imageUrl}
          alt={restaurant.name}
          className="h-44 w-full object-cover"
          loading="lazy"
        />
      )}

      <div className="space-y-4 p-5">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold leading-tight">{restaurant.name}</h3>
            <p className="mt-0.5 text-sm opacity-70">
              {[restaurant.cuisine, restaurant.neighborhood, restaurant.city]
                .filter(Boolean)
                .join(" · ") || "Restaurant"}
            </p>
          </div>
          {favoritesEnabled && (
            <button
              type="button"
              onClick={() => onToggleFavorite(restaurant)}
              aria-label={isFavorite ? "Remove from favorites" : "Save to favorites"}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                isFavorite
                  ? "border-amber-400 bg-amber-500/20 text-amber-700 dark:text-amber-200"
                  : "border-black/10 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
              }`}
            >
              {isFavorite ? "★ Saved" : "☆ Save"}
            </button>
          )}
        </header>

        <div className="flex flex-wrap gap-2 text-xs">
          {restaurant.rating != null && (
            <span className="rounded-full bg-black/5 px-2.5 py-1 dark:bg-white/10">
              ★ {restaurant.rating.toFixed(1)}
            </span>
          )}
          {restaurant.priceLevel && (
            <span className="rounded-full bg-black/5 px-2.5 py-1 dark:bg-white/10">
              {restaurant.priceLevel}
            </span>
          )}
        </div>

        {restaurant.description && (
          <p className="line-clamp-3 text-sm opacity-80">{restaurant.description}</p>
        )}

        {restaurant.address && (
          <p className="text-sm opacity-70">📍 {restaurant.address}</p>
        )}

        <div className="rounded-xl border border-black/10 bg-black/[0.03] p-3 dark:border-white/10 dark:bg-white/5">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide opacity-60">
            Coordinates
          </div>
          {coordinates ? (
            <div className="flex items-center justify-between gap-3">
              {/* Hands off to the device's own navigation app where it has one. */}
              <a
                href={navigationUrl(
                  platform,
                  restaurant.latitude as number,
                  restaurant.longitude as number,
                )}
                target={platform === "web" ? "_blank" : undefined}
                rel={platform === "web" ? "noopener noreferrer" : undefined}
                title={`Navigate to ${coordinates}`}
                className="group inline-flex items-center gap-1.5 font-mono text-sm underline decoration-dotted underline-offset-4 hover:decoration-solid focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
              >
                {coordinates}
                <span aria-hidden="true" className="text-xs opacity-50 group-hover:opacity-100">
                  ↗
                </span>
              </a>
              <button
                type="button"
                onClick={copyCoordinates}
                className="rounded-lg border border-black/10 px-2 py-1 text-xs hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          ) : (
            <p className="text-sm opacity-60">No coordinates available for this place.</p>
          )}
        </div>

        <button
          type="button"
          onClick={onRollAgain}
          className="w-full rounded-xl border border-amber-500/60 px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-500/10 dark:text-amber-200"
        >
          🎲 Roll again
        </button>
      </div>
    </article>
  );
}

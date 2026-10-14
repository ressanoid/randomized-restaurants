"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import type { Restaurant } from "@/lib/qloo/types";
import { ensureAnonymousUser, isFirebaseConfigured } from "./client";
import { listFavorites, removeFavorite, saveFavorite, type FavoriteRestaurant } from "./favorites";

export interface FavoritesApi {
  user: User | null;
  favorites: FavoriteRestaurant[];
  ready: boolean;
  enabled: boolean;
  isFavorite: (restaurantId: string) => boolean;
  toggle: (restaurant: Restaurant) => Promise<void>;
}

/** Anonymous sign-in plus per-user Firestore favorites, with optimistic updates. */
export const useFavorites = (): FavoritesApi => {
  const enabled = useMemo(() => isFirebaseConfigured(), []);
  const [user, setUser] = useState<User | null>(null);
  const [favorites, setFavorites] = useState<FavoriteRestaurant[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setReady(true);
      return;
    }

    let active = true;
    ensureAnonymousUser()
      .then(async (signedIn) => {
        if (!active || !signedIn) return;
        setUser(signedIn);
        const saved = await listFavorites(signedIn.uid).catch(() => []);
        if (active) setFavorites(saved);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, [enabled]);

  const isFavorite = useCallback(
    (restaurantId: string) => favorites.some((entry) => entry.id === restaurantId),
    [favorites],
  );

  const toggle = useCallback(
    async (restaurant: Restaurant) => {
      if (!user) return;

      const alreadySaved = favorites.some((entry) => entry.id === restaurant.id);
      const next = alreadySaved
        ? favorites.filter((entry) => entry.id !== restaurant.id)
        : [...favorites, restaurant];

      setFavorites(next); // optimistic update
      await (alreadySaved
        ? removeFavorite(user.uid, restaurant.id)
        : saveFavorite(user.uid, restaurant)
      ).catch(() => setFavorites(favorites)); // roll back on failure
    },
    [favorites, user],
  );

  return { user, favorites, ready, enabled, isFavorite, toggle };
};

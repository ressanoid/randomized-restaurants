import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import type { Restaurant } from "@/lib/qloo/types";
import { getDb } from "./client";

export interface FavoriteRestaurant extends Restaurant {
  savedAt?: unknown;
}

const favoritesRef = (uid: string) => collection(getDb(), "users", uid, "favorites");

export const saveFavorite = async (uid: string, restaurant: Restaurant): Promise<void> => {
  await setDoc(doc(favoritesRef(uid), restaurant.id), {
    ...restaurant,
    savedAt: serverTimestamp(),
  });
};

export const removeFavorite = async (uid: string, restaurantId: string): Promise<void> => {
  await deleteDoc(doc(favoritesRef(uid), restaurantId));
};

export const listFavorites = async (uid: string): Promise<FavoriteRestaurant[]> => {
  const snapshot = await getDocs(favoritesRef(uid));
  return snapshot.docs.map((entry) => entry.data() as FavoriteRestaurant);
};

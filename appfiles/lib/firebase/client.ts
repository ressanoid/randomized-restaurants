import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, signInAnonymously, type Auth, type User } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

/** Public Firebase web config (identifies the project; safe to expose). */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** True only when every required Firebase env var is present. */
export const isFirebaseConfigured = (): boolean =>
  Object.values(firebaseConfig).every((value) => Boolean(value));

const resolveApp = (): FirebaseApp => getApps()[0] ?? initializeApp(firebaseConfig);

export const getDb = (): Firestore => getFirestore(resolveApp());

export const getAuthInstance = (): Auth => getAuth(resolveApp());

/**
 * Silently sign the visitor in anonymously. Returns null when Firebase
 * is not configured so the app stays usable without it.
 */
export const ensureAnonymousUser = async (): Promise<User | null> => {
  if (!isFirebaseConfigured()) return null;

  const auth = getAuthInstance();
  if (auth.currentUser) return auth.currentUser;

  const credential = await signInAnonymously(auth);
  return credential.user;
};

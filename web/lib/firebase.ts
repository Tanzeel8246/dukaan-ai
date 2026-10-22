/**
 * Dukaan AI — Firebase configuration + client.
 *
 * Reads the web config from environment variables. If any value is missing
 * (or still a PLACEHOLDER), the app runs in LOCAL DEMO MODE using the
 * bundled seed data — no Firebase project required. This is what makes the
 * subdomain demo work out of the box.
 *
 * When a real config IS present the app runs in PRODUCTION MODE:
 * Firebase Auth (email/password) is enforced and all shop data lives in
 * Firestore under `users/{uid}/…` (see firebase/firestore.rules and
 * PRODUCTION.md).
 *
 * PLACEHOLDER VALUES ONLY in this repo — never commit real credentials.
 */

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const PLACEHOLDER = /^(YOUR_|_+|)$/;

/** Returns the Firebase web config, or null when not configured (demo mode). */
export function getFirebaseConfig(): FirebaseWebConfig | null {
  // NOTE: every value MUST be read through a literal `process.env.NEXT_PUBLIC_*`
  // expression — Next.js/Turbopack only inlines literal accesses into the
  // client bundle. Reading through a dynamic helper (process.env[name])
  // leaves the browser with an empty config and silently forces demo mode.
  const config: FirebaseWebConfig = {
    apiKey: (process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "").trim(),
    authDomain: (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "").trim(),
    projectId: (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "").trim(),
    storageBucket: (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "").trim(),
    messagingSenderId: (
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? ""
    ).trim(),
    appId: (process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "").trim(),
  };
  const missing = Object.values(config).some((v) => !v || PLACEHOLDER.test(v));
  return missing ? null : config;
}

/** True when the app is running on bundled seed data (no Firebase). */
export function isDemoMode(): boolean {
  return getFirebaseConfig() === null;
}

/** True when a real Firebase project is connected (auth + cloud data). */
export function isProductionMode(): boolean {
  return getFirebaseConfig() !== null;
}

let app: FirebaseApp | null = null;

/** The Firebase app instance, or null in demo mode. Client-side only. */
export function getFirebaseApp(): FirebaseApp | null {
  const config = getFirebaseConfig();
  if (!config) return null;
  if (!app) {
    app = getApps()[0] ?? initializeApp(config);
  }
  return app;
}

/** Firebase Auth instance, or null in demo mode. */
export function getFirebaseAuth(): Auth | null {
  const a = getFirebaseApp();
  return a ? getAuth(a) : null;
}

let db: Firestore | null = null;

/**
 * Firestore instance, or null in demo mode.
 *
 * Offline persistence is enabled (IndexedDB, multi-tab safe) so the
 * sales counter keeps working without internet and syncs when the
 * connection returns. If the persistent cache can't start (private
 * browsing, an already-initialised instance, an old browser) we fall
 * back to the plain in-memory client — the app never blocks on it.
 */
export function getFirestoreDb(): Firestore | null {
  const a = getFirebaseApp();
  if (!a) return null;
  if (db) return db;
  try {
    db = initializeFirestore(a, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    try {
      db = getFirestore(a);
    } catch {
      db = null;
    }
  }
  return db;
}

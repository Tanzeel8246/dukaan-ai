/**
 * Dukaan AI — authentication context.
 *
 * Two modes:
 *  - DEMO MODE (no Firebase env config): no login wall — the app runs on
 *    bundled seed data exactly as the public demo always has. `user` stays
 *    null and the UI shows a "Demo mode" badge.
 *  - PRODUCTION MODE (real Firebase config): Firebase Auth
 *    (email/password) is live, `user` tracks the signed-in shopkeeper and
 *    <AuthGate> keeps signed-out visitors on /login and /signup.
 */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirestoreDb, isProductionMode } from "@/lib/firebase";
import { resolveStaffRole, type ShopRole } from "@/lib/permissions";

export type { ShopRole };

export type AuthMode = "demo" | "production";

interface AuthValue {
  mode: AuthMode;
  user: User | null;
  loading: boolean;
  /** The signed-in user's role in the resolved shop (Phase A · A3):
   *  "owner" runs their own shop; "manager" / "cashier" /
   *  "accountant" were invited into an owner's shop with that role.
   *  A staff record carrying no role resolves to "manager" — the
   *  legacy profile (design §3.1). Demo mode is always "owner". */
  role: ShopRole;
  /** The uid whose `users/{uid}/…` namespace the app reads/writes.
   *  Equals the user's own uid for owners; the OWNER's uid for staff.
   *  Null in demo mode. */
  dataUid: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const production = isProductionMode();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(production);
  const [role, setRole] = useState<ShopRole>("owner");
  const [dataUid, setDataUid] = useState<string | null>(null);

  useEffect(() => {
    if (!production) return;
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const unsub = onAuthStateChanged(auth, (u) => {
      if (cancelled) return;
      setUser(u);
      if (!u) {
        setRole("owner");
        setDataUid(null);
        setLoading(false);
        return;
      }
      // Resolve the shop namespace: if this email was invited as staff,
      // `staffIndex/{email}` points at the owner's uid and the app opens
      // the owner's shop, with the role stored on the index doc
      // (missing/unrecognised role ⇒ "manager", the legacy default).
      // Otherwise the user is an owner of their own shop.
      setLoading(true);
      void (async () => {
        let resolvedRole: ShopRole = "owner";
        let resolvedUid = u.uid;
        try {
          const db = getFirestoreDb();
          const email = (u.email ?? "").trim().toLowerCase();
          if (db && email) {
            const snap = await getDoc(doc(db, "staffIndex", email));
            if (snap.exists()) {
              const data = snap.data();
              const ownerUid = String(data.ownerUid ?? "");
              if (ownerUid && ownerUid !== u.uid) {
                resolvedRole = resolveStaffRole(data.role);
                resolvedUid = ownerUid;
              }
            }
          }
        } catch {
          /* fall back to owner-of-own-shop */
        }
        if (!cancelled) {
          setRole(resolvedRole);
          setDataUid(resolvedUid);
          setLoading(false);
        }
      })();
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [production]);

  const signIn = useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("auth/unavailable");
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("auth/unavailable");
    await createUserWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const signOut = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (auth) await fbSignOut(auth);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      mode: production ? "production" : "demo",
      user,
      loading,
      role,
      dataUid,
      signIn,
      signUp,
      signOut,
    }),
    [production, user, loading, role, dataUid, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/**
 * Dukaan AI — authentication context.
 *
 * Two modes:
 *  - DEMO MODE (no Firebase env config): no login wall — the app runs on
 *    bundled seed data exactly as the public demo always has. `user` stays
 *    null and the UI shows a "Demo mode" badge. NO platform machinery
 *    runs in demo (Phase G · G1, design §4.4): no claims, no registry,
 *    no switcher.
 *  - PRODUCTION MODE (real Firebase config): Firebase Auth
 *    (email/password) is live, `user` tracks the signed-in shopkeeper and
 *    <AuthGate> keeps signed-out visitors on /login and /signup.
 *
 * Phase G · G1 (design §1.3/§1.4/§7.2): a production sign-in resolves
 * the person's BUSINESSES, in this order —
 *   1. CLAIM: pending `businessInvites` for the verified email are
 *      claimed into uid-keyed memberships (lib/tenancy planClaim).
 *   2. BACKFILL: a legacy `staffIndex` relationship with no membership
 *      yet is mirrored into one by the staffer's own client
 *      (planLegacyBackfill) — the legacy leg keeps granting access
 *      either way; nobody's access depends on the backfill.
 *   3. INDEX: `userMemberships/{uid}` is healed against the live
 *      membership docs (entries whose membership is gone drop out)
 *      and the switcher list is built (own business first).
 * The active business is session state, persisted device-locally
 * AND server-side (userMemberships.activeBusinessId — the server
 * value wins on the next sign-in); switching re-points
 * `dataUid`/`role`, and <StoreProvider> tears down and re-attaches
 * every subscription on that change. A watcher on the active
 * membership doc re-resolves the session the moment a membership
 * disappears — a removed member loses the business on the next
 * read, mid-session included.
 *
 * Fix Round 2 · FR2: additionally-owned businesses (a generated
 * business whose registry names the caller as ownerUid) resolve
 * through the registry — they carry no membership doc by design —
 * and the header switcher gains the "New business" creation flow
 * (Free Trial, EMPTY content, creator as owner).
 */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  Timestamp,
  where,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { getFirebaseAuth, getFirestoreDb, isProductionMode } from "@/lib/firebase";
import { resolveStaffRole, type ShopRole } from "@/lib/permissions";
import {
  buildSwitcherList,
  healIndex,
  indexWith,
  newBusinessInputOk,
  newBusinessSkeleton,
  planClaim,
  planLegacyBackfill,
  planNewBusinessPhase1,
  planNewBusinessPhase2,
  type BusinessSummary,
  type IndexEntry,
  type InviteDoc,
  type MembershipDoc,
  type PlatformWrite,
} from "@/lib/tenancy";

export type { ShopRole };
export type { BusinessSummary };

export type AuthMode = "demo" | "production";

const ACTIVE_BUSINESS_KEY = "dukaan-ai-active-business";

interface AuthValue {
  mode: AuthMode;
  user: User | null;
  loading: boolean;
  /** The signed-in user's role in the ACTIVE business (Phase A · A3
   *  + G1): "owner" runs their own shop; "manager" / "cashier" /
   *  "accountant" belong to a business with that role. A record
   *  carrying no role resolves to "manager" — the legacy default.
   *  Demo mode is always "owner"; a session with no business at
   *  all resolves to "none" (see `noAccess`). */
  role: ShopRole;
  /** The uid whose `users/{uid}/…` namespace the app reads/writes —
   *  the ACTIVE business's id. Equals the user's own uid for
   *  their own (legacy, pre-G) business; a generated business
   *  carries its own id (Fix Round 2 · FR2). Null in demo mode
   *  and in the no-access state. */
  dataUid: string | null;
  /** G1: every business the person belongs to (own first) — the
   *  header switcher's list. Empty in demo mode. */
  businesses: BusinessSummary[];
  /** G1: the active business's id, or null in demo/no-access. */
  activeBusinessId: string | null;
  /** G1: tear down the current shop context and attach `bid`'s. */
  switchBusiness: (businessId: string) => void;
  /** Fix Round 2 · FR2: create a new business (name + phone +
   *  address) — a GENERATED id, the creator as owner, Free Trial
   *  plan, EMPTY content (never the founding comp plan, never
   *  demo data). Switches to it on success. When the skeleton
   *  write fails after the registry/index land, the business
   *  still lists (reason "setup-failed" + businessId) and the
   *  load path / switcher retry completes it. */
  createBusiness: (input: {
    name: string;
    phone: string;
    address: string;
  }) => Promise<{ ok: boolean; reason?: string; businessId?: string }>;
  /** G1: the session resolved to NO business (e.g. a staffer
   *  removed from their only shop mid-session). <AuthGate> shows
   *  the no-access state instead of a shop. */
  noAccess: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/** BizCreateFix: mirror of StoreProvider's registryWriteData — the
 *  FR2 business-birth path writes through applyPlatformWrites, which
 *  never converted plan.trialEndsAt (ISO string) to a Firestore
 *  Timestamp, so businessBirthOk's `trialEndsAt is timestamp` check
 *  denied every phase-1 registry create. Only businesses/ set ops
 *  are converted; everything else passes through untouched. */
function platformRegistryWriteData(
  path: string,
  data: Record<string, unknown>
): Record<string, unknown> {
  if (!path.startsWith("businesses/")) return data;
  const plan = data.plan as { trialEndsAt?: unknown } | undefined;
  if (plan && typeof plan.trialEndsAt === "string") {
    return {
      ...data,
      plan: {
        ...plan,
        trialEndsAt: Timestamp.fromDate(new Date(plan.trialEndsAt)),
      },
    };
  }
  return data;
}

/** Apply a lib/tenancy write plan as ONE Firestore batch. `index`
 *  writes are NOT batched here — they merge into the caller's own
 *  userMemberships entries, persisted separately by the resolver. */
async function applyPlatformWrites(
  db: Firestore,
  writes: PlatformWrite[]
): Promise<void> {
  const batch = writeBatch(db);
  let n = 0;
  for (const w of writes) {
    if (w.kind === "set") {
      batch.set(doc(db, w.path), platformRegistryWriteData(w.path, w.data));
      n++;
    } else if (w.kind === "update") {
      batch.update(doc(db, w.path), w.data);
      n++;
    } else if (w.kind === "add") {
      batch.set(doc(collection(db, w.collection)), w.data);
      n++;
    }
  }
  if (n > 0) await batch.commit();
}

interface Resolution {
  list: BusinessSummary[];
  entries: IndexEntry[];
  /** The business this sign-in resolved through a claim or the
   *  legacy leg — the pre-G landing shop, preferred over the
   *  person's own business when no choice is persisted. */
  preferredBid: string | null;
  /** Fix Round 2 · FR2: the server-persisted active business
   *  (userMemberships.activeBusinessId) — the first precedence
   *  in applyResolution, ahead of the device-local choice. */
  serverActive: string | null;
}

/**
 * Resolve a signed-in user's businesses (claims → backfill →
 * healed index → names). Read-mostly; the only writes are the
 * claim/backfill batches and the healed index persist — all
 * platform collections, never a byte inside any `users/{uid}`
 * tree except READS of owner docs the caller may already read.
 */
async function resolveSession(
  db: Firestore,
  u: User
): Promise<Resolution> {
  const uid = u.uid;
  const email = (u.email ?? "").trim().toLowerCase();
  const nowISO = new Date().toISOString();
  let entries: IndexEntry[] = [];
  let preferredBid: string | null = null;

  /* ---- 1. claim pending invites for this email ---- */
  if (email) {
    try {
      const invSnap = await getDocs(
        query(collectionGroup(db, "invites"), where("email", "==", email))
      );
      for (const d of invSnap.docs) {
        const bid = d.ref.parent.parent?.id;
        if (!bid || bid === uid) continue;
        const invite = d.data() as InviteDoc;
        if (invite.status !== "pending") continue;
        const mSnap = await getDoc(
          doc(db, "businessMembers", bid, "members", uid)
        ).catch(() => null);
        const res = planClaim({
          businessId: bid,
          callerUid: uid,
          callerEmail: email,
          invite,
          existingMembership: mSnap?.exists()
            ? (mSnap.data() as MembershipDoc)
            : null,
          nowISO,
        });
        if (res.ok) {
          await applyPlatformWrites(db, res.writes).catch(() => undefined);
          entries = indexWith(entries, { businessId: bid, role: res.role });
          preferredBid = preferredBid ?? bid;
        }
      }
    } catch {
      /* index not deployed yet / offline — claims retry next sign-in */
    }
  }

  /* ---- 2. legacy staffIndex: backfill the membership mirror ---- */
  let legacyBid: string | null = null;
  let legacyRole: ShopRole = "manager";
  if (email) {
    try {
      const idxSnap = await getDoc(doc(db, "staffIndex", email));
      if (idxSnap.exists()) {
        const data = idxSnap.data();
        const ownerUid = String(data.ownerUid ?? "");
        if (ownerUid && ownerUid !== uid) {
          legacyBid = ownerUid;
          legacyRole = resolveStaffRole(data.role);
          const mSnap = await getDoc(
            doc(db, "businessMembers", ownerUid, "members", uid)
          ).catch(() => null);
          const writes = planLegacyBackfill({
            businessId: ownerUid,
            callerUid: uid,
            callerEmail: email,
            staffIndex: data,
            existingMembership: mSnap?.exists()
              ? (mSnap.data() as MembershipDoc)
              : null,
            nowISO,
          });
          if (writes.length > 0) {
            await applyPlatformWrites(db, writes).catch(() => undefined);
            entries = indexWith(entries, {
              businessId: ownerUid,
              role: resolveStaffRole(data.role),
            });
          } else if (mSnap?.exists()) {
            entries = indexWith(entries, {
              businessId: ownerUid,
              role: resolveStaffRole(
                (mSnap.data() as MembershipDoc).role ?? data.role
              ),
            });
          } else {
            // Backfill was refused (e.g. rules) — the legacy leg
            // still grants access; list the business from the
            // index doc alone so the switcher stays truthful.
            entries = indexWith(entries, {
              businessId: ownerUid,
              role: resolveStaffRole(data.role),
            });
          }
          preferredBid = preferredBid ?? ownerUid;
        }
      }
    } catch {
      /* legacy leg unreadable — resolution continues */
    }
  }

  /* ---- 3. the switcher index, healed against live memberships ---- */
  let storedEntries: IndexEntry[] = [];
  let serverActive: string | null = null;
  try {
    const idxDoc = await getDoc(doc(db, "userMemberships", uid));
    if (idxDoc.exists()) {
      const raw = idxDoc.data().entries;
      if (Array.isArray(raw)) {
        for (const e of raw as Array<Partial<IndexEntry>>) {
          if (typeof e?.businessId === "string" && e.businessId !== uid) {
            storedEntries.push({
              businessId: e.businessId,
              role: resolveStaffRole(e.role),
            });
            entries = indexWith(entries, storedEntries[storedEntries.length - 1]);
          }
        }
      }
      const sa = idxDoc.data().activeBusinessId;
      if (typeof sa === "string" && sa) serverActive = sa;
    }
  } catch {
    /* index unreadable — claims/backfill above still resolved */
  }
  /* Fix Round 2 · FR2: an entry whose business's registry names
   *  the caller as ownerUid is an additionally-OWNED business —
   *  it has no membership doc by design (an owner is never a
   *  member of their own business), so healing keeps it via the
   *  carve-out and the switcher lists it as owned, role owner. */
  let ownerOwned: string[] = [];
  if (entries.length > 0) {
    const regs = await Promise.all(
      entries.map(async (e) => {
        try {
          const r = await getDoc(doc(db, "businesses", e.businessId));
          return r.exists() && r.data().ownerUid === uid ? e.businessId : null;
        } catch {
          return null;
        }
      })
    );
    ownerOwned = regs.filter((b): b is string => b !== null);
    entries = entries.map((e) =>
      ownerOwned.includes(e.businessId) ? { ...e, role: "owner" } : e
    );
  }
  if (entries.length > 0) {
    const live: Record<string, MembershipDoc | null> = {};
    await Promise.all(
      entries.map(async (e) => {
        const m = await getDoc(
          doc(db, "businessMembers", e.businessId, "members", uid)
        ).catch(() => null);
        live[e.businessId] = m?.exists() ? (m.data() as MembershipDoc) : null;
      })
    );
    const healed = healIndex(entries, live, ownerOwned);
    // The legacy-resolved business may legitimately have NO
    // membership doc yet (backfill refused) — the legacy leg is
    // its grant, so it survives healing.
    entries = healed.kept;
    if (legacyBid && !entries.some((e) => e.businessId === legacyBid)) {
      entries = indexWith(entries, {
        businessId: legacyBid,
        role: live[legacyBid]?.role ?? (legacyRole as IndexEntry["role"]),
      });
    }
    // Persist only when healing/claims actually changed the
    // index — a quiet sign-in writes nothing new anywhere.
    if (JSON.stringify(entries) !== JSON.stringify(storedEntries)) {
      try {
        await setDoc(
          doc(db, "userMemberships", uid),
          { entries, updatedAt: nowISO },
          { merge: true }
        );
      } catch {
        /* the healed list still drives this session */
      }
    }
  }

  /* ---- 4. own business + display names ---- */
  let own: { businessId: string; name: string } | null = null;
  try {
    const [ownDoc, ownReg] = await Promise.all([
      getDoc(doc(db, "users", uid)),
      getDoc(doc(db, "businesses", uid)),
    ]);
    if (ownDoc.exists() || ownReg.exists()) own = { businessId: uid, name: "" };
  } catch {
    /* treated as no own business; the default-own path covers it */
  }
  const names: Record<string, string> = {};
  const bids = [
    ...(own ? [uid] : []),
    ...entries.map((e) => e.businessId).filter((b) => b !== uid),
  ];
  await Promise.all(
    bids.map(async (bid) => {
      try {
        const reg = await getDoc(doc(db, "businesses", bid));
        if (reg.exists() && typeof reg.data().name === "string") {
          names[bid] = String(reg.data().name);
        }
      } catch {
        /* fall through to the owner doc */
      }
      if (!names[bid]) {
        try {
          const od = await getDoc(doc(db, "users", bid));
          if (od.exists() && typeof od.data().shopName === "string") {
            names[bid] = String(od.data().shopName);
          }
        } catch {
          /* unnamed — the switcher shows its fallback label */
        }
      }
    })
  );

  const list = buildSwitcherList({
    own,
    entries: entries.map((e) =>
      ownerOwned.includes(e.businessId) ? { ...e, own: true } : e
    ),
    names,
  });
  return { list, entries, preferredBid, serverActive };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const production = isProductionMode();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(production);
  const [role, setRole] = useState<ShopRole>("owner");
  const [dataUid, setDataUid] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [activeBusinessId, setActiveBusinessId] = useState<string | null>(null);
  const [noAccess, setNoAccess] = useState(false);
  const runRef = useRef(0);

  const applyResolution = useCallback(
    (res: Resolution, u: User, initial: boolean) => {
      if (res.list.length === 0) {
        if (initial) {
          // The pre-G default, preserved exactly: a signed-in
          // account with no memberships is the owner of its own
          // namespace — <StoreProvider> seeds it on first sight.
          setBusinesses([]);
          setActiveBusinessId(u.uid);
          setRole("owner");
          setDataUid(u.uid);
          setNoAccess(false);
        } else {
          // A re-resolution that finds nothing: the person was
          // removed from their last business mid-session.
          setBusinesses([]);
          setActiveBusinessId(null);
          setRole("none");
          setDataUid(null);
          setNoAccess(true);
        }
        return;
      }
      let persisted: string | null = null;
      try {
        persisted = localStorage.getItem(ACTIVE_BUSINESS_KEY);
      } catch {
        /* storage unavailable */
      }
      /* Fix Round 2 · FR2 precedence: server-persisted active
       * business, then the device-local choice, then the
       * claim/legacy preferred business, then list[0] (the
       * caller's own business first — business #1 stays #1). */
      const active =
        res.list.find((b) => b.businessId === res.serverActive) ??
        res.list.find((b) => b.businessId === persisted) ??
        res.list.find((b) => b.businessId === res.preferredBid) ??
        res.list[0];
      setBusinesses(res.list);
      setActiveBusinessId(active.businessId);
      setRole(active.role);
      setDataUid(active.businessId);
      setNoAccess(false);
    },
    []
  );

  const resolveAndApply = useCallback(
    async (u: User, initial: boolean) => {
      const db = getFirestoreDb();
      if (!db) {
        setRole("owner");
        setDataUid(u.uid);
        setLoading(false);
        return;
      }
      const run = ++runRef.current;
      try {
        const res = await resolveSession(db, u);
        if (runRef.current !== run) return;
        applyResolution(res, u, initial);
      } catch {
        if (runRef.current !== run) return;
        // Resolution failed wholesale (offline first run): fall
        // back to the pre-G behaviour rather than locking the
        // user out — own namespace, owner role.
        if (initial) {
          setBusinesses([]);
          setActiveBusinessId(u.uid);
          setRole("owner");
          setDataUid(u.uid);
          setNoAccess(false);
        }
      }
      if (runRef.current === run) setLoading(false);
    },
    [applyResolution]
  );

  useEffect(() => {
    if (!production) return;
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        runRef.current++;
        setRole("owner");
        setDataUid(null);
        setBusinesses([]);
        setActiveBusinessId(null);
        setNoAccess(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      void resolveAndApply(u, true);
    });
    return () => unsub();
  }, [production, resolveAndApply]);

  /* G1 watchers: the switcher index changing under us (another
   * device claimed/removed something) or the ACTIVE business's
   * membership doc disappearing (the owner removed this member)
   * re-resolves the session immediately — removal takes effect
   * on the next read, mid-session included (§1.3). */
  useEffect(() => {
    if (!production || !user || !activeBusinessId) return;
    const db = getFirestoreDb();
    if (!db) return;
    const unsubs: Array<() => void> = [];
    unsubs.push(
      onSnapshot(
        doc(db, "userMemberships", user.uid),
        (snap) => {
          const raw = snap.exists() ? snap.data().entries : null;
          const bids = Array.isArray(raw)
            ? (raw as Array<Partial<IndexEntry>>)
                .map((e) => e?.businessId)
                .filter((b): b is string => typeof b === "string")
                .sort()
                .join(",")
            : "";
          /* Fix Round 2 · FR2: the stored index holds every
           *  business EXCEPT the uid-shaped own one — including
           *  additionally-owned businesses (own:true, registry
           *  leg). Filtering by !own would mismatch forever once
           *  an owned business exists, so the comparison excludes
           *  only the uid-shaped business itself. */
          const mine = businesses
            .filter((b) => b.businessId !== user.uid)
            .map((b) => b.businessId)
            .sort()
            .join(",");
          if (snap.exists() && bids !== mine) void resolveAndApply(user, false);
        },
        () => undefined
      )
    );
    if (activeBusinessId !== user.uid) {
      unsubs.push(
        onSnapshot(
          doc(db, "businessMembers", activeBusinessId, "members", user.uid),
          (snap) => {
            if (!snap.exists()) void resolveAndApply(user, false);
          },
          () => undefined
        )
      );
    }
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [production, user?.uid, activeBusinessId]);

  const switchBusiness = useCallback(
    (businessId: string) => {
      const target = businesses.find((b) => b.businessId === businessId);
      if (!target) return;
      try {
        localStorage.setItem(ACTIVE_BUSINESS_KEY, businessId);
      } catch {
        /* storage unavailable */
      }
      // Re-pointing dataUid is the whole switch: <StoreProvider>'s
      // production effect is keyed on it, so every subscription
      // of the old business tears down and the new business's
      // attach — no listener survives a switch (§1.4).
      setActiveBusinessId(target.businessId);
      setRole(target.role);
      setDataUid(target.businessId);
      setNoAccess(false);
      // Fix Round 2 · FR2: persist server-side too, best-effort
      // — the next sign-in (any device) lands on this business
      // first. A failed persist never blocks the switch itself.
      if (production && user) {
        const db = getFirestoreDb();
        if (db) {
          setDoc(
            doc(db, "userMemberships", user.uid),
            { activeBusinessId: businessId },
            { merge: true }
          ).catch(() => undefined);
        }
      }
    },
    [businesses, production, user]
  );

  const createBusiness = useCallback(
    async (input: {
      name: string;
      phone: string;
      address: string;
    }): Promise<{ ok: boolean; reason?: string; businessId?: string }> => {
      const db = getFirestoreDb();
      if (!production || !user || !db) return { ok: false, reason: "unavailable" };
      if (!newBusinessInputOk(input)) return { ok: false, reason: "invalid" };
      const businessId = doc(collection(db, "businesses")).id;
      const nowISO = new Date().toISOString();
      const nb = {
        businessId,
        ownerUid: user.uid,
        ownerEmail: user.email ?? "",
        name: input.name,
        phone: input.phone,
        address: input.address,
        nowISO,
      };
      try {
        // Phase 1: the registry ALONE — rules get() reads committed
        // state, so phase 2's registry-owner leg needs the
        // registry committed before phase 2 runs.
        await applyPlatformWrites(db, planNewBusinessPhase1(nb));
        // Phase 2: zeroed counters (the index entry rides
        // separately below — applyPlatformWrites never batches
        // index writes by design).
        const phase2 = planNewBusinessPhase2(nb);
        await applyPlatformWrites(db, phase2);
        // The index entry + active business, merged into the
        // caller's own doc — BEFORE the skeleton, deliberately:
        // if the skeleton fails, the business still lists and
        // the load path / switcher retry completes it.
        const idxSnap = await getDoc(doc(db, "userMemberships", user.uid));
        const raw = idxSnap.exists() ? idxSnap.data().entries : null;
        const stored: IndexEntry[] = Array.isArray(raw)
          ? (raw as Array<Partial<IndexEntry>>)
              .filter((e): e is IndexEntry => typeof e?.businessId === "string")
              .map((e) => ({ businessId: e.businessId, role: resolveStaffRole(e.role) }))
          : [];
        await setDoc(
          doc(db, "userMemberships", user.uid),
          {
            entries: indexWith(stored, { businessId, role: "owner" }),
            activeBusinessId: businessId,
            updatedAt: nowISO,
          },
          { merge: true }
        );
      } catch {
        return { ok: false, reason: "birth-failed" };
      }
      try {
        // The skeleton: owner doc + five money accounts + the
        // default warehouse, merge-writes with fixed ids — EMPTY
        // content, Free Trial by the registry above. A failure
        // here still lists the business (index written above);
        // the load path completes it, or the switcher retry does.
        const skel = newBusinessSkeleton(nb);
        const batch = writeBatch(db);
        batch.set(doc(db, "users", businessId), skel.ownerDoc, { merge: true });
        for (const acc of skel.accounts) {
          batch.set(
            doc(db, "users", businessId, "accounts", String(acc.id)),
            acc,
            { merge: true }
          );
        }
        batch.set(
          doc(db, "users", businessId, "warehouses", String(skel.warehouse.id)),
          skel.warehouse,
          { merge: true }
        );
        await batch.commit();
      } catch {
        return { ok: false, reason: "setup-failed", businessId };
      }
      const summary: BusinessSummary = {
        businessId,
        name: input.name.trim(),
        role: "owner",
        own: true,
      };
      setBusinesses((prev) =>
        prev.some((b) => b.businessId === businessId) ? prev : [...prev, summary]
      );
      setActiveBusinessId(businessId);
      setRole("owner");
      setDataUid(businessId);
      setNoAccess(false);
      try {
        localStorage.setItem(ACTIVE_BUSINESS_KEY, businessId);
      } catch {
        /* storage unavailable */
      }
      return { ok: true, businessId };
    },
    [production, user]
  );

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
      businesses,
      activeBusinessId,
      switchBusiness,
      createBusiness,
      noAccess,
      signIn,
      signUp,
      signOut,
    }),
    [
      production,
      user,
      loading,
      role,
      dataUid,
      businesses,
      activeBusinessId,
      switchBusiness,
      createBusiness,
      noAccess,
      signIn,
      signUp,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

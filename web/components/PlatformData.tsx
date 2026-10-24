/**
 * Dukaan AI — Phase G · G3 platform data layer (design §2/§8-G3).
 *
 * The console's ONLY data seam. It reads exactly the closed
 * platform list (lib/platform's CONSOLE_READ_COLLECTIONS) and
 * executes lib/platform's act plans as single batches — an act
 * and its businessEvents entry land together or not at all.
 * There is deliberately NO import path from here to any tenant
 * data: no shop store, no selectors, no namespace under a
 * business's own tree. A platform session and a shop session
 * share nothing but the signed-in identity (useAuth).
 *
 * Subscriptions start only AFTER the platformAdmins/{uid} doc
 * has been read and found — a non-admin's console attempts no
 * platform reads at all (the rules would deny them anyway; the
 * console does not knock on doors it cannot open).
 */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase";
import { useAuth } from "./AuthProvider";
import {
  PLATFORM_CONFIG_DOC_ID,
  type ActResult,
  type AdminWrite,
  type BusinessStatsDoc,
  type PlatformAdminDoc,
  type PlatformConfigDoc,
  type PlatformPaymentDoc,
} from "@/lib/platform";
import type {
  BusinessCountersDoc,
  BusinessEventDoc,
  BusinessRegistryDoc,
} from "@/lib/tenancy";

export type AdminGate = "checking" | "admin" | "denied";

interface PlatformValue {
  gate: AdminGate;
  businesses: Array<BusinessRegistryDoc & { businessId: string }>;
  countersById: Record<string, BusinessCountersDoc | null>;
  statsById: Record<string, BusinessStatsDoc | null>;
  payments: PlatformPaymentDoc[];
  eventsByBusiness: Record<string, BusinessEventDoc[]>;
  admins: PlatformAdminDoc[];
  /** G4: the platform's own payment-instructions doc
   *  (platformConfig/main) — display data the config editor
   *  maintains; null until first saved. */
  platformConfig: PlatformConfigDoc | null;
  /** Membership-doc count per business (the platform-lawful
   *  member cross-check for the enforce flip). */
  membersJoinedById: Record<string, number>;
  /** Apply an act plan as ONE batch. Resolves true when the
   *  batch committed; a refused plan (ok:false) is never sent. */
  runAct: (result: ActResult) => Promise<boolean>;
}

const PlatformContext = createContext<PlatformValue | null>(null);

/** Registry/payment/event docs may carry Firestore Timestamps
 *  (the G1/G2 executors store trialEndsAt as one, by design of
 *  the birth validation) or ISO strings — the console normalizes
 *  every date it reads to ISO, so lib/platform's pure functions
 *  always see the shapes they were proven against. */
function isoOf(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString();
  const t = v as { toDate?: () => Date; seconds?: number };
  if (typeof t.toDate === "function") return t.toDate().toISOString();
  if (typeof t.seconds === "number") {
    return new Date(t.seconds * 1000).toISOString();
  }
  return null;
}

/** Fix Round 2 · FR2: the console carries the registry doc id as
 *  `businessId` — the ONLY correct business key. Before FR2 the
 *  doc id was dropped and every lookup used `ownerUid`, which
 *  coincides with the business id ONLY for legacy (pre-G)
 *  businesses; for a generated business it selected the wrong
 *  business (or the owner's first business) everywhere. */
function normRegistry(docId: string, raw: Record<string, unknown>): BusinessRegistryDoc & { businessId: string } {
  const plan = (raw.plan ?? {}) as Record<string, unknown>;
  return {
    ...(raw as unknown as BusinessRegistryDoc),
    businessId: docId,
    createdAt: isoOf(raw.createdAt) ?? "",
    plan: {
      ...(plan as unknown as BusinessRegistryDoc["plan"]),
      periodFrom: isoOf(plan.periodFrom) ?? "",
      periodTo: isoOf(plan.periodTo),
      trialEndsAt: isoOf(plan.trialEndsAt),
      assignedAt: isoOf(plan.assignedAt) ?? "",
    },
  };
}

function normPayment(
  id: string,
  raw: Record<string, unknown>
): PlatformPaymentDoc {
  return {
    ...(raw as unknown as PlatformPaymentDoc),
    id,
    periodFrom: isoOf(raw.periodFrom) ?? "",
    periodTo: isoOf(raw.periodTo) ?? "",
    submittedAt: isoOf(raw.submittedAt) ?? "",
    confirmedAt: isoOf(raw.confirmedAt),
  };
}

function normEvent(raw: Record<string, unknown>): BusinessEventDoc {
  return { ...(raw as unknown as BusinessEventDoc), at: isoOf(raw.at) ?? "" };
}

function normAdmin(uid: string, raw: Record<string, unknown>): PlatformAdminDoc {
  return {
    ...(raw as unknown as PlatformAdminDoc),
    uid,
    addedAt: isoOf(raw.addedAt) ?? "",
  };
}

function normStats(raw: Record<string, unknown>): BusinessStatsDoc {
  return {
    ...(raw as unknown as BusinessStatsDoc),
    lastActiveAt: isoOf(raw.lastActiveAt),
    lastDayCloseAt: isoOf(raw.lastDayCloseAt),
  };
}

function normConfig(raw: Record<string, unknown>): PlatformConfigDoc {
  return {
    ...(raw as unknown as PlatformConfigDoc),
    updatedAt: isoOf(raw.updatedAt) ?? "",
  };
}

/** Execute an act plan as one batch. The businesses/ seam
 *  converts the plan snapshot's trial end to a Firestore
 *  Timestamp — the same write-seam rule the shop store follows
 *  (the rules' birth validation reads it as a timestamp, and
 *  the stored shape stays uniform across writers). */
async function applyAdminWrites(
  db: Firestore,
  writes: AdminWrite[]
): Promise<void> {
  const batch = writeBatch(db);
  let n = 0;
  for (const w of writes) {
    if (w.kind === "set") {
      batch.set(doc(db, w.path), planWriteData(w.path, w.data));
      n++;
    } else if (w.kind === "update") {
      batch.update(doc(db, w.path), planWriteData(w.path, w.data));
      n++;
    } else if (w.kind === "add") {
      batch.set(doc(collection(db, w.collection)), w.data);
      n++;
    } else if (w.kind === "delete") {
      batch.delete(doc(db, w.path));
      n++;
    }
  }
  if (n > 0) await batch.commit();
}

function planWriteData(
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

export function PlatformProvider({ children }: { children: ReactNode }) {
  const { user, mode } = useAuth();
  const [gate, setGate] = useState<AdminGate>("checking");
  const [businesses, setBusinesses] = useState<Array<BusinessRegistryDoc & { businessId: string }>>([]);
  const [countersById, setCountersById] = useState<
    Record<string, BusinessCountersDoc | null>
  >({});
  const [statsById, setStatsById] = useState<
    Record<string, BusinessStatsDoc | null>
  >({});
  const [payments, setPayments] = useState<PlatformPaymentDoc[]>([]);
  const [eventsByBusiness, setEventsByBusiness] = useState<
    Record<string, BusinessEventDoc[]>
  >({});
  const [admins, setAdmins] = useState<PlatformAdminDoc[]>([]);
  const [platformConfig, setPlatformConfig] =
    useState<PlatformConfigDoc | null>(null);
  const [membersJoinedById, setMembersJoinedById] = useState<
    Record<string, number>
  >({});

  /* The gate: the grant doc itself is the only door (§2.1). */
  useEffect(() => {
    if (mode === "demo" || !user) {
      setGate("denied");
      return;
    }
    const db = getFirestoreDb();
    if (!db) {
      setGate("denied");
      return;
    }
    let live = true;
    setGate("checking");
    getDoc(doc(db, "platformAdmins", user.uid))
      .then((ds) => {
        if (live) setGate(ds.exists() ? "admin" : "denied");
      })
      .catch(() => {
        if (live) setGate("denied");
      });
    return () => {
      live = false;
    };
  }, [user, mode]);

  /* The closed list, subscribed only once the gate opens. */
  useEffect(() => {
    if (gate !== "admin") return;
    const db = getFirestoreDb();
    if (!db) return;
    const unsubs = [
      onSnapshot(
        collection(db, "businesses"),
        (snap) =>
          setBusinesses(
            snap.docs.map((d) =>
              normRegistry(d.id, d.data() as Record<string, unknown>)
            )
          ),
        () => undefined
      ),
      onSnapshot(
        collection(db, "businessCounters"),
        (snap) => {
          const out: Record<string, BusinessCountersDoc | null> = {};
          for (const d of snap.docs) {
            out[d.id] = d.data() as BusinessCountersDoc;
          }
          setCountersById(out);
        },
        () => undefined
      ),
      onSnapshot(
        collection(db, "businessStats"),
        (snap) => {
          const out: Record<string, BusinessStatsDoc | null> = {};
          for (const d of snap.docs) {
            out[d.id] = normStats(d.data() as Record<string, unknown>);
          }
          setStatsById(out);
        },
        () => undefined
      ),
      onSnapshot(
        collection(db, "platformPayments"),
        (snap) =>
          setPayments(
            snap.docs.map((d) =>
              normPayment(d.id, d.data() as Record<string, unknown>)
            )
          ),
        () => undefined
      ),
      onSnapshot(
        collection(db, "platformAdmins"),
        (snap) =>
          setAdmins(
            snap.docs.map((d) =>
              normAdmin(d.id, d.data() as Record<string, unknown>)
            )
          ),
        () => undefined
      ),
      onSnapshot(
        query(collection(db, "businessEvents"), orderBy("at", "desc"), limit(1000)),
        (snap) => {
          const out: Record<string, BusinessEventDoc[]> = {};
          for (const d of snap.docs) {
            const e = normEvent(d.data() as Record<string, unknown>);
            (out[e.businessId] ??= []).push(e);
          }
          setEventsByBusiness(out);
        },
        () => undefined
      ),
      onSnapshot(
        collection(db, "platformConfig"),
        (snap) => {
          const d = snap.docs.find((x) => x.id === PLATFORM_CONFIG_DOC_ID);
          setPlatformConfig(
            d ? normConfig(d.data() as Record<string, unknown>) : null
          );
        },
        () => undefined
      ),
      onSnapshot(
        collectionGroup(db, "members"),
        (snap) => {
          const out: Record<string, number> = {};
          for (const d of snap.docs) {
            const bid = d.ref.parent.parent?.id;
            if (bid) out[bid] = (out[bid] ?? 0) + 1;
          }
          setMembersJoinedById(out);
        },
        () => undefined
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, [gate]);

  const runAct = useCallback(async (result: ActResult): Promise<boolean> => {
    if (!result.ok) return false;
    const db = getFirestoreDb();
    if (!db) return false;
    try {
      await applyAdminWrites(db, result.writes);
      return true;
    } catch {
      return false;
    }
  }, []);

  const value = useMemo<PlatformValue>(
    () => ({
      gate,
      businesses,
      countersById,
      statsById,
      payments,
      eventsByBusiness,
      admins,
      platformConfig,
      membersJoinedById,
      runAct,
    }),
    [
      gate,
      businesses,
      countersById,
      statsById,
      payments,
      eventsByBusiness,
      admins,
      platformConfig,
      membersJoinedById,
      runAct,
    ]
  );

  return (
    <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>
  );
}

export function usePlatform(): PlatformValue {
  const v = useContext(PlatformContext);
  if (!v) throw new Error("usePlatform outside PlatformProvider");
  return v;
}

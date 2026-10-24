"use client";

/**
 * Phase E · E4/E5 — the PIN gate (design §4.4/§4.5/§4.6).
 *
 * PinGateProvider mounts inside AppShell around the NON-AUTH
 * branch only (auth paths are exempt — a lock over the login
 * form would lock the recovery route too), and only engages
 * when a session context exists: a signed-in cloud user, or
 * demo mode. The lock is a SCREEN, not a data gate: the app
 * stays mounted beneath the overlay (subscriptions keep
 * running, a half-built bill keeps its state) — §4.1's model
 * is the casual walk-up hand, and the copy says so.
 *
 * Everything PIN lives in lib/pinlock (device-local
 * localStorage record; this component never writes to
 * Firestore — the only Firebase call here is Auth
 * reauthentication for recovery, §4.5).
 *
 * E5: the same provider exposes `requirePin(actionLabelKey)`.
 * Gated call sites await it BEFORE composing any write — a
 * view-layer precondition; no store signature changes. When
 * the gate is not required (no record on this device, or the
 * pref is off) it resolves true immediately and the gated
 * flows behave exactly as they did before E5.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import {
  applyPinFailure,
  applyPinSuccess,
  clearPinGuard,
  clearPinRecord,
  createPinRecord,
  DEFAULT_PIN_GUARD,
  DEFAULT_PIN_PREFS,
  gateAllows,
  initialPinLockState,
  loadPinGuard,
  loadPinPrefs,
  loadPinRecord,
  pinGateRequired,
  pinLockReducer,
  pinPauseRemainingMs,
  savePinGuard,
  savePinPrefs,
  savePinRecord,
  verifyPin,
  type PinGuardState,
  type PinLockPrefs,
  type PinLockRecord,
  type PinStorage,
} from "@/lib/pinlock";
import type { I18nKey } from "@/lib/i18n";
import { useAuth } from "./AuthProvider";
import { useStore } from "./StoreProvider";
import { useLang } from "./LangProvider";
import { IconLock } from "./ui";

interface PinGateValue {
  /** A session context exists (signed-in user, or demo mode). */
  active: boolean;
  hasPin: boolean;
  record: PinLockRecord | null;
  prefs: PinLockPrefs;
  locked: boolean;
  /** Milliseconds of guess-friction pause left (0 = pad live). */
  pauseRemainingMs: number;
  lockNow: () => void;
  /** E5 seam — resolves true when the action may proceed. */
  requirePin: (actionLabelKey: I18nKey) => Promise<boolean>;
  setPin: (pin: string) => Promise<boolean>;
  changePin: (currentPin: string, newPin: string) => Promise<boolean>;
  removePinWithPin: (currentPin: string) => Promise<boolean>;
  removePinWithPassword: (password: string) => Promise<boolean>;
  updatePrefs: (prefs: PinLockPrefs) => void;
}

const PinGateContext = createContext<PinGateValue | null>(null);

export function usePinGate(): PinGateValue {
  const ctx = useContext(PinGateContext);
  if (!ctx) throw new Error("usePinGate must be used inside <PinGateProvider>");
  return ctx;
}

function browserStorage(): PinStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function IconBackspace() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 5H9L3 12l6 7h11a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1Z" />
      <path d="m12.5 9.5 5 5M17.5 9.5l-5 5" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* The shared pad panel — dots + numeric pad + friction messaging.     */
/* Used by the lock screen and by the E5 challenge overlay; both       */
/* feed the SAME attempt path (and the same failure counters).         */
/* ------------------------------------------------------------------ */

function PinUnlockPanel({
  heading,
  sub,
  onAttempt,
  onCancel,
}: {
  heading: React.ReactNode;
  sub?: React.ReactNode;
  onAttempt: (pin: string) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const { hasPin, record, pauseRemainingMs } = usePinGate();
  const { t } = useLang();
  const [entry, setEntry] = useState("");
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const length = record?.digits ?? 4;
  const pausedSec = Math.ceil(pauseRemainingMs / 1000);
  const paused = pauseRemainingMs > 0;
  const disabled = busy || paused || !hasPin;

  const submit = useCallback(
    async (pin: string) => {
      setBusy(true);
      const ok = await onAttempt(pin);
      setBusy(false);
      if (!ok) {
        setWrong(true);
        setShakeKey((k) => k + 1);
        setEntry("");
      }
    },
    [onAttempt]
  );

  const push = useCallback(
    (d: string) => {
      if (disabled || entry.length >= length) return;
      setWrong(false);
      const next = entry + d;
      setEntry(next);
      if (next.length === length) void submit(next);
    },
    [disabled, entry, length, submit]
  );

  const back = useCallback(() => {
    if (busy) return;
    setWrong(false);
    setEntry((prev) => prev.slice(0, -1));
  }, [busy]);

  // Physical keyboard (§4.4) — only while this pad is on screen,
  // and never stealing keystrokes from a form field (the lock
  // screen's recovery password input is exactly that case).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (/^[0-9]$/.test(e.key)) push(e.key);
      else if (e.key === "Backspace") back();
      else if (e.key === "Escape" && onCancel) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [push, back, onCancel]);

  return (
    <div>
      {heading}
      {sub}
      <div
        className={`pin-dots${wrong && !paused ? " shake" : ""}`}
        key={shakeKey}
        aria-hidden="true"
      >
        {Array.from({ length }, (_, i) => (
          <span key={i} className={`pin-dot${i < entry.length ? " filled" : ""}`} />
        ))}
      </div>
      <div className="pin-pad" role="group" aria-label={t("pin.lock.prompt")}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            type="button"
            className="pin-key"
            disabled={disabled}
            onClick={() => push(d)}
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          className="pin-key ghost"
          aria-label={t("pin.pad.backspace")}
          disabled={busy || entry.length === 0}
          onClick={back}
        >
          <IconBackspace />
        </button>
        <button
          type="button"
          className="pin-key"
          disabled={disabled}
          onClick={() => push("0")}
        >
          0
        </button>
        {onCancel ? (
          <button type="button" className="pin-key ghost" onClick={onCancel}>
            {t("action.cancel")}
          </button>
        ) : (
          <span />
        )}
      </div>
      <div className="pin-msg" role="status">
        {paused
          ? t("pin.lock.paused", { sec: pausedSec })
          : wrong
            ? t("pin.lock.wrong")
            : ""}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

export function PinGateProvider({ children }: { children: React.ReactNode }) {
  const { mode, user } = useAuth();
  const { settings, resetDemo } = useStore();
  const { t } = useLang();
  const router = useRouter();
  const active = mode === "demo" || !!user;
  const demo = mode === "demo";

  const [record, setRecord] = useState<PinLockRecord | null>(null);
  const [prefs, setPrefs] = useState<PinLockPrefs>(DEFAULT_PIN_PREFS);
  const [guard, setGuard] = useState<PinGuardState>(DEFAULT_PIN_GUARD);
  const [lockState, dispatch] = useReducer(pinLockReducer, initialPinLockState);
  const [challenge, setChallenge] = useState<{
    actionKey: I18nKey;
    resolve: (ok: boolean) => void;
  } | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const recordRef = useRef(record);
  recordRef.current = record;
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const guardRef = useRef(guard);
  guardRef.current = guard;
  const challengeRef = useRef(challenge);
  challengeRef.current = challenge;
  const launchedRef = useRef(false);

  /* Hydrate from THIS device's storage the first time a session
   * context exists; a device with a record opens locked (§4.4). */
  useEffect(() => {
    if (!active || launchedRef.current) return;
    launchedRef.current = true;
    const storage = browserStorage();
    if (!storage) return;
    const rec = loadPinRecord(storage);
    setRecord(rec);
    setPrefs(loadPinPrefs(storage));
    setGuard(loadPinGuard(storage));
    dispatch({ type: "launch", hasRecord: !!rec, now: Date.now() });
  }, [active]);

  /* Activity + idle machinery (§4.4): pointer/keyboard activity
   * anywhere moves the epoch; the verdict is re-checked on a
   * timer and when a hidden tab returns (deadline-while-hidden
   * locks on return — hidden time counts toward idle). */
  useEffect(() => {
    if (!active) return;
    const onActivity = () => dispatch({ type: "activity", now: Date.now() });
    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity);
    window.addEventListener("touchstart", onActivity, { passive: true });
    const iv = window.setInterval(() => {
      dispatch({ type: "check", now: Date.now(), idleMinutes: prefsRef.current.idleMinutes });
      setNowTick(Date.now());
    }, 15_000);
    const onVis = () => {
      if (document.visibilityState === "visible") {
        dispatch({ type: "check", now: Date.now(), idleMinutes: prefsRef.current.idleMinutes });
        setNowTick(Date.now());
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("touchstart", onActivity);
      window.clearInterval(iv);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [active]);

  const pauseRemainingMs = record ? pinPauseRemainingMs(guard, nowTick) : 0;

  /* Tick faster while a friction pause is counting down. */
  useEffect(() => {
    if (pauseRemainingMs <= 0) return;
    const iv = window.setInterval(() => setNowTick(Date.now()), 500);
    return () => window.clearInterval(iv);
  }, [pauseRemainingMs > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const persistGuard = useCallback((g: PinGuardState) => {
    setGuard(g);
    guardRef.current = g;
    const storage = browserStorage();
    if (storage) savePinGuard(storage, g);
  }, []);

  /** The ONE attempt path — lock screen and E5 challenge share
   *  it, and share its failure counters (§4.4). */
  const attempt = useCallback(
    async (pin: string): Promise<boolean> => {
      const rec = recordRef.current;
      if (!rec) return false;
      if (pinPauseRemainingMs(guardRef.current, Date.now()) > 0) return false;
      const ok = await verifyPin(rec, pin);
      if (ok) {
        persistGuard(applyPinSuccess());
        return true;
      }
      persistGuard(applyPinFailure(guardRef.current, Date.now()));
      setNowTick(Date.now());
      return false;
    },
    [persistGuard]
  );

  const clearRecord = useCallback(() => {
    const storage = browserStorage();
    if (storage) {
      clearPinRecord(storage);
      clearPinGuard(storage);
    }
    setRecord(null);
    recordRef.current = null;
    persistGuard(DEFAULT_PIN_GUARD);
  }, [persistGuard]);

  const setPin = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const rec = await createPinRecord(pin);
      const storage = browserStorage();
      if (storage) savePinRecord(storage, rec);
      setRecord(rec);
      recordRef.current = rec;
      persistGuard(applyPinSuccess());
      return true;
    } catch {
      return false;
    }
  }, [persistGuard]);

  const changePin = useCallback(
    async (currentPin: string, newPin: string): Promise<boolean> => {
      const rec = recordRef.current;
      if (!rec) return false;
      if (!(await verifyPin(rec, currentPin))) return false;
      return setPin(newPin);
    },
    [setPin]
  );

  const removePinWithPin = useCallback(
    async (currentPin: string): Promise<boolean> => {
      const rec = recordRef.current;
      if (!rec) return false;
      if (!(await verifyPin(rec, currentPin))) return false;
      clearRecord();
      return true;
    },
    [clearRecord]
  );

  /** §4.5 — the signed-in account's own password is the key
   *  (staff sessions included, deliberately). */
  const reauthenticate = useCallback(
    async (password: string): Promise<boolean> => {
      if (!user || !user.email) return false;
      const auth = getFirebaseAuth();
      if (!auth) return false;
      try {
        const cred = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, cred);
        return true;
      } catch {
        return false;
      }
    },
    [user]
  );

  const removePinWithPassword = useCallback(
    async (password: string): Promise<boolean> => {
      if (!(await reauthenticate(password))) return false;
      clearRecord();
      return true;
    },
    [reauthenticate, clearRecord]
  );

  const updatePrefs = useCallback((next: PinLockPrefs) => {
    setPrefs(next);
    prefsRef.current = next;
    const storage = browserStorage();
    if (storage) savePinPrefs(storage, next);
  }, []);

  const lockNow = useCallback(() => {
    if (recordRef.current) dispatch({ type: "lockNow" });
  }, []);

  const settleChallenge = useCallback((ok: boolean) => {
    setChallenge((c) => {
      if (c) c.resolve(ok);
      return null;
    });
  }, []);

  /* If the idle lock engages while a challenge is open, the
   * challenge is cancelled — nothing composes (§4.6). */
  useEffect(() => {
    if (lockState.locked && challengeRef.current) {
      settleChallenge(gateAllows(pinGateRequired(prefsRef.current, true), "cancel"));
    }
  }, [lockState.locked, settleChallenge]);

  const requirePin = useCallback(
    (actionLabelKey: I18nKey): Promise<boolean> => {
      const required = pinGateRequired(prefsRef.current, !!recordRef.current);
      /* Not required ⇒ allowed immediately: the pre-E5 behaviour,
       * exactly (gateAllows(!required, ·) is true by definition). */
      if (!required) return Promise.resolve(true);
      if (challengeRef.current) return Promise.resolve(false);
      return new Promise<boolean>((resolve) => {
        setChallenge({ actionKey: actionLabelKey, resolve });
      });
    },
    []
  );

  const unlockAttempt = useCallback(
    async (pin: string): Promise<boolean> => {
      const ok = await attempt(pin);
      if (ok) dispatch({ type: "unlock", now: Date.now() });
      return ok;
    },
    [attempt]
  );

  const challengeAttempt = useCallback(
    async (pin: string): Promise<boolean> => {
      const ok = await attempt(pin);
      if (ok) settleChallenge(gateAllows(true, "pass"));
      return ok;
    },
    [attempt, settleChallenge]
  );

  /* Lock-screen recovery (§4.5). */
  const recoverWithPassword = useCallback(
    async (password: string): Promise<boolean> => {
      const ok = await removePinWithPassword(password);
      if (ok) {
        dispatch({ type: "unlock", now: Date.now() });
        router.push("/settings");
      }
      return ok;
    },
    [removePinWithPassword, router]
  );

  const erasePinAndData = useCallback(() => {
    resetDemo();
    clearRecord();
    updatePrefs(DEFAULT_PIN_PREFS);
    dispatch({ type: "unlock", now: Date.now() });
  }, [resetDemo, clearRecord, updatePrefs]);

  const value = useMemo<PinGateValue>(
    () => ({
      active,
      hasPin: !!record,
      record,
      prefs,
      locked: active && !!record && lockState.locked,
      pauseRemainingMs,
      lockNow,
      requirePin,
      setPin,
      changePin,
      removePinWithPin,
      removePinWithPassword,
      updatePrefs,
    }),
    [
      active, record, prefs, lockState.locked, pauseRemainingMs,
      lockNow, requirePin, setPin, changePin, removePinWithPin,
      removePinWithPassword, updatePrefs,
    ]
  );

  const shopName = settings.shopName?.trim() || t("shell.brandFallback");
  const showLock = value.locked;
  const showChallenge = active && !!record && !!challenge && !lockState.locked;

  return (
    <PinGateContext.Provider value={value}>
      {children}
      {showLock && (
        <LockScreen
          shopName={shopName}
          demo={demo}
          onAttempt={unlockAttempt}
          onRecoverPassword={recoverWithPassword}
          onErase={erasePinAndData}
        />
      )}
      {showChallenge && challenge && (
        <div className="pin-overlay centered" role="dialog" aria-modal="true" aria-label={t("pin.gate.title")}>
          <div className="pin-card">
            <PinUnlockPanel
              heading={
                <>
                  <div className="pin-title">{t("pin.gate.title")}</div>
                  <div className="pin-action">{t(challenge.actionKey)}</div>
                  <div className="pin-prompt">{t("pin.gate.body")}</div>
                </>
              }
              onAttempt={challengeAttempt}
              onCancel={() => settleChallenge(gateAllows(true, "cancel"))}
            />
          </div>
        </div>
      )}
    </PinGateContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Lock screen (§4.4/§4.5) — shop name, the pad, forgot-PIN,           */
/* and nothing else: no balances, no nav, no data.                     */
/* ------------------------------------------------------------------ */

function LockScreen({
  shopName,
  demo,
  onAttempt,
  onRecoverPassword,
  onErase,
}: {
  shopName: string;
  demo: boolean;
  onAttempt: (pin: string) => Promise<boolean>;
  onRecoverPassword: (password: string) => Promise<boolean>;
  onErase: () => void;
}) {
  const { t } = useLang();
  const [recovering, setRecovering] = useState(false);
  const [password, setPassword] = useState("");
  const [recoverError, setRecoverError] = useState(false);
  const [recoverBusy, setRecoverBusy] = useState(false);
  const [typedName, setTypedName] = useState("");

  const submitRecovery = async () => {
    setRecoverBusy(true);
    setRecoverError(false);
    const ok = await onRecoverPassword(password);
    setRecoverBusy(false);
    if (!ok) setRecoverError(true);
  };

  return (
    <div className="pin-overlay" role="dialog" aria-modal="true" aria-label={t("pin.lock.prompt")}>
      <div className="pin-card">
        <div className="pin-shop">{shopName}</div>
        {!recovering ? (
          <>
            <PinUnlockPanel
              heading={<div className="pin-prompt">{t("pin.lock.prompt")}</div>}
              onAttempt={onAttempt}
            />
            <button type="button" className="pin-link" onClick={() => setRecovering(true)}>
              {t("pin.forgot")}
            </button>
          </>
        ) : (
          <div className="pin-recovery">
            {demo ? (
              <>
                <div className="pin-title">{t("pin.demoErase.title")}</div>
                <p className="modal-sub">{t("pin.demoErase.body")}</p>
                <div className="field">
                  <label htmlFor="pin-erase-name">{t("pin.demoErase.typeLabel")}</label>
                  <input
                    id="pin-erase-name"
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setRecovering(false)}>
                    {t("pin.back")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={typedName.trim() !== shopName}
                    onClick={onErase}
                  >
                    {t("pin.demoErase.submit")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="pin-title">{t("pin.recover.title")}</div>
                <p className="modal-sub">{t("pin.recover.body")}</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void submitRecovery();
                  }}
                >
                  <div className="field">
                    <label htmlFor="pin-recover-password">{t("pin.password")}</label>
                    <input
                      id="pin-recover-password"
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setRecoverError(false);
                      }}
                      autoComplete="current-password"
                    />
                  </div>
                  {recoverError && (
                    <div className="pin-msg" role="alert">
                      {t("pin.recover.failed")}
                    </div>
                  )}
                  <div className="modal-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => setRecovering(false)}>
                      {t("pin.back")}
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={recoverBusy || !password}>
                      {t("pin.recover.submit")}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Header lock button (§4.4) — shown to any role when a record         */
/* exists on this device; locking is always safe to offer.             */
/* ------------------------------------------------------------------ */

export function PinLockButton() {
  const { active, hasPin, lockNow } = usePinGate();
  const { t } = useLang();
  if (!active || !hasPin) return null;
  return (
    <button
      type="button"
      className="pin-lock-btn"
      onClick={lockNow}
      title={t("pin.lockNow")}
      aria-label={t("pin.lockNow")}
    >
      <IconLock />
    </button>
  );
}

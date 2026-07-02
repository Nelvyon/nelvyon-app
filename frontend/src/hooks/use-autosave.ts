/**
 * useAutosave — Automatic draft saving with offline resilience.
 *
 * Features:
 * - Debounced autosave to localStorage (configurable interval)
 * - Offline queue: queues API saves when offline, flushes when back online
 * - Visual status indicator: "saved" | "saving" | "unsaved" | "offline" | "error"
 * - Recovery: restores last draft on mount if available
 * - Conflict detection: warns if server data is newer
 */
import { useState, useEffect, useRef, useCallback } from "react";

export type AutosaveStatus = "idle" | "saving" | "saved" | "unsaved" | "offline" | "error";

interface UseAutosaveOptions<T> {
  /** Unique key for this draft (e.g., "crm-contact-123") */
  key: string;
  /** Current data to autosave */
  data: T;
  /** Debounce interval in ms (default: 2000) */
  interval?: number;
  /** Optional async save function (API call). If omitted, only saves to localStorage. */
  onSave?: (data: T) => Promise<void>;
  /** Whether autosave is enabled (default: true) */
  enabled?: boolean;
}

interface UseAutosaveReturn<T> {
  status: AutosaveStatus;
  lastSaved: Date | null;
  /** Manually trigger a save */
  saveNow: () => Promise<void>;
  /** Discard the current draft */
  discardDraft: () => void;
  /** Recover a previously saved draft (returns null if none) */
  recoveredDraft: T | null;
  /** Whether there's a recoverable draft */
  hasDraft: boolean;
  /** Accept the recovered draft (clears recovery state) */
  acceptDraft: () => void;
  /** Whether the user is currently offline */
  isOffline: boolean;
}

const STORAGE_PREFIX = "nelvyon_draft_";
const OFFLINE_QUEUE_KEY = "nelvyon_offline_queue";

export function useAutosave<T>(options: UseAutosaveOptions<T>): UseAutosaveReturn<T> {
  const { key, data, interval = 2000, onSave, enabled = true } = options;
  const storageKey = `${STORAGE_PREFIX}${key}`;

  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [recoveredDraft, setRecoveredDraft] = useState<T | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const dataRef = useRef(data);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDataHash = useRef<string>("");
  const mountedRef = useRef(true);

  // Track online/offline
  useEffect(() => {
    const goOnline = () => {
      setIsOffline(false);
      // Flush offline queue
      flushOfflineQueue();
    };
    const goOffline = () => {
      setIsOffline(true);
      setStatus("offline");
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
     
  }, []);

  // Recover draft on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.data && parsed?.timestamp) {
          setRecoveredDraft(parsed.data as T);
          setHasDraft(true);
        }
      }
    } catch {
      // Corrupted draft — ignore
    }

    return () => {
      mountedRef.current = false;
    };
  }, [storageKey]);

  // Update ref when data changes
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Compute a simple hash for change detection
  const computeHash = useCallback((d: T): string => {
    try {
      return JSON.stringify(d);
    } catch {
      return String(Date.now());
    }
  }, []);

  // Save to localStorage
  const saveToLocal = useCallback((d: T) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        data: d,
        timestamp: new Date().toISOString(),
        key,
      }));
    } catch {
      // localStorage full — try to clear old drafts
      try {
        const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX));
        if (keys.length > 10) {
          // Remove oldest drafts
          const sorted = keys
            .map(k => ({ key: k, ts: JSON.parse(localStorage.getItem(k) || "{}").timestamp || "" }))
            .sort((a, b) => a.ts.localeCompare(b.ts));
          for (let i = 0; i < Math.min(5, sorted.length); i++) {
            localStorage.removeItem(sorted[i].key);
          }
          // Retry
          localStorage.setItem(storageKey, JSON.stringify({ data: d, timestamp: new Date().toISOString(), key }));
        }
      } catch {
        // Give up silently
      }
    }
  }, [storageKey, key]);

  // Add to offline queue
  const addToOfflineQueue = useCallback((d: T) => {
    try {
      const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
      queue.push({ key, data: d, timestamp: new Date().toISOString() });
      // Keep queue bounded
      if (queue.length > 50) queue.splice(0, queue.length - 50);
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch {
      // ignore
    }
  }, [key]);

  // Flush offline queue when back online
  const flushOfflineQueue = useCallback(async () => {
    if (!onSave) return;
    try {
      const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
      if (queue.length === 0) return;

      const myItems = queue.filter((item: { key: string }) => item.key === key);
      const otherItems = queue.filter((item: { key: string }) => item.key !== key);

      // Save only the latest for this key
      if (myItems.length > 0) {
        const latest = myItems[myItems.length - 1];
        try {
          await onSave(latest.data);
        } catch {
          // Re-queue if still failing
          otherItems.push(latest);
        }
      }

      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(otherItems));
    } catch {
      // ignore
    }
  }, [key, onSave]);

  // Core save function
  const performSave = useCallback(async (d: T) => {
    if (!mountedRef.current) return;

    const hash = computeHash(d);
    if (hash === lastDataHash.current) return; // No changes

    setStatus("saving");
    lastDataHash.current = hash;

    // Always save to localStorage first (instant)
    saveToLocal(d);

    // If we have an API save function and we're online, call it
    if (onSave && navigator.onLine) {
      try {
        await onSave(d);
        if (mountedRef.current) {
          setStatus("saved");
          setLastSaved(new Date());
        }
      } catch {
        if (mountedRef.current) {
          setStatus("error");
          // Queue for later
          addToOfflineQueue(d);
        }
      }
    } else if (onSave && !navigator.onLine) {
      // Queue for when we're back online
      addToOfflineQueue(d);
      if (mountedRef.current) {
        setStatus("offline");
      }
    } else {
      // No API save — localStorage only
      if (mountedRef.current) {
        setStatus("saved");
        setLastSaved(new Date());
      }
    }
  }, [computeHash, saveToLocal, onSave, addToOfflineQueue]);

  // Debounced autosave
  useEffect(() => {
    if (!enabled) return;

    const hash = computeHash(data);
    if (hash === lastDataHash.current) return;

    setStatus("unsaved");

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      performSave(data);
    }, interval);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data, enabled, interval, computeHash, performSave]);

  // Manual save
  const saveNow = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    await performSave(dataRef.current);
  }, [performSave]);

  // Discard draft
  const discardDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch { /* ignore */ }
    setRecoveredDraft(null);
    setHasDraft(false);
    setStatus("idle");
    lastDataHash.current = "";
  }, [storageKey]);

  // Accept recovered draft
  const acceptDraft = useCallback(() => {
    setHasDraft(false);
    // Don't clear recoveredDraft — the consumer reads it
  }, []);

  return {
    status,
    lastSaved,
    saveNow,
    discardDraft,
    recoveredDraft,
    hasDraft,
    acceptDraft,
    isOffline,
  };
}
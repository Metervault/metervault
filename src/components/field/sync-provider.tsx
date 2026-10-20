"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fieldDb, subscribeField, type SyncState } from "@/lib/field/db";
import { flushOutbox, globalSyncState } from "@/lib/field/sync";

const SyncContext = createContext<{ state: SyncState; pending: number; offline: boolean; refresh: () => void }>({
  state: "synced",
  pending: 0,
  offline: false,
  refresh: () => undefined,
});

export function useSyncStatus() {
  return useContext(SyncContext);
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SyncState>("synced");
  const [pending, setPending] = useState(0);
  const [offline, setOffline] = useState(false);

  async function refresh() {
    const next = await globalSyncState();
    setState(next.state);
    setPending(next.pending);
    setOffline(typeof navigator !== "undefined" && !navigator.onLine);
  }

  useEffect(() => {
    void refresh();
    const unsubscribe = subscribeField(() => void refresh());
    const onOnline = () => {
      setOffline(false);
      void flushOutbox().then(refresh);
    };
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const timer = window.setInterval(() => void flushOutbox().then(refresh), 15000);
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "flush-outbox") void flushOutbox().then(refresh);
      });
    }
    return () => {
      unsubscribe();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.clearInterval(timer);
    };
  }, []);

  return <SyncContext.Provider value={{ state, pending, offline, refresh }}>{children}</SyncContext.Provider>;
}

export function useDrafts() {
  const [drafts, setDrafts] = useState<Awaited<ReturnType<typeof fieldDb.drafts.toArray>>>([]);
  useEffect(() => {
    const load = () => void fieldDb.drafts.orderBy("updatedAt").reverse().toArray().then(setDrafts);
    load();
    return subscribeField(load);
  }, []);
  return drafts;
}

import { useEffect, useState, useSyncExternalStore } from "react";
import { discard, flushOutbox, getOutboxSnapshot, retry, subscribeOutbox } from "./outbox";

/** Whether the browser believes it has a connection. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return online;
}

/** The signed-in user's unsent items, with actions to push, retry or drop them. */
export function useOutbox() {
  const items = useSyncExternalStore(subscribeOutbox, getOutboxSnapshot, getOutboxSnapshot);
  return {
    items,
    pending: items.filter((i) => !i.failed),
    failed: items.filter((i) => i.failed),
    flush: flushOutbox,
    retry,
    discard,
  };
}

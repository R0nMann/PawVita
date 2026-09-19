import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { ApiError, apiFetch } from "../api/client";
import { queryClient } from "../api/queryClient";
import { getSession, subscribeSession } from "../api/session";

/**
 * Offline outbox (architecture §12).
 *
 * Anything a farmer records without signal — a case report, its photo, a
 * vaccination — is written to IndexedDB and sent when the connection returns.
 * Every item carries the client-generated id of the record it creates, and the
 * API treats a repeated id as "already stored", so replaying an item after a
 * dropped response can never create a duplicate.
 */

export type OutboxKind = "case" | "attachment" | "vaccination" | "animal" | "mortality";

export interface OutboxItem {
  /** Id of the record being created — also the idempotency key. */
  id: string;
  userId: string;
  kind: OutboxKind;
  /** API path to POST to, e.g. "/cases". */
  path: string;
  body?: Record<string, unknown>;
  /** Attachments: multipart fields plus the file itself. */
  file?: { blob: Blob; name: string; fields: Record<string, string> };
  /** Shown in the UI: "Report for Lali". */
  label: string;
  createdAt: number;
  attempts: number;
  lastError?: string;
  /** Rejected by the server (validation) — sending again will not help. */
  failed?: boolean;
  /** Another outbox item that must be delivered first (a photo waits for its case). */
  dependsOn?: string;
}

interface OutboxDb extends DBSchema {
  outbox: { key: string; value: OutboxItem; indexes: { createdAt: number } };
}

let dbPromise: Promise<IDBPDatabase<OutboxDb>> | null = null;
function db() {
  dbPromise ??= openDB<OutboxDb>("pawvita-offline", 1, {
    upgrade(database) {
      const store = database.createObjectStore("outbox", { keyPath: "id" });
      store.createIndex("createdAt", "createdAt");
    },
  });
  return dbPromise;
}

// --- In-memory snapshot for React (useSyncExternalStore) --------------------

let snapshot: OutboxItem[] = [];
const listeners = new Set<() => void>();

async function reload() {
  const userId = getSession()?.account.id;
  const all = await (await db()).getAllFromIndex("outbox", "createdAt");
  snapshot = userId ? all.filter((i) => i.userId === userId) : [];
  for (const l of listeners) l();
}

export function subscribeOutbox(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getOutboxSnapshot() {
  return snapshot;
}

/** An id the API accepts — randomUUID needs a secure context, which a phone on a LAN address is not. */
export function newId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// --- Sending -------------------------------------------------------------------

function send(item: OutboxItem): Promise<unknown> {
  if (item.file) {
    const form = new FormData();
    for (const [k, v] of Object.entries(item.file.fields)) form.set(k, v);
    form.set("file", item.file.blob, item.file.name);
    return apiFetch(item.path, { form });
  }
  return apiFetch(item.path, { body: item.body });
}

/** Query families to refresh once an item of each kind reaches the server. */
const INVALIDATES: Record<OutboxKind, string[]> = {
  case: ["cases", "animals"],
  attachment: ["cases"],
  vaccination: ["vaccinations", "animals"],
  animal: ["animals", "herds"],
  mortality: ["animals", "herds"],
};

let flushing: Promise<void> | null = null;

/** Send everything that can be sent, oldest first. Safe to call at any time. */
export function flushOutbox(): Promise<void> {
  flushing ??= (async () => {
    try {
      const session = getSession();
      if (!session) return;
      const database = await db();
      const items = (await database.getAllFromIndex("outbox", "createdAt")).filter(
        (i) => i.userId === session.account.id && !i.failed,
      );
      const delivered = new Set<OutboxKind>();
      for (const item of items) {
        if (item.dependsOn && (await database.get("outbox", item.dependsOn))) continue;
        try {
          await send(item);
          await database.delete("outbox", item.id);
          delivered.add(item.kind);
        } catch (err) {
          if (err instanceof ApiError && (err.isNetwork || err.status === 401 || err.status >= 500)) {
            // Still offline, signed out or server trouble: keep it and stop for now.
            await database.put("outbox", { ...item, attempts: item.attempts + 1, lastError: err.message });
            break;
          }
          // The server refused it (validation, conflict): needs the user's attention.
          await database.put("outbox", {
            ...item,
            attempts: item.attempts + 1,
            failed: true,
            lastError: err instanceof Error ? err.message : String(err),
          });
        }
      }
      for (const kind of delivered) {
        for (const key of INVALIDATES[kind]) void queryClient.invalidateQueries({ queryKey: [key] });
      }
    } finally {
      await reload();
      flushing = null;
    }
  })();
  return flushing;
}

export async function enqueue(item: Omit<OutboxItem, "userId" | "createdAt" | "attempts">) {
  const session = getSession();
  if (!session) throw new Error("Sign in to save reports.");
  await (await db()).put("outbox", { ...item, userId: session.account.id, createdAt: Date.now(), attempts: 0 });
  await reload();
}

export async function discard(id: string) {
  const database = await db();
  // Dropping a case also drops the photos waiting on it.
  for (const item of await database.getAll("outbox")) {
    if (item.id === id || item.dependsOn === id) await database.delete("outbox", item.id);
  }
  await reload();
}

export async function retry(id: string) {
  const database = await db();
  const item = await database.get("outbox", id);
  if (item) await database.put("outbox", { ...item, failed: false });
  await flushOutbox();
}

/**
 * Try to send now; if there is no connection, keep it in the outbox instead.
 * Returns the server's response, or null when the item was queued.
 */
export async function sendOrQueue<T>(item: Omit<OutboxItem, "userId" | "createdAt" | "attempts">): Promise<T | null> {
  try {
    const result = (await send({ ...item, userId: "", createdAt: 0, attempts: 0 })) as T;
    for (const key of INVALIDATES[item.kind]) void queryClient.invalidateQueries({ queryKey: [key] });
    return result;
  } catch (err) {
    if (err instanceof ApiError && err.isNetwork) {
      await enqueue(item);
      return null;
    }
    throw err;
  }
}

// --- Background sync -------------------------------------------------------------

const AUTO_SYNC_KEY = "pawvita.autosync";

/** Settings → "Offline auto-sync". Off means items wait until "Sync now". */
export function isAutoSyncEnabled(): boolean {
  try {
    return localStorage.getItem(AUTO_SYNC_KEY) !== "false";
  } catch {
    return true;
  }
}

export function setAutoSync(enabled: boolean) {
  try {
    localStorage.setItem(AUTO_SYNC_KEY, String(enabled));
  } catch {
    // Preference only.
  }
  if (enabled) void flushOutbox();
}

let started = false;

/** Deliver queued items whenever there is a chance: start-up, reconnect, sign-in, and every 30 s. */
export function startOutboxSync() {
  if (started || typeof window === "undefined") return;
  started = true;
  const auto = () => {
    if (isAutoSyncEnabled()) void flushOutbox();
    else void reload();
  };
  window.addEventListener("online", auto);
  subscribeSession(auto);
  setInterval(() => {
    if (snapshot.some((i) => !i.failed)) auto();
  }, 30_000);
  auto();
}

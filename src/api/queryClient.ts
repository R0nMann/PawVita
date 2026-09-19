import { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { ApiError } from "./client";

/**
 * One cache for the whole app. Fetched data is also persisted to
 * localStorage so a farmer who opens the app without signal still sees their
 * herd and case statuses; it is cleared when they sign out.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000,
      // Serve cached data when offline instead of pausing with a spinner.
      networkMode: "offlineFirst",
      retry: (failures, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failures < 2;
      },
    },
    mutations: { networkMode: "always" },
  },
});

export const cachePersister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
  key: "pawvita.cache",
  throttleTime: 2000,
});

/** Forget everything cached for the previous user. */
export async function clearCachedData() {
  queryClient.clear();
  await cachePersister.removeClient();
}

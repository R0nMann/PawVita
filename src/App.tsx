import { RouterProvider } from "react-router";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { AuthProvider } from "./auth/AuthContext";
import { cachePersister, queryClient } from "./api/queryClient";
import { router } from "./routes";

export default function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: cachePersister, maxAge: 24 * 60 * 60 * 1000, buster: "v1" }}
      // Saved data shows instantly but may predate the last change (it is written
      // every few seconds), so refresh it in the background once restored.
      onSuccess={() => void queryClient.invalidateQueries()}
    >
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}

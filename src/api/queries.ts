import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import type { QueryValue } from "./client";
import {
  adminApi,
  admissionApi,
  advisoryApi,
  analyticsApi,
  caseApi,
  directoryApi,
  herdApi,
  labApi,
  notificationApi,
  publicApi,
  referenceApi,
  vaccinationApi,
  visitApi,
} from "./endpoints";
import type { OrganizationType, RegionLevel } from "./types";

type Params = Record<string, QueryValue>;

/**
 * Query hooks, one per resource. Keys start with the resource name so a
 * mutation can invalidate a whole family (`["cases"]`) at once.
 */

// --- Reference data (rarely changes; cached for the offline report flow) --------

export function useCatalog(lang?: string) {
  return useQuery({
    queryKey: ["catalog", lang ?? "en"],
    queryFn: () => referenceApi.catalog(lang),
    staleTime: 60 * 60 * 1000,
  });
}

export function useRegions(params: { parentId?: string; level?: RegionLevel } | null) {
  return useQuery({
    queryKey: ["regions", params],
    queryFn: () => referenceApi.regions(params ?? {}),
    enabled: params !== null,
    staleTime: 60 * 60 * 1000,
    select: (d) => d.items,
  });
}

export function useOrganizations(type?: OrganizationType) {
  return useQuery({
    queryKey: ["organizations", type],
    queryFn: () => referenceApi.organizations({ type }),
    staleTime: 10 * 60 * 1000,
    select: (d) => d.items,
  });
}

// --- Public (landing page) ---------------------------------------------------------

export const usePublicStats = () => useQuery({ queryKey: ["public", "stats"], queryFn: publicApi.stats, staleTime: 5 * 60_000 });
export const usePublicAlerts = () =>
  useQuery({ queryKey: ["public", "alerts"], queryFn: publicApi.alerts, staleTime: 5 * 60_000, select: (d) => d.items });
export const usePublicTrends = () => useQuery({ queryKey: ["public", "trends"], queryFn: () => publicApi.trends(7), staleTime: 5 * 60_000 });

// --- Herds, animals, vaccinations ----------------------------------------------------

export const useHerds = (params: Params = {}) =>
  useQuery({ queryKey: ["herds", params], queryFn: () => herdApi.list({ limit: 100, ...params }) });

export const useAnimals = (params: Params = {}) =>
  useQuery({ queryKey: ["animals", params], queryFn: () => herdApi.animals({ limit: 100, ...params }) });

export const useAnimal = (id: string | undefined) =>
  useQuery({ queryKey: ["animals", "detail", id], queryFn: () => herdApi.animal(id!), enabled: !!id });

export const useDueVaccinations = (params: Params = {}) =>
  useQuery({ queryKey: ["vaccinations", "due", params], queryFn: () => vaccinationApi.due({ limit: 100, ...params }) });

export const useVaccinations = (params: Params = {}) =>
  useQuery({ queryKey: ["vaccinations", "list", params], queryFn: () => vaccinationApi.list({ limit: 100, ...params }) });

// --- Cases, labs, visits, admissions ------------------------------------------------

export const useCases = (params: Params = {}, options: { refetchInterval?: number } = {}) =>
  useQuery({
    queryKey: ["cases", params],
    queryFn: () => caseApi.list({ limit: 50, ...params }),
    placeholderData: keepPreviousData,
    refetchInterval: options.refetchInterval,
  });

export const useCase = (id: string | undefined) =>
  useQuery({ queryKey: ["cases", "detail", id], queryFn: () => caseApi.get(id!), enabled: !!id });

export const useLabQueue = (params: Params = {}) =>
  useQuery({ queryKey: ["lab", params], queryFn: () => labApi.list({ limit: 100, ...params }), refetchInterval: 60_000 });

export const useLabRequest = (id: string | undefined) =>
  useQuery({ queryKey: ["lab", "detail", id], queryFn: () => labApi.get(id!), enabled: !!id });

export const useVisits = (params: Params = {}) =>
  useQuery({ queryKey: ["visits", params], queryFn: () => visitApi.list({ limit: 100, ...params }) });

export const useAdmissions = (params: Params = {}, enabled = true) =>
  useQuery({ queryKey: ["admissions", params], queryFn: () => admissionApi.list({ limit: 100, ...params }), enabled });

export const useVets = (params: Params = {}, enabled = true) =>
  useQuery({ queryKey: ["directory", "vets", params], queryFn: () => directoryApi.vets(params), enabled, select: (d) => d.items });

// --- Advisories & notifications -----------------------------------------------------

export const useAdvisories = (params: Params = {}) =>
  useQuery({ queryKey: ["advisories", params], queryFn: () => advisoryApi.list({ limit: 50, ...params }) });

export const useNotifications = (params: Params = {}) =>
  useQuery({
    queryKey: ["notifications", params],
    queryFn: () => notificationApi.list({ limit: 50, ...params }),
    refetchInterval: 60_000,
  });

/** Unread badge in the headers — a one-row query polled every minute. */
export function useUnreadCount(enabled = true) {
  const q = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => notificationApi.list({ limit: 1, unread: true }),
    refetchInterval: 60_000,
    enabled,
  });
  return q.data?.unreadCount ?? 0;
}

// --- Analytics & admin --------------------------------------------------------------

export const useOverview = (params: Params = {}) =>
  useQuery({ queryKey: ["analytics", "overview", params], queryFn: () => analyticsApi.overview(params) });
export const useRegionRollup = (params: Params = {}) =>
  useQuery({ queryKey: ["analytics", "regions", params], queryFn: () => analyticsApi.regions(params) });
export const useTrends = (params: Params = {}) =>
  useQuery({ queryKey: ["analytics", "trends", params], queryFn: () => analyticsApi.trends(params) });
export const useCoverage = (params: Params = {}) =>
  useQuery({ queryKey: ["analytics", "coverage", params], queryFn: () => analyticsApi.coverage(params) });
export const useSpeciesMix = (params: Params = {}) =>
  useQuery({ queryKey: ["analytics", "species", params], queryFn: () => analyticsApi.species(params), select: (d) => d.items });

export const useAdminUsers = (params: Params = {}) =>
  useQuery({ queryKey: ["admin", "users", params], queryFn: () => adminApi.users({ limit: 100, ...params }), placeholderData: keepPreviousData });
export const useSystemHealth = () =>
  useQuery({ queryKey: ["admin", "health"], queryFn: adminApi.systemHealth, refetchInterval: 30_000 });

/**
 * A mutation that refreshes the listed query families when it succeeds, so
 * every screen showing the changed records picks up the new state.
 */
export function useApiMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>, invalidate: QueryKey[] = []) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await Promise.all(invalidate.map((queryKey) => client.invalidateQueries({ queryKey })));
    },
  });
}

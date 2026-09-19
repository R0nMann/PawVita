import { useCoverage, useRegionRollup, useTrends } from "../../api/queries";
import { isoDay } from "../../lib/format";

/**
 * Chart-ready shapes for the official dashboards in both portals, built from
 * the analytics endpoints. Recharts wants one object per x-axis point.
 */

const PALETTE = ["#E63946", "#4A90D9", "#F4A300", "#1B4332", "#9B59B6", "#40916C"];
const monthLabel = new Intl.DateTimeFormat("en-IN", { month: "short" });

function monthsAgo(n: number) {
  const d = new Date();
  return isoDay(new Date(d.getFullYear(), d.getMonth() - n, 1));
}

export interface SeriesKey {
  key: string;
  label: string;
  color: string;
}

/**
 * Cases per month split by disease, top diseases first. Every month in the
 * window gets a row — the API only returns months that had cases, and a gap
 * would otherwise be drawn as a straight line across it.
 */
export function useDiseaseTrend(options: { months?: number; regionId?: string; top?: number } = {}) {
  const { months = 7, regionId, top = 4 } = options;
  const q = useTrends({ interval: "month", groupBy: "disease", from: monthsAgo(months - 1), regionId });
  const totals = new Map<string, number>();
  for (const b of q.data?.buckets ?? []) {
    for (const [k, n] of Object.entries(b.counts)) totals.set(k, (totals.get(k) ?? 0) + n);
  }
  const keys: SeriesKey[] = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([key], i) => ({
      key: key.toUpperCase(),
      label: key === "undiagnosed" ? "Undiagnosed" : key.toUpperCase(),
      color: PALETTE[i % PALETTE.length]!,
    }));
  const byMonth = new Map((q.data?.buckets ?? []).map((b) => [b.start.slice(0, 7), b]));
  const data = Array.from({ length: months }, (_, i) => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    const b = byMonth.get(isoDay(start).slice(0, 7));
    return {
      month: monthLabel.format(start),
      total: b?.total ?? 0,
      ...Object.fromEntries(keys.map((k) => [k.key, b?.counts[k.key.toLowerCase()] ?? 0])),
    };
  });
  return { query: q, data, keys, totals };
}

/** Case load and vaccination coverage for each child region of the caller's area. */
export function useRegionComparison(regionId?: string) {
  const rollup = useRegionRollup({ regionId });
  const coverage = useCoverage({ regionId });
  const coverageById = new Map((coverage.data?.items ?? []).map((c) => [c.regionId, c]));
  const names = new Set<string>();
  const rows = [
    ...(rollup.data?.items ?? []).map((r) => r.regionId),
    ...(coverage.data?.items ?? []).map((c) => c.regionId),
  ]
    .filter((id) => (names.has(id) ? false : (names.add(id), true)))
    .map((id) => {
      const r = rollup.data?.items.find((x) => x.regionId === id);
      const c = coverageById.get(id);
      return {
        regionId: id,
        region: r?.region.name ?? c?.region.name ?? "—",
        cases: r?.cases ?? 0,
        open: r?.open ?? 0,
        highRiskOpen: r?.highRiskOpen ?? 0,
        deaths: r?.deaths ?? 0,
        vaccinated: c?.coveragePercent ?? 0,
        animals: c?.animals ?? 0,
      };
    })
    .sort((a, b) => b.cases - a.cases);
  return { rows, level: rollup.data?.level ?? coverage.data?.level, isPending: rollup.isPending || coverage.isPending };
}

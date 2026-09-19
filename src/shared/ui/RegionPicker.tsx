import { useId, useState } from "react";
import { useRegions } from "../../api/queries";
import type { Region, RegionLevel } from "../../api/types";

const LEVELS: RegionLevel[] = ["state", "district", "block", "village"];
const LEVEL_LABEL: Record<RegionLevel, string> = {
  country: "Country",
  state: "State",
  district: "District",
  block: "Block / Taluka",
  village: "Village",
};

/**
 * Cascading State → District → Block → Village selects, backed by the region
 * hierarchy in the API. Reports the most specific region chosen so far.
 */
export default function RegionPicker({
  onChange,
  deepest = "village",
  className = "",
  selectClass = "w-full min-h-[48px] border border-gray-200 rounded-xl px-4 text-base bg-[#FAF9F6] focus-ring",
}: {
  onChange: (region: Region | null) => void;
  /** Stop at this level (staff pick a district, farmers a village). */
  deepest?: RegionLevel;
  className?: string;
  selectClass?: string;
}) {
  const [chosen, setChosen] = useState<Region[]>([]);
  const levels = LEVELS.slice(0, LEVELS.indexOf(deepest) + 1);

  function pick(index: number, region: Region | null) {
    const next = [...chosen.slice(0, index), ...(region ? [region] : [])];
    setChosen(next);
    onChange(next.at(-1) ?? null);
  }

  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${className}`}>
      {levels.map((level, i) => {
        const parent = i === 0 ? null : chosen[i - 1];
        if (i > 0 && !parent) return null;
        return (
          <LevelSelect
            key={level}
            level={level}
            parentId={parent?.id}
            value={chosen[i]?.id ?? ""}
            selectClass={selectClass}
            onPick={(region) => pick(i, region)}
          />
        );
      })}
    </div>
  );
}

function LevelSelect({
  level,
  parentId,
  value,
  onPick,
  selectClass,
}: {
  level: RegionLevel;
  parentId?: string;
  value: string;
  onPick: (region: Region | null) => void;
  selectClass: string;
}) {
  const id = useId();
  const regions = useRegions(parentId ? { parentId } : { level: "state" });
  const items = regions.data ?? [];
  if (parentId && regions.isSuccess && items.length === 0) return null;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-2">
        {LEVEL_LABEL[level]}
      </label>
      <select
        id={id}
        value={value}
        disabled={regions.isPending}
        onChange={(e) => onPick(items.find((r) => r.id === e.target.value) ?? null)}
        className={selectClass}
      >
        <option value="">{regions.isPending ? "Loading…" : `Choose ${LEVEL_LABEL[level].toLowerCase()}`}</option>
        {items.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      {regions.error ? <p className="text-xs text-red-600 mt-1">Couldn't load places. Check your connection.</p> : null}
    </div>
  );
}

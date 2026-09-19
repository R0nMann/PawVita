import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi, referenceApi } from "../../api/endpoints";
import { useApiMutation, useRegions } from "../../api/queries";
import type { Region, RegionLevel } from "../../api/types";
import { Field, inputClass } from "../ui/Modal";
import { FormError, Loading } from "../ui/States";

const CHILD: Partial<Record<RegionLevel, RegionLevel>> = {
  country: "state",
  state: "district",
  district: "block",
  block: "village",
};

const LEVEL_LABEL: Record<RegionLevel, string> = {
  country: "Country",
  state: "States",
  district: "Districts",
  block: "Blocks",
  village: "Villages",
};

/**
 * Browse and extend the location hierarchy that routes reports to vets, plus
 * a bulk import for the LGD (Local Government Directory) data.
 */
export default function RegionsAdmin() {
  const [trail, setTrail] = useState<Region[]>([]);
  const parent = trail.at(-1);
  const level: RegionLevel = parent ? (CHILD[parent.level] ?? "village") : "state";
  const children = useRegions(parent ? { parentId: parent.id } : { level: "state" });
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  // States hang off the national root region.
  const indiaId = useQuery({
    queryKey: ["regions", "root"],
    queryFn: async () => (await referenceApi.regions({ level: "country" })).items[0]?.id ?? null,
    staleTime: Infinity,
  });
  const add = useApiMutation(
    () => adminApi.createRegion({ name: name.trim(), level, parentId: parent?.id ?? indiaId.data, code: code.trim() || undefined }),
    [["regions"]],
  );

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-2 text-sm" aria-label="Region path">
        <button onClick={() => setTrail([])} className={`font-semibold ${trail.length ? "text-sky-600 hover:underline" : "text-gray-800"}`}>
          India
        </button>
        {trail.map((r, i) => (
          <span key={r.id} className="flex items-center gap-2">
            <span className="text-gray-300">/</span>
            <button
              onClick={() => setTrail(trail.slice(0, i + 1))}
              className={`font-semibold ${i < trail.length - 1 ? "text-sky-600 hover:underline" : "text-gray-800"}`}
            >
              {r.name}
            </button>
          </span>
        ))}
      </nav>

      <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5">
        <h3 className="font-display font-semibold text-gray-900 mb-4">
          {LEVEL_LABEL[level]} {parent ? `in ${parent.name}` : ""}
        </h3>
        {children.isPending && <Loading />}
        {children.isSuccess && children.data.length === 0 && (
          <p className="text-sm text-gray-500">None yet — add one below or import the LGD list.</p>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(children.data ?? []).map((r) => (
            <button
              key={r.id}
              disabled={r.level === "village"}
              onClick={() => setTrail([...trail, r])}
              className="text-left bg-[#FAF9F6] rounded-xl p-3 hover:bg-gray-100 disabled:hover:bg-[#FAF9F6] transition-colors"
            >
              <p className="font-semibold text-gray-800">{r.name}</p>
              <p className="text-xs text-gray-400">
                {r.code ?? "no code"}
                {r.lat != null ? ` · ${r.lat.toFixed(2)}, ${r.lng?.toFixed(2)}` : ""}
              </p>
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            add.mutate(undefined, { onSuccess: () => { setName(""); setCode(""); } });
          }}
          className="mt-5 pt-5 border-t border-gray-100 grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end"
        >
          <Field label={`New ${level}`}>
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </Field>
          <Field label="LGD code (optional)">
            <input value={code} onChange={(e) => setCode(e.target.value)} className={inputClass} />
          </Field>
          <button disabled={add.isPending} className="min-h-[44px] bg-[#1B4332] text-white px-5 rounded-xl text-sm font-semibold disabled:opacity-50">
            + Add
          </button>
        </form>
        <div className="mt-2"><FormError error={add.error} /></div>
      </div>

      <RegionImport />
    </div>
  );
}

/** CSV columns: code,name,level,parentCode,lat,lng — parents listed before children. */
function RegionImport() {
  const [preview, setPreview] = useState<{ code: string; name: string; level: RegionLevel; parentCode?: string; lat?: number; lng?: number }[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const run = useApiMutation(() => adminApi.importRegions(preview), [["regions"]]);

  function parse(text: string) {
    setParseError(null);
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const rows = lines[0]?.toLowerCase().startsWith("code") ? lines.slice(1) : lines;
    try {
      setPreview(
        rows.map((line, i) => {
          const [code, name, level, parentCode, lat, lng] = line.split(",").map((c) => c.trim());
          if (!code || !name || !level) throw new Error(`Line ${i + 1}: code, name and level are required.`);
          if (!["state", "district", "block", "village"].includes(level)) throw new Error(`Line ${i + 1}: unknown level "${level}".`);
          return {
            code,
            name,
            level: level as RegionLevel,
            parentCode: parentCode || undefined,
            lat: lat ? Number(lat) : undefined,
            lng: lng ? Number(lng) : undefined,
          };
        }),
      );
    } catch (err) {
      setPreview([]);
      setParseError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5">
      <h3 className="font-display font-semibold text-gray-900 mb-1">Bulk import (LGD)</h3>
      <p className="text-sm text-gray-500 mb-4">
        CSV with <code className="text-xs bg-gray-100 px-1 rounded">code,name,level,parentCode,lat,lng</code> — list parents before their
        children. Existing codes are updated. Up to 5,000 rows per file.
      </p>
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) parse(await file.text());
        }}
        className="text-sm"
      />
      {parseError && <p className="text-sm text-red-600 mt-2">{parseError}</p>}
      {preview.length > 0 && (
        <div className="mt-4 flex items-center gap-3">
          <p className="text-sm text-gray-700">{preview.length} rows ready.</p>
          <button
            disabled={run.isPending}
            onClick={() => run.mutate(undefined)}
            className="bg-[#1B4332] text-white px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {run.isPending ? "Importing…" : "Import"}
          </button>
        </div>
      )}
      {run.isSuccess && (
        <p className="text-sm text-green-700 font-semibold mt-3">
          ✓ {run.data.created} created, {run.data.updated} updated.
        </p>
      )}
      <FormError error={run.error} />
    </div>
  );
}

import { useMemo, useState } from "react";
import { Link } from "react-router";
import { admissionApi, herdApi } from "../../../../api/endpoints";
import { useAdmissions, useApiMutation, useVaccinations } from "../../../../api/queries";
import type { AdmissionListItem, Region, Species } from "../../../../api/types";
import { useSession } from "../../../../auth/AuthContext";
import { formatDate, SPECIES_LABEL, speciesEmoji } from "../../../../lib/format";
import { newId } from "../../../../offline/outbox";
import Modal, { Field, inputClass } from "../../../../shared/ui/Modal";
import RegionPicker from "../../../../shared/ui/RegionPicker";
import { EmptyState, FormError, QueryState } from "../../../../shared/ui/States";
import { WARD_STATUS, wardLink, wardStatus, type WardStatus } from "./wardStatus";

const FILTERS: ("all" | WardStatus)[] = ["all", "healthy", "critical", "recovering", "under-observation"];
const INVALIDATE = [["admissions"], ["animals"], ["cases"]];

export default function MyAnimals() {
  const session = useSession();
  const [filter, setFilter] = useState<"all" | WardStatus>("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [admitting, setAdmitting] = useState(false);
  const [discharging, setDischarging] = useState<AdmissionListItem | null>(null);
  const admissionsQ = useAdmissions({ active: true }, !!session.account.organizationId);
  const vaccinationsQ = useVaccinations();

  const vaccinesByAnimal = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const v of vaccinationsQ.data?.items ?? []) {
      map.set(v.animalId, (map.get(v.animalId) ?? new Set()).add(v.vaccineCode.toUpperCase()));
    }
    return map;
  }, [vaccinationsQ.data]);

  if (!session.account.organizationId) {
    return <EmptyState icon="🏥" title="No hospital linked" body="Ask an administrator to link your account to your hospital." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Animal Records</h1>
          <p className="text-gray-500 text-sm">Digital herd management — {admissionsQ.data?.items.length ?? "…"} animals admitted</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setAdmitting(true)} className="border-2 border-[#1B4332] text-[#1B4332] font-semibold px-4 py-2 rounded-xl text-sm">+ Admit</button>
          <Link to="/hospital/ward/report-symptom" className="gradient-primary text-white font-semibold px-4 py-2 rounded-xl text-sm">+ Report</Link>
        </div>
      </div>

      <QueryState query={admissionsQ} loadingLabel="Loading ward…">
        {(data) => {
          const counts = new Map<string, number>();
          for (const a of data.items) counts.set(wardStatus(a), (counts.get(wardStatus(a)) ?? 0) + 1);
          const filtered = filter === "all" ? data.items : data.items.filter(a => wardStatus(a) === filter);
          return (
            <>
              <div className="flex items-center justify-between">
                <div className="flex gap-2 flex-wrap">
                  {FILTERS.map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${filter === f ? "gradient-primary text-white" : "bg-white border border-[#E8E5DF] text-gray-600 hover:border-[#1B4332]"}`}
                    >
                      {f === "all" ? `All (${data.items.length})` : `${f.replace("-", " ")} (${counts.get(f) ?? 0})`}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1">
                  <button aria-label="Grid view" onClick={() => setView("grid")} className={`p-2 rounded-lg ${view === "grid" ? "bg-[#1B4332] text-white" : "bg-white border border-gray-200 text-gray-600"}`}>⊞</button>
                  <button aria-label="List view" onClick={() => setView("list")} className={`p-2 rounded-lg ${view === "list" ? "bg-[#1B4332] text-white" : "bg-white border border-gray-200 text-gray-600"}`}>≡</button>
                </div>
              </div>

              {data.items.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#E8E5DF]">
                  <EmptyState icon="🐄" title="No animals admitted" body="Admit an animal by its ear tag, or register a walk-in." action={<button onClick={() => setAdmitting(true)} className="gradient-primary text-white font-semibold px-4 py-2 rounded-xl text-sm">+ Admit animal</button>} />
                </div>
              ) : view === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map(a => {
                    const s = WARD_STATUS[wardStatus(a)];
                    const vaccines = [...(vaccinesByAnimal.get(a.animal.id) ?? [])];
                    return (
                      <div key={a.id} className={`bg-white rounded-2xl border-2 p-5 hover:shadow-md transition-all ${wardStatus(a) === "critical" ? "border-[#E63946]/40" : "border-[#E8E5DF]"}`}>
                        <Link to={wardLink(a)} className="block">
                          <div className="flex items-start justify-between mb-4">
                            <div className="text-4xl">{speciesEmoji(a.animal.species)}</div>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${s.bg} ${s.color}`}>{s.label}</span>
                          </div>
                          <h3 className="font-display font-bold text-gray-900 text-lg">{a.animal.name ?? "Unnamed"}</h3>
                          <p className="text-xs text-gray-500 mb-3">{[SPECIES_LABEL[a.animal.species], a.animal.breed].filter(Boolean).join(" · ")}</p>
                          <div className="text-xs text-gray-500 space-y-1">
                            <p>🏷️ Tag: {a.animal.tagNumber ?? "—"}</p>
                            <p>🏥 Ward: {a.ward}</p>
                            <p>📅 Admitted: {formatDate(a.admittedAt)}</p>
                            <p>🏠 Owner: {a.owner.fullName}{a.owner.phone ? ` · ${a.owner.phone}` : ""}</p>
                            {a.case && <p>📋 Case {a.case.caseNumber}</p>}
                          </div>
                        </Link>
                        <div className="mt-4 pt-3 border-t border-gray-100">
                          <p className="text-xs text-gray-500 mb-2">Vaccines on record:</p>
                          <div className="flex flex-wrap gap-1">
                            {vaccines.length === 0 && <span className="text-xs text-gray-400">None recorded</span>}
                            {vaccines.map(v => (
                              <span key={v} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">{v}</span>
                            ))}
                          </div>
                          <button onClick={() => setDischarging(a)} className="mt-3 text-xs font-semibold text-[#4A90D9] hover:underline">Discharge →</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {["Animal", "Species/Breed", "Tag", "Ward", "Status", "Admitted", "Action"].map(h => (
                          <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.map(a => {
                        const s = WARD_STATUS[wardStatus(a)];
                        return (
                          <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <span className="text-xl">{speciesEmoji(a.animal.species)}</span>
                                <span className="font-semibold text-sm text-gray-900">{a.animal.name ?? "Unnamed"}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{[SPECIES_LABEL[a.animal.species], a.animal.breed].filter(Boolean).join(" · ")}</td>
                            <td className="px-4 py-3 text-xs font-mono text-gray-500">{a.animal.tagNumber ?? "—"}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{a.ward}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-bold px-2 py-1 rounded-full ${s.bg} ${s.color}`}>{s.label}</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">{formatDate(a.admittedAt)}</td>
                            <td className="px-4 py-3 flex gap-3">
                              <Link to={wardLink(a)} className="text-xs text-[#4A90D9] hover:underline font-medium">View →</Link>
                              <button onClick={() => setDischarging(a)} className="text-xs text-gray-500 hover:underline font-medium">Discharge</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          );
        }}
      </QueryState>

      <AdmitModal open={admitting} onClose={() => setAdmitting(false)} />
      <DischargeModal admission={discharging} onClose={() => setDischarging(null)} />
    </div>
  );
}

const SPECIES_OPTIONS: Species[] = ["cattle", "buffalo", "goat", "sheep", "pig", "poultry", "horse", "camel", "other"];

/** Admit a known animal by ear tag, or register a walk-in (owner + animal) and admit it. */
function AdmitModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<"tag" | "new">("tag");
  const [tag, setTag] = useState("");
  const [ward, setWard] = useState("Ward A");
  const [reason, setReason] = useState("");
  const [owner, setOwner] = useState({ fullName: "", phone: "" });
  const [region, setRegion] = useState<Region | null>(null);
  const [animal, setAnimal] = useState({ name: "", species: "cattle" as Species, breed: "", tagNumber: "" });

  const admit = useApiMutation(async () => {
    if (mode === "tag") {
      return admissionApi.admit({ tagNumber: tag.trim(), ward, reason: reason || undefined });
    }
    const herd = await herdApi.create({
      id: newId(),
      name: `${owner.fullName}'s herd`,
      regionId: region?.id,
      owner: { fullName: owner.fullName, phone: owner.phone || undefined },
    });
    const created = await herdApi.createAnimal({
      id: newId(),
      herdId: herd.id,
      name: animal.name || undefined,
      species: animal.species,
      breed: animal.breed || undefined,
      tagNumber: animal.tagNumber || undefined,
    });
    return admissionApi.admit({ animalId: created.id, ward, reason: reason || undefined });
  }, INVALIDATE);

  return (
    <Modal open={open} onClose={onClose} title="Admit an animal" wide>
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 w-fit" role="tablist">
        {(["tag", "new"] as const).map(m => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${mode === m ? "bg-white shadow-sm text-[#1B4332]" : "text-gray-500"}`}
          >
            {m === "tag" ? "Registered animal" : "New walk-in"}
          </button>
        ))}
      </div>
      <form
        onSubmit={e => {
          e.preventDefault();
          admit.mutate(undefined, { onSuccess: () => { setTag(""); setReason(""); onClose(); } });
        }}
        className="space-y-4"
      >
        {mode === "tag" ? (
          <Field label="Ear tag number" hint="The animal must already be registered in PawVita.">
            <input required value={tag} onChange={e => setTag(e.target.value)} placeholder="GJ-TG-100002" className={inputClass} />
          </Field>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Owner's name">
                <input required value={owner.fullName} onChange={e => setOwner({ ...owner, fullName: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Owner's mobile">
                <input inputMode="numeric" value={owner.phone} onChange={e => setOwner({ ...owner, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} className={inputClass} />
              </Field>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Owner's village</p>
              <RegionPicker onChange={setRegion} selectClass={inputClass} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Animal name">
                <input value={animal.name} onChange={e => setAnimal({ ...animal, name: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Species">
                <select value={animal.species} onChange={e => setAnimal({ ...animal, species: e.target.value as Species })} className={inputClass}>
                  {SPECIES_OPTIONS.map(s => <option key={s} value={s}>{SPECIES_LABEL[s]}</option>)}
                </select>
              </Field>
              <Field label="Breed">
                <input value={animal.breed} onChange={e => setAnimal({ ...animal, breed: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Ear tag (optional)">
                <input value={animal.tagNumber} onChange={e => setAnimal({ ...animal, tagNumber: e.target.value })} className={inputClass} />
              </Field>
            </div>
          </>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Ward">
            <input required value={ward} onChange={e => setWard(e.target.value)} placeholder="Ward A, ICU…" className={inputClass} />
          </Field>
          <Field label="Reason (optional)">
            <input value={reason} onChange={e => setReason(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <FormError error={admit.error} />
        <button disabled={admit.isPending} className="w-full gradient-primary text-white font-bold py-3 rounded-xl disabled:opacity-50">
          {admit.isPending ? "Admitting…" : "Admit animal"}
        </button>
      </form>
    </Modal>
  );
}

function DischargeModal({ admission, onClose }: { admission: AdmissionListItem | null; onClose: () => void }) {
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"healthy" | "recovering" | "under_treatment">("recovering");
  const discharge = useApiMutation(
    () => admissionApi.discharge(admission!.id, { notes: notes || undefined, animalStatus: status }),
    INVALIDATE,
  );
  return (
    <Modal open={!!admission} onClose={onClose} title={`Discharge ${admission?.animal.name ?? "animal"}`}>
      <form
        onSubmit={e => {
          e.preventDefault();
          discharge.mutate(undefined, { onSuccess: () => { setNotes(""); onClose(); } });
        }}
        className="space-y-4"
      >
        <Field label="Condition at discharge">
          <select value={status} onChange={e => setStatus(e.target.value as typeof status)} className={inputClass}>
            <option value="healthy">Healthy</option>
            <option value="recovering">Recovering</option>
            <option value="under_treatment">Still under treatment</option>
          </select>
        </Field>
        <Field label="Discharge notes">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm bg-[#FAF9F6]" />
        </Field>
        <FormError error={discharge.error} />
        <button disabled={discharge.isPending} className="w-full gradient-primary text-white font-bold py-3 rounded-xl disabled:opacity-50">
          {discharge.isPending ? "Discharging…" : "Discharge"}
        </button>
      </form>
    </Modal>
  );
}

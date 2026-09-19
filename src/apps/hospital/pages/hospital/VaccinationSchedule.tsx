import { useAdmissions, useCases, useDueVaccinations, useVaccinations } from "../../../../api/queries";
import { useSession } from "../../../../auth/AuthContext";
import { formatDate, isoDay, SPECIES_LABEL, speciesEmoji } from "../../../../lib/format";
import { EmptyState } from "../../../../shared/ui/States";

export default function VaccinationSchedule() {
  const session = useSession();
  const admissionsQ = useAdmissions({ active: true }, !!session.account.organizationId);
  const recordsQ = useVaccinations();
  const dueQ = useDueVaccinations({ withinDays: 60 });
  const myReports = useCases({ reportedByMe: true, limit: 1 });

  const animals = (admissionsQ.data?.items ?? []).map(a => a.animal);
  const records = recordsQ.data?.items ?? [];
  const due = dueQ.data?.items ?? [];
  const today = isoDay();
  const animalIds = new Set(animals.map(a => a.id));
  const wardDue = due.filter(v => animalIds.has(v.animalId));
  const overdueAnimals = new Set(wardDue.filter(v => v.nextDueOn < today).map(v => v.animalId));
  const vaccinated = new Set(records.map(r => r.animalId));
  const compliant = animals.filter(a => vaccinated.has(a.id) && !overdueAnimals.has(a.id)).length;
  const score = animals.length ? Math.round((compliant / animals.length) * 100) : 0;
  const dueSoon = wardDue.filter(v => v.status === "upcoming").length;
  const overdue = wardDue.filter(v => v.status === "overdue").length;

  const fmdCurrent = animals.length > 0 && animals.every(a =>
    records.some(r => r.animalId === a.id && r.vaccineCode === "fmd" && (!r.nextDueOn || r.nextDueOn >= today)),
  );
  const badges = [
    { name: "First Report", earned: (myReports.data?.items.length ?? 0) > 0, icon: "🏅" },
    { name: "FMD Champion", earned: fmdCurrent, icon: "💉" },
    { name: "Zero Missed", earned: animals.length > 0 && overdue === 0, icon: "🎯" },
    { name: "Perfect Month", earned: score >= 90, icon: "⭐" },
  ];

  // One row per vaccine due in the ward.
  const byVaccine = new Map<string, { vaccine: string; species: Set<string>; animals: number; dueDate: string; status: "overdue" | "upcoming" }>();
  for (const v of wardDue) {
    const row = byVaccine.get(v.vaccineCode) ?? { vaccine: v.vaccineName, species: new Set(), animals: 0, dueDate: v.nextDueOn, status: v.status };
    row.species.add(SPECIES_LABEL[v.species]);
    row.animals += 1;
    if (v.nextDueOn < row.dueDate) row.dueDate = v.nextDueOn;
    if (v.status === "overdue") row.status = "overdue";
    byVaccine.set(v.vaccineCode, row);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Vaccination Schedule</h1>
        <p className="text-gray-500 text-sm">Keep your animals protected — vaccination reminders and compliance tracking</p>
      </div>

      {/* Compliance Score */}
      <div className="gradient-primary rounded-3xl p-6 text-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-white/70 text-sm font-body">Vaccination Compliance Score</p>
            <p className="text-5xl font-display font-bold mt-1">{score}<span className="text-2xl">%</span></p>
            <p className="text-white/60 text-sm mt-1">Target: 90% · Current: {score >= 90 ? "Excellent" : score >= 70 ? "Good" : "Needs attention"}</p>
          </div>
          <div className="w-24 h-24 relative">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="10" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#F4A300" strokeWidth="10"
                strokeDasharray={`${2 * Math.PI * 40 * score / 100} ${2 * Math.PI * 40}`}
                strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">{score}%</span>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
            <p className="text-2xl font-bold">{animals.length}</p>
            <p className="text-white/60 text-xs">Animals</p>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
            <p className="text-2xl font-bold">{dueSoon}</p>
            <p className="text-white/60 text-xs">Due Soon</p>
          </div>
          <div className="bg-red-400/30 rounded-xl px-4 py-2 text-center border border-red-400/30">
            <p className="text-2xl font-bold text-red-200">{overdue}</p>
            <p className="text-red-300 text-xs">Overdue</p>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5">
        <h2 className="font-display font-semibold text-gray-900 mb-4">Compliance Badges</h2>
        <div className="grid grid-cols-4 gap-4">
          {badges.map(b => (
            <div key={b.name} className={`text-center p-3 rounded-xl border-2 ${b.earned ? "border-[#F4A300] bg-amber-50" : "border-gray-200 bg-gray-50 opacity-50"}`}>
              <span className="text-2xl">{b.icon}</span>
              <p className={`text-xs font-medium mt-1 ${b.earned ? "text-amber-700" : "text-gray-500"}`}>{b.name}</p>
              {b.earned && <span className="text-xs text-amber-600 font-bold">Earned!</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Schedule */}
      <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-display font-semibold text-gray-900">Upcoming Vaccinations</h2>
        </div>
        {dueQ.isSuccess && byVaccine.size === 0 ? (
          <EmptyState icon="💉" title="Nothing due in the next 60 days" />
        ) : (
          <div className="divide-y divide-gray-50">
            {[...byVaccine.values()].map(v => (
              <div key={v.vaccine} className={`px-5 py-4 ${v.status === "overdue" ? "bg-red-50/30" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${v.status === "overdue" ? "bg-red-100" : "bg-amber-100"}`}>
                      💉
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-gray-900">{v.vaccine}</h3>
                      <p className="text-sm text-gray-500">{[...v.species].join("/")} · {v.animals} animals</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full block mb-1 ${v.status === "overdue" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>
                      {v.status.toUpperCase()}
                    </span>
                    <p className="text-xs text-gray-500">Due: {formatDate(v.dueDate)}</p>
                  </div>
                </div>
                {v.status === "overdue" && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                    ⏰ This vaccination is overdue. Contact your vet officer to schedule it.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Animal Vaccine Status */}
      <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-display font-semibold text-gray-900">Animal Vaccination Records</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {animals.length === 0 && <p className="px-5 py-6 text-sm text-gray-500">No animals admitted.</p>}
          {animals.map(a => {
            const mine = records.filter(r => r.animalId === a.id);
            const last = mine.reduce<string | null>((m, r) => (!m || r.administeredOn > m ? r.administeredOn : m), null);
            const codes = [...new Set(mine.map(r => r.vaccineCode.toUpperCase()))];
            return (
              <div key={a.id} className="px-5 py-3 flex items-center gap-4">
                <span className="text-xl">{speciesEmoji(a.species)}</span>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-900">{a.name ?? "Unnamed"} <span className="text-gray-400 font-normal text-xs">({SPECIES_LABEL[a.species]})</span></p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {codes.length === 0 && <span className="text-xs text-gray-400">No vaccinations recorded</span>}
                    {codes.map(v => (
                      <span key={v} className={`text-xs px-2 py-0.5 rounded border ${overdueAnimals.has(a.id) ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-green-50 text-green-700 border-green-200"}`}>✓ {v}</span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-500 shrink-0">Last: {last ? formatDate(last) : "—"}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

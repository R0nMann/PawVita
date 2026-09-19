import { Link } from "react-router";
import StatCard from "../../components/StatCard";
import { useAdmissions, useCases, useDueVaccinations, useNotifications } from "../../../../api/queries";
import { useSession } from "../../../../auth/AuthContext";
import { NOTIFICATION_ICON } from "../../../../lib/links";
import { formatDate, SPECIES_LABEL, speciesEmoji, timeAgo } from "../../../../lib/format";
import { EmptyState, Loading } from "../../../../shared/ui/States";
import { WARD_STATUS, wardLink, wardStatus } from "./wardStatus";

// Stand-in for the AI outbreak-risk score until the AI layer exists (src/shared/ai/preview.ts).
const NEARBY_RISK = { level: "medium", topDisease: "Foot & Mouth Disease", score: 62 };

export default function HospitalHome() {
  const session = useSession();
  const hasHospital = !!session.account.organizationId;
  const admissionsQ = useAdmissions({ active: true }, hasHospital);
  const openCases = useCases({ open: true, limit: 100 });
  const dueQ = useDueVaccinations({ withinDays: 30 });
  const notificationsQ = useNotifications({ limit: 4 });

  const admitted = admissionsQ.data?.items ?? [];
  const critical = admitted.filter(a => wardStatus(a) === "critical").length;
  const pendingReports = (openCases.data?.items ?? []).filter(c => c.status === "active").length;
  const due = dueQ.data?.items ?? [];
  const overdue = due.filter(v => v.status === "overdue").length;

  // One row per vaccine: how many animals, earliest due date, worst status.
  const byVaccine = new Map<string, { vaccine: string; species: Set<string>; animals: number; dueDate: string; status: "overdue" | "upcoming" }>();
  for (const v of due) {
    const row = byVaccine.get(v.vaccineCode) ?? { vaccine: v.vaccineName, species: new Set(), animals: 0, dueDate: v.nextDueOn, status: v.status };
    row.species.add(SPECIES_LABEL[v.species]);
    row.animals += 1;
    if (v.nextDueOn < row.dueDate) row.dueDate = v.nextDueOn;
    if (v.status === "overdue") row.status = "overdue";
    byVaccine.set(v.vaccineCode, row);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Ward Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">{session.account.organization?.name ?? "Veterinary Hospital"} — {session.name}</p>
        </div>
        <Link to="/hospital/ward/report-symptom" className="gradient-primary text-white font-semibold px-5 py-2.5 rounded-xl text-sm shadow-md hover:opacity-90 transition-all">
          + Report Symptom
        </Link>
      </div>

      {/* Risk Banner */}
      {NEARBY_RISK.level === "medium" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-xl">⚠️</div>
          <div>
            <p className="font-semibold text-amber-800 font-display">Elevated Risk — {session.account.region?.name ?? "your district"}</p>
            <p className="text-sm text-amber-700">Active {NEARBY_RISK.topDisease} alert in your district. Risk score: {NEARBY_RISK.score}/100. Apply enhanced biosecurity protocols.</p>
          </div>
          <Link to="/hospital/ward/alerts" className="ml-auto text-amber-600 text-sm font-semibold hover:underline shrink-0">View Alerts →</Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Animals Admitted" value={admitted.length} icon="🐄" accent="green" />
        <StatCard label="Critical Cases" value={critical} icon="🔴" accent="red" />
        <StatCard label="New Reports" value={pendingReports} icon="📋" accent="amber" />
        <StatCard label="Vaccinations Due" value={due.length} icon="💉" accent="sky" change={overdue ? `${overdue} overdue` : undefined} changePositive={false} />
      </div>

      {/* Digital Twin Herd */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-semibold text-gray-900">Digital Herd View</h2>
          <Link to="/hospital/ward/my-animals" className="text-sm text-[#4A90D9] hover:underline">View all animals →</Link>
        </div>
        {!hasHospital ? (
          <p className="text-sm text-gray-500">Your account is not linked to a hospital yet. Ask an administrator.</p>
        ) : admissionsQ.isPending ? (
          <Loading label="Loading ward…" />
        ) : admitted.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8E5DF]">
            <EmptyState icon="🏥" title="No animals admitted" body="Admit animals from the My Animals page to see them here." />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {admitted.map(a => {
              const s = WARD_STATUS[wardStatus(a)];
              return (
                <Link key={a.id} to={wardLink(a)}>
                  <div className={`bg-white rounded-2xl p-4 border-2 cursor-pointer hover:shadow-md transition-all ${s.border}`}>
                    <div className="text-3xl text-center mb-2">{speciesEmoji(a.animal.species)}</div>
                    <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${s.dot}`}></div>
                    <p className="font-display font-semibold text-sm text-center text-gray-800">{a.animal.name ?? a.animal.tagNumber ?? "Unnamed"}</p>
                    <p className="text-xs text-center text-gray-500">{SPECIES_LABEL[a.animal.species]} · {a.ward}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        <div className="flex items-center gap-6 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span> Healthy</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#4A90D9] inline-block"></span> Under Observation</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#F4A300] inline-block"></span> Recovering</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#E63946] inline-block"></span> Critical</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Alerts */}
        <div className="bg-white rounded-2xl border border-[#E8E5DF] shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-display font-semibold text-gray-900">Recent Alerts</h2>
            <Link to="/hospital/notifications" className="text-xs text-[#4A90D9] hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {notificationsQ.data?.items.length === 0 && <p className="px-5 py-6 text-sm text-gray-500">No notifications yet.</p>}
            {(notificationsQ.data?.items ?? []).map(n => (
              <div key={n.id} className={`px-5 py-3 flex items-start gap-3 ${!n.readAt ? "bg-blue-50/20" : ""}`}>
                <span className="text-lg">{NOTIFICATION_ICON[n.type] ?? "ℹ️"}</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                  <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vaccination Due */}
        <div className="bg-white rounded-2xl border border-[#E8E5DF] shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-display font-semibold text-gray-900">Vaccination Schedule</h2>
            <Link to="/hospital/ward/vaccination-schedule" className="text-xs text-[#4A90D9] hover:underline">Full schedule</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {dueQ.isSuccess && byVaccine.size === 0 && <p className="px-5 py-6 text-sm text-gray-500">Nothing due in the next 30 days.</p>}
            {[...byVaccine.values()].map(v => (
              <div key={v.vaccine} className="px-5 py-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${v.status === "overdue" ? "bg-red-100" : "bg-amber-100"}`}>
                  💉
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{v.vaccine}</p>
                  <p className="text-xs text-gray-500">{[...v.species].join("/")} · {v.animals} animals · Due {formatDate(v.dueDate)}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${v.status === "overdue" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>
                  {v.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

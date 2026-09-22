import { Link } from "react-router";
import StatCard from "../../components/StatCard";
import { useCases, useCatalog, useVets, useVisits } from "../../../../api/queries";
import { useSession } from "../../../../auth/AuthContext";
import {
  CASE_STATUS_LABEL,
  CASE_STATUS_STYLE,
  diseaseName,
  formatDate,
  formatTime,
  isoOffset,
  RISK_LABEL,
  riskKey,
  SPECIES_LABEL,
  speciesEmoji,
  symptomLabel,
} from "../../../../lib/format";
import { previewDiagnosis } from "../../../../shared/ai/preview";
import { EmptyState, QueryState } from "../../../../shared/ui/States";

const RISK_TILE = { high: "bg-red-100", moderate: "bg-amber-100", low: "bg-green-100", unassessed: "bg-gray-100" };
const RISK_BADGE = {
  high: "bg-red-100 text-red-600",
  moderate: "bg-amber-100 text-amber-700",
  low: "bg-green-100 text-green-700",
  unassessed: "bg-gray-100 text-gray-600",
};

export default function DoctorDashboard() {
  const session = useSession();
  const catalog = useCatalog();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const queue = useCases({ open: true, sort: "priority", limit: 50 }, { refetchInterval: 60_000 });
  const resolved = useCases({ status: "resolved", updatedSince: monthStart, limit: 100 });
  const visits = useVisits({ mine: true, status: ["scheduled", "in_progress"], from: isoOffset(-12 * 3600_000) });
  const vets = useVets({ organizationId: session.account.organizationId ?? undefined });

  const open = queue.data?.items ?? [];
  const critical = open.filter(c => c.riskLevel === "high").length;
  const newToday = open.filter(c => Date.now() - new Date(c.createdAt).getTime() < 24 * 3600_000).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Veterinary Officer Dashboard</h1>
        <p className="text-gray-500 text-sm">
          {[session.name, session.account.organization?.name, session.account.region?.name].filter(Boolean).join(" · ")}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Cases" value={open.length} icon="🩺" accent="green" change={newToday ? `${newToday} new` : undefined} changePositive={false} />
        <StatCard label="Critical Cases" value={critical} icon="🔴" accent="red" />
        <StatCard label="Resolved This Month" value={resolved.data?.items.length ?? 0} icon="✅" accent="sky" />
        <StatCard label="Field Visits Scheduled" value={visits.data?.items.length ?? 0} icon="🗺️" accent="amber" />
      </div>

      {/* Case Priority Queue */}
      <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-display font-semibold text-gray-900">Priority Case Queue</h2>
          <span className="text-xs text-gray-500">{open.length}{queue.data?.hasMore ? "+" : ""} open cases</span>
        </div>
        <QueryState query={queue} loadingLabel="Loading cases…">
          {(data) =>
            data.items.length === 0 ? (
              <EmptyState icon="🌿" title="No open cases" body="New reports in your area and referrals to your hospital appear here." />
            ) : (
              <div className="divide-y divide-gray-50">
                {data.items.map(c => {
                  const risk = riskKey(c.riskLevel);
                  const ai = previewDiagnosis(c.symptomCodes)[0]!;
                  return (
                    <Link key={c.id} to={`/hospital/doctor/case/${c.id}`}>
                      <div className="px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${RISK_TILE[risk]}`}>
                              {speciesEmoji(c.animal?.species)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-display font-semibold text-gray-900">{c.animal?.name ?? c.herd.name}</h3>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${RISK_BADGE[risk]}`}>{RISK_LABEL[risk]}</span>
                              </div>
                              <p className="text-sm text-gray-500">
                                {c.suspectedDiseaseCode ? diseaseName(c.suspectedDiseaseCode, catalog.data) : ai.disease}
                                {c.animal ? ` · ${SPECIES_LABEL[c.animal.species]}` : ""} · {c.owner.fullName}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {c.symptomCodes.slice(0, 3).map(s => (
                                  <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{symptomLabel(s, catalog.data)}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-xs font-medium px-2 py-1 rounded-full block mb-1 ${CASE_STATUS_STYLE[c.status]}`}>
                              {CASE_STATUS_LABEL[c.status]}
                            </span>
                            <p className="text-xs text-gray-400">AI: {ai.confidence}% confident</p>
                            <p className="text-xs text-[#4A90D9] mt-1 font-medium">View case →</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )
          }
        </QueryState>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Field Visits */}
        <div className="bg-white rounded-2xl border border-[#E8E5DF]">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-display font-semibold text-gray-900">Upcoming Field Visits</h2>
            <Link to="/hospital/doctor/field-visits" className="text-xs text-[#4A90D9] hover:underline">Full calendar</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {visits.isSuccess && visits.data.items.length === 0 && <p className="px-5 py-6 text-sm text-gray-500">No visits scheduled.</p>}
            {(visits.data?.items ?? []).slice(0, 3).map(v => (
              <div key={v.id} className="px-5 py-3 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base ${v.status === "in_progress" ? "bg-amber-100" : "bg-blue-100"}`}>
                  🚗
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-900">{v.herd.name}</p>
                  <p className="text-xs text-gray-500">{formatDate(v.scheduledAt)} · {formatTime(v.scheduledAt)} · {v.purpose ?? v.type.replace("_", " ")}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${v.status === "in_progress" ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"}`}>
                  {v.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Team Vets */}
        <div className="bg-white rounded-2xl border border-[#E8E5DF]">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-display font-semibold text-gray-900">Veterinary Team</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {vets.isSuccess && vets.data.length === 0 && <p className="px-5 py-6 text-sm text-gray-500">No colleagues found.</p>}
            {(vets.data ?? []).map(v => (
              <div key={v.id} className="px-5 py-3 flex items-center gap-4">
                <div className="w-10 h-10 gradient-primary rounded-full flex items-center justify-center text-white font-bold font-display text-sm">
                  {v.fullName.replace(/^Dr\.?\s+/, "").charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-900">{v.fullName}{v.id === session.account.id ? " (you)" : ""}</p>
                  <p className="text-xs text-gray-500">{[v.organization?.name, v.region?.name].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${v.openCases < 5 ? "bg-green-500" : "bg-amber-400"}`}></div>
                  <span className="text-xs text-gray-600">{v.openCases} open</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

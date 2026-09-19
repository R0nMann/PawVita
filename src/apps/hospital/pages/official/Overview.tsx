import { Link } from "react-router";
import StatCard from "../../components/StatCard";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useCases, useCatalog, useOverview, useSpeciesMix, useVets } from "../../../../api/queries";
import { diseaseName, formatDate, formatDateTime, SPECIES_LABEL } from "../../../../lib/format";
import type { Species } from "../../../../api/types";
import { useDiseaseTrend, useRegionComparison } from "../../../../shared/analytics/charts";

const SPECIES_COLORS = ["#1B4332", "#2D6A4F", "#F4A300", "#4A90D9", "#E63946", "#9B59B6", "#40916C"];
const RISK_ORDER = { high: 0, moderate: 1, low: 2, unassessed: 3 } as const;

export default function OfficialOverview() {
  const overviewQ = useOverview();
  const trend = useDiseaseTrend({ months: 6, top: 5 });
  const species = useSpeciesMix();
  const vets = useVets();
  const regions = useRegionComparison();
  const openCases = useCases({ open: true, limit: 100 });
  const catalog = useCatalog();
  const o = overviewQ.data;

  const totalSpecies = (species.data ?? []).reduce((s, x) => s + x.cases, 0);
  const speciesData = (species.data ?? []).map((s, i) => ({
    name: s.species === "unspecified" ? "Herd reports" : SPECIES_LABEL[s.species as Species] ?? s.species,
    value: totalSpecies ? Math.round((s.cases / totalSpecies) * 100) : 0,
    color: SPECIES_COLORS[i % SPECIES_COLORS.length],
  }));

  // Registry: open cases grouped by district and disease.
  const registry = new Map<string, { disease: string; district: string; species: Set<string>; cases: number; severity: keyof typeof RISK_ORDER; latest: string }>();
  for (const c of openCases.data?.items ?? []) {
    const district = c.region?.path.find(p => p.level === "district")?.name ?? c.region?.name ?? "—";
    const state = c.region?.path.find(p => p.level === "state")?.name;
    const code = c.confirmedDiseaseCode ?? c.suspectedDiseaseCode;
    const key = `${district}|${code ?? "undiagnosed"}`;
    const row = registry.get(key) ?? {
      disease: code ? diseaseName(code, catalog.data) : "Undiagnosed",
      district: state ? `${district}, ${state}` : district,
      species: new Set<string>(),
      cases: 0,
      severity: "unassessed" as keyof typeof RISK_ORDER,
      latest: c.createdAt,
    };
    row.cases += 1;
    if (c.animal) row.species.add(SPECIES_LABEL[c.animal.species]);
    const risk = c.riskLevel ?? "unassessed";
    if (RISK_ORDER[risk] < RISK_ORDER[row.severity]) row.severity = risk;
    if (c.createdAt > row.latest) row.latest = c.createdAt;
    registry.set(key, row);
  }
  const rows = [...registry.values()].sort((a, b) => RISK_ORDER[a.severity] - RISK_ORDER[b.severity] || b.cases - a.cases);
  const underWatch = regions.rows.filter(r => r.highRiskOpen > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">{o?.scope?.level === "country" || !o?.scope ? "National" : o.scope.name} Overview</h1>
          <p className="text-gray-500 text-sm">
            Livestock health surveillance — {o?.scope?.name ?? "All India"} · Updated {overviewQ.dataUpdatedAt ? formatDateTime(new Date(overviewQ.dataUpdatedAt)) : "…"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-500">Live Data</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Open Notifiable Cases" value={o?.cases.openNotifiable ?? 0} icon="⚠️" accent="red" glass />
        <StatCard label="Animals Monitored" value={o?.animals ?? 0} icon="🐄" accent="green" glass />
        <StatCard label="Vaccination Coverage" value={o?.vaccination.coveragePercent ?? 0} unit="%" icon="💉" accent="sky" glass />
        <StatCard label="Vets Deployed" value={vets.data?.length ?? 0} icon="👨‍⚕️" accent="amber" glass />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5">
          <p className="text-xs text-gray-500 mb-1">{regions.level ? `${regions.level[0]!.toUpperCase()}${regions.level.slice(1)}s` : "Areas"} Under Watch</p>
          <p className="text-3xl font-display font-bold text-gray-900">{underWatch}</p>
          <p className="text-xs text-gray-500 mt-1">With open high-risk cases</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5">
          <p className="text-xs text-gray-500 mb-1">Livestock Deaths (30 days)</p>
          <p className="text-3xl font-display font-bold text-gray-900">{o?.deaths ?? "…"}</p>
          <p className="text-xs text-gray-500 mt-1">Reported by farmers and field staff</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5">
          <p className="text-xs text-gray-500 mb-1">Cases Resolved (30 days)</p>
          <p className="text-3xl font-display font-bold text-gray-900">{(o?.cases.resolved ?? 0).toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">of {o?.cases.reported ?? 0} reported</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5">
          <p className="text-xs text-gray-500 mb-1">Median Vet Response Time</p>
          <p className="text-3xl font-display font-bold text-gray-900">{o?.responseTimeHours.median != null ? `${o.responseTimeHours.median} hrs` : "—"}</p>
          <p className="text-xs text-gray-500 mt-1">Report to first veterinary action</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E8E5DF] p-5">
          <h2 className="font-display font-semibold text-gray-900 mb-4">Disease Trend — Last 6 Months</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trend.data}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E8E5DF", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
              <Legend />
              {trend.keys.map(k => (
                <Line key={k.key} type="monotone" dataKey={k.key} name={k.label} stroke={k.color} strokeWidth={2.5} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Species Distribution */}
        <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5">
          <h2 className="font-display font-semibold text-gray-900 mb-4">Affected Species</h2>
          {speciesData.length === 0 ? (
            <p className="text-sm text-gray-400 py-16 text-center">{species.isPending ? "Loading…" : "No cases in the last 30 days."}</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={speciesData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value">
                    {speciesData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => `${val}%`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {speciesData.map(s => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }}></div>
                      <span className="text-gray-600">{s.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900">{s.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Active Outbreaks Table */}
      <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-display font-semibold text-gray-900">Active Case Registry</h2>
          <Link to="/hospital/official/risk-map" className="text-xs text-[#4A90D9] hover:underline">View on Map →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {["Disease", "District/State", "Species", "Open Cases", "Severity", "Status", "Latest"].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {openCases.isSuccess && rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-sm text-gray-500 text-center">No open cases in your area.</td></tr>
              )}
              {rows.map(o => (
                <tr key={`${o.district}-${o.disease}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-sm text-gray-900">{o.disease}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{o.district}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{[...o.species].join(", ") || "—"}</td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900">{o.cases}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${o.severity === "high" ? "bg-red-100 text-red-600" : o.severity === "moderate" ? "bg-amber-100 text-amber-700" : o.severity === "low" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {o.severity === "unassessed" ? "not assessed" : o.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-50 text-red-600">active</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(o.latest)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

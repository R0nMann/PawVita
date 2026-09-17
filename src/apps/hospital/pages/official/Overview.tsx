import StatCard from "../../components/StatCard";
import { KPI_STATS, DISEASE_TREND_DATA, SPECIES_DISTRIBUTION, OUTBREAKS } from "../../data/mockData";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

export default function OfficialOverview() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">National Overview</h1>
          <p className="text-gray-500 text-sm">Real-time livestock health surveillance — All India · Updated 6:00 AM IST</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-500">Live Data</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Outbreaks" value={KPI_STATS.activeOutbreaks} icon="⚠️" accent="red" change="2 new this week" changePositive={false} glass />
        <StatCard label="Animals Monitored" value={KPI_STATS.totalAnimalsMonitored} icon="🐄" accent="green" glass />
        <StatCard label="Vaccination Coverage" value={KPI_STATS.vaccinationCoverage} unit="%" icon="💉" accent="sky" change="2.1%" changePositive={true} glass />
        <StatCard label="Vets Deployed" value={KPI_STATS.fieldVetsDeployed} icon="👨‍⚕️" accent="amber" change="12 new" changePositive={true} glass />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5">
          <p className="text-xs text-gray-500 mb-1">Districts Under Watch</p>
          <p className="text-3xl font-display font-bold text-gray-900">{KPI_STATS.districtsUnderWatch}</p>
          <p className="text-xs text-red-500 mt-1">↑ 4 new this week</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5">
          <p className="text-xs text-gray-500 mb-1">Mortality Rate Change</p>
          <p className="text-3xl font-display font-bold text-green-600">{KPI_STATS.mortalityRateChange}%</p>
          <p className="text-xs text-green-600 mt-1">↓ Improving trend</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5">
          <p className="text-xs text-gray-500 mb-1">Cases Resolved This Month</p>
          <p className="text-3xl font-display font-bold text-gray-900">{KPI_STATS.casesResolvedThisMonth.toLocaleString()}</p>
          <p className="text-xs text-green-600 mt-1">↑ 18% vs last month</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5">
          <p className="text-xs text-gray-500 mb-1">Avg Vet Response Time</p>
          <p className="text-3xl font-display font-bold text-gray-900">{KPI_STATS.reportResponseTime}</p>
          <p className="text-xs text-green-600 mt-1">↓ Down from 6.2 hrs</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E8E5DF] p-5">
          <h2 className="font-display font-semibold text-gray-900 mb-4">Disease Trend — Apr to Sep 2026</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={DISEASE_TREND_DATA}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E8E5DF", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
              <Legend />
              <Line type="monotone" dataKey="fmd" name="FMD" stroke="#E63946" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="lsd" name="LSD" stroke="#F4A300" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="avian" name="Avian Flu" stroke="#4A90D9" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="ppr" name="PPR" stroke="#1B4332" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="swine" name="Swine Fever" stroke="#8B5CF6" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Species Distribution */}
        <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5">
          <h2 className="font-display font-semibold text-gray-900 mb-4">Affected Species</h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={SPECIES_DISTRIBUTION} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value">
                {SPECIES_DISTRIBUTION.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(val) => `${val}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {SPECIES_DISTRIBUTION.map(s => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }}></div>
                  <span className="text-gray-600">{s.name}</span>
                </div>
                <span className="font-semibold text-gray-900">{s.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Outbreaks Table */}
      <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-display font-semibold text-gray-900">Active Outbreak Registry</h2>
          <a href="/hospital/official/risk-map" className="text-xs text-[#4A90D9] hover:underline">View on Map →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {["Disease", "District/State", "Species", "Active Cases", "Severity", "Status", "Reported"].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {OUTBREAKS.map(o => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-sm text-gray-900">{o.disease}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{o.district}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{o.species}</td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900">{o.cases}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${o.severity === "high" ? "bg-red-100 text-red-600" : o.severity === "medium" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                      {o.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${o.status === "active" ? "bg-red-50 text-red-600" : o.status === "monitoring" ? "bg-blue-50 text-blue-600" : o.status === "contained" ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{o.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { RISK_FORECAST } from "../../data/aiPreview";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { useCoverage } from "../../../../api/queries";
import { useDiseaseTrend } from "../../../../shared/analytics/charts";

/** Coverage the vaccination programme aims for in every area. */
const COVERAGE_TARGET = 80;

export default function Analytics() {
  const frequency = useDiseaseTrend({ months: 6, top: 3 });
  const multi = useDiseaseTrend({ months: 6, top: 5 });
  const coverageQ = useCoverage();
  const coverage = (coverageQ.data?.items ?? []).filter(c => c.animals > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Advanced Analytics</h1>
        <p className="text-gray-500 text-sm">Disease frequency, regional comparison, and AI-powered seasonal forecasting</p>
      </div>

      {/* 7-Day Risk Forecast */}
      <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-semibold text-gray-900">7-Day Disease Risk Forecast</h2>
            <p className="text-xs text-gray-500">AI prediction combining weather + historical outbreak patterns</p>
          </div>
          <span className="text-xs bg-[#4A90D9]/10 text-[#4A90D9] px-3 py-1.5 rounded-full font-semibold">AI Powered</span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={RISK_FORECAST}>
            <defs>
              <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E63946" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#E63946" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => [`${v}/100`, "Risk Score"]} contentStyle={{ borderRadius: "12px" }} />
            <Area type="monotone" dataKey="risk" name="Risk Score" stroke="#E63946" strokeWidth={2.5} fill="url(#riskGrad)" />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
          <span>🌧️ Wednesday peak driven by storm forecast — high humidity = elevated FMD/LSD transmission risk</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Disease Trend */}
        <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6">
          <h2 className="font-display font-semibold text-gray-900 mb-1">Disease Frequency — 6 Months</h2>
          <p className="text-xs text-gray-500 mb-4">Case count by disease type</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={frequency.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: "12px" }} />
              <Legend />
              {frequency.keys.map(k => (
                <Bar key={k.key} dataKey={k.key} name={k.label} fill={k.color} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Vaccination Coverage */}
        <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6">
          <h2 className="font-display font-semibold text-gray-900 mb-1">Vaccination Coverage by {coverageQ.data?.level ?? "area"}</h2>
          <p className="text-xs text-gray-500 mb-4">Coverage % vs {COVERAGE_TARGET}% target — lowest first</p>
          {coverageQ.isSuccess && coverage.length === 0 && <p className="text-sm text-gray-400">No animals registered in your area yet.</p>}
          <div className="space-y-3">
            {coverage.map(d => {
              const value = d.coveragePercent ?? 0;
              const color = value >= COVERAGE_TARGET ? "#10B981" : value >= COVERAGE_TARGET * 0.8 ? "#F4A300" : "#E63946";
              return (
                <div key={d.regionId}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">{d.region.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color }}>{value}%</span>
                      <span className="text-xs text-gray-400">/{COVERAGE_TARGET}% · {d.animals} animals</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 relative">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }}></div>
                    <div className="absolute top-0 h-2 w-0.5 bg-gray-400" style={{ left: `${COVERAGE_TARGET}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Multi-disease trend */}
      <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6">
        <h2 className="font-display font-semibold text-gray-900 mb-4">Multi-Disease Trend Analysis</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={multi.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E8E5DF" }} />
            <Legend />
            {multi.keys.map(k => (
              <Line key={k.key} type="monotone" dataKey={k.key} name={k.label} stroke={k.color} strokeWidth={2.5} dot={{ r: 4 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-sm text-amber-800">⚠️ <strong>AI Forecast:</strong> Based on current trajectory and post-monsoon weather patterns, FMD and Avian Flu cases are projected to peak in October 2026. Recommend proactive vaccination drive in high-risk districts.</p>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { INDIA_STATES_RISK, OUTBREAKS } from "../../data/mockData";

const RISK_COLORS: Record<string, string> = { high: "#E63946", medium: "#F4A300", low: "#10B981" };

export default function RiskMap() {
  const [filter, setFilter] = useState("all");
  const [selectedState, setSelectedState] = useState<typeof INDIA_STATES_RISK[0] | null>(null);

  const filtered = filter === "all" ? INDIA_STATES_RISK : INDIA_STATES_RISK.filter(s => s.risk === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Geospatial Risk Map</h1>
          <p className="text-gray-500 text-sm">AI-generated risk scores by state/district — Live data</p>
        </div>
        <div className="flex gap-2">
          {["all", "high", "medium", "low"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm rounded-xl font-medium capitalize transition-all ${filter === f ? "gradient-primary text-white" : "bg-white border border-[#E8E5DF] text-gray-600"}`}
            >
              {f === "all" ? "All" : f + " risk"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">India Risk Heatmap — September 2026</span>
            <div className="ml-auto flex items-center gap-3 text-xs">
              {Object.entries(RISK_COLORS).map(([k, c]) => (
                <span key={k} className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: c }}></span>
                  {k} risk
                </span>
              ))}
            </div>
          </div>
          <div className="relative bg-gradient-to-br from-blue-50 to-green-50 p-6" style={{ minHeight: "480px" }}>
            {/* India outline SVG (simplified) */}
            <svg viewBox="0 0 500 580" className="w-full max-h-96 mx-auto">
              {/* Simplified India map shape */}
              <path d="M 180 80 L 220 60 L 290 70 L 340 100 L 380 90 L 410 130 L 400 160 L 380 180 L 390 220 L 370 260 L 350 300 L 360 340 L 340 380 L 310 430 L 280 480 L 260 520 L 240 490 L 220 450 L 200 400 L 180 360 L 160 300 L 140 260 L 150 220 L 130 180 L 140 140 L 160 110 Z" fill="#e8f5e9" stroke="#c8e6c9" strokeWidth="2" />
              {/* State risk circles */}
              {INDIA_STATES_RISK.map(s => {
                const POS: Record<string, [number, number]> = {
                  "Maharashtra": [240, 310], "Rajasthan": [200, 180], "Punjab": [215, 130],
                  "Uttar Pradesh": [280, 200], "Assam": [380, 200], "Bihar": [320, 240],
                  "Gujarat": [170, 270], "Haryana": [220, 155], "Karnataka": [230, 380],
                  "Tamil Nadu": [250, 440],
                };
                const [x, y] = POS[s.state] || [250, 300];
                const r = 15 + s.score / 10;
                if (filter !== "all" && s.risk !== filter) return null;
                return (
                  <g key={s.state} onClick={() => setSelectedState(s)} style={{ cursor: "pointer" }}>
                    <circle cx={x} cy={y} r={r + 8} fill={RISK_COLORS[s.risk]} opacity="0.15" />
                    <circle cx={x} cy={y} r={r} fill={RISK_COLORS[s.risk]} opacity="0.7" />
                    <text x={x} y={y + 4} textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">{s.score}</text>
                    <text x={x} y={y + r + 14} textAnchor="middle" fontSize="8" fill="#374151">{s.state.split(" ")[0]}</text>
                  </g>
                );
              })}
            </svg>
          </div>
          {selectedState && (
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex items-center gap-4">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: RISK_COLORS[selectedState.risk] }}></div>
              <div>
                <p className="font-semibold text-gray-900">{selectedState.state}</p>
                <p className="text-sm text-gray-500">Risk Score: {selectedState.score}/100 · Cases: {selectedState.cases} · Risk Level: <span className="font-semibold" style={{ color: RISK_COLORS[selectedState.risk] }}>{selectedState.risk.toUpperCase()}</span></p>
              </div>
              <button onClick={() => setSelectedState(null)} className="ml-auto text-gray-400 hover:text-gray-600">✕</button>
            </div>
          )}
        </div>

        {/* State Risk List */}
        <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-display font-semibold text-gray-900">State Risk Rankings</h2>
          </div>
          <div className="divide-y divide-gray-50 max-h-[480px] overflow-y-auto">
            {[...INDIA_STATES_RISK].sort((a, b) => b.score - a.score).filter(s => filter === "all" || s.risk === filter).map((s, i) => (
              <div
                key={s.state}
                className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setSelectedState(s)}
              >
                <span className="text-sm font-bold text-gray-400 w-5">{i + 1}</span>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-900">{s.state}</p>
                  <p className="text-xs text-gray-500">{s.cases} cases</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm" style={{ color: RISK_COLORS[s.risk] }}>{s.score}</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full`} style={{ backgroundColor: RISK_COLORS[s.risk] + "20", color: RISK_COLORS[s.risk] }}>
                    {s.risk}
                  </span>
                </div>
                <div className="w-20">
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full" style={{ width: `${s.score}%`, backgroundColor: RISK_COLORS[s.risk] }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Outbreaks on Map */}
      <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-display font-semibold text-gray-900">Outbreak Locations</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
          {OUTBREAKS.filter(o => o.status === "active").map(o => (
            <div key={o.id} className={`rounded-xl p-4 border-l-4 ${o.severity === "high" ? "bg-red-50 border-[#E63946]" : "bg-amber-50 border-[#F4A300]"}`}>
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-display font-semibold text-gray-900 text-sm">{o.disease}</h3>
                <div className={`w-3 h-3 rounded-full ${o.severity === "high" ? "bg-[#E63946]" : "bg-[#F4A300]"} animate-pulse`}></div>
              </div>
              <p className="text-xs text-gray-500 mb-2">📍 {o.district}</p>
              <p className="text-xs text-gray-600">{o.species} · {o.cases} cases · {o.date}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

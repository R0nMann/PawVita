import { useState } from "react";
import { Link } from "react-router";
import { ANIMALS } from "../../data/mockData";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  healthy: { label: "Healthy", color: "text-green-700", bg: "bg-green-100" },
  critical: { label: "Critical", color: "text-red-600", bg: "bg-red-100" },
  recovering: { label: "Recovering", color: "text-amber-700", bg: "bg-amber-100" },
  "under-observation": { label: "Observation", color: "text-blue-600", bg: "bg-blue-100" },
};

export default function MyAnimals() {
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const filtered = filter === "all" ? ANIMALS : ANIMALS.filter(a => a.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Animal Records</h1>
          <p className="text-gray-500 text-sm">Digital herd management — {ANIMALS.length} animals admitted</p>
        </div>
        <Link to="/hospital/ward/report-symptom" className="gradient-primary text-white font-semibold px-4 py-2 rounded-xl text-sm">+ Report</Link>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {["all", "healthy", "critical", "recovering", "under-observation"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${filter === f ? "gradient-primary text-white" : "bg-white border border-[#E8E5DF] text-gray-600 hover:border-[#1B4332]"}`}
            >
              {f === "all" ? `All (${ANIMALS.length})` : f}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button onClick={() => setView("grid")} className={`p-2 rounded-lg ${view === "grid" ? "bg-[#1B4332] text-white" : "bg-white border border-gray-200 text-gray-600"}`}>⊞</button>
          <button onClick={() => setView("list")} className={`p-2 rounded-lg ${view === "list" ? "bg-[#1B4332] text-white" : "bg-white border border-gray-200 text-gray-600"}`}>≡</button>
        </div>
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(a => {
            const s = STATUS_CONFIG[a.status];
            return (
              <Link key={a.id} to={`/hospital/ward/case-status/${a.id}`}>
                <div className={`bg-white rounded-2xl border-2 p-5 hover:shadow-md transition-all cursor-pointer ${a.status === "critical" ? "border-[#E63946]/40" : "border-[#E8E5DF]"}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-4xl">
                      {a.species === "Cow" || a.species === "Bull" ? "🐄" : a.species === "Buffalo" ? "🐃" : a.species === "Goat" || a.species === "Sheep" ? "🐐" : "🐴"}
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${s.bg} ${s.color}`}>{s.label}</span>
                  </div>
                  <h3 className="font-display font-bold text-gray-900 text-lg">{a.name}</h3>
                  <p className="text-xs text-gray-500 mb-3">{a.species} · {a.breed} · {a.age} · {a.weight}</p>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>🏷️ Tag: {a.tag}</p>
                    <p>🏥 Ward: {a.ward}</p>
                    <p>📅 Admitted: {a.admitted}</p>
                    <p>🏠 Owner: {a.owner}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">Vaccines on record:</p>
                    <div className="flex flex-wrap gap-1">
                      {a.vaccines.map(v => (
                        <span key={v} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">{v}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Animal", "Species/Breed", "Tag", "Ward", "Status", "Last Checkup", "Action"].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(a => {
                const s = STATUS_CONFIG[a.status];
                return (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{a.species === "Cow" || a.species === "Bull" ? "🐄" : a.species === "Buffalo" ? "🐃" : "🐐"}</span>
                        <span className="font-semibold text-sm text-gray-900">{a.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{a.species} · {a.breed}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{a.tag}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{a.ward}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${s.bg} ${s.color}`}>{s.label}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{a.lastCheckup}</td>
                    <td className="px-4 py-3">
                      <Link to={`/hospital/ward/case-status/${a.id}`} className="text-xs text-[#4A90D9] hover:underline font-medium">View →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

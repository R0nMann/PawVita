import { useState } from "react";
import { useAdvisories, usePublicAlerts } from "../../../../api/queries";
import { formatDate } from "../../../../lib/format";
import { EmptyState, QueryState } from "../../../../shared/ui/States";

const LANG_LABELS = { en: "English", hi: "हिंदी", mr: "मराठी" } as const;
type Lang = keyof typeof LANG_LABELS;

const SEVERITY_STYLE: Record<string, { card: string; badge: string; label: string }> = {
  high: { card: "bg-red-50 border-[#E63946]", badge: "bg-red-100 text-red-600", label: "critical" },
  moderate: { card: "bg-amber-50 border-[#F4A300]", badge: "bg-amber-100 text-amber-700", label: "warning" },
  low: { card: "bg-blue-50 border-[#4A90D9]", badge: "bg-blue-100 text-blue-700", label: "advisory" },
  info: { card: "bg-blue-50 border-[#4A90D9]", badge: "bg-blue-100 text-blue-700", label: "info" },
};

export default function Alerts() {
  const [lang, setLang] = useState<Lang>("en");
  const advisoriesQ = useAdvisories({ lang });
  const outbreaksQ = usePublicAlerts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Disease Alerts & Advisories</h1>
          <p className="text-gray-500 text-sm">Official advisories from the Animal Husbandry Department and your vets</p>
        </div>
        <div className="flex border border-gray-200 rounded-xl overflow-hidden" role="group" aria-label="Language">
          {(Object.keys(LANG_LABELS) as Lang[]).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
              className={`px-4 py-2 text-sm font-medium transition-colors ${lang === l ? "bg-[#1B4332] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              {LANG_LABELS[l]}
            </button>
          ))}
        </div>
      </div>

      {/* Advisories */}
      <QueryState query={advisoriesQ} loadingLabel="Loading advisories…">
        {(data) =>
          data.items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E8E5DF]">
              <EmptyState icon="📢" title="No advisories for your area" />
            </div>
          ) : (
            <div className="space-y-4">
              {data.items.map(a => {
                const s = SEVERITY_STYLE[a.severity] ?? SEVERITY_STYLE.info!;
                return (
                  <div key={a.id} className={`rounded-2xl p-5 border-l-4 ${s.card}`}>
                    <div className="flex items-start justify-between mb-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${s.badge}`}>{s.label}</span>
                      <span className="text-xs text-gray-500">{formatDate(a.publishedAt)}{a.region ? ` · ${a.region.name}` : " · All India"}</span>
                    </div>
                    <h3 className="font-display font-semibold text-gray-900 mb-2">{a.localized.title}</h3>
                    <p className="text-sm text-gray-700 leading-relaxed">{a.localized.body}</p>
                    {a.localized.language !== lang && lang !== "en" && (
                      <p className="text-xs text-gray-400 mt-2">Translation not yet available — showing English.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )
        }
      </QueryState>

      {/* Active Outbreaks Table */}
      <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-display font-semibold text-gray-900">Active Outbreaks — National Status</h2>
          <p className="text-xs text-gray-500">Open cases by district and disease over the last 14 days</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {["Disease", "Location", "Open Cases", "High Risk", "Severity", "Latest"].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {outbreaksQ.data?.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-sm text-gray-500 text-center">No active outbreaks reported.</td></tr>
              )}
              {(outbreaksQ.data ?? []).map(o => (
                <tr key={`${o.district}-${o.diseaseCode}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{o.diseaseName ?? o.diseaseCode.toUpperCase()}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{o.district}{o.state ? `, ${o.state}` : ""}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{o.cases}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{o.highRisk}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${o.severity === "high" ? "bg-red-100 text-red-600" : o.severity === "moderate" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                      {o.severity}
                    </span>
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

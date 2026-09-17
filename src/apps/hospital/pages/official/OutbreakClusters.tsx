import { OUTBREAKS } from "../../data/mockData";

const AI_CLUSTERS = [
  { id: "CLU-001", region: "Pune–Satara Belt, Maharashtra", disease: "Foot & Mouth Disease (Type O)", confidence: 94, cases: 47, radius: "35 km", animals: 12400, weather: "Post-monsoon humidity 87%", trigger: "Symptom density × movement × weather pattern", status: "escalated" },
  { id: "CLU-002", region: "Ludhiana–Amritsar Corridor, Punjab", disease: "Avian Influenza H5N1", confidence: 88, cases: 65, radius: "22 km", animals: 340000, weather: "Migratory bird season", trigger: "Poultry mortality spike + migratory bird correlation", status: "active" },
  { id: "CLU-003", region: "Guwahati–Kamrup District, Assam", disease: "Classical Swine Fever", confidence: 79, cases: 24, radius: "18 km", animals: 8900, weather: "Flooding event 2 weeks prior", trigger: "Post-flood pig movement + historical CSF pattern", status: "monitoring" },
  { id: "CLU-004", region: "Barmer–Jaisalmer Belt, Rajasthan", disease: "PPR (Goat/Sheep)", confidence: 67, cases: 7, radius: "55 km", animals: 28000, weather: "Sheep migratory routes active", trigger: "Nomadic herd movement + 3-year PPR cycle analysis", status: "watch" },
  { id: "CLU-005", region: "Patna–Muzaffarpur, Bihar", disease: "Hemorrhagic Septicemia", confidence: 61, cases: 19, radius: "40 km", animals: 15600, weather: "High humidity post-harvest", trigger: "Seasonal HS pattern + buffalo concentration in floodplains", status: "watch" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  escalated: { label: "Escalated", color: "text-red-700", bg: "bg-red-100", dot: "bg-red-500" },
  active: { label: "Active Alert", color: "text-orange-700", bg: "bg-orange-100", dot: "bg-orange-500" },
  monitoring: { label: "Monitoring", color: "text-blue-700", bg: "bg-blue-100", dot: "bg-blue-500" },
  watch: { label: "Watch", color: "text-amber-700", bg: "bg-amber-100", dot: "bg-amber-500" },
};

export default function OutbreakClusters() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">AI-Flagged Outbreak Clusters</h1>
        <p className="text-gray-500 text-sm">Machine learning cluster detection — updated hourly from symptom reports, weather, and movement data</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Clusters Detected", val: 5, color: "text-gray-900" },
          { label: "High Confidence (>80%)", val: 2, color: "text-red-600" },
          { label: "Animals at Risk", val: "405K+", color: "text-amber-600" },
          { label: "Districts Affected", val: 7, color: "text-blue-600" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#E8E5DF] p-5 text-center">
            <p className={`text-3xl font-display font-bold ${s.color}`}>{s.val}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {AI_CLUSTERS.map(c => {
          const s = STATUS_CONFIG[c.status];
          return (
            <div key={c.id} className={`bg-white rounded-2xl border-2 p-6 transition-all hover:shadow-md ${c.confidence >= 85 ? "border-red-200" : c.confidence >= 70 ? "border-amber-200" : "border-[#E8E5DF]"}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className={`w-2 h-2 rounded-full ${s.dot} animate-pulse`}></div>
                    <span className="text-xs font-mono text-gray-400">{c.id}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.color}`}>{s.label}</span>
                  </div>
                  <h3 className="text-xl font-display font-bold text-gray-900">{c.disease}</h3>
                  <p className="text-gray-500 text-sm mt-0.5">📍 {c.region}</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-display font-bold" style={{ color: c.confidence >= 85 ? "#E63946" : c.confidence >= 70 ? "#F4A300" : "#4A90D9" }}>
                    {c.confidence}%
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">AI Confidence</p>
                  <div className="w-24 bg-gray-100 rounded-full h-1.5 mt-2 ml-auto">
                    <div className="h-1.5 rounded-full" style={{ width: `${c.confidence}%`, backgroundColor: c.confidence >= 85 ? "#E63946" : c.confidence >= 70 ? "#F4A300" : "#4A90D9" }}></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Reported Cases</p>
                  <p className="font-bold text-gray-900">{c.cases}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Estimated Radius</p>
                  <p className="font-bold text-gray-900">{c.radius}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Animals at Risk</p>
                  <p className="font-bold text-gray-900">{c.animals.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Weather Factor</p>
                  <p className="font-bold text-gray-900 text-xs">{c.weather}</p>
                </div>
              </div>

              <div className="bg-[#1B4332]/5 border border-[#1B4332]/15 rounded-xl px-4 py-3 mb-4">
                <p className="text-xs font-semibold text-[#1B4332] mb-1">🧠 AI Detection Trigger</p>
                <p className="text-sm text-[#1B4332]/80">{c.trigger}</p>
              </div>

              <div className="flex gap-3">
                <button className="gradient-primary text-white text-sm font-semibold px-5 py-2 rounded-xl hover:opacity-90 transition-all">
                  Issue Containment Order
                </button>
                <button className="border border-[#E8E5DF] text-gray-700 text-sm font-medium px-5 py-2 rounded-xl hover:bg-gray-50">
                  View on Map
                </button>
                <button className="border border-[#E8E5DF] text-gray-700 text-sm font-medium px-5 py-2 rounded-xl hover:bg-gray-50">
                  Generate Report
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

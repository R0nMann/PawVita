import { FIELD_VISITS } from "../../data/mockData";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  "in-progress": "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
};

export default function FieldVisits() {
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Field Visits</h1>
        <p className="text-gray-500 text-sm">Scheduled farm visits and route planning</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5 text-center">
          <p className="text-3xl font-display font-bold text-[#1B4332]">{FIELD_VISITS.filter(v => v.status === "scheduled").length}</p>
          <p className="text-sm text-gray-500 mt-1">Scheduled</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5 text-center">
          <p className="text-3xl font-display font-bold text-amber-500">{FIELD_VISITS.filter(v => v.status === "in-progress").length}</p>
          <p className="text-sm text-gray-500 mt-1">In Progress</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5 text-center">
          <p className="text-3xl font-display font-bold text-green-600">{FIELD_VISITS.filter(v => v.status === "completed").length}</p>
          <p className="text-sm text-gray-500 mt-1">Completed</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-display font-semibold text-gray-900">All Visits</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {FIELD_VISITS.map(v => (
            <div key={v.id} className={`px-5 py-5 ${v.status === "in-progress" ? "bg-amber-50/30" : ""}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${STATUS_COLORS[v.status].split(" ")[0]}`}>
                    🚗
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-gray-900">{v.farm}</h3>
                    <p className="text-sm text-gray-500">📍 {v.location}</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${STATUS_COLORS[v.status]}`}>
                  {v.status.replace("-", " ").toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 ml-16">
                <div>
                  <p className="text-xs text-gray-400">Date & Time</p>
                  <p className="text-sm font-medium text-gray-800">{v.date} · {v.time}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Purpose</p>
                  <p className="text-sm font-medium text-gray-800">{v.purpose}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Animals</p>
                  <p className="text-sm font-medium text-gray-800">{v.animals} animals</p>
                </div>
              </div>
              {v.status === "scheduled" && (
                <div className="mt-4 ml-16 flex gap-3">
                  <button className="text-sm text-white gradient-primary px-4 py-2 rounded-lg font-medium">
                    Start Visit
                  </button>
                  <button className="text-sm text-gray-600 border border-gray-200 px-4 py-2 rounded-lg font-medium hover:bg-gray-50">
                    View Route 🗺️
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Route Planner Mockup */}
      <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-display font-semibold text-gray-900">Route Planner</h2>
          <p className="text-xs text-gray-500 mt-0.5">Optimized route for today's visits</p>
        </div>
        <div className="bg-gradient-to-br from-[#1B4332]/5 to-[#4A90D9]/10 h-64 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="absolute border border-gray-400" style={{ left: `${i * 12.5}%`, top: 0, bottom: 0, width: "1px" }}></div>
            ))}
            {[...Array(6)].map((_, i) => (
              <div key={i} className="absolute border border-gray-400" style={{ top: `${i * 16.6}%`, left: 0, right: 0, height: "1px" }}></div>
            ))}
          </div>
          {[
            { label: "DVH Pune", x: "15%", y: "50%", color: "#1B4332", pin: "🏥" },
            { label: "Bishnoi Farm", x: "45%", y: "30%", color: "#E63946", pin: "📍" },
            { label: "Ratan Farm", x: "70%", y: "60%", color: "#F4A300", pin: "📍" },
            { label: "Kaur Livestock", x: "88%", y: "25%", color: "#4A90D9", pin: "📍" },
          ].map((p, i, arr) => (
            <div key={p.label} className="absolute" style={{ left: p.x, top: p.y }}>
              <div className="text-2xl">{p.pin}</div>
              <div className="bg-white shadow rounded-lg px-2 py-0.5 text-xs font-medium whitespace-nowrap mt-1" style={{ color: p.color }}>
                {i + 1}. {p.label}
              </div>
            </div>
          ))}
          {/* SVG `points` takes numbers, not percentages — a 0-100 viewBox stretched
              to the container gives the same proportional placement as the pins. */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polyline
              points="15,50 45,30 70,60 88,25"
              fill="none"
              stroke="#1B4332"
              strokeWidth="0.5"
              strokeDasharray="2 1.5"
              vectorEffect="non-scaling-stroke"
              opacity="0.5"
            />
          </svg>
        </div>
        <div className="px-5 py-3 bg-gray-50 text-sm text-gray-600 flex items-center gap-4">
          <span>📏 Total distance: ~145 km</span>
          <span>⏱️ Estimated time: 4.5 hrs</span>
          <span>⛽ 3 stops planned</span>
        </div>
      </div>
    </div>
  );
}

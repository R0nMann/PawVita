import { Link } from "react-router";
import StatCard from "../../components/StatCard";
import { ANIMALS, NOTIFICATIONS, VACCINATION_SCHEDULE } from "../../data/mockData";

const NEARBY_RISK = { level: "medium", district: "Pune, Maharashtra", topDisease: "Foot & Mouth Disease", score: 62 };

export default function HospitalHome() {
  const critical = ANIMALS.filter(a => a.status === "critical");
  const overdue = VACCINATION_SCHEDULE.filter(v => v.status === "overdue");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Ward Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">District Veterinary Hospital, Pune — Ward Manager</p>
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
            <p className="font-semibold text-amber-800 font-display">Elevated Risk — {NEARBY_RISK.district}</p>
            <p className="text-sm text-amber-700">Active {NEARBY_RISK.topDisease} alert in your district. Risk score: {NEARBY_RISK.score}/100. Apply enhanced biosecurity protocols.</p>
          </div>
          <Link to="/hospital/ward/alerts" className="ml-auto text-amber-600 text-sm font-semibold hover:underline shrink-0">View Alerts →</Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Animals Admitted" value={8} icon="🐄" accent="green" />
        <StatCard label="Critical Cases" value={critical.length} icon="🔴" accent="red" change="1 new" changePositive={false} />
        <StatCard label="Pending Reports" value={3} icon="📋" accent="amber" />
        <StatCard label="Vaccinations Due" value={overdue.length} icon="💉" accent="sky" change="overdue" changePositive={false} />
      </div>

      {/* Digital Twin Herd */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-semibold text-gray-900">Digital Herd View</h2>
          <Link to="/hospital/ward/my-animals" className="text-sm text-[#4A90D9] hover:underline">View all animals →</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {ANIMALS.map(a => (
            <Link key={a.id} to={`/hospital/ward/case-status/${a.id}`}>
              <div className={`bg-white rounded-2xl p-4 border-2 cursor-pointer hover:shadow-md transition-all ${
                a.status === "critical" ? "border-[#E63946] bg-red-50/30" :
                a.status === "recovering" ? "border-[#F4A300] bg-amber-50/30" :
                a.status === "under-observation" ? "border-[#4A90D9] bg-blue-50/30" :
                "border-[#E8E5DF]"
              }`}>
                <div className="text-3xl text-center mb-2">
                  {a.species === "Cow" || a.species === "Bull" ? "🐄" : a.species === "Buffalo" ? "🐃" : a.species === "Goat" || a.species === "Sheep" ? "🐐" : a.species === "Horse" ? "🐴" : "🐄"}
                </div>
                <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${
                  a.status === "critical" ? "bg-[#E63946]" :
                  a.status === "recovering" ? "bg-[#F4A300]" :
                  a.status === "under-observation" ? "bg-[#4A90D9]" : "bg-green-500"
                }`}></div>
                <p className="font-display font-semibold text-sm text-center text-gray-800">{a.name}</p>
                <p className="text-xs text-center text-gray-500">{a.species} · {a.ward}</p>
              </div>
            </Link>
          ))}
        </div>
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
            <Link to="/hospital/ward/alerts" className="text-xs text-[#4A90D9] hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {NOTIFICATIONS.slice(0, 4).map(n => (
              <div key={n.id} className={`px-5 py-3 flex items-start gap-3 ${!n.read ? "bg-blue-50/20" : ""}`}>
                <span className="text-lg">{n.type === "alert" ? "🔴" : n.type === "warning" ? "🟡" : n.type === "success" ? "✅" : "ℹ️"}</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                  <p className="text-xs text-gray-400 mt-1">{n.time}</p>
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
            {VACCINATION_SCHEDULE.map(v => (
              <div key={v.id} className="px-5 py-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${v.status === "overdue" ? "bg-red-100" : v.status === "upcoming" ? "bg-amber-100" : "bg-blue-100"}`}>
                  💉
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{v.vaccine}</p>
                  <p className="text-xs text-gray-500">{v.species} · {v.animals} animals · Due {v.dueDate}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${v.status === "overdue" ? "bg-red-100 text-red-600" : v.status === "upcoming" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-600"}`}>
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

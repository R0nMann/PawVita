import { Link } from "react-router";
import StatCard from "../../components/StatCard";
import { CASES, VETS, FIELD_VISITS } from "../../data/mockData";

export default function DoctorDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Veterinary Officer Dashboard</h1>
        <p className="text-gray-500 text-sm">Dr. Priya Sharma · Ruminant Medicine · Pune District</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Cases" value={12} icon="🩺" accent="green" change="3 new" changePositive={false} />
        <StatCard label="Critical Cases" value={2} icon="🔴" accent="red" />
        <StatCard label="Resolved This Month" value={24} icon="✅" accent="sky" change="12%" changePositive={true} />
        <StatCard label="Field Visits Scheduled" value={4} icon="🗺️" accent="amber" />
      </div>

      {/* Case Priority Queue */}
      <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-display font-semibold text-gray-900">Priority Case Queue</h2>
          <span className="text-xs text-gray-500">{CASES.length} total cases</span>
        </div>
        <div className="divide-y divide-gray-50">
          {CASES.map(c => (
            <Link key={c.id} to={`/hospital/doctor/case/${c.id}`}>
              <div className="px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${c.severity === "critical" ? "bg-red-100" : c.severity === "medium" ? "bg-amber-100" : "bg-green-100"}`}>
                      {c.species === "Buffalo" ? "🐃" : "🐄"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-semibold text-gray-900">{c.animalName}</h3>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.severity === "critical" ? "bg-red-100 text-red-600" : c.severity === "medium" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                          {c.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{c.disease} · {c.species}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {c.symptoms.slice(0, 3).map(s => (
                          <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full block mb-1 ${c.status === "resolved" ? "bg-green-100 text-green-700" : c.status === "vet-assigned" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                      {c.status.replace("-", " ")}
                    </span>
                    <p className="text-xs text-gray-400">AI: {c.aiDiagnosis.confidence}% confident</p>
                    <p className="text-xs text-[#4A90D9] mt-1 font-medium">View case →</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's Field Visits */}
        <div className="bg-white rounded-2xl border border-[#E8E5DF]">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-display font-semibold text-gray-900">Today's Field Visits</h2>
            <Link to="/hospital/doctor/field-visits" className="text-xs text-[#4A90D9] hover:underline">Full calendar</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {FIELD_VISITS.slice(0, 3).map(v => (
              <div key={v.id} className="px-5 py-3 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base ${v.status === "in-progress" ? "bg-amber-100" : v.status === "completed" ? "bg-green-100" : "bg-blue-100"}`}>
                  🚗
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-900">{v.farm}</p>
                  <p className="text-xs text-gray-500">{v.location} · {v.time} · {v.purpose}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${v.status === "completed" ? "bg-green-100 text-green-600" : v.status === "in-progress" ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"}`}>
                  {v.status}
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
            {VETS.map(v => (
              <div key={v.id} className="px-5 py-3 flex items-center gap-4">
                <div className="w-10 h-10 gradient-primary rounded-full flex items-center justify-center text-white font-bold font-display text-sm">
                  {v.name.split(" ")[1].charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-900">{v.name}</p>
                  <p className="text-xs text-gray-500">{v.specialization} · {v.cases} active cases</p>
                </div>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${v.available ? "bg-green-500" : "bg-gray-300"}`}></div>
                  <span className={`text-xs ${v.available ? "text-green-600" : "text-gray-400"}`}>{v.available ? "Available" : "Busy"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

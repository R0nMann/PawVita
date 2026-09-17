import { VACCINATION_SCHEDULE, ANIMALS } from "../../data/mockData";

const COMPLIANCE_SCORE = 72;
const BADGES = [
  { name: "First Report", earned: true, icon: "🏅" },
  { name: "FMD Champion", earned: true, icon: "💉" },
  { name: "Zero Missed", earned: false, icon: "🎯" },
  { name: "Perfect Month", earned: false, icon: "⭐" },
];

export default function VaccinationSchedule() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Vaccination Schedule</h1>
        <p className="text-gray-500 text-sm">Keep your animals protected — vaccination reminders and compliance tracking</p>
      </div>

      {/* Compliance Score */}
      <div className="gradient-primary rounded-3xl p-6 text-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-white/70 text-sm font-body">Vaccination Compliance Score</p>
            <p className="text-5xl font-display font-bold mt-1">{COMPLIANCE_SCORE}<span className="text-2xl">%</span></p>
            <p className="text-white/60 text-sm mt-1">Target: 90% · Current: Good</p>
          </div>
          <div className="w-24 h-24 relative">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="10" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#F4A300" strokeWidth="10"
                strokeDasharray={`${2 * Math.PI * 40 * COMPLIANCE_SCORE / 100} ${2 * Math.PI * 40}`}
                strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">{COMPLIANCE_SCORE}%</span>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
            <p className="text-2xl font-bold">8</p>
            <p className="text-white/60 text-xs">Animals</p>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
            <p className="text-2xl font-bold">3</p>
            <p className="text-white/60 text-xs">Due Soon</p>
          </div>
          <div className="bg-red-400/30 rounded-xl px-4 py-2 text-center border border-red-400/30">
            <p className="text-2xl font-bold text-red-200">1</p>
            <p className="text-red-300 text-xs">Overdue</p>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5">
        <h2 className="font-display font-semibold text-gray-900 mb-4">Compliance Badges</h2>
        <div className="grid grid-cols-4 gap-4">
          {BADGES.map(b => (
            <div key={b.name} className={`text-center p-3 rounded-xl border-2 ${b.earned ? "border-[#F4A300] bg-amber-50" : "border-gray-200 bg-gray-50 opacity-50"}`}>
              <span className="text-2xl">{b.icon}</span>
              <p className={`text-xs font-medium mt-1 ${b.earned ? "text-amber-700" : "text-gray-500"}`}>{b.name}</p>
              {b.earned && <span className="text-xs text-amber-600 font-bold">Earned!</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Schedule */}
      <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-display font-semibold text-gray-900">Upcoming Vaccinations</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {VACCINATION_SCHEDULE.map(v => (
            <div key={v.id} className={`px-5 py-4 ${v.status === "overdue" ? "bg-red-50/30" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${v.status === "overdue" ? "bg-red-100" : v.status === "upcoming" ? "bg-amber-100" : "bg-blue-100"}`}>
                    💉
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-gray-900">{v.vaccine}</h3>
                    <p className="text-sm text-gray-500">{v.species} · {v.animals} animals · {v.ward}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full block mb-1 ${v.status === "overdue" ? "bg-red-100 text-red-600" : v.status === "upcoming" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-600"}`}>
                    {v.status.toUpperCase()}
                  </span>
                  <p className="text-xs text-gray-500">Due: {v.dueDate}</p>
                </div>
              </div>
              {v.status === "overdue" && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                  ⏰ This vaccination is overdue. Contact your vet officer immediately to schedule.
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Animal Vaccine Status */}
      <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-display font-semibold text-gray-900">Animal Vaccination Records</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {ANIMALS.map(a => (
            <div key={a.id} className="px-5 py-3 flex items-center gap-4">
              <span className="text-xl">{a.species === "Cow" || a.species === "Bull" ? "🐄" : a.species === "Buffalo" ? "🐃" : "🐐"}</span>
              <div className="flex-1">
                <p className="font-semibold text-sm text-gray-900">{a.name} <span className="text-gray-400 font-normal text-xs">({a.species})</span></p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {a.vaccines.map(v => (
                    <span key={v} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200">✓ {v}</span>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500 shrink-0">Last: {a.lastCheckup}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

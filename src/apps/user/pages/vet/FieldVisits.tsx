import { fieldVisits } from '../../data/mockData';

export default function FieldVisits() {
  const today = fieldVisits.filter(v => v.status === 'scheduled');
  const completed = fieldVisits.filter(v => v.status === 'completed');

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-display text-[#1B4332]">Field Visits</h2>
        <p className="text-gray-500">January 10, 2025 — {today.length} visits scheduled today</p>
      </div>

      {/* Calendar Preview */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold font-display text-[#1B4332]">January 2025</h3>
          <div className="flex gap-2">
            <button className="p-1.5 hover:bg-gray-100 rounded-lg">←</button>
            <button className="p-1.5 hover:bg-gray-100 rounded-lg">→</button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="text-xs font-semibold text-gray-400 py-1">{d}</div>
          ))}
          {Array.from({ length: 3 }).map((_, i) => <div key={i} />)}
          {Array.from({ length: 31 }).map((_, i) => {
            const day = i + 1;
            const hasVisit = [9, 10, 12, 15].includes(day);
            const isToday = day === 10;
            return (
              <div
                key={i}
                className={`text-sm py-2 rounded-lg cursor-pointer transition-colors ${
                  isToday ? 'bg-[#1B4332] text-white font-bold' :
                  hasVisit ? 'bg-amber-100 text-amber-700 font-semibold' :
                  'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {day}
                {hasVisit && !isToday && <div className="w-1 h-1 bg-amber-500 rounded-full mx-auto mt-0.5" />}
              </div>
            );
          })}
        </div>
      </div>

      <h3 className="font-bold font-display text-[#1B4332] mb-4 text-lg">Today's Schedule</h3>
      <div className="space-y-3 mb-6">
        {today.map(v => (
          <div key={v.id} className="bg-white rounded-2xl p-5 shadow-card border border-gray-100 flex items-center gap-4">
            <div className="gradient-card-green rounded-xl p-3 text-center min-w-[60px]">
              <p className="text-white/80 text-xs font-display">Today</p>
              <p className="text-white font-bold text-lg font-display">{v.time}</p>
            </div>
            <div className="flex-1">
              <p className="font-bold font-display text-gray-800">{v.farmerName}</p>
              <p className="text-gray-500 text-sm">{v.village}, {v.district}</p>
              <p className="text-gray-400 text-xs mt-0.5">{v.purpose} • Case {v.caseId}</p>
            </div>
            <button className="bg-sky-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-sky-600 transition-colors">
              📍 Navigate
            </button>
          </div>
        ))}
      </div>

      <h3 className="font-bold font-display text-gray-500 mb-4">Recently Completed</h3>
      <div className="space-y-3">
        {completed.map(v => (
          <div key={v.id} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-4 opacity-70">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">✅</div>
            <div className="flex-1">
              <p className="font-semibold text-gray-700">{v.farmerName}</p>
              <p className="text-gray-400 text-sm">{v.village} • {v.date} {v.time}</p>
            </div>
            <span className="text-xs text-green-600 font-semibold">Completed</span>
          </div>
        ))}
      </div>
    </div>
  );
}

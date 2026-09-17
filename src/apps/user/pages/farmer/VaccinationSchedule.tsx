import { vaccinationSchedule } from '../../data/mockData';

const statusStyles: Record<string, { badge: string; row: string }> = {
  overdue: { badge: 'severity-high', row: 'bg-red-50 border-red-200' },
  upcoming: { badge: 'severity-medium', row: 'bg-amber-50 border-amber-200' },
  scheduled: { badge: 'severity-low', row: 'bg-green-50 border-green-200' },
};

export default function VaccinationSchedule() {
  const compliance = Math.round((vaccinationSchedule.filter(v => v.status === 'scheduled').length / vaccinationSchedule.length) * 100);

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold font-display text-[#1B4332] mb-2">Vaccination Schedule</h1>
      <p className="text-gray-500 text-sm mb-5">Upcoming and overdue vaccinations for your herd</p>

      {/* Compliance Card */}
      <div className="gradient-card-green rounded-2xl p-5 text-white mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white/70 text-sm">Herd Compliance Score</p>
            <p className="text-4xl font-bold font-display">83%</p>
          </div>
          <div className="w-16 h-16 rounded-full border-4 border-amber-400 flex items-center justify-center">
            <span className="text-2xl">🏆</span>
          </div>
        </div>
        <div className="w-full bg-white/20 rounded-full h-3">
          <div className="bg-amber-400 h-3 rounded-full" style={{ width: '83%' }} />
        </div>
        <p className="text-white/60 text-xs mt-2">5 of 6 animals have up-to-date vaccinations</p>
      </div>

      {/* Overdue Alert */}
      {vaccinationSchedule.filter(v => v.status === 'overdue').length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5">
          <p className="font-bold font-display text-red-700">⚠️ Overdue Vaccinations</p>
          <p className="text-sm text-red-600 mt-1">Please contact your vet immediately for overdue vaccinations.</p>
        </div>
      )}

      <div className="space-y-3">
        {vaccinationSchedule.map(v => {
          const ss = statusStyles[v.status];
          return (
            <div key={v.id} className={`rounded-2xl p-4 border ${ss.row}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold font-display text-gray-800">{v.vaccine}</p>
                  <p className="text-gray-600 text-sm">{v.animalName} • {v.species}</p>
                  <p className="text-gray-500 text-xs mt-1">Due: <span className="font-semibold">{v.dueDate}</span></p>
                  <p className="text-gray-400 text-xs">By {v.vetName}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${ss.badge}`}>
                  {v.status === 'overdue' ? '⚠️ Overdue' : v.status === 'upcoming' ? '⏰ Upcoming' : '✓ Scheduled'}
                </span>
              </div>
              {v.status !== 'scheduled' && (
                <button className="w-full mt-3 bg-[#1B4332] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2D6A4F] transition-colors">
                  Request Vaccination Visit
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

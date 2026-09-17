import { Link } from 'react-router';
import { animals } from '../../data/mockData';

const healthStyles: Record<string, { badge: string; border: string; icon: string }> = {
  healthy: { badge: 'bg-green-100 text-green-700', border: 'border-green-200', icon: '✅' },
  'at-risk': { badge: 'bg-yellow-100 text-yellow-700', border: 'border-yellow-200', icon: '⚠️' },
  sick: { badge: 'bg-red-100 text-red-600', border: 'border-red-200', icon: '🚨' },
};

export default function MyAnimals() {
  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-[#1B4332]">My Animals</h1>
          <p className="text-gray-500 text-sm">{animals.length} registered animals</p>
        </div>
        <button className="bg-[#1B4332] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2D6A4F] transition-colors">
          + Add Animal
        </button>
      </div>

      {/* Vaccination badge */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
        <span className="text-3xl">🏆</span>
        <div>
          <p className="font-bold font-display text-amber-800">Vaccination Badge: Gold</p>
          <p className="text-sm text-amber-600">5 of 6 animals up to date. Keep it up!</p>
        </div>
        <div className="ml-auto w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center text-white font-bold text-sm">83%</div>
      </div>

      <div className="space-y-3">
        {animals.map(a => {
          const hs = healthStyles[a.health];
          return (
            <div key={a.id} className={`bg-white rounded-2xl p-4 shadow-card border ${hs.border} hover:shadow-card-hover transition-all duration-300`}>
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 border border-gray-100">
                  {a.species === 'Cattle' || a.species === 'Buffalo' ? '🐄' : a.species === 'Goat' ? '🐐' : '🐑'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold font-display text-gray-800 text-lg">{a.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${hs.badge}`}>
                      {hs.icon} {a.health}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm">{a.species} • {a.breed} • {a.age} yrs • {a.weight}kg</p>
                  <p className="text-gray-400 text-xs mt-0.5">ID: {a.id}</p>
                </div>
              </div>

              {/* Timeline */}
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#FAF9F6] rounded-xl p-2.5">
                    <p className="text-xs text-gray-400">Last Vaccinated</p>
                    <p className="text-sm font-semibold text-gray-700 font-display">{a.lastVaccinated}</p>
                  </div>
                  <div className={`rounded-xl p-2.5 ${new Date(a.nextVaccination) < new Date() ? 'bg-red-50' : 'bg-green-50'}`}>
                    <p className="text-xs text-gray-400">Next Due</p>
                    <p className={`text-sm font-semibold font-display ${new Date(a.nextVaccination) < new Date() ? 'text-red-600' : 'text-green-700'}`}>
                      {a.nextVaccination}
                    </p>
                  </div>
                </div>
              </div>

              {a.health !== 'healthy' && (
                <div className="mt-3">
                  <Link
                    to="/user/farmer/report-symptom"
                    className="w-full block text-center bg-red-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors"
                  >
                    Report Symptoms →
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

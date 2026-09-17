import { Link } from 'react-router';
import { animals, reports, outbreakClusters, vaccinationSchedule } from '../../data/mockData';

const healthColors: Record<string, { bg: string; text: string; dot: string }> = {
  healthy: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  'at-risk': { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  sick: { bg: 'bg-red-100', text: 'text-red-600', dot: 'bg-red-500' },
};

export default function FarmerHome() {
  const overdue = vaccinationSchedule.filter(v => v.status === 'overdue').length;
  const upcoming = vaccinationSchedule.filter(v => v.status === 'upcoming').length;
  const sickAnimals = animals.filter(a => a.health === 'sick' || a.health === 'at-risk').length;

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      {/* Greeting */}
      <div className="mb-6">
        <p className="text-gray-500 text-sm">Good morning 🌅</p>
        <h1 className="text-2xl font-bold font-display text-[#1B4332]">Ramesh Kumar</h1>
        <p className="text-gray-500 text-sm">Kheda Village, Anand District</p>
      </div>

      {/* Alert Banner */}
      {sickAnimals > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div className="flex-1">
            <p className="font-semibold text-red-700 font-display">Action needed</p>
            <p className="text-sm text-red-600">{sickAnimals} animal(s) need your attention</p>
          </div>
          <Link to="/user/farmer/my-animals" className="text-red-600 font-semibold text-sm hover:underline">View →</Link>
        </div>
      )}

      {/* Offline Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-5 flex items-center gap-3">
        <span className="text-lg">📡</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-700">Offline mode active</p>
          <p className="text-xs text-amber-600">2 reports saved locally — will sync when online</p>
        </div>
        <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link to="/user/farmer/report-symptom" className="gradient-card-green rounded-2xl p-5 text-white shadow-card hover:shadow-card-hover transition-all">
          <span className="text-3xl mb-2 block">🩺</span>
          <p className="font-bold font-display text-lg leading-tight">Report Symptom</p>
          <p className="text-white/70 text-xs mt-1">Takes 2 minutes</p>
        </Link>
        <Link to="/user/farmer/vaccination-schedule" className="gradient-card-amber rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all">
          <span className="text-3xl mb-2 block">💉</span>
          <p className="font-bold font-display text-lg text-[#0F2D1F] leading-tight">Vaccinations</p>
          {overdue > 0 && <p className="text-red-700 text-xs mt-1 font-semibold">{overdue} overdue!</p>}
          {upcoming > 0 && <p className="text-[#0F2D1F]/70 text-xs mt-1">{upcoming} upcoming</p>}
        </Link>
        <Link to="/user/farmer/my-animals" className="bg-white rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all border border-gray-100">
          <span className="text-3xl mb-2 block">🐄</span>
          <p className="font-bold font-display text-lg text-[#1B4332] leading-tight">My Herd</p>
          <p className="text-gray-500 text-xs mt-1">{animals.length} animals</p>
        </Link>
        <Link to="/user/farmer/alerts" className="bg-white rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all border border-gray-100">
          <span className="text-3xl mb-2 block">🔔</span>
          <p className="font-bold font-display text-lg text-[#1B4332] leading-tight">Alerts</p>
          <p className="text-gray-500 text-xs mt-1">3 new advisories</p>
        </Link>
      </div>

      {/* Herd Health Snapshot */}
      <div className="bg-white rounded-2xl p-5 shadow-card mb-5 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold font-display text-[#1B4332] text-lg">My Animals</h2>
          <Link to="/user/farmer/my-animals" className="text-sm text-[#1B4332] font-semibold">View all →</Link>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {animals.slice(0, 6).map(a => {
            const hc = healthColors[a.health];
            return (
              <Link key={a.id} to="/user/farmer/my-animals" className={`rounded-xl p-3 ${hc.bg} flex flex-col items-center gap-1 hover:opacity-90 transition-opacity`}>
                <span className="text-2xl">{a.species === 'Cattle' || a.species === 'Buffalo' ? '🐄' : a.species === 'Goat' ? '🐐' : '🐑'}</span>
                <p className={`text-xs font-semibold ${hc.text} font-display`}>{a.name}</p>
                <div className={`w-1.5 h-1.5 rounded-full ${hc.dot}`}></div>
              </Link>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100">
          <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2 h-2 bg-green-500 rounded-full"></span> {animals.filter(a => a.health === 'healthy').length} Healthy</span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2 h-2 bg-yellow-500 rounded-full"></span> {animals.filter(a => a.health === 'at-risk').length} At Risk</span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2 h-2 bg-red-500 rounded-full"></span> {animals.filter(a => a.health === 'sick').length} Sick</span>
        </div>
      </div>

      {/* Active Cases */}
      {reports.filter(r => r.status !== 'resolved').length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-card mb-5 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold font-display text-[#1B4332] text-lg">Active Reports</h2>
          </div>
          <div className="space-y-3">
            {reports.filter(r => r.status !== 'resolved').map(r => (
              <Link key={r.id} to={`/user/farmer/case-status/${r.id}`} className="flex items-center gap-3 p-3 bg-[#FAF9F6] rounded-xl hover:bg-gray-100 transition-colors">
                <span className="text-xl">📋</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{r.disease}</p>
                  <p className="text-gray-500 text-xs">{r.reportedAt}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  r.status === 'vet-assigned' ? 'bg-blue-100 text-blue-600' : 'bg-yellow-100 text-yellow-600'
                }`}>
                  {r.status === 'vet-assigned' ? 'Vet Assigned' : 'Under Observation'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Nearby Risk */}
      <div className="bg-[#1B4332] rounded-2xl p-5 text-white">
        <h2 className="font-bold font-display text-lg mb-3">Nearby Risk</h2>
        <div className="space-y-2">
          {outbreakClusters.slice(0, 2).map(c => (
            <div key={c.id} className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${c.confidence >= 85 ? 'bg-red-400' : 'bg-yellow-400'}`}></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{c.disease}</p>
                <p className="text-white/60 text-xs">{c.district}, {c.state}</p>
              </div>
              <p className="text-xs text-white/70">{c.casesCount} cases</p>
            </div>
          ))}
        </div>
        <p className="text-white/50 text-xs mt-3">Your report helps protect your village 🌿</p>
      </div>
    </div>
  );
}

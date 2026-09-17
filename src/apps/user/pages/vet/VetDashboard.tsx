import { Link } from 'react-router';
import { vetCases } from '../../data/mockData';
import StatCard from '../../components/StatCard';

export default function VetDashboard() {
  const open = vetCases.filter(c => c.status === 'open').length;
  const inProgress = vetCases.filter(c => c.status === 'in-progress').length;
  const resolved = vetCases.filter(c => c.status === 'resolved').length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-display text-[#1B4332]">Good morning, Dr. Meera 🩺</h2>
        <p className="text-gray-500">Anand District • Today's overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Open Cases" value={open} icon="📋" gradient="gradient-card-alert" />
        <StatCard label="In Progress" value={inProgress} icon="🔄" gradient="gradient-card-amber" delay={100} />
        <StatCard label="Resolved Today" value={resolved} icon="✅" gradient="gradient-card-green" delay={200} />
        <StatCard label="Field Visits" value={3} icon="🗓️" gradient="gradient-card-sky" delay={300} />
      </div>

      {/* Priority Queue */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold font-display text-[#1B4332] text-lg">Priority Case Queue</h3>
          <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-semibold">{open} urgent</span>
        </div>
        <div className="divide-y divide-gray-50">
          {vetCases.map(c => (
            <Link key={c.id} to={`/user/vet/case/${c.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-[#FAF9F6] transition-colors">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                c.severity === 'high' ? 'bg-red-500' : c.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 font-display">{c.farmerName}</p>
                <p className="text-gray-500 text-sm">{c.suspectedDisease} • {c.village}, {c.district}</p>
                <p className="text-gray-400 text-xs mt-0.5">{c.reportedAt}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  c.severity === 'high' ? 'severity-high' : c.severity === 'medium' ? 'severity-medium' : 'severity-low'
                }`}>{c.severity}</span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  c.status === 'open' ? 'bg-red-100 text-red-600' :
                  c.status === 'in-progress' ? 'bg-blue-100 text-blue-600' :
                  'bg-green-100 text-green-600'
                }`}>{c.status}</span>
                <span className="text-gray-400 text-sm">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Today's Visits */}
      <div className="mt-5 bg-white rounded-2xl shadow-card border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold font-display text-[#1B4332] text-lg">Today's Field Visits</h3>
          <Link to="/user/vet/field-visits" className="text-sm text-[#1B4332] font-semibold hover:underline">View Calendar →</Link>
        </div>
        <div className="space-y-3">
          {[
            { time: '09:00', farmer: 'Ramesh Kumar', location: 'Kheda', purpose: 'FMD Investigation', status: 'pending' },
            { time: '11:30', farmer: 'Sunita Devi', location: 'Changa', purpose: 'LSD Follow-up', status: 'pending' },
            { time: '14:00', farmer: 'Mohan Lal', location: 'Vadod', purpose: 'HS Assessment', status: 'pending' },
          ].map((v, i) => (
            <div key={i} className="flex items-center gap-4 p-3 bg-[#FAF9F6] rounded-xl">
              <div className="text-center min-w-[48px]">
                <p className="text-xs text-gray-400">Today</p>
                <p className="font-bold text-[#1B4332] font-display text-sm">{v.time}</p>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800 text-sm">{v.farmer}</p>
                <p className="text-gray-500 text-xs">{v.location} • {v.purpose}</p>
              </div>
              <button className="text-xs bg-[#1B4332] text-white px-3 py-1.5 rounded-lg hover:bg-[#2D6A4F] transition-colors font-semibold">
                Navigate →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

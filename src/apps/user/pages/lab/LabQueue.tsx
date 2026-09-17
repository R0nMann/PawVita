import { Link } from 'react-router';
import { labSamples } from '../../data/mockData';
import StatCard from '../../components/StatCard';

const priorityConfig: Record<string, { badge: string }> = {
  urgent: { badge: 'bg-red-100 text-red-700' },
  high: { badge: 'bg-orange-100 text-orange-700' },
  normal: { badge: 'bg-gray-100 text-gray-700' },
};

const statusConfig: Record<string, { badge: string }> = {
  pending: { badge: 'bg-yellow-100 text-yellow-700' },
  processing: { badge: 'bg-blue-100 text-blue-700' },
  completed: { badge: 'bg-green-100 text-green-700' },
};

export default function LabQueue() {
  const pending = labSamples.filter(s => s.status === 'pending').length;
  const processing = labSamples.filter(s => s.status === 'processing').length;
  const completed = labSamples.filter(s => s.status === 'completed').length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-display text-[#1B4332]">Sample Queue</h2>
        <p className="text-gray-500">Incoming samples sorted by priority</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-7">
        <StatCard label="Pending" value={pending} icon="⏳" gradient="gradient-card-amber" />
        <StatCard label="Processing" value={processing} icon="🔬" gradient="gradient-card-sky" delay={100} />
        <StatCard label="Completed Today" value={completed} icon="✅" gradient="gradient-card-green" delay={200} />
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold font-display text-[#1B4332]">All Samples</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {labSamples.map(s => (
            <Link key={s.id} to={`/user/lab/sample/${s.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-[#FAF9F6] transition-colors">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">🧪</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-bold font-display text-gray-800">{s.id}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityConfig[s.priority].badge}`}>
                    {s.priority}
                  </span>
                </div>
                <p className="text-gray-500 text-sm">{s.suspectedDisease} • {s.sampleType}</p>
                <p className="text-gray-400 text-xs mt-0.5">From {s.farmerName}, {s.district} • Vet: {s.vetName}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusConfig[s.status].badge}`}>
                  {s.status}
                </span>
                <p className="text-gray-400 text-xs mt-1">{s.receivedAt}</p>
              </div>
              <span className="text-gray-400">→</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

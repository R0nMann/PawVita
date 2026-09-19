import { Link } from 'react-router';
import StatCard from '../../components/StatCard';
import { useCatalog, useLabQueue } from '../../../../api/queries';
import { diseaseName, formatDateTime, isoDay, LAB_PRIORITY_STYLE, LAB_STATUS_LABEL, LAB_STATUS_STYLE } from '../../../../lib/format';
import { EmptyState, QueryState } from '../../../../shared/ui/States';

export default function LabQueue() {
  const queueQ = useLabQueue();
  const catalog = useCatalog();
  const samples = queueQ.data?.items ?? [];
  const pending = samples.filter(s => ['requested', 'collected', 'received'].includes(s.status)).length;
  const processing = samples.filter(s => s.status === 'processing').length;
  const completedToday = samples.filter(s => s.status === 'completed' && s.completedAt && isoDay(new Date(s.completedAt)) === isoDay()).length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-display text-[#1B4332]">Sample Queue</h2>
        <p className="text-gray-500">Incoming samples sorted by priority</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-7">
        <StatCard label="Pending" value={pending} icon="⏳" gradient="gradient-card-amber" />
        <StatCard label="Processing" value={processing} icon="🔬" gradient="gradient-card-sky" delay={100} />
        <StatCard label="Completed Today" value={completedToday} icon="✅" gradient="gradient-card-green" delay={200} />
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold font-display text-[#1B4332]">All Samples</h3>
        </div>
        <QueryState query={queueQ} loadingLabel="Loading samples…">
          {(data) =>
            data.items.length === 0 ? (
              <EmptyState icon="🧪" title="No samples in the queue" body="Samples requested by vets for your laboratory appear here." />
            ) : (
              <div className="divide-y divide-gray-50">
                {data.items.map(s => (
                  <Link key={s.id} to={`/user/lab/sample/${s.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-[#FAF9F6] transition-colors">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">🧪</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold font-display text-gray-800">{s.requestNumber}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LAB_PRIORITY_STYLE[s.priority]}`}>
                          {s.priority}
                        </span>
                      </div>
                      <p className="text-gray-500 text-sm">
                        {s.suspectedDiseaseCode ? diseaseName(s.suspectedDiseaseCode, catalog.data) : s.tests.join(', ')} • {s.sampleType}
                      </p>
                      <p className="text-gray-400 text-xs mt-0.5">Case {s.caseNumber} • Vet: {s.requestedBy.fullName}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${LAB_STATUS_STYLE[s.status]}`}>
                        {LAB_STATUS_LABEL[s.status]}
                      </span>
                      <p className="text-gray-400 text-xs mt-1">{formatDateTime(s.receivedAt ?? s.createdAt)}</p>
                    </div>
                    <span className="text-gray-400">→</span>
                  </Link>
                ))}
              </div>
            )
          }
        </QueryState>
      </div>
    </div>
  );
}

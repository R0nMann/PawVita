import { Link } from 'react-router';
import StatCard from '../../components/StatCard';
import { useCases, useCatalog, useVisits } from '../../../../api/queries';
import { useSession } from '../../../../auth/AuthContext';
import {
  CASE_STATUS_LABEL,
  CASE_STATUS_STYLE,
  diseaseName,
  formatTime,
  greetingText,
  isoDay,
  mapsLink,
  RISK_DOT,
  RISK_LABEL,
  RISK_STYLE,
  riskKey,
  symptomLabel,
  timeAgo,
} from '../../../../lib/format';
import { QueryState, EmptyState } from '../../../../shared/ui/States';

function todayBounds() {
  const start = new Date(`${isoDay()}T00:00:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { from: start.toISOString(), to: end.toISOString() };
}

export default function VetDashboard() {
  const session = useSession();
  const catalog = useCatalog();
  const today = todayBounds();
  const queue = useCases({ open: true, sort: 'priority', limit: 50 }, { refetchInterval: 60_000 });
  const resolvedToday = useCases({ status: 'resolved', updatedSince: today.from, limit: 100 });
  const visits = useVisits({ mine: true, from: today.from, to: today.to });

  const items = queue.data?.items ?? [];
  const open = items.filter(c => c.status === 'active').length;
  const inProgress = items.length - open;
  const urgent = items.filter(c => c.riskLevel === 'high').length;
  const firstName = session.name.replace(/^Dr\.?\s+/, '').split(' ')[0];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-display text-[#1B4332]">{greetingText()}, Dr. {firstName} 🩺</h2>
        <p className="text-gray-500">{session.district ?? 'Your area'} • Today's overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="New Cases" value={open} icon="📋" gradient="gradient-card-alert" />
        <StatCard label="In Progress" value={inProgress} icon="🔄" gradient="gradient-card-amber" delay={100} />
        <StatCard label="Resolved Today" value={resolvedToday.data?.items.length ?? 0} icon="✅" gradient="gradient-card-green" delay={200} />
        <StatCard label="Field Visits" value={visits.data?.items.length ?? 0} icon="🗓️" gradient="gradient-card-sky" delay={300} />
      </div>

      {/* Priority Queue */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold font-display text-[#1B4332] text-lg">Priority Case Queue</h3>
          <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-semibold">{urgent} urgent</span>
        </div>
        <QueryState query={queue} loadingLabel="Loading cases…">
          {(data) =>
            data.items.length === 0 ? (
              <EmptyState icon="🌿" title="No open cases in your area" body="New reports from farmers appear here, most urgent first." />
            ) : (
              <div className="divide-y divide-gray-50">
                {data.items.map(c => {
                  const risk = riskKey(c.riskLevel);
                  return (
                    <Link key={c.id} to={`/user/vet/case/${c.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-[#FAF9F6] transition-colors">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${RISK_DOT[risk]}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 font-display">{c.owner.fullName}</p>
                        <p className="text-gray-500 text-sm truncate">
                          {c.suspectedDiseaseCode
                            ? diseaseName(c.suspectedDiseaseCode, catalog.data)
                            : c.symptomCodes.map(s => symptomLabel(s, catalog.data)).join(', ')}
                          {' • '}
                          {c.region?.path.slice(-2).map(p => p.name).reverse().join(', ')}
                        </p>
                        <p className="text-gray-400 text-xs mt-0.5">{c.caseNumber} • {timeAgo(c.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${RISK_STYLE[risk]}`}>{RISK_LABEL[risk]}</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${CASE_STATUS_STYLE[c.status]}`}>{CASE_STATUS_LABEL[c.status]}</span>
                        <span className="text-gray-400 text-sm">→</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )
          }
        </QueryState>
      </div>

      {/* Today's Visits */}
      <div className="mt-5 bg-white rounded-2xl shadow-card border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold font-display text-[#1B4332] text-lg">Today's Field Visits</h3>
          <Link to="/user/vet/field-visits" className="text-sm text-[#1B4332] font-semibold hover:underline">View Calendar →</Link>
        </div>
        {visits.isSuccess && visits.data.items.length === 0 && <p className="text-sm text-gray-500">No visits scheduled for today.</p>}
        <div className="space-y-3">
          {(visits.data?.items ?? []).map(v => {
            const link = mapsLink(v.herd.lat, v.herd.lng);
            return (
              <div key={v.id} className="flex items-center gap-4 p-3 bg-[#FAF9F6] rounded-xl">
                <div className="text-center min-w-[48px]">
                  <p className="text-xs text-gray-400">Today</p>
                  <p className="font-bold text-[#1B4332] font-display text-sm">{formatTime(v.scheduledAt)}</p>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 text-sm">{v.herd.name}</p>
                  <p className="text-gray-500 text-xs">{v.purpose ?? v.type.replace('_', ' ')}</p>
                </div>
                {link && (
                  <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs bg-[#1B4332] text-white px-3 py-1.5 rounded-lg hover:bg-[#2D6A4F] transition-colors font-semibold">
                    Navigate →
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

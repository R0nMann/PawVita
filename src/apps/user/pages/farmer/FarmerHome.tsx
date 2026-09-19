import { Link } from 'react-router';
import { outbreakClusters } from '../../data/aiPreview';
import { useAdvisories, useAnimals, useCases, useDueVaccinations } from '../../../../api/queries';
import type { AnimalStatus } from '../../../../api/types';
import { useSession } from '../../../../auth/AuthContext';
import { CASE_STATUS_LABEL, CASE_STATUS_STYLE, formatDate, greeting, speciesEmoji } from '../../../../lib/format';
import { useOnline, useOutbox } from '../../../../offline/useOutbox';

/** Tile colours: green healthy, yellow under care, red needs attention. */
const healthColors: Record<AnimalStatus, { bg: string; text: string; dot: string }> = {
  healthy: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  recovering: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  under_treatment: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  sick: { bg: 'bg-red-100', text: 'text-red-600', dot: 'bg-red-500' },
  dead: { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
  sold: { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
};

export default function FarmerHome() {
  const session = useSession();
  const online = useOnline();
  const outbox = useOutbox();
  const animalsQ = useAnimals({ status: ['healthy', 'sick', 'under_treatment', 'recovering'] });
  const casesQ = useCases({ open: true, sort: 'recent' });
  const dueQ = useDueVaccinations({ withinDays: 30 });
  const advisoriesQ = useAdvisories({ limit: 20 });

  const animals = animalsQ.data?.items ?? [];
  const openCases = casesQ.data?.items ?? [];
  const due = dueQ.data?.items ?? [];
  const overdue = due.filter(v => v.status === 'overdue').length;
  const upcoming = due.filter(v => v.status === 'upcoming').length;
  const needsAttention = animals.filter(a => a.status === 'sick').length;
  const queuedReports = outbox.items.filter(i => i.kind === 'case');
  const isFieldWorker = session.account.role === 'field_worker';

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      {/* Greeting */}
      <div className="mb-6">
        <p className="text-gray-500 text-sm">{greeting()}</p>
        <h1 className="text-2xl font-bold font-display text-[#1B4332]">{session.name}</h1>
        {session.district && <p className="text-gray-500 text-sm">{session.district}</p>}
      </div>

      {/* Alert Banner */}
      {needsAttention > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div className="flex-1">
            <p className="font-semibold text-red-700 font-display">Action needed</p>
            <p className="text-sm text-red-600">{needsAttention} animal(s) need your attention</p>
          </div>
          <Link to="/user/farmer/my-animals" className="text-red-600 font-semibold text-sm hover:underline">View →</Link>
        </div>
      )}

      {/* Offline / sync status — only when there is something to say */}
      {(!online || outbox.items.length > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-5 flex items-center gap-3">
          <span className="text-lg">📡</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-700">{online ? 'Sending saved reports…' : 'Offline mode active'}</p>
            <p className="text-xs text-amber-600">
              {outbox.pending.length
                ? `${outbox.pending.length} item(s) saved on this phone — will sync when online`
                : 'Reports you make now are saved on this phone and sent later'}
              {outbox.failed.length > 0 && ` · ${outbox.failed.length} need attention`}
            </p>
          </div>
          {online && outbox.pending.length > 0 ? (
            <button onClick={() => void outbox.flush()} className="text-xs font-semibold text-amber-700 hover:underline">
              Sync now
            </button>
          ) : (
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
          )}
        </div>
      )}

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
          {overdue === 0 && upcoming === 0 && dueQ.isSuccess && <p className="text-[#0F2D1F]/70 text-xs mt-1">All up to date</p>}
        </Link>
        <Link to="/user/farmer/my-animals" className="bg-white rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all border border-gray-100">
          <span className="text-3xl mb-2 block">🐄</span>
          <p className="font-bold font-display text-lg text-[#1B4332] leading-tight">{isFieldWorker ? 'Herds' : 'My Herd'}</p>
          <p className="text-gray-500 text-xs mt-1">{animalsQ.isSuccess ? `${animals.length} animals` : '…'}</p>
        </Link>
        <Link to="/user/farmer/alerts" className="bg-white rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all border border-gray-100">
          <span className="text-3xl mb-2 block">🔔</span>
          <p className="font-bold font-display text-lg text-[#1B4332] leading-tight">Alerts</p>
          <p className="text-gray-500 text-xs mt-1">
            {advisoriesQ.isSuccess ? `${advisoriesQ.data.items.length} active advisories` : '…'}
          </p>
        </Link>
      </div>

      {/* Herd Health Snapshot */}
      <div className="bg-white rounded-2xl p-5 shadow-card mb-5 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold font-display text-[#1B4332] text-lg">{isFieldWorker ? 'Animals in my area' : 'My Animals'}</h2>
          <Link to="/user/farmer/my-animals" className="text-sm text-[#1B4332] font-semibold">View all →</Link>
        </div>
        {animalsQ.isSuccess && animals.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 mb-3">No animals registered yet.</p>
            <Link to="/user/farmer/my-animals?add=1" className="inline-block bg-[#1B4332] text-white px-4 py-2 rounded-xl text-sm font-semibold">
              + Add your first animal
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              {animals.slice(0, 6).map(a => {
                const hc = healthColors[a.status];
                return (
                  <Link key={a.id} to="/user/farmer/my-animals" className={`rounded-xl p-3 ${hc.bg} flex flex-col items-center gap-1 hover:opacity-90 transition-opacity`}>
                    <span className="text-2xl">{speciesEmoji(a.species)}</span>
                    <p className={`text-xs font-semibold ${hc.text} font-display truncate max-w-full`}>{a.name ?? a.tagNumber ?? 'Unnamed'}</p>
                    <div className={`w-1.5 h-1.5 rounded-full ${hc.dot}`}></div>
                  </Link>
                );
              })}
            </div>
            <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100">
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2 h-2 bg-green-500 rounded-full"></span> {animals.filter(a => a.status === 'healthy').length} Healthy</span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2 h-2 bg-yellow-500 rounded-full"></span> {animals.filter(a => a.status === 'recovering' || a.status === 'under_treatment').length} Under care</span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2 h-2 bg-red-500 rounded-full"></span> {needsAttention} Sick</span>
            </div>
          </>
        )}
      </div>

      {/* Active Cases */}
      {(openCases.length > 0 || queuedReports.length > 0) && (
        <div className="bg-white rounded-2xl p-5 shadow-card mb-5 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold font-display text-[#1B4332] text-lg">Active Reports</h2>
          </div>
          <div className="space-y-3">
            {queuedReports.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl">
                <span className="text-xl">📦</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{item.label}</p>
                  <p className="text-gray-500 text-xs">{item.failed ? item.lastError : 'Saved on this phone'}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.failed ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                  {item.failed ? 'Not sent' : 'Waiting to send'}
                </span>
              </div>
            ))}
            {openCases.map(c => (
              <Link key={c.id} to={`/user/farmer/case-status/${c.id}`} className="flex items-center gap-3 p-3 bg-[#FAF9F6] rounded-xl hover:bg-gray-100 transition-colors">
                <span className="text-xl">📋</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">
                    {c.animal?.name ?? c.herd.name} · {c.caseNumber}
                  </p>
                  <p className="text-gray-500 text-xs">{formatDate(c.reportedAt)}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${CASE_STATUS_STYLE[c.status]}`}>
                  {CASE_STATUS_LABEL[c.status]}
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

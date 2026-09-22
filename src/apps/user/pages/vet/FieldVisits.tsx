import { useState } from 'react';
import { Link } from 'react-router';
import { visitApi } from '../../../../api/endpoints';
import { useApiMutation, useVisits } from '../../../../api/queries';
import type { Visit, VisitStatus } from '../../../../api/types';
import { formatDate, formatTime, isoDay, isoOffset, mapsLink } from '../../../../lib/format';
import { Loading } from '../../../../shared/ui/States';

const monthName = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' });

export default function FieldVisits() {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState(isoDay());
  const from = month;
  const to = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const visitsQ = useVisits({ mine: true, from: from.toISOString(), to: to.toISOString() });
  const recentQ = useVisits({ mine: true, status: 'completed', from: isoOffset(-30 * 86400000) });
  const update = useApiMutation(
    ({ id, status }: { id: string; status: VisitStatus }) => visitApi.update(id, { status }),
    [['visits'], ['cases']],
  );

  const visits = visitsQ.data?.items ?? [];
  const byDay = new Map<string, Visit[]>();
  for (const v of visits) {
    const day = isoDay(new Date(v.scheduledAt));
    byDay.set(day, [...(byDay.get(day) ?? []), v]);
  }
  const dayVisits = (byDay.get(selected) ?? []).filter(v => v.status !== 'cancelled');
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const leading = month.getDay();
  const today = isoDay();
  const selectedLabel = selected === today ? 'Today' : formatDate(selected);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-display text-[#1B4332]">Field Visits</h2>
        <p className="text-gray-500">{formatDate(today)} — {(byDay.get(today) ?? []).filter(v => v.status === 'scheduled').length} visits scheduled today</p>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold font-display text-[#1B4332]">{monthName.format(month)}</h3>
          <div className="flex gap-2">
            <button aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg">←</button>
            <button aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg">→</button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="text-xs font-semibold text-gray-400 py-1">{d}</div>
          ))}
          {Array.from({ length: leading }).map((_, i) => <div key={`pad-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = isoDay(new Date(month.getFullYear(), month.getMonth(), i + 1));
            const hasVisit = (byDay.get(day) ?? []).some(v => v.status !== 'cancelled');
            const isSelected = day === selected;
            return (
              <button
                key={day}
                onClick={() => setSelected(day)}
                aria-pressed={isSelected}
                className={`text-sm py-2 rounded-lg transition-colors ${
                  isSelected ? 'bg-[#1B4332] text-white font-bold' :
                  hasVisit ? 'bg-amber-100 text-amber-700 font-semibold' :
                  day === today ? 'ring-1 ring-[#1B4332] text-[#1B4332]' :
                  'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {i + 1}
                {hasVisit && !isSelected && <div className="w-1 h-1 bg-amber-500 rounded-full mx-auto mt-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      <h3 className="font-bold font-display text-[#1B4332] mb-4 text-lg">{selectedLabel}'s Schedule</h3>
      {visitsQ.isPending && <Loading />}
      {visitsQ.isSuccess && dayVisits.length === 0 && (
        <p className="text-sm text-gray-500 mb-6">No visits on this day. Schedule visits from a case page.</p>
      )}
      <div className="space-y-3 mb-6">
        {dayVisits.map(v => {
          const link = mapsLink(v.herd.lat, v.herd.lng);
          return (
            <div key={v.id} className="bg-white rounded-2xl p-5 shadow-card border border-gray-100 flex flex-wrap items-center gap-4">
              <div className="gradient-card-green rounded-xl p-3 text-center min-w-[60px]">
                <p className="text-white/80 text-xs font-display">{selected === today ? 'Today' : formatDate(selected).split(' ').slice(0, 2).join(' ')}</p>
                <p className="text-white font-bold text-lg font-display">{formatTime(v.scheduledAt)}</p>
              </div>
              <div className="flex-1 min-w-[160px]">
                <p className="font-bold font-display text-gray-800">{v.herd.name}</p>
                <p className="text-gray-500 text-sm">{v.herd.address ?? v.purpose ?? v.type.replace('_', ' ')}</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {v.purpose}
                  {v.caseId && <> • <Link to={`/user/vet/case/${v.caseId}`} className="underline">Open case</Link></>}
                  {v.status !== 'scheduled' && ` • ${v.status.replace('_', ' ')}`}
                </p>
              </div>
              <div className="flex gap-2">
                {v.status === 'scheduled' && (
                  <button disabled={update.isPending} onClick={() => update.mutate({ id: v.id, status: 'in_progress' })} className="border border-gray-200 text-gray-700 px-3 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50">
                    Start
                  </button>
                )}
                {(v.status === 'scheduled' || v.status === 'in_progress') && (
                  <button disabled={update.isPending} onClick={() => update.mutate({ id: v.id, status: 'completed' })} className="border border-green-200 bg-green-50 text-green-700 px-3 py-2.5 rounded-xl text-sm font-semibold">
                    ✓ Done
                  </button>
                )}
                {link && (
                  <a href={link} target="_blank" rel="noopener noreferrer" className="bg-sky-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-sky-600 transition-colors">
                    📍 Navigate
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <h3 className="font-bold font-display text-gray-500 mb-4">Recently Completed</h3>
      {recentQ.isSuccess && recentQ.data.items.length === 0 && <p className="text-sm text-gray-400">No completed visits in the last 30 days.</p>}
      <div className="space-y-3">
        {(recentQ.data?.items ?? []).slice().reverse().slice(0, 10).map(v => (
          <div key={v.id} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-4 opacity-70">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">✅</div>
            <div className="flex-1">
              <p className="font-semibold text-gray-700">{v.herd.name}</p>
              <p className="text-gray-400 text-sm">{v.purpose} • {formatDate(v.scheduledAt)} {formatTime(v.scheduledAt)}</p>
            </div>
            <span className="text-xs text-green-600 font-semibold">Completed</span>
          </div>
        ))}
      </div>
    </div>
  );
}

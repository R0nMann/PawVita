import { useNavigate, useParams } from 'react-router';
import { resolveApiUrl } from '../../../../api/config';
import { useCase } from '../../../../api/queries';
import type { CaseStatus as Status, TimelineEvent } from '../../../../api/types';
import { formatDate, formatDateTime, RISK_LABEL, riskKey } from '../../../../lib/format';
import { QueryState } from '../../../../shared/ui/States';

const STATUS_STEPS: { key: Status; label: string; icon: string; desc: string }[] = [
  { key: 'active', label: 'Report Submitted', icon: '📋', desc: 'Your report has been received and logged in the system.' },
  { key: 'under_review', label: 'Vet Reviewing', icon: '🩺', desc: 'A veterinary officer is reviewing your case.' },
  { key: 'lab_pending', label: 'Lab Testing', icon: '🧪', desc: 'Samples sent to the lab for diagnostic confirmation.' },
  { key: 'treated', label: 'Treated', icon: '💊', desc: 'Treatment has been given. Follow the instructions below.' },
  { key: 'resolved', label: 'Resolved', icon: '✅', desc: 'Case has been closed.' },
];

const EVENT_ICON: Record<string, string> = {
  advice: '💬',
  note: '📝',
  treatment_added: '💊',
  lab_requested: '🧪',
  lab_result: '🔬',
  lab_status_changed: '🧪',
  visit_scheduled: '🗓️',
  assigned: '👨‍⚕️',
  assessment_updated: '🩺',
  vaccination_recorded: '💉',
  attachment_added: '📷',
};

export default function CaseStatus() {
  const { id } = useParams();
  const navigate = useNavigate();
  const caseQ = useCase(id);

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <QueryState query={caseQ} loadingLabel="Loading case…">
        {(c) => {
          const currentStep = STATUS_STEPS.findIndex(s => s.key === c.status);
          const current = STATUS_STEPS[Math.max(0, currentStep)]!;
          const updates = c.timeline.filter((e: TimelineEvent) => e.type !== 'created' && e.type !== 'status_changed' && e.body);
          const risk = riskKey(c.riskLevel);
          return (
            <>
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors" aria-label="Back">
                  ←
                </button>
                <div>
                  <h1 className="text-xl font-bold font-display text-[#1B4332]">Case {c.caseNumber}</h1>
                  <p className="text-gray-500 text-sm">
                    {c.animal?.name ?? c.herd?.name}
                    {c.confirmedDisease?.name ?? c.suspectedDisease?.name ? ` · ${c.confirmedDisease?.name ?? c.suspectedDisease?.name}` : ''}
                  </p>
                </div>
              </div>

              {/* Status Card */}
              <div className="gradient-card-green rounded-2xl p-5 text-white mb-5">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{current.icon}</span>
                  <div>
                    <p className="text-white/70 text-sm">Current Status</p>
                    <p className="font-bold font-display text-xl">{current.label}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <span className="text-amber-400 font-semibold text-sm">{c.assignedVet?.fullName ?? 'Assigning a vet'}</span>
                  <span className="text-white/40">•</span>
                  <span className="text-white/70 text-sm">{formatDateTime(c.reportedAt)}</span>
                  {c.assignedVet?.phone && (
                    <a href={`tel:${c.assignedVet.phone}`} className="ml-auto bg-white/15 rounded-lg px-3 py-1 text-xs font-semibold">
                      📞 Call vet
                    </a>
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white rounded-2xl p-5 shadow-card mb-5 border border-gray-100">
                <h2 className="font-bold font-display text-[#1B4332] mb-5">Case Timeline</h2>
                <div className="relative">
                  <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-100" />
                  <div className="space-y-6">
                    {STATUS_STEPS.map((s, i) => {
                      const done = i <= currentStep;
                      const isCurrent = i === currentStep;
                      return (
                        <div key={s.key} className="flex gap-4 items-start">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 relative z-10 ${
                            done ? 'bg-[#1B4332]' : 'bg-gray-100'
                          } ${isCurrent ? 'ring-4 ring-[#1B4332]/20' : ''}`}>
                            {s.icon}
                          </div>
                          <div className="flex-1">
                            <p className={`font-semibold font-display ${done ? 'text-[#1B4332]' : 'text-gray-400'}`}>{s.label}</p>
                            {done && <p className="text-gray-500 text-sm mt-0.5">{s.desc}</p>}
                          </div>
                          {isCurrent && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-semibold flex-shrink-0">Current</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Updates from the vet */}
              {updates.length > 0 && (
                <div className="bg-white rounded-2xl p-5 shadow-card mb-5 border border-gray-100">
                  <h2 className="font-bold font-display text-[#1B4332] mb-4">Updates from the vet</h2>
                  <ul className="space-y-3">
                    {[...updates].reverse().map(e => (
                      <li key={e.id} className="flex gap-3 bg-[#FAF9F6] rounded-xl p-3">
                        <span className="text-xl">{EVENT_ICON[e.type] ?? '📌'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800">{e.body}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {e.actor?.fullName ? `${e.actor.fullName} · ` : ''}{formatDateTime(e.createdAt)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Case Details */}
              <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
                <h2 className="font-bold font-display text-[#1B4332] mb-4">Case Details</h2>
                <div className="space-y-3">
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-gray-500">Reported Symptoms</span>
                    <span className="font-medium text-gray-800 text-right">{c.symptoms.map(s => s.label).join(', ') || '—'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Risk level</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      risk === 'high' ? 'severity-high' : risk === 'moderate' ? 'severity-medium' : risk === 'low' ? 'severity-low' : 'bg-gray-100 text-gray-600'
                    }`}>{RISK_LABEL[risk]}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Animals sick / died</span>
                    <span className="font-medium text-gray-800">{c.animalsAffected} / {c.animalsDead}</span>
                  </div>
                  {c.labRequests.map(l => (
                    <div key={l.id} className="flex justify-between gap-4 text-sm">
                      <span className="text-gray-500">Lab test ({l.tests.join(', ')})</span>
                      <span className="font-medium text-gray-800 text-right">{l.resultSummary ?? l.status}</span>
                    </div>
                  ))}
                  {c.resolvedAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Closed</span>
                      <span className="font-medium text-gray-800">{formatDate(c.resolvedAt)}{c.outcome ? ` · ${c.outcome.replace('_', ' ')}` : ''}</span>
                    </div>
                  )}
                </div>
                {c.attachments.some(a => a.kind === 'photo') && (
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {c.attachments.filter(a => a.kind === 'photo').map(a => (
                      <img key={a.id} src={resolveApiUrl(a.url)} alt="Photo sent with the report" className="w-full aspect-square object-cover rounded-xl border border-gray-100" />
                    ))}
                  </div>
                )}
              </div>
            </>
          );
        }}
      </QueryState>
    </div>
  );
}

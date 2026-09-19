import { useParams, useNavigate } from 'react-router';
import { useState } from 'react';
import { resolveApiUrl } from '../../../../api/config';
import { caseApi } from '../../../../api/endpoints';
import { useApiMutation, useCase } from '../../../../api/queries';
import type { CaseDetail as Case } from '../../../../api/types';
import { formatDateTime, mapsLink, RISK_LABEL, riskKey, SPECIES_LABEL, timeAgo } from '../../../../lib/format';
import { caseAiSummary } from '../../../../shared/ai/preview';
import {
  AssessmentCard,
  AssignCard,
  LabRequestForm,
  LabRequestList,
  ScheduleVisitCard,
  StatusCard,
  TimelineList,
} from '../../../../shared/cases/CaseActions';
import { FormError, QueryState } from '../../../../shared/ui/States';

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const caseQ = useCase(id);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <QueryState query={caseQ} loadingLabel="Loading case…">
        {(c) => <CaseView c={c} onBack={() => navigate(-1)} />}
      </QueryState>
    </div>
  );
}

function CaseView({ c, onBack }: { c: Case; onBack: () => void }) {
  const risk = riskKey(c.riskLevel);
  const ai = caseAiSummary(c.symptoms.map(s => s.code), c.aiAssessments);
  const place = c.region?.path.slice().reverse() ?? [];
  const farm = mapsLink(c.location.lat ?? c.herd?.lat, c.location.lng ?? c.herd?.lng);

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors text-sm">
          ← Back
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold font-display text-[#1B4332]">Case {c.caseNumber}</h2>
          <p className="text-gray-500 text-sm">
            {c.confirmedDisease?.name ?? c.suspectedDisease?.name ?? 'Awaiting assessment'} · reported {timeAgo(c.reportedAt)}
            {c.capturedOffline && ' · captured offline'}
          </p>
        </div>
        <span className={`text-sm px-3 py-1.5 rounded-full font-semibold ${
          risk === 'high' ? 'severity-high' : risk === 'moderate' ? 'severity-medium' : risk === 'low' ? 'severity-low' : 'bg-gray-100 text-gray-600'
        }`}>{RISK_LABEL[risk]} priority</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
              <h3 className="font-bold font-display text-[#1B4332] mb-4">Farmer Details</h3>
              <div className="space-y-3 text-sm">
                {[
                  ['Name', c.owner?.fullName],
                  ['Phone', c.owner?.phone],
                  ['Village', place[0]?.name],
                  ['District', place.find(p => p.level === 'district')?.name],
                  ['Species', c.animal ? SPECIES_LABEL[c.animal.species] : `Herd — ${c.herd?.name}`],
                  ['Animal', c.animal ? `${c.animal.name ?? ''} ${c.animal.tagNumber ? `(${c.animal.tagNumber})` : ''}`.trim() : `${c.animalsAffected} affected`],
                  ['Deaths', String(c.animalsDead)],
                  ['Reported by', c.reporter && c.reporter.id !== c.owner?.id ? `${c.reporter.fullName} (${c.reporter.role.replace('_', ' ')})` : null],
                ].filter(([, v]) => v).map(([l, v]) => (
                  <div key={l} className="flex justify-between gap-3">
                    <span className="text-gray-500">{l}</span>
                    <span className="font-semibold text-gray-800 text-right">{v}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                {farm && (
                  <a href={farm} target="_blank" rel="noopener noreferrer" className="flex-1 block text-center bg-sky-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-sky-600 transition-colors">
                    📍 Navigate to Farm
                  </a>
                )}
                {c.owner?.phone && (
                  <a href={`tel:${c.owner.phone}`} className="px-4 text-center bg-green-50 text-green-700 border border-green-200 py-2.5 rounded-xl text-sm font-semibold">
                    📞 Call
                  </a>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
              <h3 className="font-bold font-display text-[#1B4332] mb-4">AI Assessment</h3>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-3">
                <p className="font-bold text-red-700 font-display">{ai.disease}</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2 mb-1">
                  <div className="bg-red-500 h-2 rounded-full" style={{ width: `${ai.confidence}%` }} />
                </div>
                <p className="text-xs text-gray-500">{ai.confidence}% confidence • Reported {formatDateTime(c.reportedAt)}</p>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                {ai.note.split('. ').filter(Boolean).map(line => (
                  <p key={line}>• {line.replace(/\.$/, '')}</p>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
            <h3 className="font-bold font-display text-[#1B4332] mb-3">Reported Signs</h3>
            <div className="flex flex-wrap gap-2">
              {c.symptoms.map(s => (
                <span key={s.code} className="bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 text-sm rounded-full font-medium">
                  {s.icon} {s.name}
                </span>
              ))}
            </div>
            {c.description && <p className="text-sm text-gray-600 mt-3 italic">"{c.description}"</p>}
            {c.attachments.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-4">
                {c.attachments.map(a =>
                  a.kind === 'photo' ? (
                    <a key={a.id} href={resolveApiUrl(a.url)} target="_blank" rel="noopener noreferrer">
                      <img src={resolveApiUrl(a.url)} alt="Photo from the report" className="w-full aspect-square object-cover rounded-xl border border-gray-100" />
                    </a>
                  ) : a.kind === 'voice' ? (
                    <audio key={a.id} controls src={resolveApiUrl(a.url)} className="col-span-3 w-full" />
                  ) : (
                    <a key={a.id} href={resolveApiUrl(a.url)} target="_blank" rel="noopener noreferrer" className="text-sm text-sky-600 underline">
                      📎 {a.originalName ?? 'Document'}
                    </a>
                  ),
                )}
              </div>
            )}
          </div>

          <TreatmentLog c={c} />

          <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
            <h3 className="font-bold font-display text-[#1B4332] mb-4">Case Timeline</h3>
            <TimelineList events={c.timeline} />
          </div>
        </div>

        <div className="space-y-5">
          <StatusCard c={c} />
          <AssessmentCard c={c} />
          <AssignCard c={c} />
          <ScheduleVisitCard c={c} />
          <div className="rounded-2xl p-5 border bg-white border-gray-100 shadow-card">
            <h3 className="font-bold font-display text-[#1B4332] mb-2">Lab Escalation</h3>
            <p className="text-sm text-gray-500 mb-4">Send samples to laboratory for confirmatory diagnosis</p>
            <div className="mb-4"><LabRequestList c={c} /></div>
            {c.status !== 'resolved' && <LabRequestForm c={c} />}
          </div>
        </div>
      </div>
    </>
  );
}

/** Diagnosis notes and treatment, recorded together as in the original screen. */
function TreatmentLog({ c }: { c: Case }) {
  const [notes, setNotes] = useState('');
  const [treatment, setTreatment] = useState('');
  const [instructions, setInstructions] = useState('');
  const [withdrawal, setWithdrawal] = useState('');
  const save = useApiMutation(async () => {
    if (treatment.trim()) {
      await caseApi.addTreatment(c.id, {
        medicine: treatment.trim(),
        instructions: instructions.trim() || undefined,
        withdrawalPeriodDays: withdrawal ? Number(withdrawal) : undefined,
        notes: notes.trim() || undefined,
      });
    } else {
      await caseApi.addNote(c.id, { body: notes.trim() });
    }
  }, [['cases'], ['animals']]);

  return (
    <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
      <h3 className="font-bold font-display text-[#1B4332] mb-4">Treatment Log</h3>
      {c.treatments.length > 0 && (
        <ul className="space-y-2 mb-4">
          {c.treatments.map(t => (
            <li key={t.id} className="bg-[#FAF9F6] rounded-xl px-3 py-2 text-sm">
              <p className="font-semibold text-gray-800">💊 {t.medicine}{t.dosage ? ` — ${t.dosage}` : ''}</p>
              {t.instructions && <p className="text-gray-600 text-xs mt-0.5">{t.instructions}</p>}
              <p className="text-gray-400 text-xs mt-0.5">
                From {t.startDate}{t.withdrawalPeriodDays ? ` · withdrawal ${t.withdrawalPeriodDays} days` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
      {c.permissions.addTreatment && c.status !== 'resolved' && (
        <form
          onSubmit={e => {
            e.preventDefault();
            if (!notes.trim() && !treatment.trim()) return;
            save.mutate(undefined, { onSuccess: () => { setNotes(''); setTreatment(''); setInstructions(''); setWithdrawal(''); } });
          }}
        >
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-2">Diagnosis Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g., Animal confirmed with FMD. Blisters observed on mouth and hooves. Isolated from herd."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none h-24 outline-none focus:border-[#1B4332] bg-[#FAF9F6]"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-2">Treatment Prescribed</label>
              <input
                value={treatment}
                onChange={e => setTreatment(e.target.value)}
                placeholder="e.g., Antipyretics, wound dressing, oral antiseptic spray..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1B4332] bg-[#FAF9F6]"
              />
            </div>
            {treatment.trim() && (
              <div className="grid grid-cols-3 gap-3">
                <input
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  placeholder="Instructions for the farmer"
                  className="col-span-2 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1B4332] bg-[#FAF9F6]"
                />
                <input
                  type="number"
                  min={0}
                  value={withdrawal}
                  onChange={e => setWithdrawal(e.target.value)}
                  placeholder="Milk/meat withdrawal (days)"
                  className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1B4332] bg-[#FAF9F6]"
                />
              </div>
            )}
          </div>
          <FormError error={save.error} />
          <button disabled={save.isPending} className="w-full bg-[#1B4332] text-white py-3 rounded-xl font-bold font-display hover:bg-[#2D6A4F] transition-colors disabled:opacity-50">
            {save.isPending ? 'Saving…' : 'Save Treatment Log'}
          </button>
          {save.isSuccess && <p className="text-xs text-green-700 font-semibold mt-2 text-center">✓ Saved to the case</p>}
        </form>
      )}
    </div>
  );
}

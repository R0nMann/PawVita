import { Link, useNavigate, useParams } from 'react-router';
import { resolveApiUrl } from '../../../../api/config';
import { useCase } from '../../../../api/queries';
import type { CaseDetail as Case } from '../../../../api/types';
import { useSession } from '../../../../auth/AuthContext';
import {
  ageFrom,
  CASE_STATUS_LABEL,
  CASE_STATUS_STYLE,
  formatDate,
  formatDateTime,
  LAB_STATUS_LABEL,
  LAB_STATUS_STYLE,
  RISK_LABEL,
  RISK_STYLE,
  riskKey,
  SPECIES_LABEL,
  timeAgo,
} from '../../../../lib/format';
import { NoteForm, TimelineList } from '../../../../shared/cases/CaseActions';
import { QueryState } from '../../../../shared/ui/States';

/**
 * The case behind a sample, read-only. The technician gets the clinical
 * picture needed to interpret a result — signs, prior treatment, vaccination
 * history, the other samples — but none of the vet's actions, and no farmer
 * contact details: results reach the farmer through the referring vet.
 */
export default function LabCaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const caseQ = useCase(id);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <QueryState query={caseQ} loadingLabel="Loading case…">
        {(c) => <CaseView c={c} onBack={() => navigate(-1)} />}
      </QueryState>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100 mb-5">
      <h3 className="font-bold font-display text-[#1B4332] mb-4">{title}</h3>
      {children}
    </div>
  );
}

function CaseView({ c, onBack }: { c: Case; onBack: () => void }) {
  const risk = riskKey(c.riskLevel);
  const place = c.region?.path ?? [];
  const named = (level: string) => place.find(p => p.level === level)?.name;

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
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-5">
        <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${CASE_STATUS_STYLE[c.status]}`}>{CASE_STATUS_LABEL[c.status]}</span>
        <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${RISK_STYLE[risk]}`}>{RISK_LABEL[risk]} risk</span>
      </div>

      <Panel title="Specimen Context">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {([
            ['Species', c.animal ? SPECIES_LABEL[c.animal.species] : 'Herd-level report'],
            ['Animal', c.animal ? `${c.animal.name ?? 'Unnamed'}${c.animal.tagNumber ? ` (${c.animal.tagNumber})` : ''}` : c.herd?.name],
            ['Breed', c.animal?.breed],
            ['Age', ageFrom(c.animal?.birthDate)],
            ['Village', named('village')],
            ['District', named('district')],
            ['State', named('state')],
            ['Animals affected', String(c.animalsAffected)],
            ['Deaths', String(c.animalsDead)],
            ['Onset', c.onsetDate ? formatDate(c.onsetDate) : null],
            ['Reported', formatDateTime(c.reportedAt)],
          ] as [string, string | null | undefined][])
            .filter(([, v]) => v)
            .map(([l, v]) => (
              <div key={l} className="bg-[#FAF9F6] rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-0.5">{l}</p>
                <p className="font-semibold text-gray-800 font-display">{v}</p>
              </div>
            ))}
        </div>
      </Panel>

      <Panel title="Clinical Picture">
        <div className="flex flex-wrap gap-2">
          {c.symptoms.map(s => (
            <span key={s.code} className="bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 text-sm rounded-full font-medium">
              {s.icon} {s.label}
            </span>
          ))}
          {c.symptoms.length === 0 && <p className="text-sm text-gray-500">No signs recorded.</p>}
        </div>
        {c.description && <p className="text-sm text-gray-600 mt-3 italic">"{c.description}"</p>}

        {/* Antibiotics or a recent vaccination can change how a result reads. */}
        {(c.priorTreatmentNotes || c.priorVaccinationNotes) && (
          <div className="mt-4 space-y-2 text-sm">
            {c.priorTreatmentNotes && (
              <p className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-amber-800">
                <span className="font-semibold">Treated before sampling:</span> {c.priorTreatmentNotes}
              </p>
            )}
            {c.priorVaccinationNotes && (
              <p className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-amber-800">
                <span className="font-semibold">Vaccination noted by the reporter:</span> {c.priorVaccinationNotes}
              </p>
            )}
          </div>
        )}

        {!!c.animal?.vaccinations.length && (
          <ul className="mt-4 space-y-1.5 text-sm">
            {c.animal.vaccinations.map(v => (
              <li key={v.vaccineCode} className="flex items-center justify-between gap-3 bg-[#FAF9F6] rounded-xl px-3 py-2">
                <span className="text-gray-700">💉 {v.vaccineName} <span className="text-gray-400">· {formatDate(v.administeredOn)}</span></span>
                <span className={`text-xs font-semibold shrink-0 ${v.status === 'overdue' ? 'text-red-600' : 'text-green-700'}`}>
                  {v.status === 'overdue' ? 'Overdue' : 'Up to date'}
                </span>
              </li>
            ))}
          </ul>
        )}

        {c.attachments.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-4">
            {c.attachments.map(a =>
              a.kind === 'photo' ? (
                <a key={a.id} href={resolveApiUrl(a.url)} target="_blank" rel="noopener noreferrer">
                  <img src={resolveApiUrl(a.url)} alt="Photo from the report" className="w-full aspect-square object-cover rounded-xl border border-gray-100" />
                </a>
              ) : a.kind === 'voice' ? (
                <audio key={a.id} controls src={resolveApiUrl(a.url)} className="col-span-3 w-full" />
              ) : (
                <a key={a.id} href={resolveApiUrl(a.url)} target="_blank" rel="noopener noreferrer" className="text-sm text-sky-600 underline self-center">
                  📎 {a.originalName ?? 'Document'}
                </a>
              ),
            )}
          </div>
        )}
      </Panel>

      <Panel title="Samples on this Case">
        <CaseSamples c={c} />
      </Panel>

      {c.permissions.addNote && (
        <Panel title="Laboratory Note">
          <p className="text-sm text-gray-500 mb-3">Visible to the vet and the case team — the farmer is told through the referring vet.</p>
          <NoteForm c={c} allowShare={false} placeholder="e.g. Sample haemolysed on arrival — please recollect." />
        </Panel>
      )}

      <Panel title="Case Timeline">
        <TimelineList events={c.timeline} />
      </Panel>
    </>
  );
}

/** Every sample on the case; only this laboratory's own samples are openable. */
function CaseSamples({ c }: { c: Case }) {
  const session = useSession();
  const myLab = session.account.organizationId;
  if (!c.labRequests.length) return <p className="text-sm text-gray-500">No samples on this case.</p>;

  return (
    <ul className="space-y-2">
      {c.labRequests.map(l => {
        const mine = !!myLab && l.labOrgId === myLab;
        const body = (
          <div className={`rounded-xl px-3 py-2 ${mine ? 'bg-purple-50 border border-purple-200' : 'bg-[#FAF9F6]'}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-gray-500">{l.requestNumber}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${LAB_STATUS_STYLE[l.status]}`}>
                {l.result ?? LAB_STATUS_LABEL[l.status]}
              </span>
            </div>
            <p className="text-sm text-gray-700 mt-0.5">
              {l.tests.join(', ')} <span className="text-gray-400">· {l.sampleType}</span>
            </p>
            {l.resultSummary && <p className="text-xs text-gray-500 mt-0.5">{l.resultSummary}</p>}
            {!mine && <p className="text-xs text-gray-400 mt-0.5">Another laboratory</p>}
          </div>
        );
        return <li key={l.id}>{mine ? <Link to={`/user/lab/sample/${l.id}`}>{body}</Link> : body}</li>;
      })}
    </ul>
  );
}

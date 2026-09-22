import { Link, useParams } from "react-router";
import { resolveApiUrl } from "../../../../api/config";
import { useCase } from "../../../../api/queries";
import type { CaseDetail } from "../../../../api/types";
import { useSession } from "../../../../auth/AuthContext";
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
} from "../../../../lib/format";
import { Card, NoteForm, TimelineList } from "../../../../shared/cases/CaseActions";
import { QueryState } from "../../../../shared/ui/States";

/**
 * The case behind a sample, read-only. A technician needs the clinical picture
 * to interpret a result — signs, prior treatment, vaccination history, the
 * other samples on the case — but makes no clinical decisions, so none of the
 * vet's action cards appear here. Contact details are left out too: results
 * reach the farmer through the referring vet.
 */
export default function LabCase() {
  const { id } = useParams();
  const caseQ = useCase(id);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <QueryState query={caseQ} loadingLabel="Loading case…">
        {(c) => <CaseView c={c} />}
      </QueryState>
    </div>
  );
}

function CaseView({ c }: { c: CaseDetail }) {
  const risk = riskKey(c.riskLevel);
  const place = c.region?.path ?? [];
  const named = (level: string) => place.find((p) => p.level === level)?.name;

  return (
    <>
      <div className="flex items-center gap-3">
        <Link to="/hospital/lab/queue" className="text-gray-500 hover:text-gray-700 text-sm">
          ← Sample Queue
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-700 font-mono">{c.caseNumber}</span>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900">Case {c.caseNumber}</h1>
            <p className="text-gray-500 mt-1">
              {c.confirmedDisease?.name ?? c.suspectedDisease?.name ?? "Awaiting assessment"} · reported {timeAgo(c.reportedAt)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${CASE_STATUS_STYLE[c.status]}`}>
              {CASE_STATUS_LABEL[c.status]}
            </span>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${RISK_STYLE[risk]}`}>{RISK_LABEL[risk]} risk</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Specimen Context">
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              {(
                [
                  ["Species", c.animal ? SPECIES_LABEL[c.animal.species] : "Herd-level report"],
                  ["Animal", c.animal ? `${c.animal.name ?? "Unnamed"}${c.animal.tagNumber ? ` (${c.animal.tagNumber})` : ""}` : c.herd?.name],
                  ["Breed", c.animal?.breed],
                  ["Age", ageFrom(c.animal?.birthDate)],
                  ["Village", named("village")],
                  ["Block", named("block")],
                  ["District", named("district")],
                  ["State", named("state")],
                  ["Animals affected", String(c.animalsAffected)],
                  ["Deaths", String(c.animalsDead)],
                  ["Onset", c.onsetDate ? formatDate(c.onsetDate) : null],
                  ["Reported", formatDateTime(c.reportedAt)],
                ] as [string, string | null | undefined][]
              )
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <dt className="text-xs text-gray-500 mb-0.5">{label}</dt>
                    <dd className="font-semibold text-gray-900">{value}</dd>
                  </div>
                ))}
            </dl>
          </Card>

          <Card title="Clinical Picture">
            <div className="flex flex-wrap gap-2">
              {c.symptoms.map((s) => (
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
                {c.animal.vaccinations.map((v) => (
                  <li key={v.vaccineCode} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-3 py-2">
                    <span className="text-gray-700">
                      💉 {v.vaccineName} <span className="text-gray-400">· {formatDate(v.administeredOn)}</span>
                    </span>
                    <span className={`text-xs font-semibold shrink-0 ${v.status === "overdue" ? "text-red-600" : "text-green-700"}`}>
                      {v.status === "overdue" ? "Overdue" : "Up to date"}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {c.attachments.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-4">
                {c.attachments.map((a) =>
                  a.kind === "photo" ? (
                    <a key={a.id} href={resolveApiUrl(a.url)} target="_blank" rel="noopener noreferrer">
                      <img
                        src={resolveApiUrl(a.url)}
                        alt="Photo from the report"
                        className="w-full aspect-square object-cover rounded-xl border border-gray-100"
                      />
                    </a>
                  ) : a.kind === "voice" ? (
                    <audio key={a.id} controls src={resolveApiUrl(a.url)} className="col-span-3 w-full" />
                  ) : (
                    <a
                      key={a.id}
                      href={resolveApiUrl(a.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-sky-600 underline self-center"
                    >
                      📎 {a.originalName ?? "Document"}
                    </a>
                  ),
                )}
              </div>
            )}
          </Card>

          <Card title="Case Timeline">
            <TimelineList events={c.timeline} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Samples on this Case">
            <CaseSamples c={c} />
          </Card>

          {c.permissions.addNote && (
            <Card title="Laboratory Note">
              <p className="text-sm text-gray-500 mb-3">
                Visible to the vet and the case team — the farmer is told through the referring vet.
              </p>
              <NoteForm c={c} allowShare={false} placeholder="e.g. Sample haemolysed on arrival — please recollect." />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

/** Every sample on the case; only this laboratory's own samples are openable. */
function CaseSamples({ c }: { c: CaseDetail }) {
  const session = useSession();
  const myLab = session.account.organizationId;
  if (!c.labRequests.length) return <p className="text-sm text-gray-500">No samples on this case.</p>;

  return (
    <ul className="space-y-2">
      {c.labRequests.map((l) => {
        const mine = !!myLab && l.labOrgId === myLab;
        const body = (
          <div className={`rounded-xl px-3 py-2 ${mine ? "bg-orange-50 border border-orange-200" : "bg-gray-50"}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-gray-500">{l.requestNumber}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${LAB_STATUS_STYLE[l.status]}`}>
                {l.result ?? LAB_STATUS_LABEL[l.status]}
              </span>
            </div>
            <p className="text-sm text-gray-700 mt-0.5">
              {l.tests.join(", ")} <span className="text-gray-400">· {l.sampleType}</span>
            </p>
            {l.resultSummary && <p className="text-xs text-gray-500 mt-0.5">{l.resultSummary}</p>}
            {!mine && <p className="text-xs text-gray-400 mt-0.5">Another laboratory</p>}
          </div>
        );
        return <li key={l.id}>{mine ? <Link to={`/hospital/lab/sample/${l.id}`}>{body}</Link> : body}</li>;
      })}
    </ul>
  );
}

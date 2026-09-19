import { useParams, Link } from "react-router";
import { useState } from "react";
import { resolveApiUrl } from "../../../../api/config";
import { useCase } from "../../../../api/queries";
import type { CaseDetail } from "../../../../api/types";
import { formatDateTime, mapsLink, RISK_LABEL, riskKey, SPECIES_LABEL } from "../../../../lib/format";
import { caseAiSummary } from "../../../../shared/ai/preview";
import {
  AssessmentCard,
  AssignCard,
  LabRequestForm,
  LabRequestList,
  NoteForm,
  ScheduleVisitCard,
  StatusCard,
  TimelineList,
  TreatmentForm,
} from "../../../../shared/cases/CaseActions";
import Modal from "../../../../shared/ui/Modal";
import { QueryState } from "../../../../shared/ui/States";

export default function DoctorCase() {
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
  const [escalating, setEscalating] = useState(false);
  const risk = riskKey(c.riskLevel);
  const ai = caseAiSummary(c.symptoms.map(s => s.code), c.aiAssessments);
  const disease = c.confirmedDisease ?? c.suspectedDisease;
  const farm = mapsLink(c.location.lat ?? c.herd?.lat, c.location.lng ?? c.herd?.lng);
  const place = c.region?.path.slice().reverse().map(p => p.name).slice(0, 2).join(", ");

  return (
    <>
      <div className="flex items-center gap-3 print:hidden">
        <Link to="/hospital/doctor/dashboard" className="text-gray-500 hover:text-gray-700 text-sm">← Dashboard</Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-700 font-medium">{c.caseNumber}</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Case Header */}
          <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-xs font-bold text-[#F4A300] tracking-wide font-display">{c.caseNumber}</span>
                <h1 className="text-2xl font-display font-bold text-gray-900 mt-1">{c.animal?.name ?? c.herd?.name}</h1>
                <p className="text-gray-500">
                  {c.animal ? SPECIES_LABEL[c.animal.species] : `${c.animalsAffected} animals`} · Suspected:{" "}
                  <span className="font-semibold text-[#1B4332]">{disease?.name ?? ai.disease}</span>
                </p>
              </div>
              <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${risk === "high" ? "bg-red-100 text-red-600" : risk === "moderate" ? "bg-amber-100 text-amber-700" : risk === "low" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                {RISK_LABEL[risk].toUpperCase()}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500">Reported At</p>
                <p className="font-semibold text-sm text-gray-900">{formatDateTime(c.reportedAt)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500">Owner / Location</p>
                <p className="font-semibold text-sm text-gray-900">
                  {c.owner?.fullName}
                  {place ? ` · ${place}` : ""}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500">Animals affected / died</p>
                <p className="font-semibold text-sm text-gray-900">{c.animalsAffected} / {c.animalsDead}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500">Referred to</p>
                <p className="font-semibold text-sm text-gray-900">{c.assignedOrganization?.name ?? "—"}</p>
              </div>
            </div>
          </div>

          {/* AI Diagnosis */}
          <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🧠</span>
              <h2 className="font-display font-semibold text-gray-900">AI Preliminary Diagnosis</h2>
              <span className={`ml-auto text-sm font-bold px-3 py-1 rounded-full ${ai.confidence >= 80 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>
                {ai.confidence}% confidence
              </span>
            </div>
            <p className="text-xl font-display font-bold text-[#1B4332] mb-2">{ai.disease}</p>
            <p className="text-gray-600 text-sm mb-4">{ai.note}</p>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="h-2 bg-[#1B4332] rounded-full" style={{ width: `${ai.confidence}%` }}></div>
            </div>
          </div>

          {/* Symptoms */}
          <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6">
            <h2 className="font-display font-semibold text-gray-900 mb-4">Clinical Signs Reported</h2>
            <div className="flex flex-wrap gap-2">
              {c.symptoms.map(s => (
                <span key={s.code} className="bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 text-sm rounded-full font-medium">● {s.name}</span>
              ))}
            </div>
            {c.description && <p className="text-sm text-gray-600 italic mt-3 whitespace-pre-line">"{c.description}"</p>}
            {c.attachments.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-4">
                {c.attachments.map(a =>
                  a.kind === "photo" ? (
                    <a key={a.id} href={resolveApiUrl(a.url)} target="_blank" rel="noopener noreferrer">
                      <img src={resolveApiUrl(a.url)} alt="Case photo" className="w-full aspect-square object-cover rounded-xl border border-gray-100" />
                    </a>
                  ) : a.kind === "voice" ? (
                    <audio key={a.id} controls src={resolveApiUrl(a.url)} className="col-span-4 w-full" />
                  ) : null,
                )}
              </div>
            )}
          </div>

          {/* Treatment Log */}
          <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6">
            <h2 className="font-display font-semibold text-gray-900 mb-4">Treatment Log</h2>
            <div className="mb-6">
              <TimelineList events={c.timeline} />
            </div>
            {c.permissions.addTreatment && c.status !== "resolved" && (
              <div className="mb-6 pt-4 border-t border-gray-100 print:hidden">
                <p className="text-sm font-medium text-gray-700 mb-3">Prescribe Treatment</p>
                <TreatmentForm c={c} />
              </div>
            )}
            {c.permissions.addNote && (
              <div className="pt-4 border-t border-gray-100 print:hidden">
                <p className="text-sm font-medium text-gray-700 mb-2">Add Treatment Note</p>
                <NoteForm c={c} placeholder="Record diagnosis, medication administered, dosage, follow-up instructions..." />
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-4 print:hidden">
          <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5">
            <h3 className="font-display font-semibold text-gray-900 mb-4">Actions</h3>
            <div className="space-y-3">
              {c.permissions.requestLab && c.status !== "resolved" && (
                <button
                  onClick={() => setEscalating(true)}
                  className="w-full bg-orange-50 border-2 border-orange-200 text-orange-700 font-semibold py-3 rounded-xl text-sm hover:bg-orange-100 transition-all"
                >
                  🔬 Escalate to Lab
                </button>
              )}
              {c.assignedOrganization?.phone && (
                <a href={`tel:${c.assignedOrganization.phone}`} className="block text-center w-full bg-blue-50 border-2 border-blue-200 text-blue-700 font-semibold py-3 rounded-xl text-sm hover:bg-blue-100 transition-all">
                  📞 Contact Hospital
                </a>
              )}
              {c.owner?.phone && (
                <a href={`tel:${c.owner.phone}`} className="block text-center w-full bg-green-50 border-2 border-green-200 text-green-700 font-semibold py-3 rounded-xl text-sm hover:bg-green-100 transition-all">
                  📞 Call Owner
                </a>
              )}
              {farm && (
                <a href={farm} target="_blank" rel="noopener noreferrer" className="block text-center w-full border-2 border-[#E8E5DF] text-gray-700 font-semibold py-3 rounded-xl text-sm hover:bg-gray-50 transition-all">
                  📍 Navigate to Farm
                </a>
              )}
              <button onClick={() => window.print()} className="w-full border-2 border-[#E8E5DF] text-gray-700 font-semibold py-3 rounded-xl text-sm hover:bg-gray-50 transition-all">
                📋 Print Case Report
              </button>
            </div>
          </div>

          {c.permissions.changeStatus && <StatusCard c={c} />}
          {c.permissions.updateAssessment && <AssessmentCard c={c} />}
          {c.permissions.assign && <AssignCard c={c} />}
          {c.permissions.changeStatus && c.status !== "resolved" && <ScheduleVisitCard c={c} />}

          <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5">
            <h3 className="font-display font-semibold text-gray-900 mb-3">Lab Tests Ordered</h3>
            <LabRequestList c={c} />
          </div>

          {disease?.notifiable && (
            <div className="bg-[#1B4332]/5 border border-[#1B4332]/20 rounded-2xl p-5">
              <h3 className="font-display font-semibold text-[#1B4332] mb-2 text-sm">⚠️ Biosecurity Note</h3>
              <p className="text-xs text-[#1B4332]/80 leading-relaxed">
                {disease.name ?? "This disease"} is notifiable: report to the state Animal Husbandry Department within 24 hours of
                confirmation. Restrict animal movement around the premises and use PPE when handling.
              </p>
            </div>
          )}
        </div>
      </div>

      <Modal open={escalating} onClose={() => setEscalating(false)} title="Escalate to laboratory">
        <LabRequestForm c={c} onDone={() => setEscalating(false)} />
      </Modal>
    </>
  );
}

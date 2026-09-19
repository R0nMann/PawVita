import { useParams, Link } from "react-router";
import { resolveApiUrl } from "../../../../api/config";
import { useCase } from "../../../../api/queries";
import type { CaseDetail } from "../../../../api/types";
import { formatDateTime, LAB_STATUS_LABEL, RISK_LABEL, riskKey, SPECIES_LABEL, speciesEmoji } from "../../../../lib/format";
import { caseAiSummary } from "../../../../shared/ai/preview";
import { NoteForm, TimelineList } from "../../../../shared/cases/CaseActions";
import { QueryState } from "../../../../shared/ui/States";

const STATUS_STEPS = ["Reported", "AI Triage", "Vet Assigned", "Lab Sample", "Results", "Resolved"];

/** Where the case sits on the ward's six-step tracker. */
function stepFor(c: CaseDetail): number {
  switch (c.status) {
    case "active":
      return c.assignedVet ? 2 : 1;
    case "under_review":
      return c.labRequests.some(l => l.status === "completed") ? 4 : 2;
    case "lab_pending":
      return 3;
    case "treated":
      return 4;
    case "resolved":
      return 5;
  }
}

export default function CaseStatus() {
  const { id } = useParams();
  const caseQ = useCase(id);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <QueryState query={caseQ} loadingLabel="Loading case…">
        {(c) => {
          const stepIndex = stepFor(c);
          const risk = riskKey(c.riskLevel);
          const ai = caseAiSummary(c.symptoms.map(s => s.code), c.aiAssessments);
          return (
            <>
              <div className="flex items-center gap-3">
                <Link to="/hospital/ward/my-animals" className="text-gray-500 hover:text-gray-700 text-sm">← My Animals</Link>
                <span className="text-gray-300">/</span>
                <span className="text-sm text-gray-700 font-medium">Case {c.caseNumber}</span>
              </div>

              <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{speciesEmoji(c.animal?.species)}</span>
                      <h1 className="text-2xl font-display font-bold text-gray-900">{c.animal?.name ?? c.herd?.name}</h1>
                    </div>
                    <p className="text-gray-500 text-sm">
                      {c.animal ? SPECIES_LABEL[c.animal.species] : "Herd"} · Case #{c.caseNumber}
                      {c.owner && ` · Owner: ${c.owner.fullName}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${risk === "high" ? "bg-red-100 text-red-600" : risk === "moderate" ? "bg-amber-100 text-amber-700" : risk === "low" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {risk === "unassessed" ? "AWAITING ASSESSMENT" : `${RISK_LABEL[risk].toUpperCase()} SEVERITY`}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">Reported: {formatDateTime(c.reportedAt)}</p>
                  </div>
                </div>

                {/* Progress Tracker */}
                <div className="mb-8">
                  <h2 className="font-display font-semibold text-gray-800 mb-4 text-sm">Case Progress</h2>
                  <div className="flex items-center">
                    {STATUS_STEPS.map((s, i) => (
                      <div key={s} className="flex items-center flex-1 last:flex-none">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${i <= stepIndex ? "bg-[#1B4332] border-[#1B4332] text-white" : "bg-white border-gray-300 text-gray-400"}`}>
                            {i < stepIndex ? "✓" : i + 1}
                          </div>
                          <span className={`text-xs mt-1 text-center w-16 ${i <= stepIndex ? "text-[#1B4332] font-medium" : "text-gray-400"}`}>{s}</span>
                        </div>
                        {i < STATUS_STEPS.length - 1 && (
                          <div className={`flex-1 h-0.5 mb-4 mx-1 ${i < stepIndex ? "bg-[#1B4332]" : "bg-gray-200"}`}></div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Diagnosis */}
                <div className="bg-gradient-to-r from-[#1B4332]/5 to-[#4A90D9]/5 border border-[#1B4332]/20 rounded-2xl p-5 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">🧠</span>
                    <h3 className="font-display font-semibold text-gray-900">AI Diagnosis</h3>
                    <span className="ml-auto text-sm font-bold text-[#1B4332]">{ai.confidence}% confidence</span>
                  </div>
                  <p className="font-semibold text-[#1B4332] text-lg mb-1">{ai.disease}</p>
                  <p className="text-sm text-gray-600">{ai.note}</p>
                  <div className="mt-3 w-full bg-white rounded-full h-2">
                    <div className="h-2 bg-[#1B4332] rounded-full" style={{ width: `${ai.confidence}%` }}></div>
                  </div>
                  {(c.confirmedDisease ?? c.suspectedDisease) && (
                    <p className="text-xs text-gray-600 mt-3">
                      Vet's {c.confirmedDisease ? "confirmed diagnosis" : "working diagnosis"}:{" "}
                      <span className="font-semibold">{(c.confirmedDisease ?? c.suspectedDisease)!.name}</span>
                    </p>
                  )}
                </div>

                {/* Symptoms */}
                <div className="mb-6">
                  <h3 className="font-display font-semibold text-gray-800 mb-3 text-sm">Reported Symptoms</h3>
                  <div className="flex flex-wrap gap-2">
                    {c.symptoms.map(s => (
                      <span key={s.code} className="bg-red-50 text-red-700 border border-red-200 text-xs px-3 py-1.5 rounded-full font-medium">{s.icon} {s.name}</span>
                    ))}
                  </div>
                  {c.description && <p className="text-sm text-gray-600 italic mt-3 whitespace-pre-line">"{c.description}"</p>}
                  {c.attachments.filter(a => a.kind === "photo").length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      {c.attachments.filter(a => a.kind === "photo").map(a => (
                        <img key={a.id} src={resolveApiUrl(a.url)} alt="Case photo" className="w-full aspect-square object-cover rounded-xl border border-gray-100" />
                      ))}
                    </div>
                  )}
                </div>

                {/* Treatment Timeline */}
                <div>
                  <h3 className="font-display font-semibold text-gray-800 mb-4 text-sm">Treatment Timeline</h3>
                  <TimelineList events={c.timeline} />
                  {c.permissions.addNote && (
                    <div className="mt-5">
                      <NoteForm c={c} placeholder="Ward observations — temperature, feeding, response to treatment…" />
                    </div>
                  )}
                </div>
              </div>

              {/* Lab Tests */}
              <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5">
                <h3 className="font-display font-semibold text-gray-900 mb-3">Laboratory Tests Ordered</h3>
                {c.labRequests.length === 0 ? (
                  <p className="text-sm text-gray-500">No lab tests ordered yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {c.labRequests.flatMap(l =>
                      l.tests.map(t => (
                        <span key={`${l.id}-${t}`} className="bg-orange-50 text-orange-700 border border-orange-200 text-sm px-3 py-1.5 rounded-full">
                          🔬 {t} · {l.result ? l.result : LAB_STATUS_LABEL[l.status]}
                        </span>
                      )),
                    )}
                  </div>
                )}
                {c.labRequests.some(l => l.status !== "completed" && l.status !== "rejected") && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                    <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
                    Lab results pending — typically 24–48 hours
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5 flex items-center gap-4">
                <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center text-lg">👨‍⚕️</div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Assigned Veterinarian</p>
                  <p className="text-[#1B4332] font-display font-bold">{c.assignedVet?.fullName ?? "Not yet assigned"}</p>
                </div>
                {c.assignedVet?.phone && (
                  <a href={`tel:${c.assignedVet.phone}`} className="ml-auto bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors">
                    📞 Call Vet
                  </a>
                )}
              </div>
            </>
          );
        }}
      </QueryState>
    </div>
  );
}

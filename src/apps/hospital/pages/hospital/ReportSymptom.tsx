import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { caseApi } from "../../../../api/endpoints";
import { useAdmissions, useCatalog } from "../../../../api/queries";
import type { AdmissionListItem } from "../../../../api/types";
import { useSession } from "../../../../auth/AuthContext";
import { SPECIES_LABEL, speciesEmoji } from "../../../../lib/format";
import { newId } from "../../../../offline/outbox";
import { previewDiagnosis, VOICE_PREVIEW } from "../../../../shared/ai/preview";
import { FormError, Loading } from "../../../../shared/ui/States";
import { WARD_STATUS, wardStatus } from "./wardStatus";

const PREDICTION_COLORS = ["#E63946", "#F4A300", "#4A90D9"];

export default function ReportSymptom() {
  const [params] = useSearchParams();
  const session = useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const catalog = useCatalog();
  const admissionsQ = useAdmissions({ active: true }, !!session.account.organizationId);

  const [step, setStep] = useState(1);
  const [selectedAnimal, setSelectedAnimal] = useState(params.get("animalId") ?? "");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [recording, setRecording] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  // Show the AI screen for a moment, then open the new case.
  useEffect(() => {
    if (!createdId) return;
    const t = setTimeout(() => navigate(`/hospital/ward/case-status/${createdId}`), 4000);
    return () => clearTimeout(t);
  }, [createdId, navigate]);

  const admitted = admissionsQ.data?.items ?? [];
  const chosen: AdmissionListItem | undefined = admitted.find(a => a.animal.id === selectedAnimal);
  const catalogSymptoms = catalog.data?.symptoms ?? [];

  const toggleSymptom = (code: string) => {
    setSymptoms(prev => prev.includes(code) ? prev.filter(s => s !== code) : [...prev, code]);
  };

  const simulateVoice = () => {
    setRecording(true);
    setTimeout(() => {
      setRecording(false);
      setVoiceText(VOICE_PREVIEW.ward.transcript);
      setSymptoms(VOICE_PREVIEW.ward.symptomCodes);
    }, 2500);
  };

  const handleSubmit = async () => {
    if (!chosen) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await caseApi.create({
        id: newId(),
        herdId: chosen.animal.herdId,
        animalId: chosen.animal.id,
        symptomCodes: symptoms,
        description: [voiceText, notes.trim()].filter(Boolean).join("\n") || undefined,
        reportedAt: new Date().toISOString(),
      });
      void queryClient.invalidateQueries({ queryKey: ["cases"] });
      void queryClient.invalidateQueries({ queryKey: ["admissions"] });
      setCreatedId(created.id);
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (createdId) {
    const predictions = previewDiagnosis(symptoms).slice(0, 3);
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-3xl border border-[#E8E5DF] shadow-xl p-8 text-center">
          <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 animate-pulse">🧠</div>
          <h2 className="font-display font-bold text-xl text-gray-900 mb-2">AI Analyzing Symptoms...</h2>
          <p className="text-gray-500 text-sm mb-8">Cross-referencing against 500+ disease profiles and regional outbreak data</p>
          <div className="space-y-4 text-left">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Preliminary Diagnosis</p>
            {predictions.map((p, i) => (
              <div key={p.disease}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-800">{p.disease}</span>
                  <span className="text-sm font-bold" style={{ color: PREDICTION_COLORS[i] }}>{p.confidence}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full transition-all duration-1000" style={{ width: `${p.confidence}%`, backgroundColor: PREDICTION_COLORS[i] }}></div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-[#1B4332] mt-6 font-medium">Report saved. The veterinary team has been notified. Opening the case…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Report Animal Symptoms</h1>
        <p className="text-gray-500 text-sm mt-0.5">Your report helps protect your ward's animals and the surrounding livestock community</p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= s ? "gradient-primary text-white" : "bg-gray-200 text-gray-500"}`}>{s}</div>
            {s < 3 && <div className={`h-0.5 w-12 transition-all ${step > s ? "bg-[#1B4332]" : "bg-gray-200"}`}></div>}
          </div>
        ))}
        <span className="text-sm text-gray-500 ml-2">{step === 1 ? "Select Animal" : step === 2 ? "Describe Symptoms" : "Confirm & Submit"}</span>
      </div>

      {step === 1 && (
        <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6">
          <h2 className="font-display font-semibold text-gray-900 mb-4">Which animal is affected?</h2>
          {admissionsQ.isPending && <Loading label="Loading ward…" />}
          {admissionsQ.isSuccess && admitted.length === 0 && (
            <p className="text-sm text-gray-500">
              No animals are admitted. <Link to="/hospital/ward/my-animals" className="text-[#4A90D9] underline">Admit one first</Link>.
            </p>
          )}
          <div className="grid gap-3">
            {admitted.map(a => {
              const s = WARD_STATUS[wardStatus(a)];
              return (
                <button
                  key={a.id}
                  onClick={() => setSelectedAnimal(a.animal.id)}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${selectedAnimal === a.animal.id ? "border-[#1B4332] bg-[#1B4332]/5" : "border-gray-200 hover:border-gray-300"}`}
                >
                  <span className="text-2xl">{speciesEmoji(a.animal.species)}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{a.animal.name ?? "Unnamed"} {a.animal.tagNumber && <span className="text-gray-400 text-xs ml-1">#{a.animal.tagNumber}</span>}</p>
                    <p className="text-xs text-gray-500">{[SPECIES_LABEL[a.animal.species], a.animal.breed, a.ward].filter(Boolean).join(" · ")}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${s.bg} ${s.color}`}>{s.label}</span>
                </button>
              );
            })}
          </div>
          <button onClick={() => chosen && setStep(2)} disabled={!chosen} className="w-full gradient-primary text-white font-bold py-3 rounded-xl mt-6 disabled:opacity-40 hover:opacity-90 transition-all">
            Continue →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6">
          <h2 className="font-display font-semibold text-gray-900 mb-2">What symptoms are you observing?</h2>
          <p className="text-gray-500 text-sm mb-6">Select all that apply. The more you share, the more accurate our AI diagnosis.</p>

          {/* Voice Input */}
          <div className="bg-[#FAF9F6] border border-[#E8E5DF] rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={simulateVoice}
                disabled={recording}
                aria-label="Record voice description"
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all ${recording ? "bg-red-500 animate-pulse" : "bg-[#4A90D9] hover:bg-[#3a80c9]"}`}
              >
                🎤
              </button>
              <div>
                <p className="text-sm font-medium text-gray-800">{recording ? "Recording... Speak now" : "Voice Input (Hindi/English)"}</p>
                <p className="text-xs text-gray-500">Tap to describe symptoms verbally</p>
              </div>
            </div>
            {voiceText && <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-gray-200 italic">"{voiceText}"</p>}
          </div>

          {catalog.isPending && <Loading label="Loading symptoms…" />}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
            {catalogSymptoms.map(s => (
              <button
                key={s.code}
                onClick={() => toggleSymptom(s.code)}
                aria-pressed={symptoms.includes(s.code)}
                className={`p-3 rounded-xl border-2 text-center transition-all ${symptoms.includes(s.code) ? "border-[#1B4332] bg-[#1B4332]/10" : "border-gray-200 hover:border-gray-300"}`}
              >
                <span className="text-2xl block mb-1">{s.icon}</span>
                <span className={`text-xs font-medium ${symptoms.includes(s.code) ? "text-[#1B4332]" : "text-gray-600"}`}>{s.name}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 border-2 border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50">Back</button>
            <button onClick={() => symptoms.length > 0 && setStep(3)} disabled={symptoms.length === 0} className="flex-1 gradient-primary text-white font-bold py-3 rounded-xl disabled:opacity-40 hover:opacity-90">
              Continue ({symptoms.length} selected) →
            </button>
          </div>
        </div>
      )}

      {step === 3 && chosen && (
        <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6">
          <h2 className="font-display font-semibold text-gray-900 mb-4">Review & Submit Report</h2>
          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Affected Animal</p>
              <p className="font-semibold text-gray-900">{chosen.animal.name ?? "Unnamed"} — {SPECIES_LABEL[chosen.animal.species]}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-2">Reported Symptoms ({symptoms.length})</p>
              <div className="flex flex-wrap gap-2">
                {symptoms.map(code => {
                  const sym = catalogSymptoms.find(x => x.code === code);
                  return <span key={code} className="text-xs bg-[#1B4332]/10 text-[#1B4332] px-3 py-1 rounded-full font-medium">{sym?.icon} {sym?.name ?? code}</span>;
                })}
              </div>
            </div>
            <div>
              <label htmlFor="ward-notes" className="text-sm font-medium text-gray-700 block mb-1">Additional Notes (Optional)</label>
              <textarea
                id="ward-notes"
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any other observations — duration, severity, affected herd size..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1B4332] resize-none"
              ></textarea>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6">
            <p className="text-xs text-blue-700">📍 {session.account.organization?.name ?? "Hospital"} — {chosen.ward}</p>
          </div>
          <FormError error={error} />
          <div className="flex gap-3 mt-3">
            <button onClick={() => setStep(2)} className="flex-1 border-2 border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50">Back</button>
            <button onClick={() => void handleSubmit()} disabled={submitting} className="flex-1 gradient-primary text-white font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-60">
              {submitting ? "Submitting…" : "Submit Report 🧠"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router";
import { ANIMALS } from "../../data/mockData";

const SYMPTOMS = [
  { id: "fever", label: "Fever", icon: "🌡️" },
  { id: "blisters", label: "Blisters/Sores", icon: "🩹" },
  { id: "lameness", label: "Lameness", icon: "🦵" },
  { id: "nasal", label: "Nasal Discharge", icon: "💧" },
  { id: "diarrhea", label: "Diarrhea", icon: "⚠️" },
  { id: "lethargy", label: "Lethargy", icon: "😴" },
  { id: "loss-appetite", label: "Loss of Appetite", icon: "🚫" },
  { id: "skin-nodules", label: "Skin Nodules", icon: "🔴" },
  { id: "swollen-lymph", label: "Swollen Lymph Nodes", icon: "🔵" },
  { id: "reduced-milk", label: "Reduced Milk", icon: "🥛" },
  { id: "eye-discharge", label: "Eye Discharge", icon: "👁️" },
  { id: "coughing", label: "Coughing", icon: "💨" },
];

const AI_PREDICTIONS = [
  { disease: "Foot & Mouth Disease", confidence: 87, color: "#E63946" },
  { disease: "Lumpy Skin Disease", confidence: 62, color: "#F4A300" },
  { disease: "Hemorrhagic Septicemia", confidence: 34, color: "#4A90D9" },
];

export default function ReportSymptom() {
  const [step, setStep] = useState(1);
  const [selectedAnimal, setSelectedAnimal] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [recording, setRecording] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [showAI, setShowAI] = useState(false);
  const navigate = useNavigate();

  const toggleSymptom = (id: string) => {
    setSymptoms(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const simulateVoice = () => {
    setRecording(true);
    setTimeout(() => {
      setRecording(false);
      setVoiceText("The cow Motilal has been showing high fever since yesterday morning, blisters on the tongue, and is not eating. It's also limping on the right front leg.");
      setSymptoms(["fever", "blisters", "lameness", "loss-appetite"]);
    }, 2500);
  };

  const handleSubmit = () => {
    setShowAI(true);
    setTimeout(() => navigate("/hospital/ward/case-status/AN-002"), 4000);
  };

  if (showAI) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-3xl border border-[#E8E5DF] shadow-xl p-8 text-center">
          <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 animate-pulse">🧠</div>
          <h2 className="font-display font-bold text-xl text-gray-900 mb-2">AI Analyzing Symptoms...</h2>
          <p className="text-gray-500 text-sm mb-8">Cross-referencing against 500+ disease profiles and regional outbreak data</p>
          <div className="space-y-4 text-left">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Preliminary Diagnosis</p>
            {AI_PREDICTIONS.map(p => (
              <div key={p.disease}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-800">{p.disease}</span>
                  <span className="text-sm font-bold" style={{ color: p.color }}>{p.confidence}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full transition-all duration-1000" style={{ width: `${p.confidence}%`, backgroundColor: p.color }}></div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-[#1B4332] mt-6 font-medium">Vet officer is being assigned... Redirecting to case status.</p>
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
          <div className="grid gap-3">
            {ANIMALS.map(a => (
              <button
                key={a.id}
                onClick={() => setSelectedAnimal(a.id)}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${selectedAnimal === a.id ? "border-[#1B4332] bg-[#1B4332]/5" : "border-gray-200 hover:border-gray-300"}`}
              >
                <span className="text-2xl">{a.species === "Cow" || a.species === "Bull" ? "🐄" : a.species === "Buffalo" ? "🐃" : a.species === "Goat" || a.species === "Sheep" ? "🐐" : "🐴"}</span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{a.name} <span className="text-gray-400 text-xs ml-1">#{a.tag}</span></p>
                  <p className="text-xs text-gray-500">{a.species} · {a.breed} · {a.age} · {a.ward}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${a.status === "critical" ? "bg-red-100 text-red-600" : a.status === "healthy" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                  {a.status}
                </span>
              </button>
            ))}
          </div>
          <button onClick={() => selectedAnimal && setStep(2)} disabled={!selectedAnimal} className="w-full gradient-primary text-white font-bold py-3 rounded-xl mt-6 disabled:opacity-40 hover:opacity-90 transition-all">
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

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
            {SYMPTOMS.map(s => (
              <button
                key={s.id}
                onClick={() => toggleSymptom(s.id)}
                className={`p-3 rounded-xl border-2 text-center transition-all ${symptoms.includes(s.id) ? "border-[#1B4332] bg-[#1B4332]/10" : "border-gray-200 hover:border-gray-300"}`}
              >
                <span className="text-2xl block mb-1">{s.icon}</span>
                <span className={`text-xs font-medium ${symptoms.includes(s.id) ? "text-[#1B4332]" : "text-gray-600"}`}>{s.label}</span>
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

      {step === 3 && (
        <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6">
          <h2 className="font-display font-semibold text-gray-900 mb-4">Review & Submit Report</h2>
          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Affected Animal</p>
              <p className="font-semibold text-gray-900">{ANIMALS.find(a => a.id === selectedAnimal)?.name} — {ANIMALS.find(a => a.id === selectedAnimal)?.species}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-2">Reported Symptoms ({symptoms.length})</p>
              <div className="flex flex-wrap gap-2">
                {symptoms.map(s => {
                  const sym = SYMPTOMS.find(x => x.id === s)!;
                  return <span key={s} className="text-xs bg-[#1B4332]/10 text-[#1B4332] px-3 py-1 rounded-full font-medium">{sym.icon} {sym.label}</span>;
                })}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Additional Notes (Optional)</label>
              <textarea rows={3} placeholder="Any other observations — duration, severity, affected herd size..." className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1B4332] resize-none"></textarea>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6">
            <p className="text-xs text-blue-700">📍 Location auto-detected: District Veterinary Hospital, Pune — Ward A</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="flex-1 border-2 border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50">Back</button>
            <button onClick={handleSubmit} className="flex-1 gradient-primary text-white font-bold py-3 rounded-xl hover:opacity-90">
              Submit Report 🧠
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

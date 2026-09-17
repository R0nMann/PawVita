import { useState } from 'react';
import { useNavigate } from 'react-router';
import { animals, symptoms, symptomDiagnosis } from '../../data/mockData';

export default function ReportSymptom() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedAnimal, setSelectedAnimal] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const getDiagnosis = () => {
    const key = selectedSymptoms.sort().join(',');
    return symptomDiagnosis[key] || [
      { disease: 'General Illness / Unknown', confidence: 60, advice: 'A veterinarian will assess the animal and provide a proper diagnosis. Report submitted.' }
    ];
  };

  const handleVoice = () => {
    setVoiceActive(true);
    setTimeout(() => {
      setVoiceActive(false);
      setVoiceText('Animal has blisters on mouth and is limping since yesterday. Saliva dripping. Not eating.');
      setSelectedSymptoms(['S01', 'S02', 'S03', 'S09']);
    }, 3000);
  };

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => navigate('/user/farmer/home'), 3000);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">✅</div>
          <h2 className="text-2xl font-bold font-display text-[#1B4332] mb-2">Report Submitted!</h2>
          <p className="text-gray-500 mb-4">Your report has been received. A veterinarian will be assigned within 2 hours.</p>
          <div className="bg-[#1B4332] text-white rounded-2xl p-4 text-left mb-4">
            <p className="text-white/70 text-sm">Report ID</p>
            <p className="font-bold font-display text-lg">RPT-2025-009</p>
            <p className="text-white/70 text-sm mt-3">Status</p>
            <p className="font-semibold text-amber-400">Vet Being Assigned</p>
          </div>
          <p className="text-gray-400 text-sm">Redirecting to home in 3 seconds...</p>
        </div>
      </div>
    );
  }

  const stepLabels = ['Select Animal', 'Symptoms', 'Diagnosis'];

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-6">
        {stepLabels.map((l, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i + 1 <= step ? 'bg-[#1B4332] text-white' : 'bg-gray-200 text-gray-400'}`}>
              {i + 1 < step ? '✓' : i + 1}
            </div>
            <span className={`text-xs font-medium ${i + 1 <= step ? 'text-[#1B4332]' : 'text-gray-400'}`}>{l}</span>
            {i < 2 && <div className={`flex-1 h-0.5 ${i + 1 < step ? 'bg-[#1B4332]' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div>
          <h2 className="text-xl font-bold font-display text-[#1B4332] mb-2">Which animal is sick?</h2>
          <p className="text-gray-500 text-sm mb-5">Select the affected animal from your herd</p>
          <div className="space-y-3">
            {animals.map(a => (
              <button
                key={a.id}
                onClick={() => setSelectedAnimal(a.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                  selectedAnimal === a.id ? 'border-[#1B4332] bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <span className="text-3xl">{a.species === 'Cattle' || a.species === 'Buffalo' ? '🐄' : a.species === 'Goat' ? '🐐' : '🐑'}</span>
                <div className="text-left">
                  <p className="font-bold font-display text-gray-800">{a.name}</p>
                  <p className="text-gray-500 text-sm">{a.species} • {a.breed} • {a.age} yrs</p>
                </div>
                <div className={`ml-auto w-2.5 h-2.5 rounded-full ${a.health === 'healthy' ? 'bg-green-500' : a.health === 'at-risk' ? 'bg-yellow-500' : 'bg-red-500'}`} />
              </button>
            ))}
          </div>
          <button
            onClick={() => selectedAnimal && setStep(2)}
            disabled={!selectedAnimal}
            className="w-full mt-6 bg-[#1B4332] text-white py-4 rounded-xl font-bold font-display hover:bg-[#2D6A4F] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-lg"
          >
            Continue →
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="text-xl font-bold font-display text-[#1B4332] mb-2">What symptoms do you see?</h2>
          <p className="text-gray-500 text-sm mb-4">Select all that apply — tap the icons</p>

          {/* Voice Input */}
          <div className="bg-[#1B4332] rounded-2xl p-4 mb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold text-sm">🎙️ Describe with voice</p>
                <p className="text-white/60 text-xs">Speak in Hindi, Gujarati, or English</p>
              </div>
              <button
                onClick={handleVoice}
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all ${voiceActive ? 'bg-red-500 animate-pulse' : 'bg-amber-400'}`}
              >
                {voiceActive ? '🔴' : '🎙️'}
              </button>
            </div>
            {voiceActive && <p className="text-white/80 text-xs mt-2 animate-pulse">Listening... speak now</p>}
            {voiceText && !voiceActive && (
              <div className="mt-3 bg-white/10 rounded-xl p-3">
                <p className="text-white/80 text-xs italic">"{voiceText}"</p>
                <p className="text-green-400 text-xs mt-1">✓ Symptoms auto-detected from voice</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            {symptoms.map(s => (
              <button
                key={s.id}
                onClick={() => toggleSymptom(s.id)}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                  selectedSymptoms.includes(s.id)
                    ? 'border-[#1B4332] bg-green-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <span className="text-3xl">{s.icon}</span>
                <span className="text-xs font-medium text-gray-700 text-center leading-tight">{s.label}</span>
                <span className="text-xs text-gray-400 text-center">{s.hindi}</span>
                {selectedSymptoms.includes(s.id) && <span className="text-[#1B4332] text-xs font-bold">✓</span>}
              </button>
            ))}
          </div>

          {selectedSymptoms.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
              <p className="text-sm font-semibold text-[#1B4332]">{selectedSymptoms.length} symptom(s) selected</p>
              <p className="text-xs text-gray-500">Tap Continue to get AI diagnosis</p>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 border border-gray-200 text-gray-600 py-4 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
              ← Back
            </button>
            <button
              onClick={() => selectedSymptoms.length > 0 && setStep(3)}
              disabled={selectedSymptoms.length === 0}
              className="flex-1 bg-[#1B4332] text-white py-4 rounded-xl font-bold font-display hover:bg-[#2D6A4F] disabled:opacity-40 transition-colors"
            >
              Diagnose →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 className="text-xl font-bold font-display text-[#1B4332] mb-2">AI Assessment</h2>
          <p className="text-gray-500 text-sm mb-5">Based on symptoms reported</p>

          <div className="space-y-4 mb-6">
            {getDiagnosis().map((d, i) => (
              <div key={i} className={`rounded-2xl p-5 ${i === 0 ? 'bg-red-50 border-2 border-red-200' : 'bg-white border border-gray-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className={`font-bold font-display ${i === 0 ? 'text-red-700' : 'text-gray-700'}`}>{d.disease}</p>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                    d.confidence >= 85 ? 'bg-red-100 text-red-600' : d.confidence >= 70 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {d.confidence}% match
                  </div>
                </div>
                {i === 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: `${d.confidence}%` }} />
                  </div>
                )}
                <p className="text-sm text-gray-600 leading-relaxed">{d.advice}</p>
              </div>
            ))}
          </div>

          <div className="bg-[#1B4332] rounded-2xl p-5 mb-5 text-white">
            <p className="font-bold font-display mb-2">📝 Confirm your report</p>
            <div className="space-y-2 text-sm text-white/80">
              <div className="flex justify-between">
                <span>Animal:</span>
                <span className="font-semibold">{animals.find(a => a.id === selectedAnimal)?.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Symptoms:</span>
                <span className="font-semibold">{selectedSymptoms.length} selected</span>
              </div>
              <div className="flex justify-between">
                <span>Location:</span>
                <span className="font-semibold">Kheda, Anand</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="flex-1 border border-gray-200 text-gray-600 py-4 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
              ← Revise
            </button>
            <button onClick={handleSubmit} className="flex-1 bg-[#E63946] text-white py-4 rounded-xl font-bold font-display hover:bg-red-600 transition-colors">
              Submit Report 🚨
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-3">Your report helps protect your village's livestock 🌿</p>
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../../../api/client';
import { caseApi, attachmentApi, type NewCase } from '../../../../api/endpoints';
import { useAnimals, useCatalog, useHerds } from '../../../../api/queries';
import type { CaseDetail } from '../../../../api/types';
import { useSession } from '../../../../auth/AuthContext';
import { speciesEmoji, SPECIES_LABEL, ageFrom } from '../../../../lib/format';
import { enqueue, newId } from '../../../../offline/outbox';
import { previewDiagnosis, VOICE_PREVIEW } from '../../../../shared/ai/preview';
import { FormError, Loading } from '../../../../shared/ui/States';

/** What is being reported on: one animal, or a herd as a whole (e.g. a poultry flock). */
type Subject = { herdId: string; animalId?: string; name: string };

/** Ask for the phone's position, but never hold up the report for long. */
function currentPosition(): Promise<NewCase['location']> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(undefined);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracyM: Math.round(p.coords.accuracy) }),
      () => resolve(undefined),
      { timeout: 4000, maximumAge: 5 * 60 * 1000 },
    );
  });
}

export default function ReportSymptom() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useSession();
  const catalog = useCatalog();
  const animalsQ = useAnimals({ status: ['healthy', 'sick', 'under_treatment', 'recovering'] });
  const herdsQ = useHerds();

  const [step, setStep] = useState(1);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [affected, setAffected] = useState(1);
  const [dead, setDead] = useState(0);
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [submitted, setSubmitted] = useState<{ created: CaseDetail | null; id: string } | null>(null);

  const photoPreview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);

  // Leave the success screen for home after a moment, as before.
  useEffect(() => {
    if (!submitted) return;
    const t = setTimeout(() => navigate('/user/farmer/home'), 4000);
    return () => clearTimeout(t);
  }, [submitted, navigate]);

  const toggleSymptom = (code: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(code) ? prev.filter(s => s !== code) : [...prev, code]
    );
  };

  const handleVoice = () => {
    setVoiceActive(true);
    setTimeout(() => {
      setVoiceActive(false);
      setVoiceText(VOICE_PREVIEW.farmer.transcript);
      setSelectedSymptoms(VOICE_PREVIEW.farmer.symptomCodes);
    }, 3000);
  };

  const handleSubmit = async () => {
    if (!subject) return;
    setSubmitting(true);
    setError(null);
    const id = newId();
    const body: NewCase = {
      id,
      herdId: subject.herdId,
      animalId: subject.animalId,
      symptomCodes: selectedSymptoms,
      description: voiceText || undefined,
      animalsAffected: Math.max(affected, 1),
      animalsDead: Math.max(dead, 0),
      reportedAt: new Date().toISOString(),
      location: await currentPosition(),
    };
    const label = `Report for ${subject.name}`;
    try {
      let created: CaseDetail | null = null;
      if (navigator.onLine) {
        try {
          created = await caseApi.create(body);
        } catch (err) {
          if (!(err instanceof ApiError && err.isNetwork)) throw err;
        }
      }
      if (!created) {
        // No signal: keep it on the phone; the outbox sends it when we reconnect.
        await enqueue({ id, kind: 'case', path: '/cases', body: { ...body, capturedOffline: true }, label });
      }
      if (photo) {
        const photoId = newId();
        const file = { blob: photo, name: photo.name || 'photo.jpg', fields: { id: photoId, kind: 'photo', caseId: id } };
        let uploaded = false;
        if (created) {
          try {
            await attachmentApi.upload({ id: photoId, kind: 'photo', caseId: id }, photo, file.name);
            uploaded = true;
          } catch (err) {
            if (!(err instanceof ApiError && err.isNetwork)) throw err;
          }
        }
        if (!uploaded) {
          await enqueue({ id: photoId, kind: 'attachment', path: '/attachments', file, label: `Photo for ${subject.name}`, dependsOn: created ? undefined : id });
        }
      }
      // The animal is now "sick" and the case is open: refresh those screens.
      void queryClient.invalidateQueries({ queryKey: ['cases'] });
      void queryClient.invalidateQueries({ queryKey: ['animals'] });
      setSubmitted({ created, id });
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    const offline = !submitted.created;
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">{offline ? '📦' : '✅'}</div>
          <h2 className="text-2xl font-bold font-display text-[#1B4332] mb-2">{offline ? 'Report Saved!' : 'Report Submitted!'}</h2>
          <p className="text-gray-500 mb-4">
            {offline
              ? 'You are offline. The report is saved on this phone and will be sent automatically when you have signal.'
              : 'Your report has been received. The veterinary team for your area has been notified.'}
          </p>
          <div className="bg-[#1B4332] text-white rounded-2xl p-4 text-left mb-4">
            <p className="text-white/70 text-sm">Report ID</p>
            <p className="font-bold font-display text-lg">{submitted.created?.caseNumber ?? 'Pending — assigned on sync'}</p>
            <p className="text-white/70 text-sm mt-3">Status</p>
            <p className="font-semibold text-amber-400">{offline ? 'Waiting for signal' : 'Vet Being Assigned'}</p>
          </div>
          {submitted.created && (
            <Link to={`/user/farmer/case-status/${submitted.created.id}`} className="text-sm text-[#1B4332] font-semibold underline">
              Track this case
            </Link>
          )}
          <p className="text-gray-400 text-sm mt-3">Redirecting to home in a few seconds...</p>
        </div>
      </div>
    );
  }

  const stepLabels = ['Select Animal', 'Symptoms', 'Diagnosis'];
  const animals = animalsQ.data?.items ?? [];
  const herds = herdsQ.data?.items ?? [];
  const symptoms = catalog.data?.symptoms ?? [];

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
          {animalsQ.isPending && <Loading label="Loading your animals…" />}
          {animalsQ.isSuccess && animals.length === 0 && herds.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
              <p className="text-sm text-gray-600 mb-3">Register your animals first so reports reach the right vet.</p>
              <Link to="/user/farmer/my-animals?add=1" className="inline-block bg-[#1B4332] text-white px-4 py-2 rounded-xl text-sm font-semibold">+ Add Animal</Link>
            </div>
          )}
          <div className="space-y-3">
            {animals.map(a => (
              <button
                key={a.id}
                onClick={() => setSubject({ herdId: a.herdId, animalId: a.id, name: a.name ?? a.tagNumber ?? SPECIES_LABEL[a.species] })}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                  subject?.animalId === a.id ? 'border-[#1B4332] bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <span className="text-3xl">{speciesEmoji(a.species)}</span>
                <div className="text-left">
                  <p className="font-bold font-display text-gray-800">{a.name ?? a.tagNumber ?? 'Unnamed'}</p>
                  <p className="text-gray-500 text-sm">
                    {[SPECIES_LABEL[a.species], a.breed, ageFrom(a.birthDate)].filter(Boolean).join(' • ')}
                    {session.account.role === 'field_worker' && a.herdName ? ` • ${a.herdName}` : ''}
                  </p>
                </div>
                <div className={`ml-auto w-2.5 h-2.5 rounded-full ${a.status === 'healthy' ? 'bg-green-500' : a.status === 'sick' ? 'bg-red-500' : 'bg-yellow-500'}`} />
              </button>
            ))}
            {herds.map(h => (
              <button
                key={h.id}
                onClick={() => setSubject({ herdId: h.id, name: h.name })}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed transition-all ${
                  subject && !subject.animalId && subject.herdId === h.id ? 'border-[#1B4332] bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <span className="text-3xl">🏡</span>
                <div className="text-left">
                  <p className="font-bold font-display text-gray-800">Several animals — {h.name}</p>
                  <p className="text-gray-500 text-sm">For a flock or when many animals are sick</p>
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={() => subject && setStep(2)}
            disabled={!subject}
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

          {catalog.isPending && <Loading label="Loading symptoms…" />}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {symptoms.map(s => (
              <button
                key={s.code}
                onClick={() => toggleSymptom(s.code)}
                aria-pressed={selectedSymptoms.includes(s.code)}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                  selectedSymptoms.includes(s.code)
                    ? 'border-[#1B4332] bg-green-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <span className="text-3xl">{s.icon}</span>
                <span className="text-xs font-medium text-gray-700 text-center leading-tight">{s.name}</span>
                {s.translations.hi && <span className="text-xs text-gray-400 text-center">{s.translations.hi}</span>}
                {selectedSymptoms.includes(s.code) && <span className="text-[#1B4332] text-xs font-bold">✓</span>}
              </button>
            ))}
          </div>

          {/* How many, deaths, photo */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">Animals sick</span>
                <input type="number" min={1} value={affected} onChange={e => setAffected(Number(e.target.value) || 1)} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-base bg-[#FAF9F6]" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">Animals died</span>
                <input type="number" min={0} value={dead} onChange={e => setDead(Math.max(0, Number(e.target.value) || 0))} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-base bg-[#FAF9F6]" />
              </label>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <span className="w-12 h-12 rounded-xl bg-[#FAF9F6] border border-gray-200 grid place-items-center text-2xl overflow-hidden flex-shrink-0">
                {photoPreview ? <img src={photoPreview} alt="" className="w-full h-full object-cover" /> : '📷'}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-gray-800">{photo ? 'Photo added' : 'Add a photo (optional)'}</span>
                <span className="block text-xs text-gray-500">A clear photo of the sores or swelling helps the vet</span>
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={e => setPhoto(e.target.files?.[0] ?? null)}
              />
            </label>
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
            {previewDiagnosis(selectedSymptoms).map((d, i) => (
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
                <span className="font-semibold">{subject?.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Symptoms:</span>
                <span className="font-semibold">{selectedSymptoms.length} selected</span>
              </div>
              <div className="flex justify-between">
                <span>Sick / died:</span>
                <span className="font-semibold">{affected} / {dead}</span>
              </div>
              <div className="flex justify-between">
                <span>Location:</span>
                <span className="font-semibold">{session.district ?? 'Your village'}</span>
              </div>
            </div>
          </div>

          <FormError error={error} />

          <div className="flex gap-3 mt-3">
            <button onClick={() => setStep(2)} className="flex-1 border border-gray-200 text-gray-600 py-4 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
              ← Revise
            </button>
            <button onClick={() => void handleSubmit()} disabled={submitting} className="flex-1 bg-[#E63946] text-white py-4 rounded-xl font-bold font-display hover:bg-red-600 transition-colors disabled:opacity-60">
              {submitting ? 'Sending…' : 'Submit Report 🚨'}
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-3">Your report helps protect your village's livestock 🌿</p>
        </div>
      )}
    </div>
  );
}

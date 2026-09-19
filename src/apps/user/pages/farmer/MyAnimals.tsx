import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { herdApi } from '../../../../api/endpoints';
import { useAnimals, useHerds, useVaccinations } from '../../../../api/queries';
import type { Animal, AnimalSex, Region, Species, Vaccination } from '../../../../api/types';
import { useSession } from '../../../../auth/AuthContext';
import {
  ANIMAL_STATUS_LABEL,
  ANIMAL_STATUS_STYLE,
  ageFrom,
  formatDate,
  isoDay,
  speciesEmoji,
  SPECIES_LABEL,
} from '../../../../lib/format';
import { newId, sendOrQueue } from '../../../../offline/outbox';
import Modal, { Field, inputClass } from '../../../../shared/ui/Modal';
import RegionPicker from '../../../../shared/ui/RegionPicker';
import { EmptyState, FormError, QueryState } from '../../../../shared/ui/States';

const STATUS_ICON: Record<string, string> = {
  healthy: '✅',
  recovering: '🩹',
  under_treatment: '💊',
  sick: '🚨',
  dead: '🕊️',
  sold: '🏷️',
};

/** Last dose and the soonest next dose per animal, from its latest record of each vaccine. */
function vaccinationSummary(records: Vaccination[]) {
  const byAnimal = new Map<string, { last: string | null; next: string | null; overdue: boolean; any: boolean }>();
  const latest = new Map<string, Vaccination>();
  for (const r of records) {
    const key = `${r.animalId}:${r.vaccineCode}`;
    const seen = latest.get(key);
    if (!seen || seen.administeredOn < r.administeredOn) latest.set(key, r);
  }
  const today = isoDay();
  for (const r of latest.values()) {
    const s = byAnimal.get(r.animalId) ?? { last: null, next: null, overdue: false, any: true };
    if (!s.last || s.last < r.administeredOn) s.last = r.administeredOn;
    if (r.nextDueOn && (!s.next || r.nextDueOn < s.next)) s.next = r.nextDueOn;
    if (r.nextDueOn && r.nextDueOn < today) s.overdue = true;
    byAnimal.set(r.animalId, s);
  }
  return byAnimal;
}

export default function MyAnimals() {
  const [params, setParams] = useSearchParams();
  const animalsQ = useAnimals();
  const vaccinationsQ = useVaccinations();
  const [deathFor, setDeathFor] = useState<Animal | null>(null);
  const adding = params.get('add') === '1';

  const summary = useMemo(() => vaccinationSummary(vaccinationsQ.data?.items ?? []), [vaccinationsQ.data]);
  const live = (animalsQ.data?.items ?? []).filter(a => a.status !== 'dead' && a.status !== 'sold');
  const upToDate = live.filter(a => summary.get(a.id)?.any && !summary.get(a.id)?.overdue).length;
  const coverage = live.length ? Math.round((upToDate / live.length) * 100) : 0;
  const badge = coverage >= 80 ? 'Gold' : coverage >= 50 ? 'Silver' : 'Bronze';

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-[#1B4332]">My Animals</h1>
          <p className="text-gray-500 text-sm">{animalsQ.isSuccess ? `${live.length} registered animals` : 'Loading…'}</p>
        </div>
        <button
          onClick={() => setParams({ add: '1' })}
          className="bg-[#1B4332] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2D6A4F] transition-colors"
        >
          + Add Animal
        </button>
      </div>

      {/* Vaccination badge */}
      {live.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
          <span className="text-3xl">🏆</span>
          <div>
            <p className="font-bold font-display text-amber-800">Vaccination Badge: {badge}</p>
            <p className="text-sm text-amber-600">
              {upToDate} of {live.length} animals up to date.{coverage < 100 ? ' Book the rest with your vet.' : ' Keep it up!'}
            </p>
          </div>
          <div className="ml-auto w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center text-white font-bold text-sm">{coverage}%</div>
        </div>
      )}

      <QueryState query={animalsQ} loadingLabel="Loading your animals…">
        {(data) =>
          data.items.length === 0 ? (
            <EmptyState
              icon="🐄"
              title="No animals yet"
              body="Add your cattle, buffalo, goats and other animals to report illness and get vaccination reminders."
              action={
                <button onClick={() => setParams({ add: '1' })} className="bg-[#1B4332] text-white px-4 py-2.5 rounded-xl text-sm font-semibold">
                  + Add Animal
                </button>
              }
            />
          ) : (
            <div className="space-y-3">
              {data.items.map(a => {
                const hs = ANIMAL_STATUS_STYLE[a.status];
                const v = summary.get(a.id);
                const overdue = !!v?.next && v.next < isoDay();
                return (
                  <div key={a.id} className={`bg-white rounded-2xl p-4 shadow-card border ${hs.border} hover:shadow-card-hover transition-all duration-300 ${a.status === 'dead' || a.status === 'sold' ? 'opacity-60' : ''}`}>
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 border border-gray-100">
                        {speciesEmoji(a.species)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-bold font-display text-gray-800 text-lg">{a.name ?? 'Unnamed'}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${hs.badge}`}>
                            {STATUS_ICON[a.status]} {ANIMAL_STATUS_LABEL[a.status]}
                          </span>
                        </div>
                        <p className="text-gray-500 text-sm">
                          {[SPECIES_LABEL[a.species], a.breed, ageFrom(a.birthDate)].filter(Boolean).join(' • ')}
                        </p>
                        <p className="text-gray-400 text-xs mt-0.5">
                          {a.tagNumber ? `Tag: ${a.tagNumber}` : 'No ear tag'}
                          {a.herdName ? ` • ${a.herdName}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#FAF9F6] rounded-xl p-2.5">
                          <p className="text-xs text-gray-400">Last Vaccinated</p>
                          <p className="text-sm font-semibold text-gray-700 font-display">{v?.last ? formatDate(v.last) : 'No record'}</p>
                        </div>
                        <div className={`rounded-xl p-2.5 ${overdue ? 'bg-red-50' : 'bg-green-50'}`}>
                          <p className="text-xs text-gray-400">Next Due</p>
                          <p className={`text-sm font-semibold font-display ${overdue ? 'text-red-600' : 'text-green-700'}`}>
                            {v?.next ? formatDate(v.next) : '—'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {a.status !== 'dead' && a.status !== 'sold' && (
                      <div className="mt-3 flex gap-2">
                        {a.status !== 'healthy' && (
                          <Link
                            to="/user/farmer/report-symptom"
                            className="flex-1 text-center bg-red-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors"
                          >
                            Report Symptoms →
                          </Link>
                        )}
                        <button
                          onClick={() => setDeathFor(a)}
                          className={`${a.status === 'healthy' ? 'flex-1' : ''} px-3 border border-gray-200 text-gray-500 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50`}
                        >
                          Record death
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        }
      </QueryState>

      <AddAnimalModal open={adding} onClose={() => setParams({})} />
      <RecordDeathModal animal={deathFor} onClose={() => setDeathFor(null)} />
    </div>
  );
}

const SPECIES_OPTIONS: Species[] = ['cattle', 'buffalo', 'goat', 'sheep', 'pig', 'poultry', 'horse', 'camel', 'other'];

function AddAnimalModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const session = useSession();
  const queryClient = useQueryClient();
  const herdsQ = useHerds();
  const isFarmer = session.account.role === 'farmer';
  const herds = herdsQ.data?.items ?? [];

  const [herdId, setHerdId] = useState('');
  const [newHerd, setNewHerd] = useState({ ownerName: '', ownerPhone: '', herdName: '' });
  const [region, setRegion] = useState<Region | null>(null);
  const [form, setForm] = useState({ name: '', species: 'cattle' as Species, breed: '', sex: 'female' as AnimalSex, tagNumber: '', birthDate: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [queued, setQueued] = useState(false);

  const chosenHerd = herdId || (isFarmer ? herds[0]?.id ?? '' : '');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let target = chosenHerd;
      if (!target) {
        // First animal: create the herd. Farmers own it; field workers register it for a farmer.
        const herd = await herdApi.create(
          isFarmer
            ? { id: newId(), name: `${session.name}'s herd`, regionId: session.account.regionId ?? undefined }
            : {
                id: newId(),
                name: newHerd.herdName || `${newHerd.ownerName}'s herd`,
                regionId: region?.id,
                owner: { fullName: newHerd.ownerName, phone: newHerd.ownerPhone || undefined },
              },
        );
        target = herd.id;
      }
      const id = newId();
      const result = await sendOrQueue({
        id,
        kind: 'animal',
        path: '/animals',
        label: `New animal: ${form.name || SPECIES_LABEL[form.species]}`,
        body: {
          id,
          herdId: target,
          name: form.name || undefined,
          species: form.species,
          breed: form.breed || undefined,
          sex: form.sex,
          tagNumber: form.tagNumber || undefined,
          birthDate: form.birthDate || undefined,
        },
      });
      void queryClient.invalidateQueries({ queryKey: ['herds'] });
      if (result === null) {
        setQueued(true);
        return;
      }
      setForm({ name: '', species: 'cattle', breed: '', sex: 'female', tagNumber: '', birthDate: '' });
      onClose();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={() => { setQueued(false); onClose(); }} title="Add an animal">
      {queued ? (
        <div className="text-center">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-sm text-gray-600">Saved on this phone. It will be added when you have signal.</p>
          <button onClick={() => { setQueued(false); onClose(); }} className="mt-5 w-full bg-[#1B4332] text-white py-3 rounded-xl font-semibold">Done</button>
        </div>
      ) : (
        <form onSubmit={save} className="space-y-4">
          {herds.length > 0 && (!isFarmer || herds.length > 1) && (
            <Field label="Herd">
              <select value={herdId} onChange={e => setHerdId(e.target.value)} className={inputClass}>
                {isFarmer ? null : <option value="">New herd for a farmer…</option>}
                {herds.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.name}{h.owner && !isFarmer ? ` — ${h.owner.fullName}` : ''}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {!isFarmer && !chosenHerd && (
            <div className="rounded-2xl bg-[#FAF9F6] border border-gray-200 p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700">Farmer who owns the herd</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Farmer name">
                  <input required value={newHerd.ownerName} onChange={e => setNewHerd({ ...newHerd, ownerName: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Mobile (optional)">
                  <input inputMode="numeric" value={newHerd.ownerPhone} onChange={e => setNewHerd({ ...newHerd, ownerPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })} className={inputClass} />
                </Field>
              </div>
              <RegionPicker onChange={setRegion} selectClass={inputClass} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Kali" className={inputClass} />
            </Field>
            <Field label="Species">
              <select value={form.species} onChange={e => setForm({ ...form, species: e.target.value as Species })} className={inputClass}>
                {SPECIES_OPTIONS.map(s => <option key={s} value={s}>{speciesEmoji(s)} {SPECIES_LABEL[s]}</option>)}
              </select>
            </Field>
            <Field label="Breed">
              <input value={form.breed} onChange={e => setForm({ ...form, breed: e.target.value })} placeholder="Gir" className={inputClass} />
            </Field>
            <Field label="Sex">
              <select value={form.sex} onChange={e => setForm({ ...form, sex: e.target.value as AnimalSex })} className={inputClass}>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="unknown">Not sure</option>
              </select>
            </Field>
            <Field label="Ear tag (optional)">
              <input value={form.tagNumber} onChange={e => setForm({ ...form, tagNumber: e.target.value })} placeholder="12-digit Pashu Aadhaar" className={inputClass} />
            </Field>
            <Field label="Birth date (approx.)">
              <input type="date" max={isoDay()} value={form.birthDate} onChange={e => setForm({ ...form, birthDate: e.target.value })} className={inputClass} />
            </Field>
          </div>
          <FormError error={error} />
          <button disabled={saving} className="w-full bg-[#1B4332] text-white py-3 rounded-xl font-bold font-display disabled:opacity-60">
            {saving ? 'Saving…' : 'Add animal'}
          </button>
        </form>
      )}
    </Modal>
  );
}

function RecordDeathModal({ animal, onClose }: { animal: Animal | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [diedOn, setDiedOn] = useState(isoDay());
  const [cause, setCause] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!animal) return;
    setSaving(true);
    setError(null);
    try {
      const id = newId();
      await sendOrQueue({
        id,
        kind: 'mortality',
        path: '/mortality',
        label: `Death of ${animal.name ?? 'an animal'}`,
        body: { id, herdId: animal.herdId, animalId: animal.id, diedOn, suspectedCause: cause || undefined },
      });
      void queryClient.invalidateQueries({ queryKey: ['animals'] });
      setCause('');
      onClose();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={!!animal} onClose={onClose} title={`Record the death of ${animal?.name ?? 'this animal'}`}>
      <form onSubmit={save} className="space-y-4">
        <p className="text-sm text-gray-600">
          Deaths are shared with the vets for your area — several deaths close together can be the first sign of an outbreak.
        </p>
        <Field label="Date of death">
          <input type="date" required max={isoDay()} value={diedOn} onChange={e => setDiedOn(e.target.value)} className={inputClass} />
        </Field>
        <Field label="What do you think caused it? (optional)">
          <input value={cause} onChange={e => setCause(e.target.value)} placeholder="Sudden death, bleeding from nose…" className={inputClass} />
        </Field>
        <FormError error={error} />
        <button disabled={saving} className="w-full bg-gray-800 text-white py-3 rounded-xl font-bold font-display disabled:opacity-60">
          {saving ? 'Saving…' : 'Record death'}
        </button>
      </form>
    </Modal>
  );
}

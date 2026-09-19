import { useAnimals, useDueVaccinations, useVaccinations } from '../../../../api/queries';
import { formatDate, isoDay, SPECIES_LABEL } from '../../../../lib/format';
import { EmptyState, QueryState } from '../../../../shared/ui/States';

const statusStyles: Record<string, { badge: string; row: string }> = {
  overdue: { badge: 'severity-high', row: 'bg-red-50 border-red-200' },
  upcoming: { badge: 'severity-medium', row: 'bg-amber-50 border-amber-200' },
};

export default function VaccinationSchedule() {
  const dueQ = useDueVaccinations({ withinDays: 90 });
  const animalsQ = useAnimals({ status: ['healthy', 'sick', 'under_treatment', 'recovering'] });
  const recordsQ = useVaccinations();

  // Herd compliance: animals with at least one vaccination and none overdue.
  const animals = animalsQ.data?.items ?? [];
  const records = recordsQ.data?.items ?? [];
  const today = isoDay();
  const overdueAnimals = new Set((dueQ.data?.items ?? []).filter(v => v.nextDueOn < today).map(v => v.animalId));
  const vaccinated = new Set(records.map(r => r.animalId));
  const compliant = animals.filter(a => vaccinated.has(a.id) && !overdueAnimals.has(a.id)).length;
  const compliance = animals.length ? Math.round((compliant / animals.length) * 100) : 0;

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold font-display text-[#1B4332] mb-2">Vaccination Schedule</h1>
      <p className="text-gray-500 text-sm mb-5">Upcoming and overdue vaccinations for your herd</p>

      {/* Compliance Card */}
      <div className="gradient-card-green rounded-2xl p-5 text-white mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white/70 text-sm">Herd Compliance Score</p>
            <p className="text-4xl font-bold font-display">{animalsQ.isSuccess ? `${compliance}%` : '…'}</p>
          </div>
          <div className="w-16 h-16 rounded-full border-4 border-amber-400 flex items-center justify-center">
            <span className="text-2xl">🏆</span>
          </div>
        </div>
        <div className="w-full bg-white/20 rounded-full h-3">
          <div className="bg-amber-400 h-3 rounded-full" style={{ width: `${compliance}%` }} />
        </div>
        <p className="text-white/60 text-xs mt-2">{compliant} of {animals.length} animals have up-to-date vaccinations</p>
      </div>

      <QueryState query={dueQ} loadingLabel="Loading schedule…">
        {(data) => (
          <>
            {data.items.some(v => v.status === 'overdue') && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5">
                <p className="font-bold font-display text-red-700">⚠️ Overdue Vaccinations</p>
                <p className="text-sm text-red-600 mt-1">Please contact your vet soon for overdue vaccinations.</p>
              </div>
            )}
            {data.items.length === 0 ? (
              <EmptyState icon="💉" title="Nothing due in the next 3 months" body="When a booster falls due, it will appear here and you will get a reminder." />
            ) : (
              <div className="space-y-3">
                {data.items.map(v => {
                  const ss = statusStyles[v.status]!;
                  return (
                    <div key={`${v.animalId}:${v.vaccineCode}`} className={`rounded-2xl p-4 border ${ss.row}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold font-display text-gray-800">{v.vaccineName}</p>
                          <p className="text-gray-600 text-sm">{v.animalName ?? v.tagNumber ?? 'Animal'} • {SPECIES_LABEL[v.species]}</p>
                          <p className="text-gray-500 text-xs mt-1">Due: <span className="font-semibold">{formatDate(v.nextDueOn)}</span></p>
                          <p className="text-gray-400 text-xs">Last dose {formatDate(v.lastAdministeredOn)}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${ss.badge}`}>
                          {v.status === 'overdue' ? '⚠️ Overdue' : '⏰ Upcoming'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </QueryState>
    </div>
  );
}

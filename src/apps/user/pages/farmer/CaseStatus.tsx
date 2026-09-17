import { useParams } from 'react-router';
import { reports } from '../../data/mockData';

const STATUS_STEPS = [
  { key: 'reported', label: 'Report Submitted', icon: '📋', desc: 'Your report has been received and logged in the system.' },
  { key: 'vet-assigned', label: 'Vet Assigned', icon: '🩺', desc: 'A veterinary officer has been assigned to your case.' },
  { key: 'under-observation', label: 'Under Observation', icon: '👁️', desc: 'Vet is monitoring the animal and gathering more information.' },
  { key: 'lab-escalated', label: 'Lab Escalated', icon: '🧪', desc: 'Samples sent to lab for diagnostic confirmation.' },
  { key: 'resolved', label: 'Resolved', icon: '✅', desc: 'Case has been successfully resolved.' },
];

export default function CaseStatus() {
  const { id } = useParams();
  const report = reports.find(r => r.id === id) || reports[0];
  const currentStep = STATUS_STEPS.findIndex(s => s.key === report.status);

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => window.history.back()} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
          ←
        </button>
        <div>
          <h1 className="text-xl font-bold font-display text-[#1B4332]">Case {report.id}</h1>
          <p className="text-gray-500 text-sm">{report.disease}</p>
        </div>
      </div>

      {/* Status Card */}
      <div className="gradient-card-green rounded-2xl p-5 text-white mb-5">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{STATUS_STEPS[Math.max(0, currentStep)].icon}</span>
          <div>
            <p className="text-white/70 text-sm">Current Status</p>
            <p className="font-bold font-display text-xl">{STATUS_STEPS[Math.max(0, currentStep)].label}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span className="text-amber-400 font-semibold text-sm">{report.vetAssigned}</span>
          <span className="text-white/40">•</span>
          <span className="text-white/70 text-sm">{report.reportedAt}</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl p-5 shadow-card mb-5 border border-gray-100">
        <h2 className="font-bold font-display text-[#1B4332] mb-5">Case Timeline</h2>
        <div className="relative">
          <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-100" />
          <div className="space-y-6">
            {STATUS_STEPS.map((s, i) => {
              const done = i <= currentStep;
              const current = i === currentStep;
              return (
                <div key={i} className="flex gap-4 items-start">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 relative z-10 ${
                    done ? 'bg-[#1B4332]' : 'bg-gray-100'
                  } ${current ? 'ring-4 ring-[#1B4332]/20' : ''}`}>
                    {s.icon}
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold font-display ${done ? 'text-[#1B4332]' : 'text-gray-400'}`}>{s.label}</p>
                    {done && <p className="text-gray-500 text-sm mt-0.5">{s.desc}</p>}
                  </div>
                  {current && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-semibold flex-shrink-0">Current</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Case Details */}
      <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
        <h2 className="font-bold font-display text-[#1B4332] mb-4">Case Details</h2>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Reported Symptoms</span>
            <span className="font-medium text-gray-800 text-right">{report.symptoms.join(', ')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Severity</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              report.severity === 'high' ? 'severity-high' : report.severity === 'medium' ? 'severity-medium' : 'severity-low'
            }`}>{report.severity}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Vet Notes</span>
            <span className="font-medium text-gray-800 text-right max-w-48">{report.notes}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

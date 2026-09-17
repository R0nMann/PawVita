import { useParams, useNavigate } from 'react-router';
import { useState } from 'react';
import { vetCases } from '../../data/mockData';

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const c = vetCases.find(v => v.id === id) || vetCases[0];
  const [notes, setNotes] = useState('');
  const [treatment, setTreatment] = useState('');
  const [escalated, setEscalated] = useState(false);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors text-sm">
          ← Back
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold font-display text-[#1B4332]">Case {c.id}</h2>
          <p className="text-gray-500 text-sm">{c.suspectedDisease}</p>
        </div>
        <span className={`text-sm px-3 py-1.5 rounded-full font-semibold ${
          c.severity === 'high' ? 'severity-high' : c.severity === 'medium' ? 'severity-medium' : 'severity-low'
        }`}>{c.severity} priority</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
          <h3 className="font-bold font-display text-[#1B4332] mb-4">Farmer Details</h3>
          <div className="space-y-3 text-sm">
            {[['Name', c.farmerName], ['Village', c.village], ['District', c.district], ['Species', c.species], ['Animal ID', c.animalId]].map(([l, v]) => (
              <div key={l as string} className="flex justify-between">
                <span className="text-gray-500">{l}</span>
                <span className="font-semibold text-gray-800">{v}</span>
              </div>
            ))}
          </div>
          <a
            href={`https://www.google.com/maps?q=${c.lat},${c.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 w-full block text-center bg-sky-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-sky-600 transition-colors"
          >
            📍 Navigate to Farm
          </a>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
          <h3 className="font-bold font-display text-[#1B4332] mb-4">AI Assessment</h3>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-3">
            <p className="font-bold text-red-700 font-display">{c.suspectedDisease}</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2 mb-1">
              <div className="bg-red-500 h-2 rounded-full" style={{ width: '88%' }} />
            </div>
            <p className="text-xs text-gray-500">88% confidence • Reported {c.reportedAt}</p>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• Isolate animal from herd immediately</p>
            <p>• Check for blisters on hooves and muzzle</p>
            <p>• Take samples if FMD confirmed</p>
          </div>
        </div>
      </div>

      {/* Treatment Log */}
      <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100 mb-5">
        <h3 className="font-bold font-display text-[#1B4332] mb-4">Treatment Log</h3>
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-2">Diagnosis Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g., Animal confirmed with FMD. Blisters observed on mouth and hooves. Isolated from herd."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none h-24 outline-none focus:border-[#1B4332] bg-[#FAF9F6]"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-2">Treatment Prescribed</label>
            <input
              value={treatment}
              onChange={e => setTreatment(e.target.value)}
              placeholder="e.g., Antipyretics, wound dressing, oral antiseptic spray..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1B4332] bg-[#FAF9F6]"
            />
          </div>
        </div>
        <button className="w-full bg-[#1B4332] text-white py-3 rounded-xl font-bold font-display hover:bg-[#2D6A4F] transition-colors">
          Save Treatment Log
        </button>
      </div>

      {/* Escalation */}
      <div className={`rounded-2xl p-5 border ${escalated ? 'bg-purple-50 border-purple-200' : 'bg-white border-gray-100 shadow-card'}`}>
        <h3 className="font-bold font-display text-[#1B4332] mb-2">Lab Escalation</h3>
        <p className="text-sm text-gray-500 mb-4">Send samples to laboratory for confirmatory diagnosis</p>
        {escalated ? (
          <div className="bg-purple-100 rounded-xl p-4 text-purple-700 font-semibold text-sm text-center">
            ✓ Sample request sent to lab. Lab ID: LAB-{c.id.slice(-3)}
          </div>
        ) : (
          <button
            onClick={() => setEscalated(true)}
            className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold font-display hover:bg-purple-700 transition-colors"
          >
            🧪 Escalate to Lab
          </button>
        )}
      </div>
    </div>
  );
}

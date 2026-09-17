import { useParams, useNavigate } from 'react-router';
import { useState } from 'react';
import { labSamples } from '../../data/mockData';

export default function SampleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const sample = labSamples.find(s => s.id === id) || labSamples[0];
  const [result, setResult] = useState(sample.result || '');
  const [saved, setSaved] = useState(false);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors text-sm">← Back</button>
        <div>
          <h2 className="text-xl font-bold font-display text-[#1B4332]">Sample {sample.id}</h2>
          <p className="text-gray-500 text-sm">{sample.suspectedDisease}</p>
        </div>
        <span className={`ml-auto text-xs px-3 py-1.5 rounded-full font-semibold ${
          sample.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
        }`}>{sample.priority} priority</span>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100 mb-5">
        <h3 className="font-bold font-display text-[#1B4332] mb-4">Sample Information</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['Sample ID', sample.id],
            ['Sample Type', sample.sampleType],
            ['Suspected Disease', sample.suspectedDisease],
            ['Species', sample.species],
            ['Animal ID', sample.animalId],
            ['Farmer', sample.farmerName],
            ['District', sample.district],
            ['Referring Vet', sample.vetName],
            ['Received At', sample.receivedAt],
            ['Status', sample.status],
          ].map(([l, v]) => (
            <div key={l as string} className="bg-[#FAF9F6] rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">{l}</p>
              <p className="font-semibold text-gray-800 font-display capitalize">{v}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100 mb-5">
        <h3 className="font-bold font-display text-[#1B4332] mb-4">Diagnostic Result Entry</h3>
        <div className="mb-4">
          <label className="text-sm font-semibold text-gray-600 block mb-2">Result / Findings</label>
          <textarea
            value={result}
            onChange={e => setResult(e.target.value)}
            placeholder="e.g., Positive for FMD Type O. ELISA confirmed. Serotype identified as O/IND/R2/1975 strain..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none h-28 outline-none focus:border-[#1B4332] bg-[#FAF9F6]"
          />
        </div>
        <div className="mb-4">
          <label className="text-sm font-semibold text-gray-600 block mb-2">Attach Diagnostic File</label>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-[#1B4332] transition-colors cursor-pointer">
            <p className="text-gray-400 text-sm">📎 Click to attach lab report PDF</p>
          </div>
        </div>
        <button
          onClick={() => setSaved(true)}
          className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold font-display hover:bg-purple-700 transition-colors"
        >
          {saved ? '✓ Result Saved & Vet Notified' : 'Submit Result'}
        </button>
        {saved && <p className="text-green-600 text-sm mt-2 text-center">Referring vet and district officer have been notified automatically.</p>}
      </div>
    </div>
  );
}

import { useState } from 'react';

const reports = [
  { id: 'RPT-2025-01', title: 'Weekly Disease Surveillance Report', period: 'Jan 1–7, 2025', district: 'Anand', state: 'Gujarat', cases: 47, generated: '2025-01-08', format: 'PDF' },
  { id: 'RPT-2024-52', title: 'Monthly Outbreak Summary', period: 'December 2024', district: 'Anand', state: 'Gujarat', cases: 89, generated: '2025-01-01', format: 'PDF' },
  { id: 'RPT-2024-Q4', title: 'Q4 Vaccination Coverage Report', period: 'Oct–Dec 2024', district: 'Anand', state: 'Gujarat', cases: 0, generated: '2024-12-31', format: 'Excel' },
];

export default function Reports() {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => { setGenerating(false); setGenerated(true); }, 2500);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-display text-[#1B4332]">Reports</h2>
        <p className="text-gray-500">Generate and download official livestock health reports</p>
      </div>

      {/* Generate Report Card */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 mb-6">
        <h3 className="font-bold font-display text-[#1B4332] text-lg mb-5">Generate New Report</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-2">Report Type</label>
            <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1B4332] bg-[#FAF9F6]">
              <option>Weekly Surveillance Report</option>
              <option>Monthly Outbreak Summary</option>
              <option>Vaccination Coverage Report</option>
              <option>District Comparison Report</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-2">Period</label>
            <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1B4332] bg-[#FAF9F6]">
              <option>Jan 8–14, 2025</option>
              <option>Jan 1–7, 2025</option>
              <option>December 2024</option>
              <option>Q4 2024</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-2">Format</label>
            <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1B4332] bg-[#FAF9F6]">
              <option>PDF</option>
              <option>Excel (.xlsx)</option>
              <option>CSV</option>
            </select>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-[#1B4332] text-white px-8 py-3 rounded-xl font-bold font-display hover:bg-[#2D6A4F] transition-colors disabled:opacity-60 flex items-center gap-2"
        >
          {generating ? <><span className="animate-spin">⚙️</span> Generating...</> : generated ? '✓ Report Ready — Download' : '⬇ Generate Report'}
        </button>
        {generated && <p className="text-green-600 text-sm mt-3 font-semibold">✓ Report generated successfully. Click the button above to download.</p>}
      </div>

      {/* Report History */}
      <h3 className="font-bold font-display text-[#1B4332] text-lg mb-4">Recent Reports</h3>
      <div className="space-y-3">
        {reports.map(r => (
          <div key={r.id} className="bg-white rounded-2xl p-5 shadow-card border border-gray-100 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${r.format === 'PDF' ? 'bg-red-50' : 'bg-green-50'}`}>
              {r.format === 'PDF' ? '📄' : '📊'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold font-display text-gray-800">{r.title}</p>
              <p className="text-gray-500 text-sm">{r.period} • {r.district}, {r.state}</p>
              <p className="text-gray-400 text-xs mt-0.5">Generated {r.generated} • {r.format}</p>
            </div>
            <button className="bg-[#1B4332] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#2D6A4F] transition-colors flex-shrink-0">
              ⬇ Download
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

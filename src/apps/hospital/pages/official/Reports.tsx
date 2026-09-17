import { useState } from "react";

const REPORT_TEMPLATES = [
  { id: "monthly", name: "Monthly Disease Summary", desc: "Outbreak statistics, vaccination data, and resolution rates for the selected month", icon: "📊" },
  { id: "outbreak", name: "Outbreak Investigation Report", desc: "Detailed cluster analysis, AI confidence scores, and containment actions taken", icon: "⚠️" },
  { id: "vaccination", name: "Vaccination Coverage Report", desc: "District-wise vaccination coverage, targets, and compliance rates", icon: "💉" },
  { id: "mortality", name: "Mortality & Economic Impact", desc: "Livestock mortality data and estimated economic losses by disease and region", icon: "📉" },
];

export default function OfficialReports() {
  const [selected, setSelected] = useState("");
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  const generate = () => {
    setGenerating(true);
    setTimeout(() => { setGenerating(false); setDone(true); }, 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Report Generation</h1>
        <p className="text-gray-500 text-sm">Generate and export district/block-level reports for policy review and submission</p>
      </div>

      {done && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-4">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-semibold text-green-800">Report Generated Successfully</p>
            <p className="text-sm text-green-700">Your report is ready for download</p>
          </div>
          <button className="ml-auto gradient-primary text-white px-6 py-2 rounded-xl text-sm font-bold">
            ⬇️ Download PDF
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-display font-semibold text-gray-900">Select Report Type</h2>
          {REPORT_TEMPLATES.map(r => (
            <button
              key={r.id}
              onClick={() => setSelected(r.id)}
              className={`w-full flex items-start gap-4 p-5 rounded-2xl border-2 text-left transition-all ${selected === r.id ? "border-[#1B4332] bg-[#1B4332]/5" : "border-[#E8E5DF] bg-white hover:border-[#1B4332]/30"}`}
            >
              <span className="text-3xl">{r.icon}</span>
              <div>
                <p className={`font-display font-semibold ${selected === r.id ? "text-[#1B4332]" : "text-gray-900"}`}>{r.name}</p>
                <p className="text-sm text-gray-500 mt-0.5">{r.desc}</p>
              </div>
              {selected === r.id && <span className="ml-auto text-[#1B4332] text-xl">✓</span>}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5">
            <h2 className="font-display font-semibold text-gray-900 mb-4">Report Parameters</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">State</label>
                <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1B4332]">
                  <option>All India</option>
                  <option>Maharashtra</option>
                  <option>Rajasthan</option>
                  <option>Punjab</option>
                  <option>Uttar Pradesh</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Period</label>
                <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1B4332]">
                  <option>September 2026</option>
                  <option>August 2026</option>
                  <option>Q3 2026 (Jul–Sep)</option>
                  <option>FY 2025–26</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Format</label>
                <div className="flex gap-2">
                  {["PDF", "Excel", "CSV"].map(f => (
                    <button key={f} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm font-medium text-gray-600 hover:border-[#1B4332] hover:text-[#1B4332] transition-all">{f}</button>
                  ))}
                </div>
              </div>
              <button
                onClick={generate}
                disabled={!selected || generating}
                className="w-full gradient-primary text-white font-bold py-3 rounded-xl disabled:opacity-40 hover:opacity-90 transition-all"
              >
                {generating ? "Generating..." : "Generate Report →"}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5">
            <h3 className="font-display font-semibold text-gray-900 mb-3">Recent Reports</h3>
            <div className="space-y-3">
              {[
                { name: "Aug 2026 Monthly Summary", date: "Sep 01", size: "2.4 MB" },
                { name: "FMD Outbreak Report — Pune", date: "Aug 28", size: "1.8 MB" },
                { name: "Vaccination Coverage Q2", date: "Jul 15", size: "3.1 MB" },
              ].map(r => (
                <div key={r.name} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <span className="text-xl">📄</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{r.name}</p>
                    <p className="text-xs text-gray-500">{r.date} · {r.size}</p>
                  </div>
                  <button className="text-xs text-[#4A90D9] font-medium hover:underline">⬇️</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

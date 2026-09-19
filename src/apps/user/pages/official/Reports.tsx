import { useState } from 'react';
import { useSession } from '../../../../auth/AuthContext';
import { formatDate } from '../../../../lib/format';
import {
  generateReport,
  loadReportHistory,
  REPORT_TYPES,
  reportPeriods,
  type ReportFormat,
  type ReportHistoryEntry,
  type ReportType,
} from '../../../../shared/analytics/reports';
import { FormError } from '../../../../shared/ui/States';

export default function Reports() {
  const session = useSession();
  const periods = reportPeriods();
  const [type, setType] = useState<ReportType>('surveillance');
  const [periodId, setPeriodId] = useState(periods[0]!.id);
  const [format, setFormat] = useState<ReportFormat>('pdf');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [history, setHistory] = useState<ReportHistoryEntry[]>(() => loadReportHistory(session.account.id));

  async function run(t: ReportType, pId: string, f: ReportFormat) {
    const period = reportPeriods().find(p => p.id === pId) ?? periods[0]!;
    setGenerating(true);
    setError(null);
    try {
      await generateReport(session.account.id, t, period, f);
      setHistory(loadReportHistory(session.account.id));
    } catch (err) {
      setError(err);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-display text-[#1B4332]">Reports</h2>
        <p className="text-gray-500">Generate and download official livestock health reports for {session.district ?? 'your area'}</p>
      </div>

      {/* Generate Report Card */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 mb-6">
        <h3 className="font-bold font-display text-[#1B4332] text-lg mb-5">Generate New Report</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-2">Report Type</label>
            <select value={type} onChange={e => setType(e.target.value as ReportType)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1B4332] bg-[#FAF9F6]">
              {REPORT_TYPES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-2">Period</label>
            <select value={periodId} onChange={e => setPeriodId(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1B4332] bg-[#FAF9F6]">
              {periods.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-2">Format</label>
            <select value={format} onChange={e => setFormat(e.target.value as ReportFormat)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1B4332] bg-[#FAF9F6]">
              <option value="pdf">PDF (print)</option>
              <option value="csv">CSV (Excel)</option>
            </select>
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-4">{REPORT_TYPES.find(r => r.id === type)?.desc}</p>
        <button
          onClick={() => void run(type, periodId, format)}
          disabled={generating}
          className="bg-[#1B4332] text-white px-8 py-3 rounded-xl font-bold font-display hover:bg-[#2D6A4F] transition-colors disabled:opacity-60 flex items-center gap-2"
        >
          {generating ? <><span className="animate-spin">⚙️</span> Generating...</> : '⬇ Generate Report'}
        </button>
        <div className="mt-3"><FormError error={error} /></div>
      </div>

      {/* Report History */}
      <h3 className="font-bold font-display text-[#1B4332] text-lg mb-4">Recent Reports</h3>
      {history.length === 0 && <p className="text-sm text-gray-500">Reports you generate on this device appear here.</p>}
      <div className="space-y-3">
        {history.map(r => (
          <div key={r.id} className="bg-white rounded-2xl p-5 shadow-card border border-gray-100 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${r.format === 'pdf' ? 'bg-red-50' : 'bg-green-50'}`}>
              {r.format === 'pdf' ? '📄' : '📊'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold font-display text-gray-800">{r.title}</p>
              <p className="text-gray-500 text-sm">{r.periodLabel} • {r.scope}</p>
              <p className="text-gray-400 text-xs mt-0.5">Generated {formatDate(r.generatedAt)} • {r.format.toUpperCase()}</p>
            </div>
            <button
              disabled={generating}
              onClick={() => void run(r.type, r.periodId, r.format)}
              className="bg-[#1B4332] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#2D6A4F] transition-colors flex-shrink-0 disabled:opacity-60"
            >
              ⬇ Download
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

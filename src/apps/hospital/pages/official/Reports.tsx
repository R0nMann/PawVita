import { useState } from "react";
import { useSession } from "../../../../auth/AuthContext";
import { formatDate } from "../../../../lib/format";
import {
  generateReport,
  loadReportHistory,
  REPORT_TYPES,
  reportPeriods,
  type ReportFormat,
  type ReportHistoryEntry,
  type ReportType,
} from "../../../../shared/analytics/reports";
import { FormError } from "../../../../shared/ui/States";

export default function OfficialReports() {
  const session = useSession();
  const periods = reportPeriods();
  const [selected, setSelected] = useState<ReportType | "">("");
  const [periodId, setPeriodId] = useState(periods[1]!.id);
  const [format, setFormat] = useState<ReportFormat>("pdf");
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState<ReportHistoryEntry | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [history, setHistory] = useState(() => loadReportHistory(session.account.id));

  async function run(type: ReportType, pId: string, f: ReportFormat) {
    const period = reportPeriods().find(p => p.id === pId) ?? periods[0]!;
    setGenerating(true);
    setError(null);
    try {
      setDone(await generateReport(session.account.id, type, period, f));
      setHistory(loadReportHistory(session.account.id));
    } catch (err) {
      setError(err);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Report Generation</h1>
        <p className="text-gray-500 text-sm">Generate and export reports for {session.account.region?.name ?? "your area"} for policy review and submission</p>
      </div>

      {done && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-4">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-semibold text-green-800">Report Generated Successfully</p>
            <p className="text-sm text-green-700">
              {done.title} · {done.periodLabel} — {done.format === "pdf" ? "use “Save as PDF” in the print dialog" : "downloaded as CSV"}
            </p>
          </div>
          <button onClick={() => void run(done.type, done.periodId, done.format)} className="ml-auto gradient-primary text-white px-6 py-2 rounded-xl text-sm font-bold">
            ⬇️ Download again
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-display font-semibold text-gray-900">Select Report Type</h2>
          {REPORT_TYPES.map(r => (
            <button
              key={r.id}
              onClick={() => setSelected(r.id)}
              aria-pressed={selected === r.id}
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
                <p className="text-sm font-medium text-gray-700 mb-1">Area</p>
                <p className="text-sm text-gray-900 bg-gray-50 rounded-xl px-3 py-2.5">{session.account.region?.name ?? "All India"}</p>
              </div>
              <div>
                <label htmlFor="report-period" className="text-sm font-medium text-gray-700 block mb-1">Period</label>
                <select id="report-period" value={periodId} onChange={e => setPeriodId(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1B4332]">
                  {periods.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Format</p>
                <div className="flex gap-2">
                  {([["pdf", "PDF"], ["csv", "CSV / Excel"]] as const).map(([f, label]) => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      aria-pressed={format === f}
                      className={`flex-1 border rounded-lg py-2 text-sm font-medium transition-all ${format === f ? "border-[#1B4332] text-[#1B4332] bg-[#1B4332]/5" : "border-gray-200 text-gray-600 hover:border-[#1B4332]"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <FormError error={error} />
              <button
                onClick={() => selected && void run(selected, periodId, format)}
                disabled={!selected || generating}
                className="w-full gradient-primary text-white font-bold py-3 rounded-xl disabled:opacity-40 hover:opacity-90 transition-all"
              >
                {generating ? "Generating..." : "Generate Report →"}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5">
            <h3 className="font-display font-semibold text-gray-900 mb-3">Recent Reports</h3>
            {history.length === 0 && <p className="text-sm text-gray-500">Reports you generate on this device appear here.</p>}
            <div className="space-y-3">
              {history.map(r => (
                <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <span className="text-xl">{r.format === "pdf" ? "📄" : "📊"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{r.title} — {r.periodLabel}</p>
                    <p className="text-xs text-gray-500">{formatDate(r.generatedAt)} · {r.format.toUpperCase()}</p>
                  </div>
                  <button disabled={generating} onClick={() => void run(r.type, r.periodId, r.format)} className="text-xs text-[#4A90D9] font-medium hover:underline" aria-label={`Download ${r.title} again`}>⬇️</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Link } from "react-router";
import { useCatalog, useLabQueue } from "../../../../api/queries";
import { diseaseName, formatDate, LAB_PRIORITY_STYLE, LAB_STATUS_LABEL, LAB_STATUS_STYLE } from "../../../../lib/format";
import { EmptyState, QueryState } from "../../../../shared/ui/States";

export default function LabQueue() {
  const queueQ = useLabQueue();
  const catalog = useCatalog();
  const samples = queueQ.data?.items ?? [];
  const pending = samples.filter(s => ["requested", "collected", "received"].includes(s.status));
  const processing = samples.filter(s => s.status === "processing");
  const completed = samples.filter(s => s.status === "completed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Sample Queue</h1>
        <p className="text-gray-500 text-sm">Incoming diagnostic samples — priority sorted</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
          <p className="text-3xl font-display font-bold text-amber-600">{pending.length}</p>
          <p className="text-sm text-amber-700 mt-1">Pending</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-center">
          <p className="text-3xl font-display font-bold text-blue-600">{processing.length}</p>
          <p className="text-sm text-blue-700 mt-1">Processing</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
          <p className="text-3xl font-display font-bold text-green-600">{completed.length}</p>
          <p className="text-sm text-green-700 mt-1">Completed</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-display font-semibold text-gray-900">All Samples</h2>
        </div>
        <QueryState query={queueQ} loadingLabel="Loading samples…">
          {(data) =>
            data.items.length === 0 ? (
              <EmptyState icon="🧪" title="No samples" body="Samples that vets send to your laboratory appear here." />
            ) : (
              <div className="divide-y divide-gray-50">
                {data.items.map(s => (
                  <Link key={s.id} to={`/hospital/lab/sample/${s.id}`}>
                    <div className="px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-xl">🧪</div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-xs text-gray-400">{s.requestNumber}</span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${LAB_PRIORITY_STYLE[s.priority]}`}>{s.priority}</span>
                            </div>
                            <p className="font-display font-semibold text-gray-900">
                              {s.animal?.name ?? s.animal?.tagNumber ?? "Herd sample"} — {s.suspectedDiseaseCode ? diseaseName(s.suspectedDiseaseCode, catalog.data) : "Undiagnosed"}
                            </p>
                            <p className="text-sm text-gray-500">{s.sampleType} · Requested by {s.requestedBy.fullName} · Case {s.caseNumber}</p>
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {s.tests.map(t => (
                                <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full block mb-1 ${LAB_STATUS_STYLE[s.status]}`}>
                            {LAB_STATUS_LABEL[s.status]}
                          </span>
                          <p className="text-xs text-gray-400">{formatDate(s.collectedAt ?? s.createdAt)}</p>
                          {s.result && <p className="text-xs text-green-700 font-medium mt-1 max-w-[160px] text-right">Result: {s.result}</p>}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )
          }
        </QueryState>
      </div>
    </div>
  );
}

import { useParams, Link } from "react-router";
import { useCatalog, useLabRequest } from "../../../../api/queries";
import { diseaseName, formatDateTime, LAB_PRIORITY_STYLE, LAB_STATUS_LABEL, LAB_STATUS_STYLE } from "../../../../lib/format";
import { LabWorkflow } from "../../../../shared/lab/LabActions";
import { QueryState } from "../../../../shared/ui/States";

const CUSTODY_LABEL: Record<string, string> = {
  requested: "Requested by vet",
  collected: "Sample collected",
  received: "Received at lab",
  processing: "Test processing",
  completed: "Result submitted",
  rejected: "Sample rejected",
};

export default function LabSample() {
  const { id } = useParams();
  const sampleQ = useLabRequest(id);
  const catalog = useCatalog();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <QueryState query={sampleQ} loadingLabel="Loading sample…">
        {(sample) => (
          <>
            <div className="flex items-center gap-3">
              <Link to="/hospital/lab/queue" className="text-gray-500 hover:text-gray-700 text-sm">← Sample Queue</Link>
              <span className="text-gray-300">/</span>
              <span className="text-sm text-gray-700 font-mono">{sample.requestNumber}</span>
            </div>

            <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-display font-bold text-gray-900">{sample.requestNumber}</h1>
                  <p className="text-gray-500 mt-1">
                    {sample.animal?.name ?? sample.animal?.tagNumber ?? "Herd sample"} · {diseaseName(sample.case?.suspectedDiseaseCode, catalog.data)} Investigation
                  </p>
                </div>
                <span className={`text-sm font-bold px-3 py-1.5 rounded-full uppercase ${LAB_PRIORITY_STYLE[sample.priority]}`}>
                  {sample.priority} priority
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Sample Type</p>
                  <p className="font-semibold text-gray-900">🧪 {sample.sampleType}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Animal / Case</p>
                  <p className="font-semibold text-gray-900">
                    {sample.animal ? `${sample.animal.name ?? "Unnamed"} (${sample.animal.tagNumber ?? "no tag"})` : "Herd"}
                    {sample.case && (
                      <>
                        {" · "}
                        <Link to={`/hospital/lab/case/${sample.case.id}`} className="text-[#1B4332] underline hover:no-underline">
                          {sample.case.caseNumber}
                        </Link>
                      </>
                    )}
                  </p>
                  {sample.case && (
                    <Link to={`/hospital/lab/case/${sample.case.id}`} className="text-xs text-gray-500 hover:text-gray-700 mt-1 inline-block">
                      View the full case →
                    </Link>
                  )}
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Collected</p>
                  <p className="font-semibold text-gray-900">{formatDateTime(sample.collectedAt)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Requested By</p>
                  <p className="font-semibold text-gray-900">{sample.requestedBy?.fullName ?? "—"}</p>
                </div>
              </div>

              {/* Tests */}
              <div className="mb-6">
                <h3 className="font-display font-semibold text-gray-900 mb-3">Tests Ordered</h3>
                <div className="space-y-2">
                  {sample.tests.map(t => (
                    <div key={t} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🔬</span>
                        <span className="font-medium text-orange-800 text-sm">{t}</span>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${LAB_STATUS_STYLE[sample.status]}`}>{LAB_STATUS_LABEL[sample.status]}</span>
                    </div>
                  ))}
                </div>
                {sample.notes && <p className="text-sm text-gray-600 mt-3">Vet's note: {sample.notes}</p>}
              </div>

              <LabWorkflow sample={sample} />
            </div>

            {/* Chain of Custody */}
            <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5">
              <h3 className="font-display font-semibold text-gray-900 mb-4">Chain of Custody</h3>
              <div className="space-y-3">
                {sample.custody.map((s, i) => (
                  <div key={s.step} className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${s.at ? "bg-[#1B4332] text-white" : "bg-gray-200 text-gray-500"}`}>
                      {s.at ? "✓" : i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{CUSTODY_LABEL[s.step] ?? s.step}</p>
                      <p className="text-xs text-gray-500">
                        {s.at ? formatDateTime(s.at) : "Pending"}
                        {s.step === "requested" && sample.requestedBy ? ` · ${sample.requestedBy.fullName}` : ""}
                        {(s.step === "completed" || s.step === "rejected") && sample.processedBy ? ` · ${sample.processedBy.fullName}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </QueryState>
    </div>
  );
}

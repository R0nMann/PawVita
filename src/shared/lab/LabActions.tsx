import { useState } from "react";
import { attachmentApi, labApi } from "../../api/endpoints";
import { useApiMutation, useCatalog } from "../../api/queries";
import type { LabRequestDetail, LabResult } from "../../api/types";
import { useSession } from "../../auth/AuthContext";
import { resolveApiUrl } from "../../api/config";
import { formatDateTime } from "../../lib/format";
import { Field, inputClass } from "../ui/Modal";
import { FormError } from "../ui/States";

const INVALIDATE = [["lab"], ["cases"], ["notifications"]];

/**
 * What a lab technician does with a sample: log receipt and processing,
 * reject it, enter the result, attach the report. Shared by both portals'
 * sample screens; the result notifies the vet, the farmer and (for a
 * positive notifiable disease) district officials.
 */
export function LabWorkflow({ sample, accent = "#1B4332" }: { sample: LabRequestDetail; accent?: string }) {
  const session = useSession();
  const catalog = useCatalog();
  const [result, setResult] = useState<LabResult>("positive");
  const [disease, setDisease] = useState(sample.case?.suspectedDiseaseCode ?? "");
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const setStatus = useApiMutation(
    (body: { status: "collected" | "received" | "processing" | "rejected"; rejectionReason?: string }) =>
      labApi.setStatus(sample.id, body),
    INVALIDATE,
  );
  const submit = useApiMutation(
    () =>
      labApi.result(sample.id, {
        result,
        resultDiseaseCode: result === "positive" && disease ? disease : undefined,
        summary: summary.trim(),
        details: details.trim() || undefined,
      }),
    INVALIDATE,
  );
  const attach = useApiMutation(
    (file: File) => attachmentApi.upload({ kind: "lab_report", labRequestId: sample.id }, file, file.name),
    INVALIDATE,
  );

  const isLab = session.account.role === "lab_tech" || session.account.role === "admin";
  const done = sample.status === "completed" || sample.status === "rejected";

  return (
    <div className="space-y-5">
      {/* Progress through the lab */}
      {!done && (
        <div className="flex flex-wrap gap-2">
          {session.account.role === "vet" && sample.status === "requested" && (
            <button
              disabled={setStatus.isPending}
              onClick={() => setStatus.mutate({ status: "collected" })}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50"
            >
              Mark sample collected
            </button>
          )}
          {isLab && ["requested", "collected"].includes(sample.status) && (
            <button
              disabled={setStatus.isPending}
              onClick={() => setStatus.mutate({ status: "received" })}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50"
            >
              📥 Mark received at lab
            </button>
          )}
          {isLab && sample.status !== "processing" && (
            <button
              disabled={setStatus.isPending}
              onClick={() => setStatus.mutate({ status: "processing" })}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50"
            >
              🔬 Start processing
            </button>
          )}
          {isLab && (
            <button
              onClick={() => setRejecting((r) => !r)}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50"
            >
              Reject sample
            </button>
          )}
        </div>
      )}
      {rejecting && !done && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setStatus.mutate({ status: "rejected", rejectionReason: reason.trim() }, { onSuccess: () => setRejecting(false) });
          }}
          className="flex gap-2"
        >
          <input
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why? e.g. haemolysed, leaked in transit"
            className={inputClass}
          />
          <button className="px-4 rounded-xl bg-red-600 text-white text-sm font-semibold">Reject</button>
        </form>
      )}
      <FormError error={setStatus.error} />

      {/* Result */}
      {sample.status === "completed" ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">✅</span>
            <h3 className="font-display font-semibold text-green-800">
              Result: {sample.result?.toUpperCase()}
              {sample.resultDiseaseCode ? ` — ${catalog.data?.diseases.find((d) => d.code === sample.resultDiseaseCode)?.name ?? sample.resultDiseaseCode}` : ""}
            </h3>
          </div>
          <p className="text-sm text-green-700 mb-2">{sample.resultSummary}</p>
          {sample.resultDetails && <p className="text-xs text-green-800/80 whitespace-pre-line mb-2">{sample.resultDetails}</p>}
          <p className="text-xs text-green-600">
            Completed {formatDateTime(sample.completedAt)}
            {sample.processedBy ? ` by ${sample.processedBy.fullName}` : ""}. The vet and farmer were notified automatically.
          </p>
        </div>
      ) : sample.status === "rejected" ? (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-sm text-gray-700">
          Sample rejected: {sample.rejectionReason}
        </div>
      ) : isLab ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate(undefined);
          }}
          className="space-y-3"
        >
          <h3 className="font-display font-semibold text-gray-900">Enter Diagnostic Result</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Result">
              <select value={result} onChange={(e) => setResult(e.target.value as LabResult)} className={inputClass}>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
                <option value="inconclusive">Inconclusive</option>
              </select>
            </Field>
            <Field label="Disease detected">
              <select
                value={disease}
                disabled={result !== "positive"}
                onChange={(e) => setDisease(e.target.value)}
                className={inputClass}
              >
                <option value="">—</option>
                {(catalog.data?.diseases ?? []).map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Summary">
            <input
              required
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="e.g. FMD Type O confirmed by ELISA and VI"
              className={inputClass}
            />
          </Field>
          <Field label="Details (optional)">
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              placeholder="Titres, methods, recommendations…"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1B4332] resize-none bg-[#FAF9F6]"
            />
          </Field>
          <FormError error={submit.error} />
          <button
            disabled={submit.isPending || !summary.trim()}
            className="w-full text-white py-3 rounded-xl font-bold font-display disabled:opacity-50 hover:opacity-90"
            style={{ background: accent }}
          >
            {submit.isPending ? "Submitting…" : "Submit Result & Notify Vet"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-gray-500">Waiting for the laboratory to enter a result.</p>
      )}

      {/* Reports */}
      <div>
        {sample.attachments.map((a) => (
          <a
            key={a.id}
            href={resolveApiUrl(a.url)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-sky-700 underline mb-1"
          >
            📎 {a.originalName ?? "Lab report"} ({Math.round(a.sizeBytes / 1024)} KB)
          </a>
        ))}
        {isLab && (
          <label className="mt-2 block border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-[#1B4332] transition-colors cursor-pointer">
            <span className="text-gray-500 text-sm">
              {attach.isPending ? "Uploading…" : "📎 Attach lab report (PDF or image)"}
            </span>
            <input
              type="file"
              accept="application/pdf,image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) attach.mutate(file);
                e.target.value = "";
              }}
            />
          </label>
        )}
        <FormError error={attach.error} />
      </div>
    </div>
  );
}

import { useParams, Link } from "react-router";
import { useState } from "react";
import { SAMPLES } from "../../data/mockData";

export default function LabSample() {
  const { id } = useParams();
  const sample = SAMPLES.find(s => s.id === id) || SAMPLES[0];
  const [result, setResult] = useState(sample.result || "");
  const [submitted, setSubmitted] = useState(!!sample.result);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/hospital/lab/queue" className="text-gray-500 hover:text-gray-700 text-sm">← Sample Queue</Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-700 font-mono">{sample.id}</span>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900">{sample.id}</h1>
            <p className="text-gray-500 mt-1">{sample.animalName} · {sample.disease} Investigation</p>
          </div>
          <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${sample.priority === "urgent" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-700"}`}>
            {sample.priority.toUpperCase()} PRIORITY
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Sample Type</p>
            <p className="font-semibold text-gray-900">🧪 {sample.type}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Animal / Case</p>
            <p className="font-semibold text-gray-900">{sample.animalName} ({sample.animalId})</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Collected</p>
            <p className="font-semibold text-gray-900">{new Date(sample.collectedAt).toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Requested By</p>
            <p className="font-semibold text-gray-900">{sample.requestedBy}</p>
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
                {submitted ? (
                  <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full">Completed</span>
                ) : (
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                    {sample.status === "processing" ? "Processing" : "Pending"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Result Entry */}
        {!submitted ? (
          <div>
            <h3 className="font-display font-semibold text-gray-900 mb-3">Enter Diagnostic Result</h3>
            <textarea
              value={result}
              onChange={e => setResult(e.target.value)}
              rows={4}
              placeholder="Enter test result — e.g., POSITIVE — FMD Type O confirmed by ELISA and VI. Viral titer: 10^6 TCID50/mL. Recommend immediate isolation and containment."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1B4332] resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setSubmitted(true)}
                disabled={!result.trim()}
                className="gradient-primary text-white font-bold px-8 py-3 rounded-xl disabled:opacity-40 hover:opacity-90 transition-all"
              >
                Submit Result & Notify Vet
              </button>
              <button className="border border-gray-200 text-gray-700 px-5 py-3 rounded-xl hover:bg-gray-50 text-sm font-medium">
                📎 Attach File
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">✅</span>
              <h3 className="font-display font-semibold text-green-800">Result Submitted</h3>
            </div>
            <p className="text-sm text-green-700 mb-3">{result}</p>
            <p className="text-xs text-green-600">Vet officer and district AHD have been automatically notified. Case escalation initiated if critical threshold met.</p>
          </div>
        )}
      </div>

      {/* Chain of Custody */}
      <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5">
        <h3 className="font-display font-semibold text-gray-900 mb-4">Chain of Custody</h3>
        <div className="space-y-3">
          {[
            { step: "Collected", by: sample.requestedBy, time: sample.collectedAt, done: true },
            { step: "Received at Lab", by: "Lab Reception — Mohan Lal", time: sample.collectedAt, done: true },
            { step: "Test Processing", by: "Lab Tech — Mohan Lal", time: "In progress", done: sample.status !== "pending" },
            { step: "Result Submitted", by: "Lab Technician", time: "Pending", done: submitted },
          ].map((s, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${s.done ? "bg-[#1B4332] text-white" : "bg-gray-200 text-gray-500"}`}>
                {s.done ? "✓" : i + 1}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{s.step}</p>
                <p className="text-xs text-gray-500">{s.by} · {new Date(s.time).toString() !== "Invalid Date" ? new Date(s.time).toLocaleString() : s.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

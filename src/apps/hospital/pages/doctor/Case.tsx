import { useParams, Link, useNavigate } from "react-router";
import { useState } from "react";
import { CASES } from "../../data/mockData";

export default function DoctorCase() {
  const { id } = useParams();
  const navigate = useNavigate();
  const caseData = CASES.find(c => c.id === id) || CASES[0];
  const [note, setNote] = useState("");
  const [escalated, setEscalated] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/hospital/doctor/dashboard" className="text-gray-500 hover:text-gray-700 text-sm">← Dashboard</Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-700 font-medium">{caseData.id}</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Case Header */}
          <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-xs font-bold text-[#F4A300] tracking-wide font-display">{caseData.id}</span>
                <h1 className="text-2xl font-display font-bold text-gray-900 mt-1">{caseData.animalName}</h1>
                <p className="text-gray-500">{caseData.species} · Suspected: <span className="font-semibold text-[#1B4332]">{caseData.disease}</span></p>
              </div>
              <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${caseData.severity === "critical" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>
                {caseData.severity.toUpperCase()}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500">Reported At</p>
                <p className="font-semibold text-sm text-gray-900">{new Date(caseData.reportedAt).toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500">Ward / Location</p>
                <p className="font-semibold text-sm text-gray-900">{caseData.ward}</p>
              </div>
            </div>
          </div>

          {/* AI Diagnosis */}
          <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🧠</span>
              <h2 className="font-display font-semibold text-gray-900">AI Preliminary Diagnosis</h2>
              <span className={`ml-auto text-sm font-bold px-3 py-1 rounded-full ${caseData.aiDiagnosis.confidence >= 80 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>
                {caseData.aiDiagnosis.confidence}% confidence
              </span>
            </div>
            <p className="text-xl font-display font-bold text-[#1B4332] mb-2">{caseData.aiDiagnosis.disease}</p>
            <p className="text-gray-600 text-sm mb-4">{caseData.aiDiagnosis.aiNote}</p>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="h-2 bg-[#1B4332] rounded-full" style={{ width: `${caseData.aiDiagnosis.confidence}%` }}></div>
            </div>
          </div>

          {/* Symptoms */}
          <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6">
            <h2 className="font-display font-semibold text-gray-900 mb-4">Clinical Signs Reported</h2>
            <div className="flex flex-wrap gap-2">
              {caseData.symptoms.map(s => (
                <span key={s} className="bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 text-sm rounded-full font-medium">● {s}</span>
              ))}
            </div>
          </div>

          {/* Treatment Log */}
          <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6">
            <h2 className="font-display font-semibold text-gray-900 mb-4">Treatment Log</h2>
            <div className="space-y-4 mb-6">
              {caseData.treatment.map((t, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-[#1B4332] mt-2"></div>
                    {i < caseData.treatment.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 mt-1"></div>}
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-[#1B4332]">{t.date}</span>
                      <span className="text-xs text-gray-400">— {t.doctor}</span>
                    </div>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{t.action}</p>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Add Treatment Note</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
                placeholder="Record diagnosis, medication administered, dosage, follow-up instructions..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1B4332] resize-none"
              />
              <button className="mt-2 gradient-primary text-white text-sm font-semibold px-5 py-2 rounded-xl hover:opacity-90 transition-all">
                + Add Note
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5">
            <h3 className="font-display font-semibold text-gray-900 mb-4">Actions</h3>
            <div className="space-y-3">
              {!escalated ? (
                <button
                  onClick={() => setEscalated(true)}
                  className="w-full bg-orange-50 border-2 border-orange-200 text-orange-700 font-semibold py-3 rounded-xl text-sm hover:bg-orange-100 transition-all"
                >
                  🔬 Escalate to Lab
                </button>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                  <p className="text-green-700 text-sm font-semibold">✅ Escalated to Lab</p>
                  <p className="text-green-600 text-xs mt-1">Sample collection requested</p>
                </div>
              )}
              <button className="w-full bg-blue-50 border-2 border-blue-200 text-blue-700 font-semibold py-3 rounded-xl text-sm hover:bg-blue-100 transition-all">
                📞 Contact Hospital
              </button>
              <button className="w-full border-2 border-[#E8E5DF] text-gray-700 font-semibold py-3 rounded-xl text-sm hover:bg-gray-50 transition-all">
                📋 Print Case Report
              </button>
              <button
                onClick={() => navigate("/hospital/doctor/dashboard")}
                className="w-full bg-green-50 border-2 border-green-200 text-green-700 font-semibold py-3 rounded-xl text-sm hover:bg-green-100 transition-all"
              >
                ✅ Mark Resolved
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5">
            <h3 className="font-display font-semibold text-gray-900 mb-3">Lab Tests Ordered</h3>
            <div className="space-y-2">
              {caseData.labTests.map(t => (
                <div key={t} className="flex items-center gap-2 text-sm">
                  <span className="w-5 h-5 bg-amber-100 rounded flex items-center justify-center text-xs">🔬</span>
                  <span className="text-gray-700">{t}</span>
                  <span className="ml-auto text-xs text-amber-600">Pending</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#1B4332]/5 border border-[#1B4332]/20 rounded-2xl p-5">
            <h3 className="font-display font-semibold text-[#1B4332] mb-2 text-sm">⚠️ Biosecurity Note</h3>
            <p className="text-xs text-[#1B4332]/80 leading-relaxed">
              If FMD is confirmed, mandatory reporting to state AHD within 24 hours. Implement movement restrictions for 3km radius. All personnel to use PPE when handling.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

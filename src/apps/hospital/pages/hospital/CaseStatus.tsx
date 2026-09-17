import { useParams, Link } from "react-router";
import { CASES, ANIMALS } from "../../data/mockData";

const STATUS_STEPS = ["Reported", "AI Triage", "Vet Assigned", "Lab Sample", "Results", "Resolved"];

export default function CaseStatus() {
  const { id } = useParams();
  const animal = ANIMALS.find(a => a.id === id);
  const caseData = CASES.find(c => c.animalId === id) || CASES[0];

  const stepIndex = caseData.status === "reported" ? 1 : caseData.status === "vet-assigned" ? 3 : caseData.status === "resolved" ? 5 : 2;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/hospital/ward/my-animals" className="text-gray-500 hover:text-gray-700 text-sm">← My Animals</Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-700 font-medium">Case {caseData.id}</span>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{caseData.species === "Buffalo" ? "🐃" : "🐄"}</span>
              <h1 className="text-2xl font-display font-bold text-gray-900">{caseData.animalName}</h1>
            </div>
            <p className="text-gray-500 text-sm">{caseData.species} · Case #{caseData.id}</p>
          </div>
          <div className="text-right">
            <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${caseData.severity === "critical" ? "bg-red-100 text-red-600" : caseData.severity === "medium" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
              {caseData.severity.toUpperCase()} SEVERITY
            </span>
            <p className="text-xs text-gray-500 mt-1">Reported: {new Date(caseData.reportedAt).toLocaleString()}</p>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="mb-8">
          <h2 className="font-display font-semibold text-gray-800 mb-4 text-sm">Case Progress</h2>
          <div className="flex items-center">
            {STATUS_STEPS.map((s, i) => (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${i <= stepIndex ? "bg-[#1B4332] border-[#1B4332] text-white" : "bg-white border-gray-300 text-gray-400"}`}>
                    {i < stepIndex ? "✓" : i + 1}
                  </div>
                  <span className={`text-xs mt-1 text-center w-16 ${i <= stepIndex ? "text-[#1B4332] font-medium" : "text-gray-400"}`}>{s}</span>
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mb-4 mx-1 ${i < stepIndex ? "bg-[#1B4332]" : "bg-gray-200"}`}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* AI Diagnosis */}
        <div className="bg-gradient-to-r from-[#1B4332]/5 to-[#4A90D9]/5 border border-[#1B4332]/20 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🧠</span>
            <h3 className="font-display font-semibold text-gray-900">AI Diagnosis</h3>
            <span className="ml-auto text-sm font-bold text-[#1B4332]">{caseData.aiDiagnosis.confidence}% confidence</span>
          </div>
          <p className="font-semibold text-[#1B4332] text-lg mb-1">{caseData.aiDiagnosis.disease}</p>
          <p className="text-sm text-gray-600">{caseData.aiDiagnosis.aiNote}</p>
          <div className="mt-3 w-full bg-white rounded-full h-2">
            <div className="h-2 bg-[#1B4332] rounded-full" style={{ width: `${caseData.aiDiagnosis.confidence}%` }}></div>
          </div>
        </div>

        {/* Symptoms */}
        <div className="mb-6">
          <h3 className="font-display font-semibold text-gray-800 mb-3 text-sm">Reported Symptoms</h3>
          <div className="flex flex-wrap gap-2">
            {caseData.symptoms.map(s => (
              <span key={s} className="bg-red-50 text-red-700 border border-red-200 text-xs px-3 py-1.5 rounded-full font-medium">{s}</span>
            ))}
          </div>
        </div>

        {/* Treatment Timeline */}
        <div>
          <h3 className="font-display font-semibold text-gray-800 mb-4 text-sm">Treatment Timeline</h3>
          <div className="space-y-4">
            {caseData.treatment.map((t, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-[#1B4332] mt-1"></div>
                  {i < caseData.treatment.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 mt-1"></div>}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-[#1B4332]">{t.date}</span>
                    <span className="text-xs text-gray-400">by {t.doctor}</span>
                  </div>
                  <p className="text-sm text-gray-700">{t.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lab Tests */}
      <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5">
        <h3 className="font-display font-semibold text-gray-900 mb-3">Laboratory Tests Ordered</h3>
        <div className="flex flex-wrap gap-2">
          {caseData.labTests.map(t => (
            <span key={t} className="bg-orange-50 text-orange-700 border border-orange-200 text-sm px-3 py-1.5 rounded-full">🔬 {t}</span>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
          <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
          Lab results pending — typically 24–48 hours
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5 flex items-center gap-4">
        <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center text-lg">👨‍⚕️</div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">Assigned Veterinarian</p>
          <p className="text-[#1B4332] font-display font-bold">{caseData.assignedVet}</p>
        </div>
        <a href="tel:+919876543210" className="ml-auto bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors">
          📞 Call Vet
        </a>
      </div>
    </div>
  );
}

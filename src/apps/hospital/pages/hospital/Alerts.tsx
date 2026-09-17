import { useState } from "react";
import { OUTBREAKS } from "../../data/mockData";

const ADVISORIES = [
  {
    id: 1, severity: "critical", disease: "Foot & Mouth Disease", lang: "en",
    en: "⚠️ Critical Alert: FMD outbreak confirmed in Pune district. Immediately isolate any animals showing blisters on mouth or feet. Contact your assigned vet within 2 hours.",
    hi: "⚠️ अति गंभीर: पुणे जिले में खुरपका-मुंहपका रोग (FMD) की पुष्टि हुई है। तुरंत बीमार पशुओं को अलग करें। 2 घंटे के भीतर अपने पशु चिकित्सक से संपर्क करें।",
    mr: "⚠️ अत्यंत गंभीर: पुणे जिल्ह्यात FMD रोगाची पुष्टी झाली आहे. बाधित जनावरांना तात्काळ वेगळे करा आणि पशुवैद्यकाशी संपर्क साधा.",
    date: "2026-09-14",
  },
  {
    id: 2, severity: "warning", disease: "Lumpy Skin Disease", lang: "en",
    en: "🟡 Advisory: Elevated LSD risk in Maharashtra. Watch for skin nodules, fever, and swollen lymph nodes. Do not move animals between farms without prior clearance.",
    hi: "🟡 सलाह: महाराष्ट्र में LSD का खतरा बढ़ा है। त्वचा पर गांठें, बुखार और सूजी हुई ग्रंथियों पर ध्यान दें। बिना अनुमति के जानवरों को न हिलाएं।",
    mr: "🟡 सूचना: महाराष्ट्रात LSD चा धोका वाढला आहे. त्वचेवर गाठी, ताप आणि लिम्फ नोड्स सूज जाणवल्यास ताबडतोब नोंदवा.",
    date: "2026-09-13",
  },
  {
    id: 3, severity: "info", disease: "Vaccination Campaign", lang: "en",
    en: "ℹ️ Notice: Emergency FMD vaccination drive begins September 20. Priority for cattle and buffalo in Pune, Satara, and Kolhapur districts. Register your animals at the nearest VSC.",
    hi: "ℹ️ सूचना: आपातकालीन FMD टीकाकरण अभियान 20 सितंबर से शुरू होगा। पुणे, सातारा और कोल्हापुर जिलों में टीकाकरण की प्राथमिकता रहेगी।",
    mr: "ℹ️ सूचना: आपत्कालीन FMD लसीकरण मोहीम 20 सप्टेंबरपासून सुरू होईल. पुणे, सातारा आणि कोल्हापूर जिल्ह्यांमध्ये प्राधान्य असेल.",
    date: "2026-09-12",
  },
];

export default function Alerts() {
  const [lang, setLang] = useState<"en" | "hi" | "mr">("en");

  const LANG_LABELS = { en: "English", hi: "हिंदी", mr: "मराठी" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Disease Alerts & Advisories</h1>
          <p className="text-gray-500 text-sm">Official advisories from District Animal Husbandry Department</p>
        </div>
        <div className="flex border border-gray-200 rounded-xl overflow-hidden">
          {(["en", "hi", "mr"] as const).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${lang === l ? "bg-[#1B4332] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              {LANG_LABELS[l]}
            </button>
          ))}
        </div>
      </div>

      {/* Advisories */}
      <div className="space-y-4">
        {ADVISORIES.map(a => (
          <div key={a.id} className={`rounded-2xl p-5 border-l-4 ${a.severity === "critical" ? "bg-red-50 border-[#E63946]" : a.severity === "warning" ? "bg-amber-50 border-[#F4A300]" : "bg-blue-50 border-[#4A90D9]"}`}>
            <div className="flex items-start justify-between mb-2">
              <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${a.severity === "critical" ? "bg-red-100 text-red-600" : a.severity === "warning" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                {a.severity}
              </span>
              <span className="text-xs text-gray-500">{a.date}</span>
            </div>
            <h3 className="font-display font-semibold text-gray-900 mb-2">{a.disease}</h3>
            <p className="text-sm text-gray-700 leading-relaxed">{a[lang]}</p>
          </div>
        ))}
      </div>

      {/* Active Outbreaks Table */}
      <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-display font-semibold text-gray-900">Active Outbreaks — National Status</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {["Disease", "Location", "Species", "Cases", "Severity", "Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {OUTBREAKS.map(o => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{o.disease}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{o.district}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{o.species}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{o.cases}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${o.severity === "high" ? "bg-red-100 text-red-600" : o.severity === "medium" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                      {o.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${o.status === "active" ? "bg-red-50 text-red-500" : o.status === "monitoring" ? "bg-blue-50 text-blue-500" : o.status === "contained" ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"}`}>
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

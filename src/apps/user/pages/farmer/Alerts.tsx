import { useState } from 'react';

const alerts = [
  { id: 1, severity: 'high', title: 'FMD Alert — Anand District', titleHi: 'FMD चेतावनी — आणंद जिला', titleGu: 'FMD ચેતવણી — આણંદ જિલ્લો', body: 'Foot-and-Mouth Disease cases detected in Kheda block. Keep animals confined. Avoid sharing water troughs with neighbouring farms.', bodyHi: 'खेड़ा ब्लॉक में FMD के मामले पाए गए हैं। पशुओं को बंद रखें।', bodyGu: 'ખેડા બ્લોકમાં FMD ના કેસ મળ્યા છે. પ્રાણીઓને બંધ રાખો.', date: '2025-01-09', icon: '🦷' },
  { id: 2, severity: 'medium', title: 'LSD Vaccination Drive', titleHi: 'LSD टीकाकरण अभियान', titleGu: 'LSD રસીકરણ અભિયાન', body: 'Free Lumpy Skin Disease vaccination available at Kheda Veterinary Centre on January 12. Bring animal ID card.', bodyHi: 'खेड़ा पशु चिकित्सा केंद्र में 12 जनवरी को LSD टीका मुफ्त मिलेगा।', bodyGu: 'ખેડા પ્રાણી ચિકિત્સા કેન્દ્રમાં 12 જાન્યુઆરીએ LSD રસી ફ્રી.', date: '2025-01-08', icon: '💉' },
  { id: 3, severity: 'low', title: 'Weather Advisory', titleHi: 'मौसम चेतावनी', titleGu: 'હવામાન ચેતવણી', body: 'Cold weather forecast for next 3 days. Ensure animals have adequate shelter and warm bedding. Risk of respiratory infections.', bodyHi: 'अगले 3 दिन ठंड रहेगी। पशुओं को पर्याप्त आश्रय और गर्म बिछावन दें।', bodyGu: 'આગામી 3 દિવસ ઠંડી રહેશે. પ્રાણીઓ માટે ઉષ્ણ આશ્રય.', date: '2025-01-07', icon: '❄️' },
];

const LANGS = ['English', 'हिंदी', 'ગુજરાતી'];

export default function Alerts() {
  const [lang, setLang] = useState(0);

  const getText = (a: typeof alerts[0]) => {
    if (lang === 1) return { title: a.titleHi, body: a.bodyHi };
    if (lang === 2) return { title: a.titleGu, body: a.bodyGu };
    return { title: a.title, body: a.body };
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-display text-[#1B4332]">Advisories</h1>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {LANGS.map((l, i) => (
            <button
              key={i}
              onClick={() => setLang(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${lang === i ? 'bg-[#1B4332] text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {alerts.map(a => {
          const t = getText(a);
          return (
            <div key={a.id} className={`bg-white rounded-2xl p-5 shadow-card border-l-4 ${
              a.severity === 'high' ? 'border-red-500' : a.severity === 'medium' ? 'border-amber-400' : 'border-green-500'
            }`}>
              <div className="flex items-start gap-3">
                <span className="text-3xl">{a.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold font-display text-gray-800">{t.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      a.severity === 'high' ? 'severity-high' : a.severity === 'medium' ? 'severity-medium' : 'severity-low'
                    }`}>
                      {a.severity}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">{t.body}</p>
                  <p className="text-gray-400 text-xs mt-3">{a.date}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

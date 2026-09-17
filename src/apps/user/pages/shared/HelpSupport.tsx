import { useState } from 'react';

const faqs = [
  { q: 'How do I report a sick animal?', a: 'Go to the Farmer Portal and click "Report Symptom". Select your animal, choose symptoms from the illustrated grid, and submit. A vet will be assigned within 2 hours.' },
  { q: 'What is the FMD vaccine and when should I give it?', a: 'Foot-and-Mouth Disease (FMD) vaccine should be given every 6 months to all cattle and buffalo. Contact your local vet or use the app to schedule a visit.' },
  { q: 'Can I use the app without internet?', a: 'Yes! PawVita works offline. Reports are saved locally and automatically synced when you reconnect.' },
  { q: 'How do I update my animal\'s information?', a: 'Go to "My Animals" and tap on the animal card. You can edit all details including breed, weight, and vaccination history.' },
  { q: 'Who can see my reports?', a: 'Your reports are shared with the assigned veterinary officer and district health officials only. Your personal data is protected under the Data Protection Act.' },
];

export default function HelpSupport() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold font-display text-[#1B4332] mb-2">Help & Support</h1>
      <p className="text-gray-500 mb-6">Find answers or connect with our support team</p>

      {/* Helpline */}
      <div className="gradient-card-green rounded-2xl p-5 text-white mb-6">
        <div className="flex items-center gap-4">
          <span className="text-4xl">📞</span>
          <div>
            <p className="text-white/70 text-sm">Vet Helpline (24/7 Toll-free)</p>
            <p className="text-2xl font-bold font-display">1800-XXX-XXXX</p>
            <p className="text-white/60 text-sm mt-0.5">For emergencies, disease outbreaks, or urgent consultations</p>
          </div>
        </div>
      </div>

      {/* Quick help */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { icon: '📹', title: 'Video Tutorials', desc: 'Learn to use the app' },
          { icon: '💬', title: 'WhatsApp Help', desc: '+91 98765 XXXXX' },
          { icon: '📧', title: 'Email Support', desc: 'help@pawvita.gov.in' },
          { icon: '🏢', title: 'Nearest Centre', desc: 'Find veterinary centre' },
        ].map(c => (
          <div key={c.title} className="bg-white rounded-2xl p-4 shadow-card border border-gray-100 text-center hover:shadow-card-hover transition-all cursor-pointer">
            <span className="text-3xl mb-2 block">{c.icon}</span>
            <p className="font-semibold font-display text-gray-800 text-sm">{c.title}</p>
            <p className="text-gray-500 text-xs mt-0.5">{c.desc}</p>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-bold font-display text-[#1B4332] mb-4">Frequently Asked Questions</h2>
      <div className="space-y-2">
        {faqs.map((f, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-[#FAF9F6] transition-colors"
            >
              <span className="font-semibold text-gray-800 font-display text-sm pr-4">{f.q}</span>
              <span className={`text-[#1B4332] font-bold text-lg flex-shrink-0 transition-transform ${open === i ? 'rotate-45' : ''}`}>+</span>
            </button>
            {open === i && (
              <div className="px-4 pb-4">
                <p className="text-gray-600 text-sm leading-relaxed">{f.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

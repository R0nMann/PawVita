import { useState } from "react";

const FAQS = [
  { q: "How do I report an animal disease symptom?", a: "Go to Hospital Portal → Report Symptom. You'll be guided through a 3-step process: select the affected animal, describe symptoms using our icon-based guide, and submit. A vet will be assigned within 4 hours." },
  { q: "What happens after I submit a report?", a: "Our AI engine immediately analyzes the symptoms and assigns a preliminary diagnosis with confidence score. The nearest available vet officer is notified and dispatched if needed. You can track progress at Hospital Portal → Case Status." },
  { q: "How do I check my animals' vaccination status?", a: "Go to Hospital Portal → Vaccination Schedule. You'll see upcoming, due, and overdue vaccinations with reminders, along with each animal's complete vaccination history." },
  { q: "What diseases does PawVita cover?", a: "We cover all major livestock diseases including FMD, Lumpy Skin Disease, PPR, Brucellosis, HS, BQ, Theileriosis, Avian Influenza, Classical Swine Fever, and 20+ more conditions." },
  { q: "Is my data secure?", a: "Yes. All data is encrypted in transit and at rest. PawVita follows the Government of India's Data Security Policy and CERT-In guidelines. Your animal health data is never shared without your consent." },
  { q: "How does AI outbreak prediction work?", a: "Our AI model analyzes symptom reports, weather patterns, animal movement data, and historical outbreak records to calculate a confidence score for emerging clusters. A score above 80% triggers an alert to district officials." },
];

export default function HelpSupport() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">Help & Support</h1>
        <p className="text-gray-500">We're here to help. Your report protects your community's livestock.</p>
      </div>

      {/* Quick Contact */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: "📞", label: "Vet Helpline", value: "1800-180-0044", sub: "Toll free · 24/7", color: "bg-green-50 border-green-200" },
          { icon: "💬", label: "WhatsApp", value: "+91 98765 00001", sub: "Response in 1 hour", color: "bg-blue-50 border-blue-200" },
          { icon: "✉️", label: "Email Support", value: "help@pawvita.in", sub: "Response in 24 hours", color: "bg-amber-50 border-amber-200" },
        ].map(c => (
          <div key={c.label} className={`rounded-2xl border p-5 text-center ${c.color}`}>
            <span className="text-3xl">{c.icon}</span>
            <p className="font-display font-semibold text-gray-900 mt-2 text-sm">{c.label}</p>
            <p className="text-xs font-mono text-gray-700 mt-1">{c.value}</p>
            <p className="text-xs text-gray-500">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* FAQs */}
      <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-display font-semibold text-gray-900">Frequently Asked Questions</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {FAQS.map((faq, i) => (
            <div key={i}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full px-5 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-800 text-sm pr-4">{faq.q}</span>
                <span className={`text-[#1B4332] text-lg transition-transform ${openFaq === i ? "rotate-180" : ""}`}>▾</span>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4">
                  <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact Form */}
      <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6">
        <h2 className="font-display font-semibold text-gray-900 mb-4">Send Us a Message</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Your Name</label>
              <input placeholder="Full name" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1B4332]" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Contact Number</label>
              <input placeholder="+91 XXXXX XXXXX" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1B4332]" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Subject</label>
            <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1B4332]">
              <option>Disease Reporting Help</option>
              <option>Technical Issue</option>
              <option>Vaccination Query</option>
              <option>Account Access</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Message</label>
            <textarea rows={4} placeholder="Describe your issue or question in detail..." className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1B4332] resize-none"></textarea>
          </div>
          <button className="w-full gradient-primary text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all">
            Send Message
          </button>
        </div>
      </div>
    </div>
  );
}

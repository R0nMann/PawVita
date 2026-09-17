import { useState } from 'react';

const MOCK_RESPONSES: Record<string, string> = {
  default: "Namaste! I'm PashuSakhi, your livestock health assistant. I can help you report symptoms, check vaccination schedules, and understand disease alerts. How can I help you today?",
  fmd: "Foot-and-Mouth Disease (FMD) is a highly contagious viral disease. Key signs: blisters in mouth and feet, heavy drooling, lameness. Isolate the animal immediately and call your nearest veterinarian. Do NOT move livestock between farms.",
  vaccination: "For FMD vaccination, cattle and buffalo should be vaccinated every 6 months. Contact your local veterinary center or use the app to schedule a visit. Keep vaccination records updated in PashuRakshak.",
  report: "To report a sick animal: Go to 'Report Symptom' and select your animal. Choose the symptoms you see from the picture guide. Add a photo if possible. Your report will reach a vet within 2 hours.",
  help: "I can help with: 1) Reporting sick animals 2) Vaccination reminders 3) Understanding disease alerts 4) Finding your nearest vet. Type your question or tap one of the quick options below.",
};

const QUICK_REPLIES = ['FMD symptoms?', 'How to vaccinate?', 'Report sick animal', 'Find nearest vet'];

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'bot', text: MOCK_RESPONSES.default }
  ]);
  const [input, setInput] = useState('');

  const send = (text: string) => {
    if (!text.trim()) return;
    const newMessages = [...messages, { from: 'user', text }];

    let response = MOCK_RESPONSES.default;
    const lower = text.toLowerCase();
    if (lower.includes('fmd') || lower.includes('foot')) response = MOCK_RESPONSES.fmd;
    else if (lower.includes('vaccin')) response = MOCK_RESPONSES.vaccination;
    else if (lower.includes('report') || lower.includes('sick')) response = MOCK_RESPONSES.report;
    else if (lower.includes('help')) response = MOCK_RESPONSES.help;
    else response = "Thank you for your question. Our veterinary team will respond shortly. For emergencies, call the helpline: 1800-XXX-XXXX (toll-free).";

    setMessages([...newMessages, { from: 'bot', text: response }]);
    setInput('');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-fade-in-up">
          <div className="gradient-card-green px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-[#1B4332] font-bold text-sm">🐄</div>
              <div>
                <p className="text-white font-semibold text-sm font-display">PashuSakhi</p>
                <p className="text-green-200 text-xs">Always here to help</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white text-lg">✕</button>
          </div>
          <div className="flex-1 p-4 space-y-3 max-h-72 overflow-y-auto bg-[#FAF9F6]">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.from === 'user'
                    ? 'bg-[#1B4332] text-white rounded-br-none'
                    : 'bg-white text-gray-800 shadow-sm rounded-bl-none border border-gray-100'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div className="px-3 py-2 border-t border-gray-100 flex flex-wrap gap-1.5 bg-white">
            {QUICK_REPLIES.map(q => (
              <button key={q} onClick={() => send(q)} className="text-xs bg-green-50 text-[#1B4332] px-2 py-1 rounded-lg border border-green-200 hover:bg-green-100 transition-colors font-medium">
                {q}
              </button>
            ))}
          </div>
          <div className="p-3 bg-white border-t border-gray-100 flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send(input)}
              placeholder="Type your question..."
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#1B4332] bg-[#FAF9F6]"
            />
            <button onClick={() => send(input)} className="bg-[#1B4332] text-white rounded-xl px-3 py-2 text-sm hover:bg-[#2D6A4F] transition-colors">
              →
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 gradient-card-green rounded-full shadow-lg flex items-center justify-center text-2xl hover:scale-105 transition-transform relative"
        aria-label="Open chat assistant"
      >
        {open ? '✕' : '💬'}
        {!open && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">1</span>}
      </button>
    </div>
  );
}

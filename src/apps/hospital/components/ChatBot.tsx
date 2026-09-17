import { useState } from "react";
import { CHATBOT_RESPONSES } from "../data/mockData";

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hello! I'm PashuRakshak AI Assistant. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");

  const send = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages(m => [...m, { from: "user", text: userMsg }]);
    setInput("");
    setTimeout(() => {
      const key = Object.keys(CHATBOT_RESPONSES).find(k => userMsg.toLowerCase().includes(k));
      const reply = key ? CHATBOT_RESPONSES[key] : CHATBOT_RESPONSES.default;
      setMessages(m => [...m, { from: "bot", text: reply }]);
    }, 700);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden fade-up">
          <div className="gradient-primary px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-base">🐄</div>
              <div>
                <p className="text-white font-semibold font-display text-sm">PashuRakshak AI</p>
                <p className="text-green-200 text-xs">Always here to help</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white text-lg">✕</button>
          </div>
          <div className="h-60 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm font-body ${m.from === "user" ? "bg-[#1B4332] text-white rounded-br-sm" : "bg-white border border-gray-200 text-gray-700 rounded-bl-sm shadow-sm"}`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 p-3 flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Ask about symptoms, vaccines..."
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#1B4332] font-body"
            />
            <button onClick={send} className="bg-[#1B4332] text-white px-3 py-2 rounded-lg text-sm hover:bg-[#2D6A4F] transition-colors">
              →
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 gradient-primary rounded-full shadow-xl flex items-center justify-center text-2xl hover:scale-110 transition-transform duration-200 relative"
        aria-label="Open AI assistant"
      >
        {open ? "✕" : "🤖"}
        <span className="absolute top-0 right-0 w-3 h-3 bg-[#F4A300] rounded-full border-2 border-white"></span>
      </button>
    </div>
  );
}

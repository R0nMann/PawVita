import { notifications } from '../../data/mockData';
import { useState } from 'react';

const typeIcons: Record<string, string> = {
  alert: '⚠️', case: '📋', vaccination: '💉', lab: '🧪', system: '🖥️',
};

export default function Notifications() {
  const [items, setItems] = useState(notifications);

  const markAllRead = () => setItems(items.map(n => ({ ...n, read: true })));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-[#1B4332]">Notifications</h1>
          <p className="text-gray-500 text-sm">{items.filter(n => !n.read).length} unread</p>
        </div>
        <button onClick={markAllRead} className="text-sm text-[#1B4332] font-semibold hover:underline">Mark all read</button>
      </div>
      <div className="space-y-3">
        {items.map(n => (
          <div
            key={n.id}
            className={`bg-white rounded-2xl p-4 shadow-card border transition-all ${n.read ? 'border-gray-100 opacity-70' : 'border-[#1B4332]/20'}`}
            onClick={() => setItems(items.map(x => x.id === n.id ? { ...x, read: true } : x))}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                n.severity === 'high' ? 'bg-red-50' : n.severity === 'medium' ? 'bg-amber-50' : 'bg-green-50'
              }`}>
                {typeIcons[n.type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-gray-800 font-display text-sm">{n.title}</p>
                  {!n.read && <span className="w-2 h-2 bg-[#1B4332] rounded-full flex-shrink-0"></span>}
                </div>
                <p className="text-gray-500 text-sm leading-relaxed">{n.message}</p>
                <p className="text-gray-400 text-xs mt-2">{n.time}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

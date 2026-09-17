import { useState } from "react";
import { NOTIFICATIONS } from "../../data/mockData";

export default function Notifications() {
  const [items, setItems] = useState(NOTIFICATIONS);

  const markAllRead = () => setItems(prev => prev.map(n => ({ ...n, read: true })));
  const unread = items.filter(n => !n.read).length;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 text-sm">{unread} unread alerts & updates</p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-sm text-[#4A90D9] font-medium hover:underline">Mark all read</button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
        <div className="divide-y divide-gray-50">
          {items.map(n => (
            <div
              key={n.id}
              className={`px-5 py-4 flex items-start gap-4 cursor-pointer hover:bg-gray-50 transition-colors ${!n.read ? "bg-blue-50/20" : ""}`}
              onClick={() => setItems(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${n.type === "alert" ? "bg-red-100" : n.type === "warning" ? "bg-amber-100" : n.type === "success" ? "bg-green-100" : "bg-blue-100"}`}>
                {n.type === "alert" ? "🔴" : n.type === "warning" ? "🟡" : n.type === "success" ? "✅" : "ℹ️"}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <p className="font-display font-semibold text-gray-900 text-sm">{n.title}</p>
                  {!n.read && <div className="w-2 h-2 bg-[#4A90D9] rounded-full mt-1 shrink-0 ml-2"></div>}
                </div>
                <p className="text-sm text-gray-600 mt-0.5">{n.body}</p>
                <p className="text-xs text-gray-400 mt-1">{n.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

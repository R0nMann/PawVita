import { Link, useNavigate } from "react-router";
import { NOTIFICATIONS } from "../data/mockData";
import { useState } from "react";

interface HeaderProps {
  role?: string;
  user?: string;
}

export default function Header({ role = "Hospital", user = "Ward Manager" }: HeaderProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();
  const unread = NOTIFICATIONS.filter(n => !n.read).length;

  const ROLE_COLORS: Record<string, string> = {
    Hospital: "bg-[#4A90D9]",
    Doctor: "bg-[#1B4332]",
    Official: "bg-purple-600",
    Lab: "bg-orange-500",
    Admin: "bg-gray-800",
  };

  return (
    <header className="bg-white border-b border-[#E8E5DF] px-6 py-3 flex items-center justify-between z-30 sticky top-0 shadow-sm">
      <Link to="/" className="flex items-center gap-2 font-display font-bold text-[#1B4332] text-lg">
        <span className="text-2xl">🐄</span>
        <span>PashuRakshak</span>
      </Link>
      <div className="flex items-center gap-4">
        <span className={`text-xs font-semibold px-3 py-1 rounded-full text-white ${ROLE_COLORS[role] ?? "bg-gray-500"}`}>
          {role}
        </span>
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            aria-label="Notifications"
          >
            🔔
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#E63946] text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unread}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="font-semibold font-display text-sm">Notifications</span>
                <Link to="/hospital/notifications" className="text-xs text-[#4A90D9] hover:underline" onClick={() => setNotifOpen(false)}>View all</Link>
              </div>
              {NOTIFICATIONS.slice(0, 4).map(n => (
                <div key={n.id} className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${!n.read ? "bg-blue-50/30" : ""}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">{n.type === "alert" ? "🔴" : n.type === "warning" ? "🟡" : n.type === "success" ? "✅" : "ℹ️"}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800 font-display">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                      <p className="text-xs text-gray-400 mt-1">{n.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <Link to="/hospital/settings" className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors" aria-label="Settings">
          ⚙️
        </Link>
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/logout")}>
          <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center text-white text-sm font-bold font-display">
            {user.charAt(0)}
          </div>
          <span className="text-sm text-gray-700 font-medium font-body hidden sm:block">{user}</span>
        </div>
      </div>
    </header>
  );
}

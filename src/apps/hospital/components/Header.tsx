import { Link, useNavigate } from "react-router";
import { useState } from "react";
import AccountMenu from "../../../shared/components/AccountMenu";
import { notificationApi } from "../../../api/endpoints";
import { useApiMutation, useNotifications } from "../../../api/queries";
import { useSession } from "../../../auth/AuthContext";
import { notificationLink, NOTIFICATION_ICON } from "../../../lib/links";
import { timeAgo } from "../../../lib/format";

interface HeaderProps {
  /** Badge text: Hospital, Doctor, Official, Lab or Admin. */
  role?: string;
}

export default function Header({ role = "Hospital" }: HeaderProps) {
  const session = useSession();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const latest = useNotifications({ limit: 4 });
  const read = useApiMutation((id: string) => notificationApi.read(id), [["notifications"]]);
  const unread = latest.data?.unreadCount ?? 0;

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
        <span>PawVita</span>
      </Link>
      <div className="flex items-center gap-4">
        <span className={`text-xs font-semibold px-3 py-1 rounded-full text-white ${ROLE_COLORS[role] ?? "bg-gray-500"}`}>
          {role}
        </span>
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
            aria-expanded={notifOpen}
          >
            🔔
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#E63946] text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="font-semibold font-display text-sm">Notifications</span>
                <Link to="/hospital/notifications" className="text-xs text-[#4A90D9] hover:underline" onClick={() => setNotifOpen(false)}>View all</Link>
              </div>
              {latest.data?.items.length === 0 && <p className="px-4 py-6 text-sm text-gray-500 text-center">You're all caught up.</p>}
              {(latest.data?.items ?? []).map(n => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    if (!n.readAt) read.mutate(n.id);
                    setNotifOpen(false);
                    const link = notificationLink(session, n);
                    if (link) navigate(link);
                  }}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 ${!n.readAt ? "bg-blue-50/30" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">{NOTIFICATION_ICON[n.type] ?? "ℹ️"}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800 font-display">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <Link to="/hospital/settings" className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors" aria-label="Settings">
          ⚙️
        </Link>
        <AccountMenu name={session.name} subtitle={[role, session.account.organization?.name].filter(Boolean).join(" · ")} portal="hospital" variant="light" />
      </div>
    </header>
  );
}

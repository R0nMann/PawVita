import { Link, useNavigate } from "react-router";
import { useState } from "react";
import AccountMenu from "./AccountMenu";
import { notificationApi } from "../../api/endpoints";
import { useApiMutation, useNotifications } from "../../api/queries";
import { useSession } from "../../auth/AuthContext";
import { PORTALS, type PortalId } from "../../auth/portals";
import { notificationLink, NOTIFICATION_ICON } from "../../lib/links";
import { timeAgo } from "../../lib/format";
import LogoMark from "./LogoMark";

export interface ConsoleNavItem {
  label: string;
  href: string;
  icon: string;
}

interface ConsoleHeaderProps {
  /** Badge text: Hospital, Doctor, Official, Lab or Admin. */
  role?: string;
  /** Which portal the notification, settings and account links point into. */
  portal?: PortalId;
  /**
   * The layout’s sidebar items. Console sidebars are `hidden md:flex`, so
   * without these the whole role is unnavigable on a phone.
   */
  nav?: ConsoleNavItem[];
}

/**
 * The light top bar shared by the veterinary hospital portal and the
 * administration console. Every link is resolved from the portal’s base path,
 * so the same header serves both without either hard-coding the other’s URLs.
 */
export default function ConsoleHeader({ role = "Hospital", portal = "hospital", nav }: ConsoleHeaderProps) {
  const base = PORTALS[portal].basePath;
  const [menuOpen, setMenuOpen] = useState(false);
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
      <div className="flex items-center gap-2">
        {nav?.length ? (
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="md:hidden p-2 -ml-1 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Open navigation"
            aria-expanded={menuOpen}
          >
            <span className="text-xl" aria-hidden="true">☰</span>
          </button>
        ) : null}
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-[#1B4332] text-lg">
          <LogoMark size="w-8 h-8" />
          <span>PawVita</span>
        </Link>
      </div>
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
                <Link to={`${base}/notifications`} className="text-xs text-[#4A90D9] hover:underline" onClick={() => setNotifOpen(false)}>View all</Link>
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
        <Link to={`${base}/settings`} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors" aria-label="Settings">
          ⚙️
        </Link>
        <AccountMenu name={session.name} subtitle={[role, session.account.organization?.name].filter(Boolean).join(" · ")} portal={portal} variant="light" />
      </div>

      {menuOpen && nav?.length ? (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-gray-900 p-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-3 px-3">{role}</p>
            <nav className="space-y-1">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  to={n.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <span className="text-base" aria-hidden="true">{n.icon}</span>
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  );
}

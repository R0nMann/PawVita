import { useNavigate } from "react-router";
import { notificationApi } from "../../api/endpoints";
import { useApiMutation, useNotifications } from "../../api/queries";
import { useSession } from "../../auth/AuthContext";
import { notificationLink, NOTIFICATION_ICON, notificationTone } from "../../lib/links";
import { timeAgo } from "../../lib/format";
import { EmptyState, QueryState } from "../ui/States";

/** The in-app inbox (architecture §10) — shared by both portals' notification pages. */
export default function NotificationsList({ accent = "#1B4332" }: { accent?: string }) {
  const session = useSession();
  const navigate = useNavigate();
  const listQ = useNotifications();
  const readOne = useApiMutation((id: string) => notificationApi.read(id), [["notifications"]]);
  const readAll = useApiMutation(() => notificationApi.readAll(), [["notifications"]]);

  return (
    <QueryState query={listQ} loadingLabel="Loading notifications…">
      {(data) => (
        <>
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-500 text-sm">{data.unreadCount} unread</p>
            <button
              onClick={() => readAll.mutate(undefined)}
              disabled={readAll.isPending || data.unreadCount === 0}
              className="text-sm font-semibold hover:underline disabled:opacity-40"
              style={{ color: accent }}
            >
              Mark all read
            </button>
          </div>
          {data.items.length === 0 ? (
            <EmptyState icon="🔔" title="No notifications yet" body="Case updates, lab results, reminders and advisories will appear here." />
          ) : (
            <div className="space-y-3">
              {data.items.map((n) => {
                const tone = notificationTone(n.type);
                const link = notificationLink(session, n);
                return (
                  <button
                    key={n.id}
                    type="button"
                    className={`w-full text-left bg-white rounded-2xl p-4 shadow-sm border transition-all hover:shadow-md ${
                      n.readAt ? "border-gray-100 opacity-70" : "border-[#1B4332]/20"
                    }`}
                    onClick={() => {
                      if (!n.readAt) readOne.mutate(n.id);
                      if (link) navigate(link);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                          tone === "high" ? "bg-red-50" : tone === "medium" ? "bg-amber-50" : "bg-green-50"
                        }`}
                      >
                        {NOTIFICATION_ICON[n.type] ?? "🔔"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-semibold text-gray-800 font-display text-sm">{n.title}</p>
                          {!n.readAt && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: accent }}></span>}
                        </div>
                        <p className="text-gray-500 text-sm leading-relaxed">{n.body}</p>
                        <p className="text-gray-400 text-xs mt-2">
                          {timeAgo(n.createdAt)}
                          {link && " · Open →"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </QueryState>
  );
}

import { Outlet, Link, useLocation, useNavigate } from "react-router";
import Header from "../components/Header";
import ChatBot from "../components/ChatBot";
import { useSession } from "../../../auth/AuthContext";
import { useSystemHealth } from "../../../api/queries";

const NAV = [
  { label: "Users", href: "/hospital/admin/users", icon: "👥" },
  { label: "Regions", href: "/hospital/admin/regions", icon: "🗺️" },
  { label: "System Health", href: "/hospital/admin/system-health", icon: "💻" },
  { label: "Notifications", href: "/hospital/notifications", icon: "🔔" },
  { label: "Settings", href: "/hospital/settings", icon: "⚙️" },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const session = useSession();
  const health = useSystemHealth();
  const down = health.data
    ? Object.values(health.data.services).filter(s => s.status === "down").length
    : 0;
  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col">
      <Header role="Admin" />
      <div className="flex flex-1">
        <aside className="hidden md:flex flex-col w-56 bg-gray-900 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto">
          <div className="p-4">
            <div className="bg-white/10 rounded-2xl p-4 text-white mb-6 border border-white/10">
              <p className="text-xs font-medium opacity-70">System Admin</p>
              <p className="font-bold font-display text-lg mt-1">{session.name}</p>
              <div className="flex items-center gap-2 mt-2">
                <div className={`w-2 h-2 rounded-full ${down ? "bg-red-400" : "bg-green-400"}`}></div>
                <span className="text-xs opacity-80">
                  {!health.data ? "Checking systems…" : down ? `${down} service(s) down` : "All systems nominal"}
                </span>
              </div>
            </div>
            <nav className="space-y-1">
              {NAV.map(n => (
                <Link
                  key={n.href}
                  to={n.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${location.pathname === n.href ? "bg-white/15 text-white" : "text-white/60 hover:text-white hover:bg-white/10"}`}
                >
                  <span className="text-base">{n.icon}</span>
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          {/* Account actions sit apart from the admin navigation above. */}
          <div className="p-4 mt-auto border-t border-white/10">
            <Link to="/hospital/help-support" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all">
              <span className="text-base" aria-hidden="true">❓</span> Help &amp; Support
            </Link>
            <button
              type="button"
              onClick={() => navigate("/logout")}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full text-left text-red-300 hover:text-white hover:bg-red-500/25 mt-1 border-t border-white/10 pt-3"
            >
              <span className="text-base" aria-hidden="true">🚪</span> Log out
            </button>
          </div>
        </aside>
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
      <ChatBot />
    </div>
  );
}

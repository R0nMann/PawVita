import { Outlet, Link, useLocation, useNavigate } from "react-router";
import Header from "../components/Header";
import ChatBot from "../components/ChatBot";
import OutbreakTicker from "../components/OutbreakTicker";
import { useSession } from "../../../auth/AuthContext";

const NAV = [
  { label: "Overview", href: "/hospital/official/overview", icon: "📊" },
  { label: "Risk Map", href: "/hospital/official/risk-map", icon: "🗺️" },
  { label: "Outbreak Clusters", href: "/hospital/official/outbreak-clusters", icon: "⚠️" },
  { label: "Analytics", href: "/hospital/official/analytics", icon: "📈" },
  { label: "Reports", href: "/hospital/official/reports", icon: "📄" },
];

export default function OfficialLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const session = useSession();
  const isAdmin = session.account.role === "admin";
  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col">
      <OutbreakTicker />
      <Header role="Official" />
      <div className="flex flex-1">
        <aside className="hidden md:flex flex-col w-64 bg-[#1B4332] sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto">
          <div className="p-5">
            <div className="bg-white/10 rounded-2xl p-4 text-white mb-6 border border-white/10">
              <p className="text-xs font-medium text-white/70 font-body">Government Portal</p>
              <p className="font-bold font-display text-lg mt-1">{session.name}</p>
              <p className="text-xs text-white/60 mt-1">{session.account.region?.name ?? "All India"}</p>
            </div>
            <nav className="space-y-1">
              {NAV.map(n => (
                <Link
                  key={n.href}
                  to={n.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium font-body transition-all ${location.pathname === n.href ? "bg-white/15 text-white font-semibold" : "text-white/70 hover:text-white hover:bg-white/10"}`}
                >
                  <span className="text-base">{n.icon}</span>
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="p-5 mt-auto border-t border-white/10">
            <Link to="/hospital/notifications" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all">
              <span>🔔</span> Notifications
            </Link>
            {isAdmin && (
              <Link to="/hospital/admin/users" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all">
                <span>👥</span> Admin Panel
              </Link>
            )}
            <Link to="/hospital/settings" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all">
              <span>⚙️</span> Settings
            </Link>
            <button
              type="button"
              onClick={() => navigate("/logout")}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all w-full text-left text-red-200 hover:text-white hover:bg-red-500/25 mt-1 border-t border-white/10"
            >
              <span aria-hidden="true">🚪</span> Log out
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

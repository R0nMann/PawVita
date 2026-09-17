import { Outlet, Link, useLocation, useNavigate } from "react-router";
import Header from "../components/Header";
import ChatBot from "../components/ChatBot";

const NAV = [
  { label: "Sample Queue", href: "/hospital/lab/queue", icon: "🔬" },
  { label: "Current Sample", href: "/hospital/lab/sample/LAB-2024-001", icon: "🧪" },
  { label: "Notifications", href: "/hospital/notifications", icon: "🔔" },
  { label: "Settings", href: "/hospital/settings", icon: "⚙️" },
];

export default function LabLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col">
      <Header role="Lab" user="Mohan Lal (Lab Tech)" />
      <div className="flex flex-1">
        <aside className="hidden md:flex flex-col w-56 bg-white border-r border-[#E8E5DF] sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto">
          <div className="p-4">
            <div className="bg-gradient-to-br from-orange-500 to-orange-400 rounded-2xl p-4 text-white mb-6">
              <p className="text-xs font-medium opacity-80 font-body">Diagnostic Lab</p>
              <p className="font-bold font-display text-lg mt-1">Lab Portal</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 bg-yellow-300 rounded-full"></div>
                <span className="text-xs opacity-90">3 samples pending</span>
              </div>
            </div>
            <nav className="space-y-1">
              {NAV.map(n => (
                <Link
                  key={n.href}
                  to={n.href}
                  className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium font-body ${location.pathname.startsWith(n.href.split("/").slice(0, 3).join("/")) ? "active bg-[#1B4332]/10 text-[#1B4332]" : "text-gray-600 hover:text-[#1B4332]"}`}
                >
                  <span className="text-lg">{n.icon}</span>
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          {/* Account actions sit apart from the sample navigation above. */}
          <div className="p-4 mt-auto border-t border-gray-100">
            <Link to="/hospital/help-support" className="sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:text-[#1B4332]">
              <span className="text-lg" aria-hidden="true">❓</span> Help &amp; Support
            </Link>
            <button
              type="button"
              onClick={() => navigate("/logout")}
              className="sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left text-[#B91C1C] hover:bg-red-50 mt-1 border-t border-gray-100 pt-3"
            >
              <span className="text-lg" aria-hidden="true">🚪</span> Log out
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

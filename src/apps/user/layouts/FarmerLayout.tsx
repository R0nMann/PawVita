import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { useState } from 'react';
import ChatbotWidget from '../components/ChatbotWidget';
import AccountMenu from '../../../shared/components/AccountMenu';
import { notifications } from '../data/mockData';

const navItems = [
  { to: '/user/farmer/home', icon: '🏠', label: 'Home', hindiLabel: 'होम' },
  { to: '/user/farmer/report-symptom', icon: '🩺', label: 'Report', hindiLabel: 'रिपोर्ट करें' },
  { to: '/user/farmer/my-animals', icon: '🐄', label: 'My Animals', hindiLabel: 'मेरे पशु' },
  { to: '/user/farmer/alerts', icon: '🔔', label: 'Alerts', hindiLabel: 'अलर्ट' },
  { to: '/user/farmer/vaccination-schedule', icon: '💉', label: 'Vaccines', hindiLabel: 'टीकाकरण' },
];

export default function FarmerLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col">
      <header className="bg-[#1B4332] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-lg">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-white/10 rounded-lg transition-colors lg:hidden">
            <span className="text-xl">☰</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">🐄</span>
            <div>
              <p className="font-bold font-display text-sm leading-none">PawVita</p>
              <p className="text-white/60 text-xs leading-none">Farmer Portal</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/user/notifications')} className="relative p-2 hover:bg-white/10 rounded-xl transition-colors" aria-label="Notifications">
            <span className="text-xl">🔔</span>
            {unread > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">{unread}</span>}
          </button>
          <AccountMenu name="Ramesh Kumar" subtitle="Farmer · Kheda, Anand" portal="user" variant="dark" />
        </div>
      </header>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-[#1B4332] p-4 pt-16" onClick={e => e.stopPropagation()}>
            <nav className="space-y-1">
              {navItems.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={`sidebar-link ${location.pathname === item.to ? 'active' : ''}`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            {/* Account actions, kept apart from the destinations above so
                signing out is never a mis-tap away from a nav item. */}
            <div className="mt-4 pt-4 border-t border-white/10 space-y-1">
              <Link to="/user/settings" onClick={() => setSidebarOpen(false)} className="sidebar-link">
                <span className="text-xl" aria-hidden="true">⚙️</span>
                <span>Settings</span>
              </Link>
              <Link to="/user/help-support" onClick={() => setSidebarOpen(false)} className="sidebar-link">
                <span className="text-xl" aria-hidden="true">❓</span>
                <span>Help &amp; Support</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSidebarOpen(false);
                  navigate('/logout');
                }}
                className="sidebar-link w-full text-left"
              >
                <span className="text-xl" aria-hidden="true">🚪</span>
                <span>Log out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 pb-20 lg:pb-0">
        <Outlet />
      </main>

      {/* Bottom navigation for mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex lg:hidden z-30">
        {navItems.map(item => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors ${active ? 'text-[#1B4332]' : 'text-gray-400'}`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <ChatbotWidget />
    </div>
  );
}

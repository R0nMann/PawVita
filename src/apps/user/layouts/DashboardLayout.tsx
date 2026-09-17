import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { useState } from 'react';
import ChatbotWidget from '../components/ChatbotWidget';
import { notifications } from '../data/mockData';

interface NavItem { to: string; icon: string; label: string; }

interface DashboardLayoutProps {
  role: 'vet' | 'official' | 'lab' | 'admin';
  navItems: NavItem[];
  title: string;
  subtitle: string;
  userInitial: string;
  userName: string;
}

const roleColors: Record<string, string> = {
  vet: 'from-[#1B4332] to-[#2D6A4F]',
  official: 'from-[#1B3A5C] to-[#2D6A4F]',
  lab: 'from-[#2C1B4E] to-[#3D2B6E]',
  admin: 'from-[#2D1B1B] to-[#4E2D2D]',
};

const roleAccents: Record<string, string> = {
  vet: '#F4A300',
  official: '#4A90D9',
  lab: '#9B59B6',
  admin: '#E63946',
};

export default function DashboardLayout({ role, navItems, title, subtitle, userInitial, userName }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const unread = notifications.filter(n => !n.read).length;
  const gradient = roleColors[role];
  const accent = roleAccents[role];

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex">
      {/* Sidebar */}
      <aside className={`hidden lg:flex flex-col bg-gradient-to-b ${gradient} transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'} min-h-screen sticky top-0`}>
        <div className={`p-4 border-b border-white/10 flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          {!collapsed && (
            <div>
              <p className="font-bold font-display text-white text-sm leading-none">PashuRakshak</p>
              <p className="text-white/50 text-xs mt-0.5">{subtitle}</p>
            </div>
          )}
          {collapsed && <span className="text-2xl">🐄</span>}
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => {
            const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`sidebar-link ${active ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}
                style={active ? { color: accent, background: `${accent}22` } : {}}
                title={collapsed ? item.label : undefined}
              >
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className={`p-3 border-t border-white/10 space-y-1`}>
          <Link to="/user/settings" className={`sidebar-link ${collapsed ? 'justify-center px-2' : ''}`} title={collapsed ? 'Settings' : undefined}>
            <span className="text-xl">⚙️</span>
            {!collapsed && <span>Settings</span>}
          </Link>
          <Link to="/user/help-support" className={`sidebar-link ${collapsed ? 'justify-center px-2' : ''}`} title={collapsed ? 'Help' : undefined}>
            <span className="text-xl">❓</span>
            {!collapsed && <span>Help</span>}
          </Link>
          <button onClick={() => navigate('/logout')} className={`sidebar-link w-full ${collapsed ? 'justify-center px-2' : ''}`} title={collapsed ? 'Logout' : undefined}>
            <span className="text-xl">🚪</span>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:block p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Toggle sidebar">
              <span className="text-gray-500">{collapsed ? '→' : '←'}</span>
            </button>
            <div>
              <h1 className="font-bold font-display text-[#1B4332] text-base leading-none">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/user/notifications" className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors" aria-label="Notifications">
              <span className="text-xl">🔔</span>
              {unread > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">{unread}</span>}
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: accent }}>
                {userInitial}
              </div>
              <span className="text-sm font-medium text-gray-700 hidden sm:block">{userName}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      <ChatbotWidget />
    </div>
  );
}

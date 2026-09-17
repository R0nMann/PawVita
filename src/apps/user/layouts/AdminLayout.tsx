import DashboardLayout from './DashboardLayout';

const navItems = [
  { to: '/user/admin/users', icon: '👥', label: 'Users' },
  { to: '/user/admin/regions', icon: '🗺️', label: 'Regions' },
  { to: '/user/admin/system-health', icon: '🖥️', label: 'System Health' },
  { to: '/user/notifications', icon: '🔔', label: 'Notifications' },
];

export default function AdminLayout() {
  return (
    <DashboardLayout
      role="admin"
      navItems={navItems}
      title="Admin Console"
      subtitle="Super Admin"
      userInitial="S"
      userName="Super Admin"
    />
  );
}

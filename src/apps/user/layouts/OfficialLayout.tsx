import DashboardLayout from './DashboardLayout';

const navItems = [
  { to: '/user/official/overview', icon: '📊', label: 'Overview' },
  { to: '/user/official/risk-map', icon: '🗺️', label: 'Risk Map' },
  { to: '/user/official/outbreak-clusters', icon: '⚠️', label: 'Clusters' },
  { to: '/user/official/analytics', icon: '📈', label: 'Analytics' },
  { to: '/user/official/reports', icon: '📋', label: 'Reports' },
  { to: '/user/notifications', icon: '🔔', label: 'Notifications' },
];

export default function OfficialLayout() {
  return (
    <DashboardLayout
      role="official"
      navItems={navItems}
      title="District Dashboard"
      subtitle="Govt. Official"
    />
  );
}

import DashboardLayout from './DashboardLayout';

const navItems = [
  { to: '/user/lab/queue', icon: '🧪', label: 'Sample Queue' },
  { to: '/user/notifications', icon: '🔔', label: 'Notifications' },
];

export default function LabLayout() {
  return (
    <DashboardLayout
      role="lab"
      navItems={navItems}
      title="Laboratory Portal"
      subtitle="Lab Technician"
      userInitial="P"
      userName="Priya Sharma"
    />
  );
}

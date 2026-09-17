import DashboardLayout from './DashboardLayout';

const navItems = [
  { to: '/user/vet/dashboard', icon: '🏥', label: 'Dashboard' },
  { to: '/user/vet/field-visits', icon: '🗓️', label: 'Field Visits' },
  { to: '/user/notifications', icon: '🔔', label: 'Notifications' },
];

export default function VetLayout() {
  return (
    <DashboardLayout
      role="vet"
      navItems={navItems}
      title="Veterinary Portal"
      subtitle="Field Officer"
      userInitial="M"
      userName="Dr. Meera Patel"
    />
  );
}

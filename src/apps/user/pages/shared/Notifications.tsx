import NotificationsList from '../../../../shared/account/NotificationsList';

export default function Notifications() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold font-display text-[#1B4332] mb-2">Notifications</h1>
      <NotificationsList />
    </div>
  );
}

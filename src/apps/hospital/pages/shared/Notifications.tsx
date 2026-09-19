import NotificationsList from "../../../../shared/account/NotificationsList";

export default function Notifications() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-display font-bold text-gray-900 mb-2">Notifications</h1>
      <NotificationsList accent="#4A90D9" />
    </div>
  );
}

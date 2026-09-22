import NotificationsList from "../../../shared/account/NotificationsList";

export default function Notifications() {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-display font-bold text-gray-900">Notifications</h1>
      <NotificationsList accent="#1F2937" />
    </div>
  );
}

import SystemHealthView from "../../../../shared/admin/SystemHealthView";

export default function SystemHealth() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">System Health Monitor</h1>
        <p className="text-gray-500 text-sm">Infrastructure status, data sync, and offline queue</p>
      </div>
      <SystemHealthView />
    </div>
  );
}

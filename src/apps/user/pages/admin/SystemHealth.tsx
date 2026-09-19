import SystemHealthView from '../../../../shared/admin/SystemHealthView';

export default function SystemHealth() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-display text-[#1B4332]">System Health</h2>
        <p className="text-gray-500">Infrastructure status, sync queues, and performance metrics</p>
      </div>
      <SystemHealthView />
    </div>
  );
}

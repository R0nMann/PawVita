const SERVICES = [
  { name: "API Server", status: "operational", latency: "42ms", uptime: "99.98%", lastCheck: "2 min ago" },
  { name: "AI Prediction Engine", status: "operational", latency: "180ms", uptime: "99.91%", lastCheck: "2 min ago" },
  { name: "Database Cluster", status: "operational", latency: "8ms", uptime: "99.99%", lastCheck: "1 min ago" },
  { name: "SMS/Notification Service", status: "degraded", latency: "2100ms", uptime: "97.4%", lastCheck: "5 min ago" },
  { name: "Offline Sync Queue", status: "operational", latency: "95ms", uptime: "99.82%", lastCheck: "3 min ago" },
  { name: "Lab Data Bridge", status: "operational", latency: "230ms", uptime: "99.76%", lastCheck: "2 min ago" },
  { name: "Map Tile Service", status: "operational", latency: "65ms", uptime: "99.95%", lastCheck: "2 min ago" },
  { name: "Report Export Service", status: "maintenance", latency: "—", uptime: "—", lastCheck: "Maintenance window" },
];

const OFFLINE_QUEUE = [
  { id: "OFQ-001", type: "Symptom Report", location: "Barmer, RJ", queued: "14 min ago", size: "2.1 KB" },
  { id: "OFQ-002", type: "Treatment Log", location: "Remote Village, MP", queued: "32 min ago", size: "1.4 KB" },
  { id: "OFQ-003", type: "Vaccination Record", location: "Leh, J&K", queued: "1 hr ago", size: "0.9 KB" },
];

export default function SystemHealth() {
  const operational = SERVICES.filter(s => s.status === "operational").length;
  const total = SERVICES.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">System Health Monitor</h1>
        <p className="text-gray-500 text-sm">Infrastructure status, data sync, and offline queue — Real-time</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
          <p className="text-3xl font-display font-bold text-green-700">{operational}/{total}</p>
          <p className="text-sm text-green-600 mt-1">Services Operational</p>
        </div>
        <div className="bg-white border border-[#E8E5DF] rounded-2xl p-5 text-center">
          <p className="text-3xl font-display font-bold text-gray-900">99.97%</p>
          <p className="text-sm text-gray-500 mt-1">Platform Uptime (30d)</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
          <p className="text-3xl font-display font-bold text-amber-600">{OFFLINE_QUEUE.length}</p>
          <p className="text-sm text-amber-600 mt-1">Offline Reports Queued</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-display font-semibold text-gray-900">Service Status</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {SERVICES.map(s => (
            <div key={s.name} className="px-5 py-4 flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full shrink-0 ${s.status === "operational" ? "bg-green-500" : s.status === "degraded" ? "bg-amber-500 animate-pulse" : "bg-gray-400"}`}></div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-gray-900">{s.name}</p>
                <p className="text-xs text-gray-500">Last checked: {s.lastCheck}</p>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-right">
                  <p className="text-xs text-gray-400">Latency</p>
                  <p className="font-mono font-semibold text-gray-800">{s.latency}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Uptime</p>
                  <p className="font-mono font-semibold text-gray-800">{s.uptime}</p>
                </div>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${s.status === "operational" ? "bg-green-100 text-green-700" : s.status === "degraded" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                  {s.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Offline Queue */}
      <div className="bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-display font-semibold text-gray-900">Offline Sync Queue</h2>
          <button className="text-sm text-[#1B4332] font-semibold hover:underline">Force Sync All</button>
        </div>
        {OFFLINE_QUEUE.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {OFFLINE_QUEUE.map(q => (
              <div key={q.id} className="px-5 py-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">📱</div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-900">{q.type}</p>
                  <p className="text-xs text-gray-500">📍 {q.location} · Queued {q.queued} · {q.size}</p>
                </div>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">Pending sync</span>
                <button className="text-xs text-[#4A90D9] hover:underline font-medium">Sync Now</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-sm">All reports synced — no items in queue</p>
          </div>
        )}
      </div>
    </div>
  );
}

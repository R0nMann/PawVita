import { useState, useEffect } from 'react';

export default function SystemHealth() {
  const [uptime, setUptime] = useState(99.97);

  useEffect(() => {
    const interval = setInterval(() => {
      setUptime(u => Math.min(100, u + (Math.random() * 0.002 - 0.001)));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const services = [
    { name: 'API Server', status: 'operational', latency: '42ms', uptime: '99.98%' },
    { name: 'Database Cluster', status: 'operational', latency: '8ms', uptime: '100%' },
    { name: 'AI/ML Engine', status: 'operational', latency: '120ms', uptime: '99.85%' },
    { name: 'Notification Service', status: 'operational', latency: '180ms', uptime: '99.91%' },
    { name: 'Offline Sync Queue', status: 'degraded', latency: '450ms', uptime: '98.20%' },
    { name: 'Map Tile Server', status: 'operational', latency: '65ms', uptime: '99.95%' },
  ];

  const offlineQueue = [
    { id: 'RPT-OFF-001', type: 'Symptom Report', farmer: 'Rajiv Sharma', village: 'Pipar', queued: '4h ago', items: 1 },
    { id: 'RPT-OFF-002', type: 'Symptom Report', farmer: 'Kanta Devi', village: 'Merta', queued: '6h ago', items: 2 },
    { id: 'VAC-OFF-003', type: 'Vaccination Log', farmer: 'Suresh Patel', village: 'Sojat', queued: '8h ago', items: 3 },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-display text-[#1B4332]">System Health</h2>
        <p className="text-gray-500">Infrastructure status, sync queues, and performance metrics</p>
      </div>

      {/* Overall Status */}
      <div className="gradient-card-green rounded-2xl p-5 text-white mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">🖥️</div>
          <div>
            <p className="text-white/70 text-sm">Platform Uptime (30 days)</p>
            <p className="text-4xl font-bold font-display">{uptime.toFixed(2)}%</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-white/70 text-sm">Status</p>
            <p className="text-xl font-bold font-display text-green-300">All Systems Operational</p>
          </div>
        </div>
      </div>

      {/* Services */}
      <h3 className="font-bold font-display text-[#1B4332] text-lg mb-4">Service Status</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {services.map(s => (
          <div key={s.name} className={`bg-white rounded-2xl p-4 shadow-card border ${s.status === 'degraded' ? 'border-yellow-200' : 'border-gray-100'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${s.status === 'operational' ? 'bg-green-500' : s.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                <p className="font-semibold text-gray-800 font-display">{s.name}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.status === 'operational' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {s.status}
              </span>
            </div>
            <div className="flex gap-4 mt-3 text-sm text-gray-500">
              <span>Latency: <span className="font-semibold text-gray-700">{s.latency}</span></span>
              <span>Uptime: <span className="font-semibold text-gray-700">{s.uptime}</span></span>
            </div>
          </div>
        ))}
      </div>

      {/* Offline Queue */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold font-display text-[#1B4332]">Offline Sync Queue</h3>
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-semibold">{offlineQueue.length} pending sync</span>
        </div>
        <div className="divide-y divide-gray-50">
          {offlineQueue.map(q => (
            <div key={q.id} className="flex items-center gap-4 px-6 py-4">
              <span className="text-2xl">📦</span>
              <div className="flex-1">
                <p className="font-semibold text-gray-800 text-sm">{q.type} — {q.farmer}</p>
                <p className="text-gray-500 text-xs">{q.village} • {q.items} item(s) • Queued {q.queued}</p>
              </div>
              <button className="text-xs bg-[#1B4332] text-white px-3 py-1.5 rounded-lg hover:bg-[#2D6A4F] transition-colors font-semibold">
                Force Sync
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
